import { randomBytes } from "node:crypto";
import { currentUser, setTeam, startSession } from "@/lib/auth";
import { db } from "@/lib/engine";
import { JURY_DOMAIN, JURY_SIGNUPS_PER_HOUR, isJury, juryTeam } from "@/lib/jury";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);

// "Enter the demo" on /demo: one click, no e-mail, no password. A POST (a form button), so no link preview or
// prefetch ever creates an account. A judge already signed in to the demo goes back to it; anyone else gets a fresh
// judge account (juge-xxxxxx@jury.agentproof.test, editor in the jury team only: see lib/jury.ts).
export async function POST(req: Request) {
  const teamId = await juryTeam();
  if (!teamId) return go(req, "/demo?erreur=fermee");

  const me = await currentUser();
  if (me && isJury(me.email)) {
    const { count } = await db.from("memberships").select("team_id", { count: "exact", head: true }).eq("user_id", me.id).eq("team_id", teamId);
    if (count) {
      await setTeam(teamId);
      return go(req, "/espace");
    }
  }

  // A burst of new judge accounts is someone scripting the button, not a jury: stop there.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count: recent } = await db.from("users").select("id", { count: "exact", head: true }).like("email", `%@${JURY_DOMAIN}`).gte("created_at", since);
  if ((recent ?? 0) >= JURY_SIGNUPS_PER_HOUR) return go(req, "/demo?erreur=trop");

  const email = `juge-${randomBytes(3).toString("hex")}@${JURY_DOMAIN}`;
  const { data: user, error } = await db.from("users").insert({ email, terms_accepted_at: new Date().toISOString() }).select("id").single();
  if (error || !user) return go(req, "/demo?erreur=technique");
  const { error: e2 } = await db.from("memberships").insert({ team_id: teamId, user_id: user.id, role: "editor" });
  if (e2) return go(req, "/demo?erreur=technique");
  await startSession(user.id);
  await setTeam(teamId);
  return go(req, "/espace");
}
