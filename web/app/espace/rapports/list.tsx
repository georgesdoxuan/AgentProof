import Link from "next/link";
import { Hint } from "@/lib/hint";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { paymentVerdicts } from "@/lib/engine";
import { locale, tr, type Dict, type Lang } from "@/lib/i18n";
import { getDict, getLang } from "@/lib/lang";
import { loadSpace, type SpaceAudit } from "@/lib/space";
import { Chevron, Chip, Chips, DeviceTag, Icon, MissionBar, Spinner, StatusGlyph, scoreTone } from "@/lib/ui";
import { CloseMenu, ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";
import { SiteLogo } from "../../site-logo";

// Rapports › Tous / Favoris / Corbeille: one list, three scopes. Same rows, actions change with the scope.
export type View = "all" | "favorites" | "trash";
const PATH: Record<View, string> = { all: "/espace/rapports", favorites: "/espace/rapports/favoris", trash: "/espace/rapports/corbeille" };
const STATUS = ["tous", "en-cours", "termines"] as const;

const dateFmt = (lang: Lang) => (d: string) =>
  new Date(d).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
  return (
    <span className={`type-small flex min-w-0 items-center gap-1 font-semibold ${cls}`} title={`${text}${who}`}>
      <Icon name="payment" className="h-[1.1em] w-[1.1em] shrink-0" />
      <span className="md:truncate">{text}{who}</span>
    </span>
  );
}

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-blue";
const menuItem = "type-small flex w-full items-center rounded-[8px] px-3 py-2 text-left hover:bg-fill";

// A small form posting one action on one report, then landing back on this page.
function Act({ id, action, back, children, extra }: { id?: string; action: string; back: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <form action="/api/reports" method="post">
      <input type="hidden" name="action" value={action} />
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="back" value={back} />
      {extra}
      {children}
    </form>
  );
}

function Star({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${on ? "text-warn" : ""}`} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

// Star + "…" menu (rename, trash) on active reports; Restore + Delete permanently in the trash.
function RowActions({ a, view, back, t }: { a: SpaceAudit; view: View; back: string; t: Dict["reports"] }) {
  if (view === "trash")
    return (
      <div className="flex items-center gap-1">
        <Act id={a.id} action="restore" back={back}>
          <button className="type-small h-8 rounded-full bg-fill px-3.5 font-semibold text-ink hover:bg-line/60">{t.restore}</button>
        </Act>
        {a.status === "done" ? (
          <Act id={a.id} action="purge" back={back}>
            <ConfirmButton message={t.purgeConfirm} label={t.purge} className="grid h-9 w-9 place-items-center rounded-full text-fail transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-blue">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 6.5h16M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 10.5v6M14 10.5v6" />
              </svg>
            </ConfirmButton>
          </Act>
        ) : (
          <span className="grid h-9 w-9 place-items-center text-ink-2" title={t.purgeRunning} aria-label={t.purgeRunning}>
            <Spinner className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    );
  return (
    <div className="flex items-center gap-0.5">
      <Act id={a.id} action={a.favorite ? "unfavorite" : "favorite"} back={back}>
        <button className={iconBtn} aria-label={a.favorite ? t.unfavorite : t.favorite} title={a.favorite ? t.unfavorite : t.favorite} aria-pressed={a.favorite}>
          <Star on={a.favorite} />
        </button>
      </Act>
      {/* Native disclosure: opens without JS; Cancel closes it. */}
      <details className="group relative">
        <summary className={`${iconBtn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} aria-label={t.more} title={t.more}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
            <circle cx="5.5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="18.5" cy="12" r="1.6" />
          </svg>
        </summary>
        <div className="absolute right-0 top-10 z-20 w-[min(18rem,80vw)] space-y-1 rounded-[12px] bg-tile p-2 shadow-[0_8px_30px_rgb(0_0_0/0.18)] dark:bg-[#2c2c2e]">
          <Act
            id={a.id}
            action="rename"
            back={back}
            extra={
              <label className="block px-3 pt-1">
                <span className="type-caption font-semibold text-ink-2">
                  <Hint focusable={false} tip={t.renameHint}>{t.renameField}</Hint>
                </span>
                <input
                  name="title"
                  defaultValue={a.title ?? ""}
                  placeholder={a.sites?.domain ?? ""}
                  maxLength={120}
                  className="mt-1 h-9 w-full rounded-[8px] bg-bg-2 px-3 type-small text-ink outline-none focus-visible:outline-2 focus-visible:outline-blue dark:bg-[#3a3a3c]"
                />
              </label>
            }
          >
            <div className="flex justify-end gap-2 px-3 pb-2 pt-2">
              <CloseMenu className="type-small flex h-8 items-center rounded-full px-3 text-ink-2 hover:bg-fill">{t.cancel}</CloseMenu>
              <button className="type-small h-8 rounded-full bg-blue px-3.5 font-semibold text-white hover:opacity-90">{t.save}</button>
            </div>
          </Act>
          <div className="border-t border-hairline pt-1">
            <Act id={a.id} action="trash" back={back}>
              <button className={`${menuItem} text-fail`}>{t.trash}</button>
            </Act>
          </div>
        </div>
      </details>
    </div>
  );
}

