import "server-only";
import { db } from "./engine";

// How long an audit takes, measured on the latest real audits instead of a fixed "10–20 min".
// H runs SLOTS missions at once, so an audit plays in waves: 5 missions = 2 waves, 5 desktop + 5 mobile = 4.
// Pace = minutes per wave of an audit that started at once (no queue ahead of it): agent, judge and the
// one-minute engine tick included. Low and high ends are the 20th and 80th percentiles over the last two weeks.
export const SLOTS = 3;
const DAYS = 14;
const MIN_SAMPLES = 5;
const NO_QUEUE_MIN = 1.5; // first mission launched within this delay: the audit did not wait behind others
const FALLBACK = { lo: 2.8, hi: 4.2 }; // measured on 19/11/2026 (desktop, 11 audits), used until enough data

export type Pace = { desktop: { lo: number; hi: number }; mobile: { lo: number; hi: number }; queued: number };

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i));
};
const round1 = (x: number) => Math.round(x * 10) / 10;

// Per server instance, ten minutes: the launch form and the home page read it on every visit.
let cache: { at: number; pace: Omit<Pace, "queued"> } | null = null;

export async function loadPace(): Promise<Pace> {
  if (!cache || Date.now() - cache.at > 10 * 60_000) {
    const since = new Date(Date.now() - DAYS * 86400_000).toISOString();
    const { data } = await db
      .from("audits")
      .select("device, created_at, finished_at, runs(launched_at, duration_s)")
      .eq("kind", "checkout")
      .eq("status", "done")
      .is("proof_of", null)
      .not("finished_at", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(400);
    const waves: Record<string, number[]> = { desktop: [], mobile: [] };
    const runs: Record<string, number[]> = { desktop: [], mobile: [] };
    for (const a of (data ?? []) as { device: string; created_at: string; finished_at: string; runs: { launched_at: string | null; duration_s: number | null }[] }[]) {
      const dev = a.device === "mobile" ? "mobile" : "desktop";
      const launched = a.runs.map((r) => r.launched_at && Date.parse(r.launched_at)).filter((x): x is number => !!x);
      for (const r of a.runs) if (r.duration_s && r.duration_s > 0) runs[dev].push(r.duration_s);
      if (!launched.length) continue;
      const start = Date.parse(a.created_at);
      if ((Math.min(...launched) - start) / 60_000 > NO_QUEUE_MIN) continue;
      waves[dev].push((Date.parse(a.finished_at) - start) / 60_000 / Math.ceil(a.runs.length / SLOTS));
    }
    const desktop = waves.desktop.length >= MIN_SAMPLES ? { lo: pct(waves.desktop, 0.2), hi: pct(waves.desktop, 0.8) } : FALLBACK;
    // Few mobile audits on their own: desktop pace times how much longer a mobile mission takes.
    const ratio = runs.mobile.length >= 10 && runs.desktop.length >= 10 ? pct(runs.mobile, 0.5) / pct(runs.desktop, 0.5) : 1.1;
    const mobile = waves.mobile.length >= MIN_SAMPLES ? { lo: pct(waves.mobile, 0.2), hi: pct(waves.mobile, 0.8) } : { lo: desktop.lo * ratio, hi: desktop.hi * ratio };
    cache = { at: Date.now(), pace: { desktop: { lo: round1(desktop.lo), hi: round1(desktop.hi) }, mobile: { lo: round1(mobile.lo), hi: round1(mobile.hi) } } };
  }
  const { count } = await db.from("runs").select("id", { count: "exact", head: true }).in("status", ["todo", "launched"]);
  return { ...cache.pace, queued: count ?? 0 };
}


export { estimateMinutes, minutesLabel } from "./estimate-shared";
