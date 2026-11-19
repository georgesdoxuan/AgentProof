// Client-safe half of lib/credits.ts: what an audit costs, so the launch form shows exactly what will be counted.
// The precise agent (COMPARE_MODEL, holo4-27b) costs 1.5 credits per mission, the fast one 1 (our H cost is ~+40 %).
// Credits stay whole numbers: an audit's total is rounded up (5 precise missions = 7.5, so 8 credits).
export const PRECISE_FACTOR = 1.5;

export const auditCredits = (missions: number, precise: boolean) => (precise ? Math.ceil(missions * PRECISE_FACTOR) : missions);
