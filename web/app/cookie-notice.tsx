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
export function CookieNotice({ text, more, ok }: { text: string; more: string; ok: string }) {
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
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[640px] flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] bg-tile p-4 pl-5 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-hairline max-[480px]:inset-x-3 max-[480px]:bottom-3"
    >
      <p className="type-small min-w-0 flex-1 basis-[260px] text-ink-2">
        {text}{" "}
        <Link href="/cookies" className="text-link hover:underline">
          {more}
        </Link>
      </p>
      <button type="button" onClick={close} className="btn min-h-11 px-6 max-[480px]:w-full">
        {ok}
      </button>
    </aside>
  );
}
