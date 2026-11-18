import { staffUser, teamContext } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DEFAULT_MODEL, EXCLUDED, PAYMENT_STAGES, PAYMENT_VERDICTS, db } from "@/lib/engine";
import { BrowserFrame, Chevron, MissionBar, Recommendations, Spinner, StatusBadge, ToneLabel, Verdict, blockerLabel, summarize } from "@/lib/ui";
import { headers } from "next/headers";
import { CopyField } from "@/app/espace/controls";
import { Mark, StatusGlyph, scoreTone, toneWord } from "@/lib/ui";
import { AutoRefresh, PrintButton } from "./refresh";

const RUN_FIELDS =
  "id, status, payment_verdict, with_login, session_id, success, reached_checkout, blocker_type, blocker_detail, screenshot_url, final_url, steps, duration_s, cost_usd, judge, agent_answer, attempts, first_attempt, missions(title, position)";

// Average duration and agent cost per finished mission: what a model comparison is about.
function perMission(runs: any[]) {
  const d = runs.filter((r) => r.status === "done" && r.duration_s);
  return d.length ? { s: Math.round(d.reduce((t, r) => t + r.duration_s, 0) / d.length), usd: d.reduce((t, r) => t + Number(r.cost_usd ?? 0), 0) / d.length } : null;
}

// What the score covers, from the report's own data: shown next to the score so 100 % is never read as more than it is.
function scopeText(runs: any[], s: ReturnType<typeof summarize>, device: string, paymentTested: boolean) {
  const n = (k: number, w: string) => `${k} ${w}${k > 1 && !w.endsWith("s") ? "s" : ""}`;
  const excluded = runs.filter((r) => r.status === "done" && r.success === false && EXCLUDED.includes(r.blocker_type));
  const reasons = [...new Set(excluded.map((r) => blockerLabel(r.blocker_type).toLowerCase()))].join(", ");
  return [
    s.done
      ? `Score calculé sur ${n(s.done, "parcours")} sur ${device === "mobile" ? "mobile" : "ordinateur"}, de l'accueil jusqu'à l'entrée du checkout.`
      : `Aucun parcours compté sur ${device === "mobile" ? "mobile" : "ordinateur"} : pas de score pour ce site avant un nouvel audit.`,
    excluded.length ? `${n(excluded.length, "mission")} exclue${excluded.length > 1 ? "s" : ""} du score (${reasons}).` : "",
    s.unverified ? `${n(s.unverified, "mission")} non vérifiée${s.unverified > 1 ? "s" : ""}, hors score.` : "",
    s.errors ? `${n(s.errors, "mission")} non jouée${s.errors > 1 ? "s" : ""} (erreur technique).` : "",
    paymentTested ? "Paiement testé à part, voir plus bas." : "Paiement non testé.",
  ].filter(Boolean).join(" ");
}

// Mission conclusion in French, built from the verdict (not the agent's free text, which may be in English).
function conclusion(r: any) {
  if (r.success === null) return "Résultat non vérifié par le juge visuel : mission hors score.";
  if (!r.success && EXCLUDED.includes(r.blocker_type)) return "Mission hors score : ce résultat ne compte ni pour ni contre le site.";
  if (!r.success) return "L'agent n'atteint pas l'entrée du checkout.";
  const login = /login|connexion|signin|sign-in|account|compte/i.test(r.final_url ?? "") || /connect|inscri|compte/i.test(r.judge?.reason ?? "");
  return login ? "Entrée du checkout atteinte : page de connexion ou d'inscription." : "Entrée du checkout atteinte.";
}

const longDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const TONE_TEXT = { pass: "text-pass", warn: "text-warn", fail: "text-fail", none: "text-ink-2" } as const;

