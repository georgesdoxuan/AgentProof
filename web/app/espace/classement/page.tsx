import { redirect } from "next/navigation";
import { connection } from "next/server";
import { teamContext } from "@/lib/auth";
import { Leaderboard } from "../../classement/board";
import { SpaceShell } from "../shell";

export const metadata = { title: "Classement · AgentProof" };

// The public leaderboard, inside the team space so the sidebar stays in reach.
export default async function EspaceClassement() {
  await connection();
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/classement");
  if (!ctx.team) redirect("/espace");
  return (
    <SpaceShell
      team={ctx.team}
      teams={ctx.teams}
      title="Classement"
      intro="Sites mode France : part des missions où l'agent atteint le checkout, vérifiée par un juge visuel, moyenne des 2 derniers passages."
    >
      <div className="-mt-12">
        <Leaderboard />
      </div>
    </SpaceShell>
  );
}
