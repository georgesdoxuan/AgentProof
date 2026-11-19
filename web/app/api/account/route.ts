import { currentUser, endSession } from "@/lib/auth";
import { deleteAccount, exportAccount } from "@/lib/account";
import { msg } from "@/lib/lang";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);
const fail = (text: string, status = 400) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

// GET: download my data as JSON (RGPD art. 15 and 20).
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return go(req, "/connexion?next=/compte");
  return new Response(JSON.stringify(await exportAccount(user), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="agentproof-mes-donnees.json"`,
      "Cache-Control": "no-store",
    },
  });
}

// POST action=delete: erase my account (RGPD art. 17). The user retypes their e-mail: no accidental click deletes anything.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return go(req, "/connexion?next=/compte");
  const form = await req.formData();
  if (form.get("action") !== "delete") return fail(await msg("Action inconnue.", "Unknown action."));
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase())
    return go(req, "/compte?erreur=confirmation#supprimer");
  try {
    await deleteAccount(user);
  } catch (e) {
    return fail(`${await msg("La suppression n'a pas abouti. Écris-nous à gdo@eugeniaschool.com", "Deletion did not complete. Write to us at gdo@eugeniaschool.com")} : ${(e as Error).message}`, 500);
  }
  await endSession();
  return go(req, "/?compte=supprime");
}
