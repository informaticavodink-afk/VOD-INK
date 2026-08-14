## Exploration: Two-phase completion of registration-number-only attestation

### Current State

The worktree is dirty and the whole active change directory is untracked. Accepted local work includes A1 plus the exact `pg`, `@types/pg`, and repository-local Supabase CLI pins. `A2a-infra-3` is still 0/4: its last direct Codex run proved the six DML waits and both lock interleavings, then failed the private Docker resource-baseline check and rolled the harness back. The SQL test is restored to its 110-line baseline; no concurrency harness exists. Two residual Docker volumes were reported after that run, but this planning phase neither inspects nor removes them.

The authorization date is still active in the admin form/client, server parser and legacy settings RPC call, direct finalization readiness check, canonical composer/types/schema, and PDF renderer. Existing tests encode that pair-required behavior. The nullable PostgreSQL column also appears in generated table types and historical migrations/tests; those compatibility and historical references are not removal targets. The in-progress compatibility migration already preserves date state while beginning registration-bound attestation and signed-document protections, but later database units and their evidence are incomplete.

The existing OpenSpec proposal/spec/design already express the approved product rule: future consents use only the attested official registration number, while historical signed snapshots, file metadata, Storage objects, and PDF bytes remain immutable. Existing tasks forecast 14 bounded implementation units under a stricter 300-line budget, so they satisfy the user's 400-line maximum if retained. Strict TDD requires focused tests inside each implementation slice; therefore Phase 2 can be comprehensive integration/regression verification after Phase 1, but it cannot replace each slice's RED/GREEN evidence.

### Affected Areas

- `supabase/migrations/20260812122407_registration_attestation_compatibility.sql` — finish the disabled compatibility contract, locking, invariants, RPCs, audit, and later activation without rewriting date history.
- `supabase/tests/*.sql` and planned `supabase/tests/all_signed_final_file_concurrency.test.ts` — database invariants, role/ACL behavior, transactionality, concurrency, immutability, and compatibility evidence.
- `server/studioSettings.ts`, `server/routes/studioSettings.ts`, `api/studio-settings.ts`, `api/_lib/parseBody.ts` — narrow active settings DTO/parser, safe adapter parity, and registration-only mutation RPC.
- `src/lib/studioSettingsClient.ts`, `src/components/admin/StudioSettingsManager.tsx` — remove active date state, field, copy, and transport while retaining explicit attestation.
- `server/consents.ts` — replace direct date-based readiness with the fail-closed versioned context RPC before any finalization side effect.
- `server/consentPdfData.ts`, `src/domain/consents/consentPdfSchema.ts`, `src/types.ts` — add an exact registration-only future document version while preserving legacy/v2/v3 reads.
- `src/lib/pdf.ts` — render registration without a date for new v4 documents and retain historical version rendering.
- `src/types/supabase.ts` — regenerate RPC signatures; the preserved nullable table column may legitimately remain in generated database row types.
- Focused Vitest suites under `server/` and `src/` — update active-contract expectations and prove retry, ordering, schema, PDF text/layout, and historical immutability.
- `package.json`, `package-lock.json` — accepted exact local test-tool pins; preserve byte-for-byte unless a separately justified dependency slice is required.

### Approaches

1. **Retain the existing bounded dependency chain and regroup it into two user-facing phases** — finish each database/application unit with its focused TDD tests, then run a separate comprehensive verification phase.
   - Pros: Preserves accepted work and security sequencing; every PR remains below both 300 and 400 lines; keeps database compatibility fail-closed; gives concurrency and historical immutability independent review boundaries.
   - Cons: More PRs and sequential gates; `A2a-infra-3` must be repaired before dependent database work can continue; Phase 1 necessarily contains focused testing.
   - Effort: High

2. **Collapse removal into a small UI/API/PDF patch and test afterward** — delete visible date usage first, leaving database/versioning repairs for later.
   - Pros: Faster visible change and fewer immediate files.
   - Cons: Violates strict TDD and the existing specs; risks mixed-version bypasses, stale attestation, direct-finalization side effects, and unreadable or reinterpreted historical documents; likely exceeds 400 lines once adequate regression tests are added.
   - Effort: Medium initially, High to repair safely

### Recommendation

Use approach 1 with `auto-chain` and `stacked-to-main`. Treat the two phases as:

1. **Phase 1 — implement registration-number-only future flow.** Resume at `A2a-infra-3`, then complete the existing dependency order `A2a → A2b → A3 → A4 → C → D → E → F → G`, followed only after its operational gate by activation unit `B`. Keep each existing unit as its own autonomous PR (or split it further before 400 attributed changed lines). Focused RED/GREEN/TRIANGULATE/REFACTOR tests travel with each implementation PR. Preserve the nullable date column, historical migrations, legacy/v2/v3 parsers/renderers, and every already-finalized artifact; remove the date only from active future DTOs, readiness, v4 composition, and v4 rendering.
2. **Phase 2 — comprehensive verification of all repairs.** After Phase 1 implementation is complete in the compatible disabled state, run the full Vitest suite, lint, build, all focused pgTAP suites, the accepted two-project concurrency harness, finalization ordering/idempotency tests, canonical v4 and historical parser tests, extracted PDF text/layout checks, ACL/privacy/static guards, migration transaction/ledger checks, and exact dirty/resource cleanup checks. Any discovered fix receives a new focused TDD PR capped at 400 lines and the complete Phase 2 matrix is rerun. Production migration, deployment, Aitana's real registration entry, and final production E2E remain explicit lifecycle gates rather than implied by local green tests.

The existing 14-unit forecast is safer than merging units merely because the user raised the maximum from 300 to 400. A PR's attributed changed lines are additions plus deletions for implementation and tests; OpenSpec bookkeeping is excluded only where the existing policy explicitly says so. No slice may be published automatically until deployment is proven paused and its predecessor is independently accepted.

### Risks

- The current migration file contains accumulated intermediate invariant work while task ownership remains incomplete; the next apply agent must reconcile it against accepted A1 state and the 110-line rollback baseline before editing or claiming completion.
- `A2a-infra-3` has repeatedly failed cleanup/resource ownership despite passing the actual lock scenarios; redesign must retain resource identities durably until verified cleanup and must not consume its focused attempt on a transform/static defect.
- A global search for the date cannot be the acceptance criterion because the history-only column, old migrations, generated table type, and legacy/v2/v3 readers are intentionally retained; assertions must distinguish active v4 paths from immutable history.
- Activation migration B cannot be authored/applied in the same release train as migration A and requires proof that the reviewed application is deployed against disabled A and old workers are drained.
- Local tests, HTTP success, or a green build do not prove production migration, Storage, Drive, RLS, or authenticated end-to-end readiness.
- The real registration value must never enter source, fixtures, logs, diagnostics, OpenSpec artifacts, or chat.

### Ready for Proposal

Yes. The approved proposal/spec/design already cover the product contract; downstream planning should update them only as needed to make the two-phase framing and Phase 2 verification matrix explicit, retain the existing sub-400 PR chain, and record that `A2a-infra-3` remains the first blocked implementation gate.
