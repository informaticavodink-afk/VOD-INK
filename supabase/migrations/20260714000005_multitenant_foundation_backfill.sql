-- Add platform_role to profiles and back-fill organizations and memberships
-- from existing studios and profiles.
-- Requires: public.studios, public.profiles and public.platform_role enum
-- already present (created by the initial platform migration).

-- 1. Add platform_role to profiles.
alter table public.profiles
  add column if not exists platform_role public.platform_role not null default 'user';

-- 2. Create an organization for every existing studio, reusing the same id.
insert into public.organizations (
  id,
  slug,
  name,
  status,
  legal_name,
  legal_identifier,
  billing_email
)
select
  id,
  slug,
  coalesce(trade_name, legal_name),
  'active',
  legal_name,
  tax_id,
  null
from public.studios
on conflict (id) do nothing;

-- 3. Insert a default/demo organization if none exists.
insert into public.organizations (id, slug, name, status)
values (
  '00000000-0000-0000-0000-000000000000',
  'demo-studio',
  'Estudio Demo',
  'active'
)
on conflict (id) do nothing;

-- 4. Back-fill memberships from existing profiles, ignoring profiles that
-- already have a membership.
insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
)
select
  p.studio_id,
  p.id,
  case p.role
    when 'owner' then 'owner'::public.organization_role
    when 'artist' then 'artist'::public.organization_role
  end,
  'active'
from public.profiles p
where p.studio_id is not null
  and p.role is not null
on conflict (organization_id, user_id) do nothing;

-- 5. Assign profiles without a studio_id to the demo organization.
insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
)
select
  '00000000-0000-0000-0000-000000000000',
  p.id,
  'artist',
  'active'
from public.profiles p
where p.studio_id is null
on conflict (organization_id, user_id) do nothing;

-- 6. Create default settings and branding for every organization that does not have them.
insert into public.organization_settings (organization_id)
select o.id from public.organizations o
left join public.organization_settings s on s.organization_id = o.id
where s.id is null
on conflict (organization_id) do nothing;

insert into public.organization_branding (organization_id)
select o.id from public.organizations o
left join public.organization_branding b on b.organization_id = o.id
where b.id is null
on conflict (organization_id) do nothing;
