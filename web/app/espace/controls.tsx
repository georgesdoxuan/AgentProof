"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GLYPH } from "@/lib/glyphs";
import type { Dict, Lang } from "@/lib/i18n";
import type { SideData } from "@/lib/sidebar";
import { LaunchButton, NavBadge, RecentSites, SideFooter, SideProvider } from "./side";

// lib/ui pulls in the server engine, so client controls keep their own styles.
// Pop-up button look for native <select>: keeps the system menu, drops the default chrome.
const popUp =
  "h-9 cursor-pointer appearance-none rounded-[8px] bg-fill bg-[length:10px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 type-small font-semibold text-ink transition-colors hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-blue";
// Up/down chevrons, set inline: as an arbitrary Tailwind background class the data URL never reached the CSS.
const popUpChevrons = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 14'%3E%3Cpath d='M2 5l3-3 3 3M2 9l3 3 3-3' fill='none' stroke='%2386868b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
};

// SF Symbols-style outline glyphs, 24 grid, drawn with the label's color.
const ICON = {
  home: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z",
  doc: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  podium: "M5 20V13M12 20V5M19 20v-9",
  sliders: "M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4",
  sidebar: "M4.5 4h15a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4zM9.5 4v16",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  trash: "M4 6.5h16M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 10.5v6M14 10.5v6",
};

// Sub-sections shown under their parent in the sidebar (Rapports › Favoris). On narrow screens the page shows them as tabs.
// The trash is not one: it lives in Réglages › Corbeille only.
const CHILDREN: Record<string, readonly (readonly [string, string])[]> = {
  "/espace/rapports": [["/espace/rapports/favoris", ICON.star]],
};
// Pages reached from a section without their own entry: the ranking opens from Sites, so Sites stays lit on it.
// A report and its replays belong to Rapports: that entry stays lit while one is open.
const ALSO: Record<string, string> = { "/espace/classement": "/espace/sites", "/audit/": "/espace/rapports", "/replay/": "/espace/rapports" };

