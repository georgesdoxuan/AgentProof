import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { loadSpace } from "@/lib/space";
import { getT } from "@/lib/lang";
import { Empty, MissionLegend } from "@/lib/ui";
import { SpaceShell } from "../shell";
import { SiteCard, SitesTabs } from "../parts";

export const metadata = { title: "Sites · AgentProof" };

export default async function Sites() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/sites");
  if (!ctx.team) redirect("/espace");
  const { team } = ctx;
  const { sites, trashedSites } = await loadSpace(team.id);
  const t = await getT();

  return (
    <SpaceShell
      title="Sites"
      hint={t("Le dernier score de chaque site, son évolution et ce qu'il reste à corriger.", "The latest score of each site, its trend and what is left to fix.")}
      actions={
        canLaunch(team.role) ? (
          <Link href="/espace/nouveau" className="btn">
            {t("Ajouter un site", "Add a site")}
          </Link>
        ) : undefined
      }
    >
      <div>
      <SitesTabs current="all" />
      {sites.length ? (
        <div className="space-y-3">
          {/* A card needs ~20rem for "À corriger" and the ranking line: three columns only when they fit (not at 1280 with the sidebar). */}
          <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
            {sites.map((s) => (
              <SiteCard key={s.key} site={s} manage={canLaunch(team.role)} />
            ))}
          </div>
          <MissionLegend className="px-1" />
        </div>
      ) : (
        <Empty icon="layers" title={t("Aucun site", "No site yet")}>
          {trashedSites.length ? (
            <Link href="/espace/sites/corbeille" className="text-link hover:underline">
              {t(`Corbeille (${trashedSites.length})`, `Trash (${trashedSites.length})`)}
            </Link>
          ) : (
            t("Apparaît après le premier audit.", "Shows up after the first audit.")
          )}
        </Empty>
      )}
      </div>
    </SpaceShell>
  );
}
