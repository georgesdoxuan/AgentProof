import "server-only";
import { db } from "./engine";

// Jury demo: the prototype the hackathon judges open from /demo, kept apart from every real team.
// - One shared team, found by its plan ("jury"), holds copies of finished reports (supabase/demo/jury_seed.sql):
//   the real teams' audits are never read, changed or shown through it.
// - Each click on /demo makes a fresh judge account (juge-xxxx@jury.agentproof.test, a reserved .test domain no mail
//   reaches) with the editor role in that team: reports, sites, corrections, replays and the launch form work as usual.
// - What could spend money, reach the outside or change the shared space for the next judge is refused on the server
//   (card, test accounts, members, automations, Slack, trash, account deletion), whatever the page shows.
// - Audits: JURY_AUDITS per judge, JURY_DAILY for the whole jury team per day, never a real payment.
export const JURY_DOMAIN = "jury.agentproof.test";
export const JURY_PLAN = "jury";
export const JURY_AUDITS = 2;
export const JURY_DAILY = 24;
export const JURY_SIGNUPS_PER_HOUR = 60;

export const isJury = (email?: string | null) => !!email && email.toLowerCase().endsWith(`@${JURY_DOMAIN}`);

// The jury team (the oldest one on the jury plan), or null when the demo space was not seeded.
export async function juryTeam() {
  const { data } = await db.from("teams").select("id").eq("plan", JURY_PLAN).order("created_at").limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// Audits this judge may still start: per judge (lifetime of the account) and for the whole jury team today.
// Every audit row counts, so a competitor or Desktop + Mobile launch (two audits) uses two.
export async function juryAuditsLeft(userId: string, teamId: string) {
  const day = new Date(Date.now() - 86400_000).toISOString();
  const [{ count: mine }, { count: team }] = await Promise.all([
    db.from("audits").select("id", { count: "exact", head: true }).eq("created_by", userId),
    db.from("audits").select("id", { count: "exact", head: true }).eq("team_id", teamId).not("created_by", "is", null).gte("created_at", day),
  ]);
  return Math.max(0, Math.min(JURY_AUDITS - (mine ?? 0), JURY_DAILY - (team ?? 0)));
}

// Safety net under every launch path (createAudit): a jury-team audit past the daily cap is refused, whatever started it.
export async function juryTeamFull(teamId: string) {
  const { data: t } = await db.from("teams").select("plan").eq("id", teamId).maybeSingle();
  if (t?.plan !== JURY_PLAN) return false;
  const day = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db.from("audits").select("id", { count: "exact", head: true }).eq("team_id", teamId).not("created_by", "is", null).gte("created_at", day);
  return (count ?? 0) >= JURY_DAILY;
}

// The answer to an action the jury demo turns off: plain text, like the other refusals of the space's API.
export async function juryLocked() {
  const { msg } = await import("./lang");
  return new Response(
    await msg(
      "Démo jury : cette action est désactivée pour garder l'espace de démonstration intact (carte, comptes de test, membres, automatisations, corbeille). Tout le reste se teste librement.",
      "Jury demo: this action is turned off to keep the demo space intact (card, test accounts, members, automations, trash). Everything else is open to try.",
    ),
    { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
