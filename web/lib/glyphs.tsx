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
  // Réglages: one glyph per tab and per section title, drawn like the sidebar's.
  team: "M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 19.5a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 5.5M18 13.6a6 6 0 0 1 3 5.9",
  card: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M7 15h3",
  key: "M8 10.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM11.2 11.8 19.5 3.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2",
  bolt: "M13 3 5 13.5h6.5L10.5 21 19 10.5h-6.5z",
  trash: "M4 6.5h16M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 10.5v6M14 10.5v6",
  person: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6.3 18.4a6.5 6.5 0 0 1 11.4 0",
  invite: "M10 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM3.5 20a6.5 6.5 0 0 1 10.8-4.9M18.5 14v6M15.5 17h6",
  plus: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14",
  signout: "M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4",
} as const;

export function Glyph({ d, className = "h-[1.1em] w-[1.1em]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
