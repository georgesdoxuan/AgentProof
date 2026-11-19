import { isJury, juryLocked } from "@/lib/jury";
import { db } from "@/lib/engine";
import { baseUrl, canLaunch, canManageMembers, createTeam, hashToken, newToken, normalizeEmail, sendMail, setTeam, teamContext } from "@/lib/auth";
import { msg } from "@/lib/lang";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);
const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const ROLES = ["admin", "editor", "viewer"];

// Team actions. The owner and admins manage members and their access; an editor does everything else, a viewer reads.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return go(req, "/connexion?next=/espace");
  const { user, teams, team } = ctx;
  const form = await req.formData();
  const action = form.get("action");
  const str = (k: string) => String(form.get(k) ?? "").trim();
  // Jury demo: no new team (it would escape the audit quota), no members, no rename: only the switch, a no-op there.
  if (isJury(user.email) && action !== "switch") return juryLocked();

  if (action === "create") {
    const name = str("name");
    if (!name) return fail(await msg("Donne un nom à l'équipe.", "Give the team a name."));
    await setTeam(await createTeam(name, user.id));
    return go(req, "/espace/reglages/equipe");
  }

  if (action === "switch") {
    if (!teams.some((t) => t.id === str("team"))) return fail(await msg("Tu ne fais pas partie de cette équipe.", "You are not part of this team."), 403);
    await setTeam(str("team"));
    return go(req, "/espace");
  }

  if (action === "accept") {
    const { data: inv } = await db
      .from("invitations")
      .select("id, team_id, email, role")
      .eq("token_hash", hashToken(str("token")))
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!inv) return fail(await msg("Invitation invalide ou expirée.", "Invalid or expired invitation."), 404);
    if (inv.email !== user.email) return fail(await msg(`Cette invitation est pour ${inv.email}. Connecte-toi avec cette adresse.`, `This invitation is for ${inv.email}. Sign in with that address.`), 403);
    await db.from("memberships").upsert({ team_id: inv.team_id, user_id: user.id, role: inv.role }, { onConflict: "team_id,user_id", ignoreDuplicates: true });
    await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
    await setTeam(inv.team_id);
    return go(req, "/espace");
  }

  if (!team) return go(req, "/espace");

  if (action === "leave") {
    if (team.role === "owner") return fail(await msg("Le propriétaire ne peut pas quitter son équipe.", "The owner cannot leave their team."));
    await db.from("memberships").delete().eq("team_id", team.id).eq("user_id", user.id);
    return go(req, "/espace");
  }

  const memberAction = ["invite", "role", "remove", "revoke"].includes(String(action));
  if (memberAction && !canManageMembers(team.role)) return fail(await msg("Réservé aux admins : seuls le propriétaire et les admins invitent, retirent et changent les rôles.", "Admins only: only the owner and admins invite, remove and change roles."), 403);
  if (!memberAction && !canLaunch(team.role)) return fail(await msg("Ton rôle (lecteur) permet de consulter l'équipe, pas de la modifier.", "Your role (viewer) lets you see the team, not change it."), 403);

  if (action === "invite") {
    const email = normalizeEmail(form.get("email"));
    const role = str("role");
    if (!email) return fail(await msg("Adresse e-mail invalide.", "Invalid e-mail address."));
    if (!ROLES.includes(role)) return fail(await msg("Rôle invalide.", "Invalid role."));
    const { data: member } = await db.from("memberships").select("user_id, users!inner(email)").eq("team_id", team.id).eq("users.email", email).maybeSingle();
    if (member) return fail(await msg("Cette personne fait déjà partie de l'équipe.", "This person is already in the team."));
    const token = newToken();
    // Re-inviting the same address replaces the old link.
    const { error } = await db.from("invitations").upsert(
      { team_id: team.id, email, role, token_hash: hashToken(token), invited_by: user.id, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(), accepted_at: null },
      { onConflict: "team_id,email" },
    );
    if (error) return fail(`${await msg("Erreur", "Error")} : ${error.message}`);
    const link = `${baseUrl(req)}/invitation/${token}`;
    const sent = await sendMail(
      email,
      await msg(`${user.email} t'invite dans l'équipe ${team.name} sur AgentProof`, `${user.email} invites you to the team ${team.name} on AgentProof`),
      await msg(
        `${user.email} t'invite à rejoindre l'équipe « ${team.name} » sur AgentProof (${{ admin: "admin : tout, y compris gérer les membres", editor: "éditeur : lancer des audits et tout gérer sauf les membres", viewer: "lecteur : consulter les rapports" }[role]}).\n\nRejoindre l'équipe (lien valable 7 jours) :\n${link}`,
        `${user.email} invites you to join the team “${team.name}” on AgentProof (${{ admin: "admin: everything, including members", editor: "editor: run audits and manage everything but members", viewer: "viewer: read reports" }[role]}).\n\nJoin the team (link valid for 7 days):\n${link}`,
      ),
      link,
    );
    // The inviter sees the link once, to share it by hand if the e-mail does not arrive.
    return go(req, `/espace/reglages/equipe?${new URLSearchParams({ invite: token, email, envoye: sent ? "1" : "0" })}`);
  }

  if (action === "role") {
    if (!ROLES.includes(str("role"))) return fail(await msg("Rôle invalide.", "Invalid role."));
    if (str("user") === team.owner_id) return fail(await msg("Le rôle du propriétaire ne change pas.", "The owner's role does not change."));
    if (str("user") === user.id) return fail(await msg("Tu ne peux pas changer ton propre rôle : demande à un autre admin.", "You cannot change your own role: ask another admin."), 403);
    const { error } = await db.from("memberships").update({ role: str("role") }).eq("team_id", team.id).eq("user_id", str("user"));
    if (error) return fail(`${await msg("Erreur", "Error")} : ${error.message}`);
    return go(req, "/espace/reglages/equipe");
  }

  if (action === "remove") {
    if (str("user") === team.owner_id) return fail(await msg("Le propriétaire ne peut pas être retiré.", "The owner cannot be removed."));
    if (str("user") === user.id) return fail(await msg("Pour partir, utilise « Quitter l'équipe ».", "To go, use “Leave the team”."));
    await db.from("memberships").delete().eq("team_id", team.id).eq("user_id", str("user"));
    return go(req, "/espace/reglages/equipe");
  }

  if (action === "revoke") {
    await db.from("invitations").delete().eq("team_id", team.id).eq("id", str("invitation"));
    return go(req, "/espace/reglages/equipe");
  }

  // White label for agencies: their name and logo on the team's public reports, instead of AgentProof's.
  if (action === "brand") {
    const name = str("brand_name").slice(0, 80);
    const logo = str("brand_logo");
    if (logo && (logo.length > 500 || !/^https:\/\/[^\s"'<>]+$/.test(logo))) return fail(await msg("Le logo doit être une adresse https vers une image.", "The logo must be an https address of an image."));
    await db.from("teams").update({ brand_name: name || null, brand_logo: name && logo ? logo : null }).eq("id", team.id);
    return go(req, "/espace/reglages/equipe");
  }

  if (action === "rename") {
    if (!str("name")) return fail(await msg("Donne un nom à l'équipe.", "Give the team a name."));
    await db.from("teams").update({ name: str("name").slice(0, 80) }).eq("id", team.id);
    return go(req, "/espace/reglages/equipe");
  }

  return fail(await msg("Action inconnue.", "Unknown action."));
}
