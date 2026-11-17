import { createAudit, db } from "@/lib/engine";

const FORM_MISSIONS = 5; // public form runs 5 missions to save tokens
const MAX_PENDING = 40; // refuse new audits when the queue is this long

export async function POST(req: Request) {
  const form = await req.formData();
  const url = String(form.get("url") ?? "");
  const competitor = String(form.get("competitor") ?? "").trim();
  const device = form.get("device") === "mobile" ? "mobile" : "desktop";

  const { count } = await db.from("runs").select("id", { count: "exact", head: true }).in("status", ["todo", "launched"]);
  if ((count ?? 0) > MAX_PENDING) return new Response("File d'attente pleine, réessaie dans un moment.", { status: 503 });

  try {
    const compareTo = competitor ? await createAudit(competitor, { device, missions: FORM_MISSIONS }) : undefined;
    const id = await createAudit(url, { device, missions: FORM_MISSIONS, compareTo });
    return Response.redirect(new URL(`/audit/${id}`, req.url), 303);
  } catch (e) {
    return new Response(`Erreur : ${(e as Error).message}`, { status: 400 });
  }
}
