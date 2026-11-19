import Link from "next/link";
import { BlockerIcon, BrowserFrame, Chevron, DeviceTag, MissionBar, StatusGlyph, blockerLabel, scoreTone } from "@/lib/ui";
import { deviceLabel, fixHints, shortDate, type Blocker, type SiteView } from "@/lib/space";
import { tr, type Lang } from "@/lib/i18n";
import { getLang, getT } from "@/lib/lang";
import { SiteLogo } from "../site-logo";

export const sitePath = (v: SiteView) => `/espace/sites/${v.key}`;

// Same site, same device, fresh pass: skips the 7-day reuse of the last report.
export async function RelaunchForm({ site, label, dark = false }: { site: SiteView; label?: string; dark?: boolean }) {
  const t = await getT();
  return (
    <form action="/api/audits" method="post">
      <input type="hidden" name="url" value={site.url} />
      <input type="hidden" name="device" value={site.device} />
      <input type="hidden" name="force" value="1" />
      <button className={`btn disabled:pointer-events-none disabled:opacity-40 ${dark ? "btn-dark" : ""}`} disabled={!!site.running}>
        {site.running ? t("Audit en cours", "Audit running") : (label ?? t("Relancer pour vérifier", "Rerun to check"))}
      </button>
    </form>
  );
}

export async function Delta({ site, className = "" }: { site: SiteView; className?: string }) {
  const t = await getT();
  const a = site.latest?.s.score;
  const b = site.previous?.s.score;
  if (a == null || b == null) return null;
  const d = a - b;
  return (
    <span className={`type-small whitespace-nowrap tnum ${d === 0 ? "text-ink-2" : d > 0 ? "text-pass" : "text-fail"} ${className}`}>
      {d === 0 ? t("Stable", "Steady") : `${d > 0 ? "+" : "−"}${Math.abs(d)} pts`}
    </span>
  );
}

export const rankText = (r: SiteView["rank"], lang: Lang = "fr") => {
  if (lang === "en") {
    if (!r) return "Not in the public ranking";
    const sfx = r.pos % 100 >= 11 && r.pos % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][r.pos % 10] ?? "th";
    return `${r.pos}${sfx} of ${r.of} in the ranking`;
  }
  return r ? `${r.pos}${r.pos === 1 ? "er" : "e"} sur ${r.of} au classement` : "Hors classement public";
};

