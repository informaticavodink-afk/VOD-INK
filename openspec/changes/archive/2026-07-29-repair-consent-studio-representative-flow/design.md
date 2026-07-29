# Technical Design: Repair consent studio and representative flow

## Context and confirmed current flow

The root-domain/physical-QR wizard currently calls `src/lib/artists.ts`, whose browser bundle hardcodes `STUDIO_SLUG = 'vod-ink'` and invokes the anon-callable `get_active_artists(text)` RPC. That RPC exposes fields not needed for selection. `POST /api/consents` reaches the same `generateAndSubmitConsent` service through Express (`server/routes/consents.ts`) and Vercel (`api/consents/index.ts`). The service trusts the selected artist UUID, loads that artist globally, and copies its `studio_id` into the consent. The database has separate artist and studio foreign keys but no invariant that they match.

`esMenor` currently drives form visibility, validation, representative persistence, signer attribution, canonical PDF composition, and rendering. The now-authoritative VOD-INK Spain/Cantabria business policy defines a client as a minor when they are under 18 years old on the consent's local calendar date in `Europe/Madrid`. Representative birth date and phone are persisted and built into the representative object, but are not rendered.

Artist finalization is authenticated and loads the exact `studios` row referenced by the consent. It claims a stable `finalization_started_at`, generates a deterministic PDF, uses a SHA-256 storage path, relies on one-final-file uniqueness, and reconciles insert races. It does not gate unverified sanitary data before side effects. Drive copying occurs after final state persistence. Existing `document_snapshot`, `document_template_version`, `final_file_id`, immutability trigger, and finalized bytes are the source of truth.

## Decisions

### 1. One trusted public studio context

Add `server/publicStudio.ts` with `resolvePublicStudio()`. It reads **server-only** `PUBLIC_STUDIO_SLUG`, rejects missing/blank configuration, queries `studios.slug` with the service client, and succeeds only when exactly one row is returned. It has no default, production fallback, first-row query, hostname supplied by the browser, or browser-readable equivalent. Both Express and Vercel handlers call this same service. The preserved root URL and QR require no query-string or path change.

Add `server/publicArtists.ts` and public `GET /api/public/artists` adapters for Express and Vercel. Response items are an explicit allowlist:

```json
{"artists":[{"id":"uuid","displayName":"Synthetic Artist","qualification":"Synthetic qualification","photoUrl":null}]}
```

The service resolves the configured studio and directly selects only `id, full_name, qualification, photo_url` for active artists in it. `src/lib/artists.ts` calls this endpoint and removes the Supabase browser RPC, slug, DNI, Drive, and studio mapping. `Aplicador` becomes display-only; authorized finalization continues loading full artist data server-side.

Public consent creation accepts `artistId` as part of the existing wizard state but not a studio identity. `generateAndSubmitConsent` first resolves the trusted studio and then queries `artists` by `(id, studio_id, status='active')`. It inserts the resolved studio ID, never an artist-derived or request-derived studio ID. Idempotency lookup is scoped to that resolved studio.

The existing RPC is closed in two compatible steps: first replace its sensitive return type with the same four minimal fields (so old browser builds cannot retrieve sensitive data even by direct invocation); after the endpoint build is live, revoke `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` and remove the function in a follow-up migration. The server endpoint does not depend on the RPC. A direct old-signature call can therefore never retain the sensitive projection.

**Rejected:** a public `studio_id`, slug query parameter, browser `PUBLIC_STUDIO_SLUG`, hostname-to-first-studio fallback, or retaining the RPC as the application API. Each leaves tenant authority or excess projection in the browser. A signed QR token is unnecessary for the confirmed single deployment context and adds key rotation without improving this boundary.

### 2. Auditable studio verification and durable relational integrity

Use `studios.health_data_verified_at timestamptz null` as explicit attestation. Ownership belongs to an authorized deployment/operator runbook using a server-controlled database role; public/artist clients receive no mutation grant. An audit entry records only studio ID, action, timestamp, and operator/system actor reference—never sanitary values or PII. A trigger clears verification when either sanitary value changes unless the same authorized statement supplies a new verification timestamp. A check permits non-null verification only when both sanitary fields are non-null/nonblank and are not the exact demo pair.

