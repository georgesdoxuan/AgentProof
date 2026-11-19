-- Jury demo (lib/jury.ts): make the jury team's Reports match « Espace de gdo » right now. Run again to resync.
-- Data only. Never writes a row of « Espace de gdo »: it reads it, then replaces the jury team's COPIES
-- (audits with no creator) and its copied corrections. Audits launched by judges (created_by set) are kept.
--
-- Copied: every report of the team not in the trash (checkout audits), with their competitor / model comparison and
-- their real payment test. Left out or scrubbed, so nothing of Georges's card or accounts reaches the judges:
--   e-mail, IP hash, creator, test account link (login_id); payment runs lose their H session (no replay: it showed the
--   card form), the agent's step summary, the site message and the judge's reason (they could quote the cardholder or
--   the delivery address); the verdict, stage reached and payment provider stay.
-- runs.session_id is unique: copies keep the H session as "jury:<id>" (lib/engine.ts shareRun strips it for replays).

do $$
declare
  src_team constant uuid := 'a92dff19-be0a-4fd4-b107-51a2a10b9122'; -- Espace de gdo (read only)
  jury uuid;
  masked constant text := 'Détail masqué dans la démo : il citait la carte de l''équipe.';
begin
  select id into jury from teams where plan = 'jury' order by created_at limit 1;
  if jury is null then raise exception 'Équipe démo jury absente : lancer jury_seed.sql d''abord'; end if;

  -- 1. Remove the previous copies (runs cascade) and copied corrections.
  update audits set compare_to = null, payment_test = null where team_id = jury and created_by is null;
  delete from audits where team_id = jury and created_by is null;
  delete from fixes where team_id = jury and fixed_by is null;

  -- 2. What to copy: the reports, then what they link to (competitor or model pair, payment test).
  create temp table jury_map (old uuid primary key, new uuid not null) on commit drop;
  insert into jury_map
    select id, gen_random_uuid() from audits where team_id = src_team and kind = 'checkout' and deleted_at is null;
  insert into jury_map
    select l.id, gen_random_uuid() from (
      select a.compare_to as id from audits a join jury_map m on m.old = a.id where a.compare_to is not null
      union select a.id from audits a where a.compare_to in (select old from jury_map) and a.deleted_at is null
      union select a.payment_test from audits a join jury_map m on m.old = a.id where a.payment_test is not null
    ) l
    where l.id is not null and not exists (select 1 from jury_map x where x.old = l.id);

  -- 3. Audits: links remapped to the copies, never to an original (lib/purge.ts follows them).
  insert into audits (id, site_id, compare_to, device, status, email, recommendations, created_at, finished_at, kind,
                      ip_hash, team_id, created_by, payment_test, model, static_check, score_alert, title, favorite, deleted_at, proof_of)
  select m.new, a.site_id, null, a.device, a.status, null, a.recommendations, a.created_at, a.finished_at, a.kind,
         null, jury, null, null, a.model, a.static_check, null, a.title, a.favorite, null, a.proof_of
  from audits a join jury_map m on m.old = a.id;
  update audits c set compare_to = mc.new, payment_test = mp.new
  from audits a join jury_map m on m.old = a.id
    left join jury_map mc on mc.old = a.compare_to
    left join jury_map mp on mp.old = a.payment_test
  where c.id = m.new and (mc.new is not null or mp.new is not null);

  -- 4. Runs: mission runs as they are; payment runs scrubbed.
  insert into runs (audit_id, mission_id, status, session_id, h_status, reached_checkout, success, blocker_type, blocker_detail,
                    agent_answer, judge, final_url, screenshot_url, share_url, agent_view_url, steps, input_tokens, cached_tokens,
                    output_tokens, duration_s, error, created_at, launched_at, finished_at, checked_at, cost_usd, payment_verdict,
                    bank_seen, with_login, attempts, first_attempt, priority, login_id)
  select m.new, r.mission_id, r.status,
         case when a.kind = 'payment' then null else 'jury:' || r.session_id end,
         r.h_status, r.reached_checkout, r.success, r.blocker_type,
         case when a.kind = 'payment' then null else r.blocker_detail end,
         case when a.kind = 'payment' and r.agent_answer is not null
              then (r.agent_answer - 'steps_summary' - 'site_message') || jsonb_build_object('steps_summary', masked, 'site_message', '')
              else r.agent_answer end,
         case when a.kind = 'payment' and r.judge is not null then r.judge || jsonb_build_object('reason', masked) else r.judge end,
         r.final_url,
         case when a.kind = 'payment' then null else r.screenshot_url end,
         case when a.kind = 'payment' then null else r.share_url end,
         case when a.kind = 'payment' then null else r.agent_view_url end,
         r.steps, r.input_tokens, r.cached_tokens, r.output_tokens, r.duration_s, r.error,
         r.created_at, r.launched_at, r.finished_at, r.checked_at, r.cost_usd, r.payment_verdict,
         r.bank_seen, r.with_login, r.attempts,
         case when a.kind = 'payment' then null else r.first_attempt end,
         r.priority, null
  from runs r join audits a on a.id = r.audit_id join jury_map m on m.old = a.id;

  -- 5. Corrections already ticked, so the Corrections page matches too (fixed_by left empty: a copy).
  insert into fixes (team_id, site_id, device, blocker_type, fixed_at, fixed_by)
  select jury, f.site_id, f.device, f.blocker_type, f.fixed_at, null from fixes f where f.team_id = src_team
  on conflict do nothing;

  -- 6. The copies cost the jury team nothing.
  delete from credit_usage where team_id = jury and audit_id in (select new from jury_map);
end $$;

-- Check: copies in the jury team vs reports in Espace de gdo (outside the trash).
select (select count(*) from audits where team_id = (select id from teams where plan = 'jury' order by created_at limit 1) and created_by is null and kind = 'checkout') as jury_reports,
       (select count(*) from audits where team_id = 'a92dff19-be0a-4fd4-b107-51a2a10b9122' and kind = 'checkout' and deleted_at is null) as gdo_reports,
       (select count(*) from audits where team_id = 'a92dff19-be0a-4fd4-b107-51a2a10b9122') as gdo_all;
