"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import type { SideData } from "@/lib/sidebar";
import { LEGAL } from "@/lib/legal";
import { SiteLogo } from "../site-logo";

// The sidebar's live parts: counters on the links, recent sites, running audits, the watch, the month's credits.
// The layout starts the read (a promise, streamed with the page); after that /api/sidebar refreshes it on each
// navigation, and every few seconds while an audit runs. Every part keeps its height while it loads: nothing jumps.
type T = Dict["space"]["side"];
const Ctx = createContext<SideData | null>(null);
export const useSide = () => useContext(Ctx);
const RESERVE_COOKIE = "ap_ns"; // recent sites shown last time, read in shell.tsx to reserve their rows on first paint
const POLL = 8000;

export function SideProvider({ initial, children }: { initial: Promise<SideData | null>; children: React.ReactNode }) {
  const [data, setData] = useState<SideData | null>(null);
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    let live = true;
    Promise.resolve(initial).then((d) => live && d && setData(d), () => {});
    return () => {
      live = false;
    };
  }, [initial]);
  // A new page may have changed things (an audit launched, a site trashed): read again, quietly.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    refresh(setData);
  }, [path]);
  const running = (data?.running.length ?? 0) > 0;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => document.visibilityState === "visible" && refresh(setData), POLL);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (data) document.cookie = `${RESERVE_COOKIE}=${data.sites.length}; path=/; max-age=31536000; samesite=lax`;
  }, [data?.sites.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

function refresh(set: (d: SideData) => void) {
  fetch("/api/sidebar", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d && set(d))
    .catch(() => {});
}

const glyph = (d: string, cls: string) => (
  <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const G = {
  plus: "M12 4.75v14.5M4.75 12h14.5",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2.2-2.5 3.6M12 17h.01",
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z",
  done: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.7 2.7L16 9.5",
  chat: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z",
};
const card = "block rounded-[10px] bg-tile px-3 py-2.5 shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-colors hover:bg-tile/70 dark:bg-[#2c2c2e]";
const linkCls = "flex min-h-8 items-center gap-2.5 whitespace-nowrap rounded-[8px] px-3 text-[14px] text-ink-2 transition-colors duration-200 hover:bg-tile/60 hover:text-ink";

// The main action, on every page of the space. Wide screens: a filled row under the team, aligned on the links below
// (same height, same icon column), its shortcut « N » on the right; folded, the « + » alone with its name and shortcut
// in a tooltip. Narrow screens: a 44 pt « + » beside the section tabs. Past the month's credits a dot says so: the form
// still lets the team launch (soft limit, nouveau/page.tsx), so the button is never disabled, it only warns.
const KEY = "n";
const launchCls =
  "relative flex items-center rounded-[8px] bg-blue text-white shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.14)] outline-offset-2 transition-[background-color,transform] duration-150 hover:bg-[color-mix(in_srgb,var(--blue),black_14%)] focus-visible:outline-2 focus-visible:outline-blue active:scale-[0.97] active:bg-[color-mix(in_srgb,var(--blue),black_20%)] motion-reduce:active:scale-100 aria-[current=page]:bg-[color-mix(in_srgb,var(--blue),black_12%)] dark:hover:bg-[color-mix(in_srgb,var(--blue),white_12%)] dark:aria-[current=page]:bg-[color-mix(in_srgb,var(--blue),white_9%)]";

export function LaunchButton({ t, collapsed, mobile = false }: { t: T; collapsed: boolean; mobile?: boolean }) {
  const on = usePathname().startsWith("/espace/nouveau");
  const c = useSide()?.credits;
  const out = !!c && c.included > 0 && c.used >= c.included;
  const ref = useRef<HTMLAnchorElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  // « N » anywhere in the space, except while typing. Only the sidebar's copy listens (the mobile one sits beside it).
  useEffect(() => {
    if (mobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== KEY || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      e.preventDefault();
      ref.current?.click(); // through the Link: same prefetch, same pending state
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile]);
  // The bar scrolls (overflow hidden on x), so the tooltip is fixed to the viewport beside the button, not inside it.
  const showTip = collapsed || out;
  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r && showTip && !mobile) setTip({ top: r.top + r.height / 2, left: r.right + 10 });
  };
  const close = () => setTip(null);
  const warn = out ? `${t.outOfCredits} (${c!.used}/${c!.included}). ${t.outOfCreditsHint}` : "";
  const dot = out && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-warn ring-2 ring-bg-2" aria-hidden />;
  if (mobile)
    return (
      <Link ref={ref} href="/espace/nouveau" aria-current={on ? "page" : undefined} aria-label={warn ? `${t.launch}. ${warn}` : t.launch} title={t.launch} className={`${launchCls} h-11 w-11 shrink-0 justify-center rounded-[10px] lg:hidden`}>
        <LaunchIcon size="h-5 w-5" />
        {dot}
      </Link>
    );
  return (
    <>
      <Link
        ref={ref}
        href="/espace/nouveau"
        aria-current={on ? "page" : undefined}
        aria-label={collapsed ? (warn ? `${t.launch}. ${warn}` : t.launch) : undefined}
        aria-keyshortcuts="N"
        aria-describedby={tip ? "ap-launch-tip" : undefined}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={close}
        className={`${launchCls} h-9 gap-2.5 whitespace-nowrap text-[15px] font-semibold max-lg:hidden ${collapsed ? "w-12 justify-center" : "w-full pl-3 pr-2"}`}
      >
        <LaunchIcon size="h-[18px] w-[18px]" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{t.launch}</span>
            <kbd className="grid h-5 min-w-5 place-items-center rounded-[5px] bg-white/[0.18] px-1 font-sans text-[11px] font-semibold leading-none text-white/90" aria-hidden>
              N
            </kbd>
          </>
        )}
        {warn && <span className="sr-only">{warn}</span>}
        {dot}
      </Link>
      {tip && (
        <span
          role="tooltip"
          id="ap-launch-tip"
          className="pointer-events-none fixed z-[70] w-max max-w-[260px] -translate-y-1/2 rounded-[10px] bg-pop px-2.5 py-1.5 text-[13px] text-ink shadow-[0_8px_28px_rgb(0_0_0/0.16),inset_0_0_0_0.5px_var(--line)] motion-safe:animate-[ap-tip-in_0.14s_ease-out]"
          style={{ top: tip.top, left: tip.left }}
        >
          {collapsed && (
            <span className="flex items-center gap-2 font-semibold">
              {t.launch}
              <kbd className="grid h-5 min-w-5 place-items-center rounded-[5px] bg-fill px-1 font-sans text-[11px] font-semibold leading-none text-ink-2 shadow-[inset_0_0_0_0.5px_var(--line)] dark:bg-[#48484a] dark:text-ink">N</kbd>
            </span>
          )}
          {warn && (
            <span className={`block text-ink-2 ${collapsed ? "mt-1" : ""}`}>
              <span className="font-semibold text-warn">{t.outOfCredits}</span> · {c!.used}/{c!.included}
              <span className="block">{t.outOfCreditsHint}</span>
            </span>
          )}
        </span>
      )}
    </>
  );
}

