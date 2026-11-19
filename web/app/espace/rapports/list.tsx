import Link from "next/link";
import { Hint } from "@/lib/hint";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { PAY_REACHED_BANK, paymentVerdicts } from "@/lib/engine";
import { locale, tr, type Dict, type Lang } from "@/lib/i18n";
import { getDict, getLang } from "@/lib/lang";
import { loadSpace, siteKey, type SpaceAudit } from "@/lib/space";
import { Chevron, Chip, Chips, DeviceTag, ExPay, Icon, MissionBar, Spinner, StatusGlyph, scoreTone } from "@/lib/ui";
import { CloseMenu, ConfirmButton, ReportsLayout } from "../controls";
import { SpaceShell } from "../shell";
import { TrashTabs } from "../parts";
import { SiteLogo } from "../../site-logo";

// Rapports › Tous / Favoris, and Réglages › Corbeille › Rapports: one list, three scopes. Same rows, actions change with the scope.
export type View = "all" | "favorites" | "trash";
const PATH: Record<View, string> = { all: "/espace/rapports", favorites: "/espace/rapports/favoris", trash: "/espace/reglages/corbeille/rapports" };
const STATUS = ["tous", "en-cours", "termines"] as const;

// Audit type, derived from what the audit holds (no column of its own): shopping missions, a real payment test, both,
// or a fix check (proof audit). Shown as a badge on every row and filterable with the chips above the list.
export type AuditType = "journey" | "payment" | "both" | "proof";
const TYPES: AuditType[] = ["journey", "both", "payment", "proof"];
const TYPE_ICONS: Record<AuditType, string[]> = { journey: ["cart"], payment: ["payment"], both: ["cart", "payment"], proof: ["shield"] };
export function auditType(a: Pick<SpaceAudit, "proof_of" | "payment_test" | "runs">): AuditType {
  if (a.proof_of) return "proof";
  if (a.payment_test) return a.runs.length ? "both" : "payment";
  return "journey";
}
const TYPE_TONE: Record<AuditType, string> = {
  journey: "bg-fill text-ink-2",
  proof: "bg-fill text-ink-2",
  payment: "bg-blue/12 text-link",
  both: "bg-blue/12 text-link",
};
// The badge: icon(s) + label, beside the name on wide screens, on its own line under the row on phones.
function TypeBadge({ type, t, className = "" }: { type: AuditType; t: Dict["reports"]["types"]; className?: string }) {
  return (
    <span title={t.tip[type]} className={`type-caption inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 font-semibold ${TYPE_TONE[type]} ${className}`}>
      {TYPE_ICONS[type].map((i) => <Icon key={i} name={i} className="h-[13px] w-[13px]" />)}
      {t[type]}
    </span>
  );
}

const dateFmt = (lang: Lang) => (d: string) =>
  new Date(d).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// One quiet line for the real payment tests linked to an audit: grey like the date line, green only when the
