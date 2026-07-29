# Apply progress: repair consent studio and representative flow

## Current boundary

- Completed boundaries: **work units 1–9 implementation complete; units 1–8 include RED → GREEN → TRIANGULATE → REFACTOR, and unit 9 includes independent hosted verification plus raw type-generation reconciliation**
- Active boundary: **none — work units 1–9 implementation is complete after independent hosted verification; parent-owned verify/sync/archive lifecycle remains deferred, and no publication or release occurred**
- Delivery path: `auto-chain`, `stacked-to-main`; unit 3 is split into resolver/discovery (3A), runtime adapters (3B), browser least privilege (3C), and scoped creation (3D), with every coherent slice below 300 changed lines
- PR boundary: **work units 1–9 implementation complete, including hosted receipts and raw type generation; parent-owned lifecycle rows 110–112 remain deferred; no commit, publication, or release occurred**
- Bootstrap incident repairs #1 and #2: **implemented and exercised**; all historical migrations replayed in lexical order on the authorized disposable hosted project
- Work unit 1 status: **RED, GREEN, TRIANGULATE, and REFACTOR complete**. TRIANGULATE expanded the exact pgTAP contract from 9 to 33 assertions, exposed two nullable-representation failures, and passed 33/33 after the minimal constraint correction. `npm run lint` and focused static/diff checks passed.
- Disposable hosted migration history contains the 18 deterministic `replay_<repository basename>` entries plus test-only correction `triangulate_fix_nullable_representative_integrity`; no reset or project deletion occurred.
- Scoped generated-directory policy: `src/types/.pi-lens.json` contains only `format.enabled: false`; diagnostics and autofix remain enabled, and formatting elsewhere is unchanged.
- The earlier local Docker recovery incident remains historical evidence. No Docker/WSL mutation occurred in this completion.
- Production remained untouched; no production query, mutation, migration, or real-data test was performed. The disposable project remains available for the next authorized isolated test boundary.

## Structured status consumed

The latest parent-provided authoritative status selected exact change `repair-consent-studio-representative-flow`, marked apply `ready`, and set the boundary to `work-unit-3` after completed units 1–2. `actionContext.mode` is `repo-local`; edits stayed within allowed `server`, `api`, `src`, active OpenSpec-change, and implementation-evidence roots. Delivery is single-writer `auto-split` with a 300-line target, and strict TDD is active with focused Vitest. This boundary authorized only work unit 3; production/external services, commits/publication, and work unit 4 were forbidden. The injected ambiguous native status was explicitly stale and superseded by this exact parent status.

### 2026-07-28 TRIANGULATE/REFACTOR attempt — blocked before source edits

The user selected this exact change and limited the run to the remaining work-unit-1 TRIANGULATE/REFACTOR rows, explicitly accepting a review-budget overrun rather than splitting slice 1B. The newly injected native status was stale and still reported ambiguous change selection with `applyState: blocked`; attempts to obtain a refreshed status/override from the supervisor broker timed out. This executor also had no Supabase MCP tool namespace, so it could not perform the mandatory fresh project-URL proof or strict-TDD safety-net/TRIANGULATE/REFACTOR executions through project-scoped `execute_sql`. No source, migration, test, generated type, baseline-evidence, task checkbox, database, or later-unit change was made. The implementation/test/tooling delta therefore remains exactly **300 lines**, and TRIANGULATE/REFACTOR remain unchecked.

### 2026-07-28 TRIANGULATE test-authoring checkpoint — awaiting parent MCP

A later parent-provided authoritative status resolved the exact change to `repair-consent-studio-representative-flow`, marked apply `ready`, authorized only work-unit-1 TRIANGULATE authoring, and explicitly accepted the size exception above 300 lines. `supabase/tests/consent_integrity_diagnostics_test.sql` now plans **33** assertions and adds compact synthetic counterexamples for update mismatch rejection, all nine omitted representative fields, true/false/null representation boundaries, minor enforcement, sanitary-attestation prerequisites/clearing, and runtime diagnostic output types. The file grew from 103 to 329 physical lines (**+226**); `git diff --check` reported no whitespace errors, and editor SQL diagnostics reported clean syntax. Static inspection predicts the new null-state partial/complete assertions will expose the current permissive `has_legal_representative is null` check branch, but no runtime result is claimed. Parent-routed MCP must execute the exact repository script next. TRIANGULATE remains unchecked; no migration, baseline evidence, REFACTOR, production target, Docker/WSL target, or later work unit was touched.

### 2026-07-28 TRIANGULATE correction checkpoint — completed

Parent-routed MCP proved the expanded repository script RED on disposable ref `urdvixfwdqovelnidcnw`: `finish()` reported exactly **2 failures of 33**. A targeted transaction identified only `rollout-null-partial` and `rollout-null-complete`; each was accepted while SQLSTATE `23514` was expected. The original uncommitted unit-1 migration now uses one `num_nonnulls(...)` predicate with `CASE`: `has_legal_representative IS TRUE` requires exactly nine representative fields, while false or nullable rollout state requires zero. This avoids PostgreSQL `CHECK` null-result acceptance from bare nullable boolean branches. No new repository migration was created.

The parent applied the equivalent drop/re-add DDL only to the disposable project as `triangulate_fix_nullable_representative_integrity` (`success: true`). The 33-assertion transaction then reached `ok 33 - the exact demo sanitary pair cannot be attested`, produced no `finish()` failure row or tool error, and rolled back: **33/33 passed**. REFACTOR found no additional useful production deduplication beyond the compact `CASE` constraint and the test's existing shared `representative_fields` / `representative_write_outcome` helpers, so no activity-only rewrite was made. `npm run lint` exited 0; the SQL-shape script and `git diff --check -- . ':(exclude)openspec/config.yaml'` passed, with only the non-blocking generated-types LF→CRLF warning. Production, generated types, Docker/WSL, publication, and unit 2 remained untouched.

### 2026-07-28 work-unit-2 RED authoring checkpoint — awaiting parent MCP

The parent-provided authoritative status selected exact change `repair-consent-studio-representative-flow`, marked apply `ready`, and authorized only work-unit-2 RED authoring. `actionContext.mode` is `repo-local`; edits stayed within `supabase/tests/` and this cumulative OpenSpec progress artifact. `supabase/tests/studio_repair_rpc_test.sql` is a transaction-wrapped **9-assertion** synthetic pgTAP contract for the exact seven-field `vod-ink` repair, repeated-state idempotency, exact demo-pair clearing, mixed/missing/different sanitary preservation, null verification, zero/duplicate target aborts, conservative representation backfill, revoked private repair seam, and four-field compatibility RPC. Static checks passed: exact plan/assertion count, balanced dollar quoting, transaction/rollback boundaries, and `git diff --check`.

Runtime RED was not available during authoring because that executor had no project-scoped MCP namespace and Docker remained outside the boundary. The test remains unpersisted in migration history and all fixtures are synthetic. The file is **255 physical lines**, leaving only 45 lines under the original unit-2 budget; GREEN's two ordered migrations and generated-type delta require either a coherent repair/RPC split or a new explicit size exception before production code. No migration, type, production target, Docker/WSL target, or unit-3 file was touched during authoring.

### 2026-07-28 work-unit-2 RED runtime checkpoint — completed

