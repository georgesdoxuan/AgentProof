import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db, getReplay } from "@/lib/engine";
import { AutoRefresh } from "@/app/audit/[id]/refresh";
import { AgentCursor, BrowserFrame, Chevron, Verdict, blockerLabel } from "@/lib/ui";
import { missionTitle, tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

const ACTIONS: Record<string, [string, string]> = {
  click_web: ["Clic", "Click"],
  write: ["Saisie", "Typing"],
  scroll_web: ["Défilement", "Scroll"],
  go_to_web: ["Navigation", "Navigation"],
  go_back_web: ["Retour", "Back"],
  press_keys_web: ["Touches", "Keys"],
  select_option: ["Choix dans une liste", "Pick from a list"],
  move_mouse_web: ["Survol", "Hover"],
  wait_web: ["Attente", "Wait"],
  answer: ["Réponse finale", "Final answer"],
};

export default async function Replay({ params, searchParams }: { params: Promise<{ run: string }>; searchParams: Promise<{ a?: string; essai?: string }> }) {
  await connection();
  const lang = await getLang();
  const t = tr(lang);
  const id = Number((await params).run);
  const { a, essai } = await searchParams;
  const first = essai === "1"; // first attempt of a mission that was replayed
  // Run ids follow each other: the link must also carry the audit's unguessable id, like the report it comes from.
  // Otherwise anyone could walk /replay/1, /replay/2… and spend the H request budget creating share links.
  if (!Number.isInteger(id) || !a || !/^[0-9a-f-]{36}$/.test(a)) notFound();
  const { data: run } = await db.from("runs").select("id, audit_id, status, success, blocker_type, first_attempt, missions(title), audits(sites(name))").eq("id", id).maybeSingle();
  if (!run || run.audit_id !== a) notFound();

  const live = !first && (run as any).status === "launched";
  let replay: Awaited<ReturnType<typeof getReplay>> = null;
  try {
    replay = await getReplay(id, live, first);
  } catch {
    return (
      <div className="bg-bg-2 py-32">
        {live && <AutoRefresh seconds={10} />}
        <div className="tile mx-auto w-[min(480px,87.5%)] text-center">
          <p className="type-headline">{t("Replay momentanément indisponible.", "Replay temporarily unavailable.")}</p>
          <p className="mt-2 text-ink-2">{t("L’API de l’agent limite le nombre de requêtes. Réessaie dans une minute.", "The agent's API limits the number of requests. Try again in a minute.")}</p>
        </div>
      </div>
    );
  }
  if (!replay) notFound();
  // The first attempt shows its own verdict, kept when the mission was replayed.
  const r = first ? { ...(run as any), ...(run as any).first_attempt } : (run as any);
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
            {t("Rapport", "Report")} {r.audits.sites.name}
          </Link>
          {live && <AutoRefresh seconds={4} />}
          {live ? (
            <p className="type-eyebrow mt-6 flex items-center gap-2 text-fail">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fail opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fail" />
              </span>
              {t("En direct · étape", "Live · step")} {replay.steps.length}
            </p>
          ) : (
            <p className="type-eyebrow mt-6 text-ink-2">
              Replay{first ? t(" du premier essai", " of the first attempt") : ""} · {replay.steps.length} {t("étapes", "steps")}
            </p>
          )}
          <h1 className="type-h1 mt-3">{missionTitle(r.missions.title, lang)}</h1>
          {r.success !== null && <Verdict success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type, lang)} className="mt-5" />}
          <details className="group mt-8 max-w-[760px] rounded-[18px] bg-tile">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 type-headline [&::-webkit-details-marker]:hidden">
              {t("Consigne donnée à l’agent", "Instructions given to the agent")}
              <Chevron dir="down" className="h-3.5 w-3.5 text-ink-2 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="type-small whitespace-pre-line border-t border-hairline px-6 py-5 text-ink-2">{replay.objective}</p>
          </details>
        </header>

        {live && !steps.length && <p className="type-intro mt-16 text-ink-2">{t("L’agent ouvre le navigateur…", "The agent is opening the browser…")}</p>}
        <ol className="mt-16 space-y-12">
          {steps.map(({ s, i }) => (
            <li key={i} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:gap-10">
              <BrowserFrame url={s.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={`${t("Étape", "Step")} ${i + 1} : ${s.url}`} className="block w-full" loading={live && i === last ? "eager" : "lazy"} />
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
                  {t("sur", "of")} {replay.steps.length}
                </p>
                {s.action && (
                  <p className="type-headline mt-4">
                    {ACTIONS[s.action] ? t(...ACTIONS[s.action]) : s.action}
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
