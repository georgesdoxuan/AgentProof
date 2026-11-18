import { connection } from "next/server";
import { Leaderboard } from "./board";

export const metadata = { title: "Classement · AgentProof" };

export default async function Classement() {
  await connection();
  return (
    <div className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="wrap-wide">
        <header className="max-w-[760px]">
          <p className="type-eyebrow text-ink-2">Classement mode France</p>
          <h1 className="type-h1 mt-3">Qui laisse un agent IA acheter ?</h1>
          <p className="type-intro mt-5 text-ink-2">
            Part des missions où l&apos;agent atteint le checkout, vérifiée par un juge visuel. Chaque site est noté sur ses 2 derniers audits publics, sur le même appareil, car un agent IA n&apos;agit pas toujours pareil : 5 missions par audit, donc jusqu&apos;à 10 missions par site. Les missions hors score (rupture de stock, anti-bot, mission impossible, erreur de l&apos;agent) n&apos;entrent pas dans le calcul. Le lien d&apos;un site ouvre le dernier de ces audits.
          </p>
        </header>

        <Leaderboard />
      </div>
    </div>
  );
}
