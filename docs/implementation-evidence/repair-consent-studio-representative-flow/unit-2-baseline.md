# Work unit 2 baseline — scoped studio repair and minimal RPC

Date: 2026-07-28

## Safety and scope

- Cumulative single-writer evidence through complete work-unit-2 RED → GREEN → TRIANGULATE → REFACTOR; work unit 3 remains unstarted.
- All UUIDs, people, identifiers, and sanitary values in the test are synthetic.
- Authorized isolated target: disposable Supabase project `urdvixfwdqovelnidcnw`.
- Parent-routed target proof: `https://urdvixfwdqovelnidcnw.supabase.co`.
- Production project `igppobmclturtmzqpcyx` was not contacted.
- Slice 2B performed static checks only. No database apply, generated-type change, production mutation, destructive operation, commit, push, PR, or deploy occurred in this checkpoint.

## RED contract

Test file: `supabase/tests/studio_repair_rpc_test.sql`

- Physical size: **255 lines**.
- pgTAP plan: **9 assertions**.
- The transaction uses synthetic fixtures and ends with `rollback`.
- Coverage includes repeated exact seven-field repair, exact demo-pair clearing, mixed/missing/different sanitary preservation, null verification, zero/duplicate target aborts, conservative representation backfill, a revoked `SECURITY INVOKER` private repair seam, and a four-field compatibility RPC.

## Parent-routed runtime RED

The parent verified the disposable project URL and sent the semantically exact repository transaction through project-scoped Supabase MCP `execute_sql`.

Result:

```text
# Looks like you failed 8 tests of 9
```

The run completed without SQL parse, harness bootstrap, or bad-plan error, and the enclosing transaction rolled back. Exactly one assertion passed, but the returned MCP result did not identify it; this evidence therefore does not guess which assertion passed. The eight failures establish valid RED for the absent repair/backfill seam and minimal-RPC behavior.

## Delivery decision

The RED test consumed **255/300 lines**. The user selected a coherent 2A repair/backfill versus 2B RPC split and authorized automatic sub-splitting near 300 lines. Slice 2A further separates its review attribution between the core repair and conservative backfill while retaining lexical migration order.

## GREEN slice 2A authoring — awaiting parent MCP

CLI-created migrations:

1. `supabase/migrations/20260728201044_repair_vod_ink_studio.sql` — 67 lines.
2. `supabase/migrations/20260728201314_backfill_consent_representation.sql` — 54 lines.

The repair migration defines/invokes a revoked `SECURITY INVOKER` private seam with empty search path. It locks and counts `slug='vod-ink'`, raises `P0001` unless exactly one row exists, applies only the approved seven fields, pair-clears only the exact demo sanitary values, preserves other states, leaves attestation null, and returns a privacy-safe category. The ordered backfill migration defines/invokes a separately revoked private seam: complete nine-field records become represented, adult all-null records become unrepresented, and ambiguous rows remain nullable without representative-value changes.

`supabase/tests/studio_repair_rpc_test.sql` is now 275 lines. Its 20-line slice-2A adjustment restores a synthetic pre-repair/demo target before the first explicit rerun, routes the helper through both private seams, and verifies both privilege postures. Static shape and `git diff --check` passed. No public schema signature changed.

Review accounting:

- Prior RED checkpoint: 255 lines.
- Incremental GREEN 2A: **141 lines** = 67 repair migration + 54 backfill migration + 20 test adjustment.
- Core-repair attributable slice: **249 lines** = 182 test/harness + 67 migration.
- Backfill attributable slice: **124 lines** = 70 test + 54 migration.

Parent apply order is lexical: verify disposable URL, apply `20260728201044`, apply `20260728201314`, then execute the exact repository pgTAP transaction. The expected intermediate result is 7 repair/backfill assertions passing and only 2 minimal-RPC assertions still failing. Overall unit-2 GREEN remains unchecked until slice 2B and the full suite pass.

