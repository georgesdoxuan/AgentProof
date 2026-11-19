-- Monthly credit cap per site, set by the team (null = no cap). Additive only: one nullable column, no data changed.
-- Automatic audits (page changed, deploy hook, monthly follow-up) are not launched on a site that would go over it;
-- manual launches still go through and count toward it.
alter table teams add column if not exists site_credit_cap integer;
alter table teams drop constraint if exists teams_site_credit_cap_positive;
alter table teams add constraint teams_site_credit_cap_positive check (site_credit_cap is null or site_credit_cap between 1 and 10000);