The parent verified the isolated project URL as exactly `https://urdvixfwdqovelnidcnw.supabase.co` and executed the semantically exact 9-assertion repository transaction through project-scoped Supabase MCP `execute_sql`. `finish()` returned `# Looks like you failed 8 tests of 9`; there was no SQL parse, harness-bootstrap, or bad-plan error, and the transaction rolled back. The MCP result did not identify the single passing assertion, so this receipt does not guess it. All people, UUIDs, identifiers, and sanitary values were synthetic; production ref `igppobmclturtmzqpcyx` was not contacted.

Work-unit-2 RED is now persisted complete. GREEN remained deliberately unstarted until the parent obtained the delivery decision recorded below.

### 2026-07-28 work-unit-2 GREEN slice 2A authoring checkpoint — awaiting parent MCP

The user selected coherent split 2A/2B and automatic sub-splitting when a future slice cannot stay near 300 lines. CLI command `npx supabase migration new repair_vod_ink_studio` created `20260728201044_repair_vod_ink_studio.sql`; the automatic backfill sub-split used the same required CLI flow to create ordered `20260728201314_backfill_consent_representation.sql`. Slice 2B's minimal RPC migration was not created.

The first migration defines and invokes revoked `SECURITY INVOKER` `private.repair_vod_ink_studio()` with an empty search path. It locks/counts exactly `slug='vod-ink'`, raises SQLSTATE `P0001` unless one row exists, sets only the seven approved business fields, clears only the exact demo sanitary pair together, preserves all other sanitary states, always clears attestation, and returns only `sanitary_demo_pair_cleared`, `sanitary_empty`, or `sanitary_review_required`. The second migration independently defines/invokes revoked `private.backfill_consent_representation()`, setting nullable state to true only for complete nine-field records and false only for adult all-null records; partial/conflicting and minor all-null records remain null, with representative values untouched.

The exact RED test remains one transaction. It now resets the target to a synthetic pre-repair/demo fixture before the first explicit seam call and routes the private test helper through both ordered seams, so deployed migration invocation does not invalidate repeated/idempotent coverage. Static checks passed: plan/assertion 9/9, balanced transaction/rollback, both functions invoker/empty-search-path/revoked/invoked, no fallback studio insert, exact values/pair/categories, conservative count predicates, and `git diff --check`.

Exact physical sizes are 67 repair-migration lines, 54 backfill-migration lines, and 275 test lines. The already-persisted RED test was its own 255-line review checkpoint; slice-2A incremental GREEN is **141 lines** (121 migration + 20 test adjustment). Behavior-attributable review sub-slices are also below budget: core repair is 249 lines (test core/shared harness 182 + migration 67), and conservative backfill is 124 lines (test backfill 70 + migration 54). No public schema signature changed, so generated types were not regenerated. Runtime is not claimed: parent must apply both migrations in lexical order to disposable ref `urdvixfwdqovelnidcnw`, then run the exact 9-assertion repository transaction. Expected after 2A: only the two RPC assertions remain RED; overall unit-2 GREEN stays unchecked.

## Baseline and global controls

Completed and persisted in `tasks.md`:

- [x] Baseline/evidence/synthetic-only control.
- [x] Read-only pre-apply diagnostic control, using the supplied aggregate-only receipt.

The receipt reported exactly one target studio, zero artist/studio mismatches, zero partial representative records, zero minors without complete representation, zero complete represented adults, zero final-file integrity findings, and the exact demo sanitary category. Missing real sanitary attestation remains an operational release blocker; production finalization must remain fail-closed.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Unit 1 RED | `supabase/tests/consent_integrity_diagnostics_test.sql` | Local DB integration / pgTAP | Local stack had replayed all 17 prior migrations | **Valid:** exact focused command exited 1; all 9 planned assertions failed without parse/bootstrap/bad-plan errors | Not started | Not started | Not started |
| Unit 1 GREEN | same | Hosted disposable DB integration / pgTAP | Exact URL proof, empty inventory, and exact replay of all 18 repository migrations | RED preserved: 9 intended missing-behavior failures | **Passed:** exact script via MCP `execute_sql`; last result `ok 9`, empty `finish()` failure output, no tool error = 9/9 | Not started | Not started |
| Unit 1 GREEN generated types | `src/types/supabase.ts` plus scoped formatter policy | Generated artifact / focused TypeScript + LSP | Formatter churn had exposed a 742/722 false delta | Raw MCP generation contract retained | **Passed:** raw 24,726-byte output, numstat 30/8; focused `tsc` passed; LSP 0 blockers | Not started | Not started |
| Unit 1 TRIANGULATE / REFACTOR | `supabase/tests/consent_integrity_diagnostics_test.sql` | Hosted disposable DB integration / pgTAP + repository TypeScript | Prior 9/9 GREEN and exact target proof | Existing 9/9 GREEN preserved | Minimal nullable-representation `CHECK` correction after counterexample RED | **RED:** 2/33 (`rollout-null-partial`, `rollout-null-complete`) accepted unexpectedly; **PASS:** 33/33 after test-only disposable correction | **Passed:** no activity-only rewrite; `npm run lint`, SQL-shape check, and focused diff check all green |
| Unit 2 RED → REFACTOR slices 2A–2B | `supabase/tests/studio_repair_rpc_test.sql` | Hosted disposable DB integration / pgTAP + repository TypeScript/static gates | Work unit 1 complete; exact isolated target proof | **Valid:** initial `finish()` reported 8 failures of 9; after parent-tested 2A, exactly the two RPC assertions remained RED and seven repair/backfill assertions passed | **Passed:** after 2B the exact suite ended at `ok 9` with no `finish()` failure/tool error and rollback = 9/9; raw remote types, four-field surface, and focused `tsc` passed | **Passed:** unrelated-slug synthetic sanitary counterexample; exact 10-assertion transaction ended at `ok 10`, no `finish()` failure/tool error, rollback = 10/10 | **Passed:** no activity-only rewrite; focused generated-type `tsc`, `npm run lint`, runtime hardcode scan, and focused diff check all green |
| Unit 3 RED → REFACTOR slices 3A–3D | `server/publicBoundary.test.ts`, `server/consents.publicBoundary.test.ts`, `server/publicAdapters.test.ts`, `src/lib/artists.test.ts` | Mocked service/API/client integration via Vitest | Existing `server/consents.test.ts` passed 7/7 | **Valid:** focused command exited 1 for missing modules/endpoint, unstable error code, cross-studio insertion, missing scoped filters, and old browser Supabase dependency | **Passed:** same four suites 13/13 after minimum trusted resolver/discovery/creation implementation | **Passed:** 18/18 with whitespace, unknown, extra-column, photo, old-RPC-shaped, and equivalent runtime success boundaries | **Passed:** final focused suites plus existing consent suite 25/25; serverless ESM 2/2 with bounded timeout; `npm run lint` and diff hygiene green |

### Concrete tooling evidence

