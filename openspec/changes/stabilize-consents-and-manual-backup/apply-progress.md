# Apply Progress: Stabilize Consents and Manual Backup

## Completed Tasks

- [x] 1.1 Explicit composite artist embed and tenant-safe list.
- [x] 1.3 Immutable individual PDF download with truthful failure handling.
- [x] 1.4 Truthful, privacy-safe ZIP export coordinator.
- [x] 1.5 Authenticated ZIP adapter with truthful UI outcomes.
- [x] 1.6 Synthetic minor submission and artist-finalization bridge.
- [x] 1.7 Cross-surface final identity and privacy-safe Production audit.

## Implementation Ready / Enforcement Pending

- [ ] 1.2 Real PostgREST gate passes locally, but is not remotely mandatory until its workflow is published and first run at DEPLOY STOP 1.9. No GitHub ruleset or branch protection is evidenced yet.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/components/admin/ConsentsManager.test.tsx` | Component | No focused test existed; Vitest exited 0 with `--passWithNoTests` | Both tests failed because Production used `artists(full_name)` | 2/2 passed after the explicit composite embed | A second active studio proved the filter binds the current `studioId` | Focused suite remained 2/2 green; no further production refactor was justified |
| 1.2 | `supabase/tests/consent_artist_embed_rest.test.ts` | Real local PostgREST | Fresh review rejected self-filtered tenant evidence and unproven FK catalog | Missing helper failed import, then name-array catalog parsing failed | 3/3 passed with exact FK catalog and unfiltered owner query | Unqualified embed returned `PGRST201`; unfiltered owner saw only A and explicit studio-B query returned empty | Exact-ID cleanup asserted; full suite passed 201 tests |
| 1.3 | `src/components/admin/ConsentsManager.test.tsx` | Component | Existing selector suite passed 2/2 | 2/5 failed because signed URLs opened a tab and access errors were not truthful | 5/5 passed using immutable Storage download and safe opaque filename | Missing metadata, unauthorized metadata and missing object paths covered; 6/6 passed | Object URL and temporary anchor always cleaned; 6/6 remained green |
| 1.4 | `src/lib/consentOperations.test.ts` | Unit/coordinator | No coordinator test existed | Missing module failed; fresh review then exposed 4/7 global-collision and thrown-dependency gaps | 7/7 passed with global filename uniqueness and opaque total results | PII-bearing load/archive failures and throwing cleanup cannot escape; 7/7 passed | Full-name `Set` and guarded cleanup preserve truthful counts; 7/7 green |
| 1.5 | `src/components/admin/ConsentsManager.test.tsx` | Component | Existing component/coordinator suites passed 13/13 | New partial-count message failed against intended-count legacy UI | 16/16 passed through the authenticated final-only adapter | Zero-success preserves selection; ineligible rows disable both ZIP actions | Reused coordinator, memoized selection Set; 16/16 green |
| 1.6 | `server/consents.test.ts` | Service integration | Submission/signature suites passed 33/33 without one minor bridge | New journey failed 3/31 without its fixture; review RED failed 1/31 until the harness retained conflict attribution | 31/31 passed through real submission/finalization services | Missing birth date/phone fail before persistence; both signer IDs, names, hashes, metadata and conflict keys are exact; 31/31 | Production preserved all nine fields and signer roles; only the in-memory proof harness changed |
| 1.7 | `src/components/admin/ConsentsManager.test.tsx` | Component acceptance | List/download/ZIP suites passed 16/16 without one cross-surface minor case | 1/10 failed because individual metadata lookup did not bind the consent ID | 10/10 passed after exact consent/file/kind binding | The same final file ID and private path feed individual PDF and ZIP; combined identity suites pass 48/48 | One query predicate added; no cross-surface refactor |

## Files Changed

| File | Change |
|---|---|
| `src/components/admin/ConsentsManager.tsx` | Qualify the artist relationship and download only the referenced final object with a safe opaque filename. |
| `src/components/admin/ConsentsManager.test.tsx` | Cover selector/studio binding plus immutable success, missing metadata/object, unauthorized access and cleanup. |
| `supabase/tests/consent_artist_embed_rest.test.ts` | Exercise both relationships, owner RLS, exact composite embed, tenant isolation and fail-closed availability. |
| `supabase/tests/support/artistFkContract.ts` | Read the exact consent-to-artist FK names, ordered local columns and referenced columns. |
| `.github/workflows/consent-rest-gate.yml` | Prepare fail-closed CI; it is not remotely enforced before publication and first run. |
| `src/lib/consentOperations.ts` | Coordinate final-only ZIP retrieval, counts, unique opaque names, refusal and cleanup. |
| `src/lib/consentOperations.test.ts` | Cover partial/zero success, exact immutable matches, privacy-safe outcomes and cleanup. |
| `src/components/admin/ConsentsManager.tsx` | Wire browser Supabase/RLS final metadata and private Storage to truthful ZIP outcomes. |
| `server/consents.test.ts` | Bridge a complete synthetic minor from submission through immutable artist finalization. |
| `src/components/admin/ConsentsManager.test.tsx` | Prove one synthetic minor final identity across list, individual PDF and ZIP. |
| `openspec/changes/stabilize-consents-and-manual-backup/tasks.md` | Keep 1.2 open until remote enforcement is evidenced. |

## Workload / PR Boundary

- Mode: stacked PR slice (`auto-chain`, `stacked-to-main`).
- Completed units: PR 1, PR 3, PR 4, PR 5, PR 6 and PR 7. PR 2 implementation is locally ready but remains incomplete pending remote enforcement at 1.9.
- PR 2 cleanup: exact `Vod-INK` project stop restored the empty container/volume/network baseline; receipt at `%TEMP%/vod-ink-rest-gate-receipt.json`.
- Rollback PR 2 independently by removing its REST test and workflow.

## Remaining

- Task 1.2 enforcement, task 1.8 and all later Phase 1/Phase 2 tasks remain incomplete.

## Production Minor Audit (read-only, 2026-08-21)

- Identity preflight found no current exact live link or Vercel identity. Historical evidence names `igppobmclturtmzqpcyx` as a prior Production ref, but it was not treated as current/live without verification; `urdvixfwdqovelnidcnw` is a disposable historical test project and was excluded.
- CLI profile `aitana-production` could not load; the default CLI and Supabase MCP identities listed only unrelated projects.
- No Production row query was executed and no PII was read or stored.
- Reported attempt 1: **inconclusive**. Reported attempt 2: **inconclusive**. Causal identification would otherwise require guessing.
