# SDD Tasks — SaaS multi-tenant foundation

## Change

`saas-multitenant-foundation`

## References

- Proposal: `openspec/changes/saas-multitenant-foundation/proposal.md`
- Spec: `openspec/changes/saas-multitenant-foundation/spec.md`
- Design: `openspec/changes/saas-multitenant-foundation/design.md`

## Task list

### T-1 Create migration A: enums

**Status:** `- [ ]`
**Estimated diff:** ~20 added lines
**Files:**

- `supabase/migrations/20260714000001_multitenant_foundation_enums.sql`
**Work:**
- Create `public.platform_role`, `public.organization_role`,
  `public.membership_status`, `public.organization_status`,
  `public.invitation_status` enums.
**Verification:**
- Migration applies cleanly with `supabase db reset --local`.
- `supabase migration list --local` shows the file.

### T-2 Create migration B: tables, triggers, indexes, grants

**Status:** `- [ ]`
**Estimated diff:** ~140 added lines
**Files:**

- `supabase/migrations/20260714000002_multitenant_foundation_tables.sql`
**Work:**
- Create `organizations`, `organization_memberships`,
  `organization_invitations`, `locations`, `organization_branding`,
  `organization_settings`.
- Add `updated_at` triggers.
- Add indexes.
- Enable RLS and grant Data API privileges.
**Verification:**
- Local reset succeeds.
- All six tables exist with RLS enabled.

### T-3 Create migration C: RLS helpers

**Status:** `- [ ]`
**Estimated diff:** ~90 added lines
**Files:**

- `supabase/migrations/20260714000003_multitenant_foundation_rls_helpers.sql`
**Work:**
- Add `private.is_platform_admin()`, `private.is_org_member()`,
  `private.has_org_role()`, `private.is_org_owner_or_admin()`,
  `private.current_membership_org_id()`.
- Grant execute to authenticated.
**Verification:**
- Functions exist and `authenticated` role can execute them.

### T-4 Create migration D: RLS policies

**Status:** `- [ ]`
**Estimated diff:** ~100 added lines
**Files:**

- `supabase/migrations/20260714000004_multitenant_foundation_policies.sql`
**Work:**
- Add permissive read policies and owner/admin write policies for all new
  tables.
**Verification:**
- `supabase db reset --local` succeeds.
- Policies are visible in Supabase dashboard/local RLS view.

### T-5 Create migration E: back-fill

**Status:** `- [ ]`
**Estimated diff:** ~60 added lines
**Files:**

- `supabase/migrations/20260714000005_multitenant_foundation_backfill.sql`
**Work:**
- Add `profiles.platform_role` with default `user`.
- Back-fill `organizations` from `studios`.
- Insert demo organization.
- Back-fill `organization_memberships` from `profiles`.
- Assign orphan profiles to demo org.
- Create default settings and branding rows.
**Verification:**
- After reset, every `profile` has at least one membership.
- Organizations match studios.
- Demo org exists.

### T-6 Update TypeScript types

**Status:** `- [ ]`
**Estimated diff:** ~280 added lines
**Files:**

- `src/types/supabase.ts`
**Work:**
- Add new enums.
- Add `platform_role` to `profiles`.
- Add new table types: `organizations`, `organization_memberships`,
  `organization_invitations`, `locations`, `organization_branding`,
  `organization_settings`.
- Add relationships for foreign keys.
**Verification:**
- `npm run lint` passes.
- `npm run build` passes.

### T-7 Update consolidated schema (optional but recommended)

**Status:** `- [ ]`
**Estimated diff:** ~30 added lines
**Files:**

- `supabase/supabase_schema_complete.sql`
**Work:**
- Append the new enums, tables, helpers, policies and back-fill statements
  to the consolidated schema script so it stays a single source of truth
  for manual SQL Editor runs.
**Verification:**
- The consolidated script parses as valid SQL when copied to a fresh
  Supabase SQL Editor.

## Review workload forecast

| Task | Added lines | Deleted lines | Total |
|------|------------:|------------:|------:|
| T-1 | 20 | 0 | 20 |
| T-2 | 140 | 0 | 140 |
| T-3 | 90 | 0 | 90 |
| T-4 | 100 | 0 | 100 |
| T-5 | 60 | 0 | 60 |
| T-6 | 280 | 0 | 280 |
| T-7 | 30 | 0 | 30 |
| **Total** | **720** | **0** | **720** |

**Risk:** The combined diff (≈720 changed lines) exceeds the 400-line review
budget configured for this SDD change. Because the change is mostly additive
SQL and type definitions, splitting it into two PRs is recommended:

- **PR 1:** Migrations T-1 through T-5 (≈410 lines) + T-7 (≈30 lines) = ≈440
  lines. This is slightly over budget but limited to SQL/schema changes.
- **PR 2:** TypeScript types T-6 (≈280 lines). Clean and focused.

Alternatively, keep a single PR but explicitly flag the reviewer that the change
is purely additive schema and type work, with no runtime behavior changes yet.

## Implementation order

1. T-1 (enums) — no dependencies.
2. T-2 (tables) — depends on T-1.
3. T-3 (helpers) — depends on T-2.
4. T-4 (policies) — depends on T-2 and T-3.
5. T-5 (back-fill) — depends on T-1 through T-4.
6. T-6 (types) — can run in parallel with migrations once T-2 is defined, but
   safer to run after T-5 to verify types match the populated schema.
7. T-7 (consolidated schema) — depends on T-1 through T-5.

## Verification (global)

- `npm run lint` passes.
- `npm run build` passes.
- `supabase db reset --local` applies all migrations without errors.
- Post-reset smoke test: admin panel, artist panel, consent wizard still work.

## Next phase

`apply`
