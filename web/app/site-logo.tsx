"use client";
import { useState } from "react";

// The site's logo, next to its name everywhere. Fixed square (no layout shift), light neutral tile in both themes so
// dark logos stay readable, skeleton while it loads, brand initial when no reliable logo exists (/api/logo answers 404).
// Decorative (alt=""): the site's name is always written next to it, a screen reader would otherwise read it twice.
// Logos belong to their owners; nominative use only.
const PX = { sm: 24, md: 32, lg: 48 } as const;

export function SiteLogo({ domain, name, size = "md", eager, className = "" }: { domain?: string | null; name?: string | null; size?: keyof typeof PX; eager?: boolean; className?: string }) {
  const [state, setState] = useState<"load" | "ok" | "none">(domain ? "load" : "none");
  const px = PX[size];
  const initial = ((name || domain || "?").replace(/^(https?:\/\/)?(www\.)?/, "").match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] align-middle ${
        state === "none" ? "bg-fill text-ink-2" : state === "load" ? "sk" : "bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] dark:bg-[#f5f5f7]"
      } ${className}`}
      style={{ width: px, height: px }}
    >
      {state === "none" ? (
        <span className="font-semibold leading-none" style={{ fontSize: Math.round(px * 0.46) }}>
          {initial}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(img) => { if (img?.complete) setState(img.naturalWidth ? "ok" : "none"); }}
          src={`/api/logo/${encodeURIComponent(domain!)}`}
          alt=""
          width={px}
          height={px}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("none")}
          className={`h-full w-full object-contain transition-opacity duration-200 ${state === "ok" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
