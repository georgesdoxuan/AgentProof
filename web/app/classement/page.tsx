import { connection } from "next/server";
import { Leaderboard } from "./board";
import { getT } from "@/lib/lang";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Classement", "Ranking")} · AgentProof` };
}

export default async function Classement() {
  await connection();
  const t = await getT();
  return (
    <div className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="wrap-wide">
        <header className="max-w-[760px]">
          <p className="type-eyebrow text-ink-2">{t("Classement mode France", "French fashion ranking")}</p>
          <h1 className="type-h1 mt-3">{t("Qui laisse un agent IA acheter ?", "Who lets an AI agent buy?")}</h1>
          <p className="type-intro mt-5 text-ink-2">
            {t(
              "Part des missions où l’agent atteint le checkout, vérifiée par un juge visuel. Chaque site est noté sur ses 2 derniers audits publics, sur le même appareil, car un agent IA n’agit pas toujours pareil : 5 missions par audit, donc jusqu’à 10 missions par site. Les missions hors score (rupture de stock, anti-bot, mission impossible, erreur de l’agent) n’entrent pas dans le calcul. Le lien d’un site ouvre le dernier de ces audits.",
              "Share of missions where the agent reaches checkout, checked by a visual judge. Each site is scored on its last 2 public audits on the same device, because an AI agent does not always act the same way: 5 missions per audit, so up to 10 missions per site. Missions out of the score (out of stock, anti-bot, impossible mission, agent error) are left out. A site's link opens the latest of these audits.",
            )}
          </p>
        </header>

        <Leaderboard />
      </div>
    </div>
  );
}
