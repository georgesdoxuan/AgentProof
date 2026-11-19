import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { locale } from "@/lib/i18n";
import { getLang, getT } from "@/lib/lang";
import { loadSpace } from "@/lib/space";
import { DeviceTag, Icon, Spinner } from "@/lib/ui";
import { ConfirmButton } from "../../controls";
import { SpaceShell } from "../../shell";
import { SitesTabs } from "../../parts";
import { SiteLogo } from "../../../site-logo";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Corbeille · Sites", "Trash · Sites")} · AgentProof` };
}

const BACK = "/espace/sites/corbeille";

// A small form posting one action on one site (or the whole trash), then landing back here.
function Act({ action, site, children }: { action: string; site?: { site_id: number; device: string }; children: React.ReactNode }) {
  return (
    <form action="/api/sites" method="post">
      <input type="hidden" name="action" value={action} />
      {site && <input type="hidden" name="site_id" value={site.site_id} />}
      {site && <input type="hidden" name="device" value={site.device} />}
      <input type="hidden" name="back" value={BACK} />
      {children}
    </form>
  );
}

// Sites › Corbeille: sites whose reports are all in the trash, to restore or delete for good.
export default async function SitesCorbeille() {
  const ctx = await teamContext();
  if (!ctx) redirect(`/connexion?next=${BACK}`);
  if (!ctx.team) redirect("/espace");
  const { team } = ctx;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const { trashedSites } = await loadSpace(team.id);
  const manage = canLaunch(team.role);
  const date = (d: string) => new Date(d).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const purgeable = trashedSites.filter((s) => !s.running);
  const reportsOf = (n: number) => t(`${n} rapport${n > 1 ? "s" : ""}`, `${n} report${n > 1 ? "s" : ""}`);

  return (
    <SpaceShell
      title={t("Sites · Corbeille", "Sites · Trash")}
      parent={["/espace/sites", "Sites"]}
      hint={t(
        "Un site mis à la corbeille disparaît des sites et de l'accueil avec ses rapports. Restaure-le, ou supprime-le définitivement.",
        "A site in the trash leaves the sites and the home page with its reports. Restore it, or delete it for good.",
      )}
      actions={
        manage && purgeable.length ? (
          <Act action="empty">
            <ConfirmButton
              message={t(
                `Supprimer définitivement ${purgeable.length} site${purgeable.length > 1 ? "s" : ""} et tous leurs rapports ? Cette action est irréversible.`,
                `Permanently delete ${purgeable.length} site${purgeable.length > 1 ? "s" : ""} and all their reports? This cannot be undone.`,
              )}
              className="btn btn-secondary min-h-9 px-4 text-[14px] text-fail shadow-[inset_0_0_0_1px_currentColor] hover:bg-fail hover:text-white"
            >
              {t("Vider la corbeille", "Empty trash")}
            </ConfirmButton>
          </Act>
        ) : undefined
      }
    >
      <section>
        <SitesTabs current="trash" />
        <div className="rounded-[18px] bg-tile">
          {trashedSites.length ? (
            trashedSites.map((s) => (
              <div key={s.key} className="flex items-center border-b border-hairline first:rounded-t-[18px] last:rounded-b-[18px] last:border-0">
                <div className="flex min-h-[68px] min-w-0 flex-1 items-start gap-3 py-3 pl-5 pr-2">
                  <SiteLogo domain={s.domain} name={s.domain} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{s.label}</span>
                    <span className="type-small block text-ink-2">
                      <DeviceTag device={s.device} lang={lang} /> · {reportsOf(s.audits.length)} · <span className="inline-flex items-center gap-1 align-[-2px]" title={t("Mis à la corbeille", "Moved to trash")}><Icon name="trash" className="h-3.5 w-3.5" />{date(s.deleted_at)}</span>
                    </span>
                  </span>
                </div>
                {manage && (
                  <div className="flex shrink-0 items-center gap-1 pr-3">
                    <Act action="restore" site={s}>
                      <button className="type-small h-8 rounded-full bg-fill px-3.5 font-semibold text-ink hover:bg-line/60">{t("Restaurer", "Restore")}</button>
                    </Act>
                    {s.running ? (
                      <span
                        className="grid h-9 w-9 place-items-center text-ink-2"
                        title={t("Audit en cours : suppression possible une fois terminé.", "Audit running: it can be deleted once finished.")}
                        aria-label={t("Audit en cours : suppression possible une fois terminé.", "Audit running: it can be deleted once finished.")}
                      >
                        <Spinner className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <Act action="purge" site={s}>
                        <ConfirmButton
                          message={t(
                            `Supprimer ${s.label} définitivement ? Ses ${reportsOf(s.audits.length)}, missions, captures et replays seront effacés. Cette action est irréversible.`,
                            `Delete ${s.label} permanently? Its ${reportsOf(s.audits.length)}, missions, screenshots and replays will be erased. This cannot be undone.`,
                          )}
                          label={t("Supprimer définitivement", "Delete permanently")}
                          className="grid h-9 w-9 place-items-center rounded-full text-fail transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-blue"
                        >
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M4 6.5h16M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 10.5v6M14 10.5v6" />
                          </svg>
                        </ConfirmButton>
                      </Act>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-fill text-ink-2" aria-hidden><Icon name="trash" className="h-6 w-6" /></span>
              <p className="type-headline">{t("Corbeille vide", "Trash is empty")}</p>
              <p className="type-small">
                <Link href="/espace/sites" className="text-link hover:underline">
                  {t("Voir tous les sites", "See all sites")}
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </SpaceShell>
  );
}