// payment reached the bank. Identical verdicts (without account, then signed in) are merged: "captcha (no account, signed in)".
function PayLine({ pays, lang, className = "" }: { pays: { status: string; verdict: string | null; with_login: boolean }[]; lang: Lang; className?: string }) {
  const t = tr(lang);
  const PAYMENT_VERDICTS = paymentVerdicts(lang);
  const multi = pays.length > 1;
  const groups = new Map<string, { reached: boolean; who: string[] }>();
  for (const pay of pays) {
    const reached = PAY_REACHED_BANK.includes(pay.verdict ?? "");
    const text =
      pay.status !== "done" && pay.status !== "error"
        ? t("test en cours", "test running")
        : pay.verdict === "three_ds_timeout"
          ? t("validé jusqu’au 3D Secure", "validated up to 3D Secure")
          : reached
          ? t("transmis à la banque", "sent to the bank")
          : (PAYMENT_VERDICTS[pay.verdict ?? ""] ?? t("erreur", "error")).toLowerCase();
    const g = groups.get(text) ?? { reached, who: [] };
    if (multi || pay.with_login) g.who.push(pay.with_login ? t("connecté", "signed in") : t("sans compte", "no account"));
    groups.set(text, g);
  }
  return (
    <span className={`type-small mt-0.5 flex min-w-0 items-start gap-1.5 text-ink-2 ${className}`}>
      <Icon name="payment" className="mt-[2px] h-[1.05em] w-[1.05em] shrink-0" />
      <span className="min-w-0">
        {t("Paiement", "Payment")} ·{" "}
        {[...groups].map(([text, g], i) => (
          <span key={text} className={g.reached ? "font-semibold text-pass" : undefined}>
            {i > 0 && " · "}
            {text}
            {g.who.length > 0 && ` (${g.who.join(", ")})`}
          </span>
        ))}
      </span>
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

// Search: site name, report name or domain, accents and case ignored.
const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export async function ReportsList({ view, vue, q = "" }: { view: View; vue?: string; q?: string }) {
  const ctx = await teamContext();
  if (!ctx) redirect(`/connexion?next=${PATH[view]}`);
  if (!ctx.team) redirect("/espace");
  const { user, team } = ctx;
  const [t, lang] = await Promise.all([getDict(), getLang()]);
  const r = t.reports;
  const date = dateFmt(lang);
  const [{ audits, trash, trashedSites }, jar] = await Promise.all([loadSpace(team.id), cookies()]);
  const bySite = jar.get("ap_rapports_vue")?.value === "site"; // set by ReportsLayout
  const typeCookie = jar.get("ap_rapports_type")?.value; // set by ReportsLayout
  const manage = canLaunch(team.role);

  const scoped = view === "trash" ? trash : view === "favorites" ? audits.filter((a) => a.favorite) : audits;
  const status = view !== "trash" && STATUS.includes(vue as (typeof STATUS)[number]) ? (vue as (typeof STATUS)[number]) : "tous";
  const running = scoped.filter((a) => a.status !== "done");
  const query = fold(q.trim().slice(0, 80));
  const byStatus = status === "en-cours" ? running : status === "termines" ? scoped.filter((a) => a.status === "done") : scoped;
  const searched = query ? byStatus.filter((a) => fold(`${a.label ?? ""} ${a.title ?? ""} ${a.sites?.domain ?? ""}`).includes(query)) : byStatus;
  // Type chips: only the types this scope holds, and only when there are two or more. A saved type absent here = all.
  const present = view === "trash" ? [] : TYPES.filter((ty) => scoped.some((a) => auditType(a) === ty));
  const type = present.length > 1 && present.includes(typeCookie as AuditType) ? (typeCookie as AuditType) : "all";
  const typeCount = (ty: AuditType) => searched.filter((a) => auditType(a) === ty).length;
  const shown = type === "all" ? searched : searched.filter((a) => auditType(a) === type);
  const back = status === "tous" ? PATH[view] : `${PATH[view]}?vue=${status}`;

  const intro =
    view === "trash" || !scoped.length ? undefined : (
      <Chips>
        <Chip icon={view === "favorites" ? "star" : "doc"}>{r.countOnly(scoped.length)}</Chip>
        {running.length > 0 && <Chip icon="live" tone="live">{r.running(running.length)}</Chip>}
      </Chips>
    );
  const title = view === "all" ? r.title : `${r.title} · ${r.sections[view]}`;
  const tab = "type-small flex h-8 items-center rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]";

  // One report row; in the per-site view the group header already shows the logo.
  const row = (a: SpaceAudit, logo: boolean) => {
  const name = a.label || r.siteDeleted;
  const sub = [
    a.title && a.sites?.domain,
    view === "trash" && a.deleted_at ? r.trashedOn(date(a.deleted_at)) : date(a.created_at),
  ].filter(Boolean);
  return (
    <div key={a.id} className={`flex items-center max-md:flex-wrap border-b border-hairline first:rounded-t-[18px] last:rounded-b-[18px] last:border-0 hover:bg-bg-2/60`}>
      <Link href={`/audit/${a.id}`} className={`block min-w-0 flex-1 ${view === "trash" ? "max-sm:basis-full" : ""}`}>
        <div className={`grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 md:gap-x-5 pl-5 pr-2 ${view === "trash" ? "md:grid-cols-[minmax(0,1fr)_8rem_6.5rem_1rem]" : "md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_8rem_6.5rem_1rem]"}`}>
          <span className="flex min-w-0 items-start gap-3">
          {logo && <SiteLogo domain={a.sites?.domain} name={a.sites?.domain} className="mt-0.5" />}
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold">
                {name}
                {a.devices ? <span className="font-normal text-ink-2"> · {r.vsDevices}</span> : a.compare_to && <span className="font-normal text-ink-2"> · {a.model ? r.vsModels : r.vsCompetitor}</span>}
              </span>
              <TypeBadge type={auditType(a)} t={r.types} className="max-md:hidden" />
            </span>
            <span className="type-small block text-ink-2">
              {sub.join(" · ")} · <DeviceTag device={a.device} lang={lang} />
            </span>
            {a.pay.length > 0 && <PayLine pays={a.pay} lang={lang} className="max-md:hidden" />}
          </span>
          </span>
          {view !== "trash" && <span className="type-small hidden truncate text-ink-2 md:block">{a.users?.email === user.email ? r.you : a.users?.email ?? "—"}</span>}
          <span className="hidden md:block">
            <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
          </span>
          <span className="flex items-center justify-end gap-2 whitespace-nowrap tnum">
            {a.status === "done" && a.s.score == null ? (
              // Nothing counted (anti-bot, stock, agent errors): say so instead of an unexplained "— %".
              <span className="type-small flex items-center gap-1.5 font-semibold text-ink-2">
                <StatusGlyph tone="unsure" className="h-4 w-4" />
                <span className="max-md:sr-only">{lang === "en" ? "No score" : "Sans score"}</span>
              </span>
            ) : a.status === "done" ? (
              // "hors paiement" goes under the score, never beside it: the column keeps its width and the
              // score never runs over the mission bar.
              <span className="flex flex-col items-end">
                <span className="flex items-center gap-2">
                  <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                  <span className="font-semibold">{a.s.score} %</span>
                  {a.s.exPay && <ExPay lang={lang} short className="md:hidden" />}
                </span>
                {a.s.exPay && <ExPay lang={lang} className="type-small leading-tight max-md:hidden" />}
              </span>
            ) : (
              <span className="type-small flex items-center gap-2 font-semibold text-live">
                <Spinner className="h-3.5 w-3.5" />
                {r.progress(a.s.finished, a.s.total)}
              </span>
            )}
          </span>
          <Chevron className="hidden h-3 w-3 text-ink-2 md:block" />
        </div>
      </Link>
      {manage ? (
        // Phones: in the trash, Restore and Delete go under the report so its name and date keep the width.
        <div className={`shrink-0 pr-3 ${view === "trash" ? "max-sm:order-2 max-sm:flex max-sm:basis-full max-sm:justify-end max-sm:pb-3" : ""}`}>
          <RowActions a={a} view={view} back={back} t={r} />
        </div>
      ) : (
        a.favorite && view !== "trash" && (
          <span className="shrink-0 pr-5 text-ink-2" title={r.sections.favorites}>
            <Star on />
          </span>
        )
      )}
      {/* Phones: the type and the payment result take a full-width line under the row, so the name keeps its width
          and the payment verdict stays on one or two lines. Aligned with the name (logo 32 px + 12 px gap). */}
      <Link
        href={`/audit/${a.id}`}
        tabIndex={-1}
        className={`-mt-1.5 flex basis-full flex-col items-start gap-1 pb-3 pr-5 md:hidden max-sm:order-1 ${logo ? "pl-16" : "pl-5"}`}
      >
        <TypeBadge type={auditType(a)} t={r.types} />
        {a.pay.length > 0 && <PayLine pays={a.pay} lang={lang} />}
      </Link>
    </div>
  );
  };
  const empty = (
    <div className="rounded-[18px] bg-tile">
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
    </div>
  );
  // Par site: one group per site (domain + device), newest report first inside; groups ordered by their newest report.
  const bySiteMap = new Map<string, SpaceAudit[]>();
  for (const a of [...shown].sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at))) {
    const key = a.sites ? siteKey(a.sites.domain, a.device) : "";
    bySiteMap.set(key, [...(bySiteMap.get(key) ?? []), a]);
  }
  const groups = [...bySiteMap];

  return (
    <SpaceShell
      title={view === "trash" ? undefined : title}
      settings={view === "trash"}
      narrow={view === "trash"}
      parent={view === "favorites" ? [PATH.all, r.title] : undefined}
      intro={intro}
      hint={view === "trash" ? r.trashIntro : undefined}
    >
      <section>
        {view === "trash" && (
          <TrashTabs
            current="rapports"
            counts={{ sites: trashedSites.length, rapports: trash.length }}
            action={
              manage && trash.some((a) => a.status === "done") ? (
                <Act action="empty" back={back}>
                  <ConfirmButton message={r.emptyConfirm(trash.filter((a) => a.status === "done").length)} className="btn btn-secondary min-h-9 px-4 text-[14px] text-fail shadow-[inset_0_0_0_1px_currentColor] hover:bg-fail hover:text-white">
                    {r.empty}
                  </ConfirmButton>
                </Act>
              ) : undefined
            }
          />
        )}
        <ReportsLayout
          initial={bySite}
          toolbar={<>
          <h2 className="sr-only">{r.history}</h2>
          {/* Sub-sections as tabs on narrow screens; the sidebar shows them on wide ones. */}
          {view !== "trash" && <nav aria-label={r.sectionsLabel} className="inline-flex rounded-[10px] bg-fill p-[3px] lg:hidden">
            {(["all", "favorites"] as const).map((v) => (
              <Link key={v} href={PATH[v]} aria-current={view === v ? "true" : undefined} className={tab}>
                {r.sections[v]}
              </Link>
            ))}
          </nav>}
          {view !== "trash" && scoped.length > 0 && (
            // Narrow screens: the same filters as two toggle chips beside the sub-section tabs (no second "Tous", which
            // would read as the same control). Tapping the active chip goes back to all.
            <nav aria-label={r.filtersLabel} className="flex gap-2 lg:hidden">
              {([["en-cours", r.filters.running, "live"], ["termines", r.filters.done, "none"]] as const).map(([v, l, icon]) => (
                <Link
                  key={v}
                  href={status === v ? PATH[view] : `${PATH[view]}?vue=${v}`}
                  scroll={false}
                  aria-current={status === v ? "true" : undefined}
                  className="rounded-full focus-visible:outline-2 focus-visible:outline-blue"
                >
                  <Chip icon={icon} tone={status !== v ? "plain" : v === "en-cours" ? "live" : "pass"}>{l}</Chip>
                </Link>
              ))}
            </nav>
          )}
          {view !== "trash" && scoped.length > 0 && (
            <nav aria-label={r.filtersLabel} className="inline-flex rounded-[10px] bg-fill p-[3px] max-lg:hidden">
              {([["tous", r.filters.all], ["en-cours", r.filters.running], ["termines", r.filters.done]] as const).map(([v, l]) => (
                <Link key={v} href={v === "tous" ? PATH[view] : `${PATH[view]}?vue=${v}`} scroll={false} aria-current={status === v ? "true" : undefined} className={`${tab} gap-2`}>
                  {/* Same colors as the rows and the sidebar: yellow = running, green = finished. */}
                  {v !== "tous" && <span className={`h-2 w-2 rounded-full ${v === "en-cours" ? "bg-live-fill" : "bg-pass"}`} aria-hidden />}
                  {l}
                </Link>
              ))}
            </nav>
          )}
          {scoped.length > 0 && (
            // Liste / Par site: radios, so the choice works and reads as one control; ReportsLayout listens to them.
            <fieldset className="inline-flex rounded-[10px] bg-fill p-[3px] max-lg:ml-auto">
              <legend className="sr-only">{r.layout.label}</legend>
              {([["liste", r.layout.list, false], ["site", r.layout.bySite, true]] as const).map(([v, l, on]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="ap_rapports_vue" value={v} defaultChecked={bySite === on} className="peer sr-only" />
                  <span className={`${tab} peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]`}>{l}</span>
                </label>
              ))}
            </fieldset>
          )}
          {view !== "trash" && scoped.length > 1 && (
            <form method="get" action={PATH[view]} role="search" className="w-full">
              {status !== "tous" && <input type="hidden" name="vue" value={status} />}
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={lang === "en" ? "Search a site or a report" : "Chercher un site ou un rapport"}
                aria-label={lang === "en" ? "Search reports" : "Chercher dans les rapports"}
                className="h-10 w-full rounded-[10px] bg-tile px-3.5 text-[15px] outline-none ring-blue focus-visible:ring-2 dark:bg-[#2c2c2e]"
              />
            </form>
          )}
          {present.length > 1 && (
            // Audit type: radios styled as chips, with the count under the current tab and search. ReportsLayout saves the choice.
            <fieldset className="flex w-full flex-wrap items-center gap-2">
              <legend className="sr-only">{r.types.label}</legend>
              {(["all", ...present] as const).map((v) => (
                <label key={v} className="cursor-pointer" title={v === "all" ? undefined : r.types.tip[v]}>
                  <input type="radio" name="ap_rapports_type" value={v} defaultChecked={type === v} className="peer sr-only" />
                  <span className="type-caption inline-flex min-h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full bg-fill px-3 font-semibold text-ink-2 transition-colors hover:text-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue">
                    {v !== "all" && TYPE_ICONS[v].map((i) => <Icon key={i} name={i} className="h-[14px] w-[14px]" />)}
                    {v === "all" ? r.types.all : r.types[v]}
                    <span className="tnum font-normal opacity-70">{v === "all" ? searched.length : typeCount(v)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          </>}
          list={shown.length ? <div className="rounded-[18px] bg-tile">{shown.map((a) => row(a, true))}</div> : empty}
          bySite={shown.length ? (
            <div className="space-y-3">
              {groups.map(([key, list]) => {
                const last = list.find((a) => a.status === "done");
                const site = list[0].sites;
                return (
                  <details key={key} open className="group/site rounded-[18px] bg-tile">
                    <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 rounded-[18px] py-3 pl-5 pr-5 hover:bg-bg-2/60 focus-visible:outline-2 focus-visible:outline-blue [&::-webkit-details-marker]:hidden group-open/site:rounded-b-none group-open/site:border-b group-open/site:border-hairline">
                      <SiteLogo domain={site?.domain} name={site?.domain} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{site?.domain ?? r.siteDeleted}</span>
                        <span className="type-small block text-ink-2">
                          {r.countOnly(list.length)} · <DeviceTag device={list[0].device} lang={lang} />
                        </span>
                      </span>
                      {list.some((a) => a.status !== "done") && (
                        <span className="type-small flex items-center gap-1.5 whitespace-nowrap font-semibold text-live">
                          <Spinner className="h-3.5 w-3.5" />
                          <span className="max-md:sr-only">{r.filters.running}</span>
                        </span>
                      )}
                      {last && (
                        <span className="flex items-center gap-2 whitespace-nowrap tnum">
                          {last.s.score == null ? (
                            <span className="type-small flex items-center gap-1.5 font-semibold text-ink-2">
                              <StatusGlyph tone="unsure" className="h-4 w-4" />
                              <span className="max-md:sr-only">{lang === "en" ? "No score" : "Sans score"}</span>
                            </span>
                          ) : (
                            <>
                              <StatusGlyph tone={scoreTone(last.s.score)} className="h-4 w-4" />
                              <span className="font-semibold">{last.s.score} %</span>
                              {last.s.exPay && (
                                <>
                                  <ExPay lang={lang} short className="md:hidden" />
                                  <ExPay lang={lang} className="type-small max-md:hidden" />
                                </>
                              )}
                            </>
                          )}
                        </span>
                      )}
                      <Chevron dir="down" className="h-3 w-3 text-ink-2 transition-transform group-open/site:rotate-180" />
                    </summary>
                    {list.map((a) => row(a, false))}
                  </details>
                );
              })}
            </div>
          ) : empty}
        />
      </section>
    </SpaceShell>
  );
}
