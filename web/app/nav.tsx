"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/classement", "Classement"],
  ["/#tester", "Tester mon site"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <div className="flex items-center gap-1 text-[15px] font-medium">
      {LINKS.map(([href, label]) => {
        const current = href === path;
        const primary = href === "/#tester";
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={
              primary
                ? "ml-1 inline-flex h-9 items-center whitespace-nowrap rounded-full bg-ink px-4 text-paper transition-opacity hover:opacity-85"
                : `inline-flex h-11 items-center rounded-full px-3 transition-colors hover:text-ink ${current ? "text-ink" : "text-ink-2"}`
            }
          >
            {primary ? (
              <>
                <span className="sm:hidden">Tester</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </Link>
        );
      })}
    </div>
  );
}
