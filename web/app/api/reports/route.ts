import { db } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { msg } from "@/lib/lang";

// Report management in the team space: favourite, rename, trash, restore, delete for good. Owner and admin only.
// Every action is scoped to the current team; the form sends back where to land (a /espace/rapports page).
const ACTIONS = ["favorite", "unfavorite", "rename", "trash", "restore", "purge", "empty"] as const;
type Action = (typeof ACTIONS)[number];
const TITLE_MAX = 120;

const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace/rapports", req.url), 303);
  if (!ctx.team) return Response.redirect(new URL("/espace", req.url), 303);
  const form = await req.formData();
  const back = String(form.get("back") ?? "");
  const next = new URL(/^\/espace\/rapports[\w/-]*(\?[\w=&-]*)?$/.test(back) ? back : "/espace/rapports", req.url);
  if (!canLaunch(ctx.team.role)) return fail(await msg("Ton rôle (lecteur) permet de consulter les rapports, pas de les modifier.", "Your role (viewer) lets you read reports, not change them."), 403);

  const action = String(form.get("action") ?? "") as Action;
  if (!ACTIONS.includes(action)) return fail(await msg("Action inconnue.", "Unknown action."));
  const teamId = ctx.team.id;

  // Empty the trash: every report of the team already in it.
  if (action === "empty") {
    const { data } = await db.from("audits").select("id, status, compare_to, payment_test").eq("team_id", teamId).not("deleted_at", "is", null);
    for (const a of data ?? []) if (a.status === "done") await purge(a);
    return Response.redirect(next, 303);
  }

  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail(await msg("Rapport inconnu.", "Unknown report."));
  const { data: audit } = await db.from("audits").select("id, status, deleted_at, compare_to, payment_test").eq("id", id).eq("team_id", teamId).maybeSingle();
  if (!audit) return fail(await msg("Rapport inconnu pour cette équipe.", "Unknown report for this team."), 404);

  const now = new Date().toISOString();
  if (action === "favorite" || action === "unfavorite") await db.from("audits").update({ favorite: action === "favorite" }).eq("id", id);
  else if (action === "rename") {
    // Empty name = back to the site's domain.
    const title = String(form.get("title") ?? "").replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
    await db.from("audits").update({ title: title || null }).eq("id", id);
  } else if (action === "trash") await db.from("audits").update({ deleted_at: now }).eq("id", id);
  else if (action === "restore") await db.from("audits").update({ deleted_at: null }).eq("id", id);
  else if (action === "purge") {
    // Only from the trash, and never while the agent is still playing missions on it.
    if (!audit.deleted_at) return fail(await msg("Mets d'abord le rapport à la corbeille.", "Move the report to the trash first."));
    if (audit.status !== "done") return fail(await msg("Audit en cours : attends qu'il se termine pour le supprimer définitivement.", "Audit running: wait for it to finish before deleting it permanently."), 409);
    await purge(audit);
  }
  return Response.redirect(next, 303);
}

// Permanent delete: the audit and its runs (cascade), then its competitor or model-comparison audit
// and its real payment test, which only exist through it.
async function purge(a: { id: string; compare_to: string | null; payment_test: string | null }) {
  await db.from("audits").update({ compare_to: null }).eq("compare_to", a.id);
  await db.from("audits").delete().eq("id", a.id);
  for (const linked of [a.compare_to, a.payment_test]) {
    if (!linked) continue;
    const { count } = await db.from("audits").select("id", { count: "exact", head: true }).or(`compare_to.eq.${linked},payment_test.eq.${linked}`);
    if (!count) await db.from("audits").delete().eq("id", linked);
  }
}
