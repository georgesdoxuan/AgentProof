import "server-only";
import { db } from "./engine";
import type { SiteView, SpaceAudit } from "./space";

// The month in review: what the subscription did while nothing visible happened.
// A watch that never rings looks like a watch that does nothing; these counts show the work behind the silence.
// ponytail: month boundaries in UTC, not Europe/Paris (off by one or two hours at midnight on the 1st).
export async function monthRecap(teamId: string, audits: SpaceAudit[], sites: SiteView[], at = new Date()) {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const since = start.toISOString();
  const { data: autos } = await db.from("automations").select("id").eq("team_id", teamId);
  const ids = (autos ?? []).map((a) => a.id);
  const [{ data: checks }, { count: drops }] = await Promise.all([
    ids.length
      ? db.from("automation_checks").select("status").in("automation_id", ids).gte("checked_at", since)
      : Promise.resolve({ data: [] as { status: string }[] }),
    db.from("audits").select("id", { count: "exact", head: true }).eq("team_id", teamId).not("score_alert", "is", null).gte("created_at", since),
  ]);
  const c = checks ?? [];
  const thisMonth = (d: string | undefined) => !!d && d >= since;
  return {
    start,
    audits: audits.filter((a) => a.status === "done" && a.runs.length && thisMonth(a.created_at)).length,
    checks: c.filter((x) => ["same", "changed"].includes(x.status)).length,
    changes: c.filter((x) => x.status === "changed").length,
    deploys: c.filter((x) => x.status === "deploy").length,
    drops: drops ?? 0,
    // Marked fixed, then gone in an audit run this month: the fix is proven by the agent, not by a checkbox.
    proven: sites.filter((s) => thisMonth(s.latest?.created_at)).reduce((n, s) => n + s.verified.length, 0),
    open: sites.reduce((n, s) => n + s.blockers.filter((b) => b.state !== "check").length, 0),
  };
}
