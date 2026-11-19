import "server-only";
import { cookies } from "next/headers";
import { db } from "./engine";
import { loadSpace } from "./space";
import { creditsLeft } from "./credits";
import { SEEN_COOKIE, parseSeen } from "./seen";

// What the space's sidebar shows besides its links: counters, recent sites, live audits, the watch, the month's credits.
// Read by the layout (first paint) and by /api/sidebar (after each navigation, and every few seconds while an audit runs).
// Plain data only: it crosses to the client.
export type SideData = {
  open: number; // blockers still open across the sites (same count as the home page's chip)
  running: { id: string; label: string; domain: string; done: number; total: number }[];
  finished: { id: string; label: string; score: number | null }[]; // closed in the last half hour and not opened yet: the card turns green before it goes
  more: string[]; // finished and unopened beyond the cards shown: one « +N » line instead of a stack

  sites: { key: string; label: string; domain: string; device: string; score: number | null }[]; // most recent activity first
  watch: { pages: number; next: string | null; soon: boolean }; // enabled automations, next page check (soon: within a day)
  credits: { used: number; included: number; renews: string };
};

const HOUR = 3600_000;
const SITES = 3;
const CARDS = 3; // audit cards at the bottom of the bar, running first
const GREEN = 2; // at most two « Terminé » cards, then a « +N » line
const FRESH = 30 * 60_000; // how long a finished audit keeps its green card

export async function loadSidebar(teamId: string): Promise<SideData> {
  const [{ audits, sites }, credits, { data: autos }, jar] = await Promise.all([
    loadSpace(teamId),
    creditsLeft(teamId),
    db.from("automations").select("last_checked_at, interval_hours").eq("team_id", teamId).eq("enabled", true),
    cookies(),
  ]);
  const seen = parseSeen(jar.get(SEEN_COOKIE)?.value);
  const open = sites.reduce((n, s) => n + s.blockers.filter((b) => b.state !== "check").length, 0);
  const running = audits
    .filter((a) => a.status !== "done")
    .slice(0, CARDS)
    .map((a) => ({
      id: a.id,
      label: a.label,
      domain: a.sites?.domain ?? "",
      done: a.runs.filter((r) => r.status !== "todo" && r.status !== "launched").length,
      total: a.runs.length,
    }));
  const fresh = audits.filter((a) => a.status === "done" && a.runs.length && a.finished_at && Date.now() - Date.parse(a.finished_at) < FRESH && !seen.has(a.id));
  const finished = fresh.slice(0, Math.max(0, Math.min(GREEN, CARDS - running.length))).map((a) => ({ id: a.id, label: a.label, score: a.s.score }));
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
    finished,
    more: fresh.slice(finished.length).map((a) => a.id),
    sites: recent,
    watch: { pages: autos?.length ?? 0, next: next ? new Date(next).toISOString() : null, soon: next != null && next - now < 24 * HOUR },
    credits: { used: credits.used, included: credits.included, renews: credits.renews },
  };
}
