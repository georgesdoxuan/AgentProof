import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { ScoreBar, blockerLabel, scoreColor } from "@/lib/ui";

export const metadata = { title: "Classement — AgentProof" };

export default async function Classement() {
  await connection();
  const { data: scores } = await db.from("site_scores").select("*").order("score", { ascending: false });
  const auditIds = (scores ?? []).map((s) => s.audit_id);
  const { data: fails } = await db.from("runs").select("audit_id, blocker_type").in("audit_id", auditIds).eq("success", false);
  const topBlocker = (id: string) => {
    const c: Record<string, number> = {};
    for (const f of fails ?? []) if (f.audit_id === id && f.blocker_type) c[f.blocker_type] = (c[f.blocker_type] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classement : qui laisse un agent IA acheter ?</h1>
        <p className="mt-2 text-stone-600">Part des missions où l&apos;agent atteint le checkout, vérifiée par un juge visuel. Dernier audit de chaque site.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-stone-600">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Site</th>
              <th className="px-4 py-2">Appareil</th>
              <th className="w-40 px-4 py-2">Score agent</th>
              <th className="px-4 py-2">Missions</th>
              <th className="px-4 py-2">Blocage principal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {(scores ?? []).map((s, i) => (
              <tr key={s.audit_id} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/audit/${s.audit_id}`} className="hover:underline">{s.name}</Link>
                </td>
                <td className="px-4 py-3 text-stone-600">{s.device === "mobile" ? "Mobile" : "Ordinateur"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ScoreBar score={s.score} />
                    <span className={`w-10 text-right font-bold ${scoreColor(s.score)}`}>{s.score ?? "—"}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-600">{s.runs_success}/{s.runs_done}</td>
                <td className="px-4 py-3 text-stone-600">{blockerLabel(topBlocker(s.audit_id))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!scores?.length && <p className="p-4 text-sm text-stone-500">Aucun audit terminé pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
