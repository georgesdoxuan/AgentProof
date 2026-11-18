import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { ROLE_LABEL, type Role, teamContext } from "@/lib/auth";
import { Avatar, Field, Group, Row, Segmented } from "@/lib/ui";
import { AutoSubmitSelect, ConfirmButton, CopyField } from "../espace/controls";
import { SpaceShell } from "../espace/shell";

export const metadata = { title: "Équipe · AgentProof" };

const ROLES: [string, string][] = [
  ["viewer", "Lecteur"],
  ["admin", "Admin"],
];

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
  const { user, teams, team } = ctx;
  const isOwner = team.role === "owner";
  const sp = await searchParams;

  const [{ data: members }, { data: invites }, { data: brand }] = await Promise.all([
    db.from("memberships").select("role, created_at, users(id, email)").eq("team_id", team.id).order("created_at"),
    isOwner
      ? db.from("invitations").select("id, email, role, expires_at").eq("team_id", team.id).is("accepted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    db.from("teams").select("brand_name, brand_logo").eq("id", team.id).single(),
  ]);
  const h = await headers();
  const base = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Équipe"
      intro="Admin : lance des audits et lit les rapports. Lecteur : lit les rapports. Seul le propriétaire gère les membres."
    >
      {sp.invite && (
        <Group
          title={sp.envoye === "1" ? `Invitation envoyée à ${sp.email}` : `Invitation créée pour ${sp.email}`}
          footer={sp.envoye === "1" ? "Lien valable 7 jours, réservé à cette adresse." : "L'e-mail n'est pas parti. Partage ce lien toi-même : valable 7 jours, réservé à cette adresse."}
        >
          <div role="status" className="p-4">
            <CopyField value={`${base}/invitation/${sp.invite}`} label="Lien d'invitation" />
          </div>
        </Group>
      )}

      <Group title={`Membres · ${members?.length ?? 0}`}>
        {(members ?? []).map((m: any) => {
          const me = m.users.id === user.id;
          return (
            <Row key={m.users.id}>
              <Avatar email={m.users.email} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {m.users.email}
                  {me && <span className="text-ink-2"> · toi</span>}
                </span>
                <span className="type-small text-ink-2">Depuis le {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
              </span>
              {isOwner && m.role !== "owner" ? (
                <span className="flex items-center gap-3">
                  <form action="/api/team" method="post">
                    <Hidden action="role" user={m.users.id} />
                    <AutoSubmitSelect name="role" defaultValue={m.role} label={`Accès de ${m.users.email}`} options={ROLES} />
                  </form>
                  <form action="/api/team" method="post">
                    <Hidden action="remove" user={m.users.id} />
                    <ConfirmButton message={`Retirer ${m.users.email} de l'équipe ${team.name} ?`} className="type-small inline-flex min-h-11 items-center px-1 text-fail hover:underline">
                      Retirer
                    </ConfirmButton>
                  </form>
                </span>
              ) : (
                <span className="type-small text-ink-2">{ROLE_LABEL[m.role as Role]}</span>
              )}
            </Row>
          );
        })}
      </Group>

      {isOwner && (
        <>
          <Group title="Inviter un membre" footer="La personne reçoit un lien par e-mail et se connecte avec cette adresse.">
            <form action="/api/team" method="post" className="grid gap-4 p-5 sm:p-6">
              <Hidden action="invite" />
              <Field label="E-mail du membre" name="email" type="email" required />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Segmented name="role" label="Accès" value="viewer" options={ROLES} />
                <button className="btn">Envoyer l&apos;invitation</button>
              </div>
            </form>
          </Group>

          {!!invites?.length && (
            <Group title="Invitations en attente">
              {invites.map((i: any) => {
                const expired = new Date(i.expires_at) < new Date();
                return (
                  <Row key={i.id}>
                    <Avatar email={i.email} className="h-9 w-9 opacity-50" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{i.email}</span>
                      <span className={`type-small ${expired ? "text-fail" : "text-ink-2"}`}>
                        {ROLE_LABEL[i.role as Role]} · {expired ? "expirée" : `expire le ${new Date(i.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
                      </span>
                    </span>
                    <form action="/api/team" method="post">
                      <Hidden action="revoke" invitation={i.id} />
                      <ConfirmButton message={`Annuler l'invitation de ${i.email} ?`} className="type-small inline-flex min-h-11 items-center px-1 text-fail hover:underline">
                        Annuler
                      </ConfirmButton>
                    </form>
                  </Row>
                );
              })}
            </Group>
          )}

          <Group title="Nom de l'équipe">
            <form action="/api/team" method="post" className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
              <Hidden action="rename" />
              <div className="min-w-[220px] flex-1">
                <Field label="Nom" name="name" type="text" required defaultValue={team.name} />
              </div>
              <button className="btn btn-secondary">Renommer</button>
            </form>
          </Group>

          <Group
            title="Marque blanche"
            footer="Pour les agences : ton nom et ton logo remplacent AgentProof sur les rapports de l'équipe (page web et PDF). Laisse le nom vide pour revenir à AgentProof."
          >
            <form action="/api/team" method="post" className="grid gap-4 p-5 sm:p-6">
              <Hidden action="brand" />
              <Field label="Nom affiché sur les rapports" name="brand_name" type="text" defaultValue={brand?.brand_name ?? ""} />
              <Field label="Logo (adresse https d'une image)" name="brand_logo" type="url" defaultValue={brand?.brand_logo ?? ""} />
              <div>
                <button className="btn btn-secondary">Enregistrer</button>
              </div>
            </form>
          </Group>
        </>
      )}

      {!isOwner && (
        <Group footer="Tu perds l'accès aux rapports de l'équipe. Le propriétaire peut t'inviter à nouveau.">
          <form action="/api/team" method="post">
            <Hidden action="leave" />
            <ConfirmButton message={`Quitter l'équipe ${team.name} ?`} className="flex min-h-[60px] w-full items-center px-5 text-left text-fail hover:bg-bg-2/60">
              Quitter l&apos;équipe
            </ConfirmButton>
          </form>
        </Group>
      )}
    </SpaceShell>
  );
}
