"use client";
import Link from "next/link";
import { accountColor } from "@/lib/avatar";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANG_NAME, type Dict, type Lang } from "@/lib/i18n";

const link =
  "inline-flex h-11 items-center whitespace-nowrap px-2 max-[400px]:px-1 text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2";
const item = "flex min-h-9 w-full items-center rounded-[8px] px-3 text-left type-small text-ink transition-colors hover:bg-fill";

// Footer language switch, on every page: a visitor of the public pages has no account page to change it from.
export function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname();
  const other: Lang = lang === "fr" ? "en" : "fr";
  return (
    <form action="/api/lang" method="post" className="inline">
      <input type="hidden" name="lang" value={other} />
      <input type="hidden" name="next" value={path} />
      <button lang={other} className="hover:text-ink hover:underline">
        {LANG_NAME[other]}
      </button>
    </form>
  );
}

// Home only: the page's sections, in the site header (one bar, not two). Centered beside the logo on wide screens,
// a second row under it below 1024 px. The section crossing the middle of the window is marked current.
export function Sections({ t }: { t: Dict["sections"] }) {
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
  return (
    <ul
      aria-label={label}
      className="type-caption order-last flex w-full gap-x-5 overflow-x-auto [scrollbar-width:none] max-[400px]:gap-x-3 lg:absolute lg:left-1/2 lg:w-auto lg:-translate-x-1/2 lg:gap-x-7"
    >
      {ids.map((id) => (
        <li key={id}>
          <a
            href={`#${id}`}
            aria-current={current === id ? "location" : undefined}
            className="relative inline-flex h-11 items-center whitespace-nowrap text-ink/80 transition-colors after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-center after:scale-x-0 after:bg-ink after:transition-transform hover:text-ink aria-[current=location]:text-ink aria-[current=location]:after:scale-x-100 lg:h-[52px] lg:after:bottom-3"
          >
            {items[id as keyof typeof items]}
          </a>
        </li>
      ))}
    </ul>
  );
}

// A client-side link leaves the layout (and this popover) mounted: close it by hand.
const hide = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.closest("[popover]") as HTMLElement | null)?.hidePopover();

// apple.com local nav. Signed out: the public pages and one blue pill. Signed in: the space and an account menu,
// so the app keeps a single primary action ("Lancer un audit") and Classement lives in the space's sidebar.
export function Nav({ email, t }: { email: string | null; t: Dict["nav"] }) {
  const path = usePathname();
  if (!email)
    return (
      <div className="flex h-[52px] items-center gap-1 type-caption max-[400px]:gap-0 sm:gap-3">
        {/* On the home page the ranking is one of the sections: no second "Classement" in the same bar. */}
        {path !== "/" && <Link href="/classement" aria-current={path === "/classement" ? "page" : undefined} className={link}>
          {t.ranking}
        </Link>}
        <Link href="/connexion" className={link}>
          {t.signIn}
        </Link>
        <Link href="/#tester" className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-blue px-[11px] text-white transition-colors hover:bg-[var(--blue-hover)]">
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
        <Link href="/equipe" onClick={hide} className={item}>
          {t.team}
        </Link>
        <Link href="/compte" onClick={hide} className={item}>
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
