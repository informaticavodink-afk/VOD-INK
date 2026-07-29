# Work unit 4 — Representation domain and server persistence

All fixtures, names, identifiers, signatures, and contact values are synthetic. No production, database, or external service runtime was contacted.

## TDD evidence

| Cycle | Evidence |
|---|---|
| RED | Added `src/domain/consents/age.test.ts` and focused representation assertions in `server/consents.test.ts`; `npm test -- src/domain/consents/age.test.ts server/consents.test.ts` failed before implementation (missing age module/exports). |
| GREEN | Added pure date-only age policy, server derivation, complete-or-null persistence mapping, and sole signer mapping; focused suite passed 13 tests. |
| TRIANGULATE | Added leap-day, Madrid DST-adjacent instant, inconsistent browser claim, minor opt-out, missing representative phone/record, represented adult, and all-null persistence counterexamples; focused suite passed 14 tests. |
| REFACTOR | Centralized age and representation predicates and reran the unchanged focused suite plus `npm run lint`; both passed. |

## Verification

- Focused Vitest: 2 files, 14 tests passed.
- `npm run lint`: passed (`tsc --noEmit`).
- `git diff --check`: passed; existing working-tree LF/CRLF warnings only.
- Server derives minority from birth date and rejects inconsistent browser `esMenor`; no database runtime evidence is claimed.
- Represented paths validate `RepresentanteSchema`; persistence emits all nine fields or all null; one public signature is attributed to representative when represented.

## Corrective verification

Independent verification identified missing end-to-end persistence coverage. Added a mocked successful represented-adult `generateAndSubmitConsent` test that captures the consent insert and signature upsert, asserting server-derived `is_minor=false`, `has_legal_representative=true`, all nine representative fields, resolved studio/artist IDs, representative signer attribution, and exactly one public signature. `buildRepresentativePersistence(true, partial)` now validates with `RepresentanteSchema.parse` and fails closed; unrepresented output remains all null. The focused suite now passes 15 tests (including 2 files), with `npm run lint` and `git diff --check` passing.

## Boundary and rollback

Unit 4 only; unit 5 was not started. No database migration or production mutation. Rollback is application-only: disable adult representation acceptance while retaining additive data.
