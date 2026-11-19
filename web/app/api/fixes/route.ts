import { after } from "next/server";
import { BLOCKERS, createAudit, db, tick } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { msg } from "@/lib/lang";

// Checklist on a site page: mark a blocker as fixed (or undo), or prove the fix. Owner and admin only.
// "prove" replays only the missions the blocker stopped in the latest full audit (1 to 3 missions, not a full audit):
// when they pass, the space shows the fix as proven by the agent instead of by a checkbox.
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
  if (!Number.isInteger(siteId) || !(blocker in BLOCKERS)) return new Response(await msg("Requête invalide.", "Invalid request."), { status: 400 });

  // The site must belong to one of this team's audits.
  const { count } = await db.from("audits").select("id", { count: "exact", head: true }).eq("team_id", ctx.team.id).eq("site_id", siteId);
  if (!count) return new Response(await msg("Site inconnu pour cette équipe.", "Unknown site for this team."), { status: 404 });

  const key = { team_id: ctx.team.id, site_id: siteId, device, blocker_type: blocker };
  if (form.get("action") === "prove") {
    const { data: latest } = await db
      .from("audits")
      .select("id, sites(url), runs(mission_id, success, blocker_type)")
      .eq("team_id", ctx.team.id)
      .eq("site_id", siteId)
      .eq("device", device)
      .eq("kind", "checkout")
      .eq("status", "done")
      .is("deleted_at", null)
      .is("proof_of", null)
      .order("created_at", { ascending: false })
      .limit(5);
    const full = (latest ?? []).find((a: any) => a.runs.length);
    const missionIds = [...new Set((full?.runs ?? []).filter((r: any) => r.success === false && r.blocker_type === blocker).map((r: any) => r.mission_id as number))].slice(0, 3);
    if (!full || !missionIds.length) return Response.redirect(next, 303);
    // One proof at a time per blocker: a second click opens the one already running.
    const { data: running } = await db.from("audits").select("id").eq("team_id", ctx.team.id).eq("site_id", siteId).eq("device", device).eq("proof_of", blocker).neq("status", "done").limit(1);
    if (running?.length) return Response.redirect(new URL(`/audit/${running[0].id}`, req.url), 303);
    // The proof counts for a fix dated before it: re-marked now, also when the blocker came back after an older fix.
    await db.from("fixes").upsert({ ...key, fixed_at: new Date().toISOString(), fixed_by: ctx.user.id });
    const id = await createAudit((full as any).sites.url, { device, missionIds, proofOf: blocker, teamId: ctx.team.id, createdBy: ctx.user.id, email: ctx.user.email });
    after(() => tick(0).catch(() => {}));
    return Response.redirect(new URL(`/audit/${id}`, req.url), 303);
  }
  if (form.get("action") === "undo") await db.from("fixes").delete().match(key);
  else await db.from("fixes").upsert({ ...key, fixed_at: new Date().toISOString(), fixed_by: ctx.user.id });
  return Response.redirect(next, 303);
}