The migration locks and counts `slug='vod-ink'` in a transaction and raises unless the count is exactly one. Only that row receives the seven approved values. If and only if its sanitary values equal the exact pair `SAN/07/2024-C` and `2024-06-15`, both are set to null and the event is reported; mixed, missing, or different pairs are preserved and reported for review. `health_data_verified_at` remains null in every migration path. Thus production stays blocked until an operator supplies the real number/date and explicitly attests them; arbitrary non-demo text is not verification.

Before constraints, privacy-safe diagnostics report counts and consent/studio/artist UUIDs only for: missing/non-unique slug target, demo/mixed sanitary state, artist/studio mismatches, partial representative records, minors without a complete representative, and adults with complete legacy representative data. No migration guesses a binding or representative value.

Add `UNIQUE (id, studio_id)` on `artists`, then `FOREIGN KEY (artist_id, studio_id) REFERENCES artists(id, studio_id) ON UPDATE RESTRICT ON DELETE RESTRICT`. Create the FK `NOT VALID`, leaving existing reads available while immediately rejecting new bad writes; validate only after diagnostics are zero. Unresolved mismatches fail deployment readiness closed and require an explicit remediation decision.

**Rejected:** treating any non-demo pair as verified, a boolean without timestamp/audit, silently repairing mismatches, deleting legacy rows, or an application-only studio match. These are unauditable or bypassable.

### 3. Independent representation and authoritative age calculation

Add `consents.has_legal_representative boolean`. Roll out nullable first. Backfill `true` only for consistent rows with all nine representative columns populated and `false` only for adult rows with all nine null. Existing consistent minors become `true`; consistent adults without data become `false`; complete represented adults can be preserved as `true`. Partial/conflicting rows remain null and are diagnosed. After remediation, set `NOT NULL`.

Add `src/domain/consents/age.ts`, a pure shared rule that parses a date-only `YYYY-MM-DD` without UTC rollover and computes age as of the consent's injected Europe/Madrid local calendar date. Define the age-of-majority policy as a named constant, `AGE_OF_MAJORITY_YEARS = 18`; a client is minor when their derived age is `< 18`. The server derives `is_minor`; browser calculation is presentation only and cannot override it. Future policy changes require an explicit versioned decision, not scattered literals.

The wizard state adds `tieneRepresentanteLegal`; birth-date changes recompute minority through the shared function. Minors force it true and disable the opt-out. Adults see an explicit opt-in. The existing `Step1_Client` representative form is reused whenever representation is true. `Step6_SignatureClient` attributes the sole public signature to the representative whenever representation is true; otherwise to the adult client. No second signature is introduced.

Server request validation derives minority from birth date, requires representation for a minor, rejects a client claim inconsistent with the derived value, and applies `RepresentanteSchema` exactly when represented. Persistence is complete-or-null. Database checks, initially `NOT VALID` and later validated, enforce:

- `NOT is_minor OR has_legal_representative`;
- if represented, all nine representative columns are non-null; otherwise all nine are null.

**Rejected:** continuing to overload `is_minor`, trusting the browser's boolean, inferring representation forever from nullable columns, or auto-filling partial legacy data.

### 4. Fail-closed, retryable, idempotent finalization

Immediately after authorization/status checks, finalization reloads the current studio row and calls `assertStudioHealthVerified`. This occurs **before** setting `finalization_started_at`, PDF generation, local disk, Storage, `consent_files`, signatures, Drive, or final references. The gate requires both current values, a non-demo pair, and `health_data_verified_at`. Failure throws the stable domain error below and leaves the same consent/status unchanged and visible.

On success, retain the first `finalization_started_at` as the immutable generation instant. Generate bytes without external side effects, hash them, and atomically claim a new nullable `consents.finalization_content_sha256`: set it only when null, or require equality when already set. A different hash is a conflict before upload. Equal concurrent requests use the same deterministic Storage path; `upsert:false`, the partial unique index on one final file, and reconciliation yield one object/file record. Persisting `signed` uses a conditional update that returns the winner; losers reload and return the established final file instead of running post-finalization work.

Only the winning transition may attempt Drive copy. `drive.ts` reconciles by consent/final-file hash (stored as Drive app metadata where supported) before upload, and a compare-and-set claim on the final-file row prevents concurrent copies. A retry can reconcile a crash-created object/file and does not recreate the consent. Existing signed-consent early return remains.

The artist panel preserves the consent card/modal on `STUDIO_HEALTH_UNVERIFIED`, shows the actionable message, and offers **Retry finalization** using the same consent ID and current artist signature. It does not return to the public wizard or create a consent. Other retryable upload errors keep existing behavior.

