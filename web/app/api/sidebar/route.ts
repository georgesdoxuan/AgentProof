import { teamContext } from "@/lib/auth";
import { loadSidebar } from "@/lib/sidebar";

// The sidebar's live data (counters, recent sites, running audits, credits) for the current team.
export async function GET() {
  const ctx = await teamContext();
  if (!ctx?.team) return new Response(null, { status: 401 });
  return Response.json(await loadSidebar(ctx.team.id), { headers: { "Cache-Control": "private, no-store" } });
}
