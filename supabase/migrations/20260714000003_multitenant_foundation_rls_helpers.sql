-- Helper functions for multi-tenant RLS. They mirror the existing
-- private.is_studio_* helpers but read organization_memberships.
-- Requires: schema `private` (created by the initial platform migration).
create schema if not exists private;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.platform_role = 'super_admin'
  );
$$;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where p.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.status = 'active'
  );
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where p.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and m.role::text = any(roles)
  );
$$;

create or replace function private.is_org_owner_or_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(target_organization_id, array['owner', 'admin']);
$$;

create or replace function private.current_membership_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_memberships m
  join public.profiles p on p.id = m.user_id
  where p.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.joined_at asc
  limit 1;
$$;

grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;
grant execute on function private.is_org_owner_or_admin(uuid) to authenticated;
grant execute on function private.current_membership_org_id() to authenticated;
