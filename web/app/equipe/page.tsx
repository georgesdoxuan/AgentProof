import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { ROLE_LABEL, type Role, teamContext } from "@/lib/auth";
import { Field } from "@/lib/ui";

export const metadata = { title: "Équipe · AgentProof" };

const select = "h-9 rounded-[8px] border border-line bg-tile px-2 type-small";

function Hidden({ action, ...rest }: { action: string } & Record<string, string>) {
  return (
    <>
      <input type="hidden" name="action" value={action} />
      {Object.entries(rest).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

export default async function Equipe({ searchParams }: { searchParams: Promise<{ invite?: string; email?: string; envoye?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/equipe");
  if (!ctx.team) redirect("/espace");
  const { user, team } = ctx;
  const isOwner = team.role === "owner";
  const sp = await searchParams;

  const [{ data: members }, { data: invites }] = await Promise.all([
    db.from("memberships").select("role, created_at, users(id, email)").eq("team_id", team.id).order("created_at"),
    isOwner
      ? db.from("invitations").select("id, email, role, expires_at").eq("team_id", team.id).is("accepted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const h = await headers();
  const base = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <div className="mx-auto grid w-[min(760px,87.5%)] gap-6">
        <header>
          <Link href="/espace" className="more type-small">Retour à l&apos;espace</Link>
          <h1 className="type-h1 mt-3">{team.name}</h1>
          <p className="type-intro mt-3 text-ink-2">
            Admin : lance des audits et consulte les rapports. Lecteur : consulte les rapports. Seul le propriétaire gère les membres.
          </p>
        </header>

        {sp.invite && (
          <div role="status" className="tile grid gap-2">
            <p className="type-headline">
              {sp.envoye === "1" ? `Invitation envoyée à ${sp.email}.` : `Invitation créée pour ${sp.email}, mais l'e-mail n'est pas parti.`}
            </p>
            <p className="type-small text-ink-2">Lien à partager si besoin (valable 7 jours, réservé à cette adresse) :</p>
            <input readOnly value={`${base}/invitation/${sp.invite}`} className="h-10 w-full rounded-[8px] border border-line bg-bg-2 px-3 type-small" aria-label="Lien d'invitation" />
          </div>
        )}

        <section className="tile">
          <h2 className="type-h3">Membres</h2>
          <ul className="mt-4 divide-y divide-hairline">
            {(members ?? []).map((m: any) => (
              <li key={m.users.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate">
                  {m.users.email}
                  {m.users.id === user.id && <span className="text-ink-2"> (toi)</span>}
                </span>
                {isOwner && m.role !== "owner" ? (
                  <span className="flex items-center gap-2">
                    <form action="/api/team" method="post" className="flex items-center gap-2">
                      <Hidden action="role" user={m.users.id} />
                      <select name="role" defaultValue={m.role} className={select} aria-label={`Rôle de ${m.users.email}`}>
                        <option value="admin">Admin</option>
                        <option value="viewer">Lecteur</option>
                      </select>
                      <button className="type-small text-link">Enregistrer</button>
                    </form>
                    <form action="/api/team" method="post">
                      <Hidden action="remove" user={m.users.id} />
                      <button className="type-small text-fail">Retirer</button>
                    </form>
                  </span>
                ) : (
                  <span className="type-small text-ink-2">{ROLE_LABEL[m.role as Role]}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {isOwner && (
          <>
            <form action="/api/team" method="post" className="tile grid gap-4">
              <h2 className="type-h3">Inviter un membre</h2>
              <Hidden action="invite" />
              <Field label="E-mail du membre" name="email" type="email" required />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-ink-2">
                  Accès
                  <select name="role" defaultValue="viewer" className={select}>
                    <option value="viewer">Lecteur</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button className="btn">Envoyer l&apos;invitation</button>
              </div>
            </form>

            {!!invites?.length && (
              <section className="tile">
                <h2 className="type-h3">Invitations en attente</h2>
                <ul className="mt-4 divide-y divide-hairline">
                  {invites.map((i: any) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span className="min-w-0 truncate">
                        {i.email} <span className="text-ink-2">· {ROLE_LABEL[i.role as Role]}{new Date(i.expires_at) < new Date() ? " · expirée" : ""}</span>
                      </span>
                      <form action="/api/team" method="post">
                        <Hidden action="revoke" invitation={i.id} />
                        <button className="type-small text-fail">Annuler</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <form action="/api/team" method="post" className="tile grid gap-4">
              <h2 className="type-h3">Renommer l&apos;équipe</h2>
              <Hidden action="rename" />
              <Field label="Nom de l'équipe" name="name" type="text" required defaultValue={team.name} />
              <button className="btn justify-self-start">Renommer</button>
            </form>
          </>
        )}

        <form action="/api/team" method="post" className="tile grid gap-4">
          <h2 className="type-h3">Créer une autre équipe</h2>
          <Hidden action="create" />
          <Field label="Nom de la nouvelle équipe" name="name" type="text" required />
          <button className="btn justify-self-start">Créer</button>
        </form>

        {!isOwner && (
          <form action="/api/team" method="post" className="text-center">
            <Hidden action="leave" />
            <button className="type-small text-fail">Quitter l&apos;équipe</button>
          </form>
        )}
      </div>
    </div>
  );
}
