import { redirect } from "next/navigation";
import { teamContext } from "@/lib/auth";
import { LANGS, LANG_NAME } from "@/lib/i18n";
import { getDict, getLang } from "@/lib/lang";
import { Avatar, Field, Group, Row } from "@/lib/ui";
import { AutoSubmitSelect } from "../espace/controls";
import { SpaceShell } from "../espace/shell";

export async function generateMetadata() {
  return { title: `${(await getDict()).account.title} · AgentProof` };
}

// Account: who you are, every team you belong to, the interface language, and signing out. Things changed rarely, kept out of the daily view.
export default async function Compte() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/compte");
  if (!ctx.team) redirect("/espace");
  const { user, teams, team } = ctx;
  const lang = await getLang();
  const t = await getDict();
  const a = t.account;
  const roles = t.roles;

  return (
    <SpaceShell narrow team={team} teams={teams} title={a.title}>
      <Group footer={a.loginNote}>
        <Row className="min-h-[76px]">
          <Avatar email={user.email} className="h-11 w-11" />
          <span className="min-w-0 flex-1">
            <span className="type-headline block truncate">{user.email}</span>
            <span className="type-small text-ink-2">
              {a.teams(teams.length)}
            </span>
          </span>
        </Row>
      </Group>

      <Group title={a.myTeams}>
        {teams.map((t) => (
          <Row key={t.id}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-ink type-small font-semibold text-bg" aria-hidden>
              {t.name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{t.name}</span>
              <span className="type-small text-ink-2">{roles[t.role]}</span>
            </span>
            {t.id === team.id ? (
              <span className="type-small text-ink-2">{a.openTeam}</span>
            ) : (
              <form action="/api/team" method="post">
                <input type="hidden" name="action" value="switch" />
                <input type="hidden" name="team" value={t.id} />
                <button className="type-small inline-flex min-h-11 items-center px-1 text-link hover:underline">{a.open}</button>
              </form>
            )}
          </Row>
        ))}
      </Group>

      <Group title={a.createTitle} footer={a.createNote}>
        <form action="/api/team" method="post" className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          <input type="hidden" name="action" value="create" />
          <div className="min-w-[220px] flex-1">
            <Field label={a.createField} name="name" type="text" required />
          </div>
          <button className="btn btn-secondary">{a.create}</button>
        </form>
      </Group>

      <Group title={a.language} footer={a.languageNote}>
        <Row>
          <span className="min-w-0 flex-1 font-semibold">{a.language}</span>
          <form action="/api/lang" method="post">
            <input type="hidden" name="next" value="/compte" />
            <AutoSubmitSelect name="lang" defaultValue={lang} label={a.language} options={LANGS.map((l) => [l, LANG_NAME[l]])} />
          </form>
        </Row>
      </Group>

      <Group>
        <form action="/api/auth" method="post">
          <input type="hidden" name="action" value="logout" />
          <button className="flex min-h-[60px] w-full items-center px-5 text-left text-link hover:bg-bg-2/60">{a.signOut}</button>
        </form>
      </Group>
    </SpaceShell>
  );
}