// PDF only: running footer on every page but the cover (Chrome draws @page margin boxes).
function PrintPage({ left }: { left: string }) {
  const safe = JSON.stringify(left.replace(/[<>\\"]/g, ""));
  const box = "font: 500 7.5pt -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; color: #86868b;";
  return (
    <style>{`@page { size: A4; margin: 16mm 15mm 18mm; @bottom-left { content: ${safe}; ${box} } @bottom-right { content: counter(page) " / " counter(pages); ${box} } }
@page :first { margin: 0; @bottom-left { content: none } @bottom-right { content: none } }`}</style>
  );
}

// PDF only: the cover. One verdict a reader gets in five seconds: who, when, the score, what blocks first.
function PrintCover(p: {
  site: { name: string; url: string; domain: string };
  date: string;
  device: string;
  model: string | null;
  s: ReturnType<typeof summarize>;
  cost: number;
  alert: { from: number; to: number } | null;
  brand: { brand_name: string | null; brand_logo: string | null } | null;
  reportUrl: string;
  scope: string;
}) {
  const { s } = p;
  const tone = scoreTone(s.score);
  const top = s.blockers[0];
  return (
    <section className="hidden print:flex print-cover flex-col justify-between bg-bg p-[18mm] text-ink">
      <header className="flex items-center justify-between">
        {p.brand?.brand_name ? (
          <span className="flex items-center gap-3 text-[15pt] font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.brand.brand_logo && <img src={p.brand.brand_logo} alt="" className="h-9 w-auto max-w-[45mm] object-contain" />}
            {p.brand.brand_name}
          </span>
        ) : (
          <span className="flex items-center gap-2.5 text-[15pt] font-semibold tracking-[0.011em]">
            <Mark className="h-7 w-7" />
            AgentProof
          </span>
        )}
        <span className="text-right text-[9pt] leading-snug text-ink-2">
          Audit d&apos;achat par agent IA
          <br />
          {p.date}
        </span>
      </header>

      <div>
        <h1 className="text-[40pt] font-semibold leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">{p.site.name}</h1>
        <p className="mt-2 text-[13pt] text-link">{p.site.domain}</p>

        <div className="mt-[14mm] flex items-end justify-between gap-8 border-t-[1.5pt] border-ink pt-[6mm]">
          <p className="text-[96pt] font-semibold leading-[0.85] tracking-[-0.03em] tnum">
            {s.score ?? "—"}
            <span className="ml-1 text-[36pt] text-ink-2">%</span>
          </p>
          <p className={`flex items-center gap-2 pb-2 text-[15pt] font-semibold ${TONE_TEXT[tone]}`}>
            <StatusGlyph tone={tone} className="h-[15pt] w-[15pt]" />
            {toneWord[tone]}
          </p>
        </div>
        <div className="mt-[6mm]">
          <MissionBar ok={s.ok} done={s.done} total={s.total} size="lg" />
        </div>
        <p className="mt-[5mm] max-w-[150mm] text-[13pt] leading-snug">
          L&apos;agent atteint la première page du checkout dans <strong>{s.ok} mission{s.ok > 1 ? "s" : ""} sur {s.done}</strong> comptée{s.done > 1 ? "s" : ""}.
          {s.excluded + s.unverified > 0 && <span className="text-ink-2"> {s.excluded + s.unverified} hors score.</span>}
        </p>
        <p className="mt-[3mm] max-w-[150mm] text-[10.5pt] leading-snug text-ink-2">{p.scope}</p>
        {p.alert && (
          <p className="mt-[3mm] text-[11pt] font-semibold text-fail">
            En baisse : {p.alert.from} % au précédent audit, {p.alert.to} % aujourd&apos;hui.
          </p>
        )}

        <dl className="mt-[12mm] grid grid-cols-3 border-t border-line text-[9.5pt]">
          {(
            [
              ["Premier blocage", top ? `${blockerLabel(top[0])} · ${top[1]} mission${top[1] > 1 ? "s" : ""}` : "Aucun"],
              ["Parcours testé", `${p.device === "mobile" ? "Mobile" : "Ordinateur"} · ${p.model ?? DEFAULT_MODEL}`],
              ["Coût de l'agent", `${p.cost.toFixed(2)} $ pour ${s.total} missions`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="border-r border-line py-[4mm] pr-[4mm] last:border-0 [&:not(:first-child)]:pl-[4mm]">
              <dt className="text-ink-2">{k}</dt>
              <dd className="mt-1 font-semibold leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="grid gap-[4mm] border-t border-line pt-[5mm] text-[8.5pt] leading-relaxed text-ink-2">
        <p className="max-w-[150mm]">
          Un agent IA computer-use (Holo, H Company) joue des missions d&apos;achat réelles sur le site, comme un client, et s&apos;arrête au premier écran du checkout : il ne paie
          jamais, ne saisit aucune donnée personnelle et ne résout aucun captcha. Un juge visuel (Hugging Face) vérifie chaque dernière capture sans connaître l&apos;avis de
          l&apos;agent.
        </p>
        <p>
          Rapport en ligne, avec le replay étape par étape de chaque mission :
          <br />
          <span className="font-semibold text-ink">{p.reportUrl.replace(/^https?:\/\//, "")}</span>
        </p>
      </footer>
    </section>
  );
}

// Report section heading: one size for every section, a one-line purpose under it, an optional figure on the trailing side.
function SectionHead({ title, intro, aside }: { title: string; intro?: string; aside?: React.ReactNode }) {
  return (
    <div className="section-head mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
      <div className="min-w-0 max-w-[680px]">
        <h2 className="type-h3">{title}</h2>
        {intro && <p className="mt-2 text-ink-2">{intro}</p>}
      </div>
      {aside}
    </div>
  );
}

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
  // One run without account, plus one signed in when the team saved a test account for the site.
  const pays: any[] = inTeam && audit.payment_test ? [...((await loadAudit(audit.payment_test))?.runs ?? [])].sort((a: any, b: any) => +a.with_login - +b.with_login) : [];
  const competitor = audit.compare_to ? await loadAudit(audit.compare_to) : null;
  // Agency white label: their name and logo replace AgentProof's on this report.
  const { data: brand } = audit.team_id ? await db.from("teams").select("brand_name, brand_logo").eq("id", audit.team_id).maybeSingle() : { data: null };
  const branded = !!brand?.brand_name;
  const h = await headers();
  const base = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const statik = audit.static_check as { items?: { key: string; label: string; tone: "pass" | "warn" | "fail" | "none"; detail: string }[] } | null;
  const alert = audit.score_alert as { from: number; to: number; previous: string } | null;

  const runs = [...audit.runs].sort((a: any, b: any) => a.missions.position - b.missions.position);
  const s = summarize(runs);
  const c = competitor ? summarize(competitor.runs) : null;
  const running = audit.status === "running" || competitor?.status === "running" || pays.some((p) => p.status !== "done");
  const cost = runs.reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0);
  const maxBlock = s.blockers[0]?.[1] ?? 1;
  const aside = s.excluded + s.unverified + s.errors;
  const scope = scopeText(runs, s, audit.device, pays.some((p) => p.status === "done"));

  const paymentOnly = runs.length === 0 && pays.length > 0;
  // A linked audit of the same site is a model comparison, not a competitor.
  const modelCompare = !!competitor && competitor.site_id === audit.site_id;
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10 print:bg-bg print:p-0">
      {running && <AutoRefresh />}
      {branded && <style>{"body > header, body > footer { display: none; }"}</style>}
      {!paymentOnly && (
        <>
          <PrintPage left={`${branded ? brand!.brand_name : "AgentProof"} · ${audit.sites.domain} · ${longDate(audit.created_at)}`} />
          <PrintCover
            site={audit.sites}
            date={longDate(audit.created_at)}
            device={audit.device}
            model={audit.model}
            s={s}
            cost={cost}
            alert={alert}
            brand={branded ? brand : null}
            reportUrl={`${base}/audit/${audit.id}`}
            scope={scope}
          />
        </>
      )}
      <div className="wrap-wide space-y-16 max-[734px]:space-y-12 print:space-y-[9mm]">
        <header className={paymentOnly ? undefined : "print:hidden"}>
          {branded && (
            <p className="mb-10 flex items-center gap-3 type-headline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {brand!.brand_logo && <img src={brand!.brand_logo} alt="" className="h-10 w-auto max-w-[160px] object-contain" />}
              <span>Rapport préparé par {brand!.brand_name}</span>
            </p>
          )}
          <p className="type-eyebrow text-ink-2">{paymentOnly ? "Test de paiement" : "Rapport d\u2019audit"} · {audit.device === "mobile" ? "Mobile" : "Ordinateur"}
            {audit.model && ` · Modèle ${audit.model}`}
          </p>
          <h1 className="type-h1 mt-3 break-words">{audit.sites.name}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <a href={audit.sites.url} className="text-link hover:underline" target="_blank" rel="noreferrer">
              {audit.sites.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
            <span aria-hidden>·</span>
            <time dateTime={audit.created_at}>
              {new Date(audit.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}
            </time>
            {!running && !paymentOnly && <PrintButton />}
          </p>
          {alert && (
            <p className="mt-6 rounded-[12px] bg-tile px-4 py-3 type-small" role="alert">
              <span className="font-semibold text-fail">Le score baisse : {alert.from} % → {alert.to} %.</span>{" "}
              <Link href={`/audit/${alert.previous}`} className="text-link hover:underline">
                Voir l&apos;audit précédent
              </Link>
            </p>
          )}
          {running && !paymentOnly && (
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

        {/* 1. Verdict: the score, then either the comparison or every mission at a glance. */}
        {!paymentOnly && (
        <section className="grid gap-5 lg:grid-cols-[3fr_2fr] print:block" aria-label="Score">
          <div className="tile flex flex-col print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-headline">Score agent</h2>
              {s.score == null && audit.status === "done" ? <span className="type-small font-semibold text-ink-2">À confirmer</span> : <ToneLabel score={s.score} />}
            </div>
            <p className="mt-5 text-[96px] font-semibold leading-none tracking-[-0.015em] tnum max-[734px]:text-[72px]">
              {s.score ?? "—"}
              <span className="ml-1 text-[40px] font-semibold text-ink-2 max-[734px]:text-[32px]">%</span>
            </p>
            <p className="mt-3 text-ink-2">
              Entrée du checkout atteinte dans <span className="font-semibold text-ink tnum">{s.ok} mission{s.ok > 1 ? "s" : ""} sur {s.done}</span> comptée{s.done > 1 ? "s" : ""}.
            </p>
            <div className="mt-auto pt-8">
              <MissionBar ok={s.ok} done={s.done} total={s.total} size="lg" />
              <ul className="type-small mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2 tnum">
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pass" aria-hidden />
                  {s.ok} réussie{s.ok > 1 ? "s" : ""}
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-fail" aria-hidden />
                  {s.done - s.ok} bloquée{s.done - s.ok > 1 ? "s" : ""}
                </li>
                {aside > 0 && (
                  <li className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-fill shadow-[inset_0_0_0_1px_var(--line)]" aria-hidden />
                    {aside} hors score
                  </li>
                )}
              </ul>
              <p className="type-small mt-5 border-t border-hairline pt-4 text-ink-2">{scope}</p>
            </div>
          </div>

          {competitor && c ? (
            <Link href={`/audit/${competitor.id}`} className="tile group flex flex-col transition-colors duration-200 hover:bg-tile/80">
              <h2 className="type-headline">{modelCompare ? "Deux modèles, mêmes missions" : "Face au concurrent"}</h2>
              <div className="mt-8 space-y-6">
                {(
                  [
                    [modelCompare ? audit.model ?? DEFAULT_MODEL : audit.sites.name, s, true, perMission(runs)],
                    [modelCompare ? competitor.model ?? DEFAULT_MODEL : competitor.sites.name, c, false, perMission(competitor.runs)],
                  ] as const
                ).map(([name, x, self, pm]) => (
                  <div key={name} className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`truncate ${self ? "font-semibold" : "text-ink-2"}`}>{name}</span>
                      <span className="text-[21px] font-semibold tnum">{x.score ?? "—"} %</span>
                    </div>
                    <MissionBar ok={x.ok} done={x.done} total={x.total} />
                    {modelCompare && pm && (
                      <p className="type-small text-ink-2 tnum">
                        {pm.s} s · {pm.usd.toFixed(3)} $ par mission
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <span className="more mt-auto pt-6 group-hover:underline">
                {modelCompare ? `Rapport ${competitor.model ?? DEFAULT_MODEL}` : `Rapport de ${competitor.sites.name}`}
              </span>
            </Link>
          ) : (
            <nav className="tile flex flex-col p-0! print:hidden" aria-label="Missions en bref">
              <h2 className="type-headline px-7 pt-7 pb-3 max-[734px]:px-6">Missions en bref</h2>
              <ol>
                {runs.map((r: any, i: number) => (
                  <li key={r.id} className="border-t border-hairline first:border-0">
                    <a href={`#mission-${i + 1}`} className="flex min-h-[52px] items-center gap-3 px-7 py-2.5 transition-colors hover:bg-bg-2/70 max-[734px]:px-6 dark:hover:bg-white/5">
                      <span className="w-4 shrink-0 type-small text-ink-2 tnum">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{r.missions.title}</span>
                      <span className="type-small shrink-0">
                        <StatusBadge run={r} />
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <Link href="/classement" className="more mt-auto border-t border-hairline px-7 max-[734px]:px-6">
                Comparer au classement
              </Link>
            </nav>
          )}
        </section>
        )}

        {pays.map((pay) => (
          <section key={pay.id} className="tile">
            <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-ink-2">
                Test de paiement réel{pays.length > 1 || pay.with_login ? (pay.with_login ? " · connecté avec le compte de test" : " · sans compte") : ""}
              </span>
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
              <p className="mt-3 text-ink-2">L&apos;agent part au plus près du checkout, prend le premier article disponible et paie une fois. Garde ton téléphone à portée pour valider le 3D Secure.</p>
            )}
          </section>
        ))}

        {/* 2. Diagnosis: what blocks, then what to fix. */}
        {s.blockers.length > 0 && (
          <section>
            <SectionHead title="Ce qui arrête l'agent." intro="Blocages relevés pendant les missions, du plus fréquent au moins fréquent. Ceux marqués hors score ne comptent ni pour ni contre le site." />
            <ol className="overflow-hidden rounded-[18px] bg-tile">
              {s.blockers.slice(0, 3).map(([b, n]) => {
                const out = EXCLUDED.includes(b);
                return (
                  <li key={b} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2.5 border-b border-hairline px-6 py-4 last:border-0 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_7.5rem]">
                    <span className="min-w-0">
                      <span className="font-semibold">{blockerLabel(b)}</span>
                      {out && <span className="type-small ml-2 whitespace-nowrap text-ink-2">Hors score</span>}
                    </span>
                    <span className="col-span-2 row-start-2 block h-1.5 overflow-hidden rounded-full bg-fill md:col-span-1 md:row-start-auto" aria-hidden>
                      <span className={`block h-full rounded-full ${out ? "bg-ink-2/50" : "bg-fail"}`} style={{ width: `${(100 * n) / maxBlock}%` }} />
                    </span>
                    <span className="type-small text-right text-ink-2 tnum md:row-start-auto">
                      {n} mission{n > 1 ? "s" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {audit.recommendations && (
          <section>
            <SectionHead title="Plan de corrections." />
            <Recommendations text={audit.recommendations} />
            <p className="type-caption mt-4 max-w-[680px] text-ink-2">Les constats viennent des verdicts des missions ci-dessous. Les hypothèses et corrections sont générées par IA (modèle open source sur Hugging Face) : à vérifier avant d&apos;agir.</p>
          </section>
        )}

        {/* 3. Evidence: every mission with its last screen. */}
        {!paymentOnly && (
        <section className="print-new-page">
          <SectionHead
            title="Missions."
            intro="Chaque mission part de l'accueil du site et s'arrête à l'entrée du checkout. La capture montre le dernier écran vu par l'agent."
            aside={cost > 0 && <span className="type-small text-ink-2 tnum">Coût agent : {cost.toFixed(2)} $</span>}
          />
          <div className="space-y-4">
            {runs.map((r: any, i: number) => (
              <article key={r.id} id={`mission-${i + 1}`} className="tile grid scroll-mt-24 gap-x-10 gap-y-6 p-8! md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] max-[734px]:p-6!">
                <div className="flex min-w-0 flex-col">
                  <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-ink-2 tnum">Mission {i + 1}</span>
                    <StatusBadge run={r} />
                  </div>
                  <h3 className="type-h3 mt-2">{r.missions.title}</h3>
                  {r.status === "done" && (
                    <div className="mt-4">
                      {!r.success && r.success !== null && <p className="font-semibold">{blockerLabel(r.blocker_type)}</p>}
                      <p className="text-ink-2">{conclusion(r)}</p>
                    </div>
                  )}
                  {r.status === "done" && r.reached_checkout && !r.success && r.judge?.reason && (
                    <p className="type-small mt-4 rounded-[12px] bg-bg-2 px-4 py-3 dark:bg-[#2c2c2e]">
                      <span className="font-semibold text-warn">Juge visuel. </span>
                      {r.judge.reason}
                    </p>
                  )}
                  {r.first_attempt && (
                    <p className="type-small mt-4 border-l-2 border-line pl-3 text-ink-2">
                      Mission rejouée : le premier essai a échoué ({r.first_attempt.blocker_type ? blockerLabel(r.first_attempt.blocker_type) : "erreur technique"}).
                      {r.status === "done" && r.success !== null && !(r.success === false && EXCLUDED.includes(r.blocker_type)) && (r.success ? " Le second a réussi : l’échec n’était pas reproductible." : " Le second confirme l’échec.")}
                      {r.first_attempt.session_id && (
                        <>
                          {" "}
                          <Link href={`/replay/${r.id}?a=${audit.id}&essai=1`} className="no-print text-link hover:underline">
                            Voir le premier essai
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  {r.status === "done" && (r.blocker_detail || r.agent_answer?.steps_summary) && (
                    <details className="type-small group mt-4 text-ink-2">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-link [&::-webkit-details-marker]:hidden">
                        <Chevron className="h-2.5 w-2.5 transition-transform duration-200 group-open:rotate-90" />
                        Réponse originale de l&apos;agent
                      </summary>
                      {r.blocker_detail && <p className="mt-2">{r.blocker_detail}</p>}
                      {r.agent_answer?.steps_summary && r.agent_answer.steps_summary !== r.blocker_detail && <p className="mt-2">{r.agent_answer.steps_summary}</p>}
                    </details>
                  )}
                  {r.status === "launched" && r.session_id && (
                    <div className="mt-auto pt-6">
                      <Link href={`/replay/${r.id}?a=${audit.id}`} className="no-print btn min-h-[40px] gap-2 px-[18px] text-[15px]">
                        <span className="relative flex h-2 w-2" aria-hidden>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70 motion-reduce:hidden" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        Regarder l&apos;agent en direct
                      </Link>
                    </div>
                  )}
                  {r.status === "done" && (
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-6">
                      <dl className="flex gap-6 tnum">
                        {(
                          [
                            ["Étapes", r.steps ?? "?"],
                            ["Durée", r.duration_s ? `${Math.round(r.duration_s)} s` : "?"],
                            ...(r.cost_usd != null ? [["Coût", `${Number(r.cost_usd).toFixed(3)} $`]] : []),
                          ] as [string, string | number][]
                        ).map(([k, v]) => (
                          <div key={k}>
                            <dt className="type-caption text-ink-2">{k}</dt>
                            <dd className="type-small font-semibold">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <Link href={`/replay/${r.id}?a=${audit.id}`} className="no-print btn btn-dark min-h-[40px] px-[18px] text-[15px]">
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
                          <path d="M2.5 1.3v9.4L10.6 6z" />
                        </svg>
                        Voir le replay
                      </Link>
                    </div>
                  )}
                </div>
                {r.screenshot_url ? (
                  <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block self-start rounded-[12px]" aria-label={`Ouvrir la capture : ${r.missions.title}`}>
                    <BrowserFrame url={r.final_url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.screenshot_url} alt={`Dernier écran vu par l'agent : ${r.missions.title}`} className="block w-full" />
                      {r.status === "done" && r.success !== null && (
                        <Verdict success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type)} className="no-print absolute bottom-3 left-3" />
                      )}
                    </BrowserFrame>
                  </a>
                ) : (
                  <div className="type-small grid aspect-[16/10] place-items-center self-start rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">
                    {r.status === "done" ? "Pas de capture" : "Capture à venir"}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
        )}

        {/* 4. Context: the free static reading, which never counts in the score. */}
        {!paymentOnly && (statik?.items || (running && audit.kind === "checkout")) && (
          <section>
            <SectionHead
              title="Ce que lit un robot, sans navigateur."
              intro="Lecture gratuite du code du site, comme les outils qui notent un site sans le tester. Elle complète l'agent, elle ne compte pas dans le score."
              aside={statik?.items && <span className="type-small text-ink-2 tnum">{statik.items.filter((it) => it.tone === "pass").length} sur {statik.items.filter((it) => it.tone !== "none").length} au vert</span>}
            />
            {statik?.items ? (
              <div className="overflow-hidden rounded-[18px] bg-tile">
              <ul className="-mb-px grid lg:grid-cols-2">
                {statik.items.map((it) => (
                  <li key={it.key} className="flex items-start gap-3 border-b border-hairline px-6 py-4 lg:odd:border-r">
                    <StatusGlyph tone={it.tone} className="mt-0.5 h-5 w-5" />
                    <span className="min-w-0">
                      <span className="font-semibold">{it.label}</span>
                      <span className="type-small block text-ink-2">{it.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              </div>
            ) : (
              <p className="type-small flex items-center gap-2 text-ink-2">
                <Spinner className="h-3.5 w-3.5" /> Lecture en cours…
              </p>
            )}
          </section>
        )}

        {!paymentOnly && audit.status === "done" && s.score != null && (
          <section className="no-print tile grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badge/${audit.id}.svg`} alt={`Badge AgentProof : ${s.score} %`} height={28} className="h-7 w-auto" />
            <div className="min-w-0">
              <h2 className="type-headline">Badge à afficher sur ton site.</h2>
              <p className="type-small mt-1 text-ink-2">Il affiche le score de cet audit et renvoie vers ce rapport.</p>
              <div className="mt-4">
                <CopyField
                  label="Code HTML du badge"
                  value={`<a href="${base}/audit/${audit.id}"><img src="${base}/badge/${audit.id}.svg" alt="Score AgentProof : ${s.score} %" height="28"></a>`}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
