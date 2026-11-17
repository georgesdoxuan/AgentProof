import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db, getReplay } from "@/lib/engine";
import { AgentCursor, BrowserFrame, Eyebrow, Stamp, blockerLabel } from "@/lib/ui";

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
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-8 text-center">
        <p className="font-semibold">Replay momentanément indisponible</p>
        <p className="mt-1 text-[15px] text-ink-2">L&apos;API de l&apos;agent limite le nombre de requêtes. Réessaie dans une minute.</p>
      </div>
    );
  }
  if (!replay) notFound();
  const r = run as any;
  const last = replay.steps.length - 1;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Link href={`/audit/${r.audit_id}`} className="inline-flex h-11 items-center gap-1.5 text-[15px] font-semibold text-accent hover:underline">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 3L5 8l5 5" />
          </svg>
          Rapport {r.audits.sites.name}
        </Link>
        <Eyebrow>Replay · {replay.steps.length} étapes</Eyebrow>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.03em] sm:text-[44px]">{r.missions.title}</h1>
          <Stamp success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type)} />
        </div>
        <details className="group max-w-3xl rounded-2xl border border-line bg-card">
          <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            Consigne donnée à l&apos;agent
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 6l4 4 4-4" />
            </svg>
          </summary>
          <p className="whitespace-pre-line border-t border-line px-5 py-4 text-[14px] leading-relaxed text-ink-2">{replay.objective}</p>
        </details>
      </header>

      <ol className="relative space-y-10 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-line md:before:left-[19px]">
        {replay.steps.map((s, i) => (
          <li key={i} className="relative grid gap-4 pl-12 md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 md:pl-14">
            <span
              className={`absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border font-mono text-[12px] font-semibold tnum md:h-10 md:w-10 md:text-[13px] ${
                i === last ? (r.success ? "border-pass bg-pass text-card" : "border-fail bg-fail text-card") : "border-line bg-card text-ink-2"
              }`}
              aria-hidden
            >
              {i + 1}
            </span>
            <BrowserFrame url={s.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={`Étape ${i + 1} : ${s.url}`} className="block w-full" loading="lazy" />
              {s.x != null && s.y != null && <AgentCursor x={s.x} y={s.y} />}
            </BrowserFrame>
            <div className="space-y-3 md:sticky md:top-20 md:self-start">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">Étape {i + 1}</p>
              {s.action && (
                <p className="text-[17px]">
                  <span className="font-semibold">{ACTIONS[s.action] ?? s.action}</span>
                  {s.element && <span className="text-ink-2"> : {s.element}</span>}
                </p>
              )}
              {s.thought && (
                <blockquote className="border-l-2 border-accent pl-4 text-[15px] leading-relaxed text-ink-2">{s.thought}</blockquote>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
