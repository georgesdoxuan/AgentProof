import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db, getReplay } from "@/lib/engine";
import { AutoRefresh } from "@/app/audit/[id]/refresh";
import { AgentCursor, BrowserFrame, Chevron, Verdict, blockerLabel } from "@/lib/ui";

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
  const { data: run } = await db.from("runs").select("id, audit_id, status, success, blocker_type, missions(title), audits(sites(name))").eq("id", id).maybeSingle();
  if (!run) notFound();

  const live = (run as any).status === "launched";
  let replay: Awaited<ReturnType<typeof getReplay>> = null;
  try {
    replay = await getReplay(id, live);
  } catch {
    return (
      <div className="bg-bg-2 py-32">
        {live && <AutoRefresh seconds={10} />}
        <div className="tile mx-auto w-[min(480px,87.5%)] text-center">
          <p className="type-headline">Replay momentanément indisponible.</p>
          <p className="mt-2 text-ink-2">L&apos;API de l&apos;agent limite le nombre de requêtes. Réessaie dans une minute.</p>
        </div>
      </div>
    );
  }
  if (!replay) notFound();
  const r = run as any;
  const last = replay.steps.length - 1;
  // Live: newest step first, page refreshes itself.
  const steps = replay.steps.map((s, i) => ({ s, i }));
  if (live) steps.reverse();

  return (
    <div className="bg-bg-2 pb-24 pt-10">
      <div className="wrap-wide">
        <header>
          <Link href={`/audit/${r.audit_id}`} className="-ml-0.5 inline-flex min-h-11 items-center gap-1 text-link hover:underline">
            <Chevron dir="left" className="h-3 w-3" />
            Rapport {r.audits.sites.name}
          </Link>
          {live && <AutoRefresh seconds={4} />}
          {live ? (
            <p className="type-eyebrow mt-6 flex items-center gap-2 text-fail">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fail opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fail" />
              </span>
              En direct · étape {replay.steps.length}
            </p>
          ) : (
            <p className="type-eyebrow mt-6 text-ink-2">Replay · {replay.steps.length} étapes</p>
          )}
          <h1 className="type-h1 mt-3">{r.missions.title}</h1>
          {r.success !== null && <Verdict success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type)} className="mt-5" />}
          <details className="group mt-8 max-w-[760px] rounded-[18px] bg-tile">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 type-headline [&::-webkit-details-marker]:hidden">
              Consigne donnée à l&apos;agent
              <Chevron dir="down" className="h-3.5 w-3.5 text-ink-2 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="type-small whitespace-pre-line border-t border-hairline px-6 py-5 text-ink-2">{replay.objective}</p>
          </details>
        </header>

        {live && !steps.length && <p className="type-intro mt-16 text-ink-2">L&apos;agent ouvre le navigateur…</p>}
        <ol className="mt-16 space-y-12">
          {steps.map(({ s, i }) => (
            <li key={i} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:gap-10">
              <BrowserFrame url={s.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={`Étape ${i + 1} : ${s.url}`} className="block w-full" loading={live && i === last ? "eager" : "lazy"} />
                {s.x != null && s.y != null && <AgentCursor x={s.x} y={s.y} />}
              </BrowserFrame>
              <div className="md:sticky md:top-[76px] md:self-start">
                <p className="type-small flex items-center gap-2 text-ink-2 tnum">
                  <span
                    className={`grid h-7 min-w-7 place-items-center rounded-full px-2 font-semibold ${
                      i === last && !live ? (r.success ? "bg-pass text-white" : "bg-fail text-white") : "bg-tile text-ink"
                    }`}
                  >
                    {i + 1}
                  </span>
                  sur {replay.steps.length}
                </p>
                {s.action && (
                  <p className="type-headline mt-4">
                    {ACTIONS[s.action] ?? s.action}
                    {s.element && <span className="font-normal text-ink-2"> · {s.element}</span>}
                  </p>
                )}
                {s.thought && <p className="mt-3 text-ink-2">« {s.thought} »</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
