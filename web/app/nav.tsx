"use client";
import Link from "next/link";
import { accountColor } from "@/lib/avatar";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LANGS, LANG_NAME, type Dict, type Lang } from "@/lib/i18n";

const link =
  "inline-flex h-11 items-center whitespace-nowrap px-2 max-[360px]:px-1 text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2";
const item = "flex min-h-9 w-full items-center rounded-[8px] px-3 text-left type-small text-ink transition-colors hover:bg-fill";

const GLOBE = "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9c2.4-2.5 3.6-5.5 3.6-9S14.4 5.5 12 3z";

// Header language picker for visitors (signed in, the account page has it): a globe and the current code, opening a
// two-line menu. Fixed width, so switching never shifts the header. Each language names itself.
export function LangMenu({ lang, label }: { lang: Lang; label: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label} : ${LANG_NAME[lang]}`}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 items-center gap-1 px-1.5 max-[400px]:px-1 text-ink/80 transition-colors hover:text-ink aria-expanded:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={GLOBE} />
        </svg>
        <span className="w-[2.1ch] text-left uppercase tabular-nums max-[400px]:hidden" aria-hidden>{lang}</span>
      </button>
      {open && (
        <form action="/api/lang" method="post" className="absolute right-0 top-[46px] z-50 w-44 rounded-[12px] bg-tile p-1.5 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-hairline">
          <input type="hidden" name="next" value={path} />
          {LANGS.map((l) => (
            <button key={l} name="lang" value={l} lang={l} aria-current={l === lang ? "true" : undefined} className={`${item} justify-between`}>
              {LANG_NAME[l]}
              {l === lang && (
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 10.5l3.2 3.2L15 7" />
                </svg>
              )}
            </button>
          ))}
        </form>
      )}
    </div>
  );
}

// Home page only: the source of the "44 %" figure (note 1), in the footer's fine print rather than a band of its own.
export function FooterNote({ text }: { text: string }) {
  if (usePathname() !== "/") return null;
  return (
    <p id="note-1" className="scroll-mt-20">
      <span className="tabular-nums">1.</span> {text}
    </p>
  );
}

// Home only: the page's sections, plus "Méthode" (its own page: visitors want the method before giving their site).
// Wide screens: in the site header, centered beside the logo. Below 1024 px: a bar of its own at the top of the home
// page (`bar`), sticky under the header. It used to be a second row of the header, so the header grew by 44 px on
// arriving at the home page and shrank on leaving it: everything under it jumped.
// The section crossing the middle of the window is marked current.
export function Sections({ t, bar }: { t: Dict["sections"]; bar?: boolean }) {
  const path = usePathname();
  const [current, setCurrent] = useState<string | null>(null);
  const { label, ...items } = t;
  const ids = Object.keys(items);
  useEffect(() => {
    if (path !== "/") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting ? setCurrent(e.target.id) : setCurrent((c) => (c === e.target.id ? null : c))),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  if (path !== "/") return null;
  const list = (
    <ul
      aria-label={label}
      className={
        bar
          ? "type-caption flex w-full gap-x-5 overflow-x-auto [scrollbar-width:none] max-[400px]:gap-x-3"
          : "type-caption absolute left-1/2 flex -translate-x-1/2 gap-x-7 max-lg:hidden"
      }
    >
      {ids.map((id) => (
        <li key={id}>
          <a
            href={id === "methode" ? "/methode" : `#${id}`}
            aria-current={current === id ? "location" : undefined}
            className={`relative inline-flex h-11 items-center whitespace-nowrap text-ink/80 transition-colors after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-center after:scale-x-0 after:bg-ink after:transition-transform hover:text-ink aria-[current=location]:text-ink aria-[current=location]:after:scale-x-100 ${bar ? "" : "h-[52px]! after:bottom-3!"}`}
          >
            {items[id as keyof typeof items]}
          </a>
        </li>
      ))}
    </ul>
  );
  if (!bar) return list;
  return (
    <div className="sticky top-[53px] z-30 border-b border-hairline bg-[var(--nav)] backdrop-blur-[20px] backdrop-saturate-[180%] lg:hidden">
      <div className="wrap-wide">{list}</div>
    </div>
  );
}

