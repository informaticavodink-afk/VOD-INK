# Work unit 1 baseline — database additive integrity and diagnostics

Date: 2026-07-27

## Safety and scope

- Sole sequential writer; work unit 1 only.
- No commit, push, PR, production mutation, destructive operation, or real-data test is authorized.
- Database tests are restricted to the explicitly authorized disposable hosted Supabase project for this recovery; production is excluded.
- Every fixture UUID, person, identifier, signature, and sanitary value used by this work unit is synthetic.
- Production PII and sanitary contents must never be copied into source, logs, tickets, or evidence.

## Worktree baseline

Before source edits, `git status --short` reported only pre-existing planning changes:

```text
 M openspec/config.yaml
?? openspec/changes/repair-consent-studio-representative-flow/
```

`git diff --stat` reported only the pre-existing tracked config change:

```text
openspec/config.yaml | 96 ++++++++++++++++++++++++++++++++++++----------------
1 file changed, 66 insertions(+), 30 deletions(-)
```

These pre-existing changes were not modified or reverted.

## Authorized read-only production gate

The parent supplied a previously passed, aggregate-only diagnostic receipt: one target studio; zero artist/studio mismatches; zero partial representative records; zero minors without complete representation; zero complete represented adults; ten adults without representative data; zero duplicate final files/status-reference inconsistencies; and one exact demo sanitary pair. No production query was repeated and no opaque identifiers or sensitive values were logged here.

The exact demo sanitary pair remains an operational release blocker. Production finalization must remain fail-closed until real sanitary data is supplied and attested through an authorized operational process.

## Local tooling and bootstrap incident repair

`npx supabase --version` resolved CLI `2.110.0`. `npx supabase test db --help` confirmed pgTAP tests run against local containers with `--local`. The original attempt could not reach Docker; after Docker became available, a fresh `npx supabase start` exposed a lexical migration-order incident: `20260707234503_add_artist_login_email.sql` attempted to alter `public.artists` before `20260708000227_initial_platform_schema.sql` created that table.

The bounded historical repair retained both migration version identities:

- `20260707234503_add_artist_login_email.sql` now performs its column alteration and partial unique-index creation only when `to_regclass('public.artists') is not null`.
- `20260708000227_initial_platform_schema.sql` now creates `public.artists.login_email` and `artists_login_email_unique_idx` as part of the baseline.

Current CLI help and the lightweight Supabase changelog were checked before verification; no current breaking change was relevant to this local migration-order repair. `npx supabase start --help` confirmed the local start command, and `npx supabase migration list --help` confirmed that `--local` is the explicit local-only listing mode.

After that repair, `npx supabase start` successfully applied both repaired migrations and continued through `20260714000002_multitenant_foundation_tables.sql`. It then exposed local-replay incident #2 in `20260714000003_multitenant_foundation_rls_helpers.sql`: `private.is_platform_admin()` referenced `public.profiles.platform_role` even though the column was not added until `20260714000005_multitenant_foundation_backfill.sql` (SQLSTATE 42703), and `private.has_org_role(uuid, text[])` compared `public.organization_role` directly with a `text[]` element (expected SQLSTATE 42883).

The bounded second repair also retained all migration version identities:

- `20260714000002_multitenant_foundation_tables.sql` now adds `profiles.platform_role public.platform_role not null default 'user'` idempotently before helper creation; the duplicate `ADD COLUMN IF NOT EXISTS` in `20260714000005_multitenant_foundation_backfill.sql` remains unchanged for historical compatibility.
- `20260714000003_multitenant_foundation_rls_helpers.sql` preserves `private.has_org_role(uuid, text[])` and minimally compares `m.role::text = any(roles)`.

`git diff --check` passed, emitting only the existing `openspec/config.yaml` LF-to-CRLF working-copy warning. A fresh local-only `npx supabase start` then applied every migration through `20260725000200_allow_legacy_signing_during_pdf_rollout.sql` and started the local development setup. The command emitted `WARN: no files matched pattern: supabase/seed.sql` but continued successfully, proving that the missing seed file is not a startup blocker. `npx supabase status` reported the local setup running (with optional imgproxy and pooler services stopped), and `npx supabase migration list --local` listed all 17 local migration versions through `20260725000200`.

No reset was run, and production was not contacted or mutated.

## Assertion-level RED checkpoint

Exact local-only command:

```text
npx supabase test db --local supabase/tests/consent_integrity_diagnostics_test.sql
```

