import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { BrowserFrame, Eyebrow, MissionDots, ScoreBar, SectionTitle, Stamp, StatusBadge, ToneLabel, blockerLabel, scoreColor, summarize } from "@/lib/ui";
import { AutoRefresh } from "./refresh";

const RUN_FIELDS =
  "id, status, success, reached_checkout, blocker_type, blocker_detail, screenshot_url, final_url, steps, duration_s, cost_usd, judge, agent_answer, missions(title, position)";

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
  const competitor = audit.compare_to ? await loadAudit(audit.compare_to) : null;

  const runs = [...audit.runs].sort((a: any, b: any) => a.missions.position - b.missions.position);
  const s = summarize(runs);
  const c = competitor ? summarize(competitor.runs) : null;
  const running = audit.status === "running" || competitor?.status === "running";
  const cost = runs.reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0);
  const maxBlock = s.blockers[0]?.[1] ?? 1;

  return (
    <div className="space-y-16">
      {running && <AutoRefresh />}

      <header className="space-y-3">
        <Eyebrow>
          Rapport d&apos;audit · {audit.device === "mobile" ? "Mobile" : "Ordinateur"}
        </Eyebrow>
        <h1 className="font-display text-[40px] font-semibold leading-none tracking-[-0.035em] sm:text-[56px]">{audit.sites.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-3">
          <a href={audit.sites.url} className="font-mono text-[14px] text-accent hover:underline" target="_blank" rel="noreferrer">
            {audit.sites.url.replace(/^https?:\/\//, "")}
          </a>
          <span aria-hidden>·</span>
          <time dateTime={audit.created_at}>
            {new Date(audit.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}
          </time>
        </p>
      </header>

      {running && (
        <div className="flex items-center gap-3 rounded-2xl bg-accent-soft px-5 py-4 text-[15px] text-accent" role="status">
          <span className="ap-spin h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent" aria-hidden />
          <span>
            <span className="font-semibold">Audit en cours : {s.done} missions terminées sur {s.total}.</span> La page se met à jour toute seule.
          </span>
        </div>
      )}

      {/* Verdict */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] border border-line bg-card p-7 shadow-card sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-[15px] font-semibold text-ink-2">Score agent</p>
            <ToneLabel score={s.score} />
          </div>
          <p className={`mt-3 font-display text-[88px] font-semibold leading-none tracking-[-0.05em] tnum sm:text-[112px] ${scoreColor(s.score)}`}>
            {s.score ?? "—"}
            <span className="text-[40px] tracking-normal sm:text-[48px]"> %</span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <MissionDots ok={s.ok} done={s.done} total={s.total} />
            <span className="text-[15px] text-ink-2">
              {s.ok} missions réussies sur {s.done} terminées{s.total > s.done && ` (${s.total} prévues)`}
            </span>
          </div>
        </div>

        {competitor && c ? (
          <Link href={`/audit/${competitor.id}`} className="group rounded-[28px] border border-line bg-card p-7 transition-colors hover:bg-card-2/50 sm:p-9">
            <p className="text-[15px] font-semibold text-ink-2">Face au concurrent</p>
            <div className="mt-6 space-y-5">
              {[
                [audit.sites.name, s.score, true],
                [competitor.sites.name, c.score, false],
              ].map(([name, score, self]) => (
                <div key={String(name)} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-[17px] ${self ? "font-semibold" : "text-ink-2"}`}>{name as string}</span>
                    <span className={`text-[20px] font-semibold tnum ${scoreColor(score as number | null)}`}>{(score as number | null) ?? "—"} %</span>
                  </div>
                  <ScoreBar score={score as number | null} className="h-2.5" />
                </div>
              ))}
            </div>
            <p className="mt-6 text-[15px] font-semibold text-accent group-hover:underline">Voir le rapport de {competitor.sites.name}</p>
          </Link>
        ) : (
          <div className="flex flex-col justify-center rounded-[28px] border border-dashed border-line p-7 sm:p-9">
            <p className="font-semibold">Pas de concurrent dans cet audit</p>
            <p className="mt-1 text-[15px] text-ink-2">Compare ce score avec les autres sites mode.</p>
            <Link href="/classement" className="mt-4 inline-flex h-11 w-fit items-center rounded-full border border-line bg-card px-5 text-[15px] font-semibold transition-colors hover:bg-card-2">
              Voir le classement
            </Link>
          </div>
        )}
      </section>

      {s.blockers.length > 0 && (
        <section>
          <SectionTitle>Ce qui arrête l&apos;agent</SectionTitle>
          <ol className="space-y-2">
            {s.blockers.slice(0, 3).map(([b, n], i) => (
              <li key={b} className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4">
                <span className="font-mono text-[14px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="space-y-2">
                  <span className="block text-[17px] font-semibold">{blockerLabel(b)}</span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-card-2" aria-hidden>
                    <span className="block h-full rounded-full bg-fail" style={{ width: `${(100 * n) / maxBlock}%` }} />
                  </span>
                </span>
                <span className="text-[15px] text-ink-2 tnum">
                  {n} mission{n > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {audit.recommendations && (
        <section>
          <SectionTitle>Plan de corrections</SectionTitle>
          <Recommendations text={audit.recommendations} />
        </section>
      )}

      <section>
        <SectionTitle aside={cost > 0 && <span className="text-[13px] text-ink-3 tnum">Coût agent : {cost.toFixed(2)} $</span>}>Missions</SectionTitle>
        <div className="space-y-4">
          {runs.map((r: any, i: number) => (
            <article key={r.id} className="grid gap-6 rounded-[24px] border border-line bg-card p-5 sm:p-6 md:grid-cols-[1fr_minmax(0,380px)]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[13px] text-ink-3">Mission {i + 1}</span>
                  <StatusBadge run={r} />
                </div>
                <h3 className="text-[20px] font-semibold tracking-[-0.01em]">{r.missions.title}</h3>
                {r.status === "done" && (
                  <>
                    {!r.success && (
                      <p className="text-[15px]">
                        <span className="text-ink-3">Blocage : </span>
                        <span className="font-semibold">{blockerLabel(r.blocker_type)}</span>
                      </p>
                    )}
                    {r.blocker_detail && <p className="text-[15px] leading-relaxed text-ink-2">{r.blocker_detail}</p>}
                    {r.reached_checkout && !r.success && r.judge?.reason && (
                      <p className="rounded-xl bg-warn-soft px-4 py-3 text-[14px] text-warn">
                        <span className="font-semibold">Juge visuel : </span>
                        {r.judge.reason}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                      <a
                        href={`/replay/${r.id}`}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-paper transition-opacity hover:opacity-85"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                          <path d="M4.5 2.8v10.4L13 8z" />
                        </svg>
                        Voir le replay
                      </a>
                      <span className="text-[13px] text-ink-3 tnum">
                        {r.steps ?? "?"} étapes · {r.duration_s ? `${Math.round(r.duration_s)} s` : "?"}
                        {r.cost_usd != null && ` · ${Number(r.cost_usd).toFixed(3)} $`}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {r.screenshot_url ? (
                <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block rounded-xl" aria-label={`Ouvrir la capture : ${r.missions.title}`}>
                  <BrowserFrame url={r.final_url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.screenshot_url} alt={`Dernier écran vu par l'agent : ${r.missions.title}`} className="block w-full" loading="lazy" />
                    {r.status === "done" && (
                      <span className="absolute bottom-3 right-3">
                        <Stamp success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type)} />
                      </span>
                    )}
                  </BrowserFrame>
                </a>
              ) : (
                <div className="grid aspect-[16/10] place-items-center rounded-xl border border-dashed border-line text-[14px] text-ink-3">
                  {r.status === "done" ? "Pas de capture" : "Capture à venir"}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// The LLM writes "1. Problème : … / Correction : …". Show each pair as a card; fall back to plain text.
function Recommendations({ text }: { text: string }) {
  const intro: string[] = [];
  const items: { problem: string; fix: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const p = line.match(/^\d+[.)]\s*(?:\*\*)?Probl[eè]me\s*(?:\*\*)?\s*:?\s*(.*)$/i);
    const f = line.match(/^(?:[-*]\s*)?(?:\*\*)?Correction\s*(?:\*\*)?\s*:?\s*(.*)$/i);
    if (p) items.push({ problem: p[1], fix: [] });
    else if (f && items.length) items[items.length - 1].fix.push(f[1]);
    else if (items.length) items[items.length - 1].fix.push(line);
    else intro.push(line);
  }
  if (!items.length) return <p className="whitespace-pre-line rounded-2xl border border-line bg-card p-6 leading-relaxed">{text}</p>;

  return (
    <div className="space-y-4">
      {intro.length > 0 && <p className="max-w-3xl text-[17px] leading-relaxed text-ink-2">{intro.join(" ")}</p>}
      <ol className="grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <li key={i} className="flex flex-col rounded-2xl border border-line bg-card p-6">
            <span className="font-mono text-[13px] text-ink-3">Correction {i + 1}</span>
            <p className="mt-3 text-[15px] leading-relaxed">
              <span className="font-semibold">Problème : </span>
              {it.problem}
            </p>
            {it.fix.length > 0 && (
              <p className="mt-4 rounded-xl bg-card-2 p-4 text-[15px] leading-relaxed text-ink">
                <span className="font-semibold">À faire : </span>
                {it.fix.join(" ")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
