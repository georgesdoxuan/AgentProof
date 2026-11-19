import { optOut, validOptout } from "@/lib/optout";

// POST from /desinscription (the page behind the e-mail link): a button, so a mail scanner opening the link unsubscribes no one.
export async function POST(req: Request) {
  const form = await req.formData();
  const e = String(form.get("e") ?? "").trim().toLowerCase();
  const s = String(form.get("s") ?? "");
  const back = new URLSearchParams({ e, s });
  if (!validOptout(e, s)) back.set("etat", "lien");
  else back.set("etat", (await optOut(e)) ? "ok" : "erreur");
  return Response.redirect(new URL(`/desinscription?${back}`, req.url), 303);
}
