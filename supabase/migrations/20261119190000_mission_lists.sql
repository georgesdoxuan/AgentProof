-- Mission lists saved by a team on the launch form ("Mes listes"): a name and the missions it ticks.
-- items: JSON array, one entry per mission, in pick order:
--   { "key": "d12" | "t40" }                       → a listed mission (default, edited default or team mission)
--   { "title": …, "text": …, "base_id"?: 12 }      → a mission written for this list only (checked again at launch)
-- Shared by the whole team; editors and up create, rename and delete them (checked by the server).
-- Additive only: one new table, nothing else changes.
create table if not exists public.mission_lists (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mission_lists_team on public.mission_lists (team_id, name);
alter table public.mission_lists enable row level security; -- read and written by the server (service role) only
