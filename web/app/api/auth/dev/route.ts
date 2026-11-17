import { db } from "@/lib/engine";
import { createTeam, normalizeEmail, safeNext, startSession } from "@/lib/auth";

// Local development only: sign in as any e-mail in one request, no mail round-trip.
// Lets Claude (or a teammate) open /espace in the browser pane: /api/auth/dev?email=claude@agentproof.test&next=/espace
// `next dev` sets NODE_ENV=development; Vercel builds use production, where this route answers 404.
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const email = normalizeEmail(url.searchParams.get("email") ?? "claude@agentproof.test");
  if (!email) return new Response("E-mail invalide.", { status: 400 });

  await db.from("users").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  const { data: user } = await db.from("users").select("id").eq("email", email).single();
  await startSession(user!.id);
  const { count } = await db.from("memberships").select("team_id", { count: "exact", head: true }).eq("user_id", user!.id);
  if (!count) await createTeam(`Espace de ${email.split("@")[0]}`, user!.id);
  return Response.redirect(new URL(safeNext(url.searchParams.get("next")), req.url), 303);
}
