import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { COMPARE_MODEL, DEFAULT_MODEL } from "@/lib/engine";
import { Field, Group, Segmented } from "@/lib/ui";
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
          `Audit complet : cinq missions, 10 à 20 minutes. Paiement seulement : un achat réel avec la carte de l'équipe, 3 à 10 minutes, sans le concurrent. Le rapport arrive aussi par e-mail à ${user.email}.`,
          `Full audit: five missions, 10 to 20 minutes. Payment only: a real purchase with the team's card, 3 to 10 minutes, without the competitor. The report is also e-mailed to ${user.email}.`,
        )}
      >
        <form action="/api/audits" method="post" className="grid gap-5 p-6 sm:p-8">
          {card && !card.missing && (
            <Segmented
              name="mode"
              label={t("Type de test", "Test type")}
              value="audit"
              options={[
                ["audit", t("Audit complet", "Full audit")],
                ["payment", t("Paiement seulement", "Payment only")],
              ]}
            />
          )}
          <Field label={t("Adresse du site", "Site address")} name="url" required defaultValue={url} />
          <Field label={t("Un concurrent (facultatif)", "A competitor (optional)")} name="competitor" defaultValue={competitor} />
          <label className="type-small flex items-start gap-3 rounded-[12px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
            <input type="checkbox" name="models" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
            <span>
              <span className="font-semibold">{t("Comparer deux modèles d’agent", "Compare two agent models")}</span>
              <span className="block text-ink-2">
                {t(
                  `Les mêmes missions jouées par ${DEFAULT_MODEL} (rapide) et ${COMPARE_MODEL} (le plus capable de H) : réussite, durée et coût côte à côte. Double le coût de l’audit, sans concurrent.`,
                  `The same missions played by ${DEFAULT_MODEL} (fast) and ${COMPARE_MODEL} (H's most capable): success, duration and cost side by side. Doubles the audit cost, no competitor.`,
                )}
              </span>
            </span>
          </label>
          {card && !card.missing && (
            <label className="type-small flex items-start gap-3 rounded-[12px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
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
            <span className="type-small text-ink-2">{t("Modèle de l’agent (sans effet si tu compares les deux)", "Agent model (no effect if you compare both)")}</span>
            <div>
              <Segmented
                name="model"
                label={t("Modèle de l'agent", "Agent model")}
                value="fast"
                options={[
                  ["fast", `${t("Rapide", "Fast")} · ${DEFAULT_MODEL}`],
                  ["precise", `${t("Précis", "Precise")} · ${COMPARE_MODEL}`],
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <Segmented
              name="device"
              label={t("Appareil", "Device")}
              value={device === "mobile" ? "mobile" : "desktop"}
              options={[
                ["desktop", t("Ordinateur", "Desktop")],
                ["mobile", "Mobile"],
              ]}
            />
            <button className="btn">{t("Lancer l’audit", "Run the audit")}</button>
          </div>
          <p className="type-caption text-ink-2">{t("Mobile : format téléphone simulé (écran 390 × 844), pas un vrai smartphone.", "Mobile: simulated phone format (390 × 844 screen), not a real smartphone.")}</p>
        </form>
      </Group>
    </SpaceShell>
  );
}
