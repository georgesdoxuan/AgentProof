import { redirect } from "next/navigation";
import { Hint } from "@/lib/hint";
import { teamContext } from "@/lib/auth";
import { LANGS, LANG_NAME } from "@/lib/i18n";
import { getDict, getLang, getT } from "@/lib/lang";
import { Avatar, Field, Group, Icon, Row } from "@/lib/ui";
import { spaceColor } from "@/lib/avatar";
import { AutoSubmitSelect } from "../../controls";
import { SpaceShell } from "../../shell";

export async function generateMetadata() {
  return { title: `${(await getDict()).account.title} · AgentProof` };
}

// Account: who you are, every team you belong to, the interface language, and signing out. Things changed rarely, kept out of the daily view.
export default async function Compte({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const sp = await searchParams;
  const tt = await getT();
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/reglages/compte");
  if (!ctx.team) redirect("/espace");
  const { user, teams, team } = ctx;
  const lang = await getLang();
  const t = await getDict();
  const a = t.account;
  const roles = t.roles;

  return (
    <SpaceShell narrow settings>
      <Group>
        <Row className="min-h-[76px]">
          <Avatar email={user.email} className="h-11 w-11" />
          <span className="min-w-0 flex-1">
            <Hint tip={a.loginNote} className="block">
              <span className="type-headline block truncate">{user.email}</span>
            </Hint>
            <span className="type-small text-ink-2">
              {a.teams(teams.length)}
            </span>
          </span>
        </Row>
      </Group>

      <Group title={a.myTeams}>
        {teams.map((t) => (
          <Row key={t.id}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] type-small font-semibold text-white" style={{ background: spaceColor(t.id) }} aria-hidden>
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
            <input type="hidden" name="next" value="/espace/reglages/compte" />
            <AutoSubmitSelect name="lang" defaultValue={lang} label={a.language} options={LANGS.map((l) => [l, LANG_NAME[l]])} />
          </form>
        </Row>
      </Group>

      <Group
        title={tt("Tes données", "Your data")}
        footer={
          <>
            {tt("Ce que nous gardons et pourquoi : ", "What we keep and why: ")}
            <a href="/confidentialite" className="text-link hover:underline">
              {tt("confidentialité", "privacy")}
            </a>
            .
          </>
        }
      >
        <a href="/api/account" download className="flex min-h-[60px] w-full items-center px-5 text-link hover:bg-bg-2/60">
          {tt("Télécharger mes données (JSON)", "Download my data (JSON)")}
        </a>
      </Group>

      {/* RGPD art. 17. Retyping the e-mail stands in for a confirmation dialog, and works without JavaScript. */}
      <section id="supprimer" className="scroll-mt-24">
        <h2 className="type-headline mb-3 px-1">{tt("Supprimer mon compte", "Delete my account")}</h2>
        <form action="/api/account" method="post" className="grid gap-4 rounded-[18px] bg-tile p-5 sm:p-6">
          <input type="hidden" name="action" value="delete" />
          <ul className="type-small grid gap-2 text-ink-2">
            {(
              [
                ["trash", tt("Effacement immédiat et définitif", "Erased at once and for good")],
                ["agency", tt("Équipes où tu es seul : supprimées avec leurs données", "Teams where you are alone: deleted with their data")],
                ["refresh", tt("Équipes partagées : transmises à un admin ou au plus ancien membre", "Shared teams: handed to an admin or the oldest member")],
              ] as const
            ).map(([icon, line]) => (
              <li key={icon} className="flex items-start gap-2.5">
                <Icon name={icon} className="mt-[2px] h-4 w-4" />
                {line}
              </li>
            ))}
          </ul>
          <Field label={tt(`Tape ${user.email} pour confirmer`, `Type ${user.email} to confirm`)} name="confirm" type="email" required />
          {sp.erreur === "confirmation" && (
            <p role="alert" className="type-small text-fail">
              {tt("L’adresse tapée ne correspond pas : rien n’a été supprimé.", "The address typed does not match: nothing was deleted.")}
            </p>
          )}
          <button className="btn justify-self-start bg-fail hover:bg-fail/90">{tt("Supprimer définitivement", "Delete for good")}</button>
        </form>
      </section>

      <Group>
        <form action="/api/auth" method="post">
          <input type="hidden" name="action" value="logout" />
          <button className="flex min-h-[60px] w-full items-center px-5 text-left text-link hover:bg-bg-2/60">{a.signOut}</button>
        </form>
      </Group>
    </SpaceShell>
  );
}
