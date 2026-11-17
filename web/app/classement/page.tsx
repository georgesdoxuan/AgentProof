import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { Eyebrow, MissionDots, ScoreBar, ToneLabel, blockerLabel, scoreColor } from "@/lib/ui";

export const metadata = { title: "Classement — AgentProof" };

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
    <div className="space-y-10">
      <header className="max-w-3xl space-y-4">
        <Eyebrow>Classement public · Mode France</Eyebrow>
        <h1 className="font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-balance sm:text-[48px]">
          Qui laisse un agent IA acheter ?
        </h1>
        <p className="text-[19px] leading-relaxed text-ink-2">
          Part des missions où l&apos;agent atteint le checkout, vérifiée par un juge visuel. Dernier audit de chaque site.
        </p>
      </header>

      {scores?.length ? (
        <ol className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          <li className="hidden grid-cols-[2.5rem_1.6fr_1fr_1.2fr_1.4fr_5rem] gap-4 border-b border-line bg-card-2/50 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 md:grid" aria-hidden>
            <span>#</span>
            <span>Site</span>
            <span>Missions</span>
            <span>Verdict</span>
            <span>Blocage principal</span>
            <span className="text-right">Score</span>
          </li>
          {scores.map((s, i) => {
            const blocker = topBlocker(s.audit_id);
            return (
              <li key={s.audit_id} className="border-b border-line last:border-0">
                <Link
                  href={`/audit/${s.audit_id}`}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-3 px-6 py-5 transition-colors hover:bg-card-2/50 md:grid-cols-[2.5rem_1.6fr_1fr_1.2fr_1.4fr_5rem]"
                >
                  <span className="font-mono text-[15px] text-ink-3 tnum">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-[17px] font-semibold">{s.name}</span>
                    <span className="text-[13px] text-ink-3">{s.device === "mobile" ? "Mobile" : "Ordinateur"}</span>
                  </span>
                  <span className={`text-right font-display text-[22px] font-semibold tnum md:order-last ${scoreColor(s.score)}`}>
                    {s.score ?? "—"}
                    <span className="text-[15px]"> %</span>
                  </span>
                  <span className="col-span-3 flex items-center gap-3 md:col-span-1">
                    <MissionDots ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} />
                    <span className="text-[13px] text-ink-3 tnum">
                      {s.runs_success}/{s.runs_scored}{s.runs_bot_blocked > 0 && " · anti-bot"}
                    </span>
                  </span>
                  <span className="col-span-3 md:col-span-1">
                    {s.score == null && s.runs_bot_blocked > 0 ? (
                      <span className="inline-flex rounded-full bg-card-2 px-2.5 py-1 text-[13px] font-semibold text-ink-2">Anti-bot : hors classement</span>
                    ) : (
                      <ToneLabel score={s.score} />
                    )}
                  </span>
                  <span className="col-span-3 text-[15px] text-ink-2 md:col-span-1">
                    <span className="md:hidden text-ink-3">Blocage principal : </span>
                    {blocker ? blockerLabel(blocker) : <span className="text-ink-3">Aucun</span>}
                  </span>
                  <span className="col-span-3 md:hidden">
                    <ScoreBar score={s.score} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-semibold">Aucun audit terminé pour l&apos;instant.</p>
          <p className="mt-1 text-ink-2">
            <Link href="/#tester" className="font-semibold text-accent hover:underline">Teste ton site</Link> pour apparaître ici.
          </p>
        </div>
      )}

      <aside className="grid gap-4 rounded-2xl bg-card-2/60 p-6 text-[15px] text-ink-2 sm:grid-cols-3">
        <p><span className="font-semibold text-ink">Succès</span> : l&apos;agent atteint la première page du checkout. Il ne saisit rien et ne paie jamais.</p>
        <p><span className="font-semibold text-ink">Score</span> : missions réussies divisées par missions terminées.</p>
        <p><span className="font-semibold text-ink">Juge visuel</span> : un modèle Hugging Face relit la capture finale pour confirmer le verdict.</p>
      </aside>
    </div>
  );
}
