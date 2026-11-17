import Link from "next/link";
import { db } from "@/lib/engine";
import { ROLE_LABEL, currentUser, hashToken } from "@/lib/auth";

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

  return (
    <div className="bg-bg-2 py-28 max-[734px]:py-16">
      <div className="mx-auto grid w-[min(500px,87.5%)] gap-6 text-center">
        {!valid ? (
          <>
            <h1 className="type-h1">Invitation invalide.</h1>
            <p className="type-intro text-ink-2">Ce lien a expiré ou a déjà servi. Demande une nouvelle invitation au propriétaire de l&apos;équipe.</p>
          </>
        ) : (
          <>
            <h1 className="type-h1">Rejoindre {(inv.teams as any)?.name}</h1>
            <p className="type-intro text-ink-2">
              Invitation pour <span className="text-ink">{inv.email}</span>, accès {ROLE_LABEL[inv.role as "admin" | "viewer"].toLowerCase()}.
            </p>
            {!user ? (
              <Link href={`/connexion?${new URLSearchParams({ next: here, email: inv.email })}`} className="btn justify-self-center">
                Me connecter avec {inv.email}
              </Link>
            ) : user.email !== inv.email ? (
              <div className="tile grid gap-3">
                <p>Tu es connecté avec {user.email}. Cette invitation est pour {inv.email}.</p>
                <form action="/api/auth" method="post">
                  <input type="hidden" name="action" value="logout" />
                  <input type="hidden" name="next" value={`/connexion?next=${encodeURIComponent(here)}`} />
                  <button className="btn">Changer de compte</button>
                </form>
              </div>
            ) : (
              <form action="/api/team" method="post">
                <input type="hidden" name="action" value="accept" />
                <input type="hidden" name="token" value={token} />
                <button className="btn">Rejoindre l&apos;équipe</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
