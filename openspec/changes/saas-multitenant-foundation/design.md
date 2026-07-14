# SDD Design — SaaS multi-tenant foundation

## Change

`saas-multitenant-foundation`

## References

- Proposal: `openspec/changes/saas-multitenant-foundation/proposal.md`
- Spec: `openspec/changes/saas-multitenant-foundation/spec.md`
- Scout report: `openspec/changes/saas-multitenant-foundation/scout-report.md`
- Baseline migration: `supabase/migrations/20260708000227_initial_platform_schema.sql`
- Types: `src/types/supabase.ts`

## Design decisions

### 1. Reuse `studios.id` as `organizations.id`

The simplest and least risky migration is to create `organizations` rows using the
same UUIDs as existing `studios` rows. This avoids a mapping table and makes the
back-fill of `organization_memberships` a direct copy of `profiles.studio_id`.

### 2. New enums instead of reusing old role enum

- `public.platform_role` (`user`, `super_admin`) for `profiles.platform_role`.
- `public.organization_role` (`owner`, `admin`, `artist`) for
  `organization_memberships.role`.
- `public.membership_status` (`active`, `inactive`) for memberships.
- `public.organization_status` (`active`, `paused`, `suspended`) for
  organizations.
- `public.invitation_status` (`pending`, `accepted`, `revoked`) for
  invitations.

We do **not** add `admin` to the existing `public.profile_role` enum to keep old
UI/API checks unchanged. Old code continues to see `owner` or `artist`.

### 3. Backward compatibility columns

- `profiles.studio_id` and `profiles.role` remain populated and are not removed.
- New code reads from `organization_memberships`, but existing code can keep
  reading `profiles` until a later migration.
- `profiles.platform_role` is added with default `user`.

### 4. RLS helpers in `private` schema

New helpers:

- `private.current_profile_id()` (unchanged semantics, returns profile id for
  `auth.uid()`).
- `private.is_platform_admin()` — true if `profiles.platform_role = 'super_admin'`.
- `private.is_org_member(target_organization_id uuid)` — true if the current
  user has an active membership in that org.
- `private.has_org_role(target_organization_id uuid, roles text[])` — true if the
  current user has an active membership with one of the given roles.
- `private.is_org_owner_or_admin(target_organization_id uuid)` — convenience
  wrapper for `owner` and `admin`.

All helpers remain `SECURITY DEFINER` to match existing patterns, but they
consult `organization_memberships` instead of `profiles.studio_id/role`. They also
return true for `super_admin` where appropriate (select-only for platform view).

### 5. RLS policies — permissive during transition

New tables have RLS enabled with `USING (true)` for `authenticated` on select as a
temporary measure, plus `TO anon` policies where the function is public (e.g.
`get_active_artists`). This keeps the existing UI working while the old
`profiles.studio_id` policies are still in place. The next phase will tighten
these policies as the UI switches to `organization_id`.

### 6. Indexes

Add indexes on all foreign-key columns and lookup columns used in RLS helpers.

## Migration plan

### File A — `20260714000001_multitenant_foundation_enums.sql`

```sql
-- Enums for the multi-tenant foundation layer.
-- These are additive; existing enums are left untouched.

create type public.platform_role as enum ('user', 'super_admin');
create type public.organization_role as enum ('owner', 'admin', 'artist');
create type public.membership_status as enum ('active', 'inactive');
create type public.organization_status as enum ('active', 'paused', 'suspended');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
```

### File B — `20260714000002_multitenant_foundation_tables.sql`

```sql
-- Organizations, memberships, invitations, locations, branding and settings.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status public.organization_status not null default 'active',
  legal_name text,
  legal_identifier text,
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null,
  invited_by uuid not null references public.profiles(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  status public.invitation_status not null default 'pending',
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_role_check check (role in ('owner', 'admin', 'artist'))
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  email text,
  status public.organization_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  primary_color text,
  secondary_color text,
  logo_path text,
  font_family text,
  updated_at timestamptz not null default now()
);

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  language text not null default 'es',
  timezone text not null default 'Europe/Madrid',
  consent_redirect_seconds int not null default 5,
  notification_email text,
  updated_at timestamptz not null default now()
);

-- Triggers for updated_at.
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at
  before update on public.organization_memberships
  for each row execute function public.set_updated_at();

create trigger organization_invitations_set_updated_at
  before update on public.organization_invitations
  for each row execute function public.set_updated_at();

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create trigger organization_branding_set_updated_at
  before update on public.organization_branding
  for each row execute function public.set_updated_at();

create trigger organization_settings_set_updated_at
  before update on public.organization_settings
  for each row execute function public.set_updated_at();

-- Indexes.
create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

create index organization_memberships_org_id_idx
  on public.organization_memberships (organization_id);

create index organization_memberships_org_role_status_idx
  on public.organization_memberships (organization_id, role, status);

create index organization_invitations_org_email_idx
  on public.organization_invitations (organization_id, email);

create index organization_invitations_token_hash_idx
  on public.organization_invitations (token_hash);

create index locations_organization_id_idx
  on public.locations (organization_id);

create index organizations_slug_idx
  on public.organizations (slug);

-- RLS.
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.locations enable row level security;
alter table public.organization_branding enable row level security;
alter table public.organization_settings enable row level security;

-- Data API grants (RLS still controls row visibility).
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_memberships to authenticated;
grant select, insert, update, delete on public.organization_invitations to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.organization_branding to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
```

