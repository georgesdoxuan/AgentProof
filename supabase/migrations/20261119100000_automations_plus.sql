-- Automations: per-page frequency, one automatic audit a day at most, team alerts (webhook, score threshold),
-- a secret URL that deploy tools call, and manual audits launched before automatic ones.
alter table automations
  add column if not exists interval_hours int not null default 24,
  add column if not exists last_auto_audit_at timestamptz;

alter table teams
  add column if not exists webhook_url text,
  add column if not exists hook_token text unique default encode(extensions.gen_random_bytes(18), 'hex'),
  add column if not exists score_drop int not null default 10;

alter table runs add column if not exists priority smallint not null default 0;
create index if not exists runs_todo_priority on runs (priority, created_at) where status = 'todo';
