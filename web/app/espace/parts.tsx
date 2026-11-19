import Link from "next/link";
import { BlockerIcon, BrowserFrame, Chevron, Chip, DeviceTag, ExPay, MissionBar, StatusGlyph, blockerLabel, scoreTone } from "@/lib/ui";
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
            <span className="type-headline block truncate">{site.label}</span>
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
          {s?.exPay && <ExPay lang={lang} className="-ml-1 self-end text-[15px] leading-normal tracking-normal" />}
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
          aria-label={t(`Options de ${site.label}`, `Options for ${site.label}`)}
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
export async function BlockerItem({ site, b, canEdit }: { site: SiteView; b: Blocker; canEdit: boolean }) {
  const lang = await getLang();
  const t = tr(lang);
  const FIX_HINT = fixHints(lang);
  const state = STATE[b.state];
  return (
    <article className="tile grid min-w-0 gap-7 p-7! md:grid-cols-[1fr_minmax(0,360px)]">
      <div className="flex flex-col">
        <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {state && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${state[2]}`}>{t(state[0], state[1])}</span>}
          <span className="text-ink-2">
            <span className="font-semibold text-ink">
              {b.missions} mission{b.missions > 1 ? "s" : ""} {t(`perdue${b.missions > 1 ? "s" : ""}`, "lost")}
            </span>
          </span>
        </div>
        <h3 className="type-h3 mt-3 flex items-start gap-2.5">
          <BlockerIcon type={b.type} className="mt-[0.15em] h-[0.9em] w-[0.9em]" />
          {blockerLabel(b.type, lang)}
        </h3>
        {/* The agent writes in whatever language it likes: its raw note stays folded, as on the report. */}
        {b.run?.blocker_detail && (
          <details className="type-small group mt-3 text-ink-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-link [&::-webkit-details-marker]:hidden">
              <Chevron className="h-2.5 w-2.5 transition-transform duration-200 group-open:rotate-90" />
              {t("Réponse originale de l’agent", "The agent's original answer")}
            </summary>
            <p className="mt-2">« {b.run.blocker_detail} »</p>
          </details>
        )}
        <p className="mt-4 flex gap-2">
          <Chevron className="mt-[0.45em] h-3 w-3 shrink-0 text-link" />
          <span>{FIX_HINT[b.type] ?? FIX_HINT.other}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          {canEdit && (
              <form action="/api/fixes" method="post">
                <input type="hidden" name="site" value={site.site_id} />
                <input type="hidden" name="device" value={site.device} />
                <input type="hidden" name="blocker" value={b.type} />
                <input type="hidden" name="back" value={`${sitePath(site)}#corrections`} />
                {b.state !== "todo" ? (
                  <span className="flex flex-wrap gap-3">
                    {/* Replays only the missions this blocker stopped (1 to 3): the fix is then proven by the agent. */}
                    <button name="action" value="prove" className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">
                      {t("Prouver la correction", "Prove the fix")}
                    </button>
                    <button name="action" value="undo" className="btn btn-secondary min-h-[40px] px-[18px] text-[15px]">
                      {t("Annuler", "Undo")}
                    </button>
                  </span>
                ) : (
                  <button className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">{t("Marquer comme corrigé", "Mark as fixed")}</button>
                )}
              </form>
          )}
          {b.run && (
            <Link href={`/replay/${b.run.id}?a=${site.latest?.id}`} className="type-small text-link hover:underline">
              {t("Voir le replay", "Watch the replay")}
            </Link>
          )}
        </div>
      </div>
      {b.run?.screenshot_url ? (
          <a href={b.run.screenshot_url} target="_blank" rel="noreferrer" className="block self-start rounded-[12px]" aria-label={`${t("Ouvrir la capture", "Open the screenshot")} : ${blockerLabel(b.type, lang)}`}>
            <BrowserFrame url={b.run.final_url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.run.screenshot_url} alt={`${t("Écran où l'agent s'arrête", "Screen where the agent stops")} : ${blockerLabel(b.type, lang)}`} className="block w-full" loading="lazy" />
            </BrowserFrame>
          </a>
        ) : (
          <div className="type-small grid aspect-[16/10] place-items-center rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">{t("Pas de capture", "No screenshot")}</div>
        )}
    </article>
  );
}

