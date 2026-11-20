import { isJury } from "@/lib/jury";
import { canLaunch, staffUser, teamContext } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DEFAULT_MODEL, EXCLUDED, PAY_REACHED_BANK, db, payShown, scoreOf } from "@/lib/engine";
import { byRank } from "@/app/classement/board";
import { rankText } from "@/app/espace/parts";
import { reportSuffix } from "@/lib/space";
import { locale, loginName, missionTitle, staticText, tr, type Lang, type T } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { BlockerIcon, BrowserFrame, Chip, Chips, ExPay, Icon, MissionIcon, Chevron, Note, DeviceTag, MissionBar, Recommendations, ScoredNote, outOfScore, Spinner, StatusBadge, ToneLabel, Verdict, blockerLabel, hurdles, summarize } from "@/lib/ui";
import { Hint } from "@/lib/hint";
import { ClampText, OriginalText } from "@/lib/clamp";
import { headers } from "next/headers";
import { CopyField } from "@/app/espace/controls";
import { Mark, Wordmark, StatusGlyph, scoreTone, toneWords } from "@/lib/ui";
import { AutoRefresh, HashLanding, MarkSeen, PrintButton } from "./refresh";
import { PaymentResult } from "./payment-result";
import { translateRuns } from "@/lib/translate";
import type { AgentAccess } from "@/lib/automations";

// One line per AI assistant, from the static check's per-agent reading (lib/automations.ts agentAccess).
function accessText(a: AgentAccess, t: T) {
  const bots = a.robots.filter((r) => r !== "*").join(", ");
  if (a.robots.includes("*") && a.tone === "fail") return t(`robots.txt interdit tout le site aux robots, et ${a.name} ne publie pas de nom à part.`, `robots.txt bans every bot from the whole site, and ${a.name} publishes no name of its own.`);
  // The site answering 200 means the refusal came from robots.txt.
  if (a.tone === "fail" && (a.http === null || (a.http === 200 && !a.challenge))) return t(`robots.txt interdit tout le site à ${a.robots[0]}, le robot qui lit les pages pour un client en direct.`, `robots.txt bans ${a.robots[0]}, the bot that reads pages for a customer live, from the whole site.`);
  if (a.tone === "fail")
    return a.challenge
      ? t(`Le site lui oppose un défi anti-bot, alors qu'un navigateur passe.`, `The site answers it with an anti-bot challenge, while a browser gets through.`)
      : a.http
        ? t(`Le site lui répond ${a.http}, alors qu'il répond 200 à un navigateur.`, `The site answers it ${a.http}, while it answers 200 to a browser.`)
        : t("Le site ne lui répond pas, alors qu'il répond 200 à un navigateur.", "The site does not answer it, while it answers 200 to a browser.");
  if (a.tone === "warn") return t(`Accès possible, mais robots.txt interdit ${bots} : le site sort des réponses de cet assistant.`, `Access works, but robots.txt bans ${bots}: the site drops out of ${a.name}'s answers.`);
  if (a.tone === "none") return t("Le site refuse toute requête sans navigateur : impossible d'isoler cet agent. L'agent AgentProof, lui, passe par un vrai navigateur.", "The site refuses every request without a browser: this agent can't be isolated. The AgentProof agent uses a real browser.");
  if (a.ownUa) return t("robots.txt l'autorise et le site lui répond.", "robots.txt allows it and the site answers it.");
  // Reports before Nov 2026 have no `browser` field: their only rows without a user agent browsed with a real browser.
  return a.browser === false
    ? t("robots.txt l'autorise.", "robots.txt allows it.")
    : t("Il navigue avec un vrai navigateur, comme l'agent AgentProof : le résultat des missions vaut aussi pour lui.", "It browses with a real browser, like the AgentProof agent: the missions' result applies to it too.");
}
import { fixHints } from "@/lib/space";
import { SiteLogo } from "../../site-logo";

// Agent cost in the reader's format: "0,061 $" in French, "$0.061" in English.
const usd = (n: number, digits: number, lang: Lang) => (lang === "en" ? `$${n.toFixed(digits)}` : `${n.toFixed(digits).replace(".", ",")} $`);

