"use client";
import { useState } from "react";

// The site's logo, next to its name everywhere. Cut out (transparent, no tile), in a fixed square (no layout shift).
// Two versions: one for light pages, one for dark pages where black ink turns light. Skeleton while it loads, brand
// initial when no reliable logo exists (/api/logo answers 404). V changes the URL whenever stored logos are redone
// (the CDN keeps a logo for a year).
// Decorative (alt=""): the site's name is always written next to it, a screen reader would otherwise read it twice.
// Logos belong to their owners; nominative use only.
// Loaded eagerly, no fade: a few KB each from the CDN, so they show with the page.
const PX = { sm: 24, md: 32, lg: 48 } as const;
const V = 2;

export function SiteLogo({ domain, name, size = "md", className = "" }: { domain?: string | null; name?: string | null; size?: keyof typeof PX; className?: string }) {
  const [state, setState] = useState<"load" | "ok" | "none">(domain ? "load" : "none");
  const px = PX[size];
  const initial = ((name || domain || "?").replace(/^(https?:\/\/)?(www\.)?/, "").match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] align-middle ${
        state === "none" ? "bg-fill text-ink-2" : state === "load" ? "sk" : ""
      } ${className}`}
      style={{ width: px, height: px }}
    >
      {state === "none" ? (
        <span className="font-semibold leading-none" style={{ fontSize: Math.round(px * 0.46) }}>
          {initial}
        </span>
      ) : (
        <picture className="contents">
          <source media="(prefers-color-scheme: dark)" srcSet={`/api/logo/${encodeURIComponent(domain!)}?v=${V}&theme=dark`} />
          <img
          ref={(img) => { if (img?.complete) setState(img.naturalWidth ? "ok" : "none"); }}
          src={`/api/logo/${encodeURIComponent(domain!)}?v=${V}`}
          alt=""
          width={px}
          height={px}
          onLoad={() => setState("ok")}
          onError={() => setState("none")}
          className={`h-full w-full object-contain ${state === "ok" ? "" : "opacity-0"}`}
          />
        </picture>
      )}
    </span>
  );
}
