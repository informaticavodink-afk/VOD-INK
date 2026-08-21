# Apply Progress: Stabilize Consents and Manual Backup

## Completed Tasks

- [x] 1.1 Explicit composite artist embed and tenant-safe list.
- [x] 1.3 Immutable individual PDF download with truthful failure handling.

## Implementation Ready / Enforcement Pending

- [ ] 1.2 Real PostgREST gate passes locally, but is not remotely mandatory until its workflow is published and first run at DEPLOY STOP 1.9. No GitHub ruleset or branch protection is evidenced yet.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/components/admin/ConsentsManager.test.tsx` | Component | No focused test existed; Vitest exited 0 with `--passWithNoTests` | Both tests failed because Production used `artists(full_name)` | 2/2 passed after the explicit composite embed | A second active studio proved the filter binds the current `studioId` | Focused suite remained 2/2 green; no further production refactor was justified |
| 1.2 | `supabase/tests/consent_artist_embed_rest.test.ts` | Real local PostgREST | Fresh review rejected self-filtered tenant evidence and unproven FK catalog | Missing helper failed import, then name-array catalog parsing failed | 3/3 passed with exact FK catalog and unfiltered owner query | Unqualified embed returned `PGRST201`; unfiltered owner saw only A and explicit studio-B query returned empty | Exact-ID cleanup asserted; full suite passed 201 tests |
| 1.3 | `src/components/admin/ConsentsManager.test.tsx` | Component | Existing selector suite passed 2/2 | 2/5 failed because signed URLs opened a tab and access errors were not truthful | 5/5 passed using immutable Storage download and safe opaque filename | Missing metadata, unauthorized metadata and missing object paths covered; 6/6 passed | Object URL and temporary anchor always cleaned; 6/6 remained green |

## Files Changed

| File | Change |
|---|---|
| `src/components/admin/ConsentsManager.tsx` | Qualify the artist relationship and download only the referenced final object with a safe opaque filename. |
| `src/components/admin/ConsentsManager.test.tsx` | Cover selector/studio binding plus immutable success, missing metadata/object, unauthorized access and cleanup. |
| `supabase/tests/consent_artist_embed_rest.test.ts` | Exercise both relationships, owner RLS, exact composite embed, tenant isolation and fail-closed availability. |
| `supabase/tests/support/artistFkContract.ts` | Read the exact consent-to-artist FK names, ordered local columns and referenced columns. |
| `.github/workflows/consent-rest-gate.yml` | Prepare fail-closed CI; it is not remotely enforced before publication and first run. |
| `openspec/changes/stabilize-consents-and-manual-backup/tasks.md` | Keep 1.2 open until remote enforcement is evidenced. |

## Workload / PR Boundary

- Mode: stacked PR slice (`auto-chain`, `stacked-to-main`).
- Completed units: PR 1 and PR 3. PR 2 implementation is locally ready but remains incomplete pending remote enforcement at 1.9.
- PR 2 cleanup: exact `Vod-INK` project stop restored the empty container/volume/network baseline; receipt at `%TEMP%/vod-ink-rest-gate-receipt.json`.
- Rollback PR 2 independently by removing its REST test and workflow.

## Remaining

- Task 1.2 enforcement, task 1.4 and all later Phase 1/Phase 2 tasks remain incomplete.
