import { createHash } from "node:crypto";
import { after } from "next/server";
import { COMPARE_MODEL, DEFAULT_MODEL, LOGIN_REFUSED, attachEmail, auditsFromIp, createAudit, createPaymentTest, db, normalizeUrl, recentAudit, tick } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardSecret } from "@/lib/cards";
import { refreshLogo } from "@/lib/logo";
import { getLang, msg } from "@/lib/lang";
import { resolvePick, teamMissions } from "@/lib/missions";

const FORM_MISSIONS = Number(process.env.FORM_MISSIONS ?? 5); // 3 on demo day: one mission per free H slot
const MAX_PENDING = 20; // refuse new audits when the queue is this long
const MAX_AUDITS_PER_HOUR = 6; // per IP, competitor audits included

export const maxDuration = 60;

const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
// A refused launch goes back to the launch form, filled in, with the reason and what to do: never a bare text page
// that loses what was typed. The reason is a code (texts in espace/nouveau), so a crafted link cannot show any text.
const retry = (req: Request, form: FormData, code: string) => {
  const keep = new URLSearchParams();
  for (const k of ["url", "competitor", "device", "email"]) {
    const v = String(form.get(k) ?? "").trim().slice(0, 300);
    if (v) keep.set(k, v);
  }
  if (form.get("force") === "1") keep.set("force", "1");
  keep.set("erreur", code);
  return Response.redirect(new URL(`/espace/nouveau?${keep}`, req.url), 303);
};