Final exit status: `1`. pgTAP executed the complete plan (`Tests: 9`, `Failed: 9`, `Wstat: 0`) with no bootstrap, SQL parse, or bad-plan error. The failures are the intended missing work-unit-1 behavior:

1. `studios.health_data_verified_at` is absent.
2. `consents.has_legal_representative` is absent.
3. `consents.finalization_content_sha256` is absent.
4. `consent_files.drive_copy_claimed_at` is absent.
5. `consent_files.drive_copy_completed_at` is absent.
6. `private.consent_integrity_diagnostics(text)` is absent.
7. The six bounded diagnostic category/count rows are absent.
8. The privacy-safe `category,finding_count,entity_ids` projection is absent.
9. A synthetic cross-studio consent insert caught no exception; SQLSTATE `23503` was required.

The target was test-only hardened so expected missing objects fail as assertions instead of aborting the plan. All fixtures and values remain synthetic. No migration, generated type, application code, configuration, remote database, or production system was touched. RED is valid; GREEN, TRIANGULATE, REFACTOR, and work units 2–9 were not started.

## Work-unit-1 GREEN checkpoint

- CLI identity command: `npx supabase migration new consent_integrity_diagnostics`.
- Created migration: `supabase/migrations/20260728020215_consent_integrity_diagnostics.sql`.
- Dependency/apply result: `npx supabase migration up --local` applied the new version after all 17 local dependencies; no reset was run.
- Exact GREEN command: `npx supabase test db --local supabase/tests/consent_integrity_diagnostics_test.sql`.
- Result: exit `0`; `Files=1`, `Tests=9`, all successful, `Result: PASS`.
- Schema diff: five nullable rollout columns, `UNIQUE artists(id, studio_id)`, supporting consent index, unvalidated composite FK/checks, sanitary-verification check/clearing trigger, and privacy-safe diagnostic function. The already-stale destructive `supabase_schema_complete.sql` snapshot was not partially synchronized.
- Privilege evidence: `anon` and `authenticated` cannot update `health_data_verified_at` or execute diagnostics; existing owner updates retain a column allowlist excluding attestation.
- Prior generated-types command: `npx supabase gen types --local --schema public` produced a fresh raw output measured at 31 additions / 13 deletions against HEAD, with all five Row/Insert/Update fields and `consents_artist_studio_fkey`; no type was hand-authored.
- Test-contract correction: explicit `C` collation and exact boolean comparisons replaced two `results_eq` calls after live diagnostic rows exposed a pgTAP collation error; expected rows/allowlist were unchanged.
- The earlier **239 changed-line** budget receipt is superseded: after pi-lens formatting settled, direct Git numstat for `src/types/supabase.ts` was **742 additions / 722 deletions**, not the raw generator diff.
- Rollback/stop: application paths remain off; nullable columns and unvalidated constraints may remain or the local migration may be reverted without deleting legacy/finalized data. No backfill, legacy validation, production access, TRIANGULATE, REFACTOR, or later unit occurred.

## Hosted MCP recovery and final GREEN gate

