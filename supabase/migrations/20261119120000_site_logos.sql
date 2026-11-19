-- Site logos shown next to each site name. Additive only: three nullable columns and a public bucket.
-- logo_checked_at set and logo_url null = nothing reliable found, the UI draws the brand's initial.
alter table public.sites
  add column if not exists logo_url text,
  add column if not exists logo_source text,          -- apple-touch-icon, manifest, json-ld, icon-svg, google-s2, initial, manual...
  add column if not exists logo_checked_at timestamptz;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
