"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { tr, type Lang } from "@/lib/i18n";

// The agent's free text (reasoning, finding, report) never runs past the screenshot it sits next to.
// Collapsed, the text is cut with a fade and a « Voir plus » link sits where it is cut; « Voir moins » folds it back.
// The link only shows when the text is really cut.
//
// - `lines`: the limit, in lines, used everywhere by default (and on mobile, where the screenshot sits above the text).
// - `fill`: from the md breakpoint, the text takes the height left in its card instead. The card must be a flex column
//   that does not grow with its content: put `ap-clamp-bound` on it (CSS in globals.css), so its height is the
//   screenshot's (grid row), then the text fills what is left under the card's header.
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ClampText({
  children,
  lang,
  lines = 6,
  fill = false,
  className = "",
}: {
  children: React.ReactNode;
  lang: Lang;
  lines?: number;
  fill?: boolean;
  className?: string;
}) {
  const t = tr(lang);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useIso(() => {
    const el = box.current;
    if (!el || open) return;
    const check = () => setCut(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // The bound card resizes when the screenshot loads, which does not always resize the text box first.
    const bound = el.closest(".ap-clamp-bound");
    if (bound) ro.observe(bound);
    return () => ro.disconnect();
  }, [open]);

  const fold = () => {
    setOpen(false);
    // Folding a long text can leave the reader far below the card: bring its top back into view.
    requestAnimationFrame(() => {
      const el = box.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  return (
    <div className={`ap-clamp ${fill ? "ap-clamp-fill" : ""} ${className}`} data-clamp={open ? "open" : "closed"} style={{ "--clamp-lines": lines } as React.CSSProperties}>
      <div ref={box} id={id} className="ap-clamp-text scroll-mt-24" data-cut={cut && !open ? "" : undefined}>
        {children}
      </div>
      {(cut || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => (open ? fold() : setOpen(true))}
          className="type-small mt-1.5 inline-flex min-h-[32px] shrink-0 cursor-pointer items-center self-start font-semibold text-link hover:underline focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-blue"
        >
          {open ? t("Voir moins", "See less") : t("Voir plus", "See more")}
        </button>
      )}
    </div>
  );
}
