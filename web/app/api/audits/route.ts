import { createHash } from "node:crypto";
import { attachEmail, auditsFromIp, createAudit, db, normalizeUrl, recentAudit } from "@/lib/engine";

const FORM_MISSIONS = Number(process.env.FORM_MISSIONS ?? 5); // 3 on demo day: one mission per free H slot
const MAX_PENDING = 20; // refuse new audits when the queue is this long
const MAX_AUDITS_PER_HOUR = 6; // per IP, competitor audits included

const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const form = await req.formData();
  const url = String(form.get("url") ?? "");
  const competitor = String(form.get("competitor") ?? "").trim();
  const device = form.get("device") === "mobile" ? "mobile" : "desktop";
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email))) return fail("Adresse e-mail invalide.");

  try {
    const domains = [url, competitor].filter(Boolean).map((u) => normalizeUrl(u).domain);
    // Demo day: ALLOWED_DOMAINS="jules.com,celio.com" limits the public form to known sites.
    const allowed = process.env.ALLOWED_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean);
    if (allowed?.length && domains.some((d) => !allowed.includes(d))) return fail("Ce site n'est pas ouvert aux audits pour le moment.", 403);

    // Same site audited in the last 7 days: show that report instead of spending tokens again.
    if (!competitor) {
      const existing = await recentAudit(url, device);
      if (existing && email) await attachEmail(existing, email);
      if (existing) return Response.redirect(new URL(`/audit/${existing}`, req.url), 303);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const ipHash = createHash("sha256").update(`${process.env.TICK_SECRET}:${ip}`).digest("hex");
    if ((await auditsFromIp(ipHash)) >= MAX_AUDITS_PER_HOUR) return fail("Trop d'audits lancés depuis ta connexion, réessaie dans une heure.", 429);

    const { count } = await db.from("runs").select("id", { count: "exact", head: true }).in("status", ["todo", "launched"]);
    if ((count ?? 0) > MAX_PENDING) return fail("File d'attente pleine, réessaie dans un moment.", 503);

    const compareTo = competitor ? await createAudit(competitor, { device, missions: FORM_MISSIONS, ipHash }) : undefined;
    const id = await createAudit(url, { device, missions: FORM_MISSIONS, compareTo, email: email || undefined, ipHash });
    return Response.redirect(new URL(`/audit/${id}`, req.url), 303);
  } catch (e) {
    return fail(`Erreur : ${(e as Error).message}`);
  }
}