- The user replaced the unhealthy local-Docker validation path with the disposable project `vod-ink-consent-unit1-test` (`urdvixfwdqovelnidcnw`). Project-scoped MCP `get_project_url` returned exactly `https://urdvixfwdqovelnidcnw.supabase.co` before writes; initial inventory was zero public tables and zero migration-history rows. Production ref `igppobmclturtmzqpcyx` was never contacted.
- All 18 repository migrations were read from disk and applied in lexical order with exact bodies and deterministic names `replay_<repository basename>`. Every call returned `{"success":true}`; hosted history runs from version `20260728181049` / `replay_20260707234503_add_artist_login_email` through `20260728181122` / `replay_20260728020215_consent_integrity_diagnostics`.
- Post-replay metadata showed eight RLS-enabled public tables, the five required additive columns, a valid supporting unique constraint, the composite FK and three checks present but intentionally unvalidated, and `private.consent_integrity_diagnostics(text)` present. `anon` retains a hosted-default table ACL but has zero UPDATE RLS policies; `authenticated` has no table/column UPDATE privilege for attestation, and neither API role can execute diagnostics.
- Hosted environment deviation: `pgtap` was available but disabled, so it was enabled in the `extensions` schema as test-harness bootstrap. The exact unmodified repository script `supabase/tests/consent_integrity_diagnostics_test.sql` was then sent through MCP `execute_sql` (never as a migration).
- Exact GREEN execution completed without parse, bootstrap, or bad-plan errors. MCP returned `ok 9 - a new consent cannot bind an artist from another studio`; `finish()` emitted no failure summary, proving all 9 planned assertions passed.
- Security advisors reported two pre-existing legacy-RPC warnings for `public.get_active_artists(text)` (`anon` and `authenticated` executable SECURITY DEFINER). Performance advisors reported 30 empty/baseline findings: four unindexed FKs, nineteen unused indexes (including the required new composite-support index on an empty project), and seven multiple-permissive-policy warnings. No unit-1 regression required correction; unrelated baseline findings were not changed.
- MCP `generate_typescript_types` replaced `src/types/supabase.ts` with its raw `types` payload only: 24,726 bytes, 771 lines, SHA-256 `a0ca9ae37657fd870d318867040c8be30ac13d26d31b10d98660f3d59b8e2229`, trailing newline preserved. Git numstat is **30 additions / 8 deletions**; all five fields occur in Row/Insert/Update and the composite relationship occurs once.
- `src/types/.pi-lens.json` remains exactly `{ "format": { "enabled": false } }`. Focused non-network TypeScript validation passed. Pi-lens/LSP reported zero blockers and three generated-code duplicate-string warnings; raw generated output was not formatted or hand-edited.
- Review-budget implementation/test/tooling delta is exactly **300 changed lines**: 26 historical replay-repair lines + 128 additive-migration lines + 103 pgTAP-test lines + 38 generated-type numstat lines + 5 scoped generated-directory-policy lines. SDD and evidence records are disclosed separately as phase metadata rather than hidden inside this code-unit calculation; unrelated `openspec/config.yaml` remains excluded.
- At this checkpoint, unit-1 GREEN was complete while TRIANGULATE and REFACTOR remained unstarted.

## TRIANGULATE and REFACTOR completion

- The pgTAP contract expanded from 9 to **33** synthetic assertions. New coverage includes direct insert/update artist–studio mismatch rejection; each of the nine representative fields omitted independently; represented, unrepresented, and nullable rollout states; minor-required representation; valid/blank/missing/demo sanitary attestation; automatic verification clearing; and exact privacy-safe diagnostic output types.
- Exact disposable target proof remained `https://urdvixfwdqovelnidcnw.supabase.co`. Production ref `igppobmclturtmzqpcyx` was never contacted.
- TRIANGULATE RED: the first 33-plan execution returned `# Looks like you failed 2 tests of 33`. A targeted synthetic transaction identified exactly `rollout-null-partial` and `rollout-null-complete`: both returned `accepted` while SQLSTATE `23514` was expected.
- Root cause: the original nullable rollout branch permitted any representative count whenever `has_legal_representative IS NULL`, even though `NOT VALID` already allows legacy rows to remain unscanned while enforcing new writes.
- Minimal correction in the original uncommitted migration: one `num_nonnulls(...)` predicate now equals `CASE WHEN has_legal_representative IS TRUE THEN 9 ELSE 0 END`. Represented writes require all nine fields; false or null rollout writes require all nine to be null. The minor check remains independent.
- The equivalent drop/re-add DDL was applied only to the disposable project as test-only migration `triangulate_fix_nullable_representative_integrity`; the tool returned `success: true`.
- TRIANGULATE GREEN: the rerun reached `ok 33 - the exact demo sanitary pair cannot be attested`; no `finish()` failure row or tool error followed, and the transaction rolled back. Result: **33/33 passed**.
- REFACTOR assessment: the compact `CASE` constraint and the test's shared `pg_temp.representative_fields` / `pg_temp.representative_write_outcome` helpers already remove useful duplication. No behavior-neutral activity-only rewrite was added.
- REFACTOR validation: `npm run lint` (`tsc --noEmit`) exited 0; static SQL-shape checks passed; `git diff --check -- . ':(exclude)openspec/config.yaml'` exited 0 with only the non-blocking `src/types/supabase.ts` LF→CRLF warning.
- Final implementation/test/tooling size is **523 changed lines**: 26 historical replay-repair lines + 125 additive-migration lines + 329 pgTAP-test lines + 38 generated-type numstat lines + 5 scoped generated-directory-policy lines. This exceeds the original 300-line target under the user's explicit size exception.
- Work unit 1 is complete. No backfill, production mutation, Docker/WSL action, commit, push, PR, deploy, project deletion, or work-unit-2 implementation occurred.