### File C — `20260714000003_multitenant_foundation_rls_helpers.sql`

```sql
-- Helper functions for multi-tenant RLS. They mirror the existing
-- private.is_studio_* helpers but read organization_memberships.

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
      and m.role = any(roles)
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
```

### File D — `20260714000004_multitenant_foundation_policies.sql`

```sql
-- Permissive RLS policies during transition. We enable RLS but allow
-- authenticated users to read all rows, and owners/admins to write rows
-- scoped to their organization. This keeps the existing app functional while
-- new code adopts the stricter helpers in the next phase.

create policy "organizations read authenticated"
  on public.organizations for select
  to authenticated
  using (true);

create policy "organizations write owner or admin"
  on public.organizations for all
  to authenticated
  using ((select private.is_org_owner_or_admin(id)))
  with check ((select private.is_org_owner_or_admin(id)));

create policy "organization_memberships read authenticated"
  on public.organization_memberships for select
  to authenticated
  using (true);

create policy "organization_memberships write owner or admin"
  on public.organization_memberships for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "organization_invitations read authenticated"
  on public.organization_invitations for select
  to authenticated
  using (true);

create policy "organization_invitations write owner or admin"
  on public.organization_invitations for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "locations read authenticated"
  on public.locations for select
  to authenticated
  using (true);

create policy "locations write owner or admin"
  on public.locations for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "organization_branding read authenticated"
  on public.organization_branding for select
  to authenticated
  using (true);

create policy "organization_branding write owner or admin"
  on public.organization_branding for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "organization_settings read authenticated"
  on public.organization_settings for select
  to authenticated
  using (true);

create policy "organization_settings write owner or admin"
  on public.organization_settings for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));
```

### File E — `20260714000005_multitenant_foundation_backfill.sql`

```sql
-- Add platform_role to profiles and back-fill organizations and memberships
-- from existing studios and profiles.

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
  p.role::public.organization_role,
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
```

## TypeScript type changes

Update `src/types/supabase.ts` to add:

- New enums: `platform_role`, `organization_role`, `membership_status`,
  `organization_status`, `invitation_status`.
- `profiles.platform_role` field in Row/Insert/Update.
- New tables: `organizations`, `organization_memberships`,
  `organization_invitations`, `locations`, `organization_branding`,
  `organization_settings`.
- Relationships for new foreign keys (optional but recommended).

## Backward compatibility

- Existing `profiles.studio_id` and `profiles.role` columns are not touched.
- Existing RLS helpers (`private.is_studio_owner`, `private.is_studio_member`,
  etc.) are not modified; they continue to work against the old columns.
- Existing policies on `studios`, `profiles`, `artists`, `consents`, etc. are not
  changed.
- New tables are additive only.
- New policies are permissive on read so the existing UI can still query them.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Profiles without `studio_id` get demo membership only | Back-fill assigns them to `demo-studio`; later manual review can reassign. |
| `studios` and `organizations` diverge | Document that `organizations` is the new tenant boundary; reconcile in a later phase. |
| RLS policies are permissive during transition | This is intentional; Phase 2 will tighten read policies as UI adopts `organization_id`. |
| TypeScript types out of sync | Add all new tables/columns to `src/types/supabase.ts` in the same change. |
| Service-role paths bypass RLS | They must still pass the correct `studio_id`/`organization_id` from the request. |

## Verification

- [ ] Run `supabase migration list --local` and ensure all new migrations appear.
- [ ] Run `supabase db reset --local` (or apply migrations to a fresh local db).
- [ ] Verify `organizations` has one row per existing `studio` plus the demo org.
- [ ] Verify every `profile` has at least one `organization_membership`.
- [ ] Verify RLS is enabled on all new tables.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Smoke-test the existing admin panel, artist panel, and consent wizard.

## Next phase

`tasks`
