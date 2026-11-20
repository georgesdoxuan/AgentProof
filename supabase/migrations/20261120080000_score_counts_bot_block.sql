-- Anti-bot counts against the site (decision of 20 Nov 2026): captcha_or_bot_block leaves the out-of-score list.
-- Scores are computed when read, so every past audit and the leaderboard follow without touching any row.
create or replace view public.site_scores as
with ranked as (
  select a.id, a.site_id, a.compare_to, a.device, a.status, a.email, a.recommendations, a.created_at, a.finished_at,
         a.kind, a.ip_hash, a.team_id, a.created_by, a.payment_test,
         row_number() over (partition by a.site_id, a.device order by a.finished_at desc) as rn
  from audits a
  join sites s0 on s0.id = a.site_id and s0.benchmark
  where a.status = 'done' and a.kind = 'checkout' and a.team_id is null
)
select s.id as site_id, s.domain, s.name, s.url, ra.device,
  (array_agg(ra.id order by ra.finished_at desc))[1] as audit_id,
  max(ra.finished_at) as finished_at,
  count(r.id) filter (where r.status = 'done') as runs_done,
  count(r.id) filter (where r.success and r.status = 'done') as runs_success,
  round(100.0 * count(r.id) filter (where r.success and r.status = 'done')::numeric
    / nullif(count(r.id) filter (where r.status = 'done' and r.success is not null
        and coalesce(r.blocker_type, '') <> all (array['out_of_stock', 'mission_not_applicable', 'agent_out_of_steps', 'agent_tool_error'])), 0)::numeric) as score,
  count(r.id) filter (where r.status = 'done' and r.success is not null
    and coalesce(r.blocker_type, '') <> all (array['out_of_stock', 'mission_not_applicable', 'agent_out_of_steps', 'agent_tool_error'])) as runs_scored,
  count(r.id) filter (where r.blocker_type = 'captcha_or_bot_block') as runs_bot_blocked,
  count(distinct ra.id) as passes
from ranked ra
join sites s on s.id = ra.site_id
left join runs r on r.audit_id = ra.id
where ra.rn <= 2
group by s.id, ra.device;
