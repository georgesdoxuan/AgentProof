import { staffUser, teamContext } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DEFAULT_MODEL, EXCLUDED, db, paymentStages, paymentVerdicts, scoreOf } from "@/lib/engine";
import { byRank } from "@/app/classement/board";
import { rankText } from "@/app/espace/parts";
import { locale, missionTitle, staticText, tr, type Lang, type T } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { BlockerIcon, BrowserFrame, MissionIcon, Chevron, DeviceTag, MissionBar, Recommendations, Spinner, StatusBadge, ToneLabel, Verdict, blockerLabel, hurdles, summarize } from "@/lib/ui";
import { headers } from "next/headers";
import { CopyField } from "@/app/espace/controls";
import { Mark, Wordmark, StatusGlyph, scoreTone, toneWords } from "@/lib/ui";
import { AutoRefresh, PrintButton } from "./refresh";
import type { AgentAccess } from "@/lib/automations";

// One line per AI assistant, from the static check's per-agent reading (lib/automations.ts agentAccess).
function accessText(a: AgentAccess, t: T) {
  const bots = a.robots.filter((r) => r !== "*").join(", ");
  if (a.robots.includes("*") && a.tone === "fail") return t("robots.txt interdit tout le site aux robots, et Grok ne publie pas de nom à part.", "robots.txt bans every bot from the whole site, and Grok publishes no name of its own.");
  if (a.tone === "fail" && a.http === null) return t(`robots.txt interdit tout le site à ${a.robots[0]}, le robot qui lit les pages pour un client en direct.`, `robots.txt bans ${a.robots[0]}, the bot that reads pages for a customer live, from the whole site.`);
  if (a.tone === "fail")
    return a.challenge
      ? t(`Le site lui oppose un défi anti-bot, alors qu'un navigateur passe.`, `The site answers it with an anti-bot challenge, while a browser gets through.`)
      : t(`Le site lui répond ${a.http || "rien"}, alors qu'il répond 200 à un navigateur.`, `The site answers it ${a.http || "nothing"}, while it answers 200 to a browser.`);
  if (a.tone === "warn") return t(`Accès possible, mais robots.txt interdit ${bots} : le site sort des réponses de ${a.name}.`, `Access works, but robots.txt bans ${bots}: the site drops out of ${a.name}'s answers.`);
  if (a.tone === "none") return t("Le site refuse toute requête sans navigateur : impossible d'isoler cet agent. L'agent AgentProof, lui, passe par un vrai navigateur.", "The site refuses every request without a browser: this agent can't be isolated. The AgentProof agent uses a real browser.");
  return a.ownUa
    ? t("robots.txt l'autorise et le site lui répond.", "robots.txt allows it and the site answers it.")
    : t("Il navigue avec Chrome, comme l'agent AgentProof : le résultat des missions vaut aussi pour lui.", "It browses with Chrome, like the AgentProof agent: the missions' result applies to it too.");
}
import { fixHints } from "@/lib/space";
import { SiteLogo } from "../../site-logo";

// Agent cost in the reader's format: "0,061 $" in French, "$0.061" in English.
const usd = (n: number, digits: number, lang: Lang) => (lang === "en" ? `$${n.toFixed(digits)}` : `${n.toFixed(digits).replace(".", ",")} $`);

const RUN_FIELDS =
  "id, status, payment_verdict, with_login, session_id, success, reached_checkout, blocker_type, blocker_detail, screenshot_url, final_url, steps, duration_s, cost_usd, judge, agent_answer, attempts, first_attempt, missions(title, position)";

// Average duration and agent cost per finished mission: what a model comparison is about.
function perMission(runs: any[]) {
  const d = runs.filter((r) => r.status === "done" && r.duration_s);
  return d.length ? { s: Math.round(d.reduce((t, r) => t + r.duration_s, 0) / d.length), usd: d.reduce((t, r) => t + Number(r.cost_usd ?? 0), 0) / d.length } : null;
}

// What the score covers, from the report's own data: shown next to the score so 100 % is never read as more than it is.
function scopeText(runs: any[], s: ReturnType<typeof summarize>, device: string, paymentTested: boolean, lang: Lang) {
  const n = (k: number, w: string) => `${k} ${w}${k > 1 && !w.endsWith("s") ? "s" : ""}`;
  const pl = (k: number) => (k > 1 ? "s" : "");
  const excluded = runs.filter((r) => r.status === "done" && r.success === false && EXCLUDED.includes(r.blocker_type));
  const reasons = [...new Set(excluded.map((r) => blockerLabel(r.blocker_type, lang).toLowerCase()))].join(", ");
  if (lang === "en")
    return [
      s.done
        ? `Score based on ${s.done} journey${pl(s.done)} on ${device === "mobile" ? "mobile" : "desktop"}, from the home page to the checkout entrance.`
        : `No journey counted on ${device === "mobile" ? "mobile" : "desktop"}: no score for this site until a new audit.`,
      s.done && s.done < 5 ? `Short sample: one result more or less moves the score by ${Math.round(100 / s.done)} points.` : "",
      excluded.length ? `${n(excluded.length, "mission")} excluded from the score (${reasons}).` : "",
      s.unverified ? `${n(s.unverified, "mission")} unverified, outside the score.` : "",
      s.errors ? `${n(s.errors, "mission")} not played (technical error).` : "",
      paymentTested ? "Payment tested separately, see below." : "Payment not tested.",
    ].filter(Boolean).join(" ");
  return [
    s.done
      ? `Score calculé sur ${n(s.done, "parcours")} sur ${device === "mobile" ? "mobile" : "ordinateur"}, de l'accueil jusqu'à l'entrée du checkout.`
      : `Aucun parcours compté sur ${device === "mobile" ? "mobile" : "ordinateur"} : pas de score pour ce site avant un nouvel audit.`,
    s.done && s.done < 5 ? `Échantillon court : un résultat de plus ou de moins déplace le score de ${Math.round(100 / s.done)} points.` : "",
    excluded.length ? `${n(excluded.length, "mission")} exclue${excluded.length > 1 ? "s" : ""} du score (${reasons}).` : "",
    s.unverified ? `${n(s.unverified, "mission")} non vérifiée${s.unverified > 1 ? "s" : ""}, hors score.` : "",
    s.errors ? `${n(s.errors, "mission")} non jouée${s.errors > 1 ? "s" : ""} (erreur technique).` : "",
    paymentTested ? "Paiement testé à part, voir plus bas." : "Paiement non testé.",
  ].filter(Boolean).join(" ");
}

