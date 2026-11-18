import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { loadSpace } from "@/lib/space";
import { getT } from "@/lib/lang";
import { SpaceShell } from "../shell";
import { SiteCard } from "../parts";

export const metadata = { title: "Sites · AgentProof" };

export default async function Sites() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/sites");
  if (!ctx.team) redirect("/espace");
  const { teams, team } = ctx;
  const { sites } = await loadSpace(team.id);
  const t = await getT();

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Sites"
      intro={t("Le dernier score de chaque site, son évolution et ce qu'il reste à corriger.", "The latest score of each site, its trend and what is left to fix.")}
      actions={
        canLaunch(team.role) ? (
          <Link href="/espace/nouveau" className="btn">
            {t("Ajouter un site", "Add a site")}
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
          <p className="type-headline">{t("Aucun site pour l’instant.", "No site yet.")}</p>
          <p className="mt-1 text-ink-2">{t("Un site apparaît ici dès son premier audit.", "A site shows up here after its first audit.")}</p>
        </div>
      )}
    </SpaceShell>
  );
}
