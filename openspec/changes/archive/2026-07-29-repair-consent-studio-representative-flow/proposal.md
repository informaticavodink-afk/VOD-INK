# SDD Proposal — Repair consent studio and representative flow

## Change

`repair-consent-studio-representative-flow`

## Intent

Ensure every newly finalized consent is bound to the intended studio and artist, uses verified tenant-scoped studio data, models legal representation independently from minority, and renders the complete representative record. Reduce the public artist surface without changing authenticated artist finalization or any already-finalized PDF.

## Current-state evidence

Repository inspection confirms:

- The runtime is single-studio, while `studios.slug = 'vod-ink'` was created with demo legal and business values.
- The public wizard calls `get_active_artists(studio_slug)` but receives `studio_id`, DNI and Drive metadata in addition to display data.
- Public consent creation accepts the selected artist UUID and derives `studio_id` from that artist. It does not bind the artist to a separately resolved public studio context, and the database has independent foreign keys rather than a durable consent/artist studio-match invariant.
- Artist finalization reads exactly the `studios` row identified by `consents.studio_id`; there is no first-studio fallback. The server then passes persisted studio data through `server/consentPdfData.ts` to `src/lib/pdf.ts`.
- `esMenor` currently controls minority, representative form visibility, representative validation, persistence, signer attribution and PDF rendering. Consequently, an adult cannot persist a representative.
- Representative birth date and phone are present in storage and the canonical representative shape, but `src/lib/pdf.ts` does not render them.
- The legacy Express `/api/upload-to-drive` route is not referenced by the public wizard or canonical artist-finalization path. Finalization uses the server Drive module directly.

## Resolved decisions

- For represented adults, the sole public-side signature in this change is the legal representative's signature; no second adult signature is added.
- The untouched production sanitary seed pair (`health_registration_number = 'SAN/07/2024-C'` and `health_authorization_date = DATE '2024-06-15'`) is known demo data. Implementation must clear/report that exact pair together, preserve differing stored values, and fail closed until verified sanitary data exists.
- Pending consents stay visible. A finalization blocked by missing studio sanitary data remains pending and must expose an actionable retry that reloads the current studio row server-side without recreating the consent or duplicating PDFs/files.
- The current stable QR/root-domain entry point is preserved. Exact studio-context transport inside that entry point is a technical design choice, not a product unknown.

## Goals

1. Correct the `vod-ink` studio row with an idempotent, slug-scoped migration and no PDF hardcoding.
2. Clear or preserve sanitary metadata according to the exact known demo seed pair, never invent a replacement, and fail closed until verified sanitary data exists.
3. Resolve public studio identity on the server from the preserved QR/root-domain entry point context, verify that the selected active artist belongs to it, and durably prevent consent/artist studio mismatches.
4. Return only the artist display fields needed by the public wizard.
5. Separate minority from the explicit need for a legal representative: minors always require one; adults may have one.
6. Reuse the existing representative form, and conditionally validate, persist and attribute the signer according to the explicit representation rule.
7. Render representative birth date and phone from canonical persisted data, with focused synthetic tests.
8. Keep finalized documents immutable; corrected data affects only PDFs generated after rollout.

## Non-goals

- Mutating production data, implementing source changes, adding tests, committing, pushing or opening PRs during this proposal phase.
- Hardcoding VOD INK legal values in `src/lib/pdf.ts`, shared PDF constants or browser state.
- Regenerating, replacing or reinterpreting already-finalized PDFs or their immutable snapshots.
- Reworking authenticated artist technique/finalization authorization, document hashing, Storage, downloads or Drive replication.
- Introducing organizations, memberships, a studio selector or other historical SaaS/multitenant concepts.
- Changing the stable QR/root-domain public entry point.
- Duplicating the representative form or redesigning the wizard beyond the representation choice and dependent labels/validation.
- Inventing a sanitary registration or authorization value.
- Changing the legacy Express `/api/upload-to-drive` route. It requires a separate security review and removal/hardening decision.
- Using or logging real-person data in tests, fixtures, diagnostics or verification.

## Proposed scope and invariants

### 1. Tenant-scoped studio correction

Add an idempotent migration that targets only `studios.slug = 'vod-ink'` and sets:

| Field | Required value |
|---|---|
| `legal_name` | `vod ink` |
| `trade_name` | `vod ink` |
| `address` | `calle la peña 107 bajo` |
| `city` | `Santander` |
| `postal_code` | `39011` |
| `tax_id` | `72203726X` |
| `phone` | `659937105` |

The migration must not insert a fallback tenant or update any other slug. A missing or duplicate target must be reported rather than silently redirected.

