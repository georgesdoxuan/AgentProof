"use client";
import Link from "next/link";
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
  plus: "M12 5v14M5 12h14",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2.2-2.5 3.6M12 17h.01",
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z",
  chat: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z",
};
const linkCls = "flex min-h-8 items-center gap-2.5 whitespace-nowrap rounded-[8px] px-3 text-[14px] text-ink-2 transition-colors duration-200 hover:bg-tile/60 hover:text-ink";

// The main action, on every page of the space: a filled button under the team, a « + » when the bar is folded.
export function LaunchButton({ t, collapsed }: { t: T; collapsed: boolean }) {
  const on = usePathname().startsWith("/espace/nouveau");
  return (
    <Link
      href="/espace/nouveau"
      aria-current={on ? "page" : undefined}
      aria-label={collapsed ? t.launch : undefined}
      title={collapsed ? t.launch : undefined}
      className={`flex h-9 items-center justify-center gap-2 rounded-[8px] bg-blue text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-blue-hover max-lg:hidden ${collapsed ? "w-12" : "w-full px-3"}`}
    >
      {glyph(G.plus, "h-[18px] w-[18px] shrink-0")}
      {!collapsed && t.launch}
    </Link>
  );
}

// A count beside a link (open blockers on Accueil, running audits on Rapports): a pill when open, a dot on the icon when folded.
// Fixed height and tabular figures: the row never grows, and the label never moves when the number changes.
export function NavBadge({ href, t, collapsed }: { href: string; t: T; collapsed: boolean }) {
  const d = useSide();
  if (!d) return null;
  const [n, tone, label] =
    href === "/espace" ? [d.open, "warn", `${d.open} ${d.open > 1 ? t.open : t.openOne}`] : href === "/espace/rapports" ? [d.running.length, "blue", `${d.running.length} ${t.running.toLowerCase()}`] : [0, "", ""];
  if (!n) return null;
  const color = tone === "warn" ? "bg-warn" : "bg-blue";
  if (collapsed) return <span className={`absolute right-2.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-bg-2 ${color}`} aria-label={label} title={label} />;
  return (
    <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-full px-1.5 text-[12px] font-semibold tabular-nums ${tone === "warn" ? "bg-warn/12 text-warn" : "bg-blue/12 text-blue"}`} title={label}>
      {tone === "blue" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue" aria-hidden />}
      {n}
      <span className="sr-only">{label}</span>
    </span>
  );
}

const toneCls = (s: number | null) => (s == null ? "text-ink-2" : s >= 70 ? "text-pass" : s >= 40 ? "text-warn" : "text-fail");

// The last sites the team worked on, under Sites: logo, name, score. Their rows are reserved while they load.
export function RecentSites({ reserve }: { reserve: number }) {
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
          <span className={`text-[13px] font-semibold tabular-nums ${toneCls(s.score)}`}>{s.score == null ? "—" : `${s.score} %`}</span>
        </Link>
      </li>
    );
  });
}

const fmt = (iso: string, lang: Lang, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", o);

// Pinned to the bottom of the bar: audits running, the watch, the month's credits, then help links.
// It grows upward into the empty space, so a card that appears never pushes the links above.
export function SideFooter({ t, lang, collapsed }: { t: T; lang: Lang; collapsed: boolean }) {
  const d = useSide();
  return (
    <div className="space-y-3 border-t border-hairline pt-4 max-lg:hidden lg:mt-auto">
      {d?.running.map((a) => {
        const pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
        return collapsed ? (
          <Link key={a.id} href={`/audit/${a.id}`} title={`${t.running} · ${a.label} · ${a.done}/${a.total}`} aria-label={`${t.running} · ${a.label}`} className="grid h-9 w-12 place-items-center rounded-[8px] text-blue hover:bg-tile/60">
            <span className="ap-spin inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent" aria-hidden />
          </Link>
        ) : (
          <Link key={a.id} href={`/audit/${a.id}`} className="block rounded-[10px] bg-tile px-3 py-2.5 shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-colors hover:bg-tile/70 dark:bg-[#2c2c2e]">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-blue">
              <span className="ap-spin inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" aria-hidden />
              {t.running}
              <span className="ml-auto tabular-nums text-ink-2">
                {a.done}/{a.total}
              </span>
            </span>
            <span className="mt-1 block truncate text-[14px] text-ink">{a.label}</span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-fill">
              <span className="block h-full rounded-full bg-blue transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </span>
          </Link>
        );
      })}

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
