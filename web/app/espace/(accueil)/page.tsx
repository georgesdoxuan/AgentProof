import Link from "next/link";
import { Hint } from "@/lib/hint";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { canLaunch, teamContext } from "@/lib/auth";
import { dict, tr, type Lang, type T } from "@/lib/i18n";
import { getDict, getLang } from "@/lib/lang";
import { loadSpace, priorities, shortDate, type SiteView } from "@/lib/space";
import { monthRecap } from "@/lib/month";
import { loadPace, estimateMinutes, minutesLabel } from "@/lib/estimate";
import { Chevron, Chip, Chips, DeviceTag, Field, Group, Icon, MissionBar, MissionLegend, Row, Note, Spinner, StatusGlyph, scoreTone, toneWords } from "@/lib/ui";
import { AutoRefresh } from "../../audit/[id]/refresh";
import { SpaceShell } from "../shell";
import { Delta, PriorityCard, sitePath } from "../parts";
import { SiteLogo } from "../../site-logo";

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
      : t(`Les agents réussissent ${scored[0].latest!.s.score}\u00a0% des achats sur ton site.`, `Agents complete ${scored[0].latest!.s.score}\u00a0% of purchases on your site.`);
  if (ready === n) return t(`Les agents achètent sur tes ${n} sites.`, `Agents can buy on all ${n} of your sites.`);
  if (!ready) return t(`Aucun de tes ${n} sites n'est prêt pour les agents.`, `None of your ${n} sites is ready for agents.`);
  return t(`Les agents achètent sur ${ready} site${ready > 1 ? "s" : ""} sur ${n}.`, `Agents can buy on ${ready} of your ${n} sites.`);
}