It must never create a sanitary value. Only the untouched seed pair (`health_registration_number = 'SAN/07/2024-C'` and `health_authorization_date = DATE '2024-06-15'`) is auto-cleared/reported, and both fields must be handled together. If the row differs from that exact pair, preserve the stored value(s) and surface the row for review rather than guessing. New finalization must fail closed with an actionable studio-data message until both the sanitary number and authorization date are verified; it must never print demo sentinels, blank substitutes or invented values.

Studio fields remain sourced from `studios` at finalization. No template or global constant may contain the values above.

### 2. Public studio context and least-privilege artist discovery

The public flow must preserve the current stable QR/root-domain entry point while carrying enough public studio context to avoid browser-supplied tenant identity. Exact transport inside that entry point is a technical design choice. The server resolves that context to exactly one studio row and queries the selected active artist within the resolved studio. An unknown context, inactive artist or cross-studio artist UUID is rejected before consent insertion.

A database-level invariant (for example, a composite foreign key or an equally durable constraint) must prevent `consents.studio_id` from differing from the referenced artist's `studio_id` on insert or update. Existing mismatches, if any, are reported for manual review; they are not guessed or silently reassigned.

The public artist RPC returns only:

- artist `id`;
- display name;
- qualification displayed by the wizard;
- optional display photo URL.

It must not return studio IDs, DNI/tax identifiers, Drive folder IDs, phone numbers, document metadata or other internal fields. Full artist/legal data remains outside the public wizard response and is loaded through authorized server paths for final PDF composition.

### 3. Explicit legal representation

Keep minority and representation as separate persisted concepts. The exact new field name is a design decision, but its semantics are fixed:

- minority is determined consistently from the client's birth date and retained independently;
- every minor must have legal representation and cannot disable it;
- an adult may explicitly select legal representation;
- representative fields are validated and persisted only when representation is selected;
- when representation is not selected, all representative columns remain `null`;
- partial representative records are rejected rather than truncated or fabricated.

The existing representative form is shown by the explicit representation rule. Server validation, signer metadata, canonical PDF composition and rendering must use that rule rather than `is_minor` alone. Existing consistent records are preserved; any partial or conflicting legacy representation state is reported before stronger constraints are validated.

The current flow keeps one public-side signature. Whenever representation is selected, including represented adults, that signature belongs to the legal representative. This change does not add a second adult signature.

### 4. Canonical PDF and verification

The canonical document contract must carry minority and representation independently. Representative birth date and phone are required canonical representative fields whenever representation applies and must be visible in the representative section of the generated PDF.

Focused tests must cover, using synthetic people and identifiers only:

- a minor with a required representative;
- an adult without a representative;
- an adult with an explicit representative;
- rejection of missing/partial representative data;
- representative signer attribution;
- extraction of representative birth date and phone from the generated PDF;
- rejection of public artist/studio mismatch;
- the minimal public artist projection;
- the durable database mismatch invariant and idempotent studio migration.

The revised document output must be version-identifiable. Existing finalized bytes and snapshots are never modified.

## Affected capabilities and areas

| Capability | Expected areas |
|---|---|
| Studio legal data | `supabase/migrations/`, generated Supabase types, deployment diagnostics |
| Public tenant boundary | public artist RPC, `/api/consents` adapters, `server/consents.ts`, request types |
| Artist discovery privacy | `src/lib/artists.ts`, public artist type/mapping, `Step0_Artist.tsx`, RPC return type |
| Representation capture | `WizardPage.tsx`, `Step1_Client.tsx`, `Step6_SignatureClient.tsx`, `src/types.ts`, validation schemas |
| Persistence integrity | `consents` schema/constraints, `server/consents.ts`, database types |
| Final document | `consentPdfSchema.ts`, `server/consentPdfData.ts`, `src/lib/pdf.ts` and focused tests |

## Impact

