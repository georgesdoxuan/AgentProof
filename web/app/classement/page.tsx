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
              "Part des missions où l’agent atteint le checkout, vérifiée par un juge visuel. Moyenne des 2 derniers passages de chaque site, car un agent IA n’agit pas toujours pareil.",
              "Share of missions where the agent reaches checkout, checked by a visual judge. Average of each site's last 2 runs, because an AI agent does not always act the same way.",
            )}
          </p>
        </header>

        <Leaderboard />
      </div>
    </div>
  );
}
