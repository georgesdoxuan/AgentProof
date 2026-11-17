import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { MissionBar, StatusGlyph, ToneLabel, blockerLabel, scoreTone } from "@/lib/ui";

export const metadata = { title: "Classement · AgentProof" };

const COLS = "md:grid-cols-[1.75rem_minmax(0,1.5fr)_10.5rem_minmax(0,1.2fr)_minmax(0,1.3fr)_4.5rem]";

export default async function Classement() {
  await connection();
  const { data: scores } = await db.from("site_scores").select("*").order("score", { ascending: false, nullsFirst: false });
  const auditIds = (scores ?? []).map((s) => s.audit_id);
  const { data: fails } = await db.from("runs").select("audit_id, blocker_type").in("audit_id", auditIds).eq("success", false);
  const topBlocker = (id: string) => {
    const c: Record<string, number> = {};
    for (const f of fails ?? []) if (f.audit_id === id && f.blocker_type) c[f.blocker_type] = (c[f.blocker_type] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  return (
    <div className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="wrap-wide">
        <header className="max-w-[760px]">
          <p className="type-eyebrow text-ink-2">Classement mode France</p>
          <h1 className="type-h1 mt-3">Qui laisse un agent IA acheter ?</h1>
          <p className="type-intro mt-5 text-ink-2">
            Part des missions où l&apos;agent atteint le checkout, vérifiée par un juge visuel. Dernier audit de chaque site.
          </p>
        </header>

        {scores?.length ? (
          <div className="mt-12 overflow-hidden rounded-[18px] bg-tile">
            <div className={`type-caption hidden gap-4 border-b border-hairline px-6 py-3 text-ink-2 md:grid ${COLS}`} aria-hidden>
              <span>Rang</span>
              <span>Site</span>
              <span>Missions</span>
              <span>Verdict</span>
              <span>Blocage principal</span>
              <span className="text-right">Score</span>
            </div>
            <ol>
              {scores.map((s, i) => {
                const blocker = topBlocker(s.audit_id);
                const botOnly = s.score == null && s.runs_bot_blocked > 0;
                return (
                  <li key={s.audit_id} className="border-b border-hairline last:border-0">
                    <Link
                      href={`/audit/${s.audit_id}`}
                      className={`grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-4 gap-y-2 px-6 py-5 transition-colors duration-200 hover:bg-bg-2/60 max-[734px]:px-5 ${COLS}`}
                    >
                      <span className="text-ink-2 tnum">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="type-headline block truncate">{s.name}</span>
                        <span className="type-small text-ink-2">{s.device === "mobile" ? "Mobile" : "Ordinateur"}</span>
                      </span>
                      <span className="flex items-center justify-end gap-2 text-[21px] font-semibold tracking-[0.011em] tnum md:order-last">
                        <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4 md:hidden" />
                        {s.score ?? "—"}
                        <span className="-ml-1 text-[17px] font-normal text-ink-2">%</span>
                      </span>
                      <span className="col-span-3 col-start-2 flex items-center gap-3 md:col-span-1 md:col-start-auto">
                        <span className="w-24 shrink-0">
                          <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} size="sm" />
                        </span>
                        <span className="type-small whitespace-nowrap text-ink-2 tnum">
                          {s.runs_success} sur {s.runs_scored}
                        </span>
                      </span>
                      <span className="type-small col-span-3 col-start-2 hidden md:col-span-1 md:col-start-auto md:block">
                        {botOnly ? <span className="font-semibold text-ink-2">Anti-bot : hors classement</span> : <ToneLabel score={s.score} />}
                      </span>
                      <span className="type-small col-span-3 col-start-2 text-ink-2 md:col-span-1 md:col-start-auto">
                        <span className="md:hidden">Blocage principal : </span>
                        {blocker ? <span className="text-ink">{blockerLabel(blocker)}</span> : "Aucun"}
                        {s.runs_bot_blocked > 0 && !botOnly && " · anti-bot"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="mt-12 rounded-[18px] bg-tile p-12 text-center">
            <p className="type-headline">Aucun audit terminé pour l&apos;instant.</p>
            <Link href="/#tester" className="more mt-1">
              Teste ton site pour apparaître ici
            </Link>
          </div>
        )}

        <dl className="type-small mt-12 grid gap-6 border-t border-line pt-8 text-ink-2 sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">Succès</dt>
            <dd className="mt-1">L&apos;agent atteint la première page du checkout. Il ne saisit rien et ne paie jamais.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Score</dt>
            <dd className="mt-1">Missions réussies divisées par missions comptées. Rupture de stock et anti-bot restent hors score.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Juge visuel</dt>
            <dd className="mt-1">Un modèle Hugging Face relit la capture finale de chaque mission pour confirmer le verdict.</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