**Rejected:** gating inside PDF rendering, resetting the consent, generating placeholders, changing the idempotency key, Storage upsert, or allowing every concurrent caller to copy to Drive.

### 5. Canonical PDF contract and immutability

The canonical schema adds `tieneRepresentanteLegal` alongside `esMenor`. `representante` is required iff representation is true; minority only enforces that representation must be true. `buildConsentPdfData` uses `has_legal_representative`, includes all persisted representative fields, and never derives representation from minority. The renderer keys representative sections and signer layout from representation and visibly renders representative birth date and phone.

New output uses `templateVersion = 'consent-v3-representation'`, persisted in both snapshot and `document_template_version`. Existing finalized rows, snapshots, references, and bytes are never rebuilt or reinterpreted; only pending/new finalizations use v3.

## Migration shape, rollback, and generated types

Use separate, ordered Supabase migrations created by the CLI during apply:

1. **Diagnostics/additive schema:** add verification timestamp, representation boolean, finalization hash/Drive claim fields, supporting unique key, triggers, and `NOT VALID` checks/FK. Emit safe notices/counts; abort target data repair if the slug count is not one.
2. **Scoped repair/backfill:** update exactly `vod-ink`, pair-clear only the exact seed, preserve other sanitary states, and conservative representation backfill.
3. **Validation:** after an operator reviews zero unresolved diagnostics, set representation non-null and validate checks/FK. If PostgreSQL does not support `NOT VALID` for a chosen constraint form, split add/validate into a maintenance-window migration rather than scanning under the application deploy.
4. **RPC restriction:** minimal projection first; revoke/drop after endpoint cutover.

Regenerate `src/types/supabase.ts` from the migrated schema, not by hand. Expected deltas: studio `health_data_verified_at`; consent `has_legal_representative`, `finalization_content_sha256` and any final-file Drive claim fields in Row/Insert/Update; updated relationships for the composite FK; temporary minimal RPC return type, then its removal. Keep `supabase/supabase_schema_complete.sql` synchronized if repository convention requires it.

Rollback disables new application paths first. Additive columns and unvalidated constraints may remain safely. Drop/disable new constraints only if necessary, never delete representation data. Restore pre-repair business values only from a captured, access-controlled pre-migration snapshot; never restore the known demo sanitary pair by default. Restore a minimal RPC only, never its sensitive projection. Do not touch finalized document fields or objects.

## HTTP and error contracts

- `GET /api/public/artists` → `200 {artists: PublicArtist[]}`; no request tenant fields.
- `POST /api/consents` retains `{state,idempotencyKey}` but ignores/rejects any tenant field and validates selected `artistId` in trusted context.
- `PATCH /api/consents/:id/sign-artist` is also the retry operation; no new consent endpoint is needed.

All adapters return `{ "error": { "code": string, "message": string, "retryable": boolean } }` and avoid logging request bodies:

| Code | HTTP | Meaning |
|---|---:|---|
| `PUBLIC_STUDIO_CONTEXT_INVALID` | 503 | env missing or context resolves to other than one studio; non-retryable for visitor |
| `ARTIST_NOT_AVAILABLE` | 422 | unknown, inactive, or cross-context artist |
| `REPRESENTATION_INVALID` | 422 | age/representation or complete-or-null validation failed |
| `STUDIO_HEALTH_UNVERIFIED` | 409 | operator must supply and attest sanitary data; retryable |
| `FINALIZATION_CONTENT_CONFLICT` | 409 | same consent already claimed different bytes; non-retryable/manual review |
| `FINALIZATION_RETRYABLE` | 503 | recoverable Storage/file reconciliation failure; retryable |

The stable Spanish health message is: `Faltan datos sanitarios verificados del estudio. Solicita su actualización y vuelve a intentar finalizar este mismo consentimiento.` Authentication/authorization remain 401/403. Unknown errors remain generic 500; logs contain code, consent/studio UUID, phase, and correlation ID, never names, DNI, phones, signatures, sanitary values, or PDF bytes.

## End-to-end sequences

### Discovery and creation

```text
QR/root → browser → GET /api/public/artists
                         → resolve PUBLIC_STUDIO_SLUG server-side
                         → exactly one studio → active artists, 4 fields only
browser selects artist → POST /api/consents
                         → derive minority from birth date
                         → validate representation and signature owner
                         → resolve same studio → active artist within studio
                         → insert consent + signer (composite FK guards match)
                         → pending_technique
```

