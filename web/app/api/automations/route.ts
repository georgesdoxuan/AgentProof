import { canLaunch, teamContext } from "@/lib/auth";
import { db, normalizeUrl } from "@/lib/engine";
import { checkAutomation } from "@/lib/automations";

const go = (req: Request) => Response.redirect(new URL("/espace/automations", req.url), 303);
const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const MAX_PER_TEAM = 20;
export const maxDuration = 60;

// Daily site watch of the current team. Owner or admin only.
// state: "off" = paused, "notify" = alert only, "audit" = alert and launch a new audit.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace/automations", req.url), 303);
  if (!ctx.team || !canLaunch(ctx.team.role)) return fail("Seuls le propriétaire et les admins de l'équipe gèrent les automations.", 403);
  const teamId = ctx.team.id;
  const form = await req.formData();
  const action = form.get("action");
  const id = Number(form.get("id"));
  const state = String(form.get("state") ?? "notify");
  const settings = state === "off" ? { enabled: false } : { enabled: true, mode: state === "audit" ? "audit" : "notify" };
  try {
    if (action === "add") {
      const urls = String(form.get("urls") ?? "").split(/[\s,]+/).filter(Boolean).map((u) => normalizeUrl(u).url);
      if (!urls.length) return fail("Indique au moins une URL.");
      const { count } = await db.from("automations").select("id", { count: "exact", head: true }).eq("team_id", teamId);
      if ((count ?? 0) + urls.length > MAX_PER_TEAM) return fail(`${MAX_PER_TEAM} pages suivies au maximum par équipe.`);
      const { error } = await db
        .from("automations")
        .upsert(urls.map((url) => ({ team_id: teamId, url, created_by: ctx.user.id, ...settings })), { onConflict: "team_id,url", ignoreDuplicates: true });
      if (error) throw error;
    } else if (action === "state") {
      await db.from("automations").update(settings).eq("id", id).eq("team_id", teamId);
    } else if (action === "delete") {
      await db.from("automations").delete().eq("id", id).eq("team_id", teamId);
    } else if (action === "check") {
      const { data: a } = await db.from("automations").select("id, team_id, url, mode, signature, created_by, users:created_by(email)").eq("id", id).eq("team_id", teamId).single();
      if (a) {
        await db.from("automations").update({ last_checked_at: new Date().toISOString() }).eq("id", id);
        await checkAutomation(a as any);
      }
    }
  } catch (e) {
    return fail(`Erreur : ${(e as Error).message}`);
  }
  return go(req);
}
