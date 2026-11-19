"use client";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";

// Payment replay: from the step where the agent types the card, the screenshot may show it. It starts blurred,
// so a shared screen or a glance over the shoulder never shows the card; one click reveals it for the viewer.
export function BlurredShot({ src, alt, lang, eager }: { src: string; alt: string; lang: Lang; eager?: boolean }) {
  const [shown, setShown] = useState(false);
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  return (
    <div className="relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`block w-full transition-[filter] duration-300 ${shown ? "" : "scale-[1.02] blur-xl"}`} loading={eager ? "eager" : "lazy"} />
      {!shown && (
        <button type="button" onClick={() => setShown(true)} className="type-small absolute inset-0 grid place-items-center font-semibold text-white">
          <span className="rounded-full bg-black/60 px-4 py-2">{t("Carte possiblement visible · Afficher la capture", "Card may be visible · Show screenshot")}</span>
        </button>
      )}
    </div>
  );
}