// One card per site: score, trend, main blocker, where it stands publicly.
// With `manage`, a "…" menu sits over the chevron's place, outside the link: a form can't live inside an <a>.
export async function SiteCard({ site, manage = false }: { site: SiteView; manage?: boolean }) {
  const lang = await getLang();
  const t = tr(lang);
  const s = site.latest?.s;
  const open = site.blockers.filter((b) => b.state !== "check");
  const card = (
    <Link href={sitePath(site)} className="tile group flex h-full flex-col gap-6 p-7! transition-colors duration-200 hover:bg-tile/80">
      <div className="flex items-start justify-between gap-4">
        <span className="flex min-w-0 items-center gap-3">
          <SiteLogo domain={site.domain} name={site.domain} size="lg" />
          <span className="min-w-0">
            <span className="type-headline block truncate">{site.domain}</span>
            <span className="type-small text-ink-2">
              <DeviceTag device={site.device} lang={lang} /> · {site.latest ? shortDate(site.latest.created_at, lang) : t("Premier audit en cours", "First audit running")}
            </span>
          </span>
        </span>
        {manage ? <span className="h-9 w-9 shrink-0" aria-hidden /> : <Chevron className="mt-2 h-3 w-3 text-ink-2" />}
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="flex items-center gap-2.5 text-[48px] font-semibold leading-none tracking-[-0.01em] tnum">
          <StatusGlyph tone={scoreTone(s?.score ?? null)} className="h-6 w-6" />
          {s?.score ?? "—"}
          <span className="-ml-1.5 text-[24px] text-ink-2">%</span>
        </span>
        <Delta site={site} className="pb-1" />
      </div>
      {s && <MissionBar ok={s.ok} done={s.done} total={s.total} size="sm" />}
      <dl className="type-small mt-auto grid gap-1.5 text-ink-2">
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 whitespace-nowrap">{t("À corriger", "To fix")}</dt>
          <dd className="flex min-w-0 items-center gap-1.5 font-semibold text-ink" title={open.length ? blockerLabel(open[0].type, lang) : undefined}>
            {open.length ? (
              <>
                <BlockerIcon type={open[0].type} className="h-4 w-4" />
                <span className="truncate">{`${open.length} · ${blockerLabel(open[0].type, lang)}`}</span>
              </>
            ) : site.latest ? t("Rien", "Nothing") : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 whitespace-nowrap">{t("Classement", "Ranking")}</dt>
          <dd className="text-right text-ink">{rankText(site.rank, lang)}</dd>
        </div>
      </dl>
    </Link>
  );
  if (!manage) return card;
  return (
    <div className="relative">
      {card}
      {/* Same native disclosure as a report's "…" menu: opens without JS. */}
      <details className="absolute right-5 top-6 z-10">
        <summary
          className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full text-ink-2 transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-blue [&::-webkit-details-marker]:hidden"
          aria-label={t(`Options de ${site.domain}`, `Options for ${site.domain}`)}
          title={t("Plus", "More")}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
            <circle cx="5.5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="18.5" cy="12" r="1.6" />
          </svg>
        </summary>
        <div className="absolute right-0 top-10 w-[min(18rem,80vw)] rounded-[12px] bg-tile p-2 shadow-[0_8px_30px_rgb(0_0_0/0.18)] dark:bg-[#2c2c2e]">
          <form action="/api/sites" method="post">
            <input type="hidden" name="action" value="trash" />
            <input type="hidden" name="site_id" value={site.site_id} />
            <input type="hidden" name="device" value={site.device} />
            <input type="hidden" name="back" value="/espace/sites" />
            <button className="type-small flex w-full items-center rounded-[8px] px-3 py-2 text-left text-fail hover:bg-fill">{t("Mettre à la corbeille", "Move to trash")}</button>
          </form>
          <p className="type-caption px-3 pb-1 text-ink-2">
            {(() => {
              const n = site.audits.length;
              const d = deviceLabel(site.device, lang).toLowerCase();
              return n > 1
                ? t(`${n} rapports (${d}) inclus · restaurable`, `${n} reports (${d}) included · restorable`)
                : t(`1 rapport (${d}) inclus · restaurable`, `1 report (${d}) included · restorable`);
            })()}
          </p>
        </div>
      </details>
    </div>
  );
}

// Every open blocker is "to do": only the states that differ get a pill. Red stays for failed missions.
// Light text darkened for 4.5:1 on the tinted pill (#9c4600: 5.2, #0066cc: 4.7); dark tokens already pass.
const STATE: Record<Blocker["state"], [string, string, string] | null> = {
  todo: null,
  back: ["Toujours présent", "Still there", "bg-warn/15 text-[#9c4600] dark:text-warn"],
  check: ["Corrigé · à vérifier", "Fixed · to check", "bg-blue/12 text-link"],
};

// The checklist line: what stops the agent, the proof, the fix, and the team's progress on it.
export async function BlockerItem({ site, b, canEdit, compact = false }: { site: SiteView; b: Blocker; canEdit: boolean; compact?: boolean }) {
  const lang = await getLang();
  const t = tr(lang);
  const FIX_HINT = fixHints(lang);
  const state = STATE[b.state];
  return (
    <article className={`tile grid min-w-0 gap-7 p-7! ${compact ? "" : "md:grid-cols-[1fr_minmax(0,360px)]"}`}>
      <div className="flex flex-col">
        <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {state && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${state[2]}`}>{t(state[0], state[1])}</span>}
          <span className="text-ink-2">
            <span className="font-semibold text-ink">
              {b.missions} mission{b.missions > 1 ? "s" : ""} {t(`perdue${b.missions > 1 ? "s" : ""}`, "lost")}
            </span>
            {compact && ` · ${site.domain}`}
          </span>
        </div>
        <h3 className={`mt-3 flex items-start gap-2.5 ${compact ? "type-eyebrow" : "type-h3"}`}>
          <BlockerIcon type={b.type} className="mt-[0.15em] h-[0.9em] w-[0.9em]" />
          {blockerLabel(b.type, lang)}
        </h3>
        {/* The agent's raw note is in whatever language it wrote and gets cut mid-word on a card: the summary cards keep the label and the fix, the site page keeps the note. */}
        {!compact && b.run?.blocker_detail && <p className="mt-2 text-ink-2">{t("Note de l’agent", "Agent’s note")} : « {b.run.blocker_detail} »</p>}
        <p className={`mt-4 flex gap-2 ${compact ? "type-small" : ""}`}>
          <Chevron className="mt-[0.45em] h-3 w-3 shrink-0 text-link" />
          <span>{FIX_HINT[b.type] ?? FIX_HINT.other}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          {compact ? (
            <Link href={`${sitePath(site)}#corrections`} className="more">
              {t("Voir sur la page du site", "See on the site page")}
            </Link>
          ) : (
            canEdit && (
              <form action="/api/fixes" method="post">
                <input type="hidden" name="site" value={site.site_id} />
                <input type="hidden" name="device" value={site.device} />
                <input type="hidden" name="blocker" value={b.type} />
                <input type="hidden" name="back" value={`${sitePath(site)}#corrections`} />
                {b.state === "check" ? (
                  <button name="action" value="undo" className="btn btn-secondary min-h-[40px] px-[18px] text-[15px]">
                    {t("Annuler", "Undo")}
                  </button>
                ) : (
                  <button className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">{t("Marquer comme corrigé", "Mark as fixed")}</button>
                )}
              </form>
            )
          )}
          {b.run && (
            <Link href={`/replay/${b.run.id}?a=${site.latest?.id}`} className="type-small text-link hover:underline">
              {t("Voir le replay", "Watch the replay")}
            </Link>
          )}
        </div>
      </div>
      {!compact &&
        (b.run?.screenshot_url ? (
          <a href={b.run.screenshot_url} target="_blank" rel="noreferrer" className="block self-start rounded-[12px]" aria-label={`${t("Ouvrir la capture", "Open the screenshot")} : ${blockerLabel(b.type, lang)}`}>
            <BrowserFrame url={b.run.final_url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.run.screenshot_url} alt={`${t("Écran où l'agent s'arrête", "Screen where the agent stops")} : ${blockerLabel(b.type, lang)}`} className="block w-full" loading="lazy" />
            </BrowserFrame>
          </a>
        ) : (
          <div className="type-small grid aspect-[16/10] place-items-center rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">{t("Pas de capture", "No screenshot")}</div>
        ))}
    </article>
  );
}

// Sites › Tous / Corbeille as tabs on narrow screens; the sidebar shows the sub-section on wide ones.
export async function SitesTabs({ current }: { current: "all" | "trash" }) {
  const t = await getT();
  const tab =
    "type-small flex h-8 items-center rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]";
  return (
    <nav aria-label={t("Rubriques des sites", "Site sections")} className="mb-3 inline-flex rounded-[10px] bg-fill p-[3px] lg:hidden">
      {([["all", "/espace/sites", t("Tous", "All")], ["trash", "/espace/sites/corbeille", t("Corbeille", "Trash")]] as const).map(([v, href, label]) => (
        <Link key={v} href={href} aria-current={current === v ? "true" : undefined} className={tab}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