## GREEN slice 2A parent runtime checkpoint

The parent verified the disposable project URL exactly, applied slice 2A, and reported the exact nine-assertion repository transaction at **7/9**: all seven repair/backfill assertions passed and only the two RPC signature/allowlist assertions failed. Production remained untouched. This is the valid RED inherited by slice 2B.

## GREEN slice 2B authoring — awaiting parent runtime/type verification

Required CLI creation:

```text
npx supabase migration new minimize_active_artists_rpc
Created new migration at supabase\\migrations\\20260728202342_minimize_active_artists_rpc.sql
```

The new migration is **29 physical lines**. It drops/recreates `public.get_active_artists(text)` with the unchanged text input signature and exactly four ordered return fields: `id`, `full_name`, `qualification`, `photo_url`. Its query returns only active artists whose joined studio has the exact supplied slug. Relations are schema-qualified, `search_path` is explicitly empty, and the current `SECURITY DEFINER` plus `anon`/`authenticated` compatibility posture is retained after revoking `PUBLIC`. The declaration and projection expose no DNI, studio ID, Drive ID, status, phone, tax/document, or other internal metadata.

Static checks passed for filename provenance, signature, return/output allowlists, active and slug filters, empty search path, qualified relations, privilege posture, 29-line count, editor SQL diagnostics, and focused `git diff --check`. No runtime pass was claimed at that authoring checkpoint. The required parent order was URL proof → apply only `20260728202342_minimize_active_artists_rpc.sql` → exact repository pgTAP transaction expected **9/9** → raw Supabase TypeScript generation/write → runtime/type review.

## GREEN completion receipt

The parent runtime re-proved the exact disposable URL and reported successful application of all three ordered unit-2 migrations: `20260728201044_repair_vod_ink_studio`, `20260728201314_backfill_consent_representation`, and `20260728202342_minimize_active_artists_rpc`. After 2A, the exact repository suite was 7/9 with only the two RPC assertions failing. After 2B, it ended at `ok 9 - compatibility RPC returns only the active target artist display allowlist`, with no `finish()` failure or tool error and transaction rollback: **9/9 PASS**. Production was not contacted.

Raw public types were regenerated to a same-directory temporary file with only:

```text
npx supabase gen types --project-id urdvixfwdqovelnidcnw --schema public
```

The nonempty raw output atomically replaced `src/types/supabase.ts`; the temporary file was removed. Result: **24,642 bytes**, **768 lines**, SHA-256 `9576e26ecd61d891d12d07f7d00dd7f915fa84389860f3ad6488e51daac02951`. The compatibility RPC type contains exactly `full_name`, `id`, `photo_url`, and `qualification`; `dni`, `studio_id`, and `drive_folder_id` were removed. Focused `tsc` passed:

```text
./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts
```

The generated file's final numstat against `HEAD` is **30 additions / 11 deletions**. Relative to the prior unit-1 raw generated artifact, unit 2 removes the three legacy RPC return fields. GREEN review accounting remains split below budget: 2A incremental **141 lines**; 2B migration **29 lines** plus the three-field generated-type deletion (**32-line slice**). Migration physical sizes are 67, 54, and 29 lines.

## Post-GREEN TRIANGULATE authoring — awaiting parent MCP

Exactly one new synthetic boundary was authored in `supabase/tests/studio_repair_rpc_test.sql`. The unrelated studio fixture now carries a synthetic sanitary number/date and attestation timestamp, and one new pgTAP assertion requires repeated repair to preserve all three values. The plan increased exactly from **9 to 10**; static inspection confirms 10 `ok(...)` assertions, transaction rollback, and a **289-line** test file (**+14 lines** from GREEN). The updated suite was deliberately not executed, so TRIANGULATE and REFACTOR remain incomplete.

Static hardcode inspection found the complete seven-field factual value set only in the scoped proposal/spec, repair migration, and pgTAP evidence. No PDF/browser/server runtime file contains that complete set; the four distinctive address/postal/tax/phone literals have zero non-test PDF/browser runtime matches. Existing generic `VOD INK` branding and `Santander` location copy remain outside the factual seven-field record and were not changed.

