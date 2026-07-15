-- VOD INK is a single-studio application.
-- Remove the multi-tenant/SaaS foundation and keep studio-scoped roles only.

-- These tables represent organizations, invitations, locations and global
-- platform configuration. They are intentionally not part of VOD INK. Drop
-- them before their helpers because their policies depend on those helpers.
drop table if exists public.organization_invitations;
drop table if exists public.organization_memberships;
drop table if exists public.organization_branding;
drop table if exists public.organization_settings;
drop table if exists public.locations;
drop table if exists public.organizations;

-- Remove multi-tenant access helpers after their dependent policies are gone.
drop function if exists private.current_membership_org_id();
drop function if exists private.is_org_owner_or_admin(uuid);
drop function if exists private.has_org_role(uuid, text[]);
drop function if exists private.is_org_member(uuid);
drop function if exists private.is_platform_admin();

-- The previous global platform role was only used for the SaaS control plane.
alter table public.profiles drop column if exists platform_role;
drop type if exists public.platform_role;

drop type if exists public.invitation_status;
drop type if exists public.membership_status;
drop type if exists public.organization_role;
drop type if exists public.organization_status;

-- The old constraint predates the admin role and only allowed owner/artist.
alter table public.profiles drop constraint if exists profiles_one_owner_or_artist;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'admin', 'artist'));

-- Existing RLS policies already call this helper. Expanding it to include the
-- admin role grants owners and admins the same studio-management permissions,
-- while artists remain restricted to their own records.
create or replace function private.is_studio_owner(target_studio_id uuid)
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
      and p.studio_id = target_studio_id
      and p.role in ('owner', 'admin')
  );
$$;

grant execute on function private.is_studio_owner(uuid) to authenticated;
