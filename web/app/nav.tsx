"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const link =
  "inline-flex h-11 items-center whitespace-nowrap px-2 text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2";
const item = "flex min-h-9 w-full items-center rounded-[8px] px-3 text-left type-small text-ink transition-colors hover:bg-fill";

// A client-side link leaves the layout (and this popover) mounted: close it by hand.
const hide = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.closest("[popover]") as HTMLElement | null)?.hidePopover();

// apple.com local nav. Signed out: the public pages and one blue pill. Signed in: the space and an account menu,
// so the app keeps a single primary action ("Lancer un audit") and Classement lives in the space's sidebar.
export function Nav({ email }: { email: string | null }) {
  const path = usePathname();
  if (!email)
    return (
      <div className="flex items-center gap-1 type-caption sm:gap-3">
        <Link href="/classement" aria-current={path === "/classement" ? "page" : undefined} className={link}>
          Classement
        </Link>
        <Link href="/connexion" className={link}>
          Connexion
        </Link>
        <Link href="/#tester" className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-blue px-[11px] text-white transition-colors hover:bg-[var(--blue-hover)]">
          Tester<span className="max-[480px]:hidden">&nbsp;mon site</span>
        </Link>
      </div>
    );
  return (
    <div className="flex items-center gap-1 type-caption sm:gap-2">
      <Link href="/espace" aria-current={/^\/(espace|equipe|compte)(\/|$)/.test(path) ? "page" : undefined} className={link}>
        <span className="max-[480px]:hidden">Mon espace</span>
        <span className="min-[481px]:hidden">Espace</span>
      </Link>
      <button type="button" popoverTarget="compte-menu" aria-label={`Compte : ${email}`} className="-mr-2 grid h-11 w-11 place-items-center rounded-full">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink font-semibold text-bg" aria-hidden>
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
          Équipe
        </Link>
        <Link href="/compte" onClick={hide} className={item}>
          Compte
        </Link>
        <form action="/api/auth" method="post" className="mt-1 border-t border-hairline pt-1">
          <input type="hidden" name="action" value="logout" />
          <button className={item}>Se déconnecter</button>
        </form>
      </div>
    </div>
  );
}
