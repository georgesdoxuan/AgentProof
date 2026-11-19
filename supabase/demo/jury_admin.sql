-- Jury demo: Georges admin of the jury team, to enter the demo's zero-balance card and test account himself.
-- (A judge can't change the card: lib/jury.ts.) Adds one membership, touches nothing else.
insert into memberships (team_id, user_id, role)
select t.id, u.id, 'admin' from teams t, users u
where t.plan = 'jury' and u.email = 'gdo@eugeniaschool.com'
on conflict (team_id, user_id) do nothing;
