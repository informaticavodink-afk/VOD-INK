# Work unit 9 baseline — Constraint validation, RPC removal, and final verification

## Boundary and safety

- Exact change: `repair-consent-studio-representative-flow`; only work unit 9 repository surfaces were edited.
- Work unit 9 was split into coherent 9A/9B slices because the complete test/migration material is 428 physical lines. Unit 9 parent lifecycle rows and the global apply-cycle row remain unchecked.
- All fixtures, UUIDs, people, identifiers, document values, file metadata, hashes, and sanitary values in the new SQL are synthetic. No production, external API, Storage, Drive, or real sanitary data was contacted. No commit, push, PR, deploy, reset, or destructive operation was run.
- Production sanitary attestation remains an operational release blocker; finalization stays fail-closed. This missing attestation is not treated as a code implementation failure.

## Worktree baseline and migration order

- The worktree was already dirty with units 1–8 and unrelated tracked changes. Those changes were preserved.
- `git diff --stat` was captured before the unit-9 source work; the tracked baseline included the existing units-1–8 implementation and unrelated planning changes. No files outside the unit-9 migration/test/type/evidence surfaces were changed by this unit.
- Supabase CLI version/help context was consumed from the repository convention. CLI migration creation used `SUPABASE_TELEMETRY_DISABLED=1 npx supabase migration new` (the telemetry flag only avoids a local telemetry-file EPERM).
- CLI-created ordered migrations:
  1. `20260729031823_validate_consent_integrity.sql`
  2. `20260729031830_remove_active_artists_rpc.sql`
- The repository migration order is lexical and places both migrations after `20260728202342_minimize_active_artists_rpc.sql`.
- `supabase/supabase_schema_complete.sql` was not synchronized: repository evidence records it as a destructive consolidated initializer rather than the active per-migration snapshot convention.

## Strict TDD evidence

### RED

- Added `supabase/tests/consent_integrity_validation_test.sql` with an 8-assertion readiness contract for representation `NOT NULL`, validated representation checks/composite FK, privacy-safe aggregate diagnostics, and opaque UUID arrays.
- Added `supabase/tests/consent_integrity_final_test.sql` with a 10-assertion final contract for legacy RPC absence/permission, null/partial/minor/mismatch insert rejection, mismatch update rejection, target repair idempotency, and finalized consent/file immutability.
- Before the unit-9 migrations, the new contracts are designed to fail on the nullable representation column, unvalidated constraints, and callable minimal legacy RPC; the rollback-only synthetic helper exposes null/partial/conflicting rows through counts and UUID arrays only.
- Focused local attempts were exact but could not reach PostgreSQL: `npx supabase test db --local supabase/tests/consent_integrity_validation_test.sql` and `npx supabase test db --local supabase/tests/consent_integrity_final_test.sql` both exited 1 with `failed to connect to postgres`. This remains a local Docker availability blocker.
- **Authorized hosted assertion-level RED receipt:** On disposable project `urdvixfwdqovelnidcnw`, a rollback-only transaction temporarily dropped the post-validation `NOT NULL` and validated constraints inside one transaction, ran a separate 4-assertion readiness safety net, and returned `finish(): # Looks like you failed 4 tests of 4`. This is valid synthetic RED evidence rather than a connection/setup failure. The transaction rolled back; no durable schema change occurred and production remained untouched.

### GREEN

- `20260729031823_validate_consent_integrity.sql` performs a unique `vod-ink` lock/count, aborts on unresolved representation or integrity diagnostics, updates the privacy-safe diagnostic predicate for resolved represented adults, sets `has_legal_representative NOT NULL`, and validates both representation checks, the composite artist/studio FK, and the sanitary verification check.
- `20260729031830_remove_active_artists_rpc.sql` explicitly revokes `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`, then drops `public.get_active_artists(text)` after the endpoint cutover.
- Local apply and assertion-level GREEN were not run because Docker Desktop's Linux engine is unavailable. The checked-in generated type was reconciled to the expected post-migration shape (non-null representation Row/Insert/Update and empty Functions map). The authorized raw command `npx supabase gen types --project-id urdvixfwdqovelnidcnw --schema public` succeeded with Supabase CLI `2.110.0`; its output was non-empty (**24,432 bytes / 760 lines**, SHA-256 `665ee77b3dba2e2d0896c9705ecc70d0cac21eb239ad0523b7a7443cc812708f`) and now matches `src/types/supabase.ts` byte-for-byte. No formatter or guessed fallback was used.

### TRIANGULATE

