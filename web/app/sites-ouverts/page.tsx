import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { DeviceTag, StatusGlyph, scoreTone } from "@/lib/ui";
import { getLang, getT } from "@/lib/lang";
import { tr } from "@/lib/i18n";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Sites ouverts aux audits", "Sites open to audits")} · AgentProof` };
}

// Landing page when ALLOWED_DOMAINS (demo day) refuses a site: say why, then list the open sites with their latest public report.
export default async function SitesOuverts({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  await connection();
  const { site } = await searchParams;
  const lang = await getLang();
  const t = tr(lang);
  const allowed = (process.env.ALLOWED_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  // Public reports only (benchmark audits, no team): a team's own audit is never listed here.
  const { data: audits } = allowed.length
    ? await db
        .from("audits")
        .select("id, finished_at, sites!inner(domain, name)")
        .in("sites.domain", allowed)
        .is("team_id", null)
        .eq("kind", "checkout")
        .eq("status", "done")
        .order("finished_at", { ascending: false })
    : { data: [] };
  const { data: scores } = allowed.length ? await db.from("site_scores").select("domain, device, score").in("domain", allowed).eq("device", "desktop") : { data: [] };
  type Row = { id: string; finished_at: string | null; sites: { domain: string; name: string } };
  const latest = (d: string) => ((audits ?? []) as unknown as Row[]).find((a) => a.sites.domain === d);
  const score = (d: string) => (scores ?? []).find((s) => s.domain === d)?.score ?? null;

  return (
    <div className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="mx-auto w-[min(692px,87.5%)]">
        <h1 className="type-h1">
          {site
            ? t(`${site} n’est pas ouvert aux audits aujourd’hui.`, `${site} is not open to audits today.`)
            : allowed.length
              ? t("Sites ouverts aux audits.", "Sites open to audits.")
              : t("Tous les sites sont ouverts aux audits.", "Every site is open to audits.")}
        </h1>
        <p className="type-intro mt-5 text-ink-2">
          {allowed.length
            ? t(
                "Pendant la démo, les audits sont limités à quelques sites pour protéger nos crédits d’agent. Pour chaque site ouvert, tu peux consulter son dernier rapport public : captures, replays et plan de corrections.",
                "During the demo, audits are limited to a few sites to protect our agent credits. For each open site, you can read its latest public report: screenshots, replays and fix plan.",
              )
            : t("Aucune limite en ce moment : tu peux lancer un audit sur n’importe quel site.", "No limit right now: you can run an audit on any site.")}
        </p>

        {allowed.length ? (
          <ul className="mt-10 overflow-hidden rounded-[18px] bg-tile">
            {allowed.map((d) => {
              const a = latest(d);
              const s = score(d);
              return (
                <li key={d} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline px-6 py-5 last:border-0 max-[734px]:px-5">
                  <span className="min-w-0">
                    <span className="type-headline block truncate">{a?.sites.name ?? d}</span>
                    {a?.finished_at && (
                      <span className="type-small text-ink-2">
                        {t("Dernier audit le", "Latest audit on")} {new Date(a.finished_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-4">
                    {s != null && (
                      <span className="flex items-center gap-2 type-headline tnum">
                        <StatusGlyph tone={scoreTone(s)} className="h-4 w-4" />
                        {s} %
                        {/* Scores here come from desktop audits only. */}
                        <span className="type-small font-normal text-ink-2"><DeviceTag device="desktop" lang={lang} /></span>
                      </span>
                    )}
                    {a ? (
                      <Link href={`/audit/${a.id}`} className="more">
                        {t("Voir le rapport", "See the report")}
                      </Link>
                    ) : (
                      <span className="type-small text-ink-2">{t("Pas encore de rapport public", "No public report yet")}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/#tester" className="more">
            {allowed.length ? t("Tester un site de la liste", "Test a site from the list") : t("Tester mon site", "Test my site")}
          </Link>
          <Link href="/classement" className="more">
            {t("Voir le classement", "See the ranking")}
          </Link>
        </div>
      </div>
    </div>
  );
}
