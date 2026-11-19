-- Several test accounts per site and team, picked on the launch form; each payment run records the one it used.
-- New accounts get their own H vault (h_vault_id), so a run can only fill the account that was picked.
alter table public.site_logins drop constraint if exists site_logins_team_id_site_id_key;
alter table public.site_logins add column if not exists label text;
alter table public.site_logins add column if not exists h_vault_id text;
create index if not exists site_logins_team_site_idx on public.site_logins (team_id, site_id);
alter table public.runs add column if not exists login_id bigint references public.site_logins (id) on delete set null;