Exact parent runtime requirement at this historical checkpoint was: re-prove `https://urdvixfwdqovelnidcnw.supabase.co`, execute the exact current `supabase/tests/studio_repair_rpc_test.sql` through project-scoped MCP `execute_sql`, require **10/10 PASS**, no `finish()` failure row or tool error, and confirm rollback. That requirement is satisfied by the completion receipt below.

## TRIANGULATE completion receipt

The parent reran the semantically exact current 10-assertion transaction on the disposable project. The last meaningful result was:

```text
ok 10 - compatibility RPC returns only the active target artist display allowlist
```

There was no `finish()` failure row or tool error, and the enclosing transaction rolled back: **10/10 PASS**. The new unrelated-slug counterexample therefore proves that repeated target repair preserves the synthetic unrelated studio's sanitary registration, authorization date, and verification timestamp byte/value-for-value. Existing cases still cover the exact pair, mixed, missing-member, different-pair, zero/duplicate target, conservative representation states, and the minimal four-field RPC. Production was untouched.

## REFACTOR completion receipt

Inspection found no useful behavior-preserving cleanup beyond the existing separation: repair, conservative backfill, and compatibility RPC remain three ordered migrations, and repair versus RPC can be rolled back independently. The compact private seams and shared pgTAP helpers already avoid material duplication. No activity-only SQL or test rewrite was made, so the 10/10 TRIANGULATE execution is also the unchanged focused-suite receipt after refactor inspection.

Verification gates:

- Focused generated-type check passed: `./node_modules/.bin/tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src/types/supabase.ts`.
- Repository lint passed: `npm run lint` → `tsc --noEmit`, exit 0.
- `git diff --check -- . ':(exclude)openspec/config.yaml'` passed. The only output was the known generated-types LF→CRLF working-copy warning.
- Static runtime scan found no file under `src/` containing the seven-field factual studio record. The distinctive address, postal code, tax ID, and phone have zero non-test matches in PDF/browser runtime candidates. Generic `VOD INK` branding and `Santander` UI/location copy remain and are not persisted factual-record hardcoding.
- Raw generated types remain **24,642 bytes / 768 lines**, SHA-256 `9576e26ecd61d891d12d07f7d00dd7f915fa84389860f3ad6488e51daac02951`, with Git numstat **30 additions / 11 deletions**.

## Work-unit-2 changed-line accounting

No cumulative size is hidden:

| Boundary | Changed lines | Basis |
|---|---:|---|
| Repair migration | 67 | Entire new CLI-generated repair migration |
| Backfill migration | 54 | Entire new CLI-generated backfill migration |
| Minimal RPC migration | 29 | Entire new CLI-generated RPC migration |
| Shared pgTAP test + generated types | 330 | 289-line new test + current type numstat 30/11 = 41 |
| **Current unit-2 target-file material vs HEAD** | **480** | 67 + 54 + 29 + 330 |

For cumulative work-unit attribution without double-counting the 38 generated-type lines already charged to unit 1, unit 2 contributes **442 changed lines**: 255 RED test + 141 slice-2A GREEN + 32 slice-2B GREEN/types + 14 TRIANGULATE test. The approved review sub-boundaries remain: core repair **249**, conservative backfill **124**, minimal RPC/types **32**, and the post-GREEN TRIANGULATE increment **14**. Whole-apply implementation/test/tooling attribution remains **965 changed lines** = prior unit 1 **523** + unit 2 **442**. Reviewability relies on the approved auto-split rather than a false single-unit ≤300 claim.

## Unit boundary

Work unit 2 is complete. No work-unit-3 source, test, migration, or artifact was started. Missing authorized real sanitary attestation remains an operational release risk and must keep production finalization fail-closed; it is not a unit-2 implementation failure.