// Home's "Fix first" card: the whole card opens the latest report of that site, on this blocker's row
// (#blocage-<type>, which lists the missions it stopped). The replay stays a small secondary action above the link.
export async function PriorityCard({ site, b }: { site: SiteView; b: Blocker }) {
  const lang = await getLang();
  const t = tr(lang);
  const state = STATE[b.state];
  const label = blockerLabel(b.type, lang);
  const report = site.latest ? `/audit/${site.latest.id}#blocage-${b.type}` : `${sitePath(site)}#corrections`;
  return (
    <article className="tile group relative flex h-full min-w-0 flex-col gap-4 p-6! transition-colors duration-200 hover:bg-tile/80 has-[h3_a:focus-visible]:outline-2 has-[h3_a:focus-visible]:outline-blue">
      <div className="type-small flex min-w-0 items-center gap-2.5 text-ink-2">
        <SiteLogo domain={site.domain} name={site.domain} size="sm" />
        <span className="truncate font-semibold text-ink">{site.label}</span>
        <span aria-hidden>·</span>
        <DeviceTag device={site.device} lang={lang} />
      </div>
      <div>
        <h3 className="type-headline flex items-start gap-2.5">
          <BlockerIcon type={b.type} className="mt-[0.2em] h-[1em] w-[1em]" />
          <Link href={report} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none">
            {label}
          </Link>
        </h3>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Chip tone="fail">
            {b.missions} mission{b.missions > 1 ? "s" : ""} {t(`perdue${b.missions > 1 ? "s" : ""}`, "lost")}
          </Chip>
          {state && <span className={`type-caption inline-flex min-h-[26px] items-center rounded-full px-2.5 font-semibold ${state[2]}`}>{t(state[0], state[1])}</span>}
        </div>
      </div>
      <p className="type-small text-ink-2">{fixHints(lang)[b.type] ?? fixHints(lang).other}</p>
      <div className="type-small mt-auto flex items-center justify-between gap-4 border-t border-hairline pt-4">
        <span className="inline-flex items-center gap-1.5 font-semibold text-link group-hover:underline" aria-hidden>
          {t("Voir dans le rapport", "See in the report")}
          <Chevron className="h-2.5 w-2.5" />
        </span>
        {b.run && (
          <Link href={`/replay/${b.run.id}?a=${site.latest?.id}`} className="relative z-10 inline-flex items-center gap-1.5 text-ink-2 hover:text-link" aria-label={`${t("Voir le replay", "Watch the replay")} : ${label}`}>
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
              <path d="M2.5 1.3v9.4L10.6 6z" />
            </svg>
            Replay
          </Link>
        )}
      </div>
    </article>
  );
}

// Réglages › Corbeille: Sites and Rapports as one segmented control, with the counts, and the page's « Vider » on the right.
export async function TrashTabs({ current, counts, action }: { current: "sites" | "rapports"; counts: { sites: number; rapports: number }; action?: React.ReactNode }) {
  const t = await getT();
  const tab =
    "type-small flex h-8 items-center gap-1.5 rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]";
  return (
    <div className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-3">
      <nav aria-label={t("Catégories de la corbeille", "Trash categories")} className="inline-flex rounded-[10px] bg-fill p-[3px]">
        {([["sites", "/espace/reglages/corbeille/sites", "Sites", "Sites"], ["rapports", "/espace/reglages/corbeille/rapports", "Rapports", "Reports"]] as const).map(([v, href, fr, en]) => (
          <Link key={v} href={href} aria-current={current === v ? "true" : undefined} className={tab}>
            {t(fr, en)}
            <span className="font-normal text-ink-2 tnum">{counts[v]}</span>
          </Link>
        ))}
      </nav>
      {action}
    </div>
  );
}
