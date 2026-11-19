-- Legal compliance (RGPD): proof of consent, and one-click unsubscribe from alert e-mails.
-- Additive only. Safe to apply before the code that reads it.
alter table public.users
  add column if not exists terms_accepted_at timestamptz; -- last time the user ticked "terms + privacy + minimum age" at sign-in

-- Addresses that asked to stop alert e-mails (page changed, score drop). Sign-in links and requested reports still go out.
create table if not exists public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.email_optouts enable row level security; -- read and written by the server (service role) only
