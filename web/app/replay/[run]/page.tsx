import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db, getReplay } from "@/lib/engine";
import { blockerLabel } from "@/lib/ui";

const ACTIONS: Record<string, string> = {
  click_web: "Clic",
  write: "Saisie",
  scroll_web: "Défilement",
  go_to_web: "Navigation",
  go_back_web: "Retour",
  press_keys_web: "Touches",
  select_option: "Choix dans une liste",
  move_mouse_web: "Survol",
  wait_web: "Attente",
  answer: "Réponse finale",
};

export default async function Replay({ params }: { params: Promise<{ run: string }> }) {
  await connection();
  const id = Number((await params).run);
  if (!Number.isInteger(id)) notFound();
  const { data: run } = await db.from("runs").select("id, audit_id, success, blocker_type, missions(title), audits(sites(name))").eq("id", id).maybeSingle();
  if (!run) notFound();

  let replay: Awaited<ReturnType<typeof getReplay>> = null;
  try {
    replay = await getReplay(id);
  } catch {
    return <p className="text-stone-600">Replay momentanément indisponible (limite de l&apos;API H). Réessaie dans une minute.</p>;
  }
  if (!replay) notFound();
  const r = run as any;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/audit/${r.audit_id}`} className="text-sm text-emerald-700 hover:underline">← Retour au rapport</Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Replay : {r.missions.title}</h1>
        <p className="mt-1 text-stone-600">
          {r.audits.sites.name} · {replay.steps.length} étapes ·{" "}
          {r.success ? <span className="font-semibold text-emerald-700">checkout atteint</span> : <span className="font-semibold text-red-700">bloqué : {blockerLabel(r.blocker_type)}</span>}
        </p>
        <p className="mt-3 whitespace-pre-line rounded-lg bg-stone-100 p-3 text-sm text-stone-700">{replay.objective}</p>
      </div>

      <ol className="space-y-6">
        {replay.steps.map((s, i) => (
          <li key={i} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 md:grid-cols-[1fr_320px]">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={`Étape ${i + 1} : ${s.url}`} className="w-full rounded-lg border border-stone-200" loading="lazy" />
              {s.x != null && s.y != null && (
                <span
                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500/80 shadow"
                  style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
                  aria-hidden
                />
              )}
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Étape {i + 1}</p>
              <p className="break-all text-xs text-stone-500">{s.url}</p>
              {s.action && (
                <p>
                  <span className="font-medium">{ACTIONS[s.action] ?? s.action}</span>
                  {s.element && <> : {s.element}</>}
                </p>
              )}
              {s.thought && <p className="text-stone-600">{s.thought}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