// The « + », or a small spinner while the form's page loads (a click or « N » on a slow network).
function LaunchIcon({ size }: { size: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className={`ap-spin grid shrink-0 place-items-center ${size}`} aria-hidden>
      <span className="h-[15px] w-[15px] rounded-full border-2 border-white/90 border-t-transparent" />
    </span>
  ) : (
    // A touch bolder than the outline glyphs: it sits on a filled button.
    <svg viewBox="0 0 24 24" className={`${size} shrink-0`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d={G.plus} />
    </svg>
  );
}

// A count beside a link (open blockers on Accueil, running audits on Rapports): a pill when open, a dot on the icon when folded.
// Fixed height and tabular figures: the row never grows, and the label never moves when the number changes.
export function NavBadge({ href, t, collapsed }: { href: string; t: T; collapsed: boolean }) {
  const d = useSide();
  if (!d) return null;
  const [n, tone, label] =
    href === "/espace" ? [d.open, "warn", `${d.open} ${d.open > 1 ? t.open : t.openOne}`] : href === "/espace/rapports" ? [d.running.length, "live", `${d.running.length} ${t.running.toLowerCase()}`] : [0, "", ""];
  if (!n) return null;
  const color = tone === "warn" ? "bg-warn" : "bg-live-fill";
  if (collapsed) return <span className={`absolute right-2.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-bg-2 ${color}`} aria-label={label} title={label} />;
  return (
    <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-full px-1.5 text-[12px] font-semibold tabular-nums ${tone === "warn" ? "bg-warn/12 text-warn" : "bg-live-fill/20 text-live"}`} title={label}>
      {tone === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-fill" aria-hidden />}
      {n}
      <span className="sr-only">{label}</span>
    </span>
  );
}

const toneCls = (s: number | null) => (s == null ? "text-ink-2" : s >= 70 ? "text-pass" : s >= 40 ? "text-warn" : "text-fail");

// The last sites the team worked on, under Sites: logo, name, score. Their rows are reserved while they load.
export function RecentSites({ reserve, lang }: { reserve: number; lang: Lang }) {
  const d = useSide();
  const path = usePathname();
  if (!d)
    return Array.from({ length: reserve }, (_, i) => (
      <li key={i} className="flex min-h-8 items-center gap-2.5 px-3" aria-hidden>
        <span className="sk h-[18px] w-[18px] rounded-[22%]" />
        <span className="sk h-3 w-24 rounded-full" />
      </li>
    ));
  return d.sites.map((s) => {
    const href = `/espace/sites/${s.key}`;
    const on = path === href;
    return (
      <li key={s.key}>
        <Link
          href={href}
          aria-current={on ? "page" : undefined}
          className={`flex min-h-8 items-center gap-2.5 whitespace-nowrap rounded-[8px] px-3 text-[14px] transition-colors duration-200 ${
            on ? "font-semibold text-ink" : "text-ink-2 hover:bg-tile/60 hover:text-ink"
          }`}
        >
          <SiteLogo domain={s.domain} name={s.label} size="xs" />
          <span className="min-w-0 flex-1 truncate">
            {s.label}
            {s.device === "mobile" && <span className="text-ink-2"> · M</span>}
          </span>
          <span className={`inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums ${toneCls(s.score)}`}>
            {s.score == null ? "—" : `${s.score} %`}
            {s.exPay && <PayMark lang={lang} />}
          </span>
        </Link>
      </li>
    );
  });
}

// After a 100 % whose real payment test placed no order (same rule as ExPay in lib/ui, which is server-only).
function PayMark({ lang }: { lang: Lang }) {
  const title = lang === "en" ? "Excluding payment: the real payment test placed no order" : "Hors paiement : le test de paiement réel n’a pas confirmé de commande";
  return (
    <span title={title} className="inline-flex text-warn">
      <svg viewBox="0 0 24 24" className="h-[1em] w-[1em]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M7 15h3" />
      </svg>
      <span className="sr-only">{title}</span>
    </span>
  );
}

const fmt = (iso: string, lang: Lang, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", o);

// Pinned to the bottom of the bar: audits running, the watch, the month's credits, then help links.
// It grows upward into the empty space, so a card that appears never pushes the links above.
export function SideFooter({ t, lang, collapsed }: { t: T; lang: Lang; collapsed: boolean }) {
  const d = useSide();
  return (
    <div className="space-y-3 border-t border-hairline pt-4 max-lg:hidden lg:mt-auto">
      {/* Audit cards: yellow while running, green for half an hour once finished (same colors as Rapports). */}
      {d?.running.map((a) => {
        const pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
        return collapsed ? (
          <Link key={a.id} href={`/audit/${a.id}`} title={`${t.running} · ${a.label} · ${a.done}/${a.total}`} aria-label={`${t.running} · ${a.label}`} className="grid h-9 w-12 place-items-center rounded-[8px] text-live hover:bg-tile/60">
            <span className="ap-spin inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent" aria-hidden />
          </Link>
        ) : (
          <Link key={a.id} href={`/audit/${a.id}`} className={card}>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-live">
              <span className="ap-spin inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" aria-hidden />
              {t.running}
              <span className="ml-auto tabular-nums text-ink-2">
                {a.done}/{a.total}
              </span>
            </span>
            <span className="mt-1 block truncate text-[14px] text-ink">{a.label}</span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-fill">
              <span className="block h-full rounded-full bg-live-fill transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </span>
          </Link>
        );
      })}
      {d?.finished.map((a) =>
        collapsed ? (
          <Link key={a.id} href={`/audit/${a.id}`} title={`${t.finished} · ${a.label}`} aria-label={`${t.finished} · ${a.label}`} className="grid h-9 w-12 place-items-center rounded-[8px] text-pass hover:bg-tile/60">
            {glyph(G.done, "h-[18px] w-[18px]")}
          </Link>
        ) : (
          <Link key={a.id} href={`/audit/${a.id}`} className={card}>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-pass">
              {glyph(G.done, "h-3.5 w-3.5")}
              {t.finished}
              {a.score != null && (
                <span className="ml-auto inline-flex items-center gap-1 tabular-nums text-ink-2">
                  {a.score} %{a.exPay && <PayMark lang={lang} />}
                </span>
              )}
            </span>
            <span className="mt-1 block truncate text-[14px] text-ink">{a.label}</span>
            {/* Same height as a running card: the bar fills green, nothing jumps when it turns. */}
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-pass" />
          </Link>
        ),
      )}

      <Watch t={t} lang={lang} collapsed={collapsed} />
      <Credits t={t} lang={lang} collapsed={collapsed} />

      <ul className="flex flex-col gap-0.5">
        {(
          [
            ["/faq", G.help, t.help],
            ["/methode", G.book, t.method],
            [`mailto:${LEGAL.contact}?subject=${encodeURIComponent("AgentProof · avis")}`, G.chat, t.feedback],
          ] as const
        ).map(([href, icon, label]) => (
          <li key={href}>
            {href.startsWith("mailto:") ? (
              <a href={href} className={`${linkCls} ${collapsed ? "w-12 justify-center px-0" : ""}`} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined}>
                {glyph(icon, "h-4 w-4 shrink-0")}
                {!collapsed && label}
              </a>
            ) : (
              <Link href={href} className={`${linkCls} ${collapsed ? "w-12 justify-center px-0" : ""}`} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined}>
                {glyph(icon, "h-4 w-4 shrink-0")}
                {!collapsed && label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Watch({ t, lang, collapsed }: { t: T; lang: Lang; collapsed: boolean }) {
  const d = useSide();
  const w = d?.watch;
  const next = w?.next ? fmt(w.next, lang, w.soon ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const line = !w ? "" : w.pages ? `${w.pages} ${w.pages > 1 ? t.pages : t.page} · ${t.next} ${next}` : t.watchOff;
  if (collapsed)
    return (
      <Link href="/espace/reglages/automations" title={`${t.watch} · ${line}`} aria-label={t.watch} className={`relative grid h-9 w-12 place-items-center rounded-[8px] hover:bg-tile/60 ${w?.pages ? "text-ink" : "text-ink-2"}`}>
        {glyph(G.eye, "h-[18px] w-[18px]")}
        {!!w?.pages && <span className="absolute right-2.5 top-1.5 h-2 w-2 rounded-full bg-pass ring-2 ring-bg-2" aria-hidden />}
      </Link>
    );
  return (
    <Link href="/espace/reglages/automations" className="flex min-h-12 items-center gap-2.5 rounded-[8px] px-3 transition-colors hover:bg-tile/60">
      <span className="relative shrink-0 text-ink-2">
        {glyph(G.eye, "h-[18px] w-[18px]")}
        {!!w?.pages && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pass ring-2 ring-bg-2" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{t.watch}</span>
        {w ? <span className="block truncate text-[12px] text-ink-2">{line}</span> : <span className="sk mt-1 block h-2.5 w-32 rounded-full" />}
      </span>
    </Link>
  );
}

function Credits({ t, lang, collapsed }: { t: T; lang: Lang; collapsed: boolean }) {
  const c = useSide()?.credits;
  const pct = c && c.included ? Math.min(100, Math.round((c.used / c.included) * 100)) : 0;
  const bar = pct >= 100 ? "bg-fail" : pct >= 80 ? "bg-warn" : "bg-blue";
  const ring = pct >= 100 ? "text-fail" : pct >= 80 ? "text-warn" : "text-blue";
  if (collapsed) {
    const r = 14;
    const len = 2 * Math.PI * r;
    return (
      <Link href="/espace/reglages/abonnement" title={c ? `${t.credits} · ${c.used} / ${c.included}` : t.credits} aria-label={t.credits} className="grid h-12 w-12 place-items-center rounded-[8px] hover:bg-tile/60">
        {/* The used share written inside: a nearly empty ring alone would read as a loading spinner. */}
        <span className="relative grid h-9 w-9 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 h-9 w-9 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-fill" />
            {pct > 0 && <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={ring} strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(pct, 4) / 100)} />}
          </svg>
          <span className="text-[10px] font-semibold tabular-nums text-ink-2" aria-hidden>{c ? `${pct}%` : ""}</span>
        </span>
      </Link>
    );
  }
  return (
    <div className="rounded-[10px] px-3 py-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">{t.credits}</span>
        {c ? (
          <span className="text-[13px] tabular-nums text-ink-2">
            <span className="font-semibold text-ink">{c.used}</span> / {c.included}
          </span>
        ) : (
          <span className="sk h-3 w-12 rounded-full" />
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
        <div className={`h-full rounded-full transition-[width] duration-500 ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-ink-2">
        <span className="truncate">{c ? `${t.renews} ${fmt(c.renews, lang, { day: "numeric", month: "short" })}` : " "}</span>
        <Link href="/espace/reglages/abonnement" className="font-semibold text-link hover:underline">
          {t.more}
        </Link>
      </div>
    </div>
  );
}
