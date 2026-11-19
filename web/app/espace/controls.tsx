"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

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
  podium: "M3 21h18M5 21v-6h4v6M10 21V8h4v13M15 21v-9h4v9",
  card: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M7 15h3",
  key: "M7.5 11a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.7 12.3 20 3M16.5 6.5l3 3M14 9l2.5 2.5",
  cycle: "M20 11a8 8 0 0 0-14.6-4.5M4 3v4h4M4 13a8 8 0 0 0 14.6 4.5M20 21v-4h-4",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2.5 21a6.5 6.5 0 0 1 13 0M16 3.2a4 4 0 0 1 0 7.6M21.5 21a6.5 6.5 0 0 0-4-6",
  person: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6.5 18.2a6.5 6.5 0 0 1 11 0",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  gauge: "M3.6 17.5a9 9 0 1 1 16.8 0M12 15.5l4-5M12 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  trash: "M4 6.5h16M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 10.5v6M14 10.5v6",
};

// Sub-sections shown under their parent in the sidebar (Rapports › Favoris, Corbeille). On narrow screens the page shows them as tabs.
const CHILDREN: Record<string, readonly (readonly [string, string])[]> = {
  "/espace/sites": [["/espace/sites/corbeille", ICON.trash]],
  "/espace/rapports": [["/espace/rapports/favoris", ICON.star], ["/espace/rapports/corbeille", ICON.trash]],
};

