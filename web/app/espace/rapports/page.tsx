import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { PAYMENT_VERDICTS } from "@/lib/engine";
import { deviceLabel, loadSpace } from "@/lib/space";
import { Chevron, MissionBar, Spinner, StatusGlyph, scoreTone } from "@/lib/ui";
import { SpaceShell } from "../shell";

export const metadata = { title: "Rapports · AgentProof" };

const FILTERS = [
  ["tous", "Tous"],
  ["en-cours", "En cours"],
  ["termines", "Terminés"],
] as const;

const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// One line for the real payment test linked to an audit.
function PayLine({ pay, multi }: { pay: { status: string; verdict: string | null; with_login: boolean }; multi: boolean }) {
  const reached = pay.verdict === "bank_declined" || pay.verdict === "payment_accepted";
  const [text, cls] =
    pay.status !== "done" && pay.status !== "error"
      ? ["Paiement : test en cours", "text-ink-2"]
      : reached
        ? ["Paiement : transmis à la banque", "text-pass"]
        : pay.verdict === "inconclusive" || pay.verdict === "three_ds_timeout"
          ? [`Paiement : ${PAYMENT_VERDICTS[pay.verdict!].toLowerCase()}`, "text-warn"]
          : [`Paiement : ${(PAYMENT_VERDICTS[pay.verdict ?? ""] ?? "erreur").toLowerCase()}`, "text-fail"];
  const who = multi || pay.with_login ? (pay.with_login ? " (connecté)" : " (sans compte)") : "";
  return <span className={`type-small block font-semibold ${cls}`}>{text}{who}</span>;
}

// Every audit of the team, newest first.
export default async function Rapports({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/rapports");
  if (!ctx.team) redirect("/espace");
  const { user, teams, team } = ctx;
  const vue = (await searchParams).vue ?? "tous";
  const { audits } = await loadSpace(team.id);
  const running = audits.filter((a) => a.status !== "done");
  const shown = vue === "en-cours" ? running : vue === "termines" ? audits.filter((a) => a.status === "done") : audits;
  const launch = canLaunch(team.role);

  return (
    <SpaceShell team={team} teams={teams} title="Rapports" intro={audits.length ? `${audits.length} audit${audits.length > 1 ? "s" : ""}${running.length ? ` · ${running.length} en cours` : ""}` : undefined}>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="sr-only">Historique</h2>
          {audits.length > 0 && (
            <nav aria-label="Filtrer l'historique" className="inline-flex rounded-[10px] bg-fill p-[3px]">
              {FILTERS.map(([v, l]) => (
                <Link
                  key={v}
                  href={v === "tous" ? "/espace/rapports" : `/espace/rapports?vue=${v}`}
                  scroll={false}
                  aria-current={vue === v ? "true" : undefined}
                  className="type-small flex h-8 items-center rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]"
                >
                  {l}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="overflow-hidden rounded-[18px] bg-tile">
          {shown.length ? (
            shown.map((a) => (
              <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
                <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_8rem_5.5rem_1rem]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {a.sites?.domain ?? "Site supprimé"}
                      {a.compare_to && <span className="font-normal text-ink-2"> · avec concurrent</span>}
                    </span>
                    <span className="type-small text-ink-2">
                      {date(a.created_at)} · {deviceLabel(a.device)}
                    </span>
                    {a.pay.map((p, i) => <PayLine key={i} pay={p} multi={a.pay.length > 1} />)}
                  </span>
                  <span className="type-small hidden truncate text-ink-2 md:block">{a.users?.email === user.email ? "Toi" : a.users?.email ?? "—"}</span>
                  <span className="hidden md:block">
                    <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                  </span>
                  <span className="flex items-center justify-end gap-2 whitespace-nowrap tnum">
                    {a.status === "done" ? (
                      <>
                        <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                        <span className="font-semibold">{a.s.score ?? "—"} %</span>
                      </>
                    ) : (
                      <span className="type-small flex items-center gap-2 text-ink-2">
                        <Spinner className="h-3.5 w-3.5" />
                        {a.s.finished} sur {a.s.total}
                      </span>
                    )}
                  </span>
                  <Chevron className="hidden h-3 w-3 text-ink-2 md:block" />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="type-headline">{audits.length ? "Aucun audit dans cette vue." : "Aucun audit pour l'instant."}</p>
              <p className="mt-1 text-ink-2">
                {audits.length ? (
                  <Link href="/espace/rapports" className="text-link hover:underline">
                    Voir tous les audits
                  </Link>
                ) : launch ? (
                  <Link href="/espace/nouveau" className="text-link hover:underline">Lancer le premier audit</Link>
                ) : (
                  "Les audits de l'équipe apparaîtront ici."
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    </SpaceShell>
  );
}
