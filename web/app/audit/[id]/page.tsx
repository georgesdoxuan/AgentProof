import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { ScoreBar, blockerLabel, scoreColor, summarize } from "@/lib/ui";
import { AutoRefresh } from "./refresh";

const RUN_FIELDS =
  "id, status, success, reached_checkout, blocker_type, blocker_detail, screenshot_url, final_url, steps, duration_s, cost_usd, judge, agent_answer, missions(title, position)";

async function loadAudit(id: string) {
  const { data } = await db.from("audits").select(`*, sites(domain, name, url), runs(${RUN_FIELDS})`).eq("id", id).maybeSingle();
  return data;
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const audit = await loadAudit(id);
  if (!audit) notFound();
  const competitor = audit.compare_to ? await loadAudit(audit.compare_to) : null;

  const runs = [...audit.runs].sort((a: any, b: any) => a.missions.position - b.missions.position);
  const s = summarize(runs);
  const c = competitor ? summarize(competitor.runs) : null;
  const running = audit.status === "running" || competitor?.status === "running";
  const cost = runs.reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0);

  return (
    <div className="space-y-10">
      {running && <AutoRefresh />}
      <div>
        <p className="text-sm text-stone-500">
          Audit {audit.device === "mobile" ? "mobile" : "ordinateur"} · {new Date(audit.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{audit.sites.name}</h1>
        <a href={audit.sites.url} className="text-sm text-emerald-700 hover:underline" target="_blank" rel="noreferrer">{audit.sites.url}</a>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Score agent de ce site" score={s.score} sub={`${s.ok} missions réussies sur ${s.done} terminées (${s.total} prévues)`} />
        {competitor && c ? (
          <ScoreCard label={`Concurrent : ${competitor.sites.name}`} score={c.score} sub={`${c.ok}/${c.done} missions réussies`} href={`/audit/${competitor.id}`} />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">
            Pas de concurrent dans cet audit. <Link href="/classement" className="text-emerald-700 hover:underline">Compare avec le classement</Link>.
          </div>
        )}
      </section>

      {running && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Audit en cours : {s.done}/{s.total} missions terminées. La page se met à jour toute seule.
        </p>
      )}

      {s.blockers.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Top des blocages</h2>
          <ol className="mt-3 space-y-2">
            {s.blockers.slice(0, 3).map(([b, n]) => (
              <li key={b} className="flex justify-between rounded-lg border border-stone-200 bg-white px-4 py-3">
                <span className="font-medium">{blockerLabel(b)}</span>
                <span className="text-stone-600">{n} mission{n > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {audit.recommendations && (
        <section>
          <h2 className="text-xl font-semibold">Plan de corrections</h2>
          <p className="mt-3 whitespace-pre-line rounded-xl border border-stone-200 bg-white p-5 text-sm leading-relaxed">{audit.recommendations}</p>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Missions</h2>
        <div className="mt-3 space-y-3">
          {runs.map((r: any) => (
            <article key={r.id} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge run={r} />
                  <h3 className="font-semibold">{r.missions.title}</h3>
                </div>
                {r.status === "done" && (
                  <>
                    {!r.success && <p className="text-sm"><span className="font-medium">Blocage :</span> {blockerLabel(r.blocker_type)}</p>}
                    {r.blocker_detail && <p className="text-sm text-stone-600">{r.blocker_detail}</p>}
                    {r.reached_checkout && !r.success && r.judge?.reason && (
                      <p className="text-sm text-amber-700">Juge visuel : {r.judge.reason}</p>
                    )}
                    <p className="text-xs text-stone-500">
                      {r.steps ?? "?"} étapes · {r.duration_s ? `${Math.round(r.duration_s)} s` : "?"}
                      {r.cost_usd != null && ` · ${Number(r.cost_usd).toFixed(3)} $`} ·{" "}
                      <a href={`/api/replay/${r.id}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">Voir le replay</a>
                    </p>
                  </>
                )}
              </div>
              {r.screenshot_url && (
                <a href={r.screenshot_url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.screenshot_url} alt={`Dernier écran vu par l'agent : ${r.missions.title}`} className="w-full rounded-lg border border-stone-200" />
                </a>
              )}
            </article>
          ))}
        </div>
        {cost > 0 && <p className="mt-3 text-xs text-stone-500">Coût agent de cet audit : {cost.toFixed(2)} $ (H Company, tokens réels).</p>}
      </section>
    </div>
  );
}

function ScoreCard({ label, score, sub, href }: { label: string; score: number | null; sub: string; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-1 text-5xl font-bold ${scoreColor(score)}`}>{score ?? "—"}%</p>
      <div className="mt-3"><ScoreBar score={score} /></div>
      <p className="mt-2 text-sm text-stone-600">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Badge({ run }: { run: { status: string; success: boolean | null } }) {
  const [text, cls] =
    run.status === "todo"
      ? ["En attente", "bg-stone-100 text-stone-600"]
      : run.status === "launched"
        ? ["En cours", "bg-blue-100 text-blue-700"]
        : run.success
          ? ["Réussie", "bg-emerald-100 text-emerald-700"]
          : ["Échec", "bg-red-100 text-red-700"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}
