import "server-only";
import { db, deleteSiteLogin } from "./engine";
import { mailKeys } from "./optout";

// RGPD art. 15, 17 and 20: a signed-in user downloads or erases their own data, from the Account page.

// Everything tied to this person: account, teams and roles, audits they ran or asked to receive by e-mail.
export async function exportAccount(user: { id: string; email: string }) {
  const [u, memberships, created, mailed, automations, invitations] = await Promise.all([
    db.from("users").select("*").eq("id", user.id).single(),
    db.from("memberships").select("role, created_at, teams(id, name, brand_name, created_at)").eq("user_id", user.id),
    db.from("audits").select("id, kind, device, status, created_at, sites(domain)").eq("created_by", user.id),
    db.from("audits").select("id, created_at, sites(domain)").eq("email", user.email),
    db.from("automations").select("id, url, enabled, mode, monthly, created_at").eq("created_by", user.id),
    db.from("invitations").select("team_id, role, created_at, accepted_at").eq("email", user.email),
  ]);
  return {
    exported_at: new Date().toISOString(),
    account: u.data,
    teams: memberships.data ?? [],
    audits_launched: created.data ?? [],
    reports_sent_to_your_email: mailed.data ?? [],
    automations_created: automations.data ?? [],
    invitations_received: invitations.data ?? [],
  };
}

// Permanent erasure. Teams the user owns alone go with them (audits, screenshots rows, automations, card, test accounts).
// Teams with other members stay: ownership moves to the oldest remaining admin, else editor, else the oldest member.
// Never call it for someone else: the only caller is POST /api/account, for the signed-in user, after they typed their e-mail.
export async function deleteAccount(user: { id: string; email: string }) {
  const { data: mine } = await db.from("memberships").select("team_id, role").eq("user_id", user.id);
  for (const m of mine ?? []) {
    const { data: others } = await db
      .from("memberships")
      .select("user_id, role, created_at")
      .eq("team_id", m.team_id)
      .neq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (others?.length) {
      const heir = others.find((o) => o.role === "admin") ?? others.find((o) => o.role === "editor") ?? others[0];
      const { data: team } = await db.from("teams").select("owner_id").eq("id", m.team_id).single();
      if (team?.owner_id === user.id) {
        await db.from("teams").update({ owner_id: heir.user_id }).eq("id", m.team_id);
        await db.from("memberships").update({ role: "owner" }).eq("team_id", m.team_id).eq("user_id", heir.user_id);
      }
      await db.from("team_cards").update({ updated_by: heir.user_id }).eq("team_id", m.team_id).eq("updated_by", user.id);
      continue;
    }
    await deleteTeam(m.team_id);
  }
  // Rows that point at the user without cascading.
  await db.from("invitations").delete().eq("invited_by", user.id);
  await db.from("invitations").delete().eq("email", user.email);
  await db.from("login_tokens").delete().eq("email", user.email);
  await db.from("audits").update({ email: null }).eq("email", user.email);
  await db.from("email_optouts").delete().in("email", mailKeys(user.email)).then(() => null, () => null);
  // memberships cascade; audits.created_by, automations.created_by and fixes.fixed_by become null.
  const { error } = await db.from("users").delete().eq("id", user.id);
  if (error) throw new Error(error.message);
}

// A team with no one left. Its audits are deleted, not detached: an audit without a team counts as public (leaderboard).
async function deleteTeam(teamId: string) {
  const { data: logins } = await db.from("site_logins").select("id").eq("team_id", teamId);
  for (const l of logins ?? []) await deleteSiteLogin(teamId, l.id);
  const { data: audits } = await db.from("audits").select("id").eq("team_id", teamId);
  const ids = (audits ?? []).map((a) => a.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    await db.from("audits").update({ compare_to: null, payment_test: null }).in("compare_to", chunk);
    await db.from("audits").update({ payment_test: null }).in("payment_test", chunk);
    await db.from("automation_checks").update({ audit_id: null }).in("audit_id", chunk);
  }
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await db.from("audits").delete().in("id", ids.slice(i, i + 100)); // runs cascade
    if (error) throw new Error(error.message);
  }
  // automations, fixes, invitations, memberships, site_logins and team_cards cascade.
  const { error } = await db.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
}
