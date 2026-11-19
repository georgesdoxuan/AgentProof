import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { COMPARE_MODEL, DEFAULT_MODEL } from "@/lib/engine";
import { Chevron, Field, Group, Segmented } from "@/lib/ui";
import { getT } from "@/lib/lang";
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
  const card = await cardView(team.id);
  const t = await getT();

  return (
    <SpaceShell narrow
      team={team}
      teams={teams}
      title={t("Lancer un audit", "Run an audit")}
      intro={t(
        "Un agent IA essaie d'acheter sur ton site, comme un vrai client. Les missions s'arrêtent avant le paiement et ne saisissent aucune donnée personnelle.",
        "An AI agent tries to buy on your site, like a real customer. Missions stop before payment and enter no personal data.",
      )}
    >
      <Group
        footer={t(
          `Cinq missions d'achat, 10 à 20 minutes. Le rapport s'ouvre tout de suite et arrive aussi par e-mail à ${user.email}.`,
          `Five shopping missions, 10 to 20 minutes. The report opens right away and is also e-mailed to ${user.email}.`,
        )}
      >
        <form action="/api/audits" method="post" className="grid gap-5 p-6 sm:p-8">
          <Field label={t("Adresse de ton site", "Your site's address")} name="url" required defaultValue={url} />
          <Field label={t("Un concurrent (facultatif)", "A competitor (optional)")} name="competitor" defaultValue={competitor} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-ink-2" aria-hidden>
              {t("Appareil", "Device")}
            </span>
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
          <p className="type-caption text-ink-2">{t("Mobile : format téléphone simulé (écran 390 × 844), pas un vrai smartphone.", "Mobile: simulated phone format (390 × 844 screen), not a real smartphone.")}</p>

          {/* Engine choices and the paid test stay folded: a merchant only needs the site, a competitor and a device. */}
          <details className="group rounded-[12px] bg-bg-2 dark:bg-[#2c2c2e]">
            <summary className="type-small flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
              {t("Options avancées", "Advanced options")}
              <Chevron dir="down" className="h-3 w-3 text-ink-2 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="grid gap-5 px-4 pb-4">
              {card && !card.missing && (
                <div className="grid gap-2">
                  <span className="type-small text-ink-2">{t("Type de test", "Test type")}</span>
                  <div>
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
                  <span className="type-caption text-ink-2">
                    {t("Paiement seulement : un achat réel avec la carte de l'équipe, 3 à 10 minutes, sans le concurrent.", "Payment only: a real purchase with the team's card, 3 to 10 minutes, without the competitor.")}
                  </span>
                </div>
              )}
              {card && !card.missing && (
                <label className="type-small flex items-start gap-3">
                  <input type="checkbox" name="payment" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
                  <span>
                    <span className="font-semibold">{t("Ajouter un test de paiement réel à l’audit", "Add a real payment test to the audit")}</span>
                    <span className="block text-ink-2">
                      {t(
                        `L’agent part au plus près du checkout, prend le premier article disponible et paie une fois avec ${card.label} •••• ${card.last4}. Avec une carte approvisionnée, la commande est réelle. Jamais sur le concurrent.`,
                        `The agent starts as close to checkout as it can, takes the first available item and pays once with ${card.label} •••• ${card.last4}. With a funded card, the order is real. Never on the competitor.`,
                      )}
                    </span>
                  </span>
                </label>
              )}
              <div className="grid gap-2">
                <span className="type-small text-ink-2">{t("Agent", "Agent")}</span>
                <div>
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
                <span className="type-caption text-ink-2">
                  {t(`Rapide : ${DEFAULT_MODEL}. Précis : ${COMPARE_MODEL}, le plus capable de H, plus lent et plus cher.`, `Fast: ${DEFAULT_MODEL}. Precise: ${COMPARE_MODEL}, H's most capable, slower and costlier.`)}
                </span>
              </div>
              <label className="type-small flex items-start gap-3">
                <input type="checkbox" name="models" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
                <span>
                  <span className="font-semibold">{t("Comparer les deux agents", "Compare both agents")}</span>
                  <span className="block text-ink-2">
                    {t(
                      "Les mêmes missions jouées par l'agent rapide et l'agent précis : réussite, durée et coût côte à côte. Double le coût de l’audit, sans concurrent.",
                      "The same missions played by the fast and the precise agent: success, duration and cost side by side. Doubles the audit cost, no competitor.",
                    )}
                  </span>
                </span>
              </label>
            </div>
          </details>

          <button className="btn min-h-[52px] w-full rounded-[12px]">{t("Lancer l’audit", "Run the audit")}</button>
        </form>
      </Group>
    </SpaceShell>
  );
}
