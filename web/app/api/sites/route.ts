import { isJury, juryLocked } from "@/lib/jury";
import { db } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { msg } from "@/lib/lang";
import { purgeAudit } from "@/lib/purge";
import { hiddenLinked } from "@/lib/space";

// Site management in the team space: trash a whole site (one device), restore it, delete it for good. Owner and admin only.
// A site is its reports grouped by domain and device: trashing it moves all of them to the trash at once,
// with one shared date, so restoring it brings back exactly that batch. Nothing is deleted before "purge".
const ACTIONS = ["trash", "restore", "purge", "empty"] as const;
type Action = (typeof ACTIONS)[number];

const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
type Row = { id: string; status: string; deleted_at: string | null; compare_to: string | null; payment_test: string | null };

export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace/sites", req.url), 303);
  if (isJury(ctx.user.email)) return juryLocked();
  if (!ctx.team) return Response.redirect(new URL("/espace", req.url), 303);
  const form = await req.formData();
  const back = String(form.get("back") ?? "");
  const next = new URL(/^\/espace\/(sites|reglages\/corbeille\/sites)$/.test(back) ? back : "/espace/sites", req.url);
  if (!canLaunch(ctx.team.role)) return fail(await msg("Ton rôle (lecteur) permet de consulter les sites, pas de les modifier.", "Your role (viewer) lets you read sites, not change them."), 403);

  const action = String(form.get("action") ?? "") as Action;
  if (!ACTIONS.includes(action)) return fail(await msg("Action inconnue.", "Unknown action."));
  const teamId = ctx.team.id;

  // The team's site reports, competitor audits left out: they belong to the site they were compared with.
  const reports = async (siteId?: number, device?: string) => {
    let q = db.from("audits").select("id, status, deleted_at, compare_to, payment_test, site_id, device").eq("team_id", teamId).eq("kind", "checkout");
    if (siteId != null) q = q.eq("site_id", siteId).eq("device", device!);
    const [{ data }, { data: linked }] = await Promise.all([q, db.from("audits").select("id, compare_to, device").eq("team_id", teamId).not("compare_to", "is", null)]);
    // Same device only: the mobile half of a Desktop + Mobile launch is a report of the mobile site.
    const { data: targets } = linked?.length ? await db.from("audits").select("id, compare_to, device").in("id", linked.map((l) => l.compare_to!)) : { data: [] };
    const competitors = hiddenLinked([...(linked ?? []), ...(targets ?? [])]);
    return ((data ?? []) as (Row & { site_id: number; device: string })[]).filter((a) => !competitors.has(a.id));
  };

  // Empty the trash: every site whose reports are all in the trash, finished ones only.
  if (action === "empty") {
    const all = await reports();
    const active = new Set(all.filter((a) => !a.deleted_at).map((a) => `${a.site_id}/${a.device}`));
    for (const a of all) if (a.deleted_at && a.status === "done" && !active.has(`${a.site_id}/${a.device}`)) await purgeAudit(a);
    return Response.redirect(next, 303);
  }

  const siteId = Number(form.get("site_id"));
  const device = String(form.get("device") ?? "");
  if (!Number.isInteger(siteId) || !["desktop", "mobile"].includes(device)) return fail(await msg("Site inconnu.", "Unknown site."));
  const rows = await reports(siteId, device);
  if (!rows.length) return fail(await msg("Site inconnu pour cette équipe.", "Unknown site for this team."), 404);
  const active = rows.filter((a) => !a.deleted_at);
  const trashed = rows.filter((a) => a.deleted_at);

  if (action === "trash") {
    if (active.length) await db.from("audits").update({ deleted_at: new Date().toISOString() }).in("id", active.map((a) => a.id));
  } else if (action === "restore") {
    // The batch moved with the site (latest date); reports trashed one by one before stay in Réglages › Corbeille › Rapports.
    const latest = Math.max(...trashed.map((a) => Date.parse(a.deleted_at!)));
    const batch = trashed.filter((a) => Date.parse(a.deleted_at!) === latest);
    if (batch.length) await db.from("audits").update({ deleted_at: null }).in("id", batch.map((a) => a.id));
  } else if (action === "purge") {
    // Only from the trash, and never while the agent is still playing missions on it.
    if (active.length) return fail(await msg("Mets d'abord le site à la corbeille.", "Move the site to the trash first."));
    if (trashed.some((a) => a.status !== "done")) return fail(await msg("Audit en cours : attends qu'il se termine pour supprimer le site définitivement.", "Audit running: wait for it to finish before deleting the site permanently."), 409);
    for (const a of trashed) await purgeAudit(a);
  }
  return Response.redirect(next, 303);
}
