import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { loadCredits } from "@/lib/credits";
import { COMPARE_MODEL, DEFAULT_MODEL, PAY_MAX_EUR, listSiteLogins } from "@/lib/engine";
import { Field, Group, Note, Segmented } from "@/lib/ui";
import { Hint } from "@/lib/hint";
import { getLang, getT } from "@/lib/lang";
import { LEGAL } from "@/lib/legal";
import { MAX_PER_AUDIT, pickItems, teamMissions } from "@/lib/missions";
import { loadPace } from "@/lib/estimate";
import { MissionPicker } from "./missions";
import { PaymentPicker } from "./payment";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Lancer un audit", "Run an audit")} · AgentProof` };
}

// Why /api/audits sent the form back, and what to do. Codes only: a crafted link cannot put its own text here.
const REFUSED: Record<string, [string, string]> = {
  url: ["Cette adresse n'est pas celle d'un site public. Indique le domaine de la boutique, par exemple maboutique.fr.", "This address is not a public site. Enter the store's domain, for example mystore.com."],
  email: ["L'e-mail du rapport n'est pas valide. Corrige-le, ou laisse le champ vide pour recevoir le rapport à ton adresse de connexion.", "The report e-mail is not valid. Fix it, or leave it empty to get the report at your sign-in address."],
  combo: ["Ordinateur + Mobile, concurrent et comparaison des agents ne se combinent pas : garde une seule de ces options.", "Desktop + Mobile, competitor and agent comparison do not combine: keep only one of these options."],
  carte: ["Aucune carte utilisable pour le test de paiement. Ajoute-la dans Paiement, ou lance un audit complet sans paiement.", "No usable card for the payment test. Add one in Payment method, or run a full audit without payment."],
  confirmation: ["Le test de paiement demande ta confirmation : coche la case « Je confirme un paiement réel » sous la carte, puis relance.", "The payment test needs your confirmation: tick “I confirm a real payment” under the card, then run again."],
  heure: ["Trop d'audits lancés depuis ta connexion en une heure. Réessaie dans une heure : tes rapports en cours continuent.", "Too many audits started from your connection in one hour. Try again in an hour: your running reports carry on."],
  file: ["Beaucoup d'audits sont en cours en ce moment. Réessaie dans quelques minutes : rien n'a été lancé ni décompté.", "Many audits are running right now. Try again in a few minutes: nothing was started or counted."],
  compte: ["Le compte de test choisi n'existe pas pour ce site. Choisis-en un autre, ajoute-le dans Comptes de test, ou teste sans compte.", "The chosen test account does not exist for this site. Pick another one, add it in Test accounts, or test without an account."],
  missions: ["La sélection de missions n'est plus valable (une mission a pu être modifiée). Vérifie-la puis relance.", "The mission selection is no longer valid (a mission may have changed). Check it, then run again."],
  technique: ["L'audit n'a pas pu être créé, à cause d'une erreur de notre côté. Réessaie dans un instant ; si ça recommence, écris-nous.", "The audit could not be created because of an error on our side. Try again in a moment; if it happens again, write to us."],
};

