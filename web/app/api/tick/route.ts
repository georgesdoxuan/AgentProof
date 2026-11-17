import { tick } from "@/lib/engine";

export const maxDuration = 60;

// Called every minute by n8n. Protected by a shared secret.
export async function GET(req: Request) {
  if (req.headers.get("x-tick-secret") !== process.env.TICK_SECRET) return new Response("forbidden", { status: 403 });
  return Response.json(await tick());
}
