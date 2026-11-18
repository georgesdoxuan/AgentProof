import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { currentUser } from "@/lib/auth";
import { AgentCursor, BrowserFrame, Field, MissionBar, StatusGlyph, Verdict, blockerLabel, scoreTone } from "@/lib/ui";
import { tr, type Lang, type T } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

// Report opened by "Voir un exemple de rapport": real counted blockers, captures, replays and a plan. Env var to swap it without code.
const EXAMPLE_AUDIT = process.env.EXAMPLE_AUDIT_ID ?? "8c843d3f-3d95-4834-aace-21880a85f499"; // Promod, 78 %

export default async function Home() {
  await connection();
  const lang = await getLang();
  const t = tr(lang);
  const [user, { data: top }, { data: proof }] = await Promise.all([
    currentUser(),
    db.from("site_scores").select("*").eq("device", "desktop").order("score", { ascending: false, nullsFirst: false }).limit(5),
    // A real blocked mission for the "Preuves" tile: evidence over illustration.
    db
      .from("runs")
      .select("screenshot_url, final_url, blocker_type")
      .eq("success", false)
      .not("screenshot_url", "is", null)
      .not("blocker_type", "in", "(captcha_or_bot_block,out_of_stock,mission_not_applicable,agent_out_of_steps,agent_tool_error,other)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // The report e-mail goes through n8n: only announce it when that hook is configured.
  const mails = !!process.env.N8N_NOTIFY_URL;

  return (
    <>
      <SectionMenu lang={lang} />

      {/* Hero */}
      <section className="overflow-hidden pt-[88px] text-center max-[734px]:pt-14">
        <div className="wrap">
          <h1 className="type-hero ap-fade">{t("Un agent IA essaie d’acheter sur ton site.", "An AI agent tries to buy on your site.")}</h1>
          <p className="type-subhead ap-fade mx-auto mt-5 max-w-[640px] text-ink-2 [animation-delay:0.2s]">
            {t("AgentProof te montre où il bloque. Preuves à l’appui.", "AgentProof shows you where it gets stuck. With proof.")}
          </p>
          <div className="ap-fade mt-8 flex flex-wrap items-center justify-center gap-x-[17px] gap-y-2 [animation-delay:0.4s]">
            <a href="#tester" className="btn">
              {t("Tester mon site", "Test my site")}
            </a>
            <Link href={`/audit/${EXAMPLE_AUDIT}`} className="more">
              {t("Voir un exemple de rapport", "See a sample report")}
            </Link>
            <Link href="/classement" className="more">
              {t("Voir le classement", "See the ranking")}
            </Link>
          </div>
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
      <section id="pourquoi" className="section scroll-mt-[96px]">
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
      <section id="ce-que-tu-recois" className="section scroll-mt-[96px] bg-bg-2">
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
            {BENEFITS[lang].map(([title, text]) => (
              <article key={title} className="tile">
                <h4 className="type-headline">{title}</h4>
                <p className="mt-2 text-ink-2">{text}</p>
              </article>
            ))}
          </div>
          <p className="type-small mt-5 max-w-[760px] text-ink-2">
            {t(
              "Le test s’arrête à l’entrée du checkout : le paiement n’est pas testé. Le rapport sépare ce que l’agent a observé des causes supposées, à vérifier par ton équipe.",
              "The test stops at the checkout entrance: payment is not tested. The report keeps what the agent observed apart from assumed causes, for your team to check.",
            )}
          </p>
        </div>
      </section>

      {/* Form */}
      <section id="tester" className="section scroll-mt-[96px]">
        <div className="mx-auto w-[min(692px,87.5%)]">
          <h2 className="type-h1 text-center">{t("Teste ton site.", "Test your site.")}</h2>
          <p className="type-intro mt-4 text-center text-ink-2">
            {t(
              "Cinq missions d’achat, 10 à 20 minutes. Le rapport s’ouvre tout de suite et se remplit pendant l’audit.",
              "Five shopping missions, 10 to 20 minutes. The report opens right away and fills in during the audit.",
            )}
          </p>
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
            <button className="btn mt-4 min-h-[56px] w-full rounded-[12px]">{t("Lancer l’audit", "Run the audit")}</button>
            <div className="type-small mt-2 rounded-[12px] bg-bg-2 p-5 text-ink-2 dark:bg-[#2c2c2e]">
              <p className="font-semibold text-ink">{t("Après le clic", "After the click")}</p>
              <ol className="mt-2 grid gap-2">
                {[
                  ...(user
                    ? []
                    : [t("Tu te connectes avec le lien reçu par e-mail, sans mot de passe. Tu retrouves ce formulaire rempli et tu cliques à nouveau pour lancer.", "You sign in with the link sent by e-mail, no password. You get this form back, filled in, and click again to run it.")]),
                  t("Si ton équipe a audité ce site sur le même appareil ces 7 derniers jours, tu arrives sur ce rapport, sans nouvel audit.", "If your team audited this site on the same device in the last 7 days, you land on that report, with no new audit."),
                  t("Sinon, l’agent démarre les cinq missions et le rapport s’ouvre tout de suite : il se remplit mission par mission, en 10 à 20 minutes.", "Otherwise the agent starts the five missions and the report opens right away: it fills in mission by mission, in 10 to 20 minutes."),
                  mails
                    ? t("À la fin, le rapport t’est aussi envoyé par e-mail. Il reste dans ton espace d’équipe.", "At the end, the report is also sent to you by e-mail. It stays in your team space.")
                    : t("À la fin, le rapport reste dans ton espace d’équipe.", "At the end, the report stays in your team space."),
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="tnum font-semibold text-ink">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="type-small text-center text-ink-2">
              {t(
                "Pendant l’audit, l’agent ne paie jamais et ne saisit aucune donnée personnelle. Ton e-mail sert uniquement à t’envoyer le rapport :",
                "During the audit, the agent never pays and enters no personal data. Your e-mail is only used to send you the report:",
              )}{" "}
              <Link href="/confidentialite" className="text-link hover:underline">
                {t("confidentialité", "privacy")}
              </Link>
              .
            </p>
          </form>
        </div>
      </section>

      {/* Leaderboard */}
      <section id="classement" className="section scroll-mt-[96px] bg-bg-2">
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
                    <span className="type-headline truncate">{s.name}</span>
                    <span className="hidden sm:block">
                      <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} size="sm" />
                    </span>
                    <span className="flex items-center justify-end gap-2 type-headline tnum">
                      <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4" />
                      {s.score ?? "—"} %
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
          <p className="type-small mt-5 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="pass" /> {t("70 % et plus : prêt pour les agents", "70 % and above: ready for agents")}</span>
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="warn" /> {t("40 à 69 % : fragile", "40 to 69 %: fragile")}</span>
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="fail" /> {t("Moins de 40 % : bloquant", "Below 40 %: blocking")}</span>
          </p>
          <p className="type-small mt-2 text-ink-2">
            {t(
              "Chaque site est noté sur ses 2 derniers audits sur ordinateur, 5 missions chacun, hors missions sans lien avec le site.",
              "Each site is scored on its last 2 desktop audits, 5 missions each, leaving out missions unrelated to the site.",
            )}
          </p>
        </div>
      </section>

      <div className="bg-bg-2">
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

// What a team does with the report: each line maps to a feature that exists (report, replay, plan, re-audit, competitor).
const BENEFITS: Record<Lang, [string, string][]> = {
  fr: [
    ["Repérer les obstacles", "Mission par mission, tu vois où l'agent bloque sur les parcours testés, et ce qui fait baisser ton score."],
    ["Transmettre des preuves", "Capture, replay pas à pas et plan de corrections : de quoi montrer le problème à tes développeurs, sans le reproduire à la main."],
    ["Suivre les corrections", "Relance un audit après une correction : le nouveau rapport montre si la mission passe. Compare-toi à un concurrent sur les mêmes missions."],
  ],
  en: [
    ["Spot the obstacles", "Mission by mission, you see where the agent gets stuck on the tested journeys, and what lowers your score."],
    ["Hand over evidence", "Screenshot, step-by-step replay and fix plan: enough to show the problem to your developers without reproducing it by hand."],
    ["Track the fixes", "Run a new audit after a fix: the new report shows whether the mission passes. Compare yourself with a competitor on the same missions."],
  ],
};

const SECTIONS: Record<Lang, [string, string][]> = {
  fr: [
    ["pourquoi", "Pourquoi"],
    ["ce-que-tu-recois", "Ce que tu reçois"],
    ["tester", "Tester"],
    ["classement", "Classement"],
  ],
  en: [
    ["pourquoi", "Why"],
    ["ce-que-tu-recois", "What you get"],
    ["tester", "Test"],
    ["classement", "Ranking"],
  ],
};

// Second sticky bar, under the site header: jumps to the sections of this page (native anchors, smooth scroll in CSS).
function SectionMenu({ lang }: { lang: Lang }) {
  return (
    <nav aria-label={lang === "en" ? "Page sections" : "Sections de la page"} className="sticky top-[52px] z-30 border-b border-hairline bg-[var(--nav)] backdrop-blur-[20px] backdrop-saturate-[180%]">
      <ul className="wrap-wide type-caption flex h-11 items-center justify-center gap-x-5 overflow-hidden max-[400px]:gap-x-3">
        {SECTIONS[lang].map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="inline-flex h-11 items-center whitespace-nowrap text-ink/80 transition-colors hover:text-ink">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
