import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { type Role, teamContext } from "@/lib/auth";
import { dict, locale, tr } from "@/lib/i18n";
import { getLang, getT } from "@/lib/lang";
import { Avatar, Field, Group, Row, Segmented } from "@/lib/ui";
import { AutoSubmitSelect, ConfirmButton, CopyField } from "../espace/controls";
import { SpaceShell } from "../espace/shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Équipe", "Team")} · AgentProof` };
}


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
  const lang = await getLang();
  const t = tr(lang);
  const ROLE_LABEL = dict(lang).roles;
  const ROLES: [string, string][] = [
    ["viewer", ROLE_LABEL.viewer],
    ["admin", ROLE_LABEL.admin],
  ];
  const day = (d: string) => new Date(d).toLocaleDateString(locale(lang), { day: "numeric", month: "long" });

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
    <SpaceShell narrow
      title={t("Équipe", "Team")}
      hint={t(
        "Admin : lance des audits et lit les rapports. Lecteur : lit les rapports. Seul le propriétaire gère les membres.",
        "Admin: runs audits and reads reports. Viewer: reads reports. Only the owner manages members.",
      )}
    >
      {sp.invite && (
        <Group
          title={sp.envoye === "1" ? t(`Invitation envoyée à ${sp.email}`, `Invitation sent to ${sp.email}`) : t(`E-mail non envoyé : partage ce lien à ${sp.email}`, `E-mail not sent: share this link with ${sp.email}`)}
          footer={
            sp.envoye === "1"
              ? t("Lien valable 7 jours, réservé à cette adresse.", "Link valid for 7 days, for this address only.")
              : t("L'e-mail n'est pas parti. Partage ce lien toi-même : valable 7 jours, réservé à cette adresse.", "The e-mail was not sent. Share this link yourself: valid for 7 days, for this address only.")
          }
        >
          <div role="status" className="p-4">
            <CopyField value={`${base}/invitation/${sp.invite}`} label={t("Lien d'invitation", "Invitation link")} lang={lang} />
          </div>
        </Group>
      )}

      <Group title={`${t("Membres", "Members")} · ${members?.length ?? 0}`}>
        {(members ?? []).map((m: any) => {
          const me = m.users.id === user.id;
          return (
            <Row key={m.users.id}>
              <Avatar email={m.users.email} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {m.users.email}
                  {me && <span className="text-ink-2"> · {t("toi", "you")}</span>}
                </span>
                <span className="type-small text-ink-2">
                  {t("Depuis le", "Since")} {day(m.created_at)}
                </span>
              </span>
              {isOwner && m.role !== "owner" ? (
                <span className="flex items-center gap-3">
                  <form action="/api/team" method="post">
                    <Hidden action="role" user={m.users.id} />
                    <AutoSubmitSelect name="role" defaultValue={m.role} label={t(`Accès de ${m.users.email}`, `Access for ${m.users.email}`)} options={ROLES} />
                  </form>
                  <form action="/api/team" method="post">
                    <Hidden action="remove" user={m.users.id} />
                    <ConfirmButton
                      message={t(`Retirer ${m.users.email} de l'équipe ${team.name} ?`, `Remove ${m.users.email} from the team ${team.name}?`)}
                      className="type-small inline-flex min-h-11 items-center px-1 text-fail hover:underline"
                    >
                      {t("Retirer", "Remove")}
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
          <Group title={t("Inviter un membre", "Invite a member")} footer={t("La personne reçoit un lien par e-mail et se connecte avec cette adresse.", "They get a link by e-mail and sign in with this address.")}>
            <form action="/api/team" method="post" className="grid gap-4 p-5 sm:p-6">
              <Hidden action="invite" />
              <Field label={t("E-mail du membre", "Member's e-mail")} name="email" type="email" required />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Segmented name="role" label={t("Accès", "Access")} value="viewer" options={ROLES} />
                <button className="btn">{t("Envoyer l’invitation", "Send the invitation")}</button>
              </div>
            </form>
          </Group>

          {!!invites?.length && (
            <Group title={t("Invitations en attente", "Pending invitations")}>
              {invites.map((i: any) => {
                const expired = new Date(i.expires_at) < new Date();
                return (
                  <Row key={i.id}>
                    <Avatar email={i.email} className="h-9 w-9 opacity-50" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{i.email}</span>
                      <span className={`type-small ${expired ? "text-fail" : "text-ink-2"}`}>
                        {ROLE_LABEL[i.role as Role]} · {expired ? t("expirée", "expired") : `${t("expire le", "expires on")} ${day(i.expires_at)}`}
                      </span>
                    </span>
                    <form action="/api/team" method="post">
                      <Hidden action="revoke" invitation={i.id} />
                      <ConfirmButton
                        message={t(`Annuler l'invitation de ${i.email} ?`, `Cancel the invitation for ${i.email}?`)}
                        className="type-small inline-flex min-h-11 items-center px-1 text-fail hover:underline"
                      >
                        {t("Annuler", "Cancel")}
                      </ConfirmButton>
                    </form>
                  </Row>
                );
              })}
            </Group>
          )}

          <Group title={t("Nom de l'équipe", "Team name")}>
            <form action="/api/team" method="post" className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
              <Hidden action="rename" />
              <div className="min-w-[220px] flex-1">
                <Field label={t("Nom", "Name")} name="name" type="text" required defaultValue={team.name} />
              </div>
              <button className="btn btn-secondary">{t("Renommer", "Rename")}</button>
            </form>
          </Group>

          <Group
            title={t("Marque blanche", "White label")}
            footer={t(
              "Pour les agences : ton nom et ton logo remplacent AgentProof sur les rapports de l'équipe (page web et PDF). Laisse le nom vide pour revenir à AgentProof.",
              "For agencies: your name and logo replace AgentProof on the team's reports (web page and PDF). Leave the name empty to go back to AgentProof.",
            )}
          >
            <form action="/api/team" method="post" className="grid gap-4 p-5 sm:p-6">
              <Hidden action="brand" />
              <Field label={t("Nom affiché sur les rapports", "Name shown on reports")} name="brand_name" type="text" defaultValue={brand?.brand_name ?? ""} />
              <Field label={t("Logo (adresse https d'une image)", "Logo (https address of an image)")} name="brand_logo" type="url" defaultValue={brand?.brand_logo ?? ""} />
              <div>
                <button className="btn btn-secondary">{t("Enregistrer", "Save")}</button>
              </div>
            </form>
          </Group>
        </>
      )}

      {!isOwner && (
        <Group>
          <form action="/api/team" method="post">
            <Hidden action="leave" />
            <ConfirmButton message={t(`Quitter l'équipe ${team.name} ? Tu perds l'accès aux rapports de l'équipe. Le propriétaire peut t'inviter à nouveau.`, `Leave the team ${team.name}? You lose access to the team's reports. The owner can invite you again.`)} className="flex min-h-[60px] w-full items-center px-5 text-left text-fail hover:bg-bg-2/60">
              {t("Quitter l’équipe", "Leave the team")}
            </ConfirmButton>
          </form>
        </Group>
      )}
    </SpaceShell>
  );
}
