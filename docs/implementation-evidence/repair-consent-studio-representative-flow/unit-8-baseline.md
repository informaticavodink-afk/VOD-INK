# Work-unit 8 baseline — Canonical PDF v3

## Boundary and safety

- Exact change: `repair-consent-studio-representative-flow`.
- Implemented only work unit 8; work unit 9 and parent lifecycle rows remain untouched.
- All people, UUIDs, identifiers, sanitary values, signatures, and long values are synthetic. No database, production, Storage, Drive, browser, external-service, commit, publication, or deployment action was used.
- The existing `server/consents.ts` finalization path already persists `createDocumentSnapshot(document)` and `document.templateVersion`; this unit changes the composed document to v3 for newly built/finalized output only. The signed-consent early return and historical v1/v2 artifacts are unchanged.

## Strict TDD evidence

- **RED:** Added focused v3 schema/data/PDF assertions first. `npm test -- src/domain/consents/consentPdfSchema.test.ts server/consentPdfData.test.ts src/lib/pdf.test.ts --testTimeout=15000` exited 1 with **8 failures / 39 tests**: the schema rejected `tieneRepresentanteLegal`, data still emitted `consent-v2` and minority-derived representatives, and the renderer could not construct v3 documents.
- **GREEN:** Added the independent schema flag, persisted-flag data composition, v3 template identity, representation-driven rendering, representative birth date/phone text, and adult representative signer layout. The same focused command passed **39/39**.
- **TRIANGULATE:** Added explicit v3 flag absence, adult/minor persisted-state counterexamples, empty/partial representative rejection, snapshot identity checks, all three representation states, deterministic repeated bytes, extracted text, and long multi-page synthetic output. Focused command passed **44/44**.
- **REFACTOR:** Kept representation-specific logic in `hasLegalRepresentation` and `buildRepresentative`, corrected the section-height measurement for the added representative line, and reran the unchanged focused suite: **44/44**.

## Implementation and review accounting

- Files: `src/domain/consents/consentPdfSchema.ts`, `src/domain/consents/consentPdfSchema.test.ts`, `server/consentPdfData.ts`, `server/consentPdfData.test.ts`, `src/lib/pdf.ts`, `src/lib/pdf.test.ts`.
- Source/test delta against `HEAD`: **260 changed lines** (234 additions, 26 deletions), below the 300-line unit target; no split was required.
- Schema preserves legacy v2 parsing/rendering behavior while requiring explicit `tieneRepresentanteLegal` for `consent-v3-representation`.
- Data composition uses `has_legal_representative === true`, rejects non-null representative columns when representation is false, and validates all persisted representative fields when true; it never uses `is_minor` to infer representation.
- Snapshot tests prove `templateVersion: 'consent-v3-representation'` and the representation flag are retained without base64 signatures. Existing v2 schema/PDF tests remain green as legacy references.
- PDF extraction proves representative birth date, phone, signer title/name, long synthetic content, and at least two pages; repeated v3 generations produce identical base64 bytes. Studio fields remain read from the supplied persisted studio fixture.

## Validation receipts

- `npm test -- src/domain/consents/consentPdfSchema.test.ts server/consentPdfData.test.ts src/lib/pdf.test.ts --testTimeout=15000` — passed, 3 files / 44 tests.
- `npm run lint` — passed (`tsc --noEmit`).
- `git diff --check` — passed; Git emitted only existing LF-to-CRLF working-copy warnings.
- `git diff --cached --name-only` — empty; no staged files.

## Rollback / stop decision

Unit 8 is complete and stops before unit 9. If rollout requires rollback, route only new pending finalizations away from the v3 builder; do not regenerate, reinterpret, or alter existing finalized v1/v2 snapshots, bytes, objects, or references. The remaining operational risk is the previously documented missing real sanitary attestation, which keeps production finalization fail-closed and is outside this synthetic implementation.
