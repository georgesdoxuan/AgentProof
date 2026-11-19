import Link from "next/link";
import { db } from "@/lib/engine";
import { currentUser, hashToken } from "@/lib/auth";
import { dict, tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Invitation · AgentProof" };

export default async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [{ data: inv }, user] = await Promise.all([
    db
      .from("invitations")
      .select("email, role, expires_at, accepted_at, teams(name)")
      .eq("token_hash", hashToken(token))
      .maybeSingle(),
    currentUser(),
  ]);
  const valid = inv && !inv.accepted_at && new Date(inv.expires_at) > new Date();
  const here = `/invitation/${token}`;
  const lang = await getLang();
  const t = tr(lang);
  const ROLE_LABEL = dict(lang).roles;

  return (
    <div className="bg-bg-2 py-28 max-[734px]:py-16">
      <div className="mx-auto grid w-[min(500px,87.5%)] gap-6 text-center">
        {!valid ? (
          <>
            <h1 className="type-h1">{t("Invitation invalide.", "Invalid invitation.")}</h1>
            <p className="type-intro text-ink-2">
              {t("Ce lien a expiré ou a déjà servi. Demande une nouvelle invitation au propriétaire ou à un admin de l’équipe.", "This link has expired or was already used. Ask the team owner or an admin for a new invitation.")}
            </p>
          </>
        ) : (
          <>
            <h1 className="type-h1">
              {t("Rejoindre", "Join")} {(inv.teams as any)?.name}
            </h1>
            <p className="type-intro text-ink-2">
              {t("Invitation pour", "Invitation for")} <span className="text-ink">{inv.email}</span>, {t("accès", "access:")} {ROLE_LABEL[inv.role as "admin" | "editor" | "viewer"].toLowerCase()}.
            </p>
            {!user ? (
              <Link href={`/connexion?${new URLSearchParams({ next: here, email: inv.email })}`} className="btn justify-self-center">
                {t("Me connecter avec", "Sign in with")} {inv.email}
              </Link>
            ) : user.email !== inv.email ? (
              <div className="tile grid gap-3">
                <p>{t(`Tu es connecté avec ${user.email}. Cette invitation est pour ${inv.email}.`, `You are signed in as ${user.email}. This invitation is for ${inv.email}.`)}</p>
                <form action="/api/auth" method="post">
                  <input type="hidden" name="action" value="logout" />
                  <input type="hidden" name="next" value={`/connexion?next=${encodeURIComponent(here)}`} />
                  <button className="btn">{t("Changer de compte", "Switch account")}</button>
                </form>
              </div>
            ) : (
              <form action="/api/team" method="post">
                <input type="hidden" name="action" value="accept" />
                <input type="hidden" name="token" value={token} />
                <button className="btn">{t("Rejoindre l’équipe", "Join the team")}</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
