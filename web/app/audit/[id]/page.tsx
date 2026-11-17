import { staffUser, teamContext } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PAYMENT_STAGES, PAYMENT_VERDICTS, db } from "@/lib/engine";
import { BrowserFrame, MissionBar, Recommendations, Spinner, StatusBadge, ToneLabel, Verdict, blockerLabel, summarize } from "@/lib/ui";
import { AutoRefresh } from "./refresh";

const RUN_FIELDS =
  "id, status, payment_verdict, session_id, success, reached_checkout, blocker_type, blocker_detail, screenshot_url, final_url, steps, duration_s, cost_usd, judge, agent_answer, missions(title, position)";

async function loadAudit(id: string) {
  const { data } = await db.from("audits").select(`*, sites(domain, name, url), runs(${RUN_FIELDS})`).eq("id", id).maybeSingle();
  return data;
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const audit = await loadAudit(id);
  if (!audit) notFound();
  // Real payment tests: only the team that ran them, or AgentProof staff.
  const ctx = audit.kind === "payment" || audit.payment_test ? await teamContext() : null;
  const inTeam = !!audit.team_id && !!ctx?.teams.some((t) => t.id === audit.team_id);
  if (audit.kind === "payment" && !inTeam && !(await staffUser()).isStaff) notFound();
  const pay = inTeam && audit.payment_test ? (await loadAudit(audit.payment_test))?.runs[0] : null;
  const competitor = audit.compare_to ? await loadAudit(audit.compare_to) : null;

  const runs = [...audit.runs].sort((a: any, b: any) => a.missions.position - b.missions.position);
  const s = summarize(runs);
  const c = competitor ? summarize(competitor.runs) : null;
  const running = audit.status === "running" || competitor?.status === "running" || (pay && pay.status !== "done");
  const cost = runs.reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0);
  const maxBlock = s.blockers[0]?.[1] ?? 1;
  const aside = s.excluded + s.unverified + s.errors;

  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      {running && <AutoRefresh />}
      <div className="wrap-wide space-y-20 max-[734px]:space-y-14">
        <header>
          <p className="type-eyebrow text-ink-2">Rapport d&apos;audit · {audit.device === "mobile" ? "Mobile" : "Ordinateur"}</p>
          <h1 className="type-h1 mt-3 break-words">{audit.sites.name}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <a href={audit.sites.url} className="text-link hover:underline" target="_blank" rel="noreferrer">
              {audit.sites.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
            <span aria-hidden>·</span>
            <time dateTime={audit.created_at}>
              {new Date(audit.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}
            </time>
          </p>
          {running && (
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-tile px-4 py-2 type-small" role="status">
              <Spinner className="h-3.5 w-3.5 text-ink-2" />
              <span>
                <span className="font-semibold">
                  {s.finished} missions terminées sur {s.total}.
                </span>{" "}
                <span className="text-ink-2">La page se met à jour toute seule.</span>
              </span>
            </p>
          )}
        </header>

        {/* Verdict */}
        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]" aria-label="Score">
          <div className="tile">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-headline">Score agent</h2>
              <ToneLabel score={s.score} />
            </div>
            <p className="mt-6 text-[96px] font-semibold leading-none tracking-[-0.015em] tnum max-[734px]:text-[72px]">
              {s.score ?? "—"}
              <span className="ml-1 text-[40px] font-semibold text-ink-2 max-[734px]:text-[32px]">%</span>
            </p>
            <div className="mt-8">
              <MissionBar ok={s.ok} done={s.done} total={s.total} size="lg" />
              <ul className="type-small mt-4 flex flex-wrap gap-x-6 gap-y-1 text-ink-2">
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-pass" aria-hidden />
                  {s.ok} réussie{s.ok > 1 ? "s" : ""}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-fail" aria-hidden />
                  {s.done - s.ok} bloquée{s.done - s.ok > 1 ? "s" : ""}
                </li>
                {aside > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-fill" aria-hidden />
                    {aside} hors score
                  </li>
                )}
              </ul>
            </div>
          </div>

          {competitor && c ? (
            <Link href={`/audit/${competitor.id}`} className="tile group flex flex-col transition-colors duration-200 hover:bg-tile/80">
              <h2 className="type-headline">Face au concurrent</h2>
              <div className="mt-8 space-y-6">
                {(
                  [
                    [audit.sites.name, s, true],
                    [competitor.sites.name, c, false],
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
              <span className="more mt-auto pt-6 group-hover:underline">Rapport de {competitor.sites.name}</span>
            </Link>
          ) : (
            <div className="tile flex flex-col justify-center">
              <h2 className="type-headline">Pas de concurrent dans cet audit.</h2>
              <p className="mt-2 text-ink-2">Compare ce score avec les autres sites mode.</p>
              <Link href="/classement" className="more mt-2">
                Voir le classement
              </Link>
            </div>
          )}
        </section>

        {pay && (
          <section className="tile">
            <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-ink-2">Test de paiement réel</span>
              <StatusBadge run={pay} />
            </div>
            {pay.status === "done" ? (
              <>
                <p className={`type-h3 mt-3 ${["bank_declined", "payment_accepted"].includes(pay.payment_verdict) ? "text-pass" : ["inconclusive", "three_ds_timeout"].includes(pay.payment_verdict) ? "text-warn" : "text-fail"}`}>
                  {PAYMENT_VERDICTS[pay.payment_verdict] ?? pay.payment_verdict ?? "Pas de résultat"}
                </p>
                {pay.agent_answer?.site_message && <p className="mt-2 text-ink-2">Message du site : « {pay.agent_answer.site_message} »</p>}
                {pay.agent_answer?.furthest_stage && (
                  <p className="mt-2">
                    Étape la plus loin atteinte : <span className="font-semibold">{PAYMENT_STAGES[pay.agent_answer.furthest_stage] ?? pay.agent_answer.furthest_stage}</span>
                  </p>
                )}
                <p className="type-small mt-2 text-ink-2">
                  3D Secure : {pay.agent_answer?.three_ds_seen ? "demandé" : "non"} · Prestataire : {pay.agent_answer?.payment_provider || "?"} · Moyens :{" "}
                  {pay.agent_answer?.payment_methods || "?"}
                </p>
                {pay.judge?.result && pay.judge.result !== pay.payment_verdict && (
                  <p className="type-small mt-2 text-warn">
                    Juge visuel en désaccord : {PAYMENT_VERDICTS[pay.judge.result] ?? pay.judge.result}. {pay.judge.reason}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-ink-2">L&apos;agent achète l&apos;article le moins cher et paie une fois. Garde ton téléphone à portée pour valider le 3D Secure.</p>
            )}
          </section>
        )}

        {s.blockers.length > 0 && (
          <section>
            <h2 className="type-h2 mb-8">Ce qui arrête l&apos;agent.</h2>
            <ol className="overflow-hidden rounded-[18px] bg-tile">
              {s.blockers.slice(0, 3).map(([b, n]) => (
                <li key={b} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 border-b border-hairline px-6 py-5 last:border-0 sm:grid-cols-[minmax(0,16rem)_1fr_auto]">
                  <span className="type-headline">{blockerLabel(b)}</span>
                  <span className="col-span-2 row-start-2 block h-2 overflow-hidden rounded-full bg-fill sm:col-span-1 sm:row-start-auto" aria-hidden>
                    <span className="block h-full rounded-full bg-fail" style={{ width: `${(100 * n) / maxBlock}%` }} />
                  </span>
                  <span className="text-ink-2 tnum">
                    {n} mission{n > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {audit.recommendations && (
          <section>
            <h2 className="type-h2 mb-8">Plan de corrections.</h2>
            <Recommendations text={audit.recommendations} />
            <p className="type-caption mt-4 text-ink-2">Texte généré par IA (modèle open source sur Hugging Face) à partir des résultats ci-dessous. À vérifier avant d&apos;agir.</p>
          </section>
        )}

        <section>
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="type-h2">Missions.</h2>
            {cost > 0 && <span className="type-small text-ink-2 tnum">Coût agent : {cost.toFixed(2)} $</span>}
          </div>
          <div className="space-y-5">
            {runs.map((r: any, i: number) => (
              <article key={r.id} className="tile grid gap-8 md:grid-cols-[1fr_minmax(0,420px)]">
                <div className="flex flex-col">
                  <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-ink-2">Mission {i + 1}</span>
                    <StatusBadge run={r} />
                  </div>
                  <h3 className="type-h3 mt-3">{r.missions.title}</h3>
                  {r.status === "launched" && r.session_id && (
                    <div className="mt-auto pt-6">
                      <Link href={`/replay/${r.id}`} className="btn min-h-[40px] gap-2 px-[18px] text-[15px]">
                        <span className="relative flex h-2 w-2" aria-hidden>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70 motion-reduce:hidden" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        Regarder l&apos;agent en direct
                      </Link>
                    </div>
                  )}
                  {r.status === "done" && (
                    <>
                      {!r.success && r.success !== null && <p className="mt-4 font-semibold">{blockerLabel(r.blocker_type)}</p>}
                      {r.blocker_detail && <p className={`text-ink-2 ${r.success ? "mt-4" : "mt-1"}`}>{r.blocker_detail}</p>}
                      {r.reached_checkout && !r.success && r.judge?.reason && (
                        <p className="type-small mt-4 rounded-[12px] bg-bg-2 px-4 py-3 dark:bg-[#2c2c2e]">
                          <span className="font-semibold text-warn">Juge visuel. </span>
                          {r.judge.reason}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6">
                        <Link href={`/replay/${r.id}`} className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
                            <path d="M2.5 1.3v9.4L10.6 6z" />
                          </svg>
                          Voir le replay
                        </Link>
                        <span className="type-small text-ink-2 tnum">
                          {r.steps ?? "?"} étapes · {r.duration_s ? `${Math.round(r.duration_s)} s` : "?"}
                          {r.cost_usd != null && ` · ${Number(r.cost_usd).toFixed(3)} $`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {r.screenshot_url ? (
                  <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block rounded-[12px]" aria-label={`Ouvrir la capture : ${r.missions.title}`}>
                    <BrowserFrame url={r.final_url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.screenshot_url} alt={`Dernier écran vu par l'agent : ${r.missions.title}`} className="block w-full" loading="lazy" />
                      {r.status === "done" && r.success !== null && (
                        <Verdict success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type)} className="absolute bottom-3 left-3" />
                      )}
                    </BrowserFrame>
                  </a>
                ) : (
                  <div className="type-small grid aspect-[16/10] place-items-center rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">
                    {r.status === "done" ? "Pas de capture" : "Capture à venir"}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
