-- Jury demo space (lib/jury.ts): one team on the "jury" plan, filled with COPIES of four finished reports.
-- Data only, no schema change. Run once, by hand, after Georges's go-ahead. Running it twice stops at the first check.
--
-- What it never does: update or delete a row of an existing team. The originals stay in "Espace de gdo" untouched;
-- the copies get new ids, no e-mail, no IP hash, no payment test, no test account, no creator (so they do not count in
-- the judges' audit quota), and their competitor link points to the copy, never to an original (lib/purge.ts follows it).
-- runs.session_id is unique: copies keep the H session as "jury:<id>", which lib/engine.ts shareRun strips for replays.
-- The credit_usage rows the runs trigger writes for the copies are removed: the seed costs the jury team nothing.
--
-- Undo (jury team only): delete from audits where team_id = (select id from teams where plan = 'jury');
--                        delete from users where email like '%@jury.agentproof.test';  -- memberships cascade
--                        delete from teams where plan = 'jury';

do $$
declare
  jury uuid;
  owner uuid;
  src uuid[] := array[
    '343edd39-2e9e-49bd-a912-0ebe7be09c24', -- waterdrop.fr, 5/5 missions réussies
    'fa4d407c-b7d6-4e2b-a0e6-5ad8d6342c5b', -- waterdrop.fr, passage précédent (missions non applicables)
    'be10e783-57fd-4b6b-add6-ccde9118e8fe', -- promod.fr, agent précis, 4/5
    '88b28145-cbbb-4953-8dfc-cca0ad97669e'  -- nike.com, 0/5 (anti-bot, bouton qui ne répond pas)
  ]::uuid[];
begin
  if exists (select 1 from teams where plan = 'jury') then
    raise exception 'Espace démo jury déjà créé';
  end if;

  insert into users (email, terms_accepted_at) values ('jury@jury.agentproof.test', now())
    on conflict (email) do nothing;
  select id into owner from users where email = 'jury@jury.agentproof.test';
  insert into teams (name, owner_id, plan) values ('Démo jury', owner, 'jury') returning id into jury;
  insert into memberships (team_id, user_id, role) values (jury, owner, 'owner');

  create temp table jury_map (old uuid primary key, new uuid not null) on commit drop;
  insert into jury_map select a.id, gen_random_uuid() from audits a where a.id = any (src) and a.status = 'done' and a.kind = 'checkout';

  insert into audits (id, site_id, compare_to, device, status, email, recommendations, created_at, finished_at, kind,
                      ip_hash, team_id, created_by, payment_test, model, static_check, score_alert, title, favorite, deleted_at, proof_of)
  select m.new, a.site_id, (select m2.new from jury_map m2 where m2.old = a.compare_to), a.device, a.status, null, a.recommendations,
         a.created_at, a.finished_at, a.kind, null, jury, null, null, a.model, a.static_check, null, null, false, null, null
  from audits a join jury_map m on m.old = a.id;

  insert into runs (audit_id, mission_id, status, session_id, h_status, reached_checkout, success, blocker_type, blocker_detail,
                    agent_answer, judge, final_url, screenshot_url, share_url, agent_view_url, steps, input_tokens, cached_tokens,
                    output_tokens, duration_s, error, created_at, launched_at, finished_at, checked_at, cost_usd, payment_verdict,
                    bank_seen, with_login, attempts, first_attempt, priority, login_id)
  select m.new, r.mission_id, r.status, 'jury:' || r.session_id, r.h_status, r.reached_checkout, r.success, r.blocker_type, r.blocker_detail,
         r.agent_answer, r.judge, r.final_url, r.screenshot_url, r.share_url, r.agent_view_url, r.steps, r.input_tokens, r.cached_tokens,
         r.output_tokens, r.duration_s, r.error, r.created_at, r.launched_at, r.finished_at, r.checked_at, r.cost_usd, null,
         r.bank_seen, false, r.attempts, r.first_attempt, r.priority, null
  from runs r join jury_map m on m.old = r.audit_id
  where r.payment_verdict is null and r.login_id is null;

  delete from credit_usage where team_id = jury;
end $$;

-- Check: the jury team, its 4 copied reports and their 20 runs; the originals' count unchanged.
select t.name, t.plan,
       (select count(*) from audits a where a.team_id = t.id) as reports,
       (select count(*) from runs r join audits a on a.id = r.audit_id where a.team_id = t.id) as runs,
       (select count(*) from credit_usage c where c.team_id = t.id) as credits
from teams t where t.plan = 'jury';
