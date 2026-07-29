# Work unit 3 — trusted public context and creation boundary

All artists, people, UUIDs, identifiers, signatures, tenant values, and request markers used below are synthetic. No Supabase, production, MCP, Docker, Drive, Storage, or other external service was contacted; Vitest used mocked adapters only. No request body or PII was logged.

## Boundary and dependency

- Exact change: `repair-consent-studio-representative-flow`
- Dependency: work unit 2 complete; parent status marked work unit 3 ready.
- Stable entry point: the root/QR URL is unchanged. Browser discovery now uses same-origin `GET /api/public/artists` with no slug, studio ID, RPC, or browser Supabase client.
- Server authority: `PUBLIC_STUDIO_SLUG` is read only by `server/publicStudio.ts`, has no default/public prefix, and must resolve to exactly one row.
- Stop/rollback: disable endpoint/client switch and scoped creation together while retaining the four-field compatibility RPC; never restore the sensitive RPC projection.

## Strict TDD receipts

| Gate | Command | Result |
|---|---|---|
| Safety net | `npm test -- server/consents.test.ts` | PASS, 7/7 before source edits. |
| RED | `npm test -- server/publicBoundary.test.ts server/consents.publicBoundary.test.ts server/publicAdapters.test.ts src/lib/artists.test.ts` | Expected exit 1: missing trusted-context/endpoint modules; inactive artist lacked stable code; cross-studio artist was inserted; tenant-scoped artist filters were absent; browser module still required Supabase env. One pre-existing studio-scoped idempotency assertion already passed. |
| GREEN | same four-file command | PASS, 13/13 after minimum resolver, direct artist query, endpoint/client switch, scoped creation, and domain envelopes. |
| TRIANGULATE | same four-file command | PASS, 18/18 after whitespace context, unknown artist, extra database/internal columns, non-null photo, old-RPC-shaped response, and equivalent success JSON counterexamples. |
| REFACTOR | `npm test -- server/publicBoundary.test.ts server/consents.publicBoundary.test.ts server/publicAdapters.test.ts src/lib/artists.test.ts server/consents.test.ts` | PASS, 25/25; shared resolver/domain errors remained narrow. |
| Serverless ESM | `npm test -- server/serverlessEsmResolution.test.ts --testTimeout=15000` | PASS, 2/2. The first combined run hit only the test's default 5-second timeout; the bounded rerun completed in 1.483 seconds. |
| Static verification | `npm run lint` | PASS (`tsc --noEmit`). |
| Diff hygiene | `git diff --check -- server.ts server api src/lib/artists.ts src/lib/artists.test.ts src/types.ts` | PASS; only the known LF→CRLF working-copy warning for `src/lib/artists.ts`. |

## Response-key and no-insert evidence

- Service and both runtime adapter tests assert sorted public artist keys are exactly `displayName`, `id`, `photoUrl`, `qualification`.
- Synthetic rows additionally contained DNI, tax, studio, Drive, phone, and document metadata; explicit mapping excluded every extra value.
- Browser mapping exposes only `id`, `nombreYApellidos`, `titulacion`, and optional `fotoUrl`; it calls only `/api/public/artists` and ignores old RPC/internal response keys.
- Inactive, cross-studio, and unknown artist tests assert `consents.insert` and `consent_signatures.upsert` were not called.
- Scoped creation asserts the artist query includes `(id, studio_id, status='active')`, the consent insert uses the resolved studio, and supplied `studio_id`/slug fields are ignored.
- Idempotency lookup asserts exact filters `studio_id=<resolved synthetic UUID>` and `idempotency_key=<synthetic key>` before any insert.
- Express and Vercel tests assert identical stable envelopes: `PUBLIC_STUDIO_CONTEXT_INVALID`/503 and `ARTIST_NOT_AVAILABLE`/422, each non-retryable; request markers are absent from log calls.

## Approved auto-split review boundaries

Changed lines are additions plus deletions against the pre-unit repository state. Each coherent slice stays below the 300-line target.

| Slice | Files/behavior | Changed lines |
|---|---|---:|
| 3A — resolver and direct discovery | `server/publicStudio.ts`, `server/publicArtists.ts`, `server/publicBoundary.test.ts` | 215 |
| 3B — equivalent runtime adapters | public Express/Vercel adapters and registration; consent adapter envelope deltas; `server/publicAdapters.test.ts` | 209 |
| 3C — browser least privilege | `src/lib/artists.ts`, `src/lib/artists.test.ts`, `src/types.ts` | 105 |
| 3D — scoped creation | `server/consents.ts`, `server/consents.publicBoundary.test.ts` | 174 |
| **Unit 3 total material** | Four review slices; not represented as one PR-sized slice | **703** |

No commit, push, PR, deploy, production mutation, database call, or unit-4 work occurred.
