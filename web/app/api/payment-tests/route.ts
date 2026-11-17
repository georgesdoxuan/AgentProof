import { staffUser } from "@/lib/auth";
import { createPaymentTest } from "@/lib/engine";

// AgentProof staff only: launches one real payment attempt with the zero-balance test card.
export async function POST(req: Request) {
  if (!(await staffUser()).isStaff) return new Response("Réservé à l'équipe AgentProof.", { status: 403 });
  const form = await req.formData();
  try {
    await createPaymentTest(String(form.get("url") ?? ""));
    return Response.redirect(new URL("/test-paiement", req.url), 303);
  } catch (e) {
    return new Response(`Erreur : ${(e as Error).message}`, { status: 400 });
  }
}