// Mission conclusion in the reader's language, built from the verdict (not the agent's free text, which may be in English).
function conclusion(r: any, t: T) {
  if (r.success === null) return t("Résultat non vérifié par le juge visuel : mission hors score.", "Result not verified by the visual judge: mission outside the score.");
  if (!r.success && EXCLUDED.includes(r.blocker_type)) return t("Mission hors score : ce résultat ne compte ni pour ni contre le site.", "Mission outside the score: this result counts neither for nor against the site.");
  if (!r.success) return t("L'agent n'atteint pas l'entrée du checkout.", "The agent does not reach the checkout entrance.");
  const login = /login|connexion|signin|sign-in|account|compte/i.test(r.final_url ?? "") || /connect|inscri|compte/i.test(r.judge?.reason ?? "");
  return login
    ? t("Entrée du checkout atteinte : page de connexion ou d'inscription.", "Checkout entrance reached: sign-in or sign-up page.")
    : t("Entrée du checkout atteinte.", "Checkout entrance reached.");
}

// The agent sometimes files "only reservable in store" under button_unresponsive: say what it saw, not a broken button.
// Display only: the stored verdict and the score do not change.
const IN_STORE_ONLY = /r[ée]serv\S* en magasin|retrait en magasin|click\s*(&|and)\s*collect|(indisponible|pas disponible|non disponible) en ligne|reserve in store|not available online/i;
function missionBlocker(r: any, lang: Lang) {
  if (r.blocker_type === "button_unresponsive" && IN_STORE_ONLY.test(`${r.blocker_detail ?? ""} ${r.agent_answer?.steps_summary ?? ""} ${r.judge?.reason ?? ""}`))
    return lang === "en" ? "Online purchase unavailable (to check)" : "Achat en ligne indisponible (à vérifier)";
  return blockerLabel(r.blocker_type, lang);
}