- `npx supabase --version` → `2.110.0`.
- The lightweight current Supabase changelog was checked; no breaking change was relevant to this migration-order incident.
- `npx supabase start --help` confirmed the local development-stack command.
- `npx supabase migration list --help` confirmed `--local` as the explicit local-only listing flag; `--linked` and `--db-url` were not used.
- The diagnosed lexical order is unchanged: `20260707234503_add_artist_login_email.sql` precedes `20260708000227_initial_platform_schema.sql`.
- The first migration now guards both its alteration and partial unique index with `to_regclass('public.artists') is not null`; the baseline now owns `login_email text` and the same partial unique index immediately after creating `public.artists`.
- After incident repair #1, `npx supabase start` applied both repaired migrations and continued through `20260714000002_multitenant_foundation_tables.sql`, then exposed incident #2 in `20260714000003_multitenant_foundation_rls_helpers.sql`.
- The incident diagnosis was exact: `private.is_platform_admin()` referenced `public.profiles.platform_role` before `20260714000005_multitenant_foundation_backfill.sql` added it (SQLSTATE 42703), while `private.has_org_role(uuid, text[])` compared enum `m.role` directly with a `text[]` element (expected SQLSTATE 42883).
- `20260714000002_multitenant_foundation_tables.sql` now adds `profiles.platform_role public.platform_role not null default 'user'` idempotently before the helpers; the duplicate addition in `20260714000005_multitenant_foundation_backfill.sql` remains unchanged.
- `20260714000003_multitenant_foundation_rls_helpers.sql` preserves its helper signature and now uses `m.role::text = any(roles)`.
- `git diff --check` passed with only the existing `openspec/config.yaml` LF-to-CRLF working-copy warning.
- Local-only `npx supabase start` applied all 17 migrations through `20260725000200_allow_legacy_signing_during_pdf_rollout.sql` and started the development setup.
- Start emitted `WARN: no files matched pattern: supabase/seed.sql` and still succeeded; the missing seed file is therefore not a blocker.
- `npx supabase status` reported the local setup running, with optional imgproxy and pooler services stopped.
- `npx supabase migration list --local` listed all 17 local versions through `20260725000200`. No destructive local reset was run.
- Focused RED command: `npx supabase test db --local supabase/tests/consent_integrity_diagnostics_test.sql` → exit `1`, final clean pgTAP plan `9`, executed `9`, failed `9`.
- The test-only contract was hardened after two plan-aborting attempts: the expected absent diagnostic function is now guarded through a `pg_temp` dynamic wrapper, and output names are inspected through `pg_catalog` instead of the unavailable `information_schema.routine_columns` relation. The final run had no SQL parse, bootstrap, or bad-plan error.
- Assertion failures identify all five absent additive columns, the absent reusable diagnostics function, missing bounded diagnostic rows, missing privacy-safe output projection, and a cross-studio consent insert that caught no exception instead of SQLSTATE `23503`.
- CLI creation: `npx supabase migration new consent_integrity_diagnostics` → `20260728020215_consent_integrity_diagnostics.sql`.
- Local-only apply: `npx supabase migration up --local`; local history lists version `20260728020215` after all 17 dependencies.
- Focused GREEN: `npx supabase test db --local supabase/tests/consent_integrity_diagnostics_test.sql` → exit `0`, `Tests=9`, `Result: PASS`.
- Prior local type generation command was `npx supabase gen types --local --schema public`; its fresh raw output had measured 31 additions / 13 deletions against HEAD and contained all five Row/Insert/Update fields plus `consents_artist_studio_fkey`.
- Correction RED: actual `git diff --numstat -- src/types/supabase.ts` had shown 742 additions / 722 deletions after formatter churn. The prior local regeneration then timed out against an unhealthy Docker engine; its empty temporary output was removed and no stale type output was substituted.
- Scoped policy remains exactly `{ "format": { "enabled": false } }`; no Docker/WSL operation was performed during hosted recovery.
- MCP target proof before writes: project URL exactly `https://urdvixfwdqovelnidcnw.supabase.co`; initial public table count `0`; initial migration-history count `0`. The configured/used ref was only `urdvixfwdqovelnidcnw`.
- Exact replay receipt: all 18 repository SQL files applied in lexical order with deterministic names `replay_<basename>` and `{"success":true}`. Hosted versions span `20260728181049` through `20260728181122`; source SHA-256 values were captured for every call.
- Post-replay catalog: eight RLS-enabled public tables; all five required columns; supporting unique constraint valid; composite FK and three checks present/unvalidated; diagnostics function present. Hosted defaults retain an `anon` table ACL, but there is no anon UPDATE RLS policy; `authenticated` has no attestation UPDATE privilege, and neither API role can execute diagnostics.
- Hosted test-harness deviation: enabled the available `pgtap` extension in `extensions`, then sent the exact repository script through MCP `execute_sql`; it was never applied as a migration. The result ended at `ok 9`, `finish()` produced no failure summary, and no parse/bootstrap/bad-plan error occurred, proving 9/9.
- Security advisors: two baseline warnings for the legacy `get_active_artists(text)` SECURITY DEFINER RPC. Performance advisors: 30 baseline/empty-project findings (4 unindexed FKs, 19 unused indexes, 7 multiple permissive policies). The required new composite-support index is unused only because the project is empty; no unit-1 regression was fixed and baseline findings were left unchanged.
- MCP generation wrote only the raw `types` payload to `src/types/supabase.ts`: 24,726 bytes, 771 lines, SHA-256 `a0ca9ae37657fd870d318867040c8be30ac13d26d31b10d98660f3d59b8e2229`, trailing newline; numstat **30 additions / 8 deletions**.
- Focused non-network TypeScript validation passed with `./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts`. Pi-lens/LSP reported zero blockers and three duplicate-string warnings intrinsic to generated code. All five fields occur exactly in Row/Insert/Update, and the composite relationship occurs once.
- TRIANGULATE expanded the plan from 9 to 33 assertions. Its first runtime reached `finish(): # Looks like you failed 2 tests of 33`; the exact failures were nullable rollout partial/complete representative writes accepted instead of SQLSTATE `23514`.
- The compact corrected check is `num_nonnulls(...) = CASE WHEN has_legal_representative IS TRUE THEN 9 ELSE 0 END`. The equivalent disposable-only correction migration `triangulate_fix_nullable_representative_integrity` succeeded, and the rerun reached `ok 33` with empty failure output: 33/33.
- REFACTOR verification: `npm run lint` (`tsc --noEmit`) exited 0; static SQL shape passed for plan 33, compact constraint, shared test helpers, and privacy assertion; `git diff --check` exited 0 with only the generated-types line-ending warning.
- Current implementation/test/tooling delta is **523 changed lines** under the user-authorized size exception: 26 historical replay-repair lines + 125 additive-migration lines + 329 pgTAP-test lines + 38 generated-type numstat lines + 5 scoped policy lines.

Production was not contacted. No studio repair/backfill, legacy constraint validation, destructive reset, or later work unit ran. Work-unit-1 TRIANGULATE/REFACTOR completed only on the repository and authorized disposable project as recorded above.

## Files changed in this apply attempt

