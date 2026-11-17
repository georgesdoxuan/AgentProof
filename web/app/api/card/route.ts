import { canLaunch, normalizeEmail, teamContext } from "@/lib/auth";
import { luhn, seal } from "@/lib/cards";
import { db } from "@/lib/engine";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);
const fail = (msg: string, status = 400) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

// Team payment card: owner or admin only. The number, expiry and CVC are encrypted before they reach the database.
export async function POST(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return go(req, "/connexion?next=/espace/paiement");
  if (!ctx.team || !canLaunch(ctx.team.role)) return fail("Seuls le propriétaire et les admins de l'équipe gèrent la carte.", 403);
  const form = await req.formData();
  const str = (k: string) => String(form.get(k) ?? "").trim();

  if (str("action") === "delete") {
    await db.from("team_cards").delete().eq("team_id", ctx.team.id);
    return go(req, "/espace/paiement");
  }

  const number = str("number").replace(/[\s-]/g, "");
  const exp = str("expiry").match(/^(\d{2})\s*\/\s*(\d{2})$/);
  const cvc = str("cvc");
  const holder = str("holder").slice(0, 80);
  const email = normalizeEmail(form.get("email"));
  const address = str("address").slice(0, 200);
  if (!/^\d{13,19}$/.test(number) || !luhn(number)) return fail("Numéro de carte invalide.");
  if (!exp || +exp[1] < 1 || +exp[1] > 12 || new Date(2000 + +exp[2], +exp[1]) < new Date()) return fail("Date d'expiration invalide (MM/AA).");
  if (!/^\d{3,4}$/.test(cvc)) return fail("Cryptogramme invalide.");
  if (!holder) return fail("Indique le nom du titulaire.");
  if (!email) return fail("Adresse e-mail invalide.");
  if (!address) return fail("Indique l'adresse de livraison.");
  if (form.get("consent") !== "1") return fail("Coche la case d'autorisation pour enregistrer la carte.");

  let secret: string;
  try {
    secret = seal({ number, expiry: `${exp[1]}/${exp[2]}`, cvc });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
  const { error } = await db.from("team_cards").upsert({
    team_id: ctx.team.id,
    source: "stored",
    label: str("label").slice(0, 40) || "Carte de l'équipe",
    last4: number.slice(-4),
    holder,
    email,
    address,
    secret,
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return fail(`Erreur : ${error.message}`, 500);
  return go(req, "/espace/paiement");
}
