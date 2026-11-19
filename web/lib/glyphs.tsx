// Outline glyphs shared by server pages (lib/ui.tsx Icon) and client components, which cannot import lib/ui.
// Same drawing rules as the sidebar: 24 grid, 1.8 stroke, round ends, drawn with the text color.
export const GLYPH = {
  desktop: "M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 20h7M12 16v4",
  mobile: "M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2",
  // Desktop and mobile together: a smaller screen with its stand, a phone beside it.
  both: "M3 4.5h10a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1zM5.5 18h5M8 14v4M17.5 8h3A1.5 1.5 0 0 1 22 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 17.5 8zM18.5 17.5h1",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2",
  // A credit: a coin carrying the four-point spark of the agent (as in "sparkle"), one per mission.
  credit: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5l1.25 3.25L16.5 12l-3.25 1.25L12 16.5l-1.25-3.25L7.5 12l3.25-1.25z",
} as const;

export function Glyph({ d, className = "h-[1.1em] w-[1.1em]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
