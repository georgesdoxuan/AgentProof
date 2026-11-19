import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { loadCredits } from "@/lib/credits";
import { COMPARE_MODEL, DEFAULT_MODEL } from "@/lib/engine";
import { Field, Group, Segmented } from "@/lib/ui";
import { Hint } from "@/lib/hint";
import { getLang, getT } from "@/lib/lang";
import { MAX_PER_AUDIT, pickItems, teamMissions } from "@/lib/missions";
import { MissionPicker } from "./missions";
import { PaymentPicker } from "./payment";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Lancer un audit", "Run an audit")} · AgentProof` };
}

export default async function Nouveau({ searchParams }: { searchParams: Promise<{ url?: string; competitor?: string; device?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/nouveau");
  if (!ctx.team || !canLaunch(ctx.team.role)) redirect("/espace");
  const { user, teams, team } = ctx;
  // Filled in from the home form when the visitor had to sign in first (see /api/audits).
  const { url, competitor, device } = await searchParams;
  const [card, credits, missions, lang] = await Promise.all([cardView(team.id), loadCredits(team.id), teamMissions(team.id), getLang()]);
  // Same default as /api/audits: the first FORM_MISSIONS missions (5, or 3 on demo day) come ticked.
  const items = pickItems(missions, lang, Number(process.env.FORM_MISSIONS ?? 5));
  const t = await getT();

  return (
    <SpaceShell narrow
      team={team}
      teams={teams}
      title={t("Lancer un audit", "Run an audit")}
      hint={t(
        "Un agent IA essaie d'acheter sur ton site, comme un vrai client. Les missions s'arrêtent avant le paiement et ne saisissent aucune donnée personnelle.",
        "An AI agent tries to buy on your site, like a real customer. Missions stop before payment and enter no personal data.",
      )}
    >
      {/* Soft limit: past the month's credits the team is told, never blocked (payment is not open yet). */}
      {credits.used >= credits.included && (
        <p role="status" className="type-small rounded-[14px] bg-tile px-5 py-4">
          <span className="font-semibold text-warn">{t("Crédits du mois épuisés.", "This month's credits are used up.")}</span>{" "}
          {t(
            `Tu as utilisé ${credits.used} crédits sur ${credits.included}. L'audit reste possible pendant l'essai, rien n'est facturé.`,
            `You used ${credits.used} of ${credits.included} credits. Audits still run during the trial, nothing is charged.`,
          )}{" "}
          <Link href="/espace/abonnement" className="text-link hover:underline">
            {t("Voir l'abonnement", "See your plan")}
          </Link>
        </p>
      )}
      <Group>
        <form action="/api/audits" method="post" className="grid gap-5 p-6 sm:p-8">
          <Field label={t("Adresse de ton site", "Your site's address")} name="url" required defaultValue={url} />
          <Field label={t("Un concurrent (facultatif)", "A competitor (optional)")} name="competitor" defaultValue={competitor} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Hint tip={t("Mobile : format téléphone simulé (écran 390 × 844), pas un vrai smartphone.", "Mobile: simulated phone format (390 × 844 screen), not a real smartphone.")}>
              <span className="text-ink-2">{t("Appareil", "Device")}</span>
            </Hint>
            <Segmented
              name="device"
              label={t("Appareil", "Device")}
              value={device === "mobile" ? "mobile" : "desktop"}
              options={[
                ["desktop", t("Ordinateur", "Desktop")],
                ["mobile", "Mobile"],
              ]}
            />
          </div>

          <MissionPicker items={items} lang={lang} max={MAX_PER_AUDIT} />

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
                cards={[{ id: "team", label: card.label, last4: card.last4 }]}
                tip={t(
                  "L’agent part au plus près du checkout, prend le premier article disponible et paie une fois avec cette carte. Avec une carte approvisionnée, la commande est réelle. Jamais sur le concurrent.",
                  "The agent starts as close to checkout as it can, takes the first available item and pays once with this card. With a funded card, the order is real. Never on the competitor.",
                )}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Hint tip={t(`Rapide : ${DEFAULT_MODEL}. Précis : ${COMPARE_MODEL}, le plus capable de H, plus lent et plus cher.`, `Fast: ${DEFAULT_MODEL}. Precise: ${COMPARE_MODEL}, H's most capable, slower and costlier.`)}>
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
            <label className="type-small inline-flex cursor-pointer items-center gap-3 justify-self-start">
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
