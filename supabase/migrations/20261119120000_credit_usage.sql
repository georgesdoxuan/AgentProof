-- Credits: one ledger row per mission a team's audit queues (manual, automatic, payment) and per mission replay.
-- Rows are written by triggers on runs, so every path that creates missions (form, cron, deploy hook, monthly
-- follow-up, engine replays) is counted once, with no app code to forget. Prices per kind live in web/lib/credits.ts.
-- Additive only: one new table, two new team columns, two triggers, a backfill of past runs.

create table if not exists credit_usage (
  id bigserial primary key,
  team_id uuid not null references teams(id) on delete cascade,
  audit_id uuid,   -- no foreign key: purging a report must not erase what it consumed
  run_id bigint not null,
  site_id bigint,
  device text,
  kind text not null check (kind in ('manual', 'automation', 'replay', 'payment')),
  attempt int not null default 1,
  created_at timestamptz not null default now(),
  unique (run_id, attempt) -- one row per mission attempt: re-running the backfill or a trigger never doubles it
);
create index if not exists credit_usage_team_time on credit_usage (team_id, created_at desc);
alter table credit_usage enable row level security; -- read by the server with the secret key only

alter table teams
  add column if not exists plan text not null default 'free',
  add column if not exists credit_alert text; -- last alert sent, as "YYYY-MM:80" or "YYYY-MM:100"

create or replace function credit_usage_on_run() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into credit_usage (team_id, audit_id, run_id, site_id, device, kind, attempt)
    select a.team_id, a.id, new.id, a.site_id, a.device,
           case when a.kind = 'payment' then 'payment' when new.priority > 0 then 'automation' else 'manual' end,
           coalesce(new.attempts, 1)
    from audits a where a.id = new.audit_id and a.team_id is not null
    on conflict do nothing;
  elsif new.attempts > coalesce(old.attempts, 1) then
    insert into credit_usage (team_id, audit_id, run_id, site_id, device, kind, attempt)
    select a.team_id, a.id, new.id, a.site_id, a.device, 'replay', new.attempts
    from audits a where a.id = new.audit_id and a.team_id is not null
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists credit_usage_insert on runs;
create trigger credit_usage_insert after insert on runs for each row execute function credit_usage_on_run();
drop trigger if exists credit_usage_replay on runs;
create trigger credit_usage_replay after update of attempts on runs for each row execute function credit_usage_on_run();

-- Backfill: every mission already run by a team, then every replay (dated when the replay launched).
insert into credit_usage (team_id, audit_id, run_id, site_id, device, kind, attempt, created_at)
select a.team_id, a.id, r.id, a.site_id, a.device,
       case when a.kind = 'payment' then 'payment' when r.priority > 0 then 'automation' else 'manual' end, 1, r.created_at
from runs r join audits a on a.id = r.audit_id where a.team_id is not null
on conflict do nothing;
insert into credit_usage (team_id, audit_id, run_id, site_id, device, kind, attempt, created_at)
select a.team_id, a.id, r.id, a.site_id, a.device, 'replay', r.attempts, coalesce(r.launched_at, r.created_at)
from runs r join audits a on a.id = r.audit_id where a.team_id is not null and r.attempts > 1
on conflict do nothing;

-- The demo space gets a comfortable quota: the soft limit must never show on stage.
update teams set plan = 'demo' where name = 'Espace de gdo' and plan = 'free';