export async function ReportsList({ view, vue }: { view: View; vue?: string }) {
  const ctx = await teamContext();
  if (!ctx) redirect(`/connexion?next=${PATH[view]}`);
  if (!ctx.team) redirect("/espace");
  const { user, teams, team } = ctx;
  const [t, lang] = await Promise.all([getDict(), getLang()]);
  const r = t.reports;
  const date = dateFmt(lang);
  const { audits, trash } = await loadSpace(team.id);
  const manage = canLaunch(team.role);

  const scoped = view === "trash" ? trash : view === "favorites" ? audits.filter((a) => a.favorite) : audits;
  const status = view !== "trash" && STATUS.includes(vue as (typeof STATUS)[number]) ? (vue as (typeof STATUS)[number]) : "tous";
  const running = scoped.filter((a) => a.status !== "done");
  const shown = status === "en-cours" ? running : status === "termines" ? scoped.filter((a) => a.status === "done") : scoped;
  const back = status === "tous" ? PATH[view] : `${PATH[view]}?vue=${status}`;

  const intro =
    view === "trash" || !scoped.length ? undefined : (
      <Chips>
        <Chip icon={view === "favorites" ? "star" : "doc"}>{r.countOnly(scoped.length)}</Chip>
        {running.length > 0 && <Chip icon="live" tone="blue">{r.running(running.length)}</Chip>}
      </Chips>
    );
  const title = view === "all" ? r.title : `${r.title} · ${r.sections[view]}`;
  const tab = "type-small flex h-8 items-center rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]";

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title={title}
      parent={view === "all" ? undefined : [PATH.all, r.title]}
      intro={intro}
      hint={view === "trash" ? r.trashIntro : undefined}
      actions={
        view === "trash" && manage && trash.some((a) => a.status === "done") ? (
          <Act action="empty" back={back}>
            <ConfirmButton message={r.emptyConfirm(trash.filter((a) => a.status === "done").length)} className="btn btn-secondary min-h-9 px-4 text-[14px] text-fail shadow-[inset_0_0_0_1px_currentColor] hover:bg-fail hover:text-white">
              {r.empty}
            </ConfirmButton>
          </Act>
        ) : undefined
      }
    >
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="sr-only">{r.history}</h2>
          {/* Sub-sections as tabs on narrow screens; the sidebar shows them on wide ones. */}
          <nav aria-label={r.sectionsLabel} className="inline-flex rounded-[10px] bg-fill p-[3px] lg:hidden">
            {(["all", "favorites", "trash"] as const).map((v) => (
              <Link key={v} href={PATH[v]} aria-current={view === v ? "true" : undefined} className={tab}>
                {r.sections[v]}
              </Link>
            ))}
          </nav>
          {view !== "trash" && scoped.length > 0 && (
            // Narrow screens show one control (the sub-sections): two stacked segmented controls both starting with "Tous" read as one.
            <nav aria-label={r.filtersLabel} className="inline-flex rounded-[10px] bg-fill p-[3px] max-lg:hidden">
              {([["tous", r.filters.all], ["en-cours", r.filters.running], ["termines", r.filters.done]] as const).map(([v, l]) => (
                <Link key={v} href={v === "tous" ? PATH[view] : `${PATH[view]}?vue=${v}`} scroll={false} aria-current={status === v ? "true" : undefined} className={tab}>
                  {l}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="rounded-[18px] bg-tile">
          {shown.length ? (
            shown.map((a) => {
              const name = a.label || r.siteDeleted;
              const sub = [
                a.title && a.sites?.domain,
                view === "trash" && a.deleted_at ? r.trashedOn(date(a.deleted_at)) : date(a.created_at),
              ].filter(Boolean);
              return (
                <div key={a.id} className="flex items-center border-b border-hairline first:rounded-t-[18px] last:rounded-b-[18px] last:border-0 hover:bg-bg-2/60">
                  <Link href={`/audit/${a.id}`} className="block min-w-0 flex-1">
                    <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 py-3 pl-5 pr-2 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_8rem_5.5rem_1rem]">
                      <span className="flex min-w-0 items-start gap-3">
                      <SiteLogo domain={a.sites?.domain} name={a.sites?.domain} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {name}
                          {a.compare_to && <span className="font-normal text-ink-2"> · {a.model ? r.vsModels : r.vsCompetitor}</span>}
                        </span>
                        <span className="type-small block text-ink-2">
                          {sub.join(" · ")} · <DeviceTag device={a.device} lang={lang} />
                        </span>
                        {a.pay.map((p, i) => <PayLine key={i} pay={p} multi={a.pay.length > 1} lang={lang} />)}
                      </span>
                      </span>
                      <span className="type-small hidden truncate text-ink-2 md:block">{a.users?.email === user.email ? r.you : a.users?.email ?? "—"}</span>
                      <span className="hidden md:block">
                        <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                      </span>
                      <span className="flex items-center justify-end gap-2 whitespace-nowrap tnum">
                        {a.status === "done" && a.s.score == null ? (
                          // Nothing counted (anti-bot, stock, agent errors): say so instead of an unexplained "— %".
                          <span className="type-small flex items-center gap-1.5 font-semibold text-ink-2">
                            <StatusGlyph tone="unsure" className="h-4 w-4" />
                            {lang === "en" ? "No score" : "Sans score"}
                          </span>
                        ) : a.status === "done" ? (
                          <>
                            <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                            <span className="font-semibold">{a.s.score} %</span>
                          </>
                        ) : (
                          <span className="type-small flex items-center gap-2 text-ink-2">
                            <Spinner className="h-3.5 w-3.5" />
                            {r.progress(a.s.finished, a.s.total)}
                          </span>
                        )}
                      </span>
                      <Chevron className="hidden h-3 w-3 text-ink-2 md:block" />
                    </div>
                  </Link>
                  {manage ? (
                    <div className="shrink-0 pr-3">
                      <RowActions a={a} view={view} back={back} t={r} />
                    </div>
                  ) : (
                    a.favorite && view !== "trash" && (
                      <span className="shrink-0 pr-5 text-ink-2" title={r.sections.favorites}>
                        <Star on />
                      </span>
                    )
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-fill text-ink-2" aria-hidden>
                <Icon name={view === "trash" ? "trash" : view === "favorites" ? "star" : "doc"} className="h-6 w-6" />
              </span>
              <p className="type-headline">
                {view === "trash" ? r.emptyTrash : view === "favorites" && !scoped.length ? r.emptyFavorites : scoped.length ? r.emptyView : r.emptyAll}
              </p>
              <p className="type-small text-ink-2">
                {view === "favorites" && !scoped.length ? (
                  audits.length ? r.emptyFavoritesNote : null
                ) : view !== "all" || scoped.length ? (
                  <Link href={PATH.all} className="text-link hover:underline">
                    {r.seeAll}
                  </Link>
                ) : manage ? (
                  <Link href="/espace/nouveau" className="text-link hover:underline">
                    {r.launchFirst}
                  </Link>
                ) : (
                  r.teamWillSee
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    </SpaceShell>
  );
}