const longDate = (d: string, lang: Lang) => new Date(d).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
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
  lang: Lang;
}) {
  const { s, lang } = p;
  const t = tr(lang);
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
          <span className="flex items-center gap-2.5 text-[15pt]">
            <Mark className="h-9 w-9" />
            <Wordmark />
          </span>
        )}
        <span className="text-right text-[9pt] leading-snug text-ink-2">
          {t("Audit d’achat par agent IA", "AI agent shopping audit")}
          <br />
          {p.date}
        </span>
      </header>

      <div>
        <h1 className="flex items-center gap-[5mm] text-[40pt] font-semibold leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">
          <SiteLogo domain={p.site.domain} name={p.site.name} size="lg" />
          {p.site.name}
        </h1>
        <p className="mt-2 text-[13pt] text-link">{p.site.domain}</p>

        <div className="mt-[14mm] flex items-end justify-between gap-8 border-t-[1.5pt] border-ink pt-[6mm]">
          <p className="text-[96pt] font-semibold leading-[0.85] tracking-[-0.03em] tnum">
            {s.score ?? "—"}
            <span className="ml-1 text-[36pt] text-ink-2">%</span>
          </p>
          <p className={`flex items-center gap-2 pb-2 text-[15pt] font-semibold ${TONE_TEXT[tone]}`}>
            <StatusGlyph tone={tone} className="h-[15pt] w-[15pt]" />
            {toneWords(lang)[tone]}
          </p>
        </div>
        <div className="mt-[6mm]">
          <MissionBar ok={s.ok} done={s.done} total={s.total} size="lg" />
        </div>
        <p className="mt-[5mm] max-w-[150mm] text-[13pt] leading-snug">
          {t(
            <>
              L&apos;agent atteint la première page du checkout dans <strong>{s.ok} mission{s.ok > 1 ? "s" : ""} sur {s.done}</strong> comptée{s.done > 1 ? "s" : ""}.
            </>,
            <>
              The agent reaches the first checkout page in <strong>{s.ok} of {s.done} mission{s.done > 1 ? "s" : ""}</strong> counted.
            </>,
          )}
          {s.excluded + s.unverified > 0 && <span className="text-ink-2"> {s.excluded + s.unverified} {t("hors score", "outside the score")}.</span>}
        </p>
        <p className="mt-[3mm] max-w-[150mm] text-[10.5pt] leading-snug text-ink-2">{p.scope}</p>
        {p.alert && (
          <p className="mt-[3mm] text-[11pt] font-semibold text-fail">
            {t(`En baisse : ${p.alert.from} % au précédent audit, ${p.alert.to} % aujourd’hui.`, `Down: ${p.alert.from} % at the previous audit, ${p.alert.to} % today.`)}
          </p>
        )}

        <dl className="mt-[12mm] grid grid-cols-3 border-t border-line text-[9.5pt]">
          {(
            [
              [t("Premier blocage", "First blocker"), top ? `${blockerLabel(top[0], lang)} · ${top[1]} mission${top[1] > 1 ? "s" : ""}` : t("Aucun", "None")],
              [t("Parcours testé", "Journey tested"), `${p.device === "mobile" ? "Mobile" : t("Ordinateur", "Desktop")} · ${p.model ?? DEFAULT_MODEL}`],
              [t("Coût de l'agent", "Agent cost"), `${usd(p.cost, 2, lang)} ${t("pour", "for")} ${s.total} missions`],
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
          {t(
            "Un agent IA computer-use (Holo, H Company) joue des missions d’achat réelles sur le site, comme un client, et s’arrête au premier écran du checkout : il ne paie jamais, ne saisit aucune donnée personnelle et ne résout aucun captcha. Un juge visuel (Hugging Face) vérifie chaque dernière capture sans connaître l’avis de l’agent.",
            "A computer-use AI agent (Holo, H Company) plays real shopping missions on the site, like a customer, and stops at the first checkout screen: it never pays, never enters personal data and never solves a captcha. A visual judge (Hugging Face) checks each final screenshot without knowing the agent's opinion.",
          )}
        </p>
        <p>
          {t("Rapport en ligne, avec le replay étape par étape de chaque mission :", "Online report, with a step-by-step replay of every mission:")}
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

// Where the site stands over time: its public rank on this device, and the score of the same team's previous audit.
// A subscriber's question each month is "better or worse than last time, and against whom".
async function trendOf(audit: any) {
  const [{ data: board }, prevQ] = await Promise.all([
    db.from("site_scores").select("domain, name, score, runs_scored").eq("device", audit.device),
    (audit.team_id ? db.from("audits").select("id, created_at, runs(status, success, blocker_type)").eq("team_id", audit.team_id) : db.from("audits").select("id, created_at, runs(status, success, blocker_type)").is("team_id", null))
      .eq("site_id", audit.site_id)
      .eq("device", audit.device)
      .eq("kind", "checkout")
      .eq("status", "done")
      .is("deleted_at", null)
      .or(`model.is.null,model.eq.${DEFAULT_MODEL}`)
      .lt("created_at", audit.created_at)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const ranked = (board ?? []).sort(byRank);
  const pos = ranked.findIndex((b) => b.domain === audit.sites.domain);
  const prev = (prevQ.data ?? []).map((a: any) => ({ id: a.id as string, at: a.created_at as string, score: scoreOf(a.runs) })).find((a) => a.score != null) ?? null;
  return { rank: pos >= 0 ? { pos: pos + 1, of: ranked.length } : null, prev };
}

async function loadAudit(id: string) {
  const { data } = await db.from("audits").select(`*, sites(domain, name, url), runs(${RUN_FIELDS})`).eq("id", id).maybeSingle();
  return data;
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const lang = await getLang();
  const t = tr(lang);
  const PAYMENT_VERDICTS = paymentVerdicts(lang);
  const PAYMENT_STAGES = paymentStages(lang);
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
  const statik = audit.static_check as { items?: { key: string; label: string; tone: "pass" | "warn" | "fail" | "none"; detail: string }[]; agents?: AgentAccess[] | null } | null;
  const protocols = (statik?.items ?? []).filter((it) => ["ucp", "acp", "webmcp"].includes(it.key));
  const alert = audit.score_alert as { from: number; to: number; previous: string } | null;
  const trend = audit.kind === "checkout" && audit.status === "done" ? await trendOf(audit) : null;

  const runs = [...audit.runs].sort((a: any, b: any) => a.missions.position - b.missions.position);
  const s = summarize(runs);
  const c = competitor ? summarize(competitor.runs) : null;
  const running = audit.status === "running" || competitor?.status === "running" || pays.some((p) => p.status !== "done");
  const cost = runs.reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0);
  const maxBlock = s.blockers[0]?.[1] ?? 1;
  const got = hurdles(runs, lang);
  const aside = s.excluded + s.unverified + s.errors;
  const scope = scopeText(runs, s, audit.device, pays.some((p) => p.status === "done"), lang);

  const paymentOnly = runs.length === 0 && pays.length > 0;
  // A linked audit of the same site is a model comparison, not a competitor.
  const modelCompare = !!competitor && competitor.site_id === audit.site_id;
  // A competitor sits next to the score; a model comparison is for the technical reader and goes after the fix plan.
  const compareCard = competitor && c ? (
            <Link href={`/audit/${competitor.id}`} className="tile group flex flex-col transition-colors duration-200 hover:bg-tile/80">
              <h2 className="type-headline">{modelCompare ? t("Deux modèles, mêmes missions", "Two models, same missions") : t("Face au concurrent", "Against the competitor")}</h2>
              <div className="mt-8 space-y-6">
                {(
                  [
                    [modelCompare ? audit.model ?? DEFAULT_MODEL : audit.sites.name, s, true, perMission(runs), modelCompare ? null : audit.sites.domain],
                    [modelCompare ? competitor.model ?? DEFAULT_MODEL : competitor.sites.name, c, false, perMission(competitor.runs), modelCompare ? null : competitor.sites.domain],
                  ] as const
                ).map(([name, x, self, pm, domain]) => (
                  <div key={name} className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`flex min-w-0 items-center gap-2.5 ${self ? "font-semibold" : "text-ink-2"}`}>
                        {domain && <SiteLogo domain={domain} name={name} size="sm" />}
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="text-[21px] font-semibold tnum">{x.score ?? "—"} %</span>
                    </div>
                    <MissionBar ok={x.ok} done={x.done} total={x.total} />
                    {modelCompare && pm && (
                      <p className="type-small text-ink-2 tnum">
                        {pm.s} s · {usd(pm.usd, 3, lang)} {t("par mission", "per mission")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <span className="more mt-auto pt-6 group-hover:underline">
                {modelCompare ? `${t("Rapport", "Report")} ${competitor.model ?? DEFAULT_MODEL}` : t(`Rapport de ${competitor.sites.name}`, `${competitor.sites.name} report`)}
              </span>
            </Link>
  ) : null;
  // The merchant's first question: what do I fix first? The most frequent counted blocker, its fix and its proof.
  const firstBlocker = s.blockers.find(([b]) => !EXCLUDED.includes(b));
  const firstRun = firstBlocker ? runs.find((r: any) => r.status === "done" && r.success === false && r.blocker_type === firstBlocker[0]) : null;
  const firstFix = firstBlocker ? fixHints(lang)[firstBlocker[0]] ?? fixHints(lang).other : null;
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10 print:bg-bg print:p-0">
      {running && <AutoRefresh />}
      {branded && <style>{"body > header, body > footer { display: none; }"}</style>}
      {!paymentOnly && (
        <>
          <PrintPage left={`${branded ? brand!.brand_name : "AgentProof"} · ${audit.sites.domain} · ${longDate(audit.created_at, lang)}`} />
          <PrintCover
            site={audit.sites}
            date={longDate(audit.created_at, lang)}
            device={audit.device}
            model={audit.model}
            s={s}
            cost={cost}
            alert={alert}
            brand={branded ? brand : null}
            reportUrl={`${base}/audit/${audit.id}`}
            scope={scope}
            lang={lang}
          />
        </>
      )}
      <div className="wrap-wide space-y-16 max-[734px]:space-y-12 print:space-y-[9mm]">
        <header className={paymentOnly ? undefined : "print:hidden"}>
          {branded && (
            <p className="mb-10 flex items-center gap-3 type-headline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {brand!.brand_logo && <img src={brand!.brand_logo} alt="" className="h-10 w-auto max-w-[160px] object-contain" />}
              <span>{t("Rapport préparé par", "Report prepared by")} {brand!.brand_name}</span>
            </p>
          )}
          <p className="type-eyebrow text-ink-2">{paymentOnly ? t("Test de paiement", "Payment test") : t("Rapport d\u2019audit", "Audit report")} · <DeviceTag device={audit.device} lang={lang} />
          </p>
          <h1 className="type-h1 mt-3 flex items-center gap-4 break-words">
            <SiteLogo domain={audit.sites.domain} name={audit.sites.name} size="lg" />
            <span className="min-w-0">{audit.title || audit.sites.name}</span>
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <a href={audit.sites.url} className="text-link hover:underline" target="_blank" rel="noreferrer">
              {audit.sites.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
            <span aria-hidden>·</span>
            <time dateTime={audit.created_at}>
              {new Date(audit.created_at).toLocaleString(locale(lang), { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}
            </time>
            {!running && !paymentOnly && <PrintButton label={t("Télécharger en PDF", "Download as PDF")} />}
          </p>
          {audit.deleted_at && (
            <p className="mt-6 rounded-[12px] bg-tile px-4 py-3 type-small print:hidden">
              {t("Ce rapport est dans la corbeille de l'équipe.", "This report is in the team's trash.")}{" "}
              <Link href="/espace/rapports/corbeille" className="text-link hover:underline">
                {t("Ouvrir la corbeille", "Open the trash")}
              </Link>
            </p>
          )}
          {alert && (
            <p className="mt-6 rounded-[12px] bg-tile px-4 py-3 type-small" role="alert">
              <span className="font-semibold text-fail">{t("Le score baisse", "The score drops")} : {alert.from} % → {alert.to} %.</span>{" "}
              <Link href={`/audit/${alert.previous}`} className="text-link hover:underline">
                {t("Voir l’audit précédent", "See the previous audit")}
              </Link>
            </p>
          )}
          {running && !paymentOnly && (
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-tile px-4 py-2 type-small" role="status">
              <Spinner className="h-3.5 w-3.5 text-ink-2" />
              <span>
                <span className="font-semibold">
                  {t(`${s.finished} missions terminées sur ${s.total}.`, `${s.finished} of ${s.total} missions finished.`)}
                </span>{" "}
                <span className="text-ink-2">{t("La page se met à jour toute seule.", "The page updates by itself.")}</span>
              </span>
            </p>
          )}
        </header>

        {/* 1. Verdict: the score, then either the comparison or every mission at a glance. */}
        {!paymentOnly && (
        <section className="grid gap-5 lg:grid-cols-[3fr_2fr] print:block" aria-label={t("Score", "Score")}>
          <div className="tile flex flex-col print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-headline">{t("Score agent", "Agent score")}</h2>
              {s.score == null && audit.status === "done" ? <span className="type-small font-semibold text-ink-2">{t("À confirmer", "To be confirmed")}</span> : <ToneLabel score={s.score} />}
            </div>
            <p className="mt-5 text-[96px] font-semibold leading-none tracking-[-0.015em] tnum max-[734px]:text-[72px]">
              {s.score ?? "—"}
              <span className="ml-1 text-[40px] font-semibold text-ink-2 max-[734px]:text-[32px]">%</span>
            </p>
            <p className="mt-3 text-ink-2">
              {lang === "en" ? (
                <>
                  Checkout entrance reached in <span className="font-semibold text-ink tnum">{s.ok} of {s.done} mission{s.done > 1 ? "s" : ""}</span> counted.
                </>
              ) : (
                <>
                  Entrée du checkout atteinte dans <span className="font-semibold text-ink tnum">{s.ok} mission{s.ok > 1 ? "s" : ""} sur {s.done}</span> comptée{s.done > 1 ? "s" : ""}.
                </>
              )}
            </p>
            <div className="mt-auto pt-8">
              <MissionBar ok={s.ok} done={s.done} total={s.total} size="lg" />
              <ul className="type-small mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2 tnum">
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pass" aria-hidden />
                  {s.ok} {t(`réussie${s.ok > 1 ? "s" : ""}`, "passed")}
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-fail" aria-hidden />
                  {s.done - s.ok} {t(`bloquée${s.done - s.ok > 1 ? "s" : ""}`, "blocked")}
                </li>
                {aside > 0 && (
                  <li className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-fill shadow-[inset_0_0_0_1px_var(--line)]" aria-hidden />
                    {aside} {t("hors score", "outside the score")}
                  </li>
                )}
              </ul>
              <p className="type-small mt-5 border-t border-hairline pt-4 text-ink-2">{scope}</p>
              {trend && (trend.rank || trend.prev) && s.score != null && (
                <p className="type-small mt-3 flex flex-wrap gap-x-4 gap-y-1 text-ink-2 tnum">
                  {trend.prev && (
                    <Link href={`/audit/${trend.prev.id}`} className="hover:underline">
                      <span className={`font-semibold ${s.score > trend.prev.score! ? "text-pass" : s.score < trend.prev.score! ? "text-fail" : "text-ink"}`}>
                        {s.score === trend.prev.score ? t("Stable", "Steady") : `${s.score > trend.prev.score! ? "+" : "−"}${Math.abs(s.score - trend.prev.score!)} pts`}
                      </span>{" "}
                      {t("depuis l’audit du", "since the audit of")} {longDate(trend.prev.at, lang)}
                    </Link>
                  )}
                  {trend.rank && (
                    <Link href={audit.device === "mobile" ? "/classement?appareil=mobile" : "/classement"} className="hover:underline">
                      <span className="font-semibold text-ink">{rankText(trend.rank, lang)}</span> {t("des sites mode", "of fashion sites")}
                    </Link>
                  )}
                </p>
              )}
            </div>
          </div>

          {competitor && c && !modelCompare ? (
            compareCard
          ) : (
            <nav className="tile flex flex-col p-0! print:hidden" aria-label={t("Missions en bref", "Missions at a glance")}>
              <h2 className="type-headline px-7 pt-7 pb-3 max-[734px]:px-6">{t("Missions en bref", "Missions at a glance")}</h2>
              <ol>
                {runs.map((r: any, i: number) => (
                  <li key={r.id} className="border-t border-hairline first:border-0">
                    <a href={`#mission-${i + 1}`} className="flex min-h-[52px] items-center gap-3 px-7 py-2.5 transition-colors hover:bg-bg-2/70 max-[734px]:px-6 dark:hover:bg-white/5">
                      <span className="w-4 shrink-0 type-small text-ink-2 tnum">{i + 1}</span>
                      <MissionIcon title={r.missions.title} />
                      <span className="min-w-0 flex-1 truncate">{missionTitle(r.missions.title, lang)}</span>
                      <span className="type-small shrink-0">
                        <StatusBadge run={r} />
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <Link href="/classement" className="more mt-auto border-t border-hairline px-7 max-[734px]:px-6">
                {t("Comparer au classement", "Compare with the ranking")}
              </Link>
            </nav>
          )}
        </section>
        )}

        {/* Two roads an agent can take: clicking through the screen (the score) or a commerce protocol (static check, no agent). */}
        {!paymentOnly && protocols.length > 0 && (
          <section className="tile grid gap-6 md:grid-cols-2" aria-label={t("Deux voies d’achat", "Two buying roads")}>
            <div>
              <h2 className="type-headline">{t("Par l’écran", "Through the screen")}</h2>
              <p className="mt-2 text-[40px] font-semibold leading-none tnum">{s.score ?? "—"} %</p>
              <p className="type-small mt-2 text-ink-2">{t("Agents qui regardent et cliquent comme un client : le score de cet audit.", "Agents that look and click like a customer: this audit's score.")}</p>
            </div>
            <div>
              <h2 className="type-headline">{t("Par protocole", "Through a protocol")}</h2>
              <ul className="mt-3 space-y-1.5">
                {protocols.map((it) => (
                  <li key={it.key} className="flex items-center gap-2.5">
                    <StatusGlyph tone={it.tone === "pass" ? "pass" : "none"} className="h-4 w-4" />
                    <span>{staticText(it.label, lang)}</span>
                  </li>
                ))}
              </ul>
              <p className="type-small mt-2 text-ink-2">
                {protocols.some((it) => it.tone === "pass")
                  ? t("Le site s’ouvre aussi aux agents qui achètent par API (Google, Shopify, OpenAI).", "The site also opens to agents that buy through an API (Google, Shopify, OpenAI).")
                  : t("Aucun protocole d’achat pour agents : seuls ceux qui cliquent à l’écran peuvent acheter.", "No agent commerce protocol: only agents that click on screen can buy.")}
              </p>
            </div>
          </section>
        )}

        {!paymentOnly && firstBlocker && firstRun && (
          <section className="tile grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] print:hidden" aria-labelledby="premier">
            <div className="flex min-w-0 flex-col">
              <p className="type-small font-semibold text-fail">{t("À corriger en premier", "Fix this first")}</p>
              <h2 id="premier" className="type-h3 mt-2 flex items-start gap-2.5">
                <BlockerIcon type={firstBlocker[0]} className="mt-[0.15em] h-[0.9em] w-[0.9em]" />
                {blockerLabel(firstBlocker[0], lang)}
              </h2>
              <p className="mt-2 text-ink-2 tnum">
                {lang === "en"
                  ? `${firstBlocker[1]} of the ${s.done} counted missions stop here.`
                  : `${firstBlocker[1]} des ${s.done} missions comptées s'arrêtent ici.`}
              </p>
              <p className="mt-4 flex gap-2">
                <Chevron className="mt-[0.45em] h-3 w-3 shrink-0 text-link" />
                <span>{firstFix}</span>
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
                <Link href={`/replay/${firstRun.id}?a=${audit.id}`} className="no-print btn btn-dark min-h-[40px] px-[18px] text-[15px]">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
                    <path d="M2.5 1.3v9.4L10.6 6z" />
                  </svg>
                  {t("Voir le replay", "Watch the replay")}
                </Link>
                {audit.recommendations && (
                  <a href="#plan" className="type-small text-link hover:underline">
                    {t("Tout le plan de corrections", "The full fix plan")}
                  </a>
                )}
              </div>
            </div>
            {firstRun.screenshot_url && (
              <a href={firstRun.screenshot_url} target="_blank" rel="noreferrer" className="block self-start rounded-[12px]" aria-label={`${t("Ouvrir la capture", "Open the screenshot")} : ${blockerLabel(firstBlocker[0], lang)}`}>
                <BrowserFrame url={firstRun.final_url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={firstRun.screenshot_url} alt={`${t("Écran où l'agent s'arrête", "Screen where the agent stops")} : ${blockerLabel(firstBlocker[0], lang)}`} className="block w-full" loading="lazy" />
                  <Verdict success={false} label={blockerLabel(firstBlocker[0], lang)} className="absolute bottom-3 left-3" />
                </BrowserFrame>
              </a>
            )}
          </section>
        )}

        {pays.map((pay) => (
          <section key={pay.id} className="tile">
            <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-ink-2">
                {t("Test de paiement réel", "Real payment test")}
                {pays.length > 1 || pay.with_login ? (pay.with_login ? t(" · connecté avec le compte de test", " · signed in with the test account") : t(" · sans compte", " · without an account")) : ""}
              </span>
              <StatusBadge run={pay} />
            </div>
            {pay.status === "done" ? (
              <>
                <p className={`type-h3 mt-3 ${["bank_declined", "payment_accepted"].includes(pay.payment_verdict) ? "text-pass" : ["inconclusive", "three_ds_timeout"].includes(pay.payment_verdict) ? "text-warn" : "text-fail"}`}>
                  {PAYMENT_VERDICTS[pay.payment_verdict] ?? pay.payment_verdict ?? t("Pas de résultat", "No result")}
                </p>
                {pay.agent_answer?.site_message && <p className="mt-2 text-ink-2">{t("Message du site", "Site message")} : « {pay.agent_answer.site_message} »</p>}
                {pay.agent_answer?.furthest_stage && (
                  <p className="mt-2">
                    {t("Étape la plus loin atteinte", "Furthest step reached")} : <span className="font-semibold">{PAYMENT_STAGES[pay.agent_answer.furthest_stage] ?? pay.agent_answer.furthest_stage}</span>
                  </p>
                )}
                <p className="type-small mt-2 text-ink-2">
                  3D Secure : {pay.agent_answer?.three_ds_seen ? t("demandé", "requested") : t("non", "no")} · {t("Prestataire", "Provider")} : {pay.agent_answer?.payment_provider || "?"} · {t("Moyens", "Methods")} :{" "}
                  {pay.agent_answer?.payment_methods || "?"}
                </p>
                {pay.judge?.result && pay.judge.result !== pay.payment_verdict && (
                  <p className="type-small mt-2 text-warn">
                    {t("Juge visuel en désaccord", "Visual judge disagrees")} : {PAYMENT_VERDICTS[pay.judge.result] ?? pay.judge.result}. {pay.judge.reason}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-ink-2">
                {t(
                  "L’agent part au plus près du checkout, prend le premier article disponible et paie une fois. Garde ton téléphone à portée pour valider le 3D Secure.",
                  "The agent starts as close to checkout as it can, takes the first available item and pays once. Keep your phone at hand to approve 3D Secure.",
                )}
              </p>
            )}
          </section>
        ))}

        {/* 2. Diagnosis: what blocks, then what to fix. */}
        {s.blockers.length > 0 && (
          <section>
            <SectionHead title={t("Ce qui arrête l’agent.", "What stops the agent.")}
              intro={t(
                "Blocages relevés pendant les missions, du plus fréquent au moins fréquent. Ceux marqués hors score ne comptent ni pour ni contre le site.",
                "Blockers seen during the missions, most frequent first. Those marked outside the score count neither for nor against the site.",
              )} />
            <ol className="overflow-hidden rounded-[18px] bg-tile">
              {s.blockers.slice(0, 3).map(([b, n]) => {
                const out = EXCLUDED.includes(b);
                return (
                  <li key={b} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2.5 border-b border-hairline px-6 py-4 last:border-0 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_7.5rem]">
                    <span className="flex min-w-0 items-center gap-3">
                      <BlockerIcon type={b} />
                      <span className="min-w-0">
                        <span className="font-semibold">{blockerLabel(b, lang)}</span>
                        {out && <span className="type-small ml-2 whitespace-nowrap text-ink-2">{t("Hors score", "Outside the score")}</span>}
                      </span>
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

        {/* Even a passed mission can hide friction: what the agent had to get past, from its own report. Outside the score. */}
        {got.items.length > 0 && (
          <section>
            <SectionHead title={t("Ce que l’agent a dû contourner.", "What the agent had to get past.")}
              intro={t(
                `Sur les ${got.passed} missions réussies, les obstacles que l’agent a franchis. Un client pressé ou un agent moins tenace peut s’y arrêter. Relevés dans le compte rendu de l’agent, hors score.`,
                `Across the ${got.passed} passed missions, the obstacles the agent got past. A hurried shopper or a less persistent agent may stop there. Read from the agent's own report, outside the score.`,
              )} />
            <ul className="overflow-hidden rounded-[18px] bg-tile">
              {got.items.map(([label, n, icon]) => (
                <li key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2.5 border-b border-hairline px-6 py-4 last:border-0 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_7.5rem]">
                  <span className="flex min-w-0 items-center gap-3 font-semibold">
                    <BlockerIcon type={icon} muted />
                    {label}
                  </span>
                  <span className="col-span-2 row-start-2 block h-1.5 overflow-hidden rounded-full bg-fill md:col-span-1 md:row-start-auto" aria-hidden>
                    <span className="block h-full rounded-full bg-ink-2/50" style={{ width: `${(100 * n) / got.passed}%` }} />
                  </span>
                  <span className="type-small text-right text-ink-2 tnum md:row-start-auto">
                    {t(`${n} sur ${got.passed}`, `${n} of ${got.passed}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {audit.recommendations && (
          <section id="plan" className="scroll-mt-24">
            <SectionHead title={t("Plan de corrections.", "Fix plan.")} />
            <Recommendations
              text={audit.recommendations}
              missions={runs.map((r: any, i: number) => ({ n: i + 1, title: r.missions.title, shot: r.screenshot_url, replay: `${base}/replay/${r.id}?a=${audit.id}` }))}
              ticket={{ report: `${base}/audit/${audit.id}`, site: audit.sites.domain, device: audit.device === "mobile" ? t("mobile (format téléphone simulé)", "mobile (simulated phone format)") : t("ordinateur", "desktop"), date: longDate(audit.created_at, lang) }}
            />
            <p className="type-caption mt-4 max-w-[680px] text-ink-2">
              {t(
                "Les constats viennent des verdicts des missions ci-dessous. Les hypothèses et corrections sont générées par IA (modèle open source sur Hugging Face) : à vérifier avant d’agir.",
                "The findings come from the verdicts of the missions below. Hypotheses and fixes are AI-generated (open-source model on Hugging Face) and written in French: check them before acting.",
              )}
            </p>
          </section>
        )}

        {modelCompare && compareCard && <section className="max-w-[560px] print:hidden">{compareCard}</section>}

        {/* 3. Evidence: every mission with its last screen. */}
        {!paymentOnly && (
        <section className="print-new-page">
          <SectionHead
            title="Missions."
            intro={t(
              "Chaque mission part de l’accueil du site et s’arrête à l’entrée du checkout. La capture montre le dernier écran vu par l’agent.",
              "Each mission starts on the site's home page and stops at the checkout entrance. The screenshot shows the last screen the agent saw.",
            )}
            aside={cost > 0 && <span className="type-small text-ink-2 tnum">{t("Coût agent", "Agent cost")} : {usd(cost, 2, lang)}</span>}
          />
          <div className="space-y-4">
            {runs.map((r: any, i: number) => (
              <article key={r.id} id={`mission-${i + 1}`} className="tile grid scroll-mt-24 gap-x-10 gap-y-6 p-8! md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] max-[734px]:p-6!">
                <div className="flex min-w-0 flex-col">
                  <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-ink-2 tnum">Mission {i + 1}</span>
                    <StatusBadge run={r} />
                  </div>
                  <h3 className="type-h3 mt-2 flex items-start gap-2.5">
                    <MissionIcon title={r.missions.title} className="mt-[0.15em] h-[0.9em] w-[0.9em]" />
                    {missionTitle(r.missions.title, lang)}
                  </h3>
                  {r.status === "done" && (
                    <div className="mt-4">
                      {!r.success && r.success !== null && (
                        <p className="mb-2 flex items-center gap-2.5 font-semibold">
                          <BlockerIcon type={r.blocker_type} />
                          {missionBlocker(r, lang)}
                        </p>
                      )}
                      <p className="text-ink-2">{conclusion(r, t)}</p>
                    </div>
                  )}
                  {r.status === "done" && r.reached_checkout && !r.success && r.judge?.reason && (
                    <p className="type-small mt-4 rounded-[12px] bg-bg-2 px-4 py-3 dark:bg-[#2c2c2e]">
                      <span className="font-semibold text-warn">{t("Juge visuel. ", "Visual judge. ")}</span>
                      {r.judge.reason}
                    </p>
                  )}
                  {r.first_attempt && (
                    <p className="type-small mt-4 border-l-2 border-line pl-3 text-ink-2">
                      {t("Mission rejouée : le premier essai a échoué", "Mission replayed: the first attempt failed")} ({r.first_attempt.blocker_type ? blockerLabel(r.first_attempt.blocker_type, lang) : t("erreur technique", "technical error")}).
                      {r.status === "done" &&
                        r.success !== null &&
                        !(r.success === false && EXCLUDED.includes(r.blocker_type)) &&
                        (r.success
                          ? t(" Le second a réussi : l’échec n’était pas reproductible.", " The second passed: the failure was not reproducible.")
                          : t(" Le second confirme l’échec.", " The second confirms the failure."))}
                      {r.first_attempt.session_id && (
                        <>
                          {" "}
                          <Link href={`/replay/${r.id}?a=${audit.id}&essai=1`} className="no-print text-link hover:underline">
                            {t("Voir le premier essai", "See the first attempt")}
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  {r.status === "done" && (r.blocker_detail || r.agent_answer?.steps_summary) && (
                    <details className="type-small group mt-4 text-ink-2">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-link [&::-webkit-details-marker]:hidden">
                        <Chevron className="h-2.5 w-2.5 transition-transform duration-200 group-open:rotate-90" />
                        {t("Réponse originale de l’agent", "The agent's original answer")}
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
                        {t("Regarder l’agent en direct", "Watch the agent live")}
                      </Link>
                    </div>
                  )}
                  {r.status === "done" && (
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-6">
                      <dl className="flex gap-6 tnum">
                        {(
                          [
                            [t("Étapes", "Steps"), r.steps ?? "?"],
                            [t("Durée", "Duration"), r.duration_s ? `${Math.round(r.duration_s)} s` : "?"],
                            ...(r.cost_usd != null ? [[t("Coût", "Cost"), usd(Number(r.cost_usd), 3, lang)]] : []),
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
                        {t("Voir le replay", "Watch the replay")}
                      </Link>
                    </div>
                  )}
                </div>
                {r.screenshot_url ? (
                  <figure className="self-start">
                  <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block rounded-[12px]" aria-label={`${t("Ouvrir la capture", "Open the screenshot")} : ${missionTitle(r.missions.title, lang)}`}>
                    <BrowserFrame url={r.final_url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.screenshot_url} alt={`${t("Dernier écran vu par l'agent", "Last screen the agent saw")} : ${missionTitle(r.missions.title, lang)}`} className="block w-full" />
                      {r.status === "done" && r.success !== null && (
                        <Verdict success={!!r.success} label={r.success ? undefined : missionBlocker(r, lang)} className="no-print absolute bottom-3 left-3" />
                      )}
                    </BrowserFrame>
                  </a>
                  {r.status === "done" && r.success && (
                    // A sign-in page under a cookie banner looks like a failure: say why it counts as reached.
                    <figcaption className="type-caption mt-2 text-ink-2">
                      {t(
                        "Première page après le panier (connexion, e-mail ou adresse) : l’entrée du checkout est atteinte.",
                        "First page after the cart (sign-in, e-mail or address): the checkout entrance is reached.",
                      )}
                    </figcaption>
                  )}
                  </figure>
                ) : (
                  <div className="type-small grid aspect-[16/10] place-items-center self-start rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">
                    {r.status === "done" ? t("Pas de capture", "No screenshot") : t("Capture à venir", "Screenshot coming")}
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
              title={t("Ce que lit un robot, sans navigateur.", "What a bot reads, without a browser.")}
              intro={t(
                "Lecture gratuite du code du site, comme les outils qui notent un site sans le tester. Elle complète l’agent, elle ne compte pas dans le score.",
                "A free read of the site's code, like the tools that rate a site without testing it. It adds to the agent and does not count in the score.",
              )}
              aside={statik?.items && <span className="type-small text-ink-2 tnum">{t(`${statik.items.filter((it) => it.tone === "pass").length} sur ${statik.items.filter((it) => it.tone !== "none").length} au vert`, `${statik.items.filter((it) => it.tone === "pass").length} of ${statik.items.filter((it) => it.tone !== "none").length} green`)}</span>}
            />
            {statik?.items ? (
              <div className="overflow-hidden rounded-[18px] bg-tile">
              <ul className="-mb-px grid lg:grid-cols-2">
                {statik.items.map((it) => (
                  <li key={it.key} className="flex items-start gap-3 border-b border-hairline px-6 py-4 lg:odd:border-r">
                    <StatusGlyph tone={it.tone} className="mt-0.5 h-5 w-5" />
                    <span className="min-w-0">
                      <span className="font-semibold">{staticText(it.label, lang)}</span>
                      <span className="type-small block text-ink-2">{staticText(it.detail, lang)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {statik.agents && (
                <>
                  <h3 className="border-t border-hairline px-6 pb-1 pt-5 font-semibold">{t("Accès par agent IA", "Access per AI agent")}</h3>
                  <p className="type-small px-6 text-ink-2">{t("Ce que le site laisse passer pour l'agent qu'utilise le client. Accès seulement : la réussite de l'achat, c'est le score de l'agent.", "What the site lets through for the agent a customer uses. Access only: purchase success is the agent's score.")}</p>
                  <ul className="mt-2 grid lg:grid-cols-2">
                    {statik.agents.map((a) => (
                      <li key={a.name} className="flex items-start gap-3 border-t border-hairline px-6 py-4 lg:odd:border-r">
                        <StatusGlyph tone={a.tone} className="mt-0.5 h-5 w-5" />
                        <span className="min-w-0">
                          <span className="font-semibold">{a.name}</span>
                          <span className="type-small block text-ink-2">{accessText(a, t)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              </div>
            ) : (
              <p className="type-small flex items-center gap-2 text-ink-2">
                <Spinner className="h-3.5 w-3.5" /> {t("Lecture en cours…", "Reading…")}
              </p>
            )}
          </section>
        )}

        {!paymentOnly && audit.status === "done" && s.score != null && (
          <section className="no-print tile grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badge/${audit.id}.svg`} alt={`Badge AgentProof : ${s.score} %`} height={28} className="h-7 w-auto" />
            <div className="min-w-0">
              <h2 className="type-headline">{t("Badge à afficher sur ton site.", "A badge to show on your site.")}</h2>
              <p className="type-small mt-1 text-ink-2">{t("Il affiche le score de cet audit et renvoie vers ce rapport.", "It shows this audit's score and links to this report.")}</p>
              <div className="mt-4">
                <CopyField
                  label={t("Code HTML du badge", "Badge HTML code")}
                  lang={lang}
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
