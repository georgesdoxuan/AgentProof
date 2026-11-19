import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { currentUser } from "@/lib/auth";
import { AgentCursor, BrowserFrame, Chip, Chips, Field, Icon, MissionBar, StatusGlyph, Verdict, blockerLabel, scoreTone } from "@/lib/ui";
import { tr, type Lang, type T } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { byRank } from "../classement/board";
import { LEGAL } from "@/lib/legal";
import { SiteLogo } from "../site-logo";

// Report opened by "Voir un exemple de rapport": real counted blockers, captures, replays and a plan. Env var to swap it without code.
const EXAMPLE_AUDIT = process.env.EXAMPLE_AUDIT_ID ?? "8c843d3f-3d95-4834-aace-21880a85f499"; // Promod, 78 %
// The "Preuves" tile shows one chosen blocked mission, not the latest failure: a new audit must never swap in an unreadable capture.
const PROOF_RUN = Number(process.env.PROOF_RUN_ID ?? 228); // Promod, product page with no size selector

export default async function Home() {
  await connection();
  const lang = await getLang();
  const t = tr(lang);
  const [user, { data: scores }, { data: proof }] = await Promise.all([
    currentUser(),
    db.from("site_scores").select("*"),
    // A real blocked mission for the "Preuves" tile: evidence over illustration.
    db.from("runs").select("screenshot_url, final_url, blocker_type").eq("id", PROOF_RUN).maybeSingle(),
  ]);

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

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden pt-[88px] text-center max-[734px]:pt-14">
        <div className="wrap">
          <h1 className="type-hero ap-fade">{t("Vérifie qu’un agent IA peut acheter sur ta boutique.", "Check that an AI agent can buy from your store.")}</h1>
          <p className="type-subhead ap-fade mx-auto mt-5 max-w-[640px] text-ink-2 [animation-delay:0.2s]">
            {t(
              "Cookies, pop-up, sélecteur de taille : on te montre où il bloque, captures à l’appui, et quoi corriger. Gratuit, aucun achat réel.",
              "Cookies, pop-ups, size selector: we show you where it gets stuck, with screenshots, and what to fix. Free, no real purchase.",
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
            {/* Each part stays whole, so a narrow screen breaks the line at a "·", never inside "10 à 20 min". */}
            {(lang === "en" ? ["Free", "your URL and your e-mail", "report in 10 to 20 min"] : ["Gratuit", "ton URL et ton e-mail", "rapport en 10 à 20 min"]).map((part, i) => (
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
              "L’agent clique sur « Ajouter au panier ». Un bandeau cookies surgit et le recouvre. La mission s’arrête là.",
              "The agent clicks “Add to cart”. A cookie banner pops up and covers it. The mission ends there.",
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
                Demain, des agents IA feront les courses à la place de tes clients.{" "}
                <span className="text-ink">Un bandeau cookies, une pop-up ou un sélecteur de taille suffit à les arrêter.</span> Ils achètent alors ailleurs. Et{" "}
                <span className="text-ink">63 % des responsables e-commerce</span> pensent que leur tunnel d&apos;achat ne passerait pas le test.
              </>,
              <>
                Tomorrow, AI agents will shop on behalf of your customers.{" "}
                <span className="text-ink">A cookie banner, a pop-up or a size selector is enough to stop them.</span> Then they buy elsewhere. And{" "}
                <span className="text-ink">63 % of e-commerce managers</span> think their checkout funnel would not pass the test.
              </>,
            )}
            <sup className="ml-0.5 align-super text-[0.4em]">
              <a href="#note-1" className="text-link" aria-label="Note 1">
                1
              </a>
            </sup>
          </p>
        </div>
      </section>

      {/* What you get */}
      <section id="ce-que-tu-recois" className="section scroll-mt-[96px] lg:scroll-mt-[52px] bg-bg-2">
        <div className="wrap-wide">
          <h2 className="type-h1 mb-12 max-[734px]:mb-8">{t("Ce que tu reçois.", "What you get.")}</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <article className="tile grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:col-span-2 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="type-eyebrow text-ink-2">Missions</p>
                <h3 className="type-h2 mt-3">{t("Cinq parcours d’achat testés, sans paiement.", "Five purchase journeys tested, no payment.")}</h3>
                <p className="mt-4 max-w-[440px] text-ink-2">
                  {t(
                    "L’agent cherche, filtre, choisit une taille et remplit le panier, comme un client. Il s’arrête à la première page du checkout.",
                    "The agent searches, filters, picks a size and fills the cart, like a customer. It stops at the first checkout page.",
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
                <BrowserFrame url={proof?.final_url}>
                  {proof?.screenshot_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proof.screenshot_url} alt={`${t("Capture réelle d'une mission bloquée", "Real screenshot of a blocked mission")} : ${blockerLabel(proof.blocker_type, lang)}`} className="block w-full" loading="lazy" />
                  ) : (
                    <div className="aspect-[16/10] bg-bg-2" />
                  )}
                  <Verdict success={false} label={blockerLabel(proof?.blocker_type ?? "cookie_banner", lang)} className="absolute left-4 top-4" />
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
              {t("La suite : le paiement", "Next step: the payment")}
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
            <Chip icon="clock">10–20 min</Chip>
          </Chips>
          <form action="/api/audits" method="post" className="mt-12 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Adresse de ton site", "Your site's address")} name="url" required />
              <Field label={t("Un concurrent (facultatif)", "A competitor (optional)")} name="competitor" />
            </div>
            <Field label={t("E-mail du rapport (par défaut : ton adresse de connexion)", "Report e-mail (default: your sign-in address)")} name="email" type="email" />
            <fieldset className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <legend className="sr-only">{t("Appareil", "Device")}</legend>
              <span className="text-ink-2" aria-hidden>
                {t("Appareil", "Device")}
              </span>
              <div className="inline-grid grid-cols-2 rounded-[10px] bg-fill p-[3px]">
                {[
                  ["desktop", t("Ordinateur", "Desktop")],
                  ["mobile", "Mobile"],
                ].map(([v, l]) => (
                  <label key={v} className="relative cursor-pointer">
                    <input type="radio" name="device" value={v} defaultChecked={v === "desktop"} className="peer sr-only" />
                    <span className="type-small flex h-9 min-w-[120px] items-center justify-center rounded-[8px] px-4 font-semibold text-ink-2 transition-colors duration-200 peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]">
                      {l}
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
                      <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} size="sm" />
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="flex items-center justify-end gap-2 type-headline tnum">
                        <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4" />
                        {s.score ?? "—"} %
                      </span>
                      {/* The mission bar is hidden on phones: keep the coverage, so 100 % on 3 missions never reads like 100 % on 10. */}
                      <span className="type-caption whitespace-nowrap text-ink-2 tnum sm:hidden">
                        {t(`${s.runs_success ?? 0}/${s.runs_scored ?? 0} missions`, `${s.runs_success ?? 0}/${s.runs_scored ?? 0} missions`)}
                      </span>
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
            <Chip icon="mission_not_applicable">{t("Hors missions sans lien", "Unrelated missions excluded")}</Chip>
          </Chips>
        </div>
      </section>

      <Pricing lang={lang} t={t} />

      <div>
        <ol className="wrap-wide type-caption pb-6 text-ink-2">
          <li id="note-1" className="scroll-mt-20">
            1.{" "}
            {t(
              "Blend Commerce, sondage auprès de 59 responsables e-commerce, juillet–août 2026 : leur tunnel d’achat ne peut pas être finalisé par un agent IA.",
              "Blend Commerce, survey of 59 e-commerce managers, July–August 2026: their checkout funnel cannot be completed by an AI agent.",
            )}
          </li>
        </ol>
      </div>
    </>
  );
}

function MissionsVisual({ t }: { t: T }) {
  const MISSIONS: [string, boolean, string?][] = [
    [t("Recherche « pull noir », taille M", "Search “black sweater”, size M"), true],
    [t("Menu, puis filtre de taille", "Menu, then size filter"), true],
    [t("Filtre de prix, moins de 60 €", "Price filter, under €60"), false, "Pop-up"],
    [t("Variante couleur", "Colour variant"), true],
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
            <span className="min-w-0 flex-1 truncate">{m}</span>
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
    [t("Sélecteur de taille", "Size selector"), 2, t("Les tailles doivent être des boutons, pas des images.", "Sizes must be buttons, not images.")],
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
    { icon: "ranking", name: "Classement", price: "Gratuit", pitch: "Ton site dans le classement public des sites mode.", items: ["Score sur ordinateur", "Captures et replays des missions", "Mis à jour après chaque audit", "Pendant l’essai : 15 crédits par mois, soit 3 audits complets offerts"], cta: ["Voir le classement", "/classement"] },
    { icon: "audit", name: "Audit complet", price: "490 €", per: "par site", pitch: "Le rapport pour savoir où l’agent bloque et quoi corriger.", items: ["Cinq missions d’achat, ordinateur ou mobile", "Preuves : capture et replay de chaque mission", "Comparaison avec un concurrent", "Plan de corrections classé par impact, en PDF"], cta: ["Lancer un audit", "#tester"] },
    { icon: "monthly", name: "Suivi mensuel", price: "149 €", per: "par mois", pitch: "La preuve, chaque mois, que les agents achètent encore chez toi.", items: ["Un audit complet automatique chaque mois, et ton rang face aux autres sites", "150 crédits par mois pour relancer des audits quand tu veux (5 crédits par audit, l’audit automatique compris)", "Pages relues chaque jour et après chaque mise en ligne, sans agent ni crédit", "Suivi de robots.txt, de l’anti-bot et des protocoles UCP, ACP, WebMCP", "Alerte Slack et e-mail quand une page change ou que le score baisse", "Le bilan du mois : vérifications, alertes, corrections prouvées"], cta: ["Lancer un audit", "#tester"], featured: true },
    { icon: "agency", name: "Agences", price: "30 %", per: "de commission", pitch: "Revends l’audit à tes clients, sous ta marque.", items: ["Rapports et PDF en marque blanche", "Un espace d’équipe pour tous tes clients", "30 % de commission sur chaque audit revendu"], cta: ["Nous contacter", `mailto:${LEGAL.contact}?subject=AgentProof%20%E2%80%93%20agence`] },
  ],
  en: [
    { icon: "ranking", name: "Ranking", price: "Free", pitch: "Your site in the public ranking of fashion sites.", items: ["Desktop score", "Mission screenshots and replays", "Updated after every audit", "During the trial: 15 credits a month, that is 3 full audits free"], cta: ["See the ranking", "/classement"] },
    { icon: "audit", name: "Full audit", price: "€490", per: "per site", pitch: "The report that shows where the agent gets stuck and what to fix.", items: ["Five shopping missions, desktop or mobile", "Proof: screenshot and replay of every mission", "Comparison with a competitor", "Fix plan ranked by impact, as a PDF"], cta: ["Run an audit", "#tester"] },
    { icon: "monthly", name: "Monthly tracking", price: "€149", per: "per month", pitch: "Proof, every month, that agents can still buy from you.", items: ["An automatic full audit every month, and your rank against other sites", "150 credits a month to rerun audits whenever you want (5 credits per audit, the automatic one included)", "Pages read daily and after every release, without the agent and without credits", "Tracking of robots.txt, anti-bot and the UCP, ACP, WebMCP protocols", "Slack and e-mail alert when a page changes or the score drops", "The month in review: checks, alerts, proven fixes"], cta: ["Run an audit", "#tester"], featured: true },
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
    ["Pendant l’essai", "Le paiement en ligne n’est pas encore ouvert. L’audit lancé ici est le même que l’audit complet à 490 € (cinq missions, preuves, comparaison, plan de corrections en PDF), et il est offert : 15 crédits par mois, soit 3 audits. Au-delà, rien n’est bloqué ni facturé."],
    ["Audit complet, 490 €", "Un rapport ponctuel sur un site, ordinateur ou mobile. Tu le relances toi-même si tu veux vérifier une correction."],
    ["Suivi mensuel, 149 €", "L’audit revient tout seul chaque mois et tes pages sont relues chaque jour. Les 150 crédits du mois servent aux audits, automatiques ou relancés à la main."],
  ],
  en: [
    ["During the trial", "Online payment is not open yet. The audit you run here is the same as the €490 full audit (five missions, proof, comparison, fix plan as a PDF), and it is free: 15 credits a month, that is 3 audits. Beyond that, nothing is blocked or charged."],
    ["Full audit, €490", "A one-off report on one site, desktop or mobile. You rerun it yourself if you want to check a fix."],
    ["Monthly tracking, €149", "The audit comes back on its own every month and your pages are read every day. The month's 150 credits pay for audits, automatic or run by hand."],
  ],
};

// What a team does with the report: each line maps to a feature that exists (report, replay, plan, re-audit, competitor).
const BENEFITS: Record<Lang, [string, string][]> = {
  fr: [
    ["Repérer les obstacles", "Mission par mission : où l'agent bloque, et ce qui fait baisser ton score."],
    ["Transmettre des preuves", "Capture, replay pas à pas et plan de corrections, prêts pour tes développeurs."],
    ["Suivre les corrections", "Relance après une correction pour voir si la mission passe. Compare-toi à un concurrent."],
  ],
  en: [
    ["Spot the obstacles", "Mission by mission: where the agent gets stuck, and what lowers your score."],
    ["Hand over evidence", "Screenshot, step-by-step replay and fix plan, ready for your developers."],
    ["Track the fixes", "Rerun after a fix to see if the mission passes. Compare yourself with a competitor."],
  ],
};
