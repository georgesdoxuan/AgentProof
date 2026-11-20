import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { currentUser } from "@/lib/auth";
import { AgentCursor, BrowserFrame, Chip, Chips, Field, Icon, MissionBar, ScoredNote, StatusGlyph, Verdict, blockerLabel, scoreTone } from "@/lib/ui";
import { missionTitle, tr, type Lang, type T } from "@/lib/i18n";
import { getDict, getLang } from "@/lib/lang";
import { Sections } from "../nav";
import { byRank } from "../classement/board";
import { LEGAL } from "@/lib/legal";
import { loadPace, estimateMinutes, minutesLabel } from "@/lib/estimate";
import { SiteLogo } from "../site-logo";
import { FORM_FAQ } from "@/lib/faq";
import { translate } from "@/lib/translate";

// Report opened by "Voir un exemple de rapport": real counted blockers, captures, replays and a plan. Env var to swap it without code.
const EXAMPLE_AUDIT = process.env.EXAMPLE_AUDIT_ID ?? "8c843d3f-3d95-4834-aace-21880a85f499"; // Promod, 78 %
// The "Preuves" tile shows one chosen blocked mission, not the latest failure: a new audit must never swap in an unreadable capture.
// A desktop capture (1024 px wide, about 510 px on screen): sharp on a Retina screen. A mobile capture is only 390 px
// wide; stretched to the tile it looked pixelated (run 228), so a mobile one is never shown wider than its own pixels.
const PROOF_RUN = Number(process.env.PROOF_RUN_ID ?? 194); // Promod, desktop product page, size selector out of reach
// The demo on the home page: one blocked mission of EXAMPLE_AUDIT, its screenshot and the fix the report gives for it.
// Read from the database at render: a recording, never a live agent session (no H call).
const DEMO_RUN = Number(process.env.DEMO_RUN_ID ?? 19); // Promod, mission 2 « Menu + filtre taille », size selector

