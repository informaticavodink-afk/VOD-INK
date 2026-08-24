# Apply Progress: Stabilize Consents and Manual Backup

## Completed Tasks

- [x] 1.1 Explicit composite artist embed and tenant-safe list.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/components/admin/ConsentsManager.test.tsx` | Component | No focused test existed; Vitest exited 0 with `--passWithNoTests` | Both tests failed because Production used `artists(full_name)` | 2/2 passed after the explicit composite embed | A second active studio proved the filter binds the current `studioId` | Focused suite remained 2/2 green; no further production refactor was justified |

## Files Changed

| File | Change |
|---|---|
| `src/components/admin/ConsentsManager.tsx` | Qualify `consents_artist_studio_fkey` and alias the response as `artists`. |
| `src/components/admin/ConsentsManager.test.tsx` | Cover the exact selector, preserved response shape, and studio filter binding. |
| `openspec/changes/stabilize-consents-and-manual-backup/tasks.md` | Mark only task 1.1 complete. |

## Workload / PR Boundary

- Mode: stacked PR slice (`auto-chain`, `stacked-to-main`).
- Current unit: PR 1 only; no download, ZIP, minor-flow, date, deployment, or SQL work.
- Rollback: revert the selector qualification and its focused regression test.

## Remaining

- Task 1.2 and all later Phase 1/Phase 2 tasks remain incomplete.
