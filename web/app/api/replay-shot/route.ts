import { canSeePayment } from "@/lib/auth";
import { db, fetchShot, shotOk } from "@/lib/engine";

// Screenshots of a payment replay: the link is signed by the server, and the viewer must still belong to the team.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const run = Number(q.get("run"));
  const src = q.get("src") ?? "";
  if (!Number.isInteger(run) || !shotOk(run, src, q.get("sig") ?? "")) return new Response("Not found", { status: 404 });
  const { data } = await db.from("runs").select("audits(team_id)").eq("id", run).maybeSingle();
  if (!data || !(await canSeePayment((data as any).audits?.team_id ?? null))) return new Response("Not found", { status: 404 });
  try {
    const img = await fetchShot(src);
    return new Response(img.body, { headers: { "Content-Type": img.headers.get("content-type") ?? "image/png", "Cache-Control": "private, max-age=3600" } });
  } catch {
    // H deletes payment screenshots 4 hours after the test.
    return new Response("Gone", { status: 410 });
  }
}