- `supabase/migrations/20260707234503_add_artist_login_email.sql` — retained historical version; conditionally applies the alteration/index only when `public.artists` already exists.
- `supabase/migrations/20260708000227_initial_platform_schema.sql` — retained historical version; baseline now creates `login_email` and its partial case-insensitive unique index.
- `supabase/migrations/20260714000002_multitenant_foundation_tables.sql` — retained historical version; now adds `profiles.platform_role` idempotently before helper creation.
- `supabase/migrations/20260714000003_multitenant_foundation_rls_helpers.sql` — retained helper signature; casts the membership enum to text for the existing `text[]` comparison.
- `supabase/tests/consent_integrity_diagnostics_test.sql` — 33 synthetic assertions covering insert/update mismatch, all-nine complete-or-null representation boundaries, minor enforcement, sanitary attestation/clearing, and privacy-safe diagnostic types.
- `supabase/tests/studio_repair_rpc_test.sql` — 10 passing synthetic pgTAP assertions, including repeated repair preserving unrelated-slug sanitary data and verification.
- `supabase/migrations/20260728020215_consent_integrity_diagnostics.sql` — additive columns, unvalidated checks/FK, compact null-safe representative count rule, unique/index support, clearing trigger, diagnostics, and restricted attestation grant.
- `supabase/migrations/20260728201044_repair_vod_ink_studio.sql` — exact slug-scoped seven-field repair, safe sanitary category, and revoked rerun seam.
- `supabase/migrations/20260728201314_backfill_consent_representation.sql` — conservative complete/adult-null representation backfill with ambiguous rows preserved.
- `supabase/migrations/20260728202342_minimize_active_artists_rpc.sql` — four-field compatibility RPC projection.
- `src/types/.pi-lens.json` — new nested policy disabling only pi-lens formatting for generated types.
- `src/types/supabase.ts` — raw remote public-schema generated output only; no hand-authored or formatted fallback.
- `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-1-baseline.md` — cumulative unit-1 evidence.
- `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-2-baseline.md` — cumulative RED/GREEN/TRIANGULATE/REFACTOR receipts, verification gates, and disclosed line accounting.
- `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-3-baseline.md` — mocked Vitest receipts, public response/no-insert proof, and four sub-300-line review boundaries.
- `openspec/changes/repair-consent-studio-representative-flow/tasks.md` — at this earlier unit-3 checkpoint, units 1–3 were complete and the global cycle, units 4–9, and parent rows were still unchecked; later unit-4–9 reconciliation is recorded below, while parent rows remain deferred.
- `openspec/changes/repair-consent-studio-representative-flow/apply-progress.md` — this cumulative checkpoint.

Current implementation/test/tooling delta: **1,668 changed lines** = the prior 965-line units-1–2 delta + 703 unit-3 source/test lines. SDD/evidence metadata and unrelated `openspec/config.yaml` are excluded. Reviewability is governed by the approved auto-split boundaries rather than a hidden whole-change budget claim.

## Deviations from design

No database-design deviation. TRIANGULATE tightened the intended complete-or-null invariant for nullable rollout rows; `NOT VALID` still avoids scanning legacy rows while new writes with a null flag may carry only an all-null representative record. Test-harness corrections remain limited to explicit `C` collation/boolean comparisons, hosted `pgtap` enablement, and shared synthetic helpers. The authorized disposable hosted project replaces only the unhealthy local-Docker execution environment. The nested pi-lens file is a formatting policy for raw generated artifacts; diagnostics/autofix elsewhere remain enabled. `supabase_schema_complete.sql` stayed untouched because it is not the current per-migration snapshot convention.

## Implementation boundary — work units 1–9 complete

Work units 1–9 are complete and visibly checked after independent hosted verification. Global row 25 and parent-owned lifecycle rows 110–112 remain byte-for-byte unchanged and deferred; no parent verify/sync/archive, publication, or release occurred.

### 2026-07-28 work-unit-2 GREEN slice 2B authoring checkpoint — awaiting parent runtime/type verification

The parent-provided authoritative status selected exact change `repair-consent-studio-representative-flow`, marked apply and unit 2 ready, and limited this executor to `work-unit-2-green-slice-2B`. The approved delivery path is `auto-split`, slice `2B`, target 300 lines, single writer. `actionContext.mode` is `repo-local`; edits stayed within the allowed Supabase migration and OpenSpec/evidence roots. Warnings consumed: preserve dirty `main`, production forbidden, and runtime/database/type generation belongs to parent MCP. The stale native `changeName:null` status was not used.

Strict-TDD RED was already valid before this slice. Parent runtime evidence on disposable ref `urdvixfwdqovelnidcnw` proved that after slice 2A the exact nine-assertion transaction had **seven passing repair/backfill assertions and exactly two failing RPC assertions**. Production was untouched. Per the static-only boundary, this executor did not apply a migration, run the pgTAP transaction, or generate types.

`npx supabase migration new minimize_active_artists_rpc` created `supabase/migrations/20260728202342_minimize_active_artists_rpc.sql`; no timestamp was invented. The **29-line** migration drops and recreates `public.get_active_artists(text)` with the same input signature and exactly four ordered output columns: `id`, `full_name`, `qualification`, `photo_url`. It filters active artists by exact supplied studio slug, uses only qualified `public.artists` / `public.studios` relations, retains the current `SECURITY DEFINER` compatibility posture with `search_path = ''`, revokes `PUBLIC`, and grants execution only to the currently compatible `anon` and `authenticated` roles. DNI, studio ID, Drive ID, status, phone, tax/document, and other internal metadata are absent from both its return declaration and selected projection.

Static verification passed for the CLI filename, same text argument signature, exact ordered return allowlist, exact selected projection, active/exact-slug predicates, explicit empty search path, qualified relations, preserved privilege mode, and compatibility grants. Editor SQL diagnostics reported clean syntax. `git diff --check -- supabase/migrations/20260728202342_minimize_active_artists_rpc.sql` passed. The persisted work-unit-2 GREEN row remains visibly `- [ ]` as required because runtime GREEN and raw generated types are parent-owned follow-up for this slice; all parent-owned lifecycle rows remain unchanged.

Parent verification order is: (1) re-prove the disposable URL is exactly `https://urdvixfwdqovelnidcnw.supabase.co`; (2) apply only `20260728202342_minimize_active_artists_rpc.sql`; (3) execute the exact repository `supabase/tests/studio_repair_rpc_test.sql` transaction and require **9/9** with no `finish()` failure row; (4) generate raw Supabase TypeScript types from that migrated disposable schema and write the raw output to `src/types/supabase.ts`; (5) perform the parent runtime/type review, then mark overall unit-2 GREEN complete if all evidence agrees. Do not start TRIANGULATE or work unit 3 before that gate.

Slice-2B review accounting is **29 changed lines**, below the 300-line target and independently reversible by restoring only the minimal four-field RPC, never the sensitive legacy projection. No design deviation was introduced. At this historical authoring checkpoint, remaining risks were parent runtime confirmation of PostgreSQL drop/recreate behavior and generated return types, plus deployment ordering: the minimal RPC must remain callable for old clients until the unit-9 revoke/drop cutover.

### 2026-07-28 work-unit-2 GREEN completion and TRIANGULATE authoring checkpoint

The parent runtime re-proved the exact disposable URL and reported `success: true` for all three ordered unit-2 migrations: `20260728201044_repair_vod_ink_studio`, `20260728201314_backfill_consent_representation`, and `20260728202342_minimize_active_artists_rpc`. The split receipt is preserved: after 2A, the exact nine-assertion transaction was 7/9 with exactly the two RPC assertions failing; after 2B, it ended at `ok 9 - compatibility RPC returns only the active target artist display allowlist`, with no `finish()` failure or tool error and transaction rollback: **9/9 PASS**. Production was not contacted.