export default async function Home() {
  await connection();
  const lang = await getLang();
  const t = tr(lang);
  const [user, { data: scores }, { data: proof }, pace, { data: demoRun }, { data: demoAudit }] = await Promise.all([
    currentUser(),
    db.from("site_scores").select("*"),
    // A real blocked mission for the "Preuves" tile: evidence over illustration.
    db.from("runs").select("screenshot_url, final_url, blocker_type, audits(device)").eq("id", PROOF_RUN).maybeSingle(),
    // Time of a 5-mission audit, measured on the latest audits (queue left out: it changes by the minute).
    loadPace(),
    db.from("runs").select("id, audit_id, success, blocker_type, screenshot_url, final_url, agent_answer, missions(title, position)").eq("id", DEMO_RUN).maybeSingle(),
    db.from("audits").select("id, device, finished_at, recommendations, sites(domain, name)").eq("id", EXAMPLE_AUDIT).maybeSingle(),
  ]);
  // Only when the run belongs to the example audit: capture, result and fix always come from the same audit.
  const demo = demoRun && demoAudit && demoRun.audit_id === demoAudit.id && demoRun.success === false && demoRun.screenshot_url ? { run: demoRun, audit: demoAudit } : null;

  const proofMobile = (proof?.audits as { device?: string } | null)?.device === "mobile";

  // Same order as /classement, so the two never disagree.
  const desktop = (scores ?? []).filter((s) => s.device === "desktop");
  const ranked = desktop.filter((s) => s.score != null).sort(byRank);
  const top = ranked.slice(0, 5);
  // Under the top 5 (often all at 100 %): how many sites are ranked, and the desktop/mobile gap on the sites audited
  // on both, so a visitor sees that not everyone passes. Plain means of the stored scores; nothing recomputed.
  const mobile = new Map((scores ?? []).filter((s) => s.device === "mobile" && s.score != null).map((s) => [s.domain, s.score as number]));
  const both = ranked.filter((s) => mobile.has(s.domain));
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const gap = both.length >= 3 ? { n: both.length, desktop: mean(both.map((s) => s.score as number)), mobile: mean(both.map((s) => mobile.get(s.domain)!)) } : null;

  // The report e-mail goes through n8n: only announce it when that hook is configured.
  const mails = !!process.env.N8N_NOTIFY_URL;

  // One desktop audit of 5 missions, queue left out; the same figure as the form's clock chip.
  const duration = minutesLabel(estimateMinutes(5, pace.desktop));

  const sections = (await getDict()).sections;
  return (
    <>
      <Sections t={sections} bar />
      {/* Hero */}
      <section className="overflow-hidden pt-[88px] text-center max-[734px]:pt-14">
        <div className="wrap">
          <h1 className="type-hero ap-fade">{t("Vérifie qu’un agent IA peut acheter sur ta boutique.", "Check that an AI agent can buy from your store.")}</h1>
          <p className="type-subhead ap-fade mx-auto mt-5 max-w-[640px] text-ink-2 [animation-delay:0.2s]">
            {t(
              "Cookies, pop-up, choix de taille ou de couleur : on te montre où il bloque, captures à l’appui, et quoi corriger. Gratuit, aucun achat réel.",
              "Cookies, pop-ups, size or colour picker: we show you where it gets stuck, with screenshots, and what to fix. Free, no real purchase.",
            )}
          </p>
          <div className="ap-fade mt-8 flex flex-wrap items-center justify-center gap-x-[17px] gap-y-2 [animation-delay:0.4s]">
            <a href="#tester" className="btn">
              {t("Tester mon site", "Test my site")}
            </a>
            <Link href={`/audit/${EXAMPLE_AUDIT}`} className="more">
              {t("Voir un exemple de rapport", "See a sample report")}
            </Link>
            {/* Phones: the section bar already has Classement; one row less keeps the "free" line above the fold. */}
            <Link href="/classement" className="more max-[734px]:hidden">
              {t("Voir le classement", "See the ranking")}
            </Link>
          </div>
          {/* What the click costs and asks for, then what the agent never does: both were only under the form.
              "Gratuit" holds while online payment is closed (see Tarifs); the guarantees are CONTEXT.md § 7, enforced by the engine. */}
          <p className="type-small ap-fade mt-4 text-ink-2 [animation-delay:0.5s]">
            {/* Each part stays whole, so a narrow screen breaks the line at a "·", never inside "4 à 8 min".
                The time is the measured one (lib/estimate.ts), same as the clock chip of the form below: no fixed promise. */}
            {(lang === "en" ? ["Free", "your URL and your e-mail", `report in ${duration}`] : ["Gratuit", "ton URL et ton e-mail", `rapport en ${duration.replace("–", " à ")}`]).map((part, i) => (
              <span key={part} className="whitespace-nowrap">{i > 0 && " · "}{part}</span>
            ))}
          </p>
          <Chips className="ap-fade mt-3 justify-center [animation-delay:0.5s]">
            <Chip icon="nopay">{t("Aucun paiement", "No payment")}</Chip>
            <Chip icon="shield">{t("Aucune donnée personnelle saisie", "No personal data entered")}</Chip>
            <Chip icon="lock">{t("Arrêt à l’entrée du checkout", "Stops at the checkout entrance")}</Chip>
            <Link href="/methode" className="type-small ml-1 text-link hover:underline">
              {t("La méthode", "The method")}
            </Link>
          </Chips>
        </div>
        <figure className="mx-auto mt-16 w-[min(1080px,92%)] max-[734px]:mt-12">
          <BrowserFrame url={t("https://maison-exemple.fr/pull-col-rond-noir", "https://maison-example.com/black-crew-neck-sweater")}>
            <ProductMock t={t} />
          </BrowserFrame>
          <figcaption className="type-small mx-auto mt-5 max-w-[520px] text-ink-2">
            {t(
              "Illustration : l’agent clique sur « Ajouter au panier ». Un bandeau cookies surgit et le recouvre. La mission s’arrête là.",
              "Illustration: the agent clicks “Add to cart”. A cookie banner pops up and covers it. The mission ends there.",
            )}
          </figcaption>
        </figure>
      </section>

      {/* Statement */}
      <section id="pourquoi" className="section scroll-mt-[96px] lg:scroll-mt-[52px]">
        <div className="wrap">
          <p className="type-h2 text-ink-2">
            {t(
              <>
                Tes clients choisissent déjà avec l’IA : <span className="text-ink">44 % des Français</span> l’utilisent pour préparer un achat.
                <sup className="ml-0.5 align-super text-[0.4em]">
                  <a href="#note-1" className="text-link" aria-label="Note 1">
                    1
                  </a>
                </sup>{" "}
                Demain, des agents IA feront les courses à leur place.{" "}
                <span className="text-ink">Un bandeau cookies, une pop-up ou un sélecteur d’options suffit à les arrêter.</span> Ils achètent alors ailleurs.
              </>,
              <>
                Your customers already choose with AI: <span className="text-ink">44 % of French shoppers</span> use it to prepare a purchase.
                <sup className="ml-0.5 align-super text-[0.4em]">
                  <a href="#note-1" className="text-link" aria-label="Note 1">
                    1
                  </a>
                </sup>{" "}
                Tomorrow, AI agents will shop on their behalf.{" "}
                <span className="text-ink">A cookie banner, a pop-up or an option picker is enough to stop them.</span> Then they buy elsewhere.
              </>,
            )}
          </p>
        </div>
      </section>

      {demo && <Demo demo={demo} lang={lang} t={t} />}

      {/* What you get */}
      {/* Same grey as the demo just above: one section gap between them, not two. */}
      <section id="ce-que-tu-recois" className={`section scroll-mt-[96px] lg:scroll-mt-[52px] bg-bg-2 ${demo ? "pt-0!" : ""}`}>
        <div className="wrap-wide">
          <h2 className="type-h1 mb-12 max-[734px]:mb-8">{t("Ce que tu reçois.", "What you get.")}</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <article className="tile grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:col-span-2 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="type-eyebrow text-ink-2">Missions</p>
                <h3 className="type-h2 mt-3">{t("Cinq parcours d’achat testés, sans paiement.", "Five purchase journeys tested, no payment.")}</h3>
                <p className="mt-4 max-w-[440px] text-ink-2">
                  {t(
                    "L’agent cherche, filtre, choisit une variante (taille, couleur, contenance…) et remplit le panier, comme un client. Il s’arrête à la première page du checkout.",
                    "The agent searches, filters, picks a variant (size, colour, capacity…) and fills the cart, like a customer. It stops at the first checkout page.",
                  )}
                </p>
                <p className="type-small mt-3 max-w-[440px] text-ink-2">
                  {t(
                    "Mode, maison, beauté, high-tech, sport : tout site qui vend des produits physiques. Sans variante sur le produit, l’agent saute l’étape.",
                    "Fashion, home, beauty, electronics, sport: any site that sells physical products. When a product has no variant, the agent skips that step.",
                  )}
                </p>
              </div>
              <MissionsVisual t={t} />
            </article>

            <article className="tile flex flex-col">
              <p className="type-eyebrow text-ink-2">{t("Preuves", "Proof")}</p>
              <h3 className="type-h3 mt-3">{t("Une capture là où l’agent abandonne.", "A screenshot where the agent gives up.")}</h3>
              <p className="mt-3 text-ink-2">
                {t(
                  "Chaque mission a son replay pas à pas. Un juge visuel relit la dernière capture pour confirmer le verdict.",
                  "Every mission has a step-by-step replay. A visual judge reviews the last screenshot to confirm the verdict.",
                )}
              </p>
              <div className="mt-8 -mb-16 translate-x-6 max-[734px]:-mb-10 max-[734px]:translate-x-4">
                <BrowserFrame url={proof?.final_url} className={proofMobile ? "max-w-[390px]" : ""}>
                  {proof?.screenshot_url ? (
                    // Through the image optimizer: WebP at the width the screen needs (Retina included), never above the
                    // capture's own pixels. About 4 times lighter than the PNG.
                    <Image
                      src={proof.screenshot_url}
                      alt={`${t("Capture réelle d'une mission bloquée", "Real screenshot of a blocked mission")} : ${blockerLabel(proof.blocker_type, lang)}`}
                      width={proofMobile ? 390 : 1024}
                      height={proofMobile ? 844 : 640}
                      sizes={proofMobile ? "390px" : "(min-width: 1024px) 510px, calc(100vw - 64px)"}
                      quality={85}
                      className="block h-auto w-full"
                    />
                  ) : (
                    <div className="aspect-[16/10] bg-bg-2" />
                  )}
                  <Verdict success={false} label={shortLabel(blockerLabel(proof?.blocker_type ?? "cookie_banner", lang))} className="absolute left-4 top-4 max-[734px]:left-3 max-[734px]:top-3" />
                </BrowserFrame>
              </div>
            </article>

            <article className="tile flex flex-col">
              <p className="type-eyebrow text-ink-2">{t("Corrections", "Fixes")}</p>
              <h3 className="type-h3 mt-3">{t("Un plan classé par impact.", "A plan ranked by impact.")}</h3>
              <p className="mt-3 text-ink-2">
                {t(
                  "Les blocages les plus fréquents d’abord, la correction à faire, et ton score face à celui d’un concurrent.",
                  "The most frequent blockers first, the fix to make, and your score next to a competitor's.",
                )}
              </p>
              <FixesVisual t={t} />
            </article>
          </div>

          <h3 className="type-h2 mt-20 max-[734px]:mt-14">{t("Ce que ton équipe en fait.", "What your team does with it.")}</h3>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {BENEFITS[lang].map(([title, text], i) => (
              <article key={title} className="tile">
                <Icon name={["search_failed", "doc", "trend"][i]} className="h-7 w-7 text-blue" />
                <h4 className="type-headline mt-5">{title}</h4>
                <p className="mt-2 text-ink-2">{text}</p>
              </article>
            ))}
          </div>
          <Chips className="mt-6">
            <Chip icon="nopay">{t("Arrêt avant le paiement", "Stops before payment")}</Chip>
            <Chip icon="eye">{t("Observé ≠ supposé", "Observed ≠ assumed")}</Chip>
            <Link href="/methode#paiement" className="type-small ml-1 text-link hover:underline">
              {t("En option : le test de paiement réel", "Optional: the real payment test")}
            </Link>
          </Chips>
        </div>
      </section>

      {/* Form */}
      <section id="tester" className="section scroll-mt-[96px] lg:scroll-mt-[52px]">
        <div className="mx-auto w-[min(692px,87.5%)]">
          <h2 className="type-h1 text-center">{t("Teste ton site.", "Test your site.")}</h2>
          <Chips className="mt-5 justify-center">
            <Chip icon="audit">{t("5 missions", "5 missions")}</Chip>
            <Chip icon="clock">{duration}</Chip>
          </Chips>
          <form action="/api/audits" method="post" className="mt-12 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Adresse de ton site", "Your site's address")} name="url" required />
              <Field label={t("Un concurrent (facultatif)", "A competitor (optional)")} name="competitor" />
            </div>
            <Field label={t("E-mail du rapport (facultatif)", "Report e-mail (optional)")} name="email" type="email" />
            <fieldset className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <legend className="sr-only">{t("Appareil", "Device")}</legend>
              <span className="text-ink-2" aria-hidden>
                {t("Appareil", "Device")}
              </span>
              <div className="grid w-full auto-cols-fr grid-flow-col rounded-[10px] bg-fill p-[3px] sm:inline-grid sm:w-auto">
                {[
                  ["desktop", t("Ordinateur", "Desktop")],
                  ["mobile", "Mobile"],
                  ["both", t("Ordinateur + Mobile", "Desktop + Mobile")],
                ].map(([v, l]) => (
                  <label key={v} className="relative cursor-pointer">
                    <input type="radio" name="device" value={v} defaultChecked={v === "desktop"} className="peer sr-only" />
                    <span className="type-small flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-2 font-semibold text-ink-2 sm:px-4 transition-colors duration-200 peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]">
                      <Icon name={v} className="h-[17px] w-[17px] max-sm:hidden" />
                      {/* A phone has no room for « Ordinateur + Mobile »: same choice, shorter word. */}
                      {v === "both" ? (
                        <>
                          <span className="sm:hidden">{t("Les deux", "Both")}</span>
                          <span className="max-sm:hidden">{l}</span>
                        </>
                      ) : (
                        l
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="type-caption -mt-1 flex items-center justify-end gap-1.5 text-ink-2">
              <Icon name="mobile" className="h-3.5 w-3.5" />
              {t("Mobile simulé · 390 × 844", "Simulated mobile · 390 × 844")}
            </p>
            <button className="btn mt-4 min-h-[56px] w-full rounded-[12px]">{t("Lancer l’audit", "Run the audit")}</button>
            <ol className="type-small mt-2 grid gap-2.5 px-1 text-ink-2" aria-label={t("Après le clic", "After the click")}>
              {(
                [
                  ...(user ? [] : [["mail", t("Lien de connexion par e-mail", "Sign-in link by e-mail")]]),
                  ["refresh", t("Déjà audité < 7 j : rapport existant", "Audited < 7 days ago: existing report")],
                  ["live", t("Rapport en direct, mission par mission", "Live report, mission by mission")],
                  [mails ? "mail" : "layers", mails ? t("Rapport final par e-mail", "Final report by e-mail") : t("Rapport gardé dans ton espace", "Report kept in your space")],
                ] as [string, string][]
              ).map(([icon, step], i) => (
                <li key={i} className="flex items-center gap-3">
                  <Icon name={icon} className="h-[18px] w-[18px]" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Chips className="justify-center">
              <Chip icon="nopay">{t("Jamais de paiement", "Never pays")}</Chip>
              <Chip icon="shield">{t("Aucune donnée perso", "No personal data")}</Chip>
              <Chip icon="captcha_or_bot_block">{t("Aucun captcha", "No captcha")}</Chip>
            </Chips>
            <p className="type-caption text-center text-ink-2">
              {t("Ton e-mail sert uniquement à t’envoyer le rapport ·", "Your e-mail is only used to send you the report ·")}{" "}
              <Link href="/confidentialite" className="text-link hover:underline">
                {t("confidentialité", "privacy")}
              </Link>
            </p>
          </form>
          <FormFaq lang={lang} t={t} />
        </div>
      </section>

      {/* Leaderboard */}
      <section id="classement" className="section scroll-mt-[96px] lg:scroll-mt-[52px] bg-bg-2">
        <div className="wrap">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 className="type-h1">{t("Le classement mode.", "The fashion ranking.")}</h2>
            <Link href="/classement" className="more type-intro">
              {t("Tout le classement", "Full ranking")}
            </Link>
          </div>
          {top?.length ? (
            <ol className="overflow-hidden rounded-[18px] bg-tile">
              {top.map((s, i) => (
                <li key={s.audit_id} className="border-b border-hairline last:border-0">
                  <Link
                    href={`/audit/${s.audit_id}`}
                    className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-4 px-6 py-5 transition-colors duration-200 hover:bg-bg-2/60 max-[734px]:px-5 sm:grid-cols-[1.75rem_1fr_12rem_5.5rem]"
                  >
                    <span className="text-ink-2 tnum">{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <SiteLogo domain={s.domain} name={s.name} />
                      <span className="type-headline truncate">{s.name}</span>
                    </span>
                    <span className="hidden sm:block">
                      <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_done ?? 0} size="sm" />
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="flex items-center justify-end gap-2 type-headline tnum">
                        <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4" />
                        {s.score ?? "—"} %
                      </span>
                      {/* The mission bar is hidden on phones: keep the coverage, so 100 % on 3 missions never reads like 100 % on 10. */}
                      <span className="type-caption whitespace-nowrap text-ink-2 tnum sm:hidden">
                        {t(`${s.runs_success ?? 0}/${s.runs_scored ?? 0} missions`, `${s.runs_success ?? 0}/${s.runs_scored ?? 0} missions`)}
                        {(s.runs_done ?? 0) > (s.runs_scored ?? 0) && t(` · ${s.runs_done - s.runs_scored} hors score`, ` · ${s.runs_done - s.runs_scored} out of score`)}
                      </span>
                      <ScoredNote short done={s.runs_scored ?? 0} out={(s.runs_done ?? 0) - (s.runs_scored ?? 0)} className="max-sm:hidden" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-[18px] bg-tile p-10 text-center">
              <p className="type-headline">{t("Les premiers audits tournent.", "The first audits are running.")}</p>
              <a href="#tester" className="more mt-1">
                {t("Teste ton site en attendant", "Test your site meanwhile")}
              </a>
            </div>
          )}
          {ranked.length > 0 && (
            <p className="type-small mt-5 text-ink-2">
              {t(`${ranked.length} sites classés sur ordinateur.`, `${ranked.length} sites ranked on desktop.`)}
              {gap && (
                <>
                  {" "}
                  {t(
                    `Sur les ${gap.n} sites audités aussi sur mobile, le score moyen passe de ${gap.desktop} % sur ordinateur à ${gap.mobile} % sur mobile.`,
                    `On the ${gap.n} sites also audited on mobile, the average score drops from ${gap.desktop} % on desktop to ${gap.mobile} % on mobile.`,
                  )}
                </>
              )}
            </p>
          )}
          <p className="type-small mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="pass" /> {t("70 % et plus : prêt pour les agents", "70 % and above: ready for agents")}</span>
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="warn" /> {t("40 à 69 % : fragile", "40 to 69 %: fragile")}</span>
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="fail" /> {t("Moins de 40 % : bloquant", "Below 40 %: blocking")}</span>
          </p>
          <Chips className="mt-3">
            <Chip icon="desktop">{t("2 derniers audits ordinateur", "Last 2 desktop audits")}</Chip>
            <Chip icon="mission_not_applicable">{t("Missions hors score exclues", "Out-of-score missions excluded")}</Chip>
          </Chips>
        </div>
      </section>

      <Pricing lang={lang} t={t} />

      <Team t={t} />

    </>
  );
}

// "Sélecteur de variante (taille, couleur...)" → "Sélecteur de variante": over a screenshot the long label wrapped and hid it.
const shortLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, "");

// The fix plan block that names this mission (« title »), split into its tagged lines. Null when the plan has none.
function fixFor(plan: string | null | undefined, title: string) {
  const blocks = (plan ?? "").split(/\n(?=\d+[.)]\s)/);
  const block = blocks.find((b) => /^\d+[.)]\s/.test(b) && b.split("\n")[0].includes(`« ${title} »`));
  if (!block) return null;
  const [head, ...lines] = block.split("\n");
  const get = (k: string) => lines.find((l) => l.startsWith(`${k} :`))?.slice(k.length + 2).trim().replace(/\s*;\s*juge visuel\s*:.*$/, "");
  const problem = head.replace(/^\d+[.)]\s*/, "").split(" · ")[0];
  const fix = get("Correction possible");
  return fix ? { problem, observed: get("Observé"), hypothesis: get("Hypothèse"), fix } : null;
}

type DemoData = {
  run: { id: number; blocker_type: string | null; screenshot_url: string | null; final_url: string | null; agent_answer: unknown; missions: unknown };
  audit: { id: string; device: string; finished_at: string | null; recommendations: string | null; sites: unknown };
};

function DemoStep({ t, n, title, children }: { t: T; n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="tile flex min-w-0 flex-col">
      <p className="type-eyebrow text-ink-2">{t(`Étape ${n}`, `Step ${n}`)}</p>
      <h3 className="type-h3 mt-2">{title}</h3>
      {children}
    </li>
  );
}

// A real mission, its screenshot, then the fix the report proposes: three still screens from one finished audit.
// No video, no autoplay, no sound; the screenshot has a text alternative and every step is plain text.
async function Demo({ demo, lang, t }: { demo: DemoData; lang: Lang; t: T }) {
  const { run, audit } = demo;
  const mission = run.missions as { title: string; position: number };
  const site = audit.sites as { domain: string; name: string };
  const raw = fixFor(audit.recommendations, mission.title);
  // The agent's report and the fix, in the interface language (translated once, then cached).
  const said = (run.agent_answer as { steps_summary?: string } | null)?.steps_summary;
  const [summary, observed, hypothesis, fixText] = await translate(
    [said, raw?.observed, raw?.hypothesis, raw?.fix],
    lang,
  );
  const fix = raw && { observed, hypothesis, fix: fixText ?? raw.fix };
  const date = audit.finished_at ? new Date(audit.finished_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "";
  const label = shortLabel(blockerLabel(run.blocker_type, lang));
  return (
    <section id="demo" className="section scroll-mt-[96px] lg:scroll-mt-[52px] bg-bg-2" aria-labelledby="demo-titre">
      <div className="wrap-wide">
        <h2 id="demo-titre" className="type-h1">{t("Un vrai rapport, en trois écrans.", "A real report, in three screens.")}</h2>
        <p className="type-intro mt-4 max-w-[720px] text-ink-2">
          {t(
            `Mission ${mission.position} de l’audit de ${site.name}, tel que le client le reçoit.`,
            `Mission ${mission.position} of the ${site.name} audit, as the client receives it.`,
          )}
        </p>
        <Chips className="mt-4">
          <Chip icon="play">{t("Enregistrement, pas un agent en direct", "Recording, not a live agent")}</Chip>
          <Chip icon={audit.device === "mobile" ? "mobile" : "desktop"}>{audit.device === "mobile" ? "Mobile" : t("Ordinateur", "Desktop")}</Chip>
          {date && <Chip icon="clock">{t(`Audit du ${date}`, `Audit of ${date}`)}</Chip>}
        </Chips>
        <ol className="mt-10 grid gap-5 max-[734px]:mt-8 lg:grid-cols-3">
          <DemoStep t={t} n={1} title={t("La mission", "The mission")}>
            <p className="mt-3 font-semibold">{missionTitle(mission.title, lang)}</p>
            {summary && (
              <blockquote className="type-small mt-3 border-l-2 border-line pl-3 text-ink-2">
                {summary}
              </blockquote>
            )}
            <p className="type-caption mt-3 text-ink-2">{summary !== said ? t("Le compte rendu de l’agent, traduit automatiquement.", "The agent’s own account, machine translated.") : t("Le compte rendu de l’agent, mot pour mot.", "The agent’s own account, word for word.")}</p>
          </DemoStep>
          <DemoStep t={t} n={2} title={t("La capture", "The screenshot")}>
            <div className="relative mt-4">
              <BrowserFrame url={run.final_url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={run.screenshot_url!}
                  alt={t(`Dernier écran vu par l’agent sur ${site.domain} : page produit, mission bloquée (${label}).`, `Last screen the agent saw on ${site.domain}: product page, mission blocked (${label}).`)}
                  className="block w-full"
                  loading="lazy"
                />
              </BrowserFrame>
            </div>
            <Verdict success={false} label={label} className="mt-4 self-start" />
            <p className="type-small mt-4 text-ink-2">{t("Le juge visuel relit cette capture avant de confirmer le verdict.", "The visual judge reviews this screenshot before confirming the verdict.")}</p>
          </DemoStep>
          <DemoStep t={t} n={3} title={t("La correction proposée", "The suggested fix")}>
            {fix ? (
              <dl className="type-small mt-3 space-y-2">
                {fix.observed && (
                  <div>
                    <dt className="inline font-semibold">{t("Observé : ", "Observed: ")}</dt>
                    <dd className="inline text-ink-2">{fix.observed}</dd>
                  </div>
                )}
                {fix.hypothesis && (
                  <div>
                    <dt className="inline font-semibold text-warn">{t("Hypothèse : ", "Hypothesis: ")}</dt>
                    <dd className="inline text-ink-2">{fix.hypothesis}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline font-semibold">{t("Correction possible : ", "Possible fix: ")}</dt>
                  <dd className="inline text-ink-2">{fix.fix}</dd>
                </div>
              </dl>
            ) : (
              <p className="type-small mt-3 text-ink-2">{t("Le plan de corrections est dans le rapport complet.", "The fix plan is in the full report.")}</p>
            )}
            <p className="type-caption mt-auto pt-4 text-ink-2">
              {t("Hypothèse et correction sont générées par IA : à vérifier avant d’agir.", "Hypothesis and fix are AI-generated: check them before acting.")}
            </p>
          </DemoStep>
        </ol>
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/audit/${audit.id}#mission-${mission.position}`} className="more">
            {t("Voir ce rapport complet", "See the full report")}
          </Link>
          <Link href={`/replay/${run.id}?a=${audit.id}`} className="more">
            {t("Rejouer la mission pas à pas", "Replay the mission step by step")}
          </Link>
        </p>
      </div>
    </section>
  );
}

// Three answers from the help centre, folded, under the form: the same text as /faq, one click to the rest.
function FormFaq({ lang, t }: { lang: Lang; t: T }) {
  return (
    <div className="mt-12">
      <h3 className="type-headline">{t("Avant de lancer", "Before you run it")}</h3>
      <div className="mt-3 overflow-hidden rounded-[18px] bg-bg-2 dark:bg-tile">
        {FORM_FAQ.map((f) => (
          <details key={f.id} className="group border-b border-hairline last:border-0">
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-4 px-5 py-3 font-medium transition-colors hover:bg-fill/40 [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{f.q[lang]}</span>
              <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-ink-2 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M1.5 4L6 8.5 10.5 4" />
              </svg>
            </summary>
            <div className="type-small -mt-1 px-5 pb-5 text-ink-2">
              <p>{f.a[lang]}</p>
              <Link href={`/faq#${f.id}`} className="mt-2 inline-block text-link hover:underline">
                {t("Dans l’aide", "In the help centre")}
              </Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// Who is behind it, from what is already public (legal notice, footer): no invented names, clients or quotes.
// First names and roles of the team members go here only once each of them agrees.
function Team({ t }: { t: T }) {
  return (
    <section id="equipe" className="section scroll-mt-[96px] lg:scroll-mt-[52px] bg-bg-2" aria-labelledby="equipe-titre">
      <div className="wrap">
        <h2 id="equipe-titre" className="type-h1">{t("Qui fait AgentProof.", "Who makes AgentProof.")}</h2>
        <div className="mt-10 grid gap-5 max-[734px]:mt-8 md:grid-cols-2">
          <article className="tile">
            <Icon name="agency" className="h-7 w-7 text-blue" />
            <h3 className="type-headline mt-5">{t("Une équipe de cinq étudiants", "A team of five students")}</h3>
            <p className="mt-2 text-ink-2">
              {t(
                "AgentProof est né au hackathon H Company × Hugging Face d’Eugenia School, en novembre 2026. L’équipe se partage le produit et la technique, les consignes de l’agent et la qualité du juge, les automatisations, la vérification des données et le business.",
                "AgentProof was built at the H Company × Hugging Face hackathon at Eugenia School, in November 2026. The team shares product and engineering, the agent’s instructions and the judge’s quality, automations, data checks and business.",
              )}
            </p>
            <p className="type-small mt-4 text-ink-2">
              {t("Responsable de la publication : ", "Publisher: ")}
              {LEGAL.publisher} ·{" "}
              <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">
                {LEGAL.contact}
              </a>
            </p>
          </article>
          <article className="tile">
            <Icon name="eye" className="h-7 w-7 text-blue" />
            <h3 className="type-headline mt-5">{t("Des preuves, pas des promesses", "Evidence, not promises")}</h3>
            <p className="mt-2 text-ink-2">
              {t(
                "Pas encore de client ni de partenaire. Les marques du classement sont des sites que nous avons audités sur leurs pages publiques : elles ne sont ni clientes ni partenaires. Chaque score renvoie à son rapport, avec captures et replays.",
                "No client or partner yet. The brands in the ranking are sites we audited on their public pages: they are neither clients nor partners. Every score links to its report, with screenshots and replays.",
              )}
            </p>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 type-small">
              <Link href="/methode" className="text-link hover:underline">{t("La méthode", "The method")}</Link>
              <Link href="/mentions-legales" className="text-link hover:underline">{t("Mentions légales", "Legal notice")}</Link>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function MissionsVisual({ t }: { t: T }) {
  const MISSIONS: [string, boolean, string?][] = [
    [t("Recherche « pull noir », taille M", "Search “black sweater”, size M"), true],
    [t("Menu, puis filtre", "Menu, then filter"), true],
    [t("Filtre de prix, moins de 60 €", "Price filter, under €60"), false, "Pop-up"],
    [t("Autre variante", "Other variant"), true],
    [t("Article en promotion", "Item on sale"), true],
  ];
  return (
    <div className="rounded-[18px] bg-bg-2 p-2 dark:bg-[#2c2c2e]" aria-hidden>
      <div className="flex items-center justify-between px-4 pb-3 pt-3">
        <span className="type-small font-semibold">{t("maison-exemple.fr", "maison-example.com")}</span>
        <span className="type-small text-ink-2 tnum">{t("4 sur 5", "4 of 5")}</span>
      </div>
      <ul className="overflow-hidden rounded-[12px] bg-tile">
        {MISSIONS.map(([m, ok, why]) => (
          <li key={m} className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-0">
            <StatusGlyph tone={ok ? "pass" : "fail"} className="h-5 w-5" />
            <span className="min-w-0 flex-1">{m}</span>
            {why && <span className="type-small text-fail">{why}</span>}
          </li>
        ))}
      </ul>
      <div className="px-4 pb-2 pt-4">
        <MissionBar ok={4} done={5} total={5} />
      </div>
    </div>
  );
}

function FixesVisual({ t }: { t: T }) {
  const rows: [string, number, string][] = [
    [t("Bandeau cookies", "Cookie banner"), 3, t("Le bouton « Tout accepter » doit rester visible sans défiler.", "The “Accept all” button must stay visible without scrolling.")],
    [t("Sélecteur de variante", "Variant selector"), 2, t("Les tailles et couleurs doivent être des boutons, pas des images.", "Sizes and colours must be buttons, not images.")],
  ];
  return (
    <div className="mt-8 space-y-3" aria-hidden>
      <p className="type-caption text-ink-2">{t("Exemple", "Example")}</p>
      {rows.map(([name, n, fix]) => (
        <div key={name} className="rounded-[18px] bg-bg-2 p-5 dark:bg-[#2c2c2e]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="type-headline">{name}</span>
            <span className="type-small text-ink-2 tnum">{n} missions</span>
          </div>
          <p className="type-small mt-2 text-ink-2">{fix}</p>
        </div>
      ))}
      <div className="rounded-[18px] bg-bg-2 p-5 dark:bg-[#2c2c2e]">
        <div className="type-small grid grid-cols-[6rem_1fr_3rem] items-center gap-3">
          <span className="font-semibold">{t("Ton site", "Your site")}</span>
          <MissionBar ok={2} done={5} total={5} size="sm" />
          <span className="text-right tnum">40 %</span>
          <span className="text-ink-2">{t("Concurrent", "Competitor")}</span>
          <MissionBar ok={4} done={5} total={5} size="sm" />
          <span className="text-right text-ink-2 tnum">80 %</span>
        </div>
      </div>
    </div>
  );
}

// A product page as the agent sees it. Plays once: the agent taps "Ajouter au panier", a cookie banner slides over it.
function ProductMock({ t }: { t: T }) {
  return (
    <div className="scheme-light relative flex aspect-[16/9] select-none flex-col bg-tile text-left text-ink max-[734px]:aspect-[4/3.6]" aria-hidden>
      <div className="flex items-center justify-between border-b border-hairline px-8 py-4 max-[734px]:px-4 max-[734px]:py-2.5">
        <span className="text-[13px] font-semibold tracking-[0.32em]">MAISON</span>
        <span className="flex gap-6 text-[12px] text-ink-2 max-[734px]:hidden">
          <span>{t("Femme", "Women")}</span>
          <span>{t("Homme", "Men")}</span>
          <span>{t("Nouveautés", "New in")}</span>
          <span>{t("Panier (0)", "Cart (0)")}</span>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-10 p-8 max-[734px]:gap-4 max-[734px]:p-4">
        <div className="relative overflow-hidden rounded-[6px] bg-[#ececee]">
          <svg viewBox="0 0 100 125" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
            <path d="M31 30l12-6h14l12 6 13 24-11 6-6-10v52H35V50l-6 10-11-6z" fill="#1d1d1f" />
            <path d="M43 24c2 5 12 5 14 0" fill="none" stroke="#3a3a3c" strokeWidth="1" />
          </svg>
        </div>
        <div className="flex flex-col pt-2 max-[734px]:pt-0">
          <span className="text-[11px] text-ink-2 max-[734px]:text-[9px]">{t("Mailles · Pulls", "Knitwear · Sweaters")}</span>
          <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.01em] max-[734px]:text-[14px]">{t("Pull col rond en laine", "Wool crew-neck sweater")}</p>
          <p className="mt-1 text-[15px] text-ink-2 tnum max-[734px]:text-[12px]">{t("49,90 €", "€49.90")}</p>
          <p className="mt-6 text-[12px] font-semibold max-[734px]:mt-3 max-[734px]:text-[10px]">{t("Taille", "Size")}</p>
          <div className="mt-2 flex gap-2 max-[734px]:gap-1">
            {["XS", "S", "M", "L", "XL"].map((sz) => (
              <span
                key={sz}
                className={`grid h-9 w-11 place-items-center rounded-[6px] border text-[12px] max-[734px]:h-6 max-[734px]:w-6 max-[734px]:text-[9px] ${sz === "M" ? "border-ink" : "border-line text-ink-2"}`}
              >
                {sz}
              </span>
            ))}
          </div>
          <span className="relative mt-auto block">
            <span className="flex h-12 items-center justify-center rounded-[6px] bg-ink text-[14px] font-semibold text-tile max-[734px]:h-8 max-[734px]:text-[10px]">
              {t("Ajouter au panier", "Add to cart")}
            </span>
            <AgentCursor x={0.62} y={0.55} animate />
          </span>
        </div>
      </div>

      {/* Cookie banner */}
      <div className="ap-banner absolute inset-x-0 bottom-0 z-10 h-[44%] border-t border-hairline bg-tile px-8 py-6 shadow-[0_-16px_40px_-12px_rgb(0_0_0/0.25)] max-[734px]:h-[46%] max-[734px]:px-4 max-[734px]:py-3">
        <p className="text-[15px] font-semibold max-[734px]:text-[11px]">{t("Nous respectons votre vie privée", "We respect your privacy")}</p>
        <p className="mt-1.5 max-w-[560px] text-[12px] leading-relaxed text-ink-2 max-[734px]:text-[9px]">
          {t(
            "Nous utilisons des cookies pour améliorer votre expérience, mesurer l’audience et personnaliser les contenus. Vous pouvez modifier vos choix à tout moment.",
            "We use cookies to improve your experience, measure our audience and personalise content. You can change your choices at any time.",
          )}
        </p>
        <div className="mt-4 flex gap-2 max-[734px]:mt-2">
          <span className="flex h-9 items-center rounded-[6px] bg-bg-2 px-4 text-[12px] text-ink-2 max-[734px]:h-6 max-[734px]:px-2 max-[734px]:text-[9px]">{t("Paramétrer", "Settings")}</span>
          <span className="flex h-9 items-center rounded-[6px] bg-bg-2 px-4 text-[12px] text-ink-2 max-[734px]:h-6 max-[734px]:px-2 max-[734px]:text-[9px]">{t("Continuer sans accepter", "Continue without accepting")}</span>
        </div>
      </div>

      <span className="absolute bottom-[24%] right-[4%] z-30 max-[734px]:inset-x-0 max-[734px]:bottom-auto max-[734px]:top-[15%] max-[734px]:flex max-[734px]:justify-center">
        <span className="ap-verdict">
          <Verdict success={false} label={t("Bandeau cookies", "Cookie banner")} />
        </span>
      </span>
    </div>
  );
}

// Offers from CONTEXT.md › Offres (prices still "à valider"). Payment is not wired: buttons go to the form or to e-mail.
type Plan = { icon: string; name: string; price: string; per?: string; pitch: string; items: string[]; cta: [string, string]; featured?: boolean };
const PLANS: Record<Lang, Plan[]> = {
  fr: [
    { icon: "ranking", name: "Classement", price: "Gratuit", pitch: "Ton site dans le classement public.", items: ["Score sur ordinateur", "Captures et replays des missions", "Mis à jour après chaque audit", "Pendant l’essai : 15 crédits par mois, soit jusqu’à 3 audits offerts avec l’agent rapide"], cta: ["Voir le classement", "/classement"] },
    { icon: "audit", name: "Audit complet", price: "490 €", per: "par site", pitch: "Le rapport pour savoir où l’agent bloque et quoi corriger.", items: ["Cinq missions d’achat, ordinateur ou mobile", "Preuves : capture et replay de chaque mission", "Comparaison avec un concurrent", "Plan de corrections classé par impact, en PDF"], cta: ["Lancer un audit", "#tester"] },
    { icon: "monthly", name: "Suivi mensuel", price: "149 €", per: "par mois", pitch: "La preuve, chaque mois, que les agents achètent encore chez toi.", items: ["Un audit complet automatique chaque mois, et ton rang face aux autres sites", "150 crédits par mois, audit automatique compris : 5 par audit avec l’agent rapide, 8 avec l’agent précis", "Pages relues chaque jour et après chaque mise en ligne, sans agent ni crédit", "Suivi de robots.txt, de l’anti-bot et des protocoles UCP, ACP, WebMCP", "Alerte Slack et e-mail quand une page change ou que le score baisse", "Le bilan du mois : vérifications, alertes, corrections prouvées"], cta: ["Lancer un audit", "#tester"], featured: true },
    { icon: "agency", name: "Agences", price: "30 %", per: "de commission", pitch: "Revends l’audit à tes clients, sous ta marque.", items: ["Rapports et PDF en marque blanche", "Un espace d’équipe pour tous tes clients", "30 % de commission sur chaque audit revendu"], cta: ["Nous contacter", `mailto:${LEGAL.contact}?subject=AgentProof%20%E2%80%93%20agence`] },
  ],
  en: [
    { icon: "ranking", name: "Ranking", price: "Free", pitch: "Your site in the public ranking.", items: ["Desktop score", "Mission screenshots and replays", "Updated after every audit", "During the trial: 15 credits a month, that is up to 3 free audits with the fast agent"], cta: ["See the ranking", "/classement"] },
    { icon: "audit", name: "Full audit", price: "€490", per: "per site", pitch: "The report that shows where the agent gets stuck and what to fix.", items: ["Five shopping missions, desktop or mobile", "Proof: screenshot and replay of every mission", "Comparison with a competitor", "Fix plan ranked by impact, as a PDF"], cta: ["Run an audit", "#tester"] },
    { icon: "monthly", name: "Monthly tracking", price: "€149", per: "per month", pitch: "Proof, every month, that agents can still buy from you.", items: ["An automatic full audit every month, and your rank against other sites", "150 credits a month, the automatic audit included: 5 per audit with the fast agent, 8 with the precise agent", "Pages read daily and after every release, without the agent and without credits", "Tracking of robots.txt, anti-bot and the UCP, ACP, WebMCP protocols", "Slack and e-mail alert when a page changes or the score drops", "The month in review: checks, alerts, proven fixes"], cta: ["Run an audit", "#tester"], featured: true },
    { icon: "agency", name: "Agencies", price: "30 %", per: "commission", pitch: "Resell the audit to your clients, under your brand.", items: ["White-label reports and PDFs", "One team space for all your clients", "30 % commission on every audit you resell"], cta: ["Contact us", `mailto:${LEGAL.contact}?subject=AgentProof%20%E2%80%93%20agency`] },
  ],
};

function Pricing({ lang, t }: { lang: Lang; t: T }) {
  return (
    <section id="tarifs" className="section scroll-mt-[96px] lg:scroll-mt-[52px]">
      <div className="wrap-wide">
        <h2 className="type-h1">{t("Tarifs.", "Pricing.")}</h2>
        <ul className="mt-12 grid gap-5 max-[734px]:mt-8 md:grid-cols-2 xl:grid-cols-4">
          {PLANS[lang].map((p) => (
            <li key={p.name} className={`relative flex flex-col rounded-[30px] bg-bg-2 p-10 dark:bg-tile max-[1068px]:rounded-[25px] max-[734px]:rounded-[20px] max-[734px]:px-6 max-[734px]:py-7 xl:px-8 ${p.featured ? "shadow-[inset_0_0_0_2px_var(--blue)]" : ""}`}>
              {p.featured && (
                <span className="type-caption absolute -top-3 left-10 rounded-full bg-blue px-3 py-0.5 font-semibold text-white max-[734px]:left-6 xl:left-8">{t("Recommandé", "Recommended")}</span>
              )}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 type-headline">
                  <Icon name={p.icon} className={`h-5 w-5 ${p.featured ? "text-blue" : "text-ink-2"}`} />
                  {p.name}
                </span>
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="type-h2 tnum">{p.price}</span>
                {p.per && <span className="type-small text-ink-2">{p.per}</span>}
              </p>
              <p className="mt-3 text-ink-2">{p.pitch}</p>
              <ul className="type-small mt-6 grid gap-2.5 border-t border-hairline pt-5">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2.5">
                    <Icon name="none" className="mt-[2px] h-4 w-4 text-ink-2" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                {p.cta[1].startsWith("/") ? (
                  <Link href={p.cta[1]} className="btn btn-secondary w-full">{p.cta[0]}</Link>
                ) : (
                  <a href={p.cta[1]} className={`btn w-full ${p.featured ? "" : "btn-secondary"}`}>{p.cta[0]}</a>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Chips className="mt-5">
          <Chip icon="info">{t("Prix HT", "Excl. VAT")}</Chip>
        </Chips>
        {/* Trial, one-off audit, monthly plan: the same rules as the FAQ (lib/faq.ts › offres, essai-ou-audit) and the
            plan screen (espace/abonnement), from lib/credits.ts. Nothing promised that the product does not do. */}
        <dl className="type-small mt-8 grid gap-x-8 gap-y-5 border-t border-hairline pt-6 text-ink-2 md:grid-cols-3">
          {OFFER_RULES[lang].map(([title, text]) => (
            <div key={title}>
              <dt className="font-semibold text-ink">{title}</dt>
              <dd className="mt-1">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="type-small mt-5">
          <Link href="/faq#offres" className="text-link hover:underline">
            {t("Toutes les questions sur les offres et les crédits", "All questions about plans and credits")}
          </Link>
        </p>
      </div>
    </section>
  );
}

// What separates the free trial, the €490 audit and the €149 plan. Today the audit is the same report for everyone:
// the trial gives it for free, it is not a lighter version.
const OFFER_RULES: Record<Lang, [string, string][]> = {
  fr: [
    ["Pendant l’essai", "Le paiement en ligne n’est pas encore ouvert. L’audit lancé ici est le même que l’audit complet à 490 € (cinq missions, preuves, comparaison, plan de corrections en PDF), et il est offert : 15 crédits par mois, soit jusqu’à 3 audits avec l’agent rapide (5 crédits chacun, 8 avec l’agent précis). Au-delà, rien n’est bloqué ni facturé."],
    ["Audit complet, 490 €", "Un rapport ponctuel sur un site, ordinateur ou mobile. Tu le relances toi-même si tu veux vérifier une correction."],
    ["Suivi mensuel, 149 €", "L’audit revient tout seul chaque mois et tes pages sont relues chaque jour. Les 150 crédits du mois servent aux audits, automatiques ou relancés à la main."],
  ],
  en: [
    ["During the trial", "Online payment is not open yet. The audit you run here is the same as the €490 full audit (five missions, proof, comparison, fix plan as a PDF), and it is free: 15 credits a month, that is up to 3 audits with the fast agent (5 credits each, 8 with the precise agent). Beyond that, nothing is blocked or charged."],
    ["Full audit, €490", "A one-off report on one site, desktop or mobile. You rerun it yourself if you want to check a fix."],
    ["Monthly tracking, €149", "The audit comes back on its own every month and your pages are read every day. The month's 150 credits pay for audits, automatic or run by hand."],
  ],
};

// What a team does with the report: each line maps to a feature that exists (report, replay, plan, re-audit, competitor).
const BENEFITS: Record<Lang, [string, string][]> = {
  fr: [
    ["Repérer les obstacles", "Mission par mission : où l’agent bloque, et ce qui fait baisser ton score."],
    ["Transmettre des preuves", "Capture, replay pas à pas et plan de corrections, prêts pour tes développeurs."],
    ["Suivre les corrections", "Relance après une correction pour voir si la mission passe. Compare-toi à un concurrent."],
  ],
  en: [
    ["Spot the obstacles", "Mission by mission: where the agent gets stuck, and what lowers your score."],
    ["Hand over evidence", "Screenshot, step-by-step replay and fix plan, ready for your developers."],
    ["Track the fixes", "Rerun after a fix to see if the mission passes. Compare yourself with a competitor."],
  ],
};
