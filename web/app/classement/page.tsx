import { connection } from "next/server";
import { Leaderboard, isDevice } from "./board";
import { getT } from "@/lib/lang";
import { RankingHeader } from "./header";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Classement", "Ranking")} · AgentProof` };
}

export default async function Classement({ searchParams }: { searchParams: Promise<{ appareil?: string }> }) {
  await connection();
  const { appareil } = await searchParams;
  return (
    <div className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="wrap-wide">
        <RankingHeader />
        <Leaderboard device={isDevice(appareil) ? appareil : "desktop"} base="/classement" />
      </div>
    </div>
  );
}