### Finalization and retry

```text
artist → PATCH sign-artist(existing consent)
       → authenticate/authorize → reload consent + current studio
       → sanitary verification gate
          blocked: 409 code; no claims/files/PDF/Storage/Drive; same pending consent
          allowed: claim stable timestamp → build v3 bytes → SHA-256 CAS
                 → deterministic Storage object → unique final-file reconcile
                 → conditional signed transition + immutable snapshot/reference
                 → winner-only Drive reconcile/copy → response
retry  → same ID → reload current studio → reconcile/return the one artifact
```

## Expected file/module touch map

| Area | Expected files |
|---|---|
| DB | new ordered files under `supabase/migrations/`; `supabase/supabase_schema_complete.sql`; `src/types/supabase.ts` |
| Trusted context/public discovery | new `server/publicStudio.ts`, `server/publicArtists.ts`, Express public-artists route registration under `server/routes/`, new `api/public/artists.ts` (or matching Vercel folder convention), `src/lib/artists.ts`, `src/types.ts`, focused service/adapter tests |
| Creation/validation | `server/consents.ts`, `server/routes/consents.ts`, `api/consents/index.ts`, `src/lib/schema.ts`, new `src/domain/consents/age.ts`, `server/consents.test.ts` |
| Wizard | `src/pages/WizardPage.tsx`, `src/steps/Step1_Client.tsx`, `src/steps/Step6_SignatureClient.tsx`, their focused tests if introduced |
| Finalization/retry | `server/consents.ts`, `server/drive.ts`, both sign-artist adapters as needed, `src/components/artist/ArtistConsents.tsx` and/or `ArtistConsentDetailsModal.tsx`, focused tests |
| Canonical document | `src/domain/consents/consentPdfSchema.ts` and test, `server/consentPdfData.ts` and test, `src/lib/pdf.ts` and test |

The legacy `/api/upload-to-drive` route is intentionally untouched and remains a separate security follow-up.

## TDD and evidence strategy

All people, UUIDs, identifiers, sanitary values, and signatures in fixtures are synthetic.

1. **RED:** service/adapter tests prove no env, ambiguous context, cross-studio/inactive artist, excess artist keys, and direct RPC sensitive access fail. **GREEN:** resolver, endpoint, scoped creation, minimal/revoked RPC. **TRIANGULATE:** Express and Vercel contract tests plus DB composite-FK write test. **REFACTOR:** share adapters/domain errors without broad route rewrites.
2. **RED:** `server/consents.test.ts` and age tests cover exact 18th-birthday boundaries, Europe/Madrid timezone-safe date-only parsing, browser mismatch, minor forced representation, adult either way, partial/null rules, and signer attribution. **GREEN:** shared age rule/schema/persistence. **TRIANGULATE:** DB check failures and wizard state tests agree with server. **REFACTOR:** remove scattered `esMenor` representation branches.
3. **RED:** migration integration tests run twice, assert only `vod-ink` changes, exact pair clears together, mixed values remain, unverified non-demo remains blocked, mismatches are reported, and new bad writes fail. **GREEN:** additive/backfill/constraint migrations. **TRIANGULATE:** zero/duplicate target and legacy-conflict fixtures. **REFACTOR:** keep diagnostics reusable and PII-free.
4. **RED:** `server/consents.test.ts` proves health gate precedes mocked PDF/fs/Storage/file/Drive calls, same pending ID survives, retry reloads studio, concurrent attempts establish one hash/file/reference/Drive copy. **GREEN:** gate, hash CAS, winner/reconciliation. **TRIANGULATE:** crash boundaries (after object, after file, after signed update). **REFACTOR:** isolate finalization phases.
5. **RED:** `consentPdfSchema.test.ts`, `server/consentPdfData.test.ts`, and `src/lib/pdf.test.ts` cover minor represented, adult unrepresented, adult represented, complete representative, signer, v3 identity, and extracted representative birth date/phone with long multi-page data. **GREEN:** canonical/renderer changes. **TRIANGULATE:** schema, extracted text, snapshot, and unchanged legacy fixture references. **REFACTOR:** representation-driven PDF helpers.

