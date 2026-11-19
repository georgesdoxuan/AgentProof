import { redirect } from "next/navigation";
import { connection } from "next/server";
import { teamContext } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { Leaderboard, isDevice } from "../../classement/board";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Classement", "Ranking")} · AgentProof` };
}

// The public leaderboard, inside the team space so the sidebar stays in reach.
export default async function EspaceClassement({ searchParams }: { searchParams: Promise<{ appareil?: string }> }) {
  await connection();
  const { appareil } = await searchParams;
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/classement");
  if (!ctx.team) redirect("/espace");
  const t = await getT();
  return (
    <SpaceShell
      title={t("Classement", "Ranking")}
      parent={["/espace/sites", "Sites"]}
      hint={t(
        "Sites mode France : part des missions où l'agent atteint le checkout, vérifiée par un juge visuel, moyenne des 2 derniers passages.",
        "French fashion sites: share of missions where the agent reaches checkout, checked by a visual judge, average of the last 2 runs.",
      )}
    >
      <div className="-mt-8">
        <Leaderboard device={isDevice(appareil) ? appareil : "desktop"} base="/espace/classement" />
      </div>
    </SpaceShell>
  );
}
