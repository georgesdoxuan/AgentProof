-- Report management in the team space: favourite, rename, trash (soft delete), then permanent delete.
-- Shared by the whole team, like the reports themselves. To apply by hand on Supabase BEFORE deploying the code that reads these columns.
alter table public.audits
  add column if not exists title text,                          -- custom name; null = the site's domain
  add column if not exists favorite boolean not null default false,
  add column if not exists deleted_at timestamptz;              -- set = in the team's trash; null = active

-- The team space reads active reports and the trash per team.
create index if not exists audits_team_deleted_idx on public.audits (team_id, deleted_at);

-- Leaderboard (site_scores) only reads public audits (team_id is null): nothing to change there.
