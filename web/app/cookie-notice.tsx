"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const KEY = "ap_cookie_notice";
const noop = () => () => {};
const readSeen = () => {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return true; // storage blocked: do not nag on every page
  }
};

// The site only sets strictly necessary cookies (session, team, language), which need no consent: this is an
// information, not a consent banner, so it has a single "OK". If an optional cookie is ever added, replace it with
// a real choice where "Refuse" sits next to "Accept", same size, same weight (CNIL).
// On phones it is one compact line (short text, link, small "OK"): it must never hide the top of the home page nor
// compete with "Tester mon site".
export function CookieNotice({ text, short, more, ok }: { text: string; short: string; more: string; ok: string }) {
  // Read once on the client; the server and first paint render nothing, so a returning visitor never sees it flash.
  const seen = useSyncExternalStore(noop, readSeen, () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setClosed(true);
  };
  return (
    <aside
      aria-label="Cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[640px] flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] bg-tile p-4 pl-5 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-hairline max-[480px]:inset-x-2 max-[480px]:bottom-2 max-[480px]:flex-nowrap max-[480px]:gap-x-2 max-[480px]:rounded-full max-[480px]:py-0 max-[480px]:pl-4 max-[480px]:pr-1"
    >
      <p className="type-small min-w-0 flex-1 basis-[260px] text-ink-2 max-[480px]:type-caption max-[480px]:basis-auto">
        <span className="max-[480px]:hidden">{text}</span>
        <span className="min-[481px]:hidden">{short}</span>{" "}
        <Link href="/cookies" className="text-link hover:underline">
          {more}
        </Link>
      </p>
      <button type="button" onClick={close} className="btn min-h-11 px-6 max-[480px]:shrink-0 max-[480px]:bg-transparent max-[480px]:px-3 max-[480px]:text-[14px] max-[480px]:text-link">
        {ok}
      </button>
    </aside>
  );
}
