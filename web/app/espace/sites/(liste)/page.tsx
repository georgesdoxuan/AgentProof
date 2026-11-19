import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { loadSpace } from "@/lib/space";
import { getT } from "@/lib/lang";
import { Chip, Chips, Empty, Icon, MissionLegend } from "@/lib/ui";
import { domainExt } from "@/lib/tld";
import { SpaceShell } from "../../shell";
import { SiteCard } from "../../parts";
import { SitesByExt } from "../../controls";

export const metadata = { title: "Sites · AgentProof" };

export default async function Sites() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/sites");
  if (!ctx.team) redirect("/espace");
  const { team } = ctx;
  const { sites, trashedSites } = await loadSpace(team.id);
  const t = await getT();
  // Extensions come from the account's own sites, so a new domain shows up after its first audit, no setup.
  const counts = new Map<string, number>();
  for (const s of sites) {
    const e = domainExt(s.domain);
    if (e) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  const exts = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const saved = (await cookies()).get("ap_sites_ext")?.value ?? ""; // set by SitesByExt
  const initial = [...counts.keys()].find((e) => encodeURIComponent(e) === saved) ?? "all"; // gone extension: back to "Tous"

  return (
    <SpaceShell
      title="Sites"
      hint={t("Le dernier score de chaque site, son évolution et ce qu'il reste à corriger.", "The latest score of each site, its trend and what is left to fix.")}
      actions={
        <div className="flex flex-wrap gap-3">
          <Link href="/espace/classement" className="btn btn-secondary gap-2">
            <Icon name="ranking" />
            {t("Classement", "Ranking")}
          </Link>
          {canLaunch(team.role) && (
            <Link href="/espace/nouveau" className="btn">
              {t("Ajouter un site", "Add a site")}
            </Link>
          )}
        </div>
      }
    >
      <div>
      {sites.length ? (
        <div className="space-y-3">
          <SitesByExt
            initial={initial}
            chips={
              <fieldset>
                <legend className="sr-only">{t("Extension du domaine", "Domain extension")}</legend>
                <Chips>
                  {([["all", t("Tous", "All"), sites.length], ...exts.map(([e, n]) => [e, e, n])] as [string, string, number][]).map(([v, label, n]) => (
                    <label key={v} className="cursor-pointer">
                      <input type="radio" name="ap_sites_ext" value={v} defaultChecked={v === initial} className="peer sr-only" />
                      <Chip className="transition-colors hover:bg-line/60 peer-checked:bg-blue/12 peer-checked:text-link peer-focus-visible:outline-2 peer-focus-visible:outline-blue">
                        {label}
                        <span className="tabular-nums opacity-60">{n}</span>
                      </Chip>
                    </label>
                  ))}
                </Chips>
              </fieldset>
            }
            cards={sites.map((s) => ({ key: s.key, ext: domainExt(s.domain), card: <SiteCard site={s} manage={canLaunch(team.role)} /> }))}
          />
          <MissionLegend className="px-1" />
        </div>
      ) : (
        <Empty icon="layers" title={t("Aucun site", "No site yet")}>
          {trashedSites.length ? (
            <Link href="/espace/reglages/corbeille/sites" className="text-link hover:underline">
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