const RUN_FIELDS =
  "id, status, payment_verdict, with_login, login:login_id(label, login_hint), session_id, success, reached_checkout, blocker_type, blocker_detail, screenshot_url, final_url, steps, duration_s, cost_usd, judge, agent_answer, attempts, first_attempt, missions(title, position, team_id, base:base_id(title))";

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
  const custom = runs.filter((r) => r.missions?.team_id).length;
  const second = secondTry(runs).length;
  if (lang === "en")
    return [
      s.done
        ? `Score based on ${s.done} journey${pl(s.done)} on ${device === "mobile" ? "mobile" : "desktop"}, from the home page to the checkout entrance.`
        : `No journey counted on ${device === "mobile" ? "mobile" : "desktop"}: no score for this site until a new audit.`,
      s.done && s.done < 5 ? `Short sample: one result more or less moves the score by ${Math.round(100 / s.done)} points.` : "",
      second ? `${n(second, "mission")} passed only on the second try: unstable result.` : "",
      excluded.length ? `${n(excluded.length, "mission")} excluded from the score (${reasons}).` : "",
      s.unverified ? `${n(s.unverified, "mission")} unverified, outside the score.` : "",
      s.errors ? `${n(s.errors, "mission")} not played (technical error).` : "",
      custom ? `Missions chosen by the team, ${custom} of them written or edited by it: compare this score only with an audit on the same missions.` : "",
    paymentTested ? "Payment tested separately, see below." : "Payment not tested.",
    ].filter(Boolean).join(" ");
  return [
    s.done
      ? `Score calculé sur ${n(s.done, "parcours")} sur ${device === "mobile" ? "mobile" : "ordinateur"}, de l'accueil jusqu'à l'entrée du checkout.`
      : `Aucun parcours compté sur ${device === "mobile" ? "mobile" : "ordinateur"} : pas de score pour ce site avant un nouvel audit.`,
    s.done && s.done < 5 ? `Échantillon court : un résultat de plus ou de moins déplace le score de ${Math.round(100 / s.done)} points.` : "",
    second ? `${n(second, "mission")} réussie${second > 1 ? "s" : ""} au 2ᵉ essai seulement : résultat instable.` : "",
    excluded.length ? `${n(excluded.length, "mission")} exclue${excluded.length > 1 ? "s" : ""} du score (${reasons}).` : "",
    s.unverified ? `${n(s.unverified, "mission")} non vérifiée${s.unverified > 1 ? "s" : ""}, hors score.` : "",
    s.errors ? `${n(s.errors, "mission")} non jouée${s.errors > 1 ? "s" : ""} (erreur technique).` : "",
    custom ? `Missions choisies par l'équipe, dont ${custom} écrite${custom > 1 ? "s" : ""} ou modifiée${custom > 1 ? "s" : ""} par elle : ce score ne se compare qu'à un audit sur les mêmes missions.` : "",
    paymentTested ? "Paiement testé à part, voir plus bas." : "Paiement non testé.",
  ].filter(Boolean).join(" ");
}

// Missions that failed, were replayed and passed: they count as passed, but the result is unstable and the report says so.
const secondTry = (runs: any[]) => runs.filter((r) => r.status === "done" && r.success === true && r.first_attempt);

