# SDD Specification — SaaS multi-tenant panels and routing

## Change

`saas-multitenant-panels`

## Reference

- Proposal: `openspec/changes/saas-multitenant-panels/proposal.md`
- Phase 1: `openspec/changes/saas-multitenant-foundation/`

## Functional requirements

### FR-1 Route structure

- `/app/:organizationSlug/dashboard` → `OrganizationDashboardPage`
- `/app/:organizationSlug/professionals` → `OrganizationProfessionalsPage`
- `/app/:organizationSlug/consents` → `OrganizationConsentsPage`
- `/app/:organizationSlug/settings` → `OrganizationSettingsPage`
- `/professional/:organizationSlug` → `ProfessionalDashboardPage`
- `/super-admin` → `SuperAdminPage`
- Old routes `/admin/*` and `/artist/*` remain functional during transition.

### FR-2 Organization resolution

- The active organization is determined from the `:organizationSlug` URL param.
- If the slug is invalid, the organization is paused, or the user has no active
  membership, redirect to `/` or show an access denied screen.
- Organization context is available via `OrganizationProvider`.

### FR-3 Role-based access

- Owner and admin can access `/app/:organizationSlug/*`.
- Artist can access `/professional/:organizationSlug` but not `/app/*`.
- `super_admin` can access `/super-admin`.
- Any user without a role in the organization is denied.

### FR-4 Data adapter components

- `ArtistsManager` and `ConsentsManager` currently receive `studioId`. They must
  accept `organizationId` and internally query by `organization_id` where possible.
- During transition, if `organizationId` is not available, fall back to
  `studioId`.
- `ArtistConsents` receives `artistId` and `organizationId`.

### FR-5 Navigation and layouts

- `OrganizationLayout` sidebar for `/app/:slug/*` with links to Dashboard,
  Professionals, Consents, Settings.
- `ProfessionalLayout` sidebar for `/professional/:slug` with links to
  Consents.
- `SuperAdminLayout` for `/super-admin`.
- Header shows organization name, user name, privacy toggle, logout.

### FR-6 Backward compatibility

- Old `/admin` and `/artist` routes continue to work using `profile.studio_id`.
- No existing functionality is removed.

## Non-functional requirements

### NFR-1 Security

- Route guards use the real membership table, not just `profile.role`.
- `super_admin` access is checked via `profile.platform_role`.
- No use of `user_metadata` for authorization.

### NFR-2 Performance

- Load organization and membership once per route switch.
- Cache organization data in context to avoid repeated requests.

### NFR-3 Type safety

- Extend TypeScript types with `organization_memberships` relationships.
- Update route param types.

## Data model usage

### `organization_memberships`

Used to determine access for every route under `/app/:slug` and
`/professional/:slug`.

### `organizations`

Resolved from slug to get `id`, `name`, `status`, `slug`.

### `profiles`

Used for `platform_role` (super admin) and `full_name` display.

## Scenarios

### SC-1 Owner opens organization dashboard

Given a user with membership `(org-a, owner)`
When they navigate to `/app/org-a/dashboard`
Then the organization is loaded and the dashboard is rendered.

### SC-2 Artist tries to open admin panel

Given an artist in `org-a`
When they navigate to `/app/org-a/dashboard`
Then they are redirected to `/professional/org-a`.

### SC-3 User without membership

Given a user with no membership in `org-b`
When they navigate to `/app/org-b/dashboard`
Then they see an access denied screen or are redirected to `/`.

### SC-4 Super admin opens platform panel

Given a user with `platform_role = super_admin`
When they navigate to `/super-admin`
Then the super admin panel is rendered.

## Acceptance criteria

- [ ] New routes render correct layouts.
- [ ] Organization context is available to all child components.
- [ ] Auth guards redirect or deny access appropriately.
- [ ] Existing `/admin` and `/artist` routes still work.
- [ ] `npm run lint` and `npm run build` pass.

## Next phase

`design`
