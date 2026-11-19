import { getT } from "@/lib/lang";
import { Chip, Chips } from "@/lib/ui";
import { Hint } from "@/lib/hint";

// Static text: the loading state shows it as is, so the ranking below starts at the same height.
export async function RankingHeader() {
  const t = await getT();
  return (
    <header className="max-w-[760px]">
      <p className="type-eyebrow text-ink-2">{t("Classement mode France", "French fashion ranking")}</p>
      <h1 className="type-h1 mt-3">{t("Qui laisse un agent IA acheter ?", "Who lets an AI agent buy?")}</h1>
      <p className="type-intro mt-5 text-ink-2">
        {t("Part des missions où l’agent atteint le checkout.", "Share of missions where the agent reaches checkout.")}
      </p>
      <Chips className="mt-5">
        <Chip icon="eye">{t("Vérifié par un juge visuel", "Checked by a visual judge")}</Chip>
        <Chip icon="refresh">{t("2 derniers audits · ≤ 10 missions", "Last 2 audits · ≤ 10 missions")}</Chip>
        <Hint
          tip={t(
            "Hors score : rupture de stock, anti-bot, mission impossible sur le catalogue, erreur de l’agent. Un agent IA n’agit pas toujours pareil, d’où la moyenne de 2 audits sur le même appareil. Le lien d’un site ouvre le dernier.",
            "Out of score: out of stock, anti-bot, mission impossible on the catalogue, agent error. An AI agent does not always act the same way, hence the average of 2 audits on the same device. A site's link opens the latest.",
          )}
        >
          <Chip icon="mission_not_applicable">{t("Hors score exclus", "Out-of-score excluded")}</Chip>
        </Hint>
      </Chips>
    </header>
  );
}
