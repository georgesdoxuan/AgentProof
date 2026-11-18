import { staffUser } from "@/lib/auth";
import { createPaymentTest } from "@/lib/engine";
import { msg } from "@/lib/lang";

// AgentProof staff only: launches one real payment attempt with the zero-balance test card.
export async function POST(req: Request) {
  if (!(await staffUser()).isStaff) return new Response(await msg("Réservé à l'équipe AgentProof.", "Reserved for the AgentProof team."), { status: 403 });
  const form = await req.formData();
  try {
    await createPaymentTest(String(form.get("url") ?? ""));
    return Response.redirect(new URL("/test-paiement", req.url), 303);
  } catch (e) {
    return new Response(`${await msg("Erreur", "Error")} : ${(e as Error).message}`, { status: 400 });
  }
}
