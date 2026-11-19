-- Missions chosen per audit: a team can untick default missions, edit them, or add its own.
-- Team missions live in the same table as the defaults so runs, replays, reports and credits work unchanged:
--   team_id null                 → AgentProof default mission (unchanged)
--   team_id set, base_id set     → the team's saved edit of a default mission
--   team_id set, base_id null    → a mission the team added
--   saved false                  → written for one audit only, never listed again
-- "Back to default" and "remove" set active = false: nothing is deleted, past reports keep their mission.
-- Additive only: new columns with defaults, two indexes (missions.id is already an identity column).

alter table missions
  add column if not exists team_id uuid, -- no foreign key: runs of a deleted team keep pointing at their mission
  add column if not exists base_id bigint references missions(id),
  add column if not exists saved boolean not null default true,
  add column if not exists checked boolean not null default true, -- team missions: ticked by default on the launch form
  add column if not exists created_by uuid references users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists missions_team on missions (team_id) where team_id is not null;
-- One live edit per default mission and team.
create unique index if not exists missions_team_base on missions (team_id, base_id) where base_id is not null and active and saved;
