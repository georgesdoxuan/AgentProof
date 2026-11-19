-- Subscription value: a proof audit replays only the missions a fixed blocker stopped (proof_of = that blocker type),
-- and the monthly report is sent once per team per month (monthly_report_at = when the last one went out).
alter table audits add column if not exists proof_of text;
alter table teams add column if not exists monthly_report_at timestamptz;
