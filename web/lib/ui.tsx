import { BLOCKERS } from "./engine";

export function scoreColor(score: number | null) {
  if (score == null) return "text-stone-400";
  return score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
}

export function ScoreBar({ score }: { score: number | null }) {
  const color = score == null ? "bg-stone-300" : score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full rounded-full bg-stone-200">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${score ?? 0}%` }} />
    </div>
  );
}

export const blockerLabel = (b: string | null) => (b ? BLOCKERS[b] ?? b : "—");

type Run = { status: string; success: boolean | null; blocker_type: string | null };

export function summarize(runs: Run[]) {
  const done = runs.filter((r) => r.status === "done");
  const ok = done.filter((r) => r.success).length;
  const counts: Record<string, number> = {};
  for (const r of done) if (!r.success && r.blocker_type) counts[r.blocker_type] = (counts[r.blocker_type] ?? 0) + 1;
  const blockers = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return { total: runs.length, done: done.length, ok, score: done.length ? Math.round((100 * ok) / done.length) : null, blockers };
}
