import { createPaymentTest } from "@/lib/engine";

// Team only: launches one real payment attempt with the zero-balance test card.
export async function POST(req: Request) {
  const form = await req.formData();
  if (form.get("key") !== process.env.TICK_SECRET) return new Response("Clé incorrecte.", { status: 403 });
  try {
    await createPaymentTest(String(form.get("url") ?? ""));
    return Response.redirect(new URL("/test-paiement", req.url), 303);
  } catch (e) {
    return new Response(`Erreur : ${(e as Error).message}`, { status: 400 });
  }
}
