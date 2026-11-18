import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { loadSpace } from "@/lib/space";
import { SpaceShell } from "../shell";
import { SiteCard } from "../parts";

export const metadata = { title: "Sites · AgentProof" };

export default async function Sites() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/sites");
  if (!ctx.team) redirect("/espace");
  const { teams, team } = ctx;
  const { sites } = await loadSpace(team.id);

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Sites"
      intro="Le dernier score de chaque site, son évolution et ce qu'il reste à corriger."
      actions={
        canLaunch(team.role) ? (
          <Link href="/espace/nouveau" className="btn">
            Ajouter un site
          </Link>
        ) : undefined
      }
    >
      {sites.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <SiteCard key={s.key} site={s} />
          ))}
        </div>
      ) : (
        <div className="tile text-center">
          <p className="type-headline">Aucun site pour l&apos;instant.</p>
          <p className="mt-1 text-ink-2">Un site apparaît ici dès son premier audit.</p>
        </div>
      )}
    </SpaceShell>
  );
}