Record failing assertion/command (RED), smallest passing diff and command (GREEN), added counterexample/boundary (TRIANGULATE), and unchanged green command after cleanup (REFACTOR) in each implementation work unit. Use current Vitest configuration and focused test files; migration verification uses an isolated/local Supabase database only. No production tests or mutations.

## Deployment, environment, observability, verification

1. Configure `PUBLIC_STUDIO_SLUG=vod-ink` in every Express/Vercel server environment; do not use a `VITE_`/`NEXT_PUBLIC_` prefix. Validate missing-env behavior in staging. The legal-age policy is resolved as under 18 on the consent's Europe/Madrid local calendar date.
2. Back up the single target row securely; run privacy-safe read-only diagnostics. Stop if target count is not one or relational/representation conflicts are unresolved.
3. Apply additive schema, minimal RPC projection, scoped repair/backfill. Regenerate types. At this point unverified sanitary data intentionally blocks finalization.
4. Deploy public endpoint/scoped creation and representation-compatible server/UI. Smoke-test root QR URL and both runtime adapters. Revoke/drop RPC execution only after endpoint cutover is confirmed.
5. Through the authorized runbook, enter the real sanitary number/date and set a fresh attestation timestamp; never place values in source, logs, tickets, or fixtures. Validate constraints, then deploy v3 finalization/PDF/retry behavior.

Metrics/log events: studio-context resolution success/failure, public artist request count, rejected artist binding by reason, health-gate blocks, finalization attempts/retries, content conflicts, reconciliation outcomes, final-file uniqueness violations, and Drive reconcile/copy outcome. Labels are code/phase/environment and opaque UUID or correlation ID only; no PII and no sanitary contents.

Production verification uses counts and hashes: exactly one configured studio resolution; public response key allowlist; direct RPC permission denial; zero artist/studio mismatches; zero null representation state after validation; health gate blocked before attestation; one synthetic staging consent retried after attestation; one final DB reference/object hash; v3 template marker and synthetic extracted text. Never generate a production consent for a real person as a smoke test.

## Review workload forecast and <=300-line slices

Overall risk is high and requires a chained sequence. Each slice includes its tests and targets <=300 changed lines; if measured scope cannot fit coherently, pause before apply for a delivery decision.

1. **DB additive integrity and diagnostics** (dependency: none): verification/representation/hash columns, conservative backfill, supporting unique key, unvalidated checks/FK, generated types, migration tests.
2. **Scoped studio repair and minimal RPC** (depends 1): seven-value update, exact-pair behavior, four-field RPC, diagnostics/tests. Deployable while old UI still reads display fields.
3. **Trusted public context and creation boundary** (depends 2): shared resolver, Express/Vercel endpoint, client mapping, studio-scoped creation and API tests.
4. **Representation domain and server persistence** (depends 1): shared under-18 Europe/Madrid age rule, schema, complete-or-null persistence/signer tests.
5. **Representation wizard** (depends 4): adult opt-in, minor lock, reused form/signature UX and component tests.
6. **Sanitary gate and finalization reconciliation** (depends 1): pre-side-effect gate, domain errors, hash/winner/Drive reconciliation, retry service tests.
7. **Artist retry UX** (depends 6): stable 409 handling and same-consent retry tests.
8. **Canonical PDF v3** (depends 4 and 6): schema/data/rendering, version marker, extracted-text/layout tests.
9. **Constraint validation and RPC removal** (depends 3–8 and zero diagnostics): validate constraints, non-null representation, revoke/drop RPC, rollout verification.

These are work-unit commits/PR candidates, not file-type commits; tests stay with behavior. Database ordering makes slices chained rather than independently reorderable.

## Pre-apply blockers and required decisions

1. **Legal-age policy (resolved):** for this VOD-INK consent flow under the applicable Spain/Cantabria business policy, a client is a minor when they are under 18 years old on the consent's local calendar date in `Europe/Madrid`. The server derives this from the date-only birth date; browser calculation remains presentation only.
2. **Legacy diagnostics (blocking if non-zero):** any artist/studio mismatch or partial/conflicting representative row needs an explicit remediation mapping. The design intentionally will not guess.
3. **Sanitary attestation (operational blocker for production finalization, not implementation):** an authorized owner must provide the real number/date and attest them after deployment. The current row remains blocked until then.
4. **Delivery gate:** implementation is forecast above one 300-line review unit. Proceed only as the chained slices above; request a new delivery decision if any slice cannot stay coherent within budget.
