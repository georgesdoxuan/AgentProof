import Link from "next/link";
import { LEGAL, LEGAL_EN } from "@/lib/legal";
import { getLang } from "@/lib/lang";
import { BLOCKERS, EXCLUDED, blockerNames } from "@/lib/engine";
import { BlockerIcon, Chip, Chips, DeviceTag, Icon, MISSION_TYPES, MissionIcon, StatusGlyph } from "@/lib/ui";
import { missionTitle, tr } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Method" : "Méthode"} · AgentProof` };
}

const Section = ({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) => (
  <section id={id} className="mt-12 scroll-mt-[96px]">
    <h2 className="type-h3">{title}</h2>
    <div className="mt-3 space-y-3 text-ink-2">{children}</div>
  </section>
);

const lk = "text-link hover:underline";

// The marks used in reports, ranking and team space, with their meaning: statuses, blockers, devices.
function Legend({ lang }: { lang: "fr" | "en" }) {
  const en = lang === "en";
  const names = blockerNames(lang);
  const statuses = [
    ["pass", en ? "Passed" : "Réussie", en ? "the agent reached the first checkout page." : "l’agent a atteint la première page du checkout."],
    ["fail", en ? "Blocked" : "Bloquée", en ? "the site stopped the agent: counts against the score." : "le site a arrêté l’agent : compte contre le score."],
    ["none", en ? "Out of score" : "Hors score", en ? "nothing to do with the site’s interface (stock, anti-bot, agent)." : "sans lien avec l’interface du site (stock, anti-bot, agent)."],
    ["unsure", en ? "Unverified / to be confirmed" : "Non vérifiée / à confirmer", en ? "the judge could not decide: left out of the score." : "le juge n’a pas pu trancher : sort du score."],
  ] as const;
  return (
    <Section title={en ? "Reading a report" : "Lire un rapport"} id="legende">
      <p>{en ? "Each mission type has its icon:" : "Chaque type de mission a son icône :"}</p>
      <ul className="grid gap-x-6 gap-y-3 pb-3 sm:grid-cols-2">
        {MISSION_TYPES.map((m) => (
          <li key={m} className="flex items-center gap-3 text-ink">
            <MissionIcon title={m} />
            {missionTitle(m, lang)}
          </li>
        ))}
      </ul>
      <ul className="space-y-2">
        {statuses.map(([tone, name, text]) => (
          <li key={tone} className="flex items-baseline gap-2.5">
            <StatusGlyph tone={tone} className="h-4 w-4 translate-y-[3px]" />
            <span>
              <span className="font-semibold text-ink">{name}</span> : {text}
            </span>
          </li>
        ))}
      </ul>
      <p className="pt-3">
        {en
          ? "Each blocker has its icon. Blue: it counts against the site. Grey: it stays outside the score."
          : "Chaque blocage a son icône. En bleu : il compte contre le site. En gris : il reste hors score."}
      </p>
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {Object.keys(BLOCKERS)
          .filter((k) => k !== "none")
          .map((k) => (
            <li key={k} className="flex items-center gap-3">
              <BlockerIcon type={k} />
              <span className="text-ink">
                {names[k]}
                {EXCLUDED.includes(k) && <span className="type-small text-ink-2"> · {en ? "out of score" : "hors score"}</span>}
              </span>
            </li>
          ))}
      </ul>
      <p className="flex flex-wrap gap-x-5 gap-y-1 pt-3 text-ink">
        <DeviceTag device="desktop" lang={lang} />
        <DeviceTag device="mobile" lang={lang} />
      </p>
    </Section>
  );
}
// FAQ and team (retours Adonaï, 18 nov). Prénoms only, no surnames or photos.
const FAQ = {
  fr: [
    ["Est-ce légal de tester un site sans son accord ?", <>L&apos;agent visite des pages publiques comme un client : sans créer de compte, sans payer et sans contourner de protection. Si un site le bloque, la mission est notée « anti-bot » et sort du score.</>],
    ["Quelles données collectez-vous ?", <>Ton e-mail si tu te connectes ou demandes un rapport, l&apos;adresse du site testé et les captures de l&apos;agent. L&apos;agent ne saisit aucune donnée personnelle sur les sites ; le détail est sur la page <Link href="/confidentialite" className={lk}>confidentialité</Link>.</>],
    ["L’agent paie-t-il ?", <>Jamais pendant un audit : il s&apos;arrête à la première page du checkout, donc le paiement n&apos;est pas dans le score. On le mesure à part, voir <a href="#paiement" className={lk}>la suite</a>.</>],
    ["Le score est-il fiable ?", <>Un juge visuel indépendant relit chaque mission, chaque échec est rejoué une fois, et le classement fait la moyenne de 2 passages. Chaque mission a sa capture et son replay pour le vérifier.</>],
    ["Mon site est dans le classement : je peux contester ?", <>Oui : écris à <a href={`mailto:${LEGAL.contact}`} className={lk}>{LEGAL.contact}</a> avec le lien du rapport. On vérifie la capture et le replay à la main, puis on corrige ou on relance la mission.</>],
  ],
  en: [
    ["Is it legal to test a site without its consent?", <>The agent visits public pages like a customer: it creates no account, never pays and bypasses no protection. If a site blocks it, the mission is marked “anti-bot” and left out of the score.</>],
    ["What data do you collect?", <>Your e-mail if you sign in or ask for a report, the address of the tested site and the agent&apos;s screenshots. The agent enters no personal data on sites; details are on the <Link href="/confidentialite" className={lk}>privacy</Link> page.</>],
    ["Does the agent pay?", <>Never during an audit: it stops at the first checkout page, so payment is not in the score. We measure it separately, see <a href="#paiement" className={lk}>what comes next</a>.</>],
    ["Is the score reliable?", <>An independent visual judge reviews every mission, every failure is replayed once, and the ranking averages 2 runs. Each mission has its screenshot and replay so you can check.</>],
    ["My site is in the ranking: can I dispute it?", <>Yes: write to <a href={`mailto:${LEGAL.contact}`} className={lk}>{LEGAL.contact}</a> with the report link. We check the screenshot and the replay by hand, then fix or rerun the mission.</>],
  ],
} as const;
const TEAM = {
  fr: [["Thomas", "CEO : projet, business et pitch"], ["Georges", "CPO et CTO : produit, application et architecture"], ["Alexandre", "CAIO : agent IA, juge visuel et corrections"], ["Mehdi", "CAO : automatisations n8n (e-mails, suivi, alertes)"], ["Adonaï", "CDO : données, métriques, éthique et conformité"]],
  en: [["Thomas", "CEO: project, business and pitch"], ["Georges", "CPO and CTO: product, app and architecture"], ["Alexandre", "CAIO: AI agent, visual judge and fixes"], ["Mehdi", "CAO: n8n automations (e-mails, monitoring, alerts)"], ["Adonaï", "CDO: data, metrics, ethics and compliance"]],
};

const FaqTeam = ({ lang }: { lang: "fr" | "en" }) => (
  <>
    <Section title={lang === "en" ? "Questions" : "Questions fréquentes"} id="faq">
      {FAQ[lang].map(([q, a]) => (
        <details key={q} className="group border-t border-line pt-3">
          <summary className="cursor-pointer list-none font-medium text-ink [&::-webkit-details-marker]:hidden">{q}</summary>
          <p className="mt-2">{a}</p>
        </details>
      ))}
    </Section>
    <Section title={lang === "en" ? "The team" : "L’équipe"} id="equipe">
      <ul className="space-y-1">
        {TEAM[lang].map(([n, r]) => (
          <li key={n}><b className="text-ink">{n}</b>, {r}</li>
        ))}
      </ul>
      <p className="type-small">{lang === "en" ? LEGAL_EN.project : LEGAL.project}.</p>
    </Section>
  </>
);

// A fact with its icon: the method reads like a product spec sheet, not an essay.
const Fact = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <Icon name={icon} className="mt-[3px] h-5 w-5 text-ink-2" />
    <span>{children}</span>
  </li>
);

