"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dict } from "@/lib/i18n";

// apple.com local nav: small links, one small blue pill for the primary action.
export function Nav({ signedIn, t }: { signedIn: boolean; t: Dict["nav"] }) {
  const path = usePathname();
  return (
    <div className="flex items-center gap-1 type-caption sm:gap-3">
      <Link
        href="/classement"
        aria-current={path === "/classement" ? "page" : undefined}
        className="inline-flex h-11 items-center whitespace-nowrap px-2 text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2"
      >
        {t.ranking}
      </Link>
      <Link
        href={signedIn ? "/espace" : "/connexion"}
        aria-current={/^\/(espace|equipe|compte)(\/|$)/.test(path) ? "page" : undefined}
        className="inline-flex h-11 items-center whitespace-nowrap px-2 text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2"
      >
        {signedIn ? (
          <>
            <span className="max-[480px]:hidden">{t.mySpace}</span>
            <span className="min-[481px]:hidden">{t.space}</span>
          </>
        ) : (
          t.signIn
        )}
      </Link>
      <Link href="/#tester" className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-blue px-[11px] text-white transition-colors hover:bg-[var(--blue-hover)]">
        {t.test}<span className="max-[480px]:hidden">&nbsp;{t.testMySite}</span>
      </Link>
    </div>
  );
}
