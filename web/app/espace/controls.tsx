"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// lib/ui pulls in the server engine, so client controls keep their own styles.
// Pop-up button look for native <select>: keeps the system menu, drops the default chrome.
const popUp =
  "h-9 cursor-pointer appearance-none rounded-[8px] bg-fill bg-[length:10px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 type-small font-semibold text-ink transition-colors hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-blue " +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 14'%3E%3Cpath d='M2 5l3-3 3 3M2 9l3 3 3-3' fill='none' stroke='%2386868b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]";

const SECTIONS = [
  ["/espace", "Accueil"],
  ["/espace/sites", "Mes sites"],
  ["/espace/rapports", "Rapports"],
  ["/espace/paiement", "Paiement"],
  ["/espace/classement", "Classement"],
  ["/equipe", "Équipe"],
  ["/compte", "Compte"],
] as const;

// Sidebar on wide screens, segmented tabs on narrow ones. Tabs navigate, they never act.
export function SpaceNav() {
  const path = usePathname();
  return (
    <nav aria-label="Espace" className="max-lg:-mx-1 max-lg:overflow-x-auto">
      <ul className="flex gap-1 lg:flex-col max-lg:inline-flex max-lg:rounded-[10px] max-lg:bg-fill max-lg:p-[3px]">
        {SECTIONS.map(([href, label]) => {
          // "Mes sites" stays lit on a site page; "Accueil" only on itself.
          const current = href === "/espace" ? path === href : path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex items-center whitespace-nowrap rounded-[8px] transition-colors duration-200 lg:min-h-10 lg:px-3 max-lg:h-9 max-lg:px-4 max-lg:type-small max-lg:font-semibold ${
                  current
                    ? "bg-tile font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#3a3a3c]"
                    : "text-ink-2 hover:bg-tile/60 hover:text-ink max-lg:hover:bg-transparent"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
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

export function CopyField({ value, label }: { value: string; label: string }) {
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
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

// Back / forward, like a browser toolbar. Uses the Navigation API when available to grey out a dead end.
export function HistoryButtons() {
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
      <button type="button" className={btn} onClick={() => router.back()} disabled={!can.back} aria-label="Page précédente" title="Page précédente">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 3L5 8l5 5" />
        </svg>
      </button>
      <button type="button" className={btn} onClick={() => router.forward()} disabled={!can.forward} aria-label="Page suivante" title="Page suivante">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>
    </div>
  );
}
