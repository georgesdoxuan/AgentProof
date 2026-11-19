import Link from "next/link";
import { Hint } from "@/lib/hint";
import { notFound, redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { deviceLabel, loadSpace, shortDate } from "@/lib/space";
import { locale, tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { BlockerIcon, Chevron, Chip, Chips, Empty, Group, Icon, MissionBar, Recommendations, Spinner, StatusGlyph, ToneLabel, blockerLabel, scoreTone } from "@/lib/ui";
import { AutoRefresh } from "../../../audit/[id]/refresh";
import { SpaceShell } from "../../shell";
import { BlockerItem, Delta, RelaunchForm, rankText } from "../../parts";
import { SiteLogo } from "../../../site-logo";

export const metadata = { title: "Site · AgentProof" };

// One site for one device: score over time, the fix checklist, the competitor, every audit.
export default async function Site({ params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.map(decodeURIComponent).join("/");
  const ctx = await teamContext();
  if (!ctx) redirect(`/connexion?next=/espace/sites/${key}`);
  if (!ctx.team) redirect("/espace");
  const { teams, team } = ctx;
  const { sites } = await loadSpace(team.id);
  const site = sites.find((s) => s.key === key);
  if (!site) notFound();

  const lang = await getLang();
  const t = tr(lang);
  const edit = canLaunch(team.role);
  const s = site.latest?.s;
  const history = site.audits.filter((a) => a.status === "done" && a.s.score != null).reverse();
  const other = sites.find((x) => x.domain === site.domain && x.device !== site.device);
  const c = site.competitor;
  const todo = site.blockers.filter((b) => b.state !== "check").length;

  return (
    <SpaceShell
      team={team}
      teams={teams}
      parent={["/espace/sites", "Sites"]}
      title={
        <span className="flex min-w-0 items-center gap-4">
          <SiteLogo domain={site.domain} name={site.domain} size="lg" />
          <span className="min-w-0 break-words">{site.label}</span>
        </span>
      }
      intro={
        <Chips>
          <Chip icon={site.device === "mobile" ? "mobile" : "desktop"}>{deviceLabel(site.device, lang)}</Chip>
          <Chip icon="ranking" tone={site.rank ? "blue" : "plain"}>{rankText(site.rank, lang)}</Chip>
          {other && (
            <Link href={`/espace/sites/${other.key}`} className="rounded-full hover:opacity-80">
              <Chip icon={other.device === "mobile" ? "mobile" : "desktop"} className="bg-transparent! shadow-[inset_0_0_0_1px_var(--line)] text-link!">
                {deviceLabel(other.device, lang)} <Chevron className="h-2.5 w-2.5" />
              </Chip>
            </Link>
          )}
        </Chips>
      }
      actions={edit ? <RelaunchForm site={site} label={t("Relancer l'audit", "Rerun the audit")} /> : undefined}
    >
      {site.running && <AutoRefresh />}
      {site.running && (
        <Link href={`/audit/${site.running.id}`} className="tile flex items-center gap-3 p-5! hover:bg-tile/80" role="status">
          <Spinner className="h-4 w-4 text-ink-2" />
          <span className="flex-1">
            <span className="font-semibold">
              {t(`Audit en cours · ${site.running.s.finished}/${site.running.s.total}`, `Audit running · ${site.running.s.finished}/${site.running.s.total}`)}
            </span>
          </span>
          <Chip icon="live" tone="blue">{t("Direct", "Live")}</Chip>
          <Chevron className="h-3 w-3 text-ink-2" />
        </Link>
      )}

      {s && site.latest && (
        <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr] [&>*]:min-w-0" aria-label="Score">
          <Link href={`/audit/${site.latest.id}`} className="tile group flex flex-col hover:bg-tile/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-headline">{t("Score agent", "Agent score")}</h2>
              <ToneLabel score={s.score} />
            </div>
            <p className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[80px] font-semibold leading-none tracking-[-0.015em] tnum max-[734px]:text-[64px]">
              <span>
                {s.score ?? "—"}
                <span className="ml-1 text-[36px] text-ink-2">%</span>
              </span>
              <Delta site={site} className="text-[17px]!" />
            </p>
            <div className="mt-8">
              <MissionBar ok={s.ok} done={s.done} total={s.total} />
            </div>
            <span className="more mt-auto pt-6 group-hover:underline">
              {t("Rapport du", "Report of")} {shortDate(site.latest.created_at, lang)}
            </span>
          </Link>

          <div className="tile flex flex-col">
            <h2 className="type-headline">{t("Évolution", "Trend")}</h2>
            {history.length > 1 ? (
              <ol className="mt-6 flex h-44 items-end gap-3" aria-label={t("Score de chaque audit, du plus ancien au plus récent", "Score of each audit, oldest to newest")}>
                {history.slice(-8).map((a) => (
                  <li key={a.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="type-small font-semibold tnum">{a.s.score} %</span>
                    <Link
                      href={`/audit/${a.id}`}
                      className={`block w-full max-w-14 rounded-t-[8px] transition-opacity hover:opacity-80 ${{ pass: "bg-pass", warn: "bg-warn", fail: "bg-fail", none: "bg-fill" }[scoreTone(a.s.score)]}`}
                      style={{ height: `${Math.max(4, a.s.score!)}%` }}
                      aria-label={`${a.s.score} % ${t("le", "on")} ${shortDate(a.created_at, lang)}`}
                    />
                    <span className="type-caption whitespace-nowrap text-ink-2">
                      {new Date(a.created_at).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "short" })}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-[12px] bg-bg-2 p-6 text-center text-ink-2 dark:bg-[#2c2c2e]">
                <Icon name="trend" className="h-6 w-6" />
                <span className="type-small">{t("Dès le 2ᵉ audit", "From the 2nd audit")}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="corrections" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-1">
          <h2 className="type-headline">{t("Corrections", "Fixes")}</h2>
          {site.latest && (
            <Chips>
              {todo > 0 && <Chip icon="wrench" tone="warn">{t(`${todo} à faire`, `${todo} to do`)}</Chip>}
              {site.blockers.length - todo > 0 && <Chip icon="refresh" tone="blue">{t(`${site.blockers.length - todo} à vérifier`, `${site.blockers.length - todo} to check`)}</Chip>}
              {!site.blockers.length && <Chip icon="none" tone="pass">{t("Aucun blocage", "No blocker")}</Chip>}
            </Chips>
          )}
        </div>
        {site.blockers.length ? (
          <div className="space-y-5">
            {site.blockers.map((b) => (
              <BlockerItem key={b.type} site={site} b={b} canEdit={edit} />
            ))}
          </div>
        ) : (
          <Empty icon={site.latest ? "none" : "clock"} title={site.latest ? t("Aucun blocage", "No blocker") : t("Après le premier rapport", "After the first report")} />
        )}
        {site.blockers.some((b) => b.state === "check") && edit && (
          <div className="tile mt-5 flex flex-wrap items-center justify-between gap-4 p-7!">
            <p className="flex items-center gap-3 font-semibold">
              <Icon name="refresh" className="h-5 w-5 shrink-0 text-blue" />
              <Hint tip={t("« Prouver la correction » rejoue seulement les missions bloquées ; ou relance l’audit complet.", "“Prove the fix” replays only the blocked missions; or rerun the full audit.")}>
                {t("Corrections à vérifier", "Fixes to check")}
              </Hint>
            </p>
            <RelaunchForm site={site} />
          </div>
        )}
        {site.verified.length > 0 && (
          <Group title={t("Corrections prouvées", "Proven fixes")} footer={t("Marquées corrigées, puis absentes de l'audit suivant ou réussies au rejeu de preuve.", "Marked fixed, then absent from the next audit or passed in the proof replay.")}>
            {site.verified.map((v) => (
              <div key={v} className="flex min-h-[56px] items-center gap-3 border-b border-hairline px-5 last:border-0">
                <BlockerIcon type={v} />
                <span className="font-semibold">{blockerLabel(v, lang)}</span>
                <StatusGlyph tone="pass" className="ml-auto h-4 w-4" />
              </div>
            ))}
          </Group>
        )}
      </section>

      {site.latest?.recommendations && (
        <details className="group">
          <summary className="type-headline mb-3 flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 [&::-webkit-details-marker]:hidden">
            <Chevron className="h-3 w-3 text-ink-2 transition-transform duration-200 group-open:rotate-90" />
            {t("Plan de corrections", "Fix plan")}
            <Chip icon="sparkle">IA</Chip>
          </summary>
          <Recommendations text={site.latest.recommendations} />
        </details>
      )}

      {c && s && (
        <Link href={`/audit/${c.id}`} className="tile group block hover:bg-tile/80">
          <h2 className="type-headline">{t("Face au concurrent", "Against the competitor")}</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {(
              [
                [site.label, s, true, site.domain],
                [c.sites?.domain ?? t("Concurrent", "Competitor"), c.s, false, c.sites?.domain],
              ] as const
            ).map(([name, x, self, domain]) => (
              <div key={name} className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`flex min-w-0 items-center gap-2.5 ${self ? "font-semibold" : "text-ink-2"}`}>
                    <SiteLogo domain={domain} name={name} size="sm" />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="text-[21px] font-semibold tnum">{x.score ?? "—"} %</span>
                </div>
                <MissionBar ok={x.ok} done={x.done} total={x.total} />
              </div>
            ))}
          </div>
        </Link>
      )}

      <Group title={t("Audits de ce site", "Audits of this site")}>
        {site.audits.map((a) => (
          <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
            <div className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_5.5rem_1rem]">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{shortDate(a.created_at, lang)}</span>
                <span className="type-small text-ink-2">{a.users?.email ?? "—"}</span>
              </span>
              <span className="hidden sm:block">
                <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
              </span>
              <span className="flex items-center justify-end gap-2 whitespace-nowrap font-semibold tnum">
                {a.status === "done" && a.s.score == null ? (
                  // Same wording as the reports list: nothing counted, not an unexplained "— %".
                  <span className="type-small flex items-center gap-1.5 text-ink-2">
                    <StatusGlyph tone="unsure" className="h-4 w-4" />
                    {t("Sans score", "No score")}
                  </span>
                ) : a.status === "done" ? (
                  <>
                    <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                    {a.s.score} %
                  </>
                ) : (
                  <span className="type-small flex items-center gap-2 font-normal text-ink-2">
                    <Spinner className="h-3.5 w-3.5" />
                    {a.s.finished} {t("sur", "of")} {a.s.total}
                  </span>
                )}
              </span>
              <Chevron className="hidden h-3 w-3 text-ink-2 sm:block" />
            </div>
          </Link>
        ))}
      </Group>
    </SpaceShell>
  );
}
