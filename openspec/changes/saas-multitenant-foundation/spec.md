# SDD Specification — SaaS multi-tenant foundation

## Change

`saas-multitenant-foundation`

## Reference

Proposal: `openspec/changes/saas-multitenant-foundation/proposal.md`

## Requirements

### Functional requirements

#### FR-1 Organizations

- The system must store organizations as the top-level tenant boundary.
- An organization must have a unique `slug`, a display name, and a `status`.
- A default `demo-studio` organization must exist for fallback and development.

#### FR-2 Memberships

- A user can belong to multiple organizations.
- Each membership must record `organization_id`, `user_id` and `role`.
- Roles are `owner`, `admin`, `artist`.
- A user must have at most one membership per organization.
- Memberships must support `active` / `inactive` states without deleting history.

#### FR-3 Invitations

- Owners and admins can invite users to an organization by email.
- Invitations must expire after a configurable period (default 7 days).
- Invited users can accept an invitation and become members.
- Duplicate pending invitations for the same email and organization must be
  prevented.

#### FR-4 Locations

- An organization can have one or more locations (sede / dirección).
- Each location stores name, address, phone, email and status.
- Consents signed in the future must reference the location where the service
  is performed.

#### FR-5 Branding and settings

- Each organization can store branding (logo, colors, fonts) and operational
  settings (timezone, language, notification preferences).
- Settings must be scoped by `organization_id`.
- Branding assets must reference private Storage paths.

#### FR-6 Backward compatibility

- Existing `profiles.studio_id` and `profiles.role` must remain functional.
- A migration must create an organization and membership for each existing
  studio/profile pair.
- New code should prefer `organization_memberships` but can still read the old
  columns during transition.

### Non-functional requirements

#### NFR-1 Security

- All new tables must enable RLS.
- RLS policies must be written so that `super_admin` can read all rows but does
  not bypass RLS by default.
- Org members can only see rows of their own `organization_id`.
- RLS helper functions must be centralized in `supabase/migrations`.

#### NFR-2 Performance

- Add indexes on `organization_memberships(user_id)`,
  `organization_memberships(organization_id)`, and `organizations(slug)`.
- Keep migration idempotent and additive.

#### NFR-3 Reliability

- Migration must not delete data.
- If a profile has no `studio_id`, it must still get a valid membership in the
  default/demo organization or be flagged for manual review.

## Data model

### `organizations`

```text
id                 uuid pk default gen_random_uuid()
slug               text unique not null
name               text not null
status             text not null default 'active' -- active | paused | suspended
platform_role_required boolean default false
owner_id           uuid references profiles(id) nullable
legal_name         text nullable
legal_identifier   text nullable
billing_email      text nullable
created_at         timestamptz default now()
updated_at         timestamptz default now()
```

### `organization_memberships`

```text
id               uuid pk default gen_random_uuid()
organization_id  uuid not null references organizations(id) on delete cascade
user_id          uuid not null references profiles(id) on delete cascade
role             text not null check (role in ('owner','admin','artist'))
status           text not null default 'active' -- active | inactive
joined_at        timestamptz default now()
updated_at       timestamptz default now()
unique(organization_id, user_id)
```

### `organization_invitations`

```text
id               uuid pk default gen_random_uuid()
organization_id  uuid not null references organizations(id) on delete cascade
email            text not null
role             text not null check (role in ('owner','admin','artist'))
invited_by       uuid not null references profiles(id)
token_hash       text unique not null
expires_at       timestamptz not null
status           text not null default 'pending' -- pending | accepted | revoked
accepted_by      uuid references profiles(id) nullable
accepted_at      timestamptz nullable
created_at       timestamptz default now()
updated_at       timestamptz default now()
unique(organization_id, email, status) partial where status = 'pending'
```

### `locations`

```text
id               uuid pk default gen_random_uuid()
organization_id  uuid not null references organizations(id) on delete cascade
name             text not null
address          text nullable
phone            text nullable
email            text nullable
status           text not null default 'active'
created_at       timestamptz default now()
updated_at       timestamptz default now()
```

### `organization_branding`

```text
id               uuid pk default gen_random_uuid()
organization_id  uuid not null unique references organizations(id) on delete cascade
primary_color    text nullable
secondary_color  text nullable
logo_path        text nullable
font_family      text nullable
updated_at       timestamptz default now()
```

### `organization_settings`

```text
id               uuid pk default gen_random_uuid()
organization_id  uuid not null unique references organizations(id) on delete cascade
language         text default 'es'
timezone         text default 'Europe/Madrid'
consent_redirect_seconds int default 5
notification_email text nullable
updated_at       timestamptz default now()
```

## Scenarios

### SC-1 Existing owner keeps access

Given a profile with `studio_id = s1` and `role = owner`
When the migration runs
Then an organization `s1` is created (or mapped)
And a membership `(s1, profile, owner)` is created
And the owner can still log in and see the admin panel.

### SC-2 Artist joins a second studio

Given a user who is artist in organization A
When an owner of organization B invites them as artist
And the user accepts
Then the user has memberships in both organizations.

### SC-3 Invitation expires

Given a pending invitation with `expires_at` in the past
When the user tries to accept it
Then the system rejects the acceptance.

### SC-4 Super admin platform view

Given a profile with `platform_role = super_admin`
When they access platform administration
Then they can list all organizations and memberships
Without needing a membership in each organization.

## Acceptance criteria

- [ ] Migrations create all tables with RLS enabled and indexes.
- [ ] Migration back-fills organizations and memberships for existing data.
- [ ] `supabase gen types typescript` includes the new tables.
- [ ] Helper functions exist for RLS.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] No existing route or API breaks.

## Next phase

`design`
