import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PAY_REACHED_BANK, db, getPaymentReplay, getReplay, paymentVerdicts } from "@/lib/engine";
import { BlurredShot } from "./blurred";
import { canSeePayment, currentUser } from "@/lib/auth";
import { isJury } from "@/lib/jury";
import { AutoRefresh } from "@/app/audit/[id]/refresh";
import { AgentCursor, BrowserFrame, Chevron, StatusGlyph, Verdict, blockerLabel } from "@/lib/ui";
import { loginName, missionTitle, tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { ClampText, OriginalText } from "@/lib/clamp";
import { translate } from "@/lib/translate";

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

const hoursSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 3600_000 : 0);

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
  const { data: run } = await db
    .from("runs")
    .select("id, audit_id, status, success, blocker_type, first_attempt, with_login, login:login_id(label, login_hint), payment_verdict, finished_at, missions(title, slug), audits(team_id, sites(name))")
    .eq("id", id)
    .maybeSingle();
  if (!run || run.audit_id !== a) notFound();
  // Real payment test: private replay, card masked, only for the team that ran it (see getPaymentReplay).
  const payment = (run as any).missions?.slug === "paiement";
  if (payment && (first || !(await canSeePayment((run as any).audits?.team_id ?? null)))) notFound();
  // Back to the report the payment test was launched from (staff tests without one go back to their R&D page).
  const { data: parent } = payment ? await db.from("audits").select("id").eq("payment_test", run.audit_id).limit(1).maybeSingle() : { data: null };
  const back = payment ? (parent ? `/audit/${parent.id}` : "/test-paiement") : `/audit/${run.audit_id}`;
  // H deletes payment screenshots 4 hours after the test.
  const shotsGone = payment && hoursSince((run as any).finished_at) > 4;
  const payOk = PAY_REACHED_BANK.includes((run as any).payment_verdict);

  const live = !first && (run as any).status === "launched";
  let replay: Awaited<ReturnType<typeof getReplay>> = null;
  try {
    replay = payment ? await getPaymentReplay(id, isJury((await currentUser())?.email)) : await getReplay(id, live, first);
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
  // A payment test whose steps are no longer kept (jury demo copies are scrubbed): say so, never a bare 404.
  if (!replay && payment)
    return (
      <div className="bg-bg-2 py-32">
        <div className="tile mx-auto w-[min(480px,87.5%)] text-center">
          <p className="type-headline">{t("Replay du test de paiement non conservé.", "Payment test replay not kept.")}</p>
          <p className="mt-2 text-ink-2">
            {t(
              "Un test de paiement reste privé : ses étapes ne sont pas copiées hors de l'équipe qui l'a lancé, et ses captures sont effacées 4 h après. Le verdict reste dans le rapport.",
              "A payment test stays private: its steps are not copied outside the team that ran it, and its screenshots are deleted 4 h later. The verdict stays in the report.",
            )}
          </p>
          <Link href={back} className="mt-4 inline-block text-link hover:underline">{t("Retour au rapport", "Back to the report")}</Link>
        </div>
      </div>
    );
  if (!replay) notFound();
  // The first attempt shows its own verdict, kept when the mission was replayed.
  // A payment test passes once the payment reached the bank (3D Secure request included), whatever older runs stored.
  const r = first ? { ...(run as any), ...(run as any).first_attempt } : payment ? { ...(run as any), success: payOk } : (run as any);
  const last = replay.steps.length - 1;
  // Live: newest step first, page refreshes itself.
  const steps = replay.steps.map((s, i) => ({ s, i }));
  // The agent reasons in English: shown in the interface language. Not for a payment replay, whose reasoning can
  // quote the team's test identity (name, e-mail, address): it stays as written, never sent out. Not live either:
  // the page refreshes every 10 s and must not wait on a translation.
  const [objective, ...thoughts] = payment || live ? [] : await translate([replay.objective, ...replay.steps.map((s) => s.thought)], lang);
  if (live) steps.reverse();

  return (
    <div className="bg-bg-2 pb-24 pt-10">
      <div className="wrap-wide">
        <header>
          <Link href={back} className="-ml-0.5 inline-flex min-h-11 items-center gap-1 text-link hover:underline">
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
          <h1 className="type-h1 mt-3">
            {payment
              ? t("Test de paiement réel", "Real payment test") + (r.with_login ? t(" · connecté avec ", " · signed in with ") + loginName(r.login, lang) : t(" · sans compte", " · without an account"))
              : missionTitle(r.missions.title, lang)}
          </h1>
          {payment && r.payment_verdict && (
            <p className="type-small mt-5 inline-flex items-center gap-1.5 font-semibold">
              <StatusGlyph tone={payOk ? "pass" : "fail"} />
              {paymentVerdicts(lang)[r.payment_verdict] ?? r.payment_verdict}
            </p>
          )}
          {payment && (
            <p className="type-small mt-4 max-w-[760px] text-ink-2">
              {shotsGone
                ? t("Les captures ont été effacées 4 h après le test pour protéger la carte. Les actions et le raisonnement de l’agent restent, numéro de carte masqué.", "Screenshots were deleted 4 hours after the test to protect the card. The agent's actions and reasoning remain, card number masked.")
                : t("Replay privé, visible seulement par ton équipe. Numéro de carte, expiration et CVC sont masqués dans le texte, et les captures sont floutées dès que l’agent tape la carte. Elles sont effacées 4 h après le test.", "Private replay, only your team can see it. Card number, expiry and CVC are masked in the text, and screenshots are blurred from the moment the agent types the card. They are deleted 4 hours after the test.")}
            </p>
          )}
          {!payment && r.success !== null && <Verdict success={!!r.success} label={r.success ? undefined : blockerLabel(r.blocker_type, lang)} className="mt-5" />}
          <details className="group mt-8 max-w-[760px] rounded-[18px] bg-tile">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 type-headline [&::-webkit-details-marker]:hidden">
              {t("Consigne donnée à l’agent", "Instructions given to the agent")}
              <Chevron dir="down" className="h-3.5 w-3.5 text-ink-2 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="type-small whitespace-pre-line border-t border-hairline px-6 py-5 text-ink-2">{objective ?? replay.objective}</p>
          </details>
        </header>

        {live && !steps.length && <p className="type-intro mt-16 text-ink-2">{t("L’agent ouvre le navigateur…", "The agent is opening the browser…")}</p>}
        <ol className="mt-16 space-y-12">
          {steps.map(({ s, i }) => (
            <li key={i} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:gap-10">
              <BrowserFrame url={s.url} className="md:self-start">
                {shotsGone ? (
                  <div className="type-small grid aspect-[16/10] place-items-center bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">{t("Capture effacée", "Screenshot deleted")}</div>
                ) : (
                  "sensitive" in s && s.sensitive ? (
                    <BlurredShot src={s.image} alt={`${t("Étape", "Step")} ${i + 1} : ${s.url}`} lang={lang} eager={live && i === last} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={`${t("Étape", "Step")} ${i + 1} : ${s.url}`} className="block w-full" loading={live && i === last ? "eager" : "lazy"} />
                  )
                )}
                {!shotsGone && s.x != null && s.y != null && <AgentCursor x={s.x} y={s.y} />}
              </BrowserFrame>
              {/* Never taller than the screenshot beside it (ap-clamp-bound): long reasoning is cut, « Voir plus » unfolds it. */}
              <div className="ap-clamp-bound flex min-w-0 flex-col">
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
                {s.thought && (
                  <ClampText lang={lang} lines={8} fill className="mt-3">
                    <p className="text-ink-2">« {thoughts[i] ?? s.thought} »</p>
                    <OriginalText original={s.thought} shown={thoughts[i]} lang={lang} />
                  </ClampText>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