GREEN type finalization used a new same-directory temporary file and only the authorized generator command `npx supabase gen types --project-id urdvixfwdqovelnidcnw --schema public`; after a nonempty/type-payload check, the raw output atomically replaced `src/types/supabase.ts`, and the temporary file was removed. The file is **24,642 bytes / 768 lines**, SHA-256 `9576e26ecd61d891d12d07f7d00dd7f915fa84389860f3ad6488e51daac02951`, with final numstat against `HEAD` **30 additions / 11 deletions**. Relative to the prior raw unit-1 generated type, unit 2 deletes only the three old RPC return fields. A focused structural check proved exactly four RPC return fields (`full_name`, `id`, `photo_url`, `qualification`) and no `dni`, `studio_id`, or `drive_folder_id`. Focused `./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts` exited 0.

Unit-2 GREEN accounting remains inside the approved split boundaries: 2A incremental **141 lines** (67-line repair migration + 54-line backfill migration + 20-line existing-test adjustment); core-repair attribution **249 lines**; backfill attribution **124 lines**; 2B is **32 lines** (29-line RPC migration + three generated-type deletions). The GREEN test file was 275 lines. The persisted unit-2 GREEN checkbox is now `[x]`; no other implementation or parent-owned row was checked.

After GREEN, exactly one new synthetic TRIANGULATE boundary was authored. The unrelated-slug fixture now has a synthetic sanitary registration, authorization date, and attestation timestamp; one new `ok(...)` assertion requires two target repair calls to preserve all three unrelated values. The plan increased exactly from **9 to 10**, the file increased from 275 to **289 physical lines (+14)**, static counting proves plan 10 / 10 assertions, and the transaction still ends in rollback. This updated suite was deliberately not run, so no TRIANGULATE runtime pass is claimed and the TRIANGULATE checkbox remains `[ ]`.

The static hardcode check found the complete seven-field factual value set only in the scoped proposal/spec, repair migration, and pgTAP evidence; no PDF/browser/server runtime file contains that set. The distinctive exact address/postal/tax/phone literals have zero non-test PDF/browser runtime matches. Generic existing `VOD INK` branding and `Santander` location copy are not the seven-field factual record and were left unchanged. Focused `git diff --check` passed with only the existing generated-types LF→CRLF warning.

Exact parent next test requirement at that historical checkpoint was: re-prove the URL as `https://urdvixfwdqovelnidcnw.supabase.co`, execute the exact current `supabase/tests/studio_repair_rpc_test.sql` through project-scoped MCP `execute_sql`, require **10/10 PASS** with final assertion `ok 10 - compatibility RPC returns only the active target artist display allowlist`, no `finish()` failure row or tool error, and rollback. The completion receipt below satisfies that requirement.

### 2026-07-28 work-unit-2 TRIANGULATE and REFACTOR completion

Parent runtime evidence for the semantically exact current transaction ended at `ok 10 - compatibility RPC returns only the active target artist display allowlist`, with no `finish()` failure row or tool error, and rollback: **10/10 PASS**. The synthetic unrelated-slug registration, authorization date, and verification timestamp therefore remained byte/value unchanged across repeated target repair. Prior timeout and unavailable-tool attempts remain historical tooling evidence only, not current blockers. Production was untouched.

REFACTOR inspection found no useful behavior-preserving cleanup: repair, conservative backfill, and minimal RPC are already separate ordered migrations; repair and RPC remain independently reversible; existing private seams and test helpers are sufficiently narrow. No activity-only rewrite was made. The unchanged-focused-suite receipt is the parent-provided 10/10 execution.

Verification receipts:

- `./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts` → exit 0.
- `npm run lint` → `tsc --noEmit`, exit 0.
- `git diff --check -- . ':(exclude)openspec/config.yaml'` → passed; only the known generated-types LF→CRLF working-copy warning was emitted.
- Focused runtime grep → no `src/` runtime file contains the seven-field factual studio record; distinctive address/postal/tax/phone values have zero non-test PDF/browser matches. Generic `VOD INK` branding and `Santander` copy are not the factual persisted record.
- `src/types/supabase.ts` remains 24,642 bytes / 768 lines, SHA-256 `9576e26ecd61d891d12d07f7d00dd7f915fa84389860f3ad6488e51daac02951`, numstat 30/11.

Changed-line accounting, disclosed both as current file material and incremental attribution:

| Auto-split boundary | Current changed lines vs HEAD |
|---|---:|
| Repair migration | 67 |
| Backfill migration | 54 |
| Minimal RPC migration | 29 |
| Shared test/types | 330 = 289 test + 41 generated-type numstat |
| **Unit-2 target-file material** | **480** |

Avoiding double-counting the 38 generated-type lines already attributed to unit 1, unit 2 incrementally contributes **442 changed lines**: 255 RED + 141 GREEN 2A + 32 GREEN 2B/types + 14 TRIANGULATE. Approved review boundaries remain core repair 249, backfill 124, minimal RPC/types 32, and TRIANGULATE increment 14. Whole-apply implementation/test/tooling attribution remains **965** = unit 1 523 + unit 2 442; the cumulative size is intentionally not represented as a single ≤300 unit.

Persisted checkbox receipt: only unit-2 TRIANGULATE and REFACTOR changed from `[ ]` to `[x]` at this historical checkpoint. The global cycle, work units 3–9, and parent lifecycle rows were then unchecked; later unit-3–9 implementation completion is recorded below, while parent lifecycle remains deferred. No work-unit-3 code or test was started.

### 2026-07-28 work-unit-3 RED → GREEN → TRIANGULATE → REFACTOR completion

The parent authoritative status selected exact change `repair-consent-studio-representative-flow`, marked apply and unit 3 ready after completed units 1–2, and set `actionContext.mode=repo-local` with allowed roots `server`, `api`, `src`, this OpenSpec change, and its evidence directory. Delivery was authorized as single-writer `auto-split` at 300 lines; strict TDD used focused Vitest. This exact status superseded the stale injected ambiguous native status. Edits remained within allowed roots, and work unit 4 was not started.

Safety net `npm test -- server/consents.test.ts` passed 7/7 before source edits. RED authored four focused suites first and exited 1 for the intended missing behavior: missing server modules/endpoint, no stable inactive error code, a cross-studio consent insertion, absent `(artistId, studio_id, active)` query filters, and the browser's old Supabase-env/RPC dependency. GREEN implemented `resolvePublicStudio`, direct four-column active-artist discovery, same-origin Express/Vercel `GET /api/public/artists`, a display-only browser mapper, and consent creation bound to the resolved studio. The same focused command passed 13/13.

TRIANGULATE added whitespace/duplicate-context handling, an unknown artist, non-null photo, extra DNI/tax/studio/Drive/phone/document columns, old-RPC-shaped browser data, and equivalent success JSON. The focused suites passed 18/18. REFACTOR retained the narrow shared `PublicBoundaryError`/envelope and resolver without broad route rewrites. The final focused command including the pre-existing consent suite passed 25/25; `npm run lint` passed. The serverless ESM suite's first combined run hit only its default 5-second timeout; `npm test -- server/serverlessEsmResolution.test.ts --testTimeout=15000` then passed 2/2 in 1.483 seconds. Focused diff hygiene passed with only the known `src/lib/artists.ts` line-ending warning.

Response/no-insert evidence is bounded in `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-3-baseline.md`: public JSON keys are exactly `displayName`, `id`, `photoUrl`, `qualification`; browser selection objects contain only their four display equivalents; inactive, cross-studio, and unknown cases call neither `consents.insert` nor signature upsert; idempotency filters use the resolved studio; supplied tenant fields never reach authority; Express/Vercel emit identical 503 `PUBLIC_STUDIO_CONTEXT_INVALID` and 422 `ARTIST_NOT_AVAILABLE` envelopes without request markers in logs.