// Home of the team space: the sites' scores, what is running, what to fix first.
export default async function Accueil() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace");
  const { user, team } = ctx;
  const lang = await getLang();
  const t = tr(lang);
  if (!team) return <NoTeam email={user.email} lang={lang} />;

  const { audits, sites } = await loadSpace(team.id);
  // Only the empty space shows how long a first audit takes.
  const pace = audits.length ? null : await loadPace();
  const running = audits.filter((a) => a.status !== "done");
  const todo = priorities(sites);
  const open = sites.flatMap((s) => s.blockers.filter((b) => b.state !== "check"));
  const lost = open.reduce((n, b) => n + b.missions, 0);
  const last = audits.find((a) => a.status === "done" && a.runs.length);
  const launch = canLaunch(team.role);
  const month = audits.length ? await monthRecap(team.id, audits, sites) : null;

  // Facts as chips, like a dashboard's header: count, live work, what is left to fix, freshness.
  const status = audits.length ? (
    <Chips>
      <Chip icon="layers">{plural(sites.length, "site")}</Chip>
      {running.length > 0 && <Chip icon="live" tone="live">{running.length} {t("en cours", "running")}</Chip>}
      {open.length > 0 ? (
        <Chip icon="wrench" tone="warn">
          {plural(open.length, t("blocage", "blocker"))} · {plural(lost, "mission")} {t(lost > 1 ? "perdues" : "perdue", "lost")}
        </Chip>
      ) : (
        sites.some((s) => s.latest) && <Chip icon="none" tone="pass">{t("Aucun blocage", "No blocker")}</Chip>
      )}
      {last && <Chip icon="clock">{shortDate(last.created_at, lang)}</Chip>}
    </Chips>
  ) : undefined;

  return (
    <SpaceShell
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
            {(
              [
                ["pin", t("Indique ton site", "Enter your site"), t("Toute boutique de produits physiques : son adresse, et un concurrent si tu veux te comparer.", "Any shop selling physical products: its address, and a competitor if you want to compare."), null],
                ["audit", t("L'agent essaie d'acheter", "The agent tries to buy"), t("Cinq missions réelles, de la recherche au checkout.", "Five real missions, from search to checkout."), pace && minutesLabel(estimateMinutes(5, pace.desktop))],
                ["wrench", t("Corrige ce qui bloque", "Fix what blocks"), t("Capture du blocage, correction proposée, puis relance pour vérifier.", "Screenshot of the blocker, a suggested fix, then a rerun to check."), null],
              ] as const
            ).map(([icon, h, d, chip], i) => (
              <li key={h} className="border-hairline p-8 max-md:border-b md:border-r md:last:border-0 max-md:last:border-0">
                <span className="flex items-center justify-between gap-3">
                  <Icon name={icon} className="h-6 w-6 text-blue" />
                  <span className="type-caption tnum text-ink-2">{i + 1}/3</span>
                </span>
                <h2 className="type-headline mt-4">
                  <Hint tip={d}>{h}</Hint>
                </h2>
                {chip && <Chip icon="clock" className="mt-3">{chip}</Chip>}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline px-8 py-6">
            {!launch && <Note icon="eye">{t("Lecture seule : un admin lance les audits.", "Read-only: an admin runs audits.")}</Note>}
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
                        <span className="block truncate font-semibold">{s.label}</span>
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

      {month && (
        <section aria-labelledby="mois">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <h2 id="mois" className="type-headline">
              {t("Ce mois-ci", "This month")} · {month.start.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}
            </h2>
            <Link href="/espace/automations" className="type-small text-link hover:underline">
              {t("Automations", "Automations")}
            </Link>
          </div>
          <div className="tile p-0!">
            <dl className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
              {(
                [
                  [month.audits, t("audits terminés", "audits finished")],
                  [month.checks, t("vérifications de pages", "page checks")],
                  [month.deploys, t("mises en ligne vérifiées", "releases checked")],
                  [month.changes, t("changements détectés", "changes detected")],
                  [month.drops, t("baisses de score", "score drops")],
                  [month.proven, t("corrections prouvées", "fixes proven")],
                ] as const
              ).map(([n, label]) => (
                <div key={label} className="flex flex-col border-b border-r border-hairline px-5 py-4">
                  <dt className="type-small order-last text-ink-2">{label}</dt>
                  <dd className="text-[28px] font-semibold leading-tight tnum">{n}</dd>
                </div>
              ))}
            </dl>
            <p className="type-small px-5 py-4 text-ink-2">
              {month.checks + month.audits === 0
                ? t("Aucune vérification ce mois-ci : active une automation pour que tes pages soient relues.", "No check this month: turn on an automation so your pages are reread.")
                : month.changes + month.drops === 0
                ? t(
                    `Aucune alerte ce mois-ci : aucune page n'a changé, aucun score n'a baissé${month.checks ? ` (${month.checks} vérifications)` : ""}.`,
                    `No alert this month: no page changed, no score dropped${month.checks ? ` (${month.checks} checks)` : ""}.`,
                  )
                : t(`${month.changes + month.drops} alerte${month.changes + month.drops > 1 ? "s" : ""} ce mois-ci, détail dans Automations et dans les rapports.`, `${month.changes + month.drops} alert${month.changes + month.drops > 1 ? "s" : ""} this month, details in Automations and the reports.`)}
              {month.open > 0 && t(` ${month.open} blocage${month.open > 1 ? "s" : ""} encore ouvert${month.open > 1 ? "s" : ""}.`, ` ${month.open} blocker${month.open > 1 ? "s" : ""} still open.`)}
            </p>
          </div>
        </section>
      )}

      {running.length > 0 && (
        <Group title={t("En cours", "Running")} aside={<Chip icon="live" tone="live">{t("Direct", "Live")}</Chip>}>
          {running.map((a) => (
            <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
              <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_1rem]">
                <span className="flex min-w-0 items-center gap-3">
                  <SiteLogo domain={a.sites?.domain} name={a.sites?.domain} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.label}</span>
                    <span className="type-small text-ink-2">
                      <DeviceTag device={a.device} lang={lang} /> · {t("lancé", "started")} {shortDate(a.created_at, lang)}
                    </span>
                  </span>
                </span>
                <span className="hidden sm:block">
                  <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                </span>
                <span className="type-small flex items-center justify-end gap-2 whitespace-nowrap font-semibold text-live tnum">
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
            <Chip icon="trend" className="max-sm:hidden">{t("Par missions perdues", "By missions lost")}</Chip>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todo.map(({ site, b }) => (
              <PriorityCard key={`${site.key}:${b.type}`} site={site} b={b} />
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
        </header>
        {!!invites?.length && (
          <Group title={t("Invitations en attente", "Pending invitations")} aside={<Chip icon="mail">{t("Lien reçu par e-mail", "Link sent by e-mail")}</Chip>}>
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
