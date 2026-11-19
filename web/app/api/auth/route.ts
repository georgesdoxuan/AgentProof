import { db } from "@/lib/engine";
import { baseUrl, createTeam, endSession, hashToken, newToken, normalizeEmail, safeNext, sendMail, startSession } from "@/lib/auth";
import { msg } from "@/lib/lang";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);
const back = (req: Request, params: Record<string, string>) => go(req, `/connexion?${new URLSearchParams(params)}`);

// POST action=login (send link) | verify (use link) | logout.
// The link opens a confirm page that posts here: mail scanners that pre-open links cannot burn the token.
export async function POST(req: Request) {
  const form = await req.formData();
  const action = form.get("action");
  const next = safeNext(form.get("next"));

  if (action === "logout") {
    await endSession();
    return go(req, form.get("next") ? next : "/");
  }

  if (action === "login") {
    const email = normalizeEmail(form.get("email"));
    if (!email) return back(req, { erreur: "email", next });
    if (form.get("accept") !== "1") return back(req, { erreur: "accord", next, email });
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await db.from("login_tokens").select("token_hash", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
    if ((count ?? 0) >= 3) return back(req, { erreur: "trop", next, email });
    const token = newToken();
    await db.from("login_tokens").insert({ token_hash: hashToken(token), email, next });
    // Proof of consent, on the account when it exists (a new account gets it at verify). Ignored until the 20261119 migration is applied.
    await db.from("users").update({ terms_accepted_at: new Date().toISOString() }).eq("email", email).then(() => null, () => null);
    const link = `${baseUrl(req)}/connexion?token=${token}`;
    const sent = await sendMail(
      email,
      await msg("Ton lien de connexion AgentProof", "Your AgentProof sign-in link"),
      await msg(
        `Clique pour te connecter à AgentProof (valable 15 minutes) :\n${link}\n\nSi tu n'as rien demandé, ignore cet e-mail.`,
        `Click to sign in to AgentProof (valid for 15 minutes):\n${link}\n\nIf you did not ask for this, ignore this e-mail.`,
      ),
      link,
    );
    // Local dev without a mail sender: log in straight away.
    if (!sent && process.env.NODE_ENV !== "production") return go(req, `/connexion?token=${token}`);
    if (!sent) return back(req, { erreur: "envoi", next, email });
    return back(req, { envoye: email, next });
  }

  if (action === "verify") {
    const { data: tok } = await db
      .from("login_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", hashToken(String(form.get("token") ?? "")))
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("email, next")
      .maybeSingle();
    if (!tok) {
      // Expired or already used: keep the address and where it was going (the home form's site, device…), so a new
      // link picks up the same launch instead of starting over. Read only: the token stays unusable.
      const { data: old } = await db.from("login_tokens").select("email, next").eq("token_hash", hashToken(String(form.get("token") ?? ""))).maybeSingle();
      return back(req, { erreur: "lien", ...(old ? { email: old.email, next: safeNext(old.next) } : {}) });
    }
    await db.from("users").upsert({ email: tok.email }, { onConflict: "email", ignoreDuplicates: true });
    // The sign-in form requires the consent box: record it on new accounts too. Ignored until the 20261119 migration is applied.
    await db.from("users").update({ terms_accepted_at: new Date().toISOString() }).eq("email", tok.email).is("terms_accepted_at", null).then(() => null, () => null);
    const { data: user } = await db.from("users").select("id").eq("email", tok.email).single();
    await startSession(user!.id);
    // First login with no team and no pending invitation: give them their own space right away.
    const [{ count: teams }, { count: invites }] = await Promise.all([
      db.from("memberships").select("team_id", { count: "exact", head: true }).eq("user_id", user!.id),
      db.from("invitations").select("id", { count: "exact", head: true }).eq("email", tok.email).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
    ]);
    if (!teams && !invites) await createTeam(`Espace de ${tok.email.split("@")[0]}`, user!.id);
    return go(req, safeNext(tok.next));
  }

  return new Response(await msg("Action inconnue.", "Unknown action."), { status: 400 });
}
