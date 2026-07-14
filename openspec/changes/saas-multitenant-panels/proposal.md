# SDD Proposal — SaaS multi-tenant panels and routing

## Change
`saas-multitenant-panels`

## Reference
- Phase 1: `openspec/changes/saas-multitenant-foundation/`
- Architecture review: `openspec/changes/saas-multitenant-foundation/proposal.md`

## Current state
- Routes exist only for single studio: `/admin/*` and `/artist/*`.
- `AdminPage` and `ArtistPage` decide access by `profile.role` and pass
  `profile.studio_id` to managers.
- `useProfile` returns a single `profiles` row.

## Target outcome
Introduce the new routing structure and authentication guards that support
multi-tenant access, without yet removing the old `/admin` and `/artist` routes
(to keep backward compatibility during transition).

## Scope

### In scope
- New routes in `App.tsx`:
  - `/app/:organizationSlug/dashboard`
  - `/app/:organizationSlug/professionals`
  - `/app/:organizationSlug/consents`
  - `/app/:organizationSlug/settings`
  - `/professional/:organizationSlug`
  - `/super-admin` (basic shell, list organizations)
- `OrganizationProvider` that resolves `organizationSlug` from URL and loads the
  active `organizations` row plus the current user's membership.
- New hook `useMembership` that returns the active membership for the current
  organization.
- Update `useProfile` to keep working (single profile) but also support a new
  `useMemberships` hook if needed.
- Refactor `AdminPage` and `ArtistPage` into wrappers that read the active
  organization from `OrganizationProvider`.
- Reuse `ArtistsManager`, `ConsentsManager` and `ArtistConsents` but make them
  accept `organizationId` instead of `studioId` where possible.
- Auth guards that redirect to `/` when the user has no active membership in the
  requested organization.

### Out of scope (later phases)
- `/c/:publicToken` client public token flow.
- Immutable consent snapshots and templates.
- Server-side PDF generation.
- Billing, plans, subscriptions.
- Removing old `/admin` and `/artist` routes.

## Risks
- The existing components rely on `profile.studio_id` and `profile.role`.
- RLS policies are still permissive on read, so route guards are the main
  protection until Phase 3 tightens RLS.
- Users may have multiple memberships; we need a clear "active organization"
  concept.

## Success criteria
- [ ] A user can log in and access `/app/:slug/dashboard` if they have a
      membership in that organization.
- [ ] An owner/admin sees the dashboard, professionals, consents and settings.
- [ ] An artist sees `/professional/:slug`.
- [ ] A super admin sees `/super-admin`.
- [ ] Users without membership are redirected to `/` or shown an access-denied
      screen.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] Old `/admin` and `/artist` routes still work during transition.

## Next phase
`spec`
