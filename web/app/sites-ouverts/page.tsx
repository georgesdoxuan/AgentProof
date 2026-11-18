import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { StatusGlyph, scoreTone } from "@/lib/ui";

export const metadata = { title: "Sites ouverts aux audits · AgentProof" };

// Landing page when ALLOWED_DOMAINS (demo day) refuses a site: say why, then list the open sites with their latest public report.
export default async function SitesOuverts({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  await connection();
  const { site } = await searchParams;
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
        <h1 className="type-h1">{site ? `${site} n'est pas ouvert aux audits aujourd'hui.` : "Sites ouverts aux audits."}</h1>
        <p className="type-intro mt-5 text-ink-2">
          Pendant la démo, les audits sont limités à quelques sites pour protéger nos crédits d&apos;agent. Pour chaque site ouvert, tu peux consulter son dernier rapport public : captures, replays et plan de corrections.
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
                        Dernier audit le {new Date(a.finished_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-4">
                    {s != null && (
                      <span className="flex items-center gap-2 type-headline tnum">
                        <StatusGlyph tone={scoreTone(s)} className="h-4 w-4" />
                        {s} %
                      </span>
                    )}
                    {a ? (
                      <Link href={`/audit/${a.id}`} className="more">
                        Voir le rapport
                      </Link>
                    ) : (
                      <span className="type-small text-ink-2">Pas encore de rapport public</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-10 text-ink-2">Tous les sites sont ouverts aux audits en ce moment.</p>
        )}

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/#tester" className="more">
            Tester un site de la liste
          </Link>
          <Link href="/classement" className="more">
            Voir le classement
          </Link>
        </div>
      </div>
    </div>
  );
}
