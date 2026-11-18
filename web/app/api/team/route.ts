import { db } from "@/lib/engine";
import { baseUrl, createTeam, hashToken, newToken, normalizeEmail, sendMail, setTeam, teamContext } from "@/lib/auth";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);
const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const ROLES = ["admin", "viewer"];

// Team actions. Only the owner manages members and their access (admin or viewer).
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return go(req, "/connexion?next=/espace");
  const { user, teams, team } = ctx;
  const form = await req.formData();
  const action = form.get("action");
  const str = (k: string) => String(form.get(k) ?? "").trim();

  if (action === "create") {
    const name = str("name");
    if (!name) return fail("Donne un nom à l'équipe.");
    await setTeam(await createTeam(name, user.id));
    return go(req, "/equipe");
  }

  if (action === "switch") {
    if (!teams.some((t) => t.id === str("team"))) return fail("Tu ne fais pas partie de cette équipe.", 403);
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
    if (!inv) return fail("Invitation invalide ou expirée.", 404);
    if (inv.email !== user.email) return fail(`Cette invitation est pour ${inv.email}. Connecte-toi avec cette adresse.`, 403);
    await db.from("memberships").upsert({ team_id: inv.team_id, user_id: user.id, role: inv.role }, { onConflict: "team_id,user_id", ignoreDuplicates: true });
    await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
    await setTeam(inv.team_id);
    return go(req, "/espace");
  }

  if (!team) return go(req, "/espace");

  if (action === "leave") {
    if (team.role === "owner") return fail("Le propriétaire ne peut pas quitter son équipe.");
    await db.from("memberships").delete().eq("team_id", team.id).eq("user_id", user.id);
    return go(req, "/espace");
  }

  if (team.role !== "owner") return fail("Seul le propriétaire de l'équipe gère les membres.", 403);

  if (action === "invite") {
    const email = normalizeEmail(form.get("email"));
    const role = str("role");
    if (!email) return fail("Adresse e-mail invalide.");
    if (!ROLES.includes(role)) return fail("Rôle invalide.");
    const { data: member } = await db.from("memberships").select("user_id, users!inner(email)").eq("team_id", team.id).eq("users.email", email).maybeSingle();
    if (member) return fail("Cette personne fait déjà partie de l'équipe.");
    const token = newToken();
    // Re-inviting the same address replaces the old link.
    const { error } = await db.from("invitations").upsert(
      { team_id: team.id, email, role, token_hash: hashToken(token), invited_by: user.id, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(), accepted_at: null },
      { onConflict: "team_id,email" },
    );
    if (error) return fail(`Erreur : ${error.message}`);
    const link = `${baseUrl(req)}/invitation/${token}`;
    const sent = await sendMail(
      email,
      `${user.email} t'invite dans l'équipe ${team.name} sur AgentProof`,
      `${user.email} t'invite à rejoindre l'équipe « ${team.name} » sur AgentProof (${role === "admin" ? "admin : lancer des audits" : "lecteur : consulter les rapports"}).\n\nRejoindre l'équipe (lien valable 7 jours) :\n${link}`,
      link,
    );
    // The owner sees the link once, to share it by hand if the e-mail does not arrive.
    return go(req, `/equipe?${new URLSearchParams({ invite: token, email, envoye: sent ? "1" : "0" })}`);
  }

  if (action === "role") {
    if (!ROLES.includes(str("role"))) return fail("Rôle invalide.");
    if (str("user") === team.owner_id) return fail("Le rôle du propriétaire ne change pas.");
    await db.from("memberships").update({ role: str("role") }).eq("team_id", team.id).eq("user_id", str("user"));
    return go(req, "/equipe");
  }

  if (action === "remove") {
    if (str("user") === team.owner_id) return fail("Le propriétaire ne peut pas être retiré.");
    await db.from("memberships").delete().eq("team_id", team.id).eq("user_id", str("user"));
    return go(req, "/equipe");
  }

  if (action === "revoke") {
    await db.from("invitations").delete().eq("team_id", team.id).eq("id", str("invitation"));
    return go(req, "/equipe");
  }

  // White label for agencies: their name and logo on the team's public reports, instead of AgentProof's.
  if (action === "brand") {
    const name = str("brand_name").slice(0, 80);
    const logo = str("brand_logo");
    if (logo && (logo.length > 500 || !/^https:\/\/[^\s"'<>]+$/.test(logo))) return fail("Le logo doit être une adresse https vers une image.");
    await db.from("teams").update({ brand_name: name || null, brand_logo: name && logo ? logo : null }).eq("id", team.id);
    return go(req, "/equipe");
  }

  if (action === "rename") {
    if (!str("name")) return fail("Donne un nom à l'équipe.");
    await db.from("teams").update({ name: str("name").slice(0, 80) }).eq("id", team.id);
    return go(req, "/equipe");
  }

  return fail("Action inconnue.");
}