// A client-side link leaves the layout (and this popover) mounted: close it by hand.
const hide = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.closest("[popover]") as HTMLElement | null)?.hidePopover();

// "?" in the header, signed in or not: the help centre with its search. Same thin stroke as the sidebar icons.
function Help({ label, path }: { label: string; path: string }) {
  return (
    <Link href="/faq" aria-label={label} title={label} aria-current={path === "/faq" ? "page" : undefined} className="grid h-11 w-9 shrink-0 place-items-center text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2">
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.9M12 17.3h.01" />
      </svg>
    </Link>
  );
}

// apple.com local nav. Signed out: the public pages and one blue pill. Signed in: the space and an account menu,
// so the app keeps a single primary action ("Lancer un audit") and Classement lives in the space's sidebar.
export function Nav({ email, t, lang, langLabel }: { email: string | null; t: Dict["nav"]; lang: Lang; langLabel: string }) {
  const path = usePathname();
  if (!email)
    return (
      <div className="flex h-[52px] items-center gap-1.5 type-caption max-[360px]:gap-0.5 sm:gap-3">
        {/* On the home page the ranking is one of the sections: no second "Classement" in the same bar. */}
        {path !== "/" && <Link href="/classement" aria-current={path === "/classement" ? "page" : undefined} className={link}>
          {t.ranking}
        </Link>}
        <LangMenu lang={lang} label={langLabel} />
        {/* Phones: no room for the "?" beside the globe on one line; Aide stays in the footer. */}
        <span className="contents max-[480px]:hidden"><Help label={t.help} path={path} /></span>
        <Link href="/connexion" className={link}>
          {t.signIn}
        </Link>
        <Link href="/#tester" className="ml-1 inline-flex h-7 items-center whitespace-nowrap rounded-full bg-blue px-[11px] text-white transition-colors hover:bg-[var(--blue-hover)]">
          {t.test}<span className="max-[480px]:hidden">&nbsp;{t.testMySite}</span>
        </Link>
      </div>
    );
  return (
    <div className="flex h-[52px] items-center gap-1 type-caption sm:gap-2">
      <Link href="/espace" aria-current={/^\/(espace|equipe|compte)(\/|$)/.test(path) ? "page" : undefined} className={link}>
        <span className="max-[480px]:hidden">{t.mySpace}</span>
        <span className="min-[481px]:hidden">{t.space}</span>
      </Link>
      <Help label={t.help} path={path} />
      <button type="button" popoverTarget="compte-menu" aria-label={`${t.account} : ${email}`} className="-mr-2 grid h-11 w-11 place-items-center rounded-full">
        <span className="grid h-7 w-7 place-items-center rounded-full font-semibold text-white" style={{ background: accountColor(email) }} aria-hidden>
          {email[0].toUpperCase()}
        </span>
      </button>
      <div
        id="compte-menu"
        popover="auto"
        className="fixed inset-auto top-[56px] right-[calc((100vw-min(1200px,87.5vw))/2)] m-0 w-64 rounded-[14px] border-0 bg-tile p-1.5 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-hairline"
      >
        <p className="type-caption truncate px-3 pb-1.5 pt-2 text-ink-2">{email}</p>
        <Link href="/espace/reglages/equipe" onClick={hide} className={item}>
          {t.team}
        </Link>
        <Link href="/espace/reglages/compte" onClick={hide} className={item}>
          {t.account}
        </Link>
        <form action="/api/auth" method="post" className="mt-1 border-t border-hairline pt-1">
          <input type="hidden" name="action" value="logout" />
          <button className={item}>{t.signOut}</button>
        </form>
      </div>
    </div>
  );
}