// Raw success rate: excluded outcomes (anti-bot, out of stock…) counted as failures, as a real customer's agent would live them.
// Unverified missions stay out: nobody knows whether they passed.
function rawRate(s: ReturnType<typeof summarize>) {
  const n = s.done + s.excluded;
  return n ? { ok: s.ok, n, pct: Math.round((100 * s.ok) / n) } : null;
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
            {s.exPay && <ExPay lang={lang} className="ml-3 text-[15pt] tracking-normal" />}
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
// `intro` is a short line, or a row of chips (lib/ui Chips) for facts that used to be a sentence.
function SectionHead({ title, intro, aside }: { title: string; intro?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="section-head mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
      <div className="min-w-0 max-w-[680px]">
        <h2 className="type-h3 text-[24px]!">{title}</h2>
        {intro && (typeof intro === "string" ? <p className="mt-2 text-ink-2">{intro}</p> : <div className="mt-3">{intro}</div>)}
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
      .is("proof_of", null)
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

// The desktop half of a Desktop + Mobile launch links the mobile one; the mobile report finds its desktop half back.
async function devicePair(audit: { id: string; device: string }) {
  const { data } = await db.from("audits").select("id").eq("compare_to", audit.id).neq("device", audit.device).limit(1).maybeSingle();
  return data ? loadAudit(data.id) : null;
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const lang = await getLang();
  const t = tr(lang);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const audit = await loadAudit(id);
  if (!audit) notFound();
  // Everything else the report needs, read in parallel (one round trip instead of four).
  const [ctx, payAudit, competitor, { data: brand }, suffix] = await Promise.all([
    audit.team_id ? teamContext() : null, // payment privacy, and who may cancel a running audit
    audit.payment_test ? loadAudit(audit.payment_test) : null,
    audit.compare_to ? loadAudit(audit.compare_to) : audit.kind === "checkout" ? devicePair(audit) : null,
    // Agency white label: their name and logo replace AgentProof's on this report.
    audit.team_id ? db.from("teams").select("brand_name, brand_logo").eq("id", audit.team_id).maybeSingle() : { data: null },
    // Same name as another report of the team: " (1)", " (2)"…, as in the reports list.
    reportSuffix(audit),
  ]);
  // Real payment tests: only the team that ran them, or AgentProof staff.
  const inTeam = !!audit.team_id && !!ctx?.teams.some((t) => t.id === audit.team_id);
  if (audit.kind === "payment" && !inTeam && !(await staffUser()).isStaff) notFound();
  // The payment test as launched: without an account, or signed in with the test account picked on the launch form
  // (reports from before 19/11/2026 may hold both runs).
  const pays: any[] = inTeam && payAudit ? [...(payAudit.runs ?? [])].map(payShown).sort((a: any, b: any) => +a.with_login - +b.with_login) : [];
  const branded = !!brand?.brand_name;
  const h = await headers();
  const base = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const statik = audit.static_check as { items?: { key: string; label: string; tone: "pass" | "warn" | "fail" | "none"; detail: string }[]; agents?: AgentAccess[] | null } | null;
  const protocols = (statik?.items ?? []).filter((it) => ["ucp", "acp", "webmcp"].includes(it.key));
  const alert = audit.score_alert as {
    from: number;
    to: number;
    previous: string;
    regressed?: { mission: string; blocker: string }[]; // alerts written before 19/11 have neither
    changes?: { at: string; url: string; detail: string }[];
  } | null;
  const trend = audit.kind === "checkout" && audit.status === "done" && !audit.proof_of ? await trendOf(audit) : null;

  const runs = [...audit.runs].sort((a: any, b: any) => a.missions.position - b.missions.position);
  // The agent's and judge's free text, in the interface language (original kept on r, shown on demand).
  // Not the payment tests: their report is asked in French and can quote the team's test identity, never sent out.
  await translateRuns(runs, lang);
  const s = summarize(runs, pays.map((p) => ({ status: p.status, verdict: p.payment_verdict })));
  const c = competitor ? summarize(competitor.runs) : null;
  const running = audit.status === "running" || competitor?.status === "running" || pays.some((p) => p.status !== "done");
  // Owner or admin of the report's team, with that team open: the reports API acts on the current team only.
  const canCancel = running && !!ctx?.team && ctx.team.id === audit.team_id && canLaunch(ctx.team.role);
  const cost = runs.reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0);
  const maxBlock = s.blockers[0]?.[1] ?? 1;
  const got = hurdles(runs, lang);
  const aside = s.excluded + s.unverified + s.errors;
  const raw = s.excluded ? rawRate(s) : null;
  const unstable = secondTry(runs).length;
  const scope = scopeText(runs, s, audit.device, pays.some((p) => p.status === "done"), lang);

  const paymentOnly = runs.length === 0 && pays.length > 0;
  // A linked audit of the same site is a model comparison (same device) or the other half of Desktop + Mobile.
  const deviceCompare = !!competitor && competitor.site_id === audit.site_id && competitor.device !== audit.device;
  const modelCompare = !!competitor && competitor.site_id === audit.site_id && !deviceCompare;
  const deviceName = (d: string) => (d === "mobile" ? "Mobile" : t("Ordinateur", "Desktop"));
  // A competitor sits next to the score; a model comparison is for the technical reader and goes after the fix plan.
  const compareCard = competitor && c ? (
            <Link href={`/audit/${competitor.id}`} className="tile group flex flex-col transition-colors duration-200 hover:bg-tile/80">
              <h2 className="type-headline">
                {deviceCompare ? t("Ordinateur et mobile, mêmes missions", "Desktop and mobile, same missions") : modelCompare ? t("Deux modèles, mêmes missions", "Two models, same missions") : t("Face au concurrent", "Against the competitor")}
              </h2>
              <div className="mt-8 space-y-6">
                {(
                  [
                    [deviceCompare ? deviceName(audit.device) : modelCompare ? audit.model ?? DEFAULT_MODEL : audit.sites.name, s, true, perMission(runs), modelCompare || deviceCompare ? null : audit.sites.domain, deviceCompare ? audit.device : null],
                    [deviceCompare ? deviceName(competitor.device) : modelCompare ? competitor.model ?? DEFAULT_MODEL : competitor.sites.name, c, false, perMission(competitor.runs), modelCompare || deviceCompare ? null : competitor.sites.domain, deviceCompare ? competitor.device : null],
                  ] as const
                ).map(([name, x, self, pm, domain, device]) => (
                  <div key={name} className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`flex min-w-0 items-center gap-2.5 ${self ? "font-semibold" : "text-ink-2"}`}>
                        {domain && <SiteLogo domain={domain} name={name} size="sm" />}
                        {device && <Icon name={device} className="h-5 w-5 self-center" />}
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="text-[21px] font-semibold tnum">{x.score ?? "—"} %</span>
                    </div>
                    <MissionBar ok={x.ok} done={x.done} total={x.total} />
                    <ScoredNote done={x.done} out={outOfScore(x)} className="block" />
                    {(modelCompare || deviceCompare) && pm && (
                      <p className="type-small text-ink-2 tnum">
                        {pm.s} s · {usd(pm.usd, 3, lang)} {t("par mission", "per mission")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <span className="more mt-auto pt-6 group-hover:underline">
                {deviceCompare
                  ? competitor.device === "mobile" ? t("Rapport mobile", "Mobile report") : t("Rapport ordinateur", "Desktop report")
                  : modelCompare ? `${t("Rapport", "Report")} ${competitor.model ?? DEFAULT_MODEL}` : t(`Rapport de ${competitor.sites.name}`, `${competitor.sites.name} report`)}
              </span>
            </Link>
  ) : null;
  // The merchant's first question: what do I fix first? The most frequent counted blocker, its fix and its proof.
  const firstBlocker = s.blockers.find(([b]) => !EXCLUDED.includes(b));
  const firstRun = firstBlocker ? runs.find((r: any) => r.status === "done" && r.success === false && r.blocker_type === firstBlocker[0]) : null;
  const firstFix = firstBlocker ? fixHints(lang)[firstBlocker[0]] ?? fixHints(lang).other : null;
  return (
    <div className="bg-bg-2 pb-24 pt-8 max-[734px]:pt-6 print:bg-bg print:p-0">
      {running && <AutoRefresh />}
      {audit.status === "done" && <MarkSeen id={audit.id} />}
      <HashLanding />
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
      <div className="wrap-wide space-y-12 max-[734px]:space-y-10 print:space-y-[9mm]">
        <header className={paymentOnly ? undefined : "print:hidden"}>
          {branded && (
            <p className="mb-10 flex items-center gap-3 type-headline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {brand!.brand_logo && <img src={brand!.brand_logo} alt="" className="h-10 w-auto max-w-[160px] object-contain" />}
              <span>{t("Rapport préparé par", "Report prepared by")} {brand!.brand_name}</span>
            </p>
          )}
          <p className="type-small font-semibold text-ink-2">{paymentOnly ? t("Test de paiement", "Payment test") : t("Rapport d\u2019audit", "Audit report")} · <DeviceTag device={audit.device} lang={lang} />
          </p>
          <h1 className="type-title mt-1.5 flex items-center gap-3 break-words">
            <SiteLogo domain={audit.sites.domain} name={audit.sites.name} size="md" />
            <span className="min-w-0">{(audit.title || audit.sites.name) + suffix}</span>
          </h1>
          <p className="type-small mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <a href={audit.sites.url} className="text-link hover:underline" target="_blank" rel="noreferrer">
              {audit.sites.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
            <span aria-hidden>·</span>
            <time dateTime={audit.created_at}>
              {new Date(audit.created_at).toLocaleString(locale(lang), { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}
            </time>
            {/* The audit's state, like the sidebar: yellow while it runs (below), green once finished. */}
            {!running && !paymentOnly && (
              <span className="no-print">
                <Chip icon="none" tone="pass">{t("Terminé", "Finished")}</Chip>
              </span>
            )}
            {!running && !paymentOnly && <PrintButton label={t("Télécharger en PDF", "Download as PDF")} />}
            {!running && !paymentOnly && (
              <span className="no-print inline-flex gap-3">
                <a href={`/audit/${audit.id}/export?format=csv`} className="text-link hover:underline">
                  CSV
                </a>
                <a href={`/audit/${audit.id}/export?format=json`} className="text-link hover:underline">
                  JSON
                </a>
              </span>
            )}
          </p>
          {audit.proof_of && (
            <p className="mt-6 rounded-[12px] bg-tile px-4 py-3 type-small">
              <span className="font-semibold">{t("Audit de preuve", "Proof audit")}</span> :{" "}
              {t(
                `l'agent rejoue seulement les missions que « ${blockerLabel(audit.proof_of, lang)} » bloquait, pour vérifier la correction. Si elles passent, la correction est prouvée dans la checklist.`,
                `the agent replays only the missions that “${blockerLabel(audit.proof_of, lang)}” stopped, to check the fix. If they pass, the fix is marked proven in the checklist.`,
              )}
            </p>
          )}
          {audit.deleted_at && (
            <Note
              icon="trash"
              className="mt-6 max-w-[560px] print:hidden"
              action={
                <Link href="/espace/reglages/corbeille/rapports" className="text-link hover:underline">
                  {t("Corbeille", "Trash")}
                </Link>
              }
            >
              {t("Rapport dans la corbeille", "Report in the trash")}
            </Note>
          )}
          {alert && (
            <div role="alert">
              <Note
                icon="trend"
                className="mt-6 max-w-[560px]"
                action={
                  <Link href={`/audit/${alert.previous}`} className="text-link hover:underline">
                    {t("Audit précédent", "Previous audit")}
                  </Link>
                }
              >
                <span className="font-semibold text-fail">{t("Score en baisse", "Score down")} · {alert.from} % → {alert.to} %</span>
                {!!alert.regressed?.length && (
                  <span className="mt-1 block">
                    {t("Bloquent maintenant", "Now blocked")} :{" "}
                    {alert.regressed.map((r) => `${missionTitle(r.mission, lang)} (${blockerLabel(r.blocker, lang)})`).join(", ")}
                  </span>
                )}
                {!!alert.changes?.length && (
                  <span className="mt-1 block">
                    {t("Changements de page entre les deux audits", "Page changes between the two audits")} :{" "}
                    {alert.changes.map((c) => `${c.url.replace(/^https?:\/\/(www\.)?/, "")} (${longDate(c.at, lang)})`).join(", ")}
                  </span>
                )}
              </Note>
            </div>
          )}
          {running && !paymentOnly && (
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-tile px-4 py-2 type-small" role="status">
              <Spinner className="h-3.5 w-3.5 text-live" />
              <span>
                <span className="font-semibold tnum text-live">
                  {t(`${s.finished}/${s.total} missions terminées`, `${s.finished}/${s.total} missions finished`)}
                </span>
              </span>
              <Chip icon="live" tone="live">{t("Direct", "Live")}</Chip>
            </p>
          )}
          {canCancel && (
            <details className="group mt-3 print:hidden">
              <summary className="type-small inline-flex cursor-pointer list-none text-link hover:underline [&::-webkit-details-marker]:hidden">{t("Annuler l’audit", "Cancel the audit")}</summary>
              <form action="/api/reports" method="post" className="type-small mt-3 flex max-w-[560px] flex-wrap items-center gap-3 rounded-[12px] bg-tile px-4 py-3 text-ink-2">
                <input type="hidden" name="action" value="cancel" />
                <input type="hidden" name="id" value={audit.id} />
                <input type="hidden" name="back" value={`/audit/${audit.id}`} />
                <span className="min-w-0 flex-1">
                  {t(
                    "Les missions pas encore lancées sont retirées et leurs crédits rendus. Celles en cours se terminent et restent dans le rapport.",
                    "Missions not started yet are dropped and their credits given back. Those already running finish and stay in the report.",
                  )}
                </span>
                <button className="btn-secondary min-h-9 rounded-full px-4 font-semibold text-fail">{t("Confirmer l’annulation", "Confirm cancellation")}</button>
              </form>
            </details>
          )}
          {/* Waiting is normal (agents are shared): say why, and that the page can be closed. */}
          {running && !paymentOnly && runs.some((r: any) => r.status === "todo") && (
            <p className="type-small mt-3 max-w-[560px] text-ink-2">
              {t(
                `${runs.filter((r: any) => r.status === "todo").length} mission(s) en file d’attente : elles démarrent dès qu’un agent se libère. Tu peux fermer cette page, l’audit continue et le rapport reste dans ton espace.`,
                `${runs.filter((r: any) => r.status === "todo").length} mission(s) queued: they start as soon as an agent is free. You can close this page, the audit carries on and the report stays in your space.`,
              )}
            </p>
          )}
          {/* Partial result: missions not played because of an error on our side. Never the site's fault: out of the score,
              and a fresh full pass one click away (force=1 skips the 7-day reuse that would hand this report back). */}
          {!running && !paymentOnly && s.errors > 0 && audit.kind === "checkout" && !audit.proof_of && (
            <div role="status" className="mt-6 max-w-[560px]">
              <Note
                icon="info"
                action={
                  audit.team_id ? (
                    <Link href={`/espace/nouveau?${new URLSearchParams({ url: audit.sites.domain, device: audit.device, force: "1" })}`} className="text-link hover:underline">
                      {t("Relancer", "Run again")}
                    </Link>
                  ) : undefined
                }
              >
                <span className="font-semibold text-ink">{t("Résultat partiel", "Partial result")}</span>
                {" · "}
                {t(
                  `${s.errors} mission(s) non jouée(s) à cause d’une erreur de notre côté, hors score. Ce n’est pas un défaut de ton site.`,
                  `${s.errors} mission(s) not played because of an error on our side, out of the score. It is not a flaw of your site.`,
                )}
              </Note>
            </div>
          )}
        </header>

        {/* 1. Verdict: the score, then either the comparison or every mission at a glance. */}
        {!paymentOnly && (
        <section className="grid gap-4 lg:grid-cols-[3fr_2fr] print:block" aria-label={t("Score", "Score")}>
          <div className="tile flex flex-col p-7! max-[734px]:p-6! print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-headline">{t("Score agent", "Agent score")}</h2>
              {s.score == null && audit.status === "done" ? <span className="type-small font-semibold text-ink-2">{t("À confirmer", "To be confirmed")}</span> : <ToneLabel score={s.score} exPay={s.exPay} />}
            </div>
            <p className="mt-4 text-[64px] font-semibold leading-none tracking-[-0.015em] tnum max-[734px]:text-[52px]">
              {s.score ?? "—"}
              <span className="ml-1 text-[28px] font-semibold text-ink-2 max-[734px]:text-[24px]">%</span>
              {s.exPay && <ExPay lang={lang} className="ml-3 text-[17px] tracking-normal max-[734px]:text-[15px]" />}
            </p>
            <p className="mt-3 text-ink-2">
              {t("Entrée du checkout atteinte", "Checkout entrance reached")} · <span className="font-semibold text-ink tnum">{s.ok}/{s.done}</span>
            </p>
            <ScoredNote done={s.done} out={outOfScore(s)} className="mt-1 block" />
            {s.exPay && (
              <p className="mt-2 text-ink-2">
                {t("Paiement", "Payment")} ·{" "}
                <span className="font-semibold text-ink">
                  {pays.some((p) => p.payment_verdict === "three_ds_timeout")
                    ? t("validé jusqu’au 3D Secure, commande non confirmée", "validated up to 3D Secure, order not confirmed")
                    : pays.some((p) => PAY_REACHED_BANK.includes(p.payment_verdict))
                      ? t("transmis à la banque, commande non confirmée", "sent to the bank, order not confirmed")
                      : t("échoué, commande non confirmée", "failed, order not confirmed")}
                </span>
              </p>
            )}
            <div className="mt-auto pt-6">
              <MissionBar ok={s.ok} done={s.done} total={s.total} size="lg" />
              <ul className="type-small mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2 tnum">
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pass" aria-hidden />
                  {s.ok} {t(`réussie${s.ok > 1 ? "s" : ""}`, "passed")}
                  {unstable > 0 && <span>({t(`dont ${unstable} au 2ᵉ essai`, `${unstable} on the 2nd try`)})</span>}
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
              {raw && (
                <p className="type-small mt-5 flex flex-wrap items-baseline gap-x-2 border-t border-hairline pt-4 text-ink-2">
                  <span className="font-semibold text-ink tnum">
                    {t("Taux réel", "Real rate")} · {raw.pct} % ({raw.ok}/{raw.n})
                  </span>
                  {t("missions hors score comptées comme échecs, comme pour l’agent d’un vrai client", "out-of-score missions counted as failures, as a real customer's agent would live them")}
                </p>
              )}
              <p className={`type-small text-ink-2 ${raw ? "mt-3" : "mt-5 border-t border-hairline pt-4"}`}>{scope}</p>
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
                      <span className="font-semibold text-ink">{rankText(trend.rank, lang)}</span> {t("des sites classés", "of ranked sites")}
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
                      <MissionIcon title={r.missions.base?.title ?? r.missions.title} team={!!r.missions.team_id} />
                      <span className="min-w-0 flex-1 truncate">{missionTitle(r.missions.title, lang)}</span>
                      <span className="type-small shrink-0">
                        <StatusBadge run={r} secondTry={!!r.first_attempt} />
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
              <p className="mt-2 text-[40px] font-semibold leading-none tnum">
                {s.score ?? "—"} %{s.exPay && <ExPay lang={lang} className="ml-2 text-[17px]" />}
              </p>
              <p className="type-small mt-2 text-ink-2">{t("Agents qui cliquent comme un client", "Agents that click like a customer")}</p>
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
          // The whole tile opens the replay (private, card masked), like a mission's "Watch the replay".
          <section key={pay.id} className={`tile ${pay.session_id && pay.status !== "todo" ? "relative transition-colors duration-200 hover:bg-tile/80" : ""}`}>
            <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-ink-2">
                {t("Test de paiement réel", "Real payment test")}
                {pay.with_login ? t(" · connecté avec ", " · signed in with ") + loginName(pay.login, lang) : t(" · sans compte", " · without an account")}
              </span>
              <StatusBadge run={pay} />
            </div>
            {pay.status === "done" ? (
              <>
                <PaymentResult pay={pay} lang={lang} />
                <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                  <dl className="flex gap-6 tnum">
                    {(
                      [
                        [t("Étapes", "Steps"), pay.steps ?? "?"],
                        [t("Durée", "Duration"), pay.duration_s ? `${Math.round(pay.duration_s)} s` : "?"],
                        ...(pay.cost_usd != null ? [[t("Coût", "Cost"), usd(Number(pay.cost_usd), 3, lang)]] : []),
                      ] as [string, string | number][]
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className="type-caption text-ink-2">{k}</dt>
                        <dd className="type-small font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {pay.session_id && (
                    <Link href={`/replay/${pay.id}?a=${audit.payment_test}`} className="no-print btn btn-dark min-h-[40px] px-[18px] text-[15px] after:absolute after:inset-0 after:content-['']">
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
                        <path d="M2.5 1.3v9.4L10.6 6z" />
                      </svg>
                      {t("Voir le replay", "Watch the replay")}
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
              {pay.status === "launched" && pay.session_id && (
                <Link href={`/replay/${pay.id}?a=${audit.payment_test}`} className="no-print btn mt-4 min-h-[40px] gap-2 px-[18px] text-[15px] after:absolute after:inset-0 after:content-['']">
                  <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70 motion-reduce:hidden" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  {t("Suivre l’agent", "Follow the agent")}
                </Link>
              )}
              <Note icon="mobile" className="mt-4">
                {isJury(ctx?.user.email)
                  ? t("Démo jury : la carte n'a pas de solde. Si la banque demande le 3D Secure, personne ne le valide : le test s'arrête là, et c'est le verdict attendu.", "Jury demo: the card has no balance. If the bank asks for 3D Secure, nobody approves it: the test stops there, which is the expected verdict.")
                  : t("Garde ton téléphone à portée pour valider le 3D Secure.", "Keep your phone at hand to approve 3D Secure.")}
              </Note>
              </>
            )}
          </section>
        ))}

        {/* 2. Diagnosis: what blocks, then what to fix. */}
        {s.blockers.length > 0 && (
          <section>
            <SectionHead title={t("Ce qui arrête l’agent.", "What stops the agent.")} />
            <ol className="overflow-hidden rounded-[18px] bg-tile">
              {/* Every blocker, not only the top 3: the team space's "Fix first" cards land on #blocage-<type>. */}
              {s.blockers.map(([b, n]) => {
                const out = EXCLUDED.includes(b);
                // The missions it stopped, numbered as in the Missions section below: each one jumps to its card.
                const hit = runs.flatMap((r: any, i: number) => ((r.status === "done" || r.status === "error") && r.success === false && r.blocker_type === b ? [i + 1] : []));
                return (
                  <li key={b} id={`blocage-${b}`} className="target-flash grid scroll-mt-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2.5 border-b border-hairline px-6 py-4 last:border-0 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_7.5rem]">
                    <span className="flex min-w-0 items-center gap-3">
                      <BlockerIcon type={b} />
                      <span className="min-w-0">
                        <span className="font-semibold">{blockerLabel(b, lang)}</span>
                        {out && (
                          <Hint tip={t("Ne compte ni pour ni contre le site.", "Counts neither for nor against the site.")} className="ml-2 align-middle">
                            <Chip icon="mission_not_applicable">{t("Hors score", "Outside the score")}</Chip>
                          </Hint>
                        )}
                        {hit.length > 0 && (
                          <span className="type-small no-print mt-0.5 flex flex-wrap gap-x-3 text-ink-2">
                            {hit.map((m: number) => (
                              <a key={m} href={`#mission-${m}`} className="text-link hover:underline tnum">
                                Mission {m}
                              </a>
                            ))}
                          </span>
                        )}
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
              intro={
                <Chips>
                  <Hint tip={t("Un client pressé ou un agent moins tenace peut s’y arrêter. Relevé dans le compte rendu de l’agent.", "A hurried shopper or a less persistent agent may stop there. Read from the agent's own report.")}>
                    <Chip icon="none" tone="pass">{t(`${got.passed} mission${got.passed > 1 ? "s" : ""} réussie${got.passed > 1 ? "s" : ""}`, `${got.passed} passed mission${got.passed > 1 ? "s" : ""}`)}</Chip>
                  </Hint>
                  <Chip icon="mission_not_applicable">{t("Hors score", "Outside the score")}</Chip>
                </Chips>
              } />
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
            <SectionHead
              title={t("Plan de corrections.", "Fix plan.")}
              intro={
                <Hint
                  tip={t(
                    "Constats : verdicts des missions ci-dessous. Hypothèses et corrections : IA open source (Hugging Face).",
                    "Findings: verdicts of the missions below. Hypotheses and fixes: open-source AI (Hugging Face), written in French and translated automatically.",
                  )}
                >
                  <Chip icon="sparkle">{t("Hypothèses IA · à vérifier avant d’agir", "AI hypotheses · check before acting")}</Chip>
                </Hint>
              }
            />
            <Recommendations
              text={audit.recommendations}
              missions={runs.map((r: any, i: number) => ({ n: i + 1, title: r.missions.title, shot: r.screenshot_url, replay: `${base}/replay/${r.id}?a=${audit.id}` }))}
              ticket={{ report: `${base}/audit/${audit.id}`, site: audit.sites.domain, device: audit.device === "mobile" ? t("mobile (format téléphone simulé)", "mobile (simulated phone format)") : t("ordinateur", "desktop"), date: longDate(audit.created_at, lang) }}
            />
          </section>
        )}

        {modelCompare && compareCard && <section className="max-w-[560px] print:hidden">{compareCard}</section>}

        {/* 3. Evidence: every mission with its last screen. */}
        {!paymentOnly && (
        <section className="print-new-page">
          <SectionHead
            title="Missions."
            intro={
              <Chips>
                <Hint tip={t("La capture montre le dernier écran vu par l’agent.", "The screenshot shows the last screen the agent saw.")}>
                  <Chip icon="home">{t("Accueil → entrée du checkout", "Home → checkout entrance")}</Chip>
                </Hint>
              </Chips>
            }
            aside={cost > 0 && <Chip icon="payment">{t("Coût agent", "Agent cost")} · {usd(cost, 2, lang)}</Chip>}
          />
          <div className="space-y-4">
            {runs.map((r: any, i: number) => (
              <article key={r.id} id={`mission-${i + 1}`} className="target-flash tile grid scroll-mt-24 gap-x-10 gap-y-6 p-8! md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] max-[734px]:p-6!">
                <div className="flex min-w-0 flex-col">
                  <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-ink-2 tnum">Mission {i + 1}</span>
                    <StatusBadge run={r} secondTry={!!r.first_attempt} />
                  </div>
                  <h3 className="type-h3 mt-2 flex items-start gap-2.5">
                    <MissionIcon title={r.missions.base?.title ?? r.missions.title} team={!!r.missions.team_id} className="mt-[0.15em] h-[0.9em] w-[0.9em]" />
                    {missionTitle(r.missions.title, lang)}
                  </h3>
                  {r.missions.team_id && (
                    <Chips className="mt-2">
                      <Chip icon="wrench">
                        {r.missions.base
                          ? t(`Modifiée · d’après « ${missionTitle(r.missions.base.title, lang)} »`, `Edited · from “${missionTitle(r.missions.base.title, lang)}”`)
                          : t("Mission de l’équipe", "Team mission")}
                      </Chip>
                    </Chips>
                  )}
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
                    <div className="type-small mt-4 rounded-[12px] bg-bg-2 px-4 py-3 dark:bg-[#2c2c2e]">
                      <span className="font-semibold text-warn">{t("Juge visuel. ", "Visual judge. ")}</span>
                      {r.tr?.judge ?? r.judge.reason}
                      <OriginalText original={r.judge.reason} shown={r.tr?.judge} lang={lang} />
                    </div>
                  )}
                  {r.first_attempt && (
                    <p className="type-small mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-ink-2">
                      <Chip icon="refresh">{t("Rejouée", "Replayed")}</Chip>
                      {t("1ᵉʳ essai", "1st try")} : {r.first_attempt.blocker_type ? blockerLabel(r.first_attempt.blocker_type, lang) : t("erreur technique", "technical error")}
                      {r.status === "done" &&
                        r.success !== null &&
                        !(r.success === false && EXCLUDED.includes(r.blocker_type)) &&
                        (r.success
                          ? t(" · 2ᵉ réussi, échec non reproductible", " · 2nd passed, not reproducible")
                          : t(" · 2ᵉ confirme l’échec", " · 2nd confirms the failure"))}
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
                        {t("Réponse de l’agent", "The agent's answer")}
                      </summary>
                      <ClampText lang={lang} lines={6} className="mt-2">
                        {r.blocker_detail && <p>{r.tr?.detail ?? r.blocker_detail}</p>}
                        {r.agent_answer?.steps_summary && r.agent_answer.steps_summary !== r.blocker_detail && <p className={r.blocker_detail ? "mt-2" : ""}>{r.tr?.summary ?? r.agent_answer.steps_summary}</p>}
                      </ClampText>
                      <OriginalText
                        original={[r.blocker_detail, r.agent_answer?.steps_summary !== r.blocker_detail && r.agent_answer?.steps_summary].filter(Boolean).join("\n\n")}
                        shown={[r.tr?.detail ?? r.blocker_detail, r.agent_answer?.steps_summary !== r.blocker_detail && (r.tr?.summary ?? r.agent_answer?.steps_summary)].filter(Boolean).join("\n\n")}
                        lang={lang}
                      />
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
                      <img src={r.screenshot_url} alt={`${t("Dernier écran vu par l'agent", "Last screen the agent saw")} : ${missionTitle(r.missions.title, lang)}`} className="block w-full" loading="lazy" decoding="async" />
                      {r.status === "done" && r.success !== null && (
                        <Verdict success={!!r.success} label={r.success ? undefined : missionBlocker(r, lang)} className="no-print absolute bottom-3 left-3" />
                      )}
                    </BrowserFrame>
                  </a>
                  {r.status === "done" && r.success && (
                    // A sign-in page under a cookie banner looks like a failure: say why it counts as reached.
                    <figcaption className="type-caption mt-2 text-ink-2">
                      {t("Entrée du checkout atteinte : connexion, e-mail ou adresse.", "Checkout entrance reached: sign-in, e-mail or address.")}
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
              intro={
                <Chips>
                  <Chip icon="doc">{t("Lecture du code", "Code reading")}</Chip>
                  <Chip icon="mission_not_applicable">{t("Hors score", "Outside the score")}</Chip>
                </Chips>
              }
              aside={statik?.items && <Chip icon="none" tone="pass">{t(`${statik.items.filter((it) => it.tone === "pass").length}/${statik.items.filter((it) => it.tone !== "none").length} au vert`, `${statik.items.filter((it) => it.tone === "pass").length}/${statik.items.filter((it) => it.tone !== "none").length} green`)}</Chip>}
            />
            {statik?.items ? (
              <div className="overflow-hidden rounded-[18px] bg-tile">
              <ul className="-mb-px grid lg:grid-cols-2">
                {statik.items.map((it) => (
                  <li key={it.key} className="flex items-start gap-3 border-b border-hairline px-6 py-4 lg:odd:border-r lg:odd:last:col-span-2 lg:odd:last:border-r-0">
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
                  <h3 className="border-t border-hairline px-6 pb-1 pt-5 font-semibold">
                    {t("Accès par agent IA", "Access per AI agent")}{" "}
                    <span className="type-small font-normal text-ink-2">{t(`${statik.agents.filter((a) => a.tone === "pass").length}/${statik.agents.length} ouverts`, `${statik.agents.filter((a) => a.tone === "pass").length}/${statik.agents.length} open`)}</span>
                  </h3>
                  <p className="type-small px-6 text-ink-2">
                    {t(
                      "Chaque assistant peut-il ouvrir le site ? robots.txt et réponse du site à son robot. Réussir l'achat, c'est le score des missions.",
                      "Can each assistant open the site? robots.txt and the site's answer to its bot. Completing a purchase is the missions' score.",
                    )}
                  </p>
                  {/* Refusals get a line each; the other groups fit on one row of names, their detail on hover or tap. */}
                  <ul className="mt-2 grid lg:grid-cols-2">
                    {statik.agents
                      .filter((a) => a.tone === "fail")
                      .map((a) => (
                        <li key={a.name} className="flex items-start gap-3 border-t border-hairline px-6 py-4 lg:odd:border-r lg:odd:last:col-span-2 lg:odd:last:border-r-0">
                          <StatusGlyph tone={a.tone} className="mt-0.5 h-5 w-5" />
                          <span className="min-w-0">
                            <span className="font-semibold">{a.name}</span>
                            <span className="type-small block text-ink-2">{accessText(a, t)}</span>
                          </span>
                        </li>
                      ))}
                  </ul>
                  {(
                    [
                      ["none", t("Impossible à isoler, le site refuse toute requête sans navigateur :", "Can't be isolated, the site refuses every request without a browser:")],
                      ["warn", t("Accès possible, mais robots.txt les sort des réponses :", "Access works, but robots.txt drops the site from their answers:")],
                      ["pass", t("Ouverts :", "Open:")],
                    ] as const
                  ).map(([tone, label]) => {
                    const group = statik.agents!.filter((a) => a.tone === tone);
                    return (
                      group.length > 0 && (
                        <div key={tone} className="flex flex-wrap items-center gap-2 border-t border-hairline px-6 py-4">
                          <span className="type-small mr-1 text-ink-2">{label}</span>
                          {group.map((a) => (
                            <Hint key={a.name} tip={accessText(a, t)} side="top">
                              <span className="type-small inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 font-semibold">
                                <StatusGlyph tone={tone} className="h-3.5 w-3.5" />
                                {a.name}
                              </span>
                            </Hint>
                          ))}
                        </div>
                      )
                    );
                  })}
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
              <p className="type-small mt-1 text-ink-2">{t("Score de cet audit, lien vers ce rapport.", "This audit's score, linking to this report.")}</p>
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
