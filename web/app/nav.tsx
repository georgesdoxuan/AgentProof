"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// apple.com local nav: small links, one small blue pill for the primary action.
export function Nav() {
  const path = usePathname();
  return (
    <div className="flex items-center gap-1 type-caption sm:gap-3">
      <Link
        href="/classement"
        aria-current={path === "/classement" ? "page" : undefined}
        className="inline-flex h-11 items-center px-2 text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink-2"
      >
        Classement
      </Link>
      <Link href="/#tester" className="inline-flex h-7 items-center rounded-full bg-blue px-[11px] text-white transition-colors hover:bg-[var(--blue-hover)]">
        Tester mon site
      </Link>
    </div>
  );
}
