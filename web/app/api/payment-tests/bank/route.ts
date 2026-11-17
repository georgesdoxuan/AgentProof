import { staffUser } from "@/lib/auth";
import { db } from "@/lib/engine";

// AgentProof staff only: records whether the declined attempt shows up in the bank app (final proof).
export async function POST(req: Request) {
  if (!(await staffUser()).isStaff) return new Response("Réservé à l'équipe AgentProof.", { status: 403 });
  const form = await req.formData();
  await db.from("runs").update({ bank_seen: form.get("seen") === "yes" }).eq("id", Number(form.get("run")));
  return Response.redirect(new URL("/test-paiement", req.url), 303);
}