- **Clients:** minors remain forced into representative completion; adults gain an explicit representative option without a duplicate form, and represented adults use the representative as the sole public-side signer.
- **Artists:** authenticated finalization remains the same workflow, but missing verified sanitary data blocks finalization with an actionable retry path instead of creating a new consent.
- **Operations:** deployment needs diagnostics for the target studio row, the untouched sanitary seed pair and any pre-existing consent/artist mismatch. Pending consents remain visible while studio data is corrected.
- **Security/privacy:** public artist data is minimized, and a supplied artist UUID can no longer escape the resolved public studio context.
- **Documents:** pending consents reload the current studio row on each finalization attempt; already-finalized PDFs remain unchanged.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Clearing the known sanitary seed pair blocks new finalization | Fail closed with an actionable studio-data message, keep the consent pending/visible, and require verified sanitary data instead of retaining or inventing substitutes. |
| Pending consents could be retried repeatedly after studio-data fixes | Make retries idempotent by reloading the current studio row server-side and reusing the existing consent/final-file state without duplicating PDFs/files. |
| Existing mismatched or partial records prevent constraint validation | Run read-only diagnostics first, report affected record IDs/counts without personal data, and require explicit remediation. |
| Public RPC projection and frontend mapping deploy out of order | Design a compatible rollout or coordinated deployment; do not temporarily re-expose sensitive fields. |
| Age boundary and representation state diverge | Validate age/representation on the server and enforce the minor-requires-representative rule durably. |
| Added PDF lines overflow the representative block | Exercise extracted text and multi-page layout with long synthetic fixtures. |
| Scope expands into the legacy upload endpoint | Keep it excluded and record a separate security follow-up because source inspection shows it is not on finalization. |

## Migration and rollback posture

- This phase writes planning artifacts only and performs no production mutation.
- Implementation migrations must be idempotent, tenant-scoped and preceded by read-only diagnostics.
- Studio correction is a factual data repair. Rollback must use captured pre-migration values when a verified correction is needed; it must not restore the known demo seed pair by default.
- Additive representation fields and constraints should be rolled out compatibly, with constraint validation after diagnostics/backfill. Rollback may disable new code/constraints before removing additive schema, but must not discard representative data.
- Pending consents blocked by studio-data validation must remain pending and retryable. Retries must reload the current studio row server-side, reuse the existing consent, and avoid duplicate PDFs/files.
- Public RPC/API rollout must preserve the existing public entry point while removing the sensitive artist projection.
- No rollback path may alter finalized PDFs, final file references or immutable document snapshots.

## Review workload forecast and proposed slices

The implementation is **high review risk** and is expected to exceed the 300-changed-line work-unit budget across database, API, UI and PDF areas. Use chained review slices, keeping tests with each behavior:

1. **Studio data and database integrity:** tenant-scoped correction, untouched-seed-pair sanitization/reporting, representation schema/backfill, and consent/artist studio invariant.
2. **Public studio boundary:** preserve the stable public entry point, reduce the artist RPC, resolve studio context server-side, bind the artist securely, and add security tests.
3. **Representation workflow:** explicit representation state, reused form, sole representative signature for represented adults, pending-finalization retry behavior, and focused flow tests.
4. **Canonical PDF:** independent minority/representation contract, complete representative rendering, template identification, and PDF extraction/layout tests.

Each slice should target at most 300 changed lines. The tasks phase must refine dependencies and pause before apply if a coherent slice cannot stay within budget.

## Success criteria and acceptance boundaries

- [ ] The idempotent migration updates only `slug = 'vod-ink'` with every exact known value above.
- [ ] No studio value is hardcoded in the PDF renderer or global PDF configuration.
- [ ] Only the untouched sanitary seed pair (`SAN/07/2024-C` and `DATE '2024-06-15'`) is auto-cleared/reported together; differing stored values are preserved for review.
- [ ] New finalization fails closed with an actionable message until both sanitary fields are verified, and no demo, blank or invented substitute is printed.
- [ ] Public creation resolves the studio from the preserved public entry point context, verifies an active artist in that studio, and rejects cross-studio UUIDs.
- [ ] A durable database invariant prevents consent/artist studio mismatch.
- [ ] Public artist discovery exposes only the four display fields listed above.
- [ ] Minority and representation are independent; minors require representation and adults may select it.
- [ ] Represented adults use the legal representative as the sole public-side signer, and no second adult signature is introduced.
- [ ] Representative data is complete when selected and entirely null when not selected.
- [ ] The existing representative UI is reused.
- [ ] Representative birth date and phone appear in canonical data and extracted PDF text.
- [ ] Pending consents blocked by missing studio data remain visible and pending, and expose an actionable retry path.
- [ ] Each retry reloads the current studio row server-side and does not recreate the consent or duplicate PDFs/files.
- [ ] The stable QR/root-domain public entry point is preserved.
- [ ] All new fixtures and diagnostics avoid real-person data and personal-data logging.
- [ ] Existing finalized PDFs and snapshots remain byte-for-byte untouched; corrections apply only to newly generated PDFs.
- [ ] Authenticated artist finalization, Storage integrity and final-file immutability retain their existing behavior.
- [ ] The legacy `/api/upload-to-drive` route has no changes in this change and is recorded as a separate security follow-up.
- [ ] Implementation is delivered in reviewable slices within the 300-line work-unit budget, or a delivery decision is requested before apply.

## Next phase

`spec`
