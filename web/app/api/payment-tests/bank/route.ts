import { db } from "@/lib/engine";

// Team only: records whether the declined attempt shows up in the bank app (final proof).
export async function POST(req: Request) {
  const form = await req.formData();
  if (form.get("key") !== process.env.TICK_SECRET) return new Response("Clé incorrecte.", { status: 403 });
  await db.from("runs").update({ bank_seen: form.get("seen") === "yes" }).eq("id", Number(form.get("run")));
  return Response.redirect(new URL("/test-paiement", req.url), 303);
}
