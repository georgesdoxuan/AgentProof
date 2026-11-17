import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { deviceLabel, loadSpace, shortDate } from "@/lib/space";
import { Chevron, Group, MissionBar, Recommendations, Spinner, StatusGlyph, ToneLabel, blockerLabel, scoreTone } from "@/lib/ui";
import { AutoRefresh } from "../../../audit/[id]/refresh";
import { SpaceShell } from "../../shell";
import { BlockerItem, Delta, RelaunchForm, rankText } from "../../parts";

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
      title={site.domain}
      intro={
        <>
          {deviceLabel(site.device)} · {rankText(site.rank)}
          {other && (
            <>
              {" · "}
              <Link href={`/espace/sites/${other.key}`} className="text-link hover:underline">
                Voir la version {deviceLabel(other.device).toLowerCase()}
              </Link>
            </>
          )}
        </>
      }
      actions={edit ? <RelaunchForm site={site} label="Relancer l'audit" /> : undefined}
    >
      {site.running && <AutoRefresh />}
      {site.running && (
        <Link href={`/audit/${site.running.id}`} className="tile flex items-center gap-3 p-5! hover:bg-tile/80" role="status">
          <Spinner className="h-4 w-4 text-ink-2" />
          <span className="flex-1">
            <span className="font-semibold">Audit en cours · {site.running.s.finished} missions sur {site.running.s.total}.</span>{" "}
            <span className="text-ink-2">Regarde l&apos;agent en direct.</span>
          </span>
          <Chevron className="h-3 w-3 text-ink-2" />
        </Link>
      )}

      {s && site.latest && (
        <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr] [&>*]:min-w-0" aria-label="Score">
          <Link href={`/audit/${site.latest.id}`} className="tile group flex flex-col hover:bg-tile/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-headline">Score agent</h2>
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
            <span className="more mt-auto pt-6 group-hover:underline">Rapport du {shortDate(site.latest.created_at)}</span>
          </Link>

          <div className="tile flex flex-col">
            <h2 className="type-headline">Évolution</h2>
            {history.length > 1 ? (
              <ol className="mt-6 flex h-44 items-end gap-3" aria-label="Score de chaque audit, du plus ancien au plus récent">
                {history.slice(-8).map((a) => (
                  <li key={a.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="type-small font-semibold tnum">{a.s.score} %</span>
                    <Link
                      href={`/audit/${a.id}`}
                      className={`block w-full max-w-14 rounded-t-[8px] transition-opacity hover:opacity-80 ${{ pass: "bg-pass", warn: "bg-warn", fail: "bg-fail", none: "bg-fill" }[scoreTone(a.s.score)]}`}
                      style={{ height: `${Math.max(4, a.s.score!)}%` }}
                      aria-label={`${a.s.score} % le ${shortDate(a.created_at)}`}
                    />
                    <span className="type-caption whitespace-nowrap text-ink-2">
                      {new Date(a.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" })}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-ink-2">L&apos;évolution s&apos;affiche dès le deuxième audit. Corrige un blocage, puis relance pour mesurer l&apos;effet.</p>
            )}
          </div>
        </section>
      )}

      <section id="corrections" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-1">
          <h2 className="type-headline">Corrections</h2>
          <span className="type-small text-ink-2">
            {site.latest ? (todo ? `${todo} à faire · ${site.blockers.length - todo} à vérifier` : site.blockers.length ? "Tout est marqué corrigé" : "Aucun blocage au dernier audit") : ""}
          </span>
        </div>
        {site.blockers.length ? (
          <div className="space-y-5">
            {site.blockers.map((b) => (
              <BlockerItem key={b.type} site={site} b={b} canEdit={edit} />
            ))}
          </div>
        ) : (
          <div className="tile">
            <p className="type-headline">{site.latest ? "L'agent n'a rencontré aucun blocage." : "Les corrections arrivent avec le premier rapport."}</p>
          </div>
        )}
        {site.blockers.some((b) => b.state === "check") && edit && (
          <div className="tile mt-5 flex flex-wrap items-center justify-between gap-4 p-7!">
            <p className="max-w-[560px]">
              <span className="font-semibold">Tu as marqué des blocages comme corrigés.</span>{" "}
              <span className="text-ink-2">Relance l&apos;audit : l&apos;agent repasse et confirme si la correction tient.</span>
            </p>
            <RelaunchForm site={site} />
          </div>
        )}
        {site.verified.length > 0 && (
          <Group title="Corrections vérifiées" footer="Marquées corrigées, puis absentes de l'audit suivant.">
            {site.verified.map((t) => (
              <div key={t} className="flex min-h-[56px] items-center gap-3 border-b border-hairline px-5 last:border-0">
                <StatusGlyph tone="pass" className="h-4 w-4" />
                <span className="font-semibold">{blockerLabel(t)}</span>
              </div>
            ))}
          </Group>
        )}
      </section>

      {site.latest?.recommendations && (
        <section>
          <h2 className="type-headline mb-3 px-1">Plan de corrections de l&apos;IA</h2>
          <Recommendations text={site.latest.recommendations} />
        </section>
      )}

      {c && s && (
        <Link href={`/audit/${c.id}`} className="tile group block hover:bg-tile/80">
          <h2 className="type-headline">Face au concurrent</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {(
              [
                [site.domain, s, true],
                [c.sites?.domain ?? "Concurrent", c.s, false],
              ] as const
            ).map(([name, x, self]) => (
              <div key={name} className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`truncate ${self ? "font-semibold" : "text-ink-2"}`}>{name}</span>
                  <span className="text-[21px] font-semibold tnum">{x.score ?? "—"} %</span>
                </div>
                <MissionBar ok={x.ok} done={x.done} total={x.total} />
              </div>
            ))}
          </div>
        </Link>
      )}

      <Group title="Audits de ce site">
        {site.audits.map((a) => (
          <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
            <div className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_5.5rem_1rem]">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{shortDate(a.created_at)}</span>
                <span className="type-small text-ink-2">{a.users?.email ?? "—"}</span>
              </span>
              <span className="hidden sm:block">
                <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
              </span>
              <span className="flex items-center justify-end gap-2 whitespace-nowrap font-semibold tnum">
                {a.status === "done" ? (
                  <>
                    <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                    {a.s.score ?? "—"} %
                  </>
                ) : (
                  <span className="type-small flex items-center gap-2 font-normal text-ink-2">
                    <Spinner className="h-3.5 w-3.5" />
                    {a.s.finished} sur {a.s.total}
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
