# SDD Proposal — SaaS multi-tenant foundation

## Change

`saas-multitenant-foundation`

## Intent

Evolve the current single-studio application (Vod-INK) into the first layer of a
multi-tenant SaaS product named **Tus Consentimientos**, where a single user can
belong to multiple organizations with different roles.

This change is the data and membership foundation. It does not deliver all SaaS
features; it makes the later phases possible without rewriting the auth model
again.

## Current-state gap

- `profiles` has `studio_id` and `role` (owner | artist).
- A user can only belong to one studio and have one role.
- This prevents a person from being owner of one studio, admin of another, and
  artist of a third.
- Security relies partly on UI hiding; the real RLS boundary is not yet
  multi-tenant aware.

## Target outcome

After this change:

- A user can be invited to multiple organizations.
- Each membership records `organization_id`, `user_id` and a granular role
  (`owner`, `admin`, `artist`).
- `profiles` keeps a `platform_role` (`user`, `super_admin`) for platform-level
  access.
- New entities exist for organizations, invitations, locations, branding and
  settings.
- Existing `profiles.studio_id` and `profiles.role` remain temporarily
  populated so current UI and RLS keep working during migration.
- All new org-scoped tables contain `organization_id` and are designed for
  strict RLS in the next phase.

## Scope

### In scope (Phase 1)

- Database tables:
  - `organizations`
  - `organization_memberships`
  - `organization_invitations`
  - `locations`
  - `organization_branding`
  - `organization_settings`
- Migration that creates tables and back-fills a default membership for every
  existing `profile` using its current `studio_id` and `role`.
- TypeScript types for the new tables.
- RLS policy placeholders (enabled but permissive during transition) so the
  app does not break.

### Explicitly out of scope (later phases)

- New panel routes (`/super-admin`, `/app/:slug/*`, `/professional/:slug`).
- Versioned consent templates and immutable snapshots.
- Server-side PDF generation and document hashing.
- Public client tokens (`/c/:publicToken`).
- Plans, subscriptions, usage limits, custom domains.

## Affected areas

- Supabase schema migrations (`supabase/migrations/`).
- Database types (`src/integrations/supabase/types.ts` or generated).
- Supabase client configuration and helpers.
- Existing `profiles` table and any code that reads `studio_id` / `role`.
- RLS policies.

## Business rules

- One `organizations` row replaces one `studios` row conceptually; existing
  `studios` rows will be copied/migrated to `organizations` in the next phase.
- Membership roles are hierarchical: `owner` > `admin` > `artist`.
- Only `owner` can delete the organization or manage billing (later).
- `admin` can manage locations, professionals, settings and consent data.
- `artist` can view and sign consents assigned to them.
- A user can hold multiple memberships across organizations.
- Invitations expire and can be revoked.
- Platform `super_admin` is separate from org membership; super admin access does
  not imply membership in any organization.

## Risks

- Migration might leave existing users without a membership if
  `profiles.studio_id` is null or inconsistent.
- Old code that reads `profiles.studio_id` directly will continue to work only
  while the columns are kept in sync.
- Realtime subscriptions and RLS might need adjustment once the new tables are
  introduced.
- The existing `artists` table overlaps with the new `professionals` concept; we
  keep both during transition and reconcile in a later phase.

## Rollback

- Migration is additive; no existing tables are dropped.
- `profiles.studio_id` and `profiles.role` are not removed yet.
- If needed, the application can ignore the new membership tables and keep
  using the old columns while the frontend is not updated.

## Success criteria

- [ ] Migrations create all new tables with `organization_id` and timestamps.
- [ ] Every existing profile gets a corresponding
      `organization_memberships` row.
- [ ] TypeScript types cover the new tables.
- [ ] `npm run lint` and `npm run build` pass without new errors.
- [ ] No existing functionality breaks (admin panel, artist panel, consent flow).
- [ ] New RLS policies are present but do not block existing authenticated
      operations during transition.

## Next phase

`spec`
