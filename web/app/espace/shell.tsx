import { getDict, getLang } from "@/lib/lang";
import { loadSidebar } from "@/lib/sidebar";
import Link from "next/link";
import { Chevron } from "@/lib/ui";
import { Hint } from "@/lib/hint";
import { cookies } from "next/headers";
import { AutoSubmitSelect, Frame, SectionIcon, SettingsTabs } from "./controls";
import { canLaunch, teamContext } from "@/lib/auth";
import { spaceColor } from "@/lib/avatar";
import { SideAccount } from "./side";

// One frame for every page of the team space: a sidebar on the leading edge, the page beside it.
// Wide screens: the sidebar sits against the window edge and the page is centred
// in the space left, capped at 1200px (forms keep to its first 760px so lines stay readable; Réglages uses the
// whole width, in two columns when there is room).
// Narrow screens: team and section tabs stack above the page, on the same 24/32px gutter as the header.
//
// SpaceFrame is rendered by the layouts (espace), not by the pages: a layout stays mounted when
// you move between its pages, so the sidebar never re-renders, never flashes placeholders and never moves. Only
// the page column (SpaceShell, or the route's loading.tsx) is swapped.
export async function SpaceFrame({ children }: { children: React.ReactNode }) {
  const ctx = await teamContext();
  // Signed out (the page redirects) or in no team yet (the space's home offers to create one): no sidebar.
  if (!ctx?.team) return <>{children}</>;
  const { team, teams, user } = ctx;
  const t = await getDict();
  // Sidebar folded to icons: a cookie (set by the toggle in controls.tsx), so the first paint has the right width.
  const jar = await cookies();
  const collapsed = jar.get("ap_nav")?.value === "1";
  // Not awaited: the sidebar's counters, sites and credits stream in with the page (it reads the same space, cached).
  const side = loadSidebar(team.id).catch(() => null);
  const reserve = Math.min(3, Math.max(0, Number(jar.get("ap_ns")?.value ?? 1) || 0));
  return (
    <Frame
      t={t.space}
      lang={await getLang()}
      collapsed={collapsed}
      side={side}
      reserve={reserve}
      launch={canLaunch(team.role)}
      account={<SideAccount email={user.email} role={t.roles[team.role]} t={t.nav} />}
      head={
        <div className="flex items-center gap-3 lg:pl-3 lg:group-data-collapsed/frame:pl-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[17px] font-semibold text-white lg:group-data-collapsed/frame:mx-1.5" style={{ background: spaceColor(team.id) }} title={team.name} aria-hidden>
            {team.name[0]?.toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 lg:group-data-collapsed/frame:hidden">
            {teams.length > 1 ? (
              // The team's name is the switcher: no second copy of it above a pop-up.
              <form action="/api/team" method="post">
                <input type="hidden" name="action" value="switch" />
                <AutoSubmitSelect
                  name="team"
                  defaultValue={team.id}
                  label={t.space.switchTeam}
                  options={teams.map((t) => [t.id, t.name])}
                  className="-ml-1 h-7! max-w-full truncate bg-transparent! pl-1! text-[15px]! hover:bg-fill!"
                />
              </form>
            ) : (
              <span className="block truncate text-[15px] font-semibold">{team.name}</span>
            )}
            <span className="type-caption block text-ink-2">{t.roles[team.role]}</span>
          </span>
        </div>
      }
    >
      {children}
    </Frame>
  );
}

// The page column: title, facts, main action, then the page. Same 1200px frame on every page so the title never jumps.
export async function SpaceShell({
  title,
  settings = false,
  intro,
  hint,
  actions,
  narrow = false,
  parent,
  bare = false,
  compact = false,
  children,
}: {
  /** Left out on a Réglages tab: the title is « Réglages ». */
  title?: React.ReactNode;
  /** A Réglages tab: « Réglages » as the title, the tabs under the header. */
  settings?: boolean;
  /** Facts about the page (counts, status): always shown under the title, as chips (lib/ui Chips) or one short line. */
  intro?: React.ReactNode;
  /** What the page is for: shown only on hover or focus of the title. */
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  narrow?: boolean;
  /** Child pages only (a site, Favoris): the section they belong to, as a back link above the title. */
  parent?: [href: string, label: string];
  /** No visible title (Accueil, Sites, Rapports, Automations, Réglages): the sidebar and the browser tab already name the page;
   *  the h1 stays for screen readers, the facts (intro) and the main action share the top row, and the content starts at the top. */
  bare?: boolean;
  /** A child page (a site): smaller title, less space above and between blocks, so the content shows without scrolling. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  const space = settings ? (await getDict()).space : null;
  if (space) title = space.sections["/espace/reglages"];
  const hidden = bare || settings;
  return (
    // No visible title: the content starts 24px under the header, level with the sidebar's first row.
    <div className={`min-w-0 px-6 pb-24 sm:px-8 lg:px-12 xl:px-16 ${hidden || compact ? "pt-6" : "pt-8 lg:pt-10"}`}>
      {/* A container: Réglages' two columns (lib/ui Columns) follow the page's width, not the window's. */}
      <div className="@container mx-auto w-full max-w-[1200px]">
        {hidden && <h1 className="sr-only">{title}</h1>}
        {/* Réglages tabs ignore `narrow`: tabs and content span the whole frame, so no tab leaves an empty band on the right. */}
        <div className={`${hidden || compact ? "space-y-8 max-[734px]:space-y-6" : "space-y-10 max-[734px]:space-y-8"} ${narrow && !settings ? "max-w-[760px]" : ""}`}>
          {hidden && (intro || actions) && (
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              {intro && <div className="min-w-0 text-ink-2">{intro}</div>}
              {actions && <div className="ml-auto">{actions}</div>}
            </div>
          )}
          {!hidden && <header className={`flex flex-wrap items-end justify-between gap-y-5 ${compact ? "gap-x-6" : "gap-x-8"}`}>
            {/* At least as tall as the main action: the title sits at the same height with or without a button. */}
            <div className={`min-w-0 flex-1 basis-[min(100%,520px)] ${compact ? "min-h-10" : "min-h-12"}`}>
              {parent && (
                <Link href={parent[0]} className={`type-small inline-flex ${compact ? "mb-1" : "mb-3"} min-h-8 items-center gap-1 text-link hover:underline`}>
                  <Chevron dir="left" className="h-3 w-3" />
                  {parent[1]}
                </Link>
              )}
              {/* Icon + title: one header for every page, so a new page in the shell gets its sidebar icon too. */}
              <h1 className={`flex items-start gap-3 max-[734px]:gap-2.5 ${compact ? "type-h3" : "type-title"}`}>
                <SectionIcon />
                <span className="min-w-0 flex-1">{hint ? <Hint tip={hint}>{title}</Hint> : title}</span>
              </h1>
              {intro && <div className={`max-w-[680px] text-ink-2 ${compact ? "mt-2.5" : "mt-3"}`}>{intro}</div>}
            </div>
            {actions}
          </header>}
          {space && <SettingsTabs t={space} />}
          {children}
        </div>
      </div>
    </div>
  );
}
