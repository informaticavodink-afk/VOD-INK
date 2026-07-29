# Work unit 6 — Sanitary gate and finalization reconciliation

All people, IDs, signatures, hashes, Storage bytes, Drive metadata, and origins in this evidence are synthetic. No database, production, Storage, Drive, or other external service was contacted. Unit 7 was not started.

## Corrective TDD evidence

- **RED:** `npm test -- server/consents.test.ts --testTimeout=15000` failed **4/26** after the regression tests were added. The intended failures were stale-claim recovery, fresh-claim protection, signed-winner status regression, and signed retry with a missing Drive link.
- **GREEN:** the focused suite passed **26/26** after the minimal service changes. Storage assertions require `{ contentType: "application/pdf", upsert: false }`; Drive assertions require the consent ID, final hash, bytes, and filename.
- **TRIANGULATE:** the mocked service suite covers repeated/concurrent finalization, different content hashes, crashes after object creation/file insertion/signed update, stale and fresh Drive claims, and a signed retry that downloads existing final bytes before Drive reconciliation. `server/drive.test.ts` verifies the multipart `appProperties` payload; `server/publicAdapters.test.ts` verifies Express/Vercel finalization-envelope parity and configured-origin CORS behavior.
- **REFACTOR:** the unchanged final focused commands passed after byte-conversion hardening; the gate harness now records consent updates so its no-side-effect assertion is non-vacuous. No database or external-service test was added.

## Implementation and safety repairs

- `markUploadError()` now updates only `pending_artist`/`upload_error` rows, so a losing attempt cannot regress a signed winner.
- Drive claim recovery uses `DRIVE_COPY_CLAIM_TTL_MS = 5 * 60 * 1000`, first claiming a null value and then attempting a separate `drive_copy_claimed_at < staleBefore` CAS. A fresh claim is never overwritten.
- Signed retries load the existing final Storage object, verify its persisted SHA-256 when present, and reconcile the missing Drive link with the existing filename, consent ID, and hash before returning.
- The sign-artist Vercel adapter retains the existing configured-origin allowlist and stable finalization-envelope mapping; the adapter parity test covers both behavior surfaces.

## Review boundaries and physical line accounting

The dirty worktree already contained partial unit-6 material above one review unit, so the implementation remains split at the gate/reconciliation boundary:

| Boundary | Scope | Physical material |
|---|---|---:|
| 6A | sanitary gate, generation/hash claims, Storage/file/signature persistence, status CAS | `server/consents.ts` lines 278–502 (225) plus `server/consents.test.ts` lines 235–546 (312); shared harness counted once |
| 6B | Drive metadata, one-copy claim/recovery, signed retry from existing bytes, adapter parity/CORS | `server/consents.ts` lines 503–750 (248), `server/consents.test.ts` lines 547–711 (165), `server/drive.ts` (102), `server/drive.test.ts` (52), adapter coverage (70) |

These are review boundaries only; no commits or publication actions were performed. The unit-6 implementation rows are reconciled after independent verification; parent-owned lifecycle rows remain deferred. Unit 7 remains untouched.

## Validation receipts

- `npm test -- server/consents.test.ts --testTimeout=15000` — passed 26/26.
- `npm test -- server/publicAdapters.test.ts server/drive.test.ts --testTimeout=15000` — passed 5/5.
- `npm run lint` — passed (`tsc --noEmit`).
- `git diff --check -- server/consents.ts server/consents.test.ts server/drive.ts server/drive.test.ts server/publicAdapters.test.ts 'api/consents/[id]/sign-artist.ts'` — passed; only known LF/CRLF working-copy warnings.

## Residual risks

Production finalization remains intentionally blocked until authorized real sanitary data is supplied and attested. No DB/runtime or real Drive/Storage behavior was claimed; the CAS and byte-reconciliation contracts are covered by synthetic mocks only.