export async function POST(req: Request) {
  // Audits belong to a team: signed in, and owner or admin of the current team.
  const ctx = await teamContext();
  const form = await req.formData();
  if (!ctx) {
    // Signed out: keep what the visitor typed. After the magic link they land on the launch form, filled in,
    // and still have to click: no audit (no H credits) is ever started without that click.
    const keep = new URLSearchParams();
    for (const k of ["url", "competitor", "device"]) {
      const v = String(form.get(k) ?? "").trim().slice(0, 300);
      if (v) keep.set(k, v);
    }
    const next = `/espace/nouveau${keep.size ? `?${keep}` : ""}`;
    return Response.redirect(new URL(`/connexion?${new URLSearchParams({ next })}`, req.url), 303);
  }
  if (!ctx.team) return Response.redirect(new URL("/espace", req.url), 303);
  if (!canLaunch(ctx.team.role)) return fail(await msg("Ton rôle (lecteur) permet de consulter les rapports, pas de lancer un audit.", "Your role (viewer) lets you read reports, not run an audit."), 403);
  const team = { teamId: ctx.team.id, createdBy: ctx.user.id };
  const url = String(form.get("url") ?? "");
  const competitor = String(form.get("competitor") ?? "").trim();
  // "both": the same missions on desktop and on mobile, two audits linked like a model comparison (desktop report first).
  const both = form.get("device") === "both" && form.get("mode") !== "payment";
  const device = form.get("device") === "mobile" ? "mobile" : "desktop";
  // Compare models: same site, same missions, one audit per Holo model, linked like a competitor audit.
  const models = form.get("models") === "1" && form.get("mode") !== "payment";
  // Precise audit: the most capable Holo model for the whole audit (competitor included), about 40 % dearer per mission for us,
  // billed 1.5 credits per mission, the audit rounded up (lib/credits.ts reads audits.model for that).
  const model = !models && form.get("model") === "precise" ? COMPARE_MODEL : undefined;
  if (models && competitor) return retry(req, form, "combo");
  if (both && (competitor || models)) return retry(req, form, "combo");
  const email = String(form.get("email") ?? "").trim().toLowerCase() || ctx.user.email;
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email))) return retry(req, form, "email");

  try {
    const domains = [url, competitor].filter(Boolean).map((u) => normalizeUrl(u).domain);
    // Demo day: ALLOWED_DOMAINS="jules.com,celio.com" limits the public form to known sites.
    const allowed = process.env.ALLOWED_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean);
    // A site off the demo list lands on a real page listing the open sites and their latest reports, not on plain text.
    const closed = allowed?.length ? domains.find((d) => !allowed.includes(d)) : undefined;
    if (closed) return Response.redirect(new URL(`/sites-ouverts?${new URLSearchParams({ site: closed })}`, req.url), 303);

    // Same site audited in the last 7 days: show that report instead of spending tokens again.
    // "Relancer pour vérifier" sends force=1: the team fixed something and wants a fresh pass.
    // Real payment test: the team's own card, on the main site only (never the competitor), always a fresh audit.
    const paymentOnly = form.get("mode") === "payment";
    const payment = paymentOnly || form.get("payment") === "1";
    // A real payment needs the team's explicit yes, every time: the form's confirmation box, never a default.
    if (payment && form.get("pay_confirm") !== "1") return retry(req, form, "confirmation");
    if (payment && !(await cardSecret(ctx.team.id))) return retry(req, form, "carte");
    // "With a test account": the account picked on the form (checked against the team and the site in createPaymentTest).
    const withAccount = payment && form.get("account") === "login";
    const loginId = withAccount ? Number(form.get("login")) : null;
    if (withAccount && !(Number.isInteger(loginId) && loginId! > 0)) return retry(req, form, "compte");

    // The missions picked on the launch form (JSON). Absent (no JavaScript, home form): the first default missions.
    // A pick other than the plain defaults is a new question: never answered with last week's report.
    const pick = !paymentOnly && typeof form.get("missions") === "string" ? String(form.get("missions")) : "";
    const defaultIds = pick ? (await teamMissions(ctx.team.id)).defaults.filter((d) => !d.base_id).slice(0, FORM_MISSIONS).map((d) => d.id) : [];
    const plain = !pick || pick === JSON.stringify(defaultIds.map((id) => ({ id })));

    if (plain && !payment && !competitor && !models && !both && !model && form.get("force") !== "1") {
      const existing = await recentAudit(url, device, ctx.team.id);
      if (existing && email) await attachEmail(existing, email);
      if (existing) return Response.redirect(new URL(`/audit/${existing}`, req.url), 303);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const ipHash = createHash("sha256").update(`${process.env.TICK_SECRET}:${ip}`).digest("hex");
    if ((await auditsFromIp(ipHash)) >= MAX_AUDITS_PER_HOUR) return retry(req, form, "heure");

    const { count } = await db.from("runs").select("id", { count: "exact", head: true }).in("status", ["todo", "launched"]);
    if ((count ?? 0) > MAX_PENDING) return retry(req, form, "file");

    let missionIds: number[] | undefined;
    if (pick && !plain) {
      const r = await resolvePick(ctx.team.id, ctx.user.id, pick, await getLang());
      if (!Array.isArray(r)) return retry(req, form, "missions");
      missionIds = r;
    }

    // Payment only: no missions, no competitor, just the real payment test.
    const compareTo = models
      ? await createAudit(url, { device, missions: FORM_MISSIONS, missionIds, model: COMPARE_MODEL, ipHash, ...team })
      : both
        ? await createAudit(url, { device: "mobile", missions: FORM_MISSIONS, missionIds, model, email: email || undefined, ipHash, ...team })
      : competitor && !paymentOnly
        ? await createAudit(competitor, { device, missions: FORM_MISSIONS, missionIds, model, ipHash, ...team })
        : undefined;
    const paymentTest = payment ? await createPaymentTest(url, { ...team, loginId }) : undefined;
    const id = await createAudit(url, { device, missions: paymentOnly ? 0 : FORM_MISSIONS, missionIds: paymentOnly ? undefined : missionIds, compareTo, paymentTest, model: models ? DEFAULT_MODEL : model, email: email || undefined, ipHash, ...team });
    // Launch the first missions now instead of waiting up to a minute for the cron.
    after(() => tick(0).catch(() => {}));
    // Site logos, fetched once and cached (sites.logo_url): new sites get theirs before anyone opens the report.
    after(() => Promise.all(domains.map((d) => refreshLogo(d).catch(() => null))));
    return Response.redirect(new URL(`/audit/${id}`, req.url), 303);
  } catch (e) {
    // The only expected failure is an address that is not a public site; anything else is ours, said as such.
    const m = String((e as Error).message);
    return retry(req, form, m.startsWith("URL invalide") ? "url" : m === LOGIN_REFUSED ? "compte" : "technique");
  }
}
