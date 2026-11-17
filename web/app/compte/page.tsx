import { redirect } from "next/navigation";
import { ROLE_LABEL, teamContext } from "@/lib/auth";
import { Avatar, Field, Group, Row } from "@/lib/ui";
import { SpaceShell } from "../espace/shell";

export const metadata = { title: "Compte · AgentProof" };

// Account: who you are, every team you belong to, and signing out. Things changed rarely, kept out of the daily view.
export default async function Compte() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/compte");
  if (!ctx.team) redirect("/espace");
  const { user, teams, team } = ctx;

  return (
    <SpaceShell team={team} teams={teams} title="Compte">
      <Group footer="Connexion par lien e-mail, sans mot de passe.">
        <Row className="min-h-[76px]">
          <Avatar email={user.email} className="h-11 w-11" />
          <span className="min-w-0 flex-1">
            <span className="type-headline block truncate">{user.email}</span>
            <span className="type-small text-ink-2">
              {teams.length} équipe{teams.length > 1 ? "s" : ""}
            </span>
          </span>
        </Row>
      </Group>

      <Group title="Mes équipes">
        {teams.map((t) => (
          <Row key={t.id}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-ink type-small font-semibold text-bg" aria-hidden>
              {t.name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{t.name}</span>
              <span className="type-small text-ink-2">{ROLE_LABEL[t.role]}</span>
            </span>
            {t.id === team.id ? (
              <span className="type-small text-ink-2">Équipe ouverte</span>
            ) : (
              <form action="/api/team" method="post">
                <input type="hidden" name="action" value="switch" />
                <input type="hidden" name="team" value={t.id} />
                <button className="type-small inline-flex min-h-11 items-center px-1 text-link hover:underline">Ouvrir</button>
              </form>
            )}
          </Row>
        ))}
      </Group>

      <Group title="Créer une équipe" footer="Tu en deviens propriétaire et tu y invites qui tu veux.">
        <form action="/api/team" method="post" className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          <input type="hidden" name="action" value="create" />
          <div className="min-w-[220px] flex-1">
            <Field label="Nom de la nouvelle équipe" name="name" type="text" required />
          </div>
          <button className="btn btn-secondary">Créer</button>
        </form>
      </Group>

      <Group>
        <form action="/api/auth" method="post">
          <input type="hidden" name="action" value="logout" />
          <button className="flex min-h-[60px] w-full items-center px-5 text-left text-link hover:bg-bg-2/60">Se déconnecter</button>
        </form>
      </Group>
    </SpaceShell>
  );
}
