import { canLaunch, teamContext } from "@/lib/auth";
import { db, normalizeUrl } from "@/lib/engine";
import { INTERVALS, SCORE_DROPS, checkAutomation, postWebhook, webhookOk } from "@/lib/automations";
import { msg } from "@/lib/lang";

// Back to Automations, or to Abonnement et crédits when the form came from there (per-site cap).
const go = (req: Request, back?: string) => Response.redirect(new URL(back === "abonnement" ? "/espace/reglages/abonnement" : "/espace/reglages/automations", req.url), 303);
const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const MAX_PER_TEAM = 20;
export const maxDuration = 60;

// Daily site watch of the current team. Owner or admin only.
// state: "off" = paused, "notify" = alert only, "audit" = alert and launch a new audit.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace/reglages/automations", req.url), 303);
  if (!ctx.team || !canLaunch(ctx.team.role)) return fail(await msg("Seuls le propriétaire et les admins de l'équipe gèrent les automations.", "Only the team's owner and admins manage automations."), 403);
  const teamId = ctx.team.id;
  const form = await req.formData();
  const action = form.get("action");
  const id = Number(form.get("id"));
  const state = String(form.get("state") ?? "notify");
  const settings = state === "off" ? { enabled: false } : { enabled: true, mode: state === "audit" ? "audit" : "notify" };
  try {
    if (action === "add") {
      const urls = String(form.get("urls") ?? "").split(/[\s,]+/).filter(Boolean).map((u) => normalizeUrl(u).url);
      if (!urls.length) return fail(await msg("Indique au moins une URL.", "Enter at least one URL."));
      const { count } = await db.from("automations").select("id", { count: "exact", head: true }).eq("team_id", teamId);
      if ((count ?? 0) + urls.length > MAX_PER_TEAM) return fail(await msg(`${MAX_PER_TEAM} pages suivies au maximum par équipe.`, `${MAX_PER_TEAM} tracked pages at most per team.`));
      const { error } = await db
        .from("automations")
        .upsert(urls.map((url) => ({ team_id: teamId, url, created_by: ctx.user.id, monthly: form.get("monthly") === "1", ...settings })), { onConflict: "team_id,url", ignoreDuplicates: true });
      if (error) throw error;
    } else if (action === "state") {
      await db.from("automations").update(settings).eq("id", id).eq("team_id", teamId);
    } else if (action === "monthly") {
      await db.from("automations").update({ monthly: form.get("monthly") === "1" }).eq("id", id).eq("team_id", teamId);
    } else if (action === "interval") {
      const hours = Number(form.get("interval"));
      if (INTERVALS.includes(hours)) await db.from("automations").update({ interval_hours: hours }).eq("id", id).eq("team_id", teamId);
    } else if (action === "alerts") {
      // Team alerts: webhook (Slack, Discord, n8n…) and the score drop that triggers an alert. Empty URL = no webhook.
      const url = String(form.get("webhook_url") ?? "").trim();
      if (url && !webhookOk(url)) return fail(await msg("L'URL du webhook doit commencer par https:// et viser un nom de domaine.", "The webhook URL must start with https:// and point to a domain name."));
      const drop = Number(form.get("score_drop"));
      await db.from("teams").update({ webhook_url: url || null, ...(SCORE_DROPS.includes(drop) ? { score_drop: drop } : {}) }).eq("id", teamId);
      if (url && form.get("test") === "1") {
        const ok = await postWebhook(url, { event: "test", domain: "agentproof", text: "message de test : les alertes arriveront ici.", link: "" }).catch(() => false);
        if (!ok) return fail(await msg("Webhook enregistré, mais le message de test a été refusé. Vérifie l'URL.", "Webhook saved, but the test message was refused. Check the URL."));
      }
    } else if (action === "site_cap") {
      // Monthly credit cap per site for automatic audits. Empty = no cap.
      const raw = String(form.get("site_credit_cap") ?? "").trim();
      const cap = raw === "" ? null : Number(raw);
      if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > 10000)) return fail(await msg("Le plafond est un nombre entier de crédits, de 1 à 10 000, ou vide pour aucun plafond.", "The cap is a whole number of credits, 1 to 10,000, or empty for no cap."));
      const { error } = await db.from("teams").update({ site_credit_cap: cap }).eq("id", teamId);
      if (error) throw error;
      return go(req, "abonnement");
    } else if (action === "delete") {
      await db.from("automations").delete().eq("id", id).eq("team_id", teamId);
    } else if (action === "check") {
      const { data: a } = await db.from("automations").select("id, team_id, url, mode, signature, created_by, last_auto_audit_at, users:created_by(email)").eq("id", id).eq("team_id", teamId).single();
      if (a) {
        await db.from("automations").update({ last_checked_at: new Date().toISOString() }).eq("id", id);
        await checkAutomation(a as any);
      }
    }
  } catch (e) {
    return fail(`${await msg("Erreur", "Error")} : ${(e as Error).message}`);
  }
  return go(req);
}