Approved coherent review boundaries are 3A resolver/direct discovery **215 lines**, 3B runtime adapters **209 lines**, 3C browser least privilege **105 lines**, and 3D scoped creation **174 lines**. Unit-3 material totals 703 changed lines across those four auto-split slices; no slice exceeds 300. Rollback disables endpoint/client switch and scoped creation together while retaining only the minimal RPC from unit 2. No RPC revoke/drop, production/database call, commit, push, PR, deploy, or external service call occurred.

Files changed in unit 3: `server/publicStudio.ts`, `server/publicArtists.ts`, `server/routes/publicArtists.ts`, `api/public/artists.ts`, `server.ts`, `src/lib/artists.ts`, `src/types.ts`, `server/consents.ts`, `server/routes/consents.ts`, `api/consents/index.ts`, four focused Vitest files, unit-3 evidence, `tasks.md`, and this cumulative progress artifact. The Vercel public endpoints are same-origin and no longer emit wildcard CORS origins. There was no design deviation. Missing real sanitary attestation remains an operational release blocker from earlier units, not a unit-3 implementation failure.

### Work-unit-5 RED → GREEN → TRIANGULATE → REFACTOR completion

Work unit 5 was implemented only within the wizard boundary. All fixtures are synthetic. `WizardPage` carries `tieneRepresentanteLegal`; `Step1_Client` derives presentation minority from the shared age calculator, forces minors represented with a disabled opt-out, permits adult opt-in/out, reuses and conditionally validates its existing representative form, clears representative fields on opt-out, and refreshes the navigation save closure when representation changes. `Step6_SignatureClient` derives sole signer ownership from representation rather than minority, so represented adults and minors share one public signature surface.

RED/GREEN/TRIANGULATE/REFACTOR evidence is recorded in `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-5-baseline.md`. The new `src/steps/Step1_Client.test.tsx` contains **7** focused jsdom interaction tests; the existing `src/steps/Step6_SignatureClient.test.tsx` contains **2** signature-attribution tests. The combined focused command passed **9/9** after the Step1 test-only DatePicker input mock and the existing provider/SignaturePad canvas mocks were isolated. `npm run lint` (`tsc --noEmit`) passed, and `git diff --check` passed with only pre-existing line-ending warnings. To keep the corrective coverage reviewable, this is the coherent **5A Step1 sub-split**: 243 test lines plus one dependency line (**244 behavior lines**, under the 300-line target); prior WizardPage/Step6 wiring remains the separate 5B boundary. Unit 5 remains within the approved wizard boundary; work unit 6 and later were not started.

### Work-unit-4 RED → GREEN → TRIANGULATE → REFACTOR completion

Authoritative parent status consumed: exact change `repair-consent-studio-representative-flow`, `applyState: ready`, `dependencies.apply: ready`, `actionContext.mode: repo-local`, next recommendation `Resume sdd-apply at work unit 4 RED`. At this historical checkpoint, only unit 4 was authorized; the subsequent unit-5 checkpoint records its later implementation. Workload guard was consumed as approved `auto-chain`/stacked-to-main with a 300-line coherent unit target. All fixtures and values are synthetic; no production/database/external mutation, commit, or publication occurred.

RED authored `src/domain/consents/age.test.ts` and focused server assertions before implementation. Initial focused Vitest failed on the missing age module and representation exports. GREEN added Europe/Madrid date-only age derivation (`AGE_OF_MAJORITY_YEARS = 18`), server-authoritative minority/representation derivation, complete-or-null representative persistence, and sole representative signer attribution. TRIANGULATE added leap-day, DST-adjacent, browser-claim mismatch, minor opt-out, partial/missing representative, represented-adult, and all-null counterexamples. REFACTOR centralized predicates and reran the same suite.

Focused command `npm test -- src/domain/consents/age.test.ts server/consents.test.ts` passed 14/14. `npm run lint` passed. `git diff --check` passed with existing LF/CRLF working-copy warnings only. Evidence: `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-4-baseline.md`.

### 2026-07-28 work-unit-4 corrective verification

Independent verification found a medium gap: helper-only tests did not prove a successful represented-adult `generateAndSubmitConsent` persistence flow, and `buildRepresentativePersistence(true, partial)` depended on earlier schema validation. The focused mocked test now captures the `consents.insert` payload and `consent_signatures.upsert`, proving server-derived `is_minor=false`, `has_legal_representative=true`, all nine representative fields including birth date/phone, resolved studio/artist IDs, representative signer attribution, and exactly one public signature. The represented persistence helper now parses `RepresentanteSchema` inside its represented branch and remains all-null when unrepresented.

Focused `npm test -- src/domain/consents/age.test.ts server/consents.test.ts` passes **15/15** (up from 14/14); `npm run lint` and `git diff --check` pass with only existing line-ending warnings. Unit-4 checkboxes remain complete; the later unit-5 checkpoint above records the wizard work. At this historical unit-4 checkpoint, remaining exact unchecked implementation rows began with work unit 6 RED; parent-owned lifecycle rows remain deferred. All fixtures and values are synthetic; no database, production, external service, commit, or publication action occurred.

Files changed for unit 4: `src/domain/consents/age.ts`, `src/domain/consents/age.test.ts`, `src/lib/schema.ts`, `src/types.ts`, `server/consents.ts`, `server/consents.test.ts`, plus this progress artifact, tasks checkboxes, and unit-4 evidence. No database runtime evidence is claimed. With unit 5 now complete, remaining exact unchecked implementation rows begin with work unit 6 RED; parent-owned lifecycle rows remain deferred.

### 2026-07-28 work-unit-6 corrective verification — split 6A/6B

The dirty worktree already contained a partial unit-6 sanitary gate/finalization implementation. This repair stayed inside the unit-6 surface and did not start unit 7. All fixtures, hashes, IDs, signatures, Storage bytes, Drive metadata, and origins are synthetic; no database, production, Storage, Drive, or other external service was contacted.

Strict-TDD evidence for the safety blockers:

- **RED:** after adding focused regression assertions, `npm test -- server/consents.test.ts --testTimeout=15000` failed **4/26**: stale Drive claims were not recovered, fresh claims were not protected by a bounded check, a signed winner regressed to `upload_error`, and signed retry skipped missing-Drive reconciliation.
- **GREEN:** `server/consents.ts` now uses a status compare-and-set for `markUploadError`, a five-minute Drive claim TTL with separate null/stale CAS predicates, and a signed-retry Storage download/hash check before Drive reconciliation. The same focused command passed **26/26**.
- **TRIANGULATE:** tests cover a stale claim, a fresh claim, repeated/concurrent same-content calls, different hashes, object/file/signed-update crash boundaries, Storage `upsert: false`, Drive consent/hash metadata, and missing-Drive signed retry. Mocked adapter coverage passed **5/5** (`server/publicAdapters.test.ts`, `server/drive.test.ts`).
- **REFACTOR:** the final focused suites were rerun unchanged after byte-conversion hardening; `npm run lint` and focused `git diff --check` passed. No activity-only rewrite, DB call, or external call was introduced.

Coherent review boundaries are retained because the existing partial unit-6 material exceeds one review unit:

| Boundary | Scope | Physical review material |
|---|---|---:|
| 6A | sanitary gate, immutable generation/hash claims, Storage/file/signature persistence, status CAS, and gate tests | `server/consents.ts` lines 278–502 (225) + `server/consents.test.ts` lines 235–546 (312); shared harness is counted once here |
| 6B | Drive metadata, one-copy claim/recovery, signed retry from existing bytes, and adapter parity/CORS coverage | `server/consents.ts` lines 503–750 (248) + `server/consents.test.ts` lines 547–711 (165) + `server/drive.ts` (102) + `server/drive.test.ts` (52) + adapter additions (70) |

These are behavior boundaries, not publication commits. The unit-6 implementation rows are reconciled after independent verification; parent-owned lifecycle rows remain deferred. Unit 7 and later units remain untouched. Production sanitary attestation is still an operational release blocker and finalization remains fail-closed until authorized real data is supplied.

### Work-unit-7 RED → GREEN → TRIANGULATE → REFACTOR completion

The exact change remained `repair-consent-studio-representative-flow`; only work unit 7 was implemented. Strict TDD used focused jsdom/component and client-contract tests with synthetic IDs, signatures, names, and response envelopes. No database, Storage, Drive, production, public wizard, consent creation, commit, publication, or work unit 8+ action occurred.

RED authored `src/components/artist/ArtistRetryUx.test.tsx` first. `npm test -- src/components/artist/ArtistRetryUx.test.tsx` failed **7/7** because the structured stable error object was rendered directly and no retry action existed. GREEN added `src/lib/artistFinalization.ts`, wired `ArtistPage` to preserve the stable 409 envelope and call the existing same-ID sign-artist route, and added the modal retry action. The initial focused component safety net passed **9/9**.

TRIANGULATE added a synthetic client-contract test for repeated blocked calls and successful retry after mocked attestation, plus modal coverage for repeated blocked retry, close/reopen, same-consent technique refresh without signature loss, generic 500, auth 401/403, content conflict, and recoverable upload failure. The corrective jsdom coverage now also renders the real pending artist card/status and exercises page-level `ArtistPage` → `ArtistConsents` artist-ID wiring, same-ID retry with the current signature, and retention of the `pending_artist` card after a stable 409. The exact focused suites passed **16/16**, and the standalone page-level test passed **1/1**. REFACTOR centralized error-to-action mapping and reused existing form/signature state; the new card test exposed that the intervention action had only a title, so `ArtistConsents` now adds the matching accessible label without changing its visible behavior or server invariant.

Unit-7 review material is coherently split below the 300-line target: **7A = 285 lines** (`artistFinalization.ts`, its tests, the `ArtistPage` patch, and `ArtistPage.test.tsx`); **7B = 290 lines** (`InterventionModal` patch, the `ArtistConsents` accessible-label correction, and `ArtistRetryUx.test.tsx`). Evidence is recorded in `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-7-baseline.md`. `npm run lint` passed, and focused `git diff --check` reported no whitespace errors in the unit-7 files; unrelated dirty-worktree line-ending warnings remain. At this historical unit-7 checkpoint, only unit-7 implementation rows were checked in `tasks.md`; global, parent-owned, and units 8–9 rows were still unchecked.

### Work-unit-8 RED → GREEN → TRIANGULATE → REFACTOR completion

The exact change remained `repair-consent-studio-representative-flow`; only work unit 8 was implemented. All people, UUIDs, identifiers, sanitary values, signatures, and long values are synthetic. No database, production, Storage, Drive, external-service, commit, publication, deployment, or work-unit-9 action occurred.

RED added focused canonical v3 schema/data/PDF tests first. The focused command `npm test -- src/domain/consents/consentPdfSchema.test.ts server/consentPdfData.test.ts src/lib/pdf.test.ts --testTimeout=15000` exited 1 with 8 intended failures of 39: the new representation field was unrecognized, the builder still emitted `consent-v2`/minor-derived representation, and v3 renderer fixtures could not parse. GREEN added `tieneRepresentanteLegal`, `consent-v3-representation`, `has_legal_representative` sourcing, complete persisted birth date/phone data, and representation-driven rendering/signer layout; the same command passed 39/39.

TRIANGULATE added v3 missing-flag, adult/minor persisted-state, empty/partial representative, snapshot identity, all-three-state, deterministic-byte, extracted-text, and long multi-page synthetic counterexamples. The focused command passed 44/44. REFACTOR retained the extracted `hasLegalRepresentation` and `buildRepresentative` helpers, corrected the added representative line's measured section height, and reran the same 44/44 suite unchanged. `npm run lint` passed (`tsc --noEmit`), and `git diff --check` passed with only existing line-ending warnings.

Unit-8 material is one coherent **260 changed-line** slice (234 additions, 26 deletions across the six approved source/test files), below the 300-line target; no 8A/8B split was required. `server/consents.ts` already persists the composed snapshot and `document.templateVersion`, so newly composed/finalized documents now carry v3 while signed-consent early returns and legacy v1/v2 artifacts remain untouched. Evidence is recorded in `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-8-baseline.md`. At this historical unit-8 checkpoint, only unit-8 implementation rows were checked in `tasks.md`; global, parent-owned, and unit-9 rows remained unchanged/unchecked. Production sanitary attestation remains the previously documented operational blocker and finalization stays fail-closed.

### Work-unit-9 implementation checkpoint — split 9A/9B, runtime blocked

Unit 9 remained the only implementation boundary. It was split coherently because the complete unit material is 428 physical lines: 9A validation/readiness is 265 lines (`20260729031823_validate_consent_integrity.sql` + `consent_integrity_validation_test.sql`), and 9B RPC removal/final verification is approximately 176 lines (`20260729031830_remove_active_artists_rpc.sql` + `consent_integrity_final_test.sql` + generated-type delta). Each slice remains below the 300-line review target; the combined unit is not represented as one budget claim.

RED authored privacy-safe readiness/final SQL contracts with synthetic UUIDs and values. The exact local commands were attempted, but Docker Desktop's Linux engine was unavailable and both `npx supabase test db --local ...` commands exited 1 before PostgreSQL connection; this remains a local execution blocker. Separately, an authorized disposable hosted transaction on `urdvixfwdqovelnidcnw` temporarily dropped the post-validation `NOT NULL` and validated constraints inside one transaction, ran a 4-assertion readiness safety net, and returned `finish(): # Looks like you failed 4 tests of 4`. This is a genuine synthetic assertion-level RED receipt, not a connection/setup failure; the transaction rolled back, no durable schema change occurred, and production remained untouched. CLI-generated migration timestamps are `20260729031823` and `20260729031830`, in lexical order after the minimal four-field RPC migration.

GREEN source work is present: the validation migration locks/counts the unique target, aborts on unresolved representation or mismatch diagnostics, sets `has_legal_representative NOT NULL`, validates representation checks/composite FK/sanitary check, and the follow-up explicitly revokes API-role execution and drops the legacy RPC. Local migration apply, pgTAP GREEN, TRIANGULATE, advisors, and raw CLI type generation remain unverified because local Supabase is unavailable; later hosted GREEN and raw type-generation receipts are recorded below. No production or unapproved target was used. The checked-in type shape was reconciled to the expected post-migration schema, but generator output is a residual risk at this historical checkpoint.

