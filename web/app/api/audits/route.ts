import { createHash } from "node:crypto";
import { COMPARE_MODEL, DEFAULT_MODEL, attachEmail, auditsFromIp, createAudit, createPaymentTest, db, normalizeUrl, recentAudit } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardSecret } from "@/lib/cards";
import { msg } from "@/lib/lang";

const FORM_MISSIONS = Number(process.env.FORM_MISSIONS ?? 5); // 3 on demo day: one mission per free H slot
const MAX_PENDING = 20; // refuse new audits when the queue is this long
const MAX_AUDITS_PER_HOUR = 6; // per IP, competitor audits included

const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  // Audits belong to a team: signed in, and owner or admin of the current team.
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace", req.url), 303);
  if (!ctx.team) return Response.redirect(new URL("/espace", req.url), 303);
  if (!canLaunch(ctx.team.role)) return fail(await msg("Ton rôle (lecteur) permet de consulter les rapports, pas de lancer un audit.", "Your role (viewer) lets you read reports, not run an audit."), 403);
  const team = { teamId: ctx.team.id, createdBy: ctx.user.id };
  const form = await req.formData();
  const url = String(form.get("url") ?? "");
  const competitor = String(form.get("competitor") ?? "").trim();
  const device = form.get("device") === "mobile" ? "mobile" : "desktop";
  // Compare models: same site, same missions, one audit per Holo model, linked like a competitor audit.
  const models = form.get("models") === "1" && form.get("mode") !== "payment";
  // Precise audit: the most capable Holo model for the whole audit (competitor included), about 40 % dearer per mission.
  const model = !models && form.get("model") === "precise" ? COMPARE_MODEL : undefined;
  if (models && competitor) return fail(await msg("Choisis entre un concurrent et la comparaison de modèles : les deux à la fois doubleraient encore le coût.", "Choose between a competitor and the model comparison: both at once would double the cost again."));
  const email = String(form.get("email") ?? "").trim().toLowerCase() || ctx.user.email;
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email))) return fail(await msg("Adresse e-mail invalide.", "Invalid e-mail address."));

  try {
    const domains = [url, competitor].filter(Boolean).map((u) => normalizeUrl(u).domain);
    // Demo day: ALLOWED_DOMAINS="jules.com,celio.com" limits the public form to known sites.
    const allowed = process.env.ALLOWED_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean);
    if (allowed?.length && domains.some((d) => !allowed.includes(d))) return fail(await msg("Ce site n'est pas ouvert aux audits pour le moment.", "This site is not open to audits for now."), 403);

    // Same site audited in the last 7 days: show that report instead of spending tokens again.
    // "Relancer pour vérifier" sends force=1: the team fixed something and wants a fresh pass.
    // Real payment test: the team's own card, on the main site only (never the competitor), always a fresh audit.
    const paymentOnly = form.get("mode") === "payment";
    const payment = paymentOnly || form.get("payment") === "1";
    if (payment && !(await cardSecret(ctx.team.id))) return fail(await msg("Aucune carte utilisable pour l'équipe : ajoute-la dans Espace › Paiement.", "No usable card for the team: add one in Space › Payment method."));

    if (!payment && !competitor && !models && !model && form.get("force") !== "1") {
      const existing = await recentAudit(url, device, ctx.team.id);
      if (existing && email) await attachEmail(existing, email);
      if (existing) return Response.redirect(new URL(`/audit/${existing}`, req.url), 303);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const ipHash = createHash("sha256").update(`${process.env.TICK_SECRET}:${ip}`).digest("hex");
    if ((await auditsFromIp(ipHash)) >= MAX_AUDITS_PER_HOUR) return fail(await msg("Trop d'audits lancés depuis ta connexion, réessaie dans une heure.", "Too many audits started from your connection, try again in an hour."), 429);

    const { count } = await db.from("runs").select("id", { count: "exact", head: true }).in("status", ["todo", "launched"]);
    if ((count ?? 0) > MAX_PENDING) return fail(await msg("File d'attente pleine, réessaie dans un moment.", "Queue full, try again in a moment."), 503);

    // Payment only: no missions, no competitor, just the real payment test.
    const compareTo = models
      ? await createAudit(url, { device, missions: FORM_MISSIONS, model: COMPARE_MODEL, ipHash, ...team })
      : competitor && !paymentOnly
        ? await createAudit(competitor, { device, missions: FORM_MISSIONS, model, ipHash, ...team })
        : undefined;
    const paymentTest = payment ? await createPaymentTest(url, team) : undefined;
    const id = await createAudit(url, { device, missions: paymentOnly ? 0 : FORM_MISSIONS, compareTo, paymentTest, model: models ? DEFAULT_MODEL : model, email: email || undefined, ipHash, ...team });
    return Response.redirect(new URL(`/audit/${id}`, req.url), 303);
  } catch (e) {
    return fail(`${await msg("Erreur", "Error")} : ${(e as Error).message}`);
  }
}