const glyph = (d: string, cls: string) => (
  <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const itemCls = (current: boolean) =>
  `flex items-center gap-2.5 whitespace-nowrap rounded-[8px] transition-colors duration-200 lg:min-h-9 lg:px-3 lg:text-[15px] max-lg:h-9 max-lg:px-4 max-lg:type-small max-lg:font-semibold ${
    current ? "bg-tile font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#3a3a3c]" : "text-ink-2 hover:bg-tile/60 hover:text-ink max-lg:hover:bg-transparent"
  }`;

// Three groups; their names and the section labels come from the dictionary (labels match each page's title).
const GROUPS = [
  ["track", [["/espace", ICON.home], ["/espace/sites", ICON.globe], ["/espace/rapports", ICON.doc], ["/espace/classement", ICON.podium]]],
  ["agent", [["/espace/paiement", ICON.card], ["/espace/comptes", ICON.key], ["/espace/automations", ICON.cycle]]],
  ["settings", [["/equipe", ICON.people], ["/espace/abonnement", ICON.gauge], ["/compte", ICON.person]]],
] as const;

// Sidebar on wide screens, segmented tabs on narrow ones (groups and icons drop out). Tabs navigate, they never act.
// The signed-in account's round initial, in its own color (the header's avatar), in place of the generic person glyph.
export type AccountBadge = { initial: string; color: string };
const badge = (a: AccountBadge, cls = "") => (
  <span
    className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-semibold leading-none text-white ${cls}`}
    style={{ background: a.color }}
    aria-hidden
  >
    {a.initial}
  </span>
);

export function SpaceNav({ t, account }: { t: Dict["space"]; account?: AccountBadge }) {
  const path = usePathname();
  return (
    <>
    <MobileNav t={t} path={path} account={account} />
    <nav aria-label={t.label} className="max-lg:hidden">
      <div className="lg:space-y-6 max-lg:inline-flex max-lg:gap-1 max-lg:rounded-[10px] max-lg:bg-fill max-lg:p-[3px]">
        {GROUPS.map(([group, items]) => (
          <div key={group} className="max-lg:contents">
            <p id={`nav-${group}`} className="type-caption mb-1.5 px-3 font-semibold text-ink-2 max-lg:hidden">
              {t.groups[group]}
            </p>
            <ul aria-labelledby={`nav-${group}`} className="flex flex-col gap-0.5 max-lg:contents">
              {items.map(([href, icon]) => {
                const children = CHILDREN[href] ?? [];
                const inChild = children.some(([c]) => path === c || path.startsWith(`${c}/`));
                // "Sites" stays lit on a site page; "Accueil" only on itself; a parent gives way to its lit sub-section.
                const current = href === "/espace" ? path === href : !inChild && (path === href || path.startsWith(`${href}/`));
                return (
                  <li key={href}>
                    {/* Narrow screens have no sub-sections in the tabs: the parent stays lit for them. */}
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={`${itemCls(current)} ${inChild ? "max-lg:bg-tile max-lg:text-ink max-lg:shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:max-lg:bg-[#3a3a3c]" : ""}`}
                    >
                      {href === "/compte" && account ? badge(account, "max-lg:hidden") : glyph(icon, `h-[18px] w-[18px] shrink-0 max-lg:hidden ${current ? "text-blue" : ""}`)}
                      {t.sections[href as keyof typeof t.sections]}
                    </Link>
                    {children.length > 0 && (
                      <ul className="mt-0.5 flex flex-col gap-0.5 pl-7 max-lg:hidden">
                        {children.map(([c, cIcon]) => {
                          const on = path === c || path.startsWith(`${c}/`);
                          return (
                            <li key={c}>
                              <Link href={c} aria-current={on ? "page" : undefined} className={`${itemCls(on)} lg:min-h-8 lg:text-[14px]`}>
                                {glyph(cIcon, `h-4 w-4 shrink-0 ${on ? "text-blue" : ""}`)}
                                {t.sections[c as keyof typeof t.sections]}
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
          </div>
        ))}
      </div>
    </nav>
    </>
  );
}

// The section's own glyph before the page title: the sidebar entry's icon, at the title's size. Read from the path
// so every page in the shell (and its loading skeleton) gets it with nothing to pass; a page that is not a sidebar
// entry (a site, « Lancer un audit ») keeps a bare title. « Compte » takes the person glyph, not the avatar.
const SECTION_ICON: Record<string, string> = Object.fromEntries([
  ...GROUPS.flatMap(([, items]) => items as readonly (readonly [string, string])[]),
  ...Object.values(CHILDREN).flat(),
]);
export function SectionIcon() {
  const d = SECTION_ICON[usePathname().replace(/\/$/, "")];
  if (!d) return null;
  // As tall as one line of the title, so it sits on the first line even when the title wraps.
  return (
    <span className="flex h-[1.12em] shrink-0 items-center" aria-hidden>
      {glyph(d, "h-[0.86em] w-[0.86em] text-blue")}
    </span>
  );
}

// Narrow screens: three tabs a merchant uses every day, everything else behind "Plus", like a tab bar's More.
// Nine sections in one scrolling strip hid the settings off screen with no hint they existed.
const MAIN = ["/espace", "/espace/sites", "/espace/rapports"] as const;
function MobileNav({ t, path, account }: { t: Dict["space"]; path: string; account?: AccountBadge }) {
  const isOn = (href: string) => (href === "/espace" ? path === href : path === href || path.startsWith(`${href}/`));
  const rest = GROUPS.flatMap(([, items]) => items as readonly (readonly [string, string])[]).filter(([href]) => !(MAIN as readonly string[]).includes(href));
  const inRest = rest.find(([href]) => isOn(href));
  const tab = (on: boolean) =>
    `flex h-9 items-center whitespace-nowrap rounded-[8px] px-3.5 type-small font-semibold transition-colors ${on ? "bg-tile text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#3a3a3c]" : "text-ink-2"}`;
  return (
    <nav aria-label={t.label} className="lg:hidden">
      <div className="flex w-full gap-1 rounded-[10px] bg-fill p-[3px]">
        {MAIN.map((href) => (
          <Link key={href} href={href} aria-current={isOn(href) ? "page" : undefined} className={`${tab(isOn(href))} flex-auto justify-center`}>
            {t.sections[href]}
          </Link>
        ))}
        <details className="group relative shrink-0">
          <summary className={`${tab(!!inRest)} cursor-pointer list-none justify-center gap-1.5 [&::-webkit-details-marker]:hidden`} aria-current={inRest ? "page" : undefined}>
            {/* Always « Plus »: a long section name would be cut to « M… ». It stays lit, and the page title says where you are. */}
            <span className="truncate">{t.more}</span>
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1.5 4L6 8.5 10.5 4" />
            </svg>
          </summary>
          <ul className="absolute right-0 top-11 z-30 w-60 rounded-[14px] bg-tile p-1.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-hairline dark:bg-[#2c2c2e]">
            {rest.map(([href, icon]) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
                  aria-current={isOn(href) ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-[8px] px-3 type-small ${isOn(href) ? "font-semibold text-ink" : "text-ink"} hover:bg-fill`}
                >
                  {href === "/compte" && account ? badge(account) : glyph(icon, `h-[18px] w-[18px] shrink-0 ${isOn(href) ? "text-blue" : "text-ink-2"}`)}
                  {t.sections[href as keyof typeof t.sections]}
                </Link>
              </li>
            ))}
          </ul>
        </details>
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
