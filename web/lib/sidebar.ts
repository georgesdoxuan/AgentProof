import "server-only";
import { db } from "./engine";
import { loadSpace } from "./space";
import { creditsLeft } from "./credits";

// What the space's sidebar shows besides its links: counters, recent sites, live audits, the watch, the month's credits.
// Read by the layout (first paint) and by /api/sidebar (after each navigation, and every few seconds while an audit runs).
// Plain data only: it crosses to the client.
export type SideData = {
  open: number; // blockers still open across the sites (same count as the home page's chip)
  running: { id: string; label: string; domain: string; done: number; total: number }[];
  sites: { key: string; label: string; domain: string; device: string; score: number | null }[]; // most recent activity first
  watch: { pages: number; next: string | null; soon: boolean }; // enabled automations, next page check (soon: within a day)
  credits: { used: number; included: number; renews: string };
};

const HOUR = 3600_000;
const SITES = 3;

export async function loadSidebar(teamId: string): Promise<SideData> {
  const [{ audits, sites }, credits, { data: autos }] = await Promise.all([
    loadSpace(teamId),
    creditsLeft(teamId),
    db.from("automations").select("last_checked_at, interval_hours").eq("team_id", teamId).eq("enabled", true),
  ]);
  const open = sites.reduce((n, s) => n + s.blockers.filter((b) => b.state !== "check").length, 0);
  const running = audits
    .filter((a) => a.status !== "done")
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      label: a.label,
      domain: a.sites?.domain ?? "",
      done: a.runs.filter((r) => r.status !== "todo" && r.status !== "launched").length,
      total: a.runs.length,
    }));
  const last = (s: (typeof sites)[number]) => s.audits[0]?.created_at ?? "";
  const recent = [...sites]
    .sort((x, y) => last(y).localeCompare(last(x)))
    .slice(0, SITES)
    .map((s) => ({ key: s.key, label: s.label, domain: s.domain, device: s.device, score: s.latest?.s.score ?? null }));
  const now = Date.now();
  const nexts = (autos ?? []).map((a) => (a.last_checked_at ? Math.max(now, Date.parse(a.last_checked_at) + (a.interval_hours ?? 24) * HOUR) : now));
  const next = nexts.length ? Math.min(...nexts) : null;
  return {
    open,
    running,
    sites: recent,
    watch: { pages: autos?.length ?? 0, next: next ? new Date(next).toISOString() : null, soon: next != null && next - now < 24 * HOUR },
    credits: { used: credits.used, included: credits.included, renews: credits.renews },
  };
}