TRIANGULATE coverage is authored for insert/update constraint enforcement, direct RPC absence/permission, endpoint independence, repeated target repair, and finalized consent/file immutability. Existing public boundary/server focused Vitest passed 42/42. REFACTOR `npm run lint` and `npm run build` passed; `npm test` and `npm run test:coverage` each retain the same nine unrelated `document is not defined` failures in the pre-existing unit-5 jsdom tests. Evidence: `docs/implementation-evidence/repair-consent-studio-representative-flow/unit-9-baseline.md`.

Local isolated database receipts remain unavailable because Docker is blocked; the independent hosted receipts recorded below completed unit-9 verification and its implementation task rows are now reconciled. Global row 25 and parent lifecycle rows 110–112 remain byte-for-byte unchecked. Production sanitary attestation remains an operational release blocker and finalization remains fail-closed.

### Authorized hosted readiness counterexample and correction

The authorized disposable hosted project `urdvixfwdqovelnidcnw` had both unit-9 migrations applied successfully, and its privacy-safe inventory was clean: one target studio and zero consent/mismatch/partial/null-representation findings. The exact `supabase/tests/consent_integrity_validation_test.sql` transaction exposed a false failure after validation because the readiness branch used `not exists` against `private.consent_integrity_diagnostics('vod-ink')`. That diagnostic function deliberately preserves fixed category rows, so zero findings still returns the four blocking category rows with `finding_count = 0`.

The test-only correction replaces only that readiness predicate with `coalesce((select sum(finding_count) ...), 0) = 0` over the four blocking categories. The fixed-category projection contract and both unit-9 migrations are unchanged. At this earlier correction checkpoint, the corrected exact hosted readiness and final transactions were still pending; the independent receipts recorded below now verify completion and reconcile all unit-9 implementation task rows.

### Authorized hosted final-test counterexample and correction

The corrected exact validation transaction then reached **8/8** on the same disposable ref. The exact `supabase/tests/consent_integrity_final_test.sql` transaction failed before assertions with SQLSTATE `42702`: its repeated-repair idempotency assertion selected unqualified live-row columns while cross joining `public.studios s` and `repair_before b`, so PostgreSQL reported the column references as ambiguous.

The final-test idempotency assertion now qualifies the live row as `s.legal_name`, `s.trade_name`, `s.address`, `s.city`, `s.postal_code`, `s.tax_id`, `s.phone`, `s.health_registration_number`, `s.health_authorization_date`, and `s.health_data_verified_at`. Its post-validation diagnostics assertion also now uses `coalesce((select sum(finding_count) ...), 0) = 0` over the four blocking categories instead of `not exists`; the fixed-category diagnostics function always returns those category rows with zero counts. Both unit-9 migrations remain unchanged.

At this earlier correction checkpoint, the corrected exact final transaction still required a hosted rerun and attestation; the independent 10/10 receipt recorded below now completes verification and reconciles all unit-9 implementation task rows.

Production remained untouched; no real data, commit, push, PR, deploy, or archive/sync action occurred.

### 2026-07-29 unit-9 hosted receipt and raw generator verification

This checkpoint supersedes the earlier chronological notes that were awaiting the corrected hosted reruns; those notes remain historical checkpoints. The 8/8 and 10/10 receipts below complete independent verification and reconcile the unit-9 implementation task rows; parent-owned lifecycle remains deferred.

- Authorized target remained disposable Supabase project `urdvixfwdqovelnidcnw` only. The privacy-safe inventory was clean before validation: exactly one `slug='vod-ink'` studio and zero consent/artist-studio mismatch, partial/conflicting, or null-representation findings. No production or unapproved target was contacted.
- Both CLI-generated migrations were applied successfully in lexical order after `20260728202342_minimize_active_artists_rpc.sql`: `supabase/migrations/20260729031823_validate_consent_integrity.sql`, then `supabase/migrations/20260729031830_remove_active_artists_rpc.sql`.
- The corrected readiness contract uses `coalesce((select sum(finding_count) ...), 0) = 0` over the four blocking categories, preserving the fixed-category zero-count projection. The exact current hosted `supabase/tests/consent_integrity_validation_test.sql` receipt is **8/8 PASS with rollback**.
- The corrected final contract qualifies all live repair columns (`s.legal_name`, `s.trade_name`, `s.address`, `s.city`, `s.postal_code`, `s.tax_id`, `s.phone`, `s.health_registration_number`, `s.health_authorization_date`, `s.health_data_verified_at`) and uses the same aggregate diagnostics predicate. The exact current hosted `supabase/tests/consent_integrity_final_test.sql` receipt is **10/10 PASS with rollback**.
- This executor had no hosted Supabase MCP namespace exposed, so no new SQL execution is claimed; the 8/8 and 10/10 results are the parent-provided receipts for the authorized disposable project.
- `npx supabase gen types --help` confirmed the flags and `npx supabase --version` reported `2.110.0`. The authorized command `npx supabase gen types --project-id urdvixfwdqovelnidcnw --schema public` succeeded with non-empty raw output: **24,432 bytes / 760 lines**, SHA-256 `665ee77b3dba2e2d0896c9705ecc70d0cac21eb239ad0523b7a7443cc812708f`, trailing newline. `src/types/supabase.ts` now matches that output byte-for-byte; no formatter or guessed shape was used.
- Focused validation passed: `./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts`, `npm run lint`, and exact generator diff `set -o pipefail; npx supabase gen types --project-id urdvixfwdqovelnidcnw --schema public | diff -u src/types/supabase.ts -`.
- Residual blocker is local Docker availability: local Supabase apply/tests and local advisor/security checks remain unverified. The previously recorded full-suite nine jsdom failures are unrelated. Unit-9 implementation checkboxes were reconciled after independent verification; parent-owned lifecycle rows remain unchanged and deferred. Production sanitary attestation remains missing and finalization stays fail-closed.

### Follow-up full-suite verification after unit-5 jsdom directives

This follow-up records the current working-tree result after adding only the standard file-level `// @vitest-environment jsdom` directive to `src/steps/Step1_Client.test.tsx` and `src/steps/Step6_SignatureClient.test.tsx`. It supersedes the earlier full-suite jsdom-failure status above; unit-9 implementation task rows are reconciled after independent verification.

- `npm test` **passed**: 18 test files and 131 tests passed, including the 7 Step1 and 2 Step6 component tests; no `document is not defined` failures remain.
- `npm run test:coverage` **did not pass as a command**: all 18 files and 131 tests passed, but the existing 100% threshold for `src/domain/consents/consentPdfSchema.ts` failed at 98.07% statements/lines and 96% branches. No jsdom/document-environment failure occurred.
- `npm run lint` **passed** (`tsc --noEmit`).
- `git diff --check` **passed** with the repository's existing LF-to-CRLF working-copy warnings only.
- Verification stayed synthetic-only: no production, database, Storage, Drive, external API, commit, or publication action occurred. No production source or unit-9 migration was changed; unit-9 implementation task rows are reconciled after independent verification, and parent lifecycle rows remain deferred.

### Coverage blocker follow-up

- Added one focused synthetic v3-minor rejection test for `esMenor: true`, `tieneRepresentanteLegal: false`, and `representante: null`; `npm run test:coverage` now **passes** with 18 test files and 132 tests. `src/domain/consents/consentPdfSchema.ts` reports **100% statements, branches, functions, and lines** (overall 98.41% statements/lines, 96.32% branches). Unit-9 implementation task rows are reconciled after independent verification; parent-owned lifecycle remains deferred and no publication or release occurred.