export default async function Nouveau({ searchParams }: { searchParams: Promise<{ url?: string; competitor?: string; device?: string; email?: string; force?: string; erreur?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/nouveau");
  if (!ctx.team || !canLaunch(ctx.team.role)) redirect("/espace");
  const { user, team } = ctx;
  // Filled in from the home form when the visitor had to sign in first (see /api/audits).
  const { url, competitor, device, email, force, erreur } = await searchParams;
  const refused = erreur ? REFUSED[erreur] : undefined;
  const [card, credits, missions, lang, pace, logins] = await Promise.all([cardView(team.id), loadCredits(team.id), teamMissions(team.id), getLang(), loadPace(), listSiteLogins(team.id)]);
  // Test accounts offered to the payment test: name and masked login only, never a password (it stays in H's vault).
  const accounts = logins.map((l) => ({ id: l.id, label: l.label, hint: l.login_hint, domain: l.sites.domain }));
  // Same default as /api/audits: the first FORM_MISSIONS missions (5, or 3 on demo day) come ticked.
  const items = pickItems(missions, lang, Number(process.env.FORM_MISSIONS ?? 5));
  const t = await getT();

  return (
    <SpaceShell narrow
      title={t("Lancer un audit", "Run an audit")}
      hint={t(
        "Un agent IA essaie d'acheter sur ton site, comme un vrai client : tout site qui vend des produits physiques (mode, maison, beauté, high-tech…). Les missions s'arrêtent avant le paiement et ne saisissent aucune donnée personnelle.",
        "An AI agent tries to buy on your site, like a real customer: any site that sells physical products (fashion, home, beauty, electronics…). Missions stop before payment and enter no personal data.",
      )}
    >
      {/* Soft limit: past the month's credits the team is told, never blocked (payment is not open yet). */}
      {credits.used >= credits.included && (
        <div role="status">
          <Note
            icon="credit"
            action={
              <Link href="/espace/reglages/abonnement" className="text-link hover:underline">
                {t("Abonnement", "Plan")}
              </Link>
            }
          >
            <span className="font-semibold text-warn">{t(`Crédits épuisés · ${credits.used}/${credits.included}`, `Credits used up · ${credits.used}/${credits.included}`)}</span>
            {" · "}
            {t("rien n'est facturé pendant l'essai", "nothing is charged during the trial")}
          </Note>
        </div>
      )}
      {refused && (
        <div role="alert">
          <Note
            icon="info"
            action={
              erreur === "carte" ? (
                <Link href="/espace/reglages/paiement" className="text-link hover:underline">{t("Paiement", "Payment method")}</Link>
              ) : erreur === "compte" ? (
                <Link href="/espace/reglages/comptes" className="text-link hover:underline">{t("Comptes de test", "Test accounts")}</Link>
              ) : erreur === "technique" ? (
                <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">{t("Nous écrire", "Write to us")}</a>
              ) : undefined
            }
          >
            <span className="font-semibold text-fail">{t("Audit non lancé", "Audit not started")}</span>
            {" · "}
            {t(...refused)}
          </Note>
        </div>
      )}
      {force === "1" && !refused && (
        <Note icon="refresh">{t("Nouveau passage complet : le rapport précédent reste dans ton espace.", "New full pass: the previous report stays in your space.")}</Note>
      )}
      <Group>
        <form action="/api/audits" method="post" className="grid gap-5 p-6 sm:p-8">
          {/* Kept from "Relancer" on a report: a fresh pass, not the 7-day reuse. */}
          {force === "1" && <input type="hidden" name="force" value="1" />}
          <Field label={t("Adresse de ton site", "Your site's address")} name="url" required defaultValue={url} />
          <Field label={t("Un concurrent (facultatif)", "A competitor (optional)")} name="competitor" defaultValue={competitor} />
          {/* A report address carried over from the home form stays editable: a refused one must be fixable here. */}
          {(email || erreur === "email") && (
            <Field label={t("E-mail du rapport (vide : ton adresse de connexion)", "Report e-mail (empty: your sign-in address)")} name="email" type="email" defaultValue={email} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Hint tip={t("Mobile : format téléphone simulé (écran 390 × 844), pas un vrai smartphone. Ordinateur + Mobile : les mêmes missions sur les deux, côte à côte dans le rapport, deux fois plus de crédits.", "Mobile: simulated phone format (390 × 844 screen), not a real smartphone. Desktop + Mobile: the same missions on both, side by side in the report, twice the credits.")}>
              <span className="text-ink-2">{t("Appareil", "Device")}</span>
            </Hint>
            <Segmented
              name="device"
              label={t("Appareil", "Device")}
              value={device === "mobile" || device === "both" ? device : "desktop"}
              options={[
                ["desktop", t("Ordinateur", "Desktop"), "desktop"],
                ["mobile", "Mobile", "mobile"],
                [
                  "both",
                  <>
                    <span className="max-sm:hidden">{t("Ordinateur + Mobile", "Desktop + Mobile")}</span>
                    <span className="sm:hidden">{t("Les deux", "Both")}</span>
                  </>,
                  "both",
                ],
              ]}
            />
          </div>

          <MissionPicker items={items} lang={lang} max={MAX_PER_AUDIT} pace={pace} />

          {/* Engine choices and the paid test, always in view. Their explanations show on hover of each label. */}
          <section className="grid gap-4 rounded-[12px] bg-bg-2 px-4 pb-4 pt-3 dark:bg-[#2c2c2e]" aria-labelledby="avancees">
            <h2 id="avancees" className="type-small font-semibold">
              {t("Options avancées", "Advanced options")}
            </h2>
            {card && !card.missing && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Hint tip={t("Paiement seulement : un achat réel avec la carte de l'équipe, 3 à 10 minutes, sans le concurrent.", "Payment only: a real purchase with the team's card, 3 to 10 minutes, without the competitor.")}>
                  <span className="type-small text-ink-2">{t("Type de test", "Test type")}</span>
                </Hint>
                <Segmented
                  name="mode"
                  className="max-sm:w-full"
                  label={t("Type de test", "Test type")}
                  value="audit"
                  options={[
                    ["audit", t("Audit complet", "Full audit")],
                    ["payment", t("Paiement seulement", "Payment only")],
                  ]}
                />
              </div>
            )}
            {card && !card.missing && (
              <PaymentPicker
                lang={lang}
                max={PAY_MAX_EUR}
                cards={[{ id: "team", label: card.label, last4: card.last4 }]}
                accounts={accounts}
                tip={t(
                  "L’agent part au plus près du checkout, prend le premier article disponible et paie une fois avec cette carte. Avec une carte approvisionnée, la commande est réelle. Jamais sur le concurrent.",
                  "The agent starts as close to checkout as it can, takes the first available item and pays once with this card. With a funded card, the order is real. Never on the competitor.",
                )}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Same credits (1 per mission, whatever the model: lib/credits.ts) and, measured on 17/11/2026, the same pace
                  (median 87 s per mission vs 90 s): the estimate above does not change with the agent, so the tip must not promise it. */}
              <Hint tip={t(`Rapide : ${DEFAULT_MODEL}. Précis : ${COMPARE_MODEL}, le plus capable de H. Mêmes crédits (un par mission) et, mesuré, même durée.`, `Fast: ${DEFAULT_MODEL}. Precise: ${COMPARE_MODEL}, H's most capable. Same credits (one per mission) and, as measured, the same duration.`)}>
                <span className="type-small text-ink-2">{t("Agent", "Agent")}</span>
              </Hint>
              <Segmented
                name="model"
                label={t("Agent", "Agent")}
                value="fast"
                options={[
                  ["fast", t("Rapide", "Fast")],
                  ["precise", t("Précis", "Precise")],
                ]}
              />
            </div>
            <label className="type-small inline-flex cursor-pointer items-center gap-3 justify-self-start ap-not-pay">
              <input type="checkbox" name="models" value="1" className="h-4 w-4 shrink-0 accent-blue" />
              <Hint
                focusable={false}
                tip={t(
                  "Les mêmes missions jouées par l'agent rapide et l'agent précis : réussite, durée et coût côte à côte. Double le coût de l’audit, sans concurrent.",
                  "The same missions played by the fast and the precise agent: success, duration and cost side by side. Doubles the audit cost, no competitor.",
                )}
              >
                <span className="font-semibold">{t("Comparer les deux agents", "Compare both agents")}</span>
              </Hint>
            </label>
          </section>

          <Hint
            focusable={false}
            side="top"
            className="block"
            tip={t(`Le rapport s'ouvre tout de suite et arrive aussi par e-mail à ${user.email}.`, `The report opens right away and is also e-mailed to ${user.email}.`)}
          >
            <button className="btn min-h-[52px] w-full rounded-[12px]">{t("Lancer l’audit", "Run the audit")}</button>
          </Hint>
          {/* Consent stays visible: the merchant confirms it before clicking, not on hover. */}
          <p className="type-small text-center text-ink-2">
            {t(
              "En lançant l’audit, tu confirmes gérer ce site ou être autorisé à le tester. Un concurrent n’est visité que sur ses pages publiques, sans payer :",
              "By running the audit, you confirm you run this site or are allowed to test it. A competitor is only visited on its public pages, without paying:",
            )}{" "}
            <Link href="/conditions" className="text-link hover:underline">
              {t("conditions", "terms")}
            </Link>
            .
          </p>
        </form>
      </Group>
    </SpaceShell>
  );
}
