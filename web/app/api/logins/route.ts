import { isJury, juryLocked } from "@/lib/jury";
import { canLaunch, teamContext } from "@/lib/auth";
import { addSiteLogin, db, deleteSiteLogin } from "@/lib/engine";
import { msg } from "@/lib/lang";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);
const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

// Test accounts for sites that require a login before paying. Owner or admin only.
// The password is forwarded to the team's H-hosted vault and never stored or logged by AgentProof.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return go(req, "/connexion?next=/espace/reglages/comptes");
  if (!ctx.team || !canLaunch(ctx.team.role)) return fail(await msg("Ton rôle (lecteur) ne permet pas de gérer les comptes de test.", "Your role (viewer) cannot manage test accounts."), 403);
  const form = await req.formData();
  try {
    if (form.get("action") === "delete") {
      // Jury demo: a judge removes only the accounts they added, never the demo's own or another judge's.
      if (isJury(ctx.user.email) && !(await ownLogin(ctx.team.id, Number(form.get("id")), ctx.user.id))) return juryLocked();
      await deleteSiteLogin(ctx.team.id, Number(form.get("id")));
    }
    else {
      if (form.get("consent") !== "1") return fail(await msg("Coche la case pour confirmer que ce compte t'appartient.", "Tick the box to confirm this account is yours."));
      await addSiteLogin(ctx.team.id, String(form.get("site") ?? ""), String(form.get("login") ?? "").trim(), String(form.get("password") ?? ""), ctx.user.id, String(form.get("label") ?? ""));
    }
  } catch (e) {
    return fail(`${await msg("Erreur", "Error")} : ${(e as Error).message}`);
  }
  return go(req, "/espace/reglages/comptes");
}

const ownLogin = async (teamId: string, id: number, userId: string) =>
  !!(await db.from("site_logins").select("id").eq("id", id).eq("team_id", teamId).eq("created_by", userId).maybeSingle()).data;
