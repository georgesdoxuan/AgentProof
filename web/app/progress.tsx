"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Immediate answer to a click: a thin blue line grows under the window's top edge until the new URL is committed,
// then fills and fades. It waits 120 ms before showing, so prefetched pages that open at once don't flash it.
// The App Router has no navigation events: a click on an internal link starts it, the URL change ends it.
export function NavProgress() {
  const here = `${usePathname()}?${useSearchParams()}`;
  const [nav, setNav] = useState<{ from: string; n: number } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      // Same page (or only its #anchor): nothing loads.
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      setNav((p) => ({ from: `${location.pathname}?${location.search.slice(1)}`, n: (p?.n ?? 0) + 1 }));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!nav) return null;
  return (
    <div
      key={nav.n}
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-blue ${nav.from === here ? "ap-progress-run" : "ap-progress-done"}`}
    />
  );
}
