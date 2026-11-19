import { canLaunch, teamContext } from "@/lib/auth";
import { db, normalizeUrl } from "@/lib/engine";
import { INTERVALS, SCORE_DROPS, checkAutomation, postWebhook, webhookOk } from "@/lib/automations";

// Every answer goes back to the page with a short code: ?ok=… shows "Saved", ?err=… shows what to fix (no plain-text page).
// The #anchor brings the reader back to the card they were in. back=abonnement for forms kept on Abonnement et crédits.
const PAGE = "/espace/reglages/automations";
const go = (req: Request, q: string, anchor = "", back?: string) =>
  Response.redirect(new URL(`${back === "abonnement" ? "/espace/reglages/abonnement" : PAGE}?${q}${anchor ? `#${anchor}` : ""}`, req.url), 303);
const MAX_PER_TEAM = 20;
export const maxDuration = 60;

// Daily site watch of the current team. Owner or admin only.
// state: "off" = paused, "on" = running (mode unchanged), "notify" = alert only, "audit" = alert and launch a new audit.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL(`/connexion?next=${PAGE}`, req.url), 303);
  const form = await req.formData();
  const back = String(form.get("back") ?? "");
  if (!ctx.team || !canLaunch(ctx.team.role)) return go(req, "err=role", "", back);
  const teamId = ctx.team.id;
  const action = form.get("action");
  const id = Number(form.get("id"));
  const ok = (code: string, anchor: string) => go(req, `ok=${code}`, anchor, back);
  const err = (code: string, anchor: string) => go(req, `err=${code}`, anchor, back);
  try {
    if (action === "add") {
      let urls: string[];
      try {
        urls = [...new Set(String(form.get("urls") ?? "").split(/[\s,]+/).filter(Boolean).map((u) => normalizeUrl(u).url))];
      } catch {
        return err("url", "pages");
      }
      if (!urls.length) return err("url", "pages");
      const { count } = await db.from("automations").select("id", { count: "exact", head: true }).eq("team_id", teamId);
      if ((count ?? 0) + urls.length > MAX_PER_TEAM) return err("max", "pages");
      const { error } = await db
        .from("automations")
        .upsert(urls.map((url) => ({ team_id: teamId, url, created_by: ctx.user.id, enabled: true, mode: "notify", monthly: false })), { onConflict: "team_id,url", ignoreDuplicates: true });
      if (error) throw error;
      return ok("added", "pages");
    }
    if (action === "state") {
      const state = String(form.get("state") ?? "");
      const patch = state === "off" ? { enabled: false } : state === "on" ? { enabled: true } : state === "audit" || state === "notify" ? { mode: state } : null;
      if (!patch) return err("value", "pages");
      await db.from("automations").update(patch).eq("id", id).eq("team_id", teamId);
      return ok(state === "off" ? "paused" : state === "on" ? "resumed" : "saved", state === "audit" || state === "notify" ? "audits" : "pages");
    }
    if (action === "monthly") {
      await db.from("automations").update({ monthly: form.get("monthly") === "1" }).eq("id", id).eq("team_id", teamId);
      return ok("saved", "audits");
    }
    if (action === "interval") {
      const hours = Number(form.get("interval"));
      if (!INTERVALS.includes(hours)) return err("value", "pages");
      await db.from("automations").update({ interval_hours: hours }).eq("id", id).eq("team_id", teamId);
      return ok("saved", "pages");
    }
    if (action === "alerts") {
      // Team webhook (Slack, Discord, n8n…). Empty URL = no webhook. "test" sends a test message after saving.
      const url = String(form.get("webhook_url") ?? "").trim();
      if (url && !webhookOk(url)) return err("webhook", "alertes");
      const drop = Number(form.get("score_drop"));
      await db.from("teams").update({ webhook_url: url || null, ...(SCORE_DROPS.includes(drop) ? { score_drop: drop } : {}) }).eq("id", teamId);
      if (url && form.get("test") === "1") {
        const sent = await postWebhook(url, { event: "test", domain: "agentproof", text: "message de test : les alertes arriveront ici.", link: "" }).catch(() => false);
        return sent ? ok("tested", "alertes") : err("test", "alertes");
      }
      return ok(url ? "saved" : "webhook_off", "alertes");
    }
    if (action === "score_drop") {
      const drop = Number(form.get("score_drop"));
      if (!SCORE_DROPS.includes(drop)) return err("value", "alertes");
      await db.from("teams").update({ score_drop: drop }).eq("id", teamId);
      return ok("saved", "alertes");
    }
    if (action === "site_cap") {
      // Monthly credit cap per site for automatic audits. Empty = no cap.
      const raw = String(form.get("site_credit_cap") ?? "").trim();
      const cap = raw === "" ? null : Number(raw);
      if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > 10000)) return err("cap", "plafond");
      const { error } = await db.from("teams").update({ site_credit_cap: cap }).eq("id", teamId);
      if (error) throw error;
      return ok("saved", "plafond");
    }
    if (action === "delete") {
      await db.from("automations").delete().eq("id", id).eq("team_id", teamId);
      return ok("removed", "pages");
    }
    if (action === "check") {
      const { data: a } = await db.from("automations").select("id, team_id, url, mode, signature, created_by, last_auto_audit_at, users:created_by(email)").eq("id", id).eq("team_id", teamId).single();
      if (!a) return err("value", "pages");
      await db.from("automations").update({ last_checked_at: new Date().toISOString() }).eq("id", id);
      const result = await checkAutomation(a as any);
      return result === "error" ? err("check", "pages") : ok("checked", "pages");
    }
    return err("value", "");
  } catch (e) {
    console.error("automations", action, e);
    return err("server", "");
  }
}
