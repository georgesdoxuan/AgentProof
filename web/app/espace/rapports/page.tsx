import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { paymentVerdicts } from "@/lib/engine";
import { locale, tr, type Lang } from "@/lib/i18n";
import { getLang, getT } from "@/lib/lang";
import { deviceLabel, loadSpace } from "@/lib/space";
import { Chevron, MissionBar, Spinner, StatusGlyph, scoreTone } from "@/lib/ui";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Rapports", "Reports")} · AgentProof` };
}

const FILTERS = [
  ["tous", "Tous", "All"],
  ["en-cours", "En cours", "Running"],
  ["termines", "Terminés", "Finished"],
] as const;

const date = (d: string, lang: Lang) => new Date(d).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// One line for the real payment test linked to an audit.
function PayLine({ pay, multi, lang }: { pay: { status: string; verdict: string | null; with_login: boolean }; multi: boolean; lang: Lang }) {
  const t = tr(lang);
  const PAYMENT_VERDICTS = paymentVerdicts(lang);
  const P = t("Paiement", "Payment");
  const reached = pay.verdict === "bank_declined" || pay.verdict === "payment_accepted";
  const [text, cls] =
    pay.status !== "done" && pay.status !== "error"
      ? [`${P} : ${t("test en cours", "test running")}`, "text-ink-2"]
      : reached
        ? [`${P} : ${t("transmis à la banque", "sent to the bank")}`, "text-pass"]
        : pay.verdict === "inconclusive" || pay.verdict === "three_ds_timeout"
          ? [`${P} : ${PAYMENT_VERDICTS[pay.verdict!].toLowerCase()}`, "text-warn"]
          : [`${P} : ${(PAYMENT_VERDICTS[pay.verdict ?? ""] ?? t("erreur", "error")).toLowerCase()}`, "text-fail"];
  const who = multi || pay.with_login ? (pay.with_login ? t(" (connecté)", " (signed in)") : t(" (sans compte)", " (no account)")) : "";
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
  const lang = await getLang();
  const t = tr(lang);

  return (
    <SpaceShell team={team} teams={teams} title={t("Rapports", "Reports")} intro={audits.length ? `${audits.length} audit${audits.length > 1 ? "s" : ""}${running.length ? ` · ${running.length} ${t("en cours", "running")}` : ""}` : undefined}>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="sr-only">{t("Historique", "History")}</h2>
          {audits.length > 0 && (
            <nav aria-label={t("Filtrer l'historique", "Filter the history")} className="inline-flex rounded-[10px] bg-fill p-[3px]">
              {FILTERS.map(([v, fr, en]) => (
                <Link
                  key={v}
                  href={v === "tous" ? "/espace/rapports" : `/espace/rapports?vue=${v}`}
                  scroll={false}
                  aria-current={vue === v ? "true" : undefined}
                  className="type-small flex h-8 items-center rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]"
                >
                  {t(fr, en)}
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
                      {a.sites?.domain ?? t("Site supprimé", "Deleted site")}
                      {a.compare_to && <span className="font-normal text-ink-2"> · {a.model ? t("deux modèles", "two models") : t("avec concurrent", "with competitor")}</span>}
                    </span>
                    <span className="type-small text-ink-2">
                      {date(a.created_at, lang)} · {deviceLabel(a.device, lang)}
                    </span>
                    {a.pay.map((p, i) => <PayLine key={i} pay={p} multi={a.pay.length > 1} lang={lang} />)}
                  </span>
                  <span className="type-small hidden truncate text-ink-2 md:block">{a.users?.email === user.email ? t("Toi", "You") : a.users?.email ?? "—"}</span>
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
                        {a.s.finished} {t("sur", "of")} {a.s.total}
                      </span>
                    )}
                  </span>
                  <Chevron className="hidden h-3 w-3 text-ink-2 md:block" />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="type-headline">{audits.length ? t("Aucun audit dans cette vue.", "No audit in this view.") : t("Aucun audit pour l'instant.", "No audit yet.")}</p>
              <p className="mt-1 text-ink-2">
                {audits.length ? (
                  <Link href="/espace/rapports" className="text-link hover:underline">
                    {t("Voir tous les audits", "See all audits")}
                  </Link>
                ) : launch ? (
                  <Link href="/espace/nouveau" className="text-link hover:underline">{t("Lancer le premier audit", "Run the first audit")}</Link>
                ) : (
                  t("Les audits de l'équipe apparaîtront ici.", "The team's audits will appear here.")
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    </SpaceShell>
  );
}