- The final SQL contract contains synthetic direct insert/update boundary cases, direct RPC absence/permission checks, repeated repair/backfill calls, and a synthetic finalized document row/file snapshot comparison.
- Existing public-boundary tests independently prove the browser/server public artist path uses the four-key direct endpoint and never calls Supabase RPC. Focused command passed: `npm test -- server/publicBoundary.test.ts server/publicAdapters.test.ts server/consents.publicBoundary.test.ts server/consents.test.ts --testTimeout=15000` → 4 files, 42 tests passed.
- Local Supabase TRIANGULATE was not executable for the same Docker connection blocker. Parent-provided hosted reruns on disposable ref `urdvixfwdqovelnidcnw` of the exact current repository contracts passed with rollback: `consent_integrity_validation_test.sql` **8/8** and `consent_integrity_final_test.sql` **10/10**. This executor had no hosted Supabase MCP tool namespace, so these are recorded parent receipts rather than a new MCP execution here. No database data was changed by this executor.

### Authorized hosted readiness counterexample and correction

- Authorized hosted disposable project `urdvixfwdqovelnidcnw` had both unit-9 migrations applied successfully; its privacy-safe inventory was clean: one target studio and zero consent/mismatch/partial/null-representation findings.
- The exact `consent_integrity_validation_test.sql` transaction then exposed a false failure in the post-validation readiness branch: `not exists` treated the four blocking diagnostic rows as findings even though the fixed-category function returned each row with `finding_count = 0`.
- Only that readiness assertion changed. It now uses `coalesce((select sum(finding_count) ...), 0) = 0` over `artist_studio_mismatch`, `partial_representative`, `minor_without_complete_representative`, and `adult_with_complete_representative`; the fixed-category diagnostic projection and both unit-9 migrations remain unchanged.
- At this earlier correction checkpoint, the corrected exact hosted readiness and final transactions still required rerun and attestation; the independent receipts recorded below now complete verification and reconcile the unit-9 implementation task rows.

### Authorized hosted final-test counterexample and correction

- With both unit-9 migrations still applied on disposable ref `urdvixfwdqovelnidcnw`, the corrected exact `consent_integrity_validation_test.sql` transaction reached **8/8**. The exact `consent_integrity_final_test.sql` transaction then failed before assertions with SQLSTATE `42702` because its repeated-repair idempotency assertion selected unqualified live-row columns while cross joining `public.studios s` and `repair_before b`.
- The final-test idempotency assertion now qualifies every live row column as `s.legal_name`, `s.trade_name`, `s.address`, `s.city`, `s.postal_code`, `s.tax_id`, `s.phone`, `s.health_registration_number`, `s.health_authorization_date`, and `s.health_data_verified_at`.
- The same final-test post-validation diagnostics assertion also now uses `coalesce((select sum(finding_count) ...), 0) = 0` over the four blocking categories rather than `not exists`, because the fixed-category diagnostics function always returns zero-count category rows. This is a test-only correction; both unit-9 migrations remain unchanged.
- At this earlier correction checkpoint, the corrected exact final transaction still required hosted rerun and attestation; the independent 10/10 receipt recorded below now completes verification and reconciles all unit-9 implementation task rows.

### REFACTOR / final verification

- `npm run lint` → passed (`tsc --noEmit`).
- `npm run build` → passed (Vite plus esbuild server bundle; only the existing chunk-size warning).
- `git diff --check -- . ':(exclude)openspec/config.yaml'` → passed; only existing LF→CRLF working-copy warnings.
- `npm test` → failed 9 unrelated pre-existing jsdom-environment failures in `src/steps/Step1_Client.test.tsx` (7) and `src/steps/Step6_SignatureClient.test.tsx` (2), all `document is not defined`; 16 files/122 tests passed.
- `npm run test:coverage` → same 9 unrelated `document is not defined` failures; 16 files/122 tests passed.
- No unit-9 source change caused those failures; the focused public/server suites and lint/build remained green.

## Line accounting and rollback boundaries

| Slice | Files | Physical lines | Boundary |
|---|---|---:|---|
| 9A validation/readiness | `20260729031823_validate_consent_integrity.sql` + `consent_integrity_validation_test.sql` | 112 + 153 = **265** | Leave additive schema in place; do not set `NOT NULL` or validate further if diagnostics are non-zero. |
| 9B RPC/final verification | `20260729031830_remove_active_artists_rpc.sql` + `consent_integrity_final_test.sql` + generated type delta | 4 + 159 + ~13 changed generated lines = **~176** | Restore only the minimal four-field RPC if endpoint rollback is explicitly required; never restore sensitive fields. |
| Combined unit-9 material | New SQL/tests plus generated type delta | **~441** | No data deletion; unvalidate/drop only new constraints if a safe rollback is required. |

The approved ≤300-line target is met by each coherent 9A/9B slice; the combined unit is intentionally not represented as one review unit.

## Residual risks / stop decision

- **Blocking:** local Supabase/Docker is unavailable, so local migration apply, local pgTAP RED/GREEN/TRIANGULATE receipts, and local advisor/security checks remain unverified. The authorized disposable hosted migration application and parent-provided corrected exact contract receipts are complete: validation **8/8** and final **10/10**, each rolled back. Raw CLI type generation is also complete against the same disposable project; no production or unapproved external target was contacted. Stop rather than connect to production.
- Full npm/test-coverage commands remain red only because of existing unit-5 jsdom test setup; fixing those files would widen unit-9 scope and was not attempted.
- Unit-9 implementation task rows are reconciled after independent verification. Parent-owned lifecycle remains deferred; this evidence does not authorize parent verify/sync/archive or publication/release.
- No production sanitary attestation exists; production finalization must remain fail-closed until an authorized operator supplies and attests real sanitary data outside source/logs/fixtures.

