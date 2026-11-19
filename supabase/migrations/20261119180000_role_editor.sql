-- Editor role: everything but members (invite, remove, change roles). Additive: only widens the allowed values.
alter table public.memberships drop constraint memberships_role_check,
  add constraint memberships_role_check check (role in ('owner', 'admin', 'editor', 'viewer'));
alter table public.invitations drop constraint invitations_role_check,
  add constraint invitations_role_check check (role in ('admin', 'editor', 'viewer'));
