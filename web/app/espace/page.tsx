import Link from "next/link";
import { Hint } from "@/lib/hint";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { dict, tr, type Lang, type T } from "@/lib/i18n";
import { getDict, getLang } from "@/lib/lang";
import { loadSpace, priorities, shortDate, type SiteView } from "@/lib/space";
import { Chevron, DeviceTag, Field, Group, MissionBar, MissionLegend, Row, Spinner, StatusGlyph, scoreTone, toneWords } from "@/lib/ui";
import { AutoRefresh } from "../audit/[id]/refresh";
import { SpaceShell } from "./shell";
import { BlockerItem, Delta, sitePath } from "./parts";
import { SiteLogo } from "../site-logo";

export async function generateMetadata() {
  return { title: `${(await getDict()).space.sections["/espace"]} · AgentProof` };
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

// The page title answers the product's question: can agents buy on my sites?
function headline(sites: SiteView[], t: T) {
  const scored = sites.filter((s) => s.latest?.s.score != null);
  const n = scored.length;
  const ready = scored.filter((s) => scoreTone(s.latest!.s.score) === "pass").length;
  if (!n) return t("Premier audit en cours.", "First audit running.");
  if (n === 1)
    return ready
      ? t("Les agents achètent sur ton site.", "Agents can buy on your site.")
      : t(`Les agents réussissent ${scored[0].latest!.s.score} % des achats sur ton site.`, `Agents complete ${scored[0].latest!.s.score} % of purchases on your site.`);
  if (ready === n) return t(`Les agents achètent sur tes ${n} sites.`, `Agents can buy on all ${n} of your sites.`);
  if (!ready) return t(`Aucun de tes ${n} sites n'est prêt pour les agents.`, `None of your ${n} sites is ready for agents.`);
  return t(`Les agents achètent sur ${ready} site${ready > 1 ? "s" : ""} sur ${n}.`, `Agents can buy on ${ready} of your ${n} sites.`);
}

// Home of the team space: the sites' scores, what is running, what to fix first.
export default async function Accueil() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace");
  const { user, teams, team } = ctx;
  const lang = await getLang();
  const t = tr(lang);
  if (!team) return <NoTeam email={user.email} lang={lang} />;

  const { audits, sites } = await loadSpace(team.id);
  const running = audits.filter((a) => a.status !== "done");
  const todo = priorities(sites);
  const open = sites.flatMap((s) => s.blockers.filter((b) => b.state !== "check"));
  const lost = open.reduce((n, b) => n + b.missions, 0);
  const last = audits.find((a) => a.status === "done" && a.runs.length);
  const launch = canLaunch(team.role);

  const status = !audits.length
    ? t("Lance un premier audit pour voir si un agent IA peut acheter sur ton site.", "Run a first audit to see whether an AI agent can buy on your site.")
    : [
        plural(sites.length, "site") + t(sites.length > 1 ? " suivis" : " suivi", " tracked"),
        running.length ? `${plural(running.length, "audit")} ${t("en cours", "running")}` : null,
        open.length
          ? t(`${plural(open.length, "blocage")} à corriger · ${plural(lost, "mission")} perdue${lost > 1 ? "s" : ""}`, `${plural(open.length, "blocker")} to fix · ${plural(lost, "mission")} lost`)
          : sites.some((s) => s.latest)
            ? t("aucun blocage ouvert", "no open blocker")
            : null,
        last ? `${t("dernier audit le", "last audit on")} ${shortDate(last.created_at, lang)}` : null,
      ]
        .filter(Boolean)
        .join(" · ") + ".";

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title={audits.length ? headline(sites, t) : t("Ton espace est prêt.", "Your space is ready.")}
      intro={status}
      actions={
        launch && audits.length > 0 ? (
          <Link href="/espace/nouveau" className="btn">
            {t("Lancer un audit", "Run an audit")}
          </Link>
        ) : undefined
      }
    >
      {running.length > 0 && <AutoRefresh />}

      {!audits.length && (
        <section className="tile p-0!">
          <ol className="grid md:grid-cols-3">
            {t(
              [
                ["Indique ton site", "Son adresse, et un concurrent si tu veux te comparer."],
                ["L'agent essaie d'acheter", "Cinq missions réelles, de la recherche au checkout, en 10 à 20 minutes."],
                ["Corrige ce qui bloque", "Capture du blocage, correction proposée, puis relance pour vérifier."],
              ],
              [
                ["Enter your site", "Its address, and a competitor if you want to compare."],
                ["The agent tries to buy", "Five real missions, from search to checkout, in 10 to 20 minutes."],
                ["Fix what blocks", "Screenshot of the blocker, a suggested fix, then a rerun to check."],
              ],
            ).map(([h, d], i) => (
              <li key={h} className="border-hairline p-8 max-md:border-b md:border-r md:last:border-0 max-md:last:border-0">
                <span className="type-small grid h-7 w-7 place-items-center rounded-full bg-fill font-semibold tnum">{i + 1}</span>
                <h2 className="type-headline mt-4">
                  <Hint tip={d}>{h}</Hint>
                </h2>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline px-8 py-6">
            {!launch && <p className="type-small text-ink-2">{t("Accès lecteur : un admin ou le propriétaire lance les audits.", "Viewer access: an admin or the owner runs audits.")}</p>}
            {launch && (
              <Hint focusable={false} align="end" side="top" className="ml-auto" tip={t(`Le rapport arrive aussi par e-mail à ${user.email}.`, `The report is also e-mailed to ${user.email}.`)}>
                <Link href="/espace/nouveau" className="btn">
                  {t("Lancer mon premier audit", "Run my first audit")}
                </Link>
              </Hint>
            )}
          </div>
        </section>
      )}

      {sites.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <h2 className="type-headline">Sites</h2>
            <Link href="/espace/sites" className="type-small text-link hover:underline">
              {t("Tout voir", "See all")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 max-[734px]:gap-3 xl:grid-cols-4">
            {sites.slice(0, 4).map((s) => {
              const score = s.latest?.s.score ?? null;
              const tone = scoreTone(score);
              return (
                <Link key={s.key} href={sitePath(s)} className="tile flex flex-col gap-3 rounded-[20px]! p-5! transition-colors duration-200 hover:bg-tile/80">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <SiteLogo domain={s.domain} name={s.domain} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{s.domain}</span>
                        <span className="type-caption block text-ink-2"><DeviceTag device={s.device} lang={lang} /></span>
                      </span>
                    </span>
                    <Delta site={s} />
                  </span>
                  <span className="flex items-center gap-2 text-[32px] font-semibold leading-none tnum">
                    <span className="sr-only">{toneWords(lang)[tone]} :</span>
                    <StatusGlyph tone={tone} className="h-5 w-5" />
                    {score ?? "—"}
                    <span className="-ml-1 text-[17px] text-ink-2">%</span>
                  </span>
                  {s.latest ? <MissionBar ok={s.latest.s.ok} done={s.latest.s.done} total={s.latest.s.total} size="sm" /> : <span className="type-caption text-ink-2">{t("Premier audit en cours", "First audit running")}</span>}
                </Link>
              );
            })}
          </div>
          <MissionLegend className="mt-3 px-1" />
        </section>
      )}

      {running.length > 0 && (
        <Group
          title={t("En cours", "Running")}
          footer={t("La page se met à jour toute seule. Ouvre un audit pour regarder l'agent en direct.", "The page updates by itself. Open an audit to watch the agent live.")}
        >
          {running.map((a) => (
            <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
              <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_1rem]">
                <span className="flex min-w-0 items-center gap-3">
                  <SiteLogo domain={a.sites?.domain} name={a.sites?.domain} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.sites?.domain}</span>
                    <span className="type-small text-ink-2">
                      <DeviceTag device={a.device} lang={lang} /> · {t("lancé", "started")} {shortDate(a.created_at, lang)}
                    </span>
                  </span>
                </span>
                <span className="hidden sm:block">
                  <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                </span>
                <span className="type-small flex items-center justify-end gap-2 whitespace-nowrap text-ink-2 tnum">
                  <Spinner className="h-3.5 w-3.5" />
                  {a.s.finished} {t("sur", "of")} {a.s.total}
                </span>
                <Chevron className="hidden h-3 w-3 text-ink-2 sm:block" />
              </div>
            </Link>
          ))}
        </Group>
      )}

      {todo.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <h2 className="type-headline">{t("À corriger en priorité", "Fix first")}</h2>
            <span className="type-small text-ink-2">{t("Classé par missions perdues", "Sorted by missions lost")}</span>
          </div>
          <div className={`grid gap-5 ${todo.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {todo.map(({ site, b }) => (
              <BlockerItem key={`${site.key}:${b.type}`} site={site} b={b} canEdit={false} compact />
            ))}
          </div>
        </section>
      )}
    </SpaceShell>
  );
}

// Signed in but in no team: pending invitations first, or create a team.
async function NoTeam({ email, lang }: { email: string; lang: Lang }) {
  const t = tr(lang);
  const roles = dict(lang).roles;
  const { data: invites } = await db
    .from("invitations")
    .select("id, role, teams(name)")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());
  return (
    <div className="bg-bg-2 py-24 max-[734px]:py-14">
      <div className="mx-auto grid w-[min(560px,87.5%)] gap-10">
        <header className="text-center">
          <h1 className="type-h1">{t("Ton espace.", "Your space.")}</h1>
          <p className="type-intro mt-3 text-ink-2">{t("Rejoins une équipe ou crée la tienne pour lancer des audits.", "Join a team or create your own to run audits.")}</p>
        </header>
        {!!invites?.length && (
          <Group title={t("Invitations en attente", "Pending invitations")} footer={t("Ouvre le lien reçu par e-mail pour rejoindre l'équipe.", "Open the link you received by e-mail to join the team.")}>
            {invites.map((i: any) => (
              <Row key={i.id}>
                <span className="flex-1 font-semibold">{i.teams?.name}</span>
                <span className="type-small text-ink-2">{roles[i.role as "admin" | "viewer"]}</span>
              </Row>
            ))}
          </Group>
        )}
        <Group title={t("Créer une équipe", "Create a team")}>
          <form action="/api/team" method="post" className="grid gap-4 p-5 sm:p-6">
            <input type="hidden" name="action" value="create" />
            <Field label={t("Nom de l'équipe", "Team name")} name="name" type="text" required />
            <button className="btn justify-self-end">{t("Créer l’équipe", "Create the team")}</button>
          </form>
        </Group>
        <form action="/api/auth" method="post" className="text-center">
          <input type="hidden" name="action" value="logout" />
          <button className="type-small text-link hover:underline">{t("Se déconnecter de", "Sign out of")} {email}</button>
        </form>
      </div>
    </div>
  );
}