export default async function Methode() {
  const lang = await getLang();
  const t = tr(lang);
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <article className="wrap max-w-[760px]">
        <p className="type-eyebrow text-ink-2">{t("Méthode", "Method")}</p>
        <h1 className="type-h1 mt-3">{t("Comment on calcule le score.", "How we compute the score.")}</h1>

        {/* The formula first, as a card: everything below explains its two terms. */}
        <div className="tile mt-8 grid gap-5 p-7!">
          <p className="type-h3 whitespace-nowrap tnum">
            Score = <span className="text-pass">{t("réussies", "passed")}</span> ÷ {t("vérifiées", "verified")}
          </p>
          <Chips>
            <Chip icon="audit">{t("5 missions", "5 missions")}</Chip>
            <Chip icon="refresh">{t("Échec rejoué 1 fois", "Failure replayed once")}</Chip>
            <Chip icon="ranking">{t("Classement : moyenne de 2", "Ranking: average of 2")}</Chip>
          </Chips>
        </div>

        <Section title={t("Les missions", "The missions")}>
          <p>
            {t(
              "Les mêmes missions d’achat à chaque audit, neutres sur le type de produit : jamais un article que le site ne vend pas.",
              "The same shopping missions on every audit, neutral on the product type: never an item the site does not sell.",
            )}
          </p>
          <p>
            {t("Agent : Holo, de H Company. Il voit l’écran, clique et tape comme un humain, dans un navigateur cloud.", "Agent: Holo, by H Company. It sees the screen, clicks and types like a human, in a cloud browser.")}
          </p>
          <Chips>
            <Chip icon="nopay">{t("Jamais de paiement", "Never pays")}</Chip>
            <Chip icon="shield">{t("Aucune donnée perso", "No personal data")}</Chip>
            <Chip icon="captcha_or_bot_block">{t("Aucun captcha", "No captcha")}</Chip>
            <Chip icon="cookie_banner">{t("Refuse les cookies", "Rejects cookies")}</Chip>
          </Chips>
        </Section>

        <Section title={t("Quand une mission est réussie", "When a mission passes")}>
          <ul className="grid gap-3">
            <Fact icon="none">
              {t(
                "L’agent atteint la première page du checkout : connexion, e-mail, adresse ou paiement. Le panier seul ne compte pas.",
                "The agent reaches the first checkout page: sign-in, e-mail, address or payment. The cart alone does not count.",
              )}
            </Fact>
            <Fact icon="eye">
              {t(
                "Un juge visuel indépendant (open source, Hugging Face) relit la dernière capture, sans l’avis de l’agent. Son verdict fait foi.",
                "An independent visual judge (open source, Hugging Face) reviews the last screenshot, without the agent’s opinion. Its verdict counts.",
              )}
            </Fact>
            <Fact icon="mission_not_applicable">
              {t("S’il ne peut pas trancher : « non vérifiée », hors score.", "If it cannot decide: “unverified”, out of score.")}
            </Fact>
          </ul>
        </Section>

        <Section title={t("Le score", "The score")}>
          <ul className="grid gap-3">
            <Fact icon="out_of_stock">
              {t("Rupture de stock et anti-bot : affichés à part, hors score.", "Out of stock and anti-bot: shown apart, out of score.")}
            </Fact>
            <Fact icon="refresh">
              {t(
                "Chaque échec est rejoué une fois ; le second essai fait foi. Sauf anti-bot, rupture, compte obligatoire ou mission impossible.",
                "Every failure is replayed once; the second attempt counts. Except anti-bot, out of stock, account required or impossible mission.",
              )}
            </Fact>
            <Fact icon="ranking">
              {t("Classement : moyenne des deux derniers passages publics.", "Ranking: average of the last two public runs.")}
            </Fact>
          </ul>
        </Section>

        <Legend lang={lang} />

        <Section title={t("Les limites", "The limits")}>
          <ul className="grid gap-3">
            <Fact icon="captcha_or_bot_block">
              {t("Serveur de datacenter : certains anti-bot le bloquent, comme un vrai agent d’achat.", "Datacenter server: some anti-bots block it, as they would a real shopping agent.")}
            </Fact>
            <Fact icon="agent_tool_error">
              {t("L’agent peut échouer de lui-même : capture et replay de chaque mission pour vérifier.", "The agent can fail on its own: screenshot and replay of every mission to check.")}
            </Fact>
            <Fact icon="mobile">{t("Mobile : taille d’écran de téléphone, sans navigateur mobile.", "Mobile: phone screen size, no mobile browser.")}</Fact>
            <Fact icon="clock">{t("Un audit est une photo à un instant donné.", "An audit is a snapshot in time.")}</Fact>
          </ul>
        </Section>

        <Section title={t("La suite : le paiement", "Next step: the payment")} id="paiement">
          <p>
            {t(
              "Le score s’arrête volontairement à l’entrée du checkout. Savoir si un agent peut vraiment payer, on a commencé à le mesurer en interne.",
              "The score stops at the checkout entrance on purpose. Whether an agent can actually pay, we have started to measure in the lab.",
            )}
          </p>
          <div className="tile p-6!">
            <p className="type-small font-semibold text-ink">
              {t("17 nov. 2026 · carte virtuelle à 0 € · 5 sites", "17 Nov 2026 · €0 virtual card · 5 sites")}
            </p>
            <ul className="type-small mt-4 grid gap-2.5">
              <li className="flex items-start gap-2.5">
                <StatusGlyph tone="unsure" className="mt-[2px] h-4 w-4" />
                <span>
                  <b className="text-ink">{t("Jusqu’à la banque : 2", "Reached the bank: 2")}</b> · Asphalte, {t("une petite boutique", "a small shop")} ·{" "}
                  {t("refusé faute de fonds, paiement réussi non démontré", "declined for lack of funds, successful payment not proven")}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <StatusGlyph tone="fail" className="mt-[2px] h-4 w-4" />
                <span>
                  <b className="text-ink">{t("Arrêté avant : 3", "Stopped before: 3")}</b> · {t("anti-bot (Nike), compte obligatoire (Adidas), étape non atteinte (Jules)", "anti-bot (Nike), account required (Adidas), step not reached (Jules)")}
                </span>
              </li>
            </ul>
          </div>
          <p>
            {t(
              "Prochaine étape : nos propres cartes, refusées en temps réel par notre serveur, pour une preuve bancaire automatique sans 3D Secure manuel.",
              "Next: our own cards, declined in real time by our server, for automatic bank proof with no manual 3D Secure.",
            )}
          </p>
        </Section>

        <FaqTeam lang={lang} />
      </article>
    </div>
  );
}
