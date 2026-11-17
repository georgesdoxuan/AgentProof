import { ROLE_LABEL, type TeamRow } from "@/lib/auth";
import { AutoSubmitSelect, SpaceNav } from "./controls";

// One frame for every page of the team space: team and sections on the left, the page on the right.
export function SpaceShell({
  team,
  teams,
  title,
  intro,
  actions,
  children,
}: {
  team: TeamRow;
  teams: TeamRow[];
  title: string;
  intro?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh] bg-bg-2 pb-24 pt-12 max-[734px]:pt-8">
      <div className="wrap-wide grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <aside className="space-y-6 lg:sticky lg:top-[76px] lg:self-start">
          <div className="flex items-center gap-3 lg:px-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-ink type-headline text-bg" aria-hidden>
              {team.name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="type-headline block break-words">{team.name}</span>
              <span className="type-small text-ink-2">{ROLE_LABEL[team.role]}</span>
            </span>
          </div>
          {teams.length > 1 && (
            <form action="/api/team" method="post" className="lg:px-3">
              <input type="hidden" name="action" value="switch" />
              <AutoSubmitSelect name="team" defaultValue={team.id} label="Changer d'équipe" options={teams.map((t) => [t.id, t.name])} />
            </form>
          )}
          <SpaceNav />
        </aside>

        <div className="min-w-0 space-y-12 max-[734px]:space-y-10">
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="type-h2">{title}</h1>
              {intro && <p className="mt-3 max-w-[620px] text-ink-2">{intro}</p>}
            </div>
            {actions}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
