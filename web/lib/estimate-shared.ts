// Client-safe half of lib/estimate.ts: turns a measured pace into the "6–9 min" shown next to the clock.
export type PaceRange = { lo: number; hi: number };

// missions: every mission this launch adds (both devices, competitor and model comparison included).
// queued: missions already waiting or running for everyone, played before these ones.
export function estimateMinutes(missions: number, pace: PaceRange, queued = 0, slots = 3): [number, number] {
  if (missions <= 0) return [0, 0];
  const ahead = Math.floor(queued / slots); // full waves of other audits before ours start
  const waves = Math.ceil((missions + (queued % slots)) / slots) + ahead;
  const lo = Math.max(1, Math.floor(waves * pace.lo));
  return [lo, Math.max(lo + 1, Math.ceil(waves * pace.hi))];
}

export const minutesLabel = ([lo, hi]: [number, number]) => `${lo}–${hi} min`;
