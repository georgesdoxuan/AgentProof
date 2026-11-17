import Link from "next/link";
import { BrowserFrame, Chevron, MissionBar, StatusGlyph, blockerLabel, scoreTone } from "@/lib/ui";
import { FIX_HINT, deviceLabel, shortDate, type Blocker, type SiteView } from "@/lib/space";

export const sitePath = (v: SiteView) => `/espace/sites/${v.key}`;

// Same site, same device, fresh pass: skips the 7-day reuse of the last report.
export function RelaunchForm({ site, label = "Relancer pour vérifier", dark = false }: { site: SiteView; label?: string; dark?: boolean }) {
  return (
    <form action="/api/audits" method="post">
      <input type="hidden" name="url" value={site.url} />
      <input type="hidden" name="device" value={site.device} />
      <input type="hidden" name="force" value="1" />
      <button className={`btn disabled:pointer-events-none disabled:opacity-40 ${dark ? "btn-dark" : ""}`} disabled={!!site.running}>
        {site.running ? "Audit en cours" : label}
      </button>
    </form>
  );
}

export function Delta({ site, className = "" }: { site: SiteView; className?: string }) {
  const a = site.latest?.s.score;
  const b = site.previous?.s.score;
  if (a == null || b == null) return null;
  const d = a - b;
  return (
    <span className={`type-small whitespace-nowrap tnum ${d === 0 ? "text-ink-2" : d > 0 ? "text-pass" : "text-fail"} ${className}`}>
      {d === 0 ? "Stable" : `${d > 0 ? "+" : "−"}${Math.abs(d)} pts`}
    </span>
  );
}

export const rankText = (r: SiteView["rank"]) => (r ? `${r.pos}${r.pos === 1 ? "er" : "e"} sur ${r.of} au classement` : "Hors classement public");

// One card per site: score, trend, main blocker, where it stands publicly.
export function SiteCard({ site }: { site: SiteView }) {
  const s = site.latest?.s;
  const open = site.blockers.filter((b) => b.state !== "check");
  return (
    <Link href={sitePath(site)} className="tile group flex flex-col gap-6 p-7! transition-colors duration-200 hover:bg-tile/80">
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="type-headline block truncate">{site.domain}</span>
          <span className="type-small text-ink-2">
            {deviceLabel(site.device)} · {site.latest ? shortDate(site.latest.created_at) : "Premier audit en cours"}
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
          <dt>À corriger</dt>
          <dd className="font-semibold text-ink">{open.length ? `${open.length} · ${blockerLabel(open[0].type)}` : site.latest ? "Rien" : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Classement</dt>
          <dd className="text-ink">{rankText(site.rank)}</dd>
        </div>
      </dl>
    </Link>
  );
}

const STATE: Record<Blocker["state"], [string, string]> = {
  todo: ["À faire", "bg-fail/12 text-fail"],
  back: ["Toujours présent", "bg-warn/15 text-warn"],
  check: ["Corrigé · à vérifier", "bg-blue/12 text-link"],
};

// The checklist line: what stops the agent, the proof, the fix, and the team's progress on it.
export function BlockerItem({ site, b, canEdit, compact = false }: { site: SiteView; b: Blocker; canEdit: boolean; compact?: boolean }) {
  const [word, pill] = STATE[b.state];
  return (
    <article className={`tile grid min-w-0 gap-7 p-7! ${compact ? "" : "md:grid-cols-[1fr_minmax(0,360px)]"}`}>
      <div className="flex flex-col">
        <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${pill}`}>{word}</span>
          <span className="text-ink-2">
            {b.missions} mission{b.missions > 1 ? "s" : ""} bloquée{b.missions > 1 ? "s" : ""}
            {compact && ` · ${site.domain}`}
          </span>
        </div>
        <h3 className="type-h3 mt-3">{blockerLabel(b.type)}</h3>
        {b.run?.blocker_detail && <p className={`mt-2 text-ink-2 ${compact ? "type-small line-clamp-3" : ""}`}>{b.run.blocker_detail}</p>}
        <p className={`mt-4 flex gap-2 ${compact ? "type-small" : ""}`}>
          <Chevron className="mt-[0.45em] h-3 w-3 shrink-0 text-link" />
          <span>{FIX_HINT[b.type] ?? FIX_HINT.other}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          {compact ? (
            <Link href={`${sitePath(site)}#corrections`} className="more">
              Voir sur la page du site
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
                    Annuler
                  </button>
                ) : (
                  <button className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">Marquer comme corrigé</button>
                )}
              </form>
            )
          )}
          {b.run && (
            <Link href={`/replay/${b.run.id}?a=${site.latest?.id}`} className="type-small text-link hover:underline">
              Voir le replay
            </Link>
          )}
        </div>
      </div>
      {!compact &&
        (b.run?.screenshot_url ? (
          <a href={b.run.screenshot_url} target="_blank" rel="noreferrer" className="block self-start rounded-[12px]" aria-label={`Ouvrir la capture : ${blockerLabel(b.type)}`}>
            <BrowserFrame url={b.run.final_url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.run.screenshot_url} alt={`Écran où l'agent s'arrête : ${blockerLabel(b.type)}`} className="block w-full" loading="lazy" />
            </BrowserFrame>
          </a>
        ) : (
          <div className="type-small grid aspect-[16/10] place-items-center rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">Pas de capture</div>
        ))}
    </article>
  );
}
