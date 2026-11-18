"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

// lib/ui pulls in the server engine, so client controls keep their own styles.
// Pop-up button look for native <select>: keeps the system menu, drops the default chrome.
const popUp =
  "h-9 cursor-pointer appearance-none rounded-[8px] bg-fill bg-[length:10px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 type-small font-semibold text-ink transition-colors hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-blue " +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 14'%3E%3Cpath d='M2 5l3-3 3 3M2 9l3 3 3-3' fill='none' stroke='%2386868b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]";

// SF Symbols-style outline glyphs, 24 grid, drawn with the label's color.
const ICON = {
  home: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z",
  doc: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  podium: "M3 21h18M5 21v-6h4v6M10 21V8h4v13M15 21v-9h4v9",
  card: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M7 15h3",
  key: "M7.5 11a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.7 12.3 20 3M16.5 6.5l3 3M14 9l2.5 2.5",
  cycle: "M20 11a8 8 0 0 0-14.6-4.5M4 3v4h4M4 13a8 8 0 0 0 14.6 4.5M20 21v-4h-4",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2.5 21a6.5 6.5 0 0 1 13 0M16 3.2a4 4 0 0 1 0 7.6M21.5 21a6.5 6.5 0 0 0-4-6",
  person: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6.5 18.2a6.5 6.5 0 0 1 11 0",
};

// Three groups; their names and the section labels come from the dictionary (labels match each page's title).
const GROUPS = [
  ["track", [["/espace", ICON.home], ["/espace/sites", ICON.globe], ["/espace/rapports", ICON.doc], ["/espace/classement", ICON.podium]]],
  ["agent", [["/espace/paiement", ICON.card], ["/espace/comptes", ICON.key], ["/espace/automations", ICON.cycle]]],
  ["settings", [["/equipe", ICON.people], ["/compte", ICON.person]]],
] as const;

// Sidebar on wide screens, segmented tabs on narrow ones (groups and icons drop out). Tabs navigate, they never act.
export function SpaceNav({ t }: { t: Dict["space"] }) {
  const path = usePathname();
  return (
    <nav aria-label={t.label} className="max-lg:-mx-1 max-lg:overflow-x-auto">
      <div className="lg:space-y-5 max-lg:inline-flex max-lg:gap-1 max-lg:rounded-[10px] max-lg:bg-fill max-lg:p-[3px]">
        {GROUPS.map(([group, items]) => (
          <div key={group} className="max-lg:contents">
            <p id={`nav-${group}`} className="type-caption mb-1 px-3 font-semibold text-ink-2 max-lg:hidden">
              {t.groups[group]}
            </p>
            <ul aria-labelledby={`nav-${group}`} className="flex flex-col gap-0.5 max-lg:contents">
              {items.map(([href, icon]) => {
                // "Sites" stays lit on a site page; "Accueil" only on itself.
                const current = href === "/espace" ? path === href : path === href || path.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-center gap-2.5 whitespace-nowrap rounded-[8px] transition-colors duration-200 lg:min-h-10 lg:px-3 max-lg:h-9 max-lg:px-4 max-lg:type-small max-lg:font-semibold ${
                        current
                          ? "bg-tile font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#3a3a3c]"
                          : "text-ink-2 hover:bg-tile/60 hover:text-ink max-lg:hover:bg-transparent"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] shrink-0 max-lg:hidden ${current ? "text-blue" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={icon} />
                      </svg>
                      {t.sections[href]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

// A pop-up that applies its choice right away, like a Settings row.
export function AutoSubmitSelect({ name, defaultValue, label, options }: { name: string; defaultValue: string; label: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={defaultValue} aria-label={label} className={popUp} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

// Destructive actions always ask first and offer Cancel.
export function ConfirmButton({ message, children, className = "" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button className={className} onClick={(e) => !confirm(message) && e.preventDefault()}>
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

// Back / forward, like a browser toolbar. Uses the Navigation API when available to grey out a dead end.
export function HistoryButtons({ back, forward }: { back: string; forward: string }) {
  const router = useRouter();
  const path = usePathname();
  const [can, setCan] = useState({ back: true, forward: true });
  useEffect(() => {
    const nav = (window as unknown as { navigation?: { canGoBack: boolean; canGoForward: boolean } }).navigation;
    if (nav) setCan({ back: nav.canGoBack, forward: nav.canGoForward });
  }, [path]);
  const btn =
    "grid h-9 w-9 place-items-center rounded-full bg-fill text-ink transition-colors hover:bg-line/60 disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-blue";
  return (
    <div className="flex gap-2">
      <button type="button" className={btn} onClick={() => router.back()} disabled={!can.back} aria-label={back} title={back}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 3L5 8l5 5" />
        </svg>
      </button>
      <button type="button" className={btn} onClick={() => router.forward()} disabled={!can.forward} aria-label={forward} title={forward}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>
    </div>
  );
}