const glyph = (d: string, cls: string) => (
  <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const itemCls = (current: boolean) =>
  `flex min-h-9 items-center gap-2.5 whitespace-nowrap rounded-[8px] px-3 text-[15px] transition-colors duration-200 ${
    current ? "bg-tile font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#3a3a3c]" : "text-ink-2 hover:bg-tile/60 hover:text-ink"
  }`;

// The daily sections (Automations included: page watch, automatic audits, alerts), then Réglages: every other setting
// (team, plan, payment, test accounts, trash, account) is a tab of that one page.
const NAV = [
  [["/espace", ICON.home], ["/espace/sites", ICON.globe], ["/espace/rapports", ICON.doc], ["/espace/automations", GLYPH.bolt]],
  [["/espace/reglages", ICON.sliders]],
] as const;
type Section = keyof Dict["space"]["sections"];
const isOn = (path: string, href: string) =>
  href === "/espace" ? path === href : path === href || path.startsWith(`${href}/`) || Object.entries(ALSO).some(([p, s]) => s === href && path.startsWith(p));

// Collapsed state lives in a cookie (not localStorage) so the server renders the right width: no jump on load.
const NAV_COOKIE = "ap_nav"; // read in shell.tsx

// The space's frame: sidebar on wide screens (collapsible to icons), tabs on narrow ones. `head` is the team switcher.
export function Frame({
  t,
  lang,
  collapsed: initial,
  head,
  side,
  reserve,
  launch,
  children,
}: {
  t: Dict["space"];
  lang: Lang;
  collapsed: boolean;
  head: React.ReactNode;
  /** The sidebar's live data, read by the layout and streamed with the page. */
  side: Promise<SideData | null>;
  /** Recent-site rows to reserve while that data loads (as many as last time). */
  reserve: number;
  /** Owner or admin: the « Lancer un audit » button. */
  launch: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initial);
  const toggle = () => {
    setCollapsed(!collapsed);
    document.cookie = `${NAV_COOKIE}=${collapsed ? 0 : 1}; path=/; max-age=31536000; samesite=lax`;
  };
  const label = collapsed ? t.expand : t.collapse;
  return (
    <SideProvider initial={side}>
    <div
      data-app-shell
      data-collapsed={collapsed ? "" : undefined}
      className={`group/frame min-h-[70vh] bg-bg-2 lg:grid ${collapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[256px_minmax(0,1fr)]"}`}
    >
      <aside className="min-w-0 space-y-5 px-6 pt-6 sm:px-8 lg:sticky lg:flex lg:flex-col lg:top-[53px] lg:h-[calc(100dvh-53px)] lg:space-y-7 lg:self-start lg:overflow-y-auto lg:overflow-x-hidden lg:border-r lg:border-hairline lg:px-3 lg:py-6">
        {/* Team switcher, then the fold button: beside it when open, under the team's initial when folded. */}
        <div className="flex items-center gap-1 lg:group-data-collapsed/frame:flex-col lg:group-data-collapsed/frame:items-start lg:group-data-collapsed/frame:gap-4">
          <div className="min-w-0 flex-1">{head}</div>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={label}
            title={label}
            className={`grid h-9 shrink-0 place-items-center rounded-[8px] text-ink-2 transition-colors hover:bg-tile/60 hover:text-ink max-lg:hidden ${collapsed ? "w-12" : "w-8"}`}
          >
            {glyph(ICON.sidebar, "h-[18px] w-[18px]")}
          </button>
        </div>
        {launch && <LaunchButton t={t.side} collapsed={collapsed} />}
        {/* Narrow screens: the section tabs, and the « + » beside them. */}
        <div className="flex items-center gap-2 lg:hidden">
          <MobileNav t={t} />
          {launch && <LaunchButton t={t.side} collapsed={false} mobile />}
        </div>
        <SideNav t={t} collapsed={collapsed} reserve={reserve} />
        <SideFooter t={t.side} lang={lang} collapsed={collapsed} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
    </SideProvider>
  );
}

function SideNav({ t, collapsed, reserve }: { t: Dict["space"]; collapsed: boolean; reserve: number }) {
  const path = usePathname();
  return (
    <nav aria-label={t.label} className="space-y-6 max-lg:hidden">
      {NAV.map((items, i) => (
        <ul key={i} className="flex flex-col gap-0.5">
          {items.map(([href, icon]) => {
            const label = t.sections[href];
            const children = CHILDREN[href] ?? [];
            const inChild = children.some(([c]) => path === c || path.startsWith(`${c}/`));
            // "Sites" stays lit on a site page; "Accueil" only on itself; a parent gives way to its lit sub-section.
            const current = !inChild && isOn(path, href);
            return (
              <li key={href}>
                {/* Collapsed: the icon alone, its name in the native tooltip and for screen readers. */}
                <Link href={href} aria-current={current ? "page" : undefined} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} className={`relative ${itemCls(current || (collapsed && inChild))}`}>
                  {glyph(icon, `h-[18px] w-[18px] shrink-0 ${current || (collapsed && inChild) ? "text-blue" : ""}`)}
                  {!collapsed && label}
                  <NavBadge href={href} t={t.side} collapsed={collapsed} />
                </Link>
                {(children.length > 0 || href === "/espace/sites") && !collapsed && (
                  <ul className="mt-0.5 flex flex-col gap-0.5 pl-7">
                    {href === "/espace/sites" && <RecentSites reserve={reserve} />}
                    {children.map(([c, cIcon]) => {
                      const on = path === c || path.startsWith(`${c}/`);
                      return (
                        <li key={c}>
                          <Link href={c} aria-current={on ? "page" : undefined} className={`${itemCls(on)} min-h-8 text-[14px]`}>
                            {glyph(cIcon, `h-4 w-4 shrink-0 ${on ? "text-blue" : ""}`)}
                            {t.sections[c as Section]}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}

// Réglages: one page, one tab per setting. Each tab is its own URL (/espace/reglages/<tab>), so links and the back button work.
// Each tab carries its glyph (the sidebar's trash for Corbeille). On phones the row scrolls sideways and the open tab
// is scrolled into view. Tighter padding below 64rem of page width, so all six fit beside an open sidebar on a laptop.
const SETTINGS = [
  ["equipe", GLYPH.team],
  ["abonnement", GLYPH.credit],
  ["paiement", GLYPH.card],
  ["comptes", GLYPH.key],
  ["corbeille", ICON.trash],
  ["compte", GLYPH.person],
] as const;
export function SettingsTabs({ t }: { t: Dict["space"] }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = nav.current;
    const on = el?.querySelector<HTMLElement>("[aria-current=page]");
    if (!el || !on || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2 });
  }, [path]);
  return (
    <nav ref={nav} aria-label={t.settingsLabel} className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max border-b border-hairline @5xl:gap-1">
        {SETTINGS.map(([s, icon]) => {
          const href = `/espace/reglages/${s}`;
          const on = path === href || path.startsWith(`${href}/`);
          return (
            <li key={s}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative -mb-px flex h-11 items-center gap-1 whitespace-nowrap px-2 type-small @5xl:gap-2 @5xl:px-3 font-semibold transition-colors ${
                  on ? "text-ink after:absolute after:inset-x-2 after:bottom-0 @5xl:after:inset-x-3 after:h-0.5 after:rounded-full after:bg-blue" : "text-ink-2 hover:text-ink"
                }`}
              >
                {glyph(icon, `h-4 w-4 shrink-0 ${on ? "text-blue" : ""}`)}
                {t.settings[s]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// The section's own glyph before the page title: the sidebar entry's icon, at the title's size. Read from the path
// so every page in the shell (and its loading skeleton) gets it with nothing to pass; a page that is not a sidebar
// entry (a site, « Lancer un audit ») keeps a bare title. Every Réglages tab shows the Réglages glyph.
const SECTION_ICON: Record<string, string> = Object.fromEntries([...NAV.flat(), ...Object.values(CHILDREN).flat(), ["/espace/classement", ICON.podium]]);
export function SectionIcon() {
  const path = usePathname().replace(/\/$/, "");
  const d = SECTION_ICON[path] ?? (path.startsWith("/espace/reglages/") ? ICON.sliders : undefined);
  if (!d) return null;
  // As tall as one line of the title, so it sits on the first line even when the title wraps.
  return (
    <span className="flex h-[1.12em] shrink-0 items-center" aria-hidden>
      {glyph(d, "h-[0.86em] w-[0.86em] text-blue")}
    </span>
  );
}

// Narrow screens: the five sections as one segmented control.
function MobileNav({ t }: { t: Dict["space"] }) {
  const path = usePathname();
  return (
    <nav aria-label={t.label} className="min-w-0 flex-1">
      <div className="flex w-full gap-1 rounded-[10px] bg-fill p-[3px]">
        {/* Five sections do not fit as words at 390 px: on phones the open one shows its name, the others their icon. */}
        {NAV.flat().map(([href, icon]) => {
          const on = isOn(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              aria-label={t.sections[href]}
              title={t.sections[href]}
              className={`flex h-[38px] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-2 type-small font-semibold transition-colors sm:flex-auto ${on ? "flex-auto" : "max-sm:w-10 max-sm:shrink-0 max-sm:px-0"} ${
                on ? "bg-tile text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#3a3a3c]" : "text-ink-2"
              }`}
            >
              {!on && glyph(icon, "h-[17px] w-[17px] shrink-0 sm:hidden")}
              <span className={on ? "truncate" : "max-sm:sr-only"}>{t.sections[href]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


// A pop-up that applies its choice right away, like a Settings row.
export function AutoSubmitSelect({ name, defaultValue, label, options, className = "" }: { name: string; defaultValue: string; label: string; options: [string, string][]; className?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} aria-label={label} className={`${popUp} ${className}`} style={popUpChevrons} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

// Destructive actions always ask first and offer Cancel.
export function ConfirmButton({ message, children, className = "", label }: { message: string; children: React.ReactNode; className?: string; label?: string }) {
  return (
    <button className={className} aria-label={label} title={label} onClick={(e) => !confirm(message) && e.preventDefault()}>
      {children}
    </button>
  );
}

// Closes the <details> menu it sits in (Cancel in a row's "…" menu).
export function CloseMenu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}>
      {children}
    </button>
  );
}

export function CopyField({ value, label, lang = "fr" }: { value: string; label: string; lang?: "fr" | "en" }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-bg-2 p-1.5 pl-4 dark:bg-[#2c2c2e]">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="type-small min-w-0 flex-1 truncate bg-transparent text-ink-2 outline-none" />
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000)))}
        className="btn btn-dark min-h-9 px-4 text-[14px]"
        aria-live="polite"
      >
        {lang === "en" ? (copied ? "Copied" : "Copy") : copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

// One click copies a longer text (a developer ticket) that is not worth showing in a field.
export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000))).catch(() => {})}
      className="text-link hover:underline"
      aria-live="polite"
    >
      {copied ? done : label}
    </button>
  );
}

// Back / forward, like a browser toolbar. Uses the Navigation API when available to grey out a dead end.

// Rapports › "Liste" or "Par site". The server renders both views and the toggle; this only hides one. The choice lives
// in a cookie (read in rapports/list.tsx), like the sidebar, so the server renders the right view: no jump on load.
const REPORTS_LAYOUT_COOKIE = "ap_rapports_vue"; // read in rapports/list.tsx
export function ReportsLayout({ initial, toolbar, list, bySite }: { initial: boolean; toolbar: React.ReactNode; list: React.ReactNode; bySite: React.ReactNode }) {
  const [bySiteOn, setBySite] = useState(initial);
  return (
    <>
      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1"
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          if (input.name !== REPORTS_LAYOUT_COOKIE) return;
          setBySite(input.value === "site");
          document.cookie = `${REPORTS_LAYOUT_COOKIE}=${input.value}; path=/; max-age=31536000; samesite=lax`;
        }}
      >
        {toolbar}
      </div>
      <div hidden={bySiteOn}>{list}</div>
      <div hidden={!bySiteOn}>{bySite}</div>
    </>
  );
}

// Sites › extension chips (".com", ".fr"…). The server renders the chips and every card; this only hides the cards of
// other extensions. The choice lives in a cookie (read in sites/(liste)/page.tsx), so the server renders it: no jump on load.
const SITES_EXT_COOKIE = "ap_sites_ext";
export function SitesByExt({ initial, chips, actions, cards }: { initial: string; chips: React.ReactNode; actions?: React.ReactNode; cards: { key: string; ext: string; card: React.ReactNode }[] }) {
  const [ext, setExt] = useState(initial);
  return (
    <>
      {/* The page has no visible title: the extension chips and the page's buttons share the top row. */}
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-4"
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          if (input.name !== SITES_EXT_COOKIE) return;
          setExt(input.value);
          document.cookie = `${SITES_EXT_COOKIE}=${encodeURIComponent(input.value)}; path=/; max-age=31536000; samesite=lax`;
        }}
      >
        {chips}
        {actions}
      </div>
      {/* A card needs ~20rem for "À corriger" and the ranking line: three columns only when they fit (not at 1280 with the sidebar). */}
      <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
        {cards.map((c) => (
          <div key={c.key} hidden={ext !== "all" && c.ext !== ext} className="grid">
            {c.card}
          </div>
        ))}
      </div>
    </>
  );
}

// Result of a settings form, after the server redirect (?ok=… or ?err=…): a toast under the header (the cookie notice owns the bottom),
// so nothing in the page moves. "Saved" fades after 4 s; an error stays until closed. The code leaves the URL
// at once, so a reload does not show it again.
export function Flash({ tone, text, close }: { tone: "ok" | "err"; text: string; close: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.delete("ok");
    u.searchParams.delete("err");
    u.searchParams.delete("slack");
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
    if (tone === "ok") {
      const t = setTimeout(() => setOpen(false), 4000);
      return () => clearTimeout(t);
    }
  }, [tone]);
  if (!open) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[68px] z-[60] flex justify-center px-4" role={tone === "err" ? "alert" : "status"}>
      <div className="ap-toast pointer-events-auto flex max-w-[520px] items-center gap-3 rounded-[14px] bg-[#1d1d1f] py-2.5 pl-4 pr-2 text-[15px] text-white shadow-[0_8px_30px_rgb(0_0_0/0.25)] dark:bg-[#3a3a3c]">
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${tone === "ok" ? "text-[#30d158]" : "text-[#ff6961]"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {tone === "ok" ? <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.8 2.8L16 10" /> : <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5.5M12 16.3v.1" />}
        </svg>
        <span className="min-w-0 flex-1">{text}</span>
        <button type="button" onClick={() => setOpen(false)} aria-label={close} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </div>
  );
}

// Settings forms post and come back with a full page load: the page reopens where the reader was, not at the top.
// The position is kept for one load only (sessionStorage), so a link from elsewhere still opens at the top.
const SCROLL_KEY = "ap_keep_scroll";
export function KeepScroll() {
  useEffect(() => {
    try {
      const y = sessionStorage.getItem(SCROLL_KEY);
      if (y) {
        sessionStorage.removeItem(SCROLL_KEY);
        window.scrollTo({ top: Number(y), behavior: "instant" });
      }
    } catch {}
    const keep = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      } catch {}
    };
    document.addEventListener("submit", keep, true);
    return () => document.removeEventListener("submit", keep, true);
  }, []);
  return null;
}
