import "server-only";
import { db } from "./engine";
import type { SiteView, SpaceAudit } from "./space";

// The month in review: what the subscription did while nothing visible happened.
// A watch that never rings looks like a watch that does nothing; these counts show the work behind the silence.
// `at` picks the month (the current one by default; the monthly e-mail passes a day of the month before).
// ponytail: month boundaries in UTC, not Europe/Paris (off by one or two hours at midnight on the 1st).
export async function monthRecap(teamId: string, audits: SpaceAudit[], sites: SiteView[], at = new Date()) {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
  return periodRecap(teamId, audits, sites, start, end);
}

// Periods offered on the home page: the last 7 or 30 days, each month since the team's first audit, or everything.
// The choice lives in a cookie (PERIOD_COOKIE, set by PeriodSelect); the current month is the default.
export const PERIOD_COOKIE = "ap_accueil_periode";
export type Period = { key: string; start: Date; end: Date; month: boolean };
export function periods(audits: SpaceAudit[], now = new Date()): Period[] {
  const day = 86_400_000;
  const end = new Date(now.getTime() + day);
  const first = audits.reduce((m, a) => (a.created_at < m ? a.created_at : m), now.toISOString());
  const f = new Date(first);
  const months: Period[] = [];
  const last = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1);
  for (let i = 0; i < 24; i++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    if (i > 0 && start.getTime() < last) break;
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({ key, start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)), month: true });
  }
  return [
    ...months.slice(0, 1),
    { key: "7d", start: new Date(now.getTime() - 7 * day), end, month: false },
    { key: "30d", start: new Date(now.getTime() - 30 * day), end, month: false },
    ...months.slice(1),
    { key: "all", start: new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1)), end, month: false },
  ];
}

export async function periodRecap(teamId: string, audits: SpaceAudit[], sites: SiteView[], start: Date, end: Date) {
  const [since, until] = [start.toISOString(), end.toISOString()];
  const { data: autos } = await db.from("automations").select("id").eq("team_id", teamId);
  const ids = (autos ?? []).map((a) => a.id);
  const [{ data: checks }, { count: drops }] = await Promise.all([
    ids.length
      ? db.from("automation_checks").select("status").in("automation_id", ids).gte("checked_at", since).lt("checked_at", until)
      : Promise.resolve({ data: [] as { status: string }[] }),
    db.from("audits").select("id", { count: "exact", head: true }).eq("team_id", teamId).not("score_alert", "is", null).gte("created_at", since).lt("created_at", until),
  ]);
  const c = checks ?? [];
  const inMonth = (d: string | undefined) => !!d && new Date(d) >= start && new Date(d) < end;
  return {
    start,
    audits: audits.filter((a) => a.status === "done" && a.runs.length && !a.proof_of && inMonth(a.created_at)).length,
    checks: c.filter((x) => ["same", "changed"].includes(x.status)).length,
    changes: c.filter((x) => x.status === "changed").length,
    deploys: c.filter((x) => x.status === "deploy").length,
    drops: drops ?? 0,
    // Fixes proven by the agent (a later audit or a proof replay), not by a checkbox, on sites audited or replayed this month.
    proven: sites.filter((s) => inMonth(s.latest?.created_at) || s.proofs.some((p) => p.status === "done" && inMonth(p.created_at))).reduce((n, s) => n + s.verified.length, 0),
    open: sites.reduce((n, s) => n + s.blockers.filter((b) => b.state !== "check").length, 0),
  };
}
