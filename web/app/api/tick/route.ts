import { creditAlerts } from "@/lib/credits";
import { tick } from "@/lib/engine";

export const maxDuration = 60;

// Called every minute by n8n. Protected by a shared secret.
export async function GET(req: Request) {
  if (req.headers.get("x-tick-secret") !== process.env.TICK_SECRET) return new Response("forbidden", { status: 403 });
  const out = await tick();
  // Credit alerts (80 %, 100 % of the month) never hold the engine back: a failure here is logged, not thrown.
  const log: string[] = [];
  await creditAlerts(log).catch((e) => log.push(`credits: ${(e as Error).message}`));
  return Response.json(log.length ? { ...out, credits: log } : out);
}