## Final hosted verification and raw type-generation receipt (2026-07-29)

This section supersedes the earlier chronological notes that were awaiting the corrected hosted reruns; those notes remain historical checkpoints.

- Authorized target proof remained disposable project `urdvixfwdqovelnidcnw` only. Both CLI-generated migrations were applied successfully in lexical order after `20260728202342_minimize_active_artists_rpc.sql`:
  1. `supabase/migrations/20260729031823_validate_consent_integrity.sql`
  2. `supabase/migrations/20260729031830_remove_active_artists_rpc.sql`
- The privacy-safe hosted inventory was clean before validation: one `slug='vod-ink'` studio and zero consent/artist-studio mismatch, partial/conflicting, or null-representation findings. No names, DNI, phones, signatures, sanitary values, or document/file bytes were recorded.
- The corrected readiness predicate is test-only and sums `finding_count` across the four blocking categories with `coalesce(..., 0) = 0`; fixed-category zero rows are therefore treated as clear. The exact current hosted validation transaction passed **8/8**, with rollback.
- The corrected final contract qualifies every live target column as `s.legal_name`, `s.trade_name`, `s.address`, `s.city`, `s.postal_code`, `s.tax_id`, `s.phone`, `s.health_registration_number`, `s.health_authorization_date`, and `s.health_data_verified_at` in the repeated-repair assertion. Its post-validation predicate uses the same `coalesce(sum(finding_count), 0) = 0` form. The exact current hosted final transaction passed **10/10**, with rollback.
- This executor had no project-scoped Supabase MCP namespace exposed; no new hosted SQL run is claimed. The 8/8 and 10/10 results above are the parent-provided receipts for the authorized disposable project.
- `npx supabase gen types --help` confirmed the `--project-id`/`--schema` flags, and `npx supabase --version` reported `2.110.0`. The authorized raw command succeeded. Its non-empty output is **24,432 bytes / 760 lines**, SHA-256 `665ee77b3dba2e2d0896c9705ecc70d0cac21eb239ad0523b7a7443cc812708f`, trailing newline; `src/types/supabase.ts` matches the raw output byte-for-byte and contains the post-migration non-null representation fields, composite relationship, and empty `Functions` map. No formatting or guessed output was substituted.
- Focused validation passed: `./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts` and `npm run lint` (repository `tsc --noEmit`). Exact generator-output diff also passed: `set -o pipefail; npx supabase gen types --project-id urdvixfwdqovelnidcnw --schema public | diff -u src/types/supabase.ts -`.
- Residual local blocker: Docker Desktop's Linux engine is unavailable, so local Supabase apply/tests and local advisor/security checks remain unverified. The full repository test/coverage commands retain the previously recorded nine unrelated jsdom failures. Unit-9 implementation task rows are reconciled after independent verification; parent lifecycle rows remain untouched and deferred. Production sanitary attestation remains a release blocker and finalization stays fail-closed.

## Follow-up full-suite verification after unit-5 jsdom directives

This follow-up records the current working-tree result after adding only the standard file-level `// @vitest-environment jsdom` directive to `src/steps/Step1_Client.test.tsx` and `src/steps/Step6_SignatureClient.test.tsx`. It supersedes the earlier full-suite jsdom-failure status above; unit-9 implementation task rows are reconciled after independent verification.

- `npm test` **passed**: 18 test files and 131 tests passed, including the 7 Step1 and 2 Step6 component tests; no `document is not defined` failures remain.
- `npm run test:coverage` **did not pass as a command**: all 18 files and 131 tests passed, but the existing 100% threshold for `src/domain/consents/consentPdfSchema.ts` failed at 98.07% statements/lines and 96% branches. No jsdom/document-environment failure occurred.
- `npm run lint` **passed** (`tsc --noEmit`).
- `git diff --check` **passed** with the repository's existing LF-to-CRLF working-copy warnings only.
- The verification stayed synthetic-only: no production, database, Storage, Drive, external API, commit, or publication action occurred. No production source or unit-9 migration was changed; unit-9 implementation task rows are reconciled after independent verification, and parent lifecycle rows remain deferred.

## Coverage blocker follow-up

- Added one focused synthetic v3-minor rejection test for `esMenor: true`, `tieneRepresentanteLegal: false`, and `representante: null`; `npm run test:coverage` now **passes** with 18 test files and 132 tests. `src/domain/consents/consentPdfSchema.ts` reports **100% statements, branches, functions, and lines** (overall 98.41% statements/lines, 96.32% branches). Unit-9 implementation task rows are reconciled after independent verification; parent-owned lifecycle remains deferred and no publication or release occurred.
