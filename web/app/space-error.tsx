"use client";

import { useSyncExternalStore } from "react";

const lang = () => (document.documentElement.lang === "en" ? "en" : "fr");

// A page of the space failed: the message takes the page's column, the sidebar around it stays usable.
export default function SpaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const en = useSyncExternalStore(() => () => {}, lang, () => "fr") === "en";
  return (
    <div className="px-6 py-32 text-center sm:px-8 max-[734px]:py-20">
      <h1 className="type-title">{en ? "Something went wrong." : "Un problème est survenu."}</h1>
      <p className="mt-3 text-ink-2">{en ? "This page could not load. Try again in a moment." : "Cette page n’a pas pu se charger. Réessayez dans un instant."}</p>
      <button type="button" onClick={reset} className="btn mt-6 min-h-[40px] px-[18px] text-[15px]">
        {en ? "Try again" : "Réessayer"}
      </button>
    </div>
  );
}
