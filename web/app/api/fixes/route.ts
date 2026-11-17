import { BLOCKERS, db } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";

// Checklist on a site page: mark a blocker as fixed (or undo). Owner and admin only.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx?.team) return Response.redirect(new URL("/connexion?next=/espace", req.url), 303);
  const form = await req.formData();
  const back = String(form.get("back") ?? "/espace/sites");
  const next = new URL(/^\/espace\/[\w./-]*(#[\w-]+)?$/.test(back) ? back : "/espace/sites", req.url);
  if (!canLaunch(ctx.team.role)) return Response.redirect(next, 303);

  const siteId = Number(form.get("site"));
  const device = form.get("device") === "mobile" ? "mobile" : "desktop";
  const blocker = String(form.get("blocker") ?? "");
  if (!Number.isInteger(siteId) || !(blocker in BLOCKERS)) return new Response("Requête invalide.", { status: 400 });

  // The site must belong to one of this team's audits.
  const { count } = await db.from("audits").select("id", { count: "exact", head: true }).eq("team_id", ctx.team.id).eq("site_id", siteId);
  if (!count) return new Response("Site inconnu pour cette équipe.", { status: 404 });

  const key = { team_id: ctx.team.id, site_id: siteId, device, blocker_type: blocker };
  if (form.get("action") === "undo") await db.from("fixes").delete().match(key);
  else await db.from("fixes").upsert({ ...key, fixed_at: new Date().toISOString(), fixed_by: ctx.user.id });
  return Response.redirect(next, 303);
}
