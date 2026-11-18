import Link from "next/link";
import { BrowserFrame, Chevron, MissionBar, StatusGlyph, blockerLabel, scoreTone } from "@/lib/ui";
import { deviceLabel, fixHints, shortDate, type Blocker, type SiteView } from "@/lib/space";
import { tr, type Lang } from "@/lib/i18n";
import { getLang, getT } from "@/lib/lang";

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
export async function SiteCard({ site }: { site: SiteView }) {
  const lang = await getLang();
  const t = tr(lang);
  const s = site.latest?.s;
  const open = site.blockers.filter((b) => b.state !== "check");
  return (
    <Link href={sitePath(site)} className="tile group flex flex-col gap-6 p-7! transition-colors duration-200 hover:bg-tile/80">
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="type-headline block truncate">{site.domain}</span>
          <span className="type-small text-ink-2">
            {deviceLabel(site.device, lang)} · {site.latest ? shortDate(site.latest.created_at, lang) : t("Premier audit en cours", "First audit running")}
          </span>
        </span>
        <Chevron className="mt-2 h-3 w-3 text-ink-2" />
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
          <dt>{t("À corriger", "To fix")}</dt>
          <dd className="font-semibold text-ink">{open.length ? `${open.length} · ${blockerLabel(open[0].type, lang)}` : site.latest ? t("Rien", "Nothing") : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t("Classement", "Ranking")}</dt>
          <dd className="text-ink">{rankText(site.rank, lang)}</dd>
        </div>
      </dl>
    </Link>
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
        <h3 className={`mt-3 ${compact ? "type-eyebrow" : "type-h3"}`}>{blockerLabel(b.type, lang)}</h3>
        {b.run?.blocker_detail && <p className={`mt-2 text-ink-2 ${compact ? "type-small line-clamp-3" : ""}`}>{b.run.blocker_detail}</p>}
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
