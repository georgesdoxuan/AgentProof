import type { TeamRow } from "@/lib/auth";
import { getDict } from "@/lib/lang";
import Link from "next/link";
import { Chevron } from "@/lib/ui";
import { Hint } from "@/lib/hint";
import { AutoSubmitSelect, SpaceNav } from "./controls";
import { currentUser } from "@/lib/auth";
import { accountColor, spaceColor } from "@/lib/avatar";

// One frame for every page of the team space: a sidebar on the leading edge, the page beside it.
// Wide screens: the sidebar sits against the window edge (logo above lines up with it) and the page is centred
// in the space left, capped at 1200px (forms and settings keep to its first 760px so lines stay readable).
// Narrow screens: team and section tabs stack above the page, on the same 24/32px gutter as the header.
export async function SpaceShell({
  team,
  teams,
  title,
  intro,
  hint,
  actions,
  narrow = false,
  parent,
  children,
}: {
  team?: TeamRow; // left out by loading skeletons: the team block turns into placeholders
  teams?: TeamRow[];
  title: React.ReactNode;
  /** Facts about the page (counts, status): always shown under the title. */
  intro?: React.ReactNode;
  /** What the page is for: shown only on hover or focus of the title. */
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  narrow?: boolean;
  /** Child pages only (a site, Favoris, Corbeille): the section they belong to, as a back link above the title. */
  parent?: [href: string, label: string];
  children: React.ReactNode;
}) {
  const t = await getDict();
  // Cached per request (the header already read it): the « Compte » row wears the account's own avatar.
  const email = team ? (await currentUser())?.email : undefined;
  const account = email ? { initial: email[0].toUpperCase(), color: accountColor(email) } : undefined;
  return (
    <div data-app-shell className="min-h-[70vh] bg-bg-2 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-5 px-6 pt-6 sm:px-8 lg:sticky lg:top-[52px] lg:h-[calc(100dvh-52px)] lg:space-y-7 lg:self-start lg:overflow-y-auto lg:border-r lg:border-hairline lg:px-3 lg:py-6">
        {team ? (
          <div className="flex items-center gap-3 lg:px-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[17px] font-semibold text-white" style={{ background: spaceColor(team.id) }} aria-hidden>
              {team.name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              {teams && teams.length > 1 ? (
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
        ) : (
          <div className="flex items-center gap-3 lg:px-3" aria-hidden>
            <span className="sk h-9 w-9 shrink-0 rounded-[9px]" />
            <span className="min-w-0 flex-1">
              <span className="block h-7 text-[15px] leading-7"><span className="sk inline-block h-[0.8em] w-28 rounded-[5px] align-middle" /></span>
              <span className="type-caption block"><span className="sk inline-block h-[0.8em] w-16 rounded-[5px] align-middle" /></span>
            </span>
          </div>
        )}
        <SpaceNav t={t.space} account={account} />
      </aside>

      <div className="min-w-0 px-6 pb-24 pt-8 sm:px-8 lg:px-12 lg:pt-10 xl:px-16">
        {/* Same 1200px frame on every page so the title never jumps; forms and settings use its first 760px. */}
        <div className="mx-auto w-full max-w-[1200px]">
          <div className={`space-y-10 max-[734px]:space-y-8 ${narrow ? "max-w-[760px]" : ""}`}>
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
              <div className="min-w-0 flex-1 basis-[min(100%,520px)]">
                {parent && (
                  <Link href={parent[0]} className="type-small mb-3 inline-flex min-h-8 items-center gap-1 text-link hover:underline">
                    <Chevron dir="left" className="h-3 w-3" />
                    {parent[1]}
                  </Link>
                )}
                <h1 className="type-title">{hint ? <Hint tip={hint}>{title}</Hint> : title}</h1>
                {intro && <p className="mt-2 max-w-[680px] text-ink-2">{intro}</p>}
              </div>
              {actions}
            </header>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
