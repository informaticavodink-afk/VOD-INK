# Stabilize consent submission and mobile signature

## Executive finding

The urgent change should be a narrow reliability slice: make represented/minor public consent submission diagnosable and recoverable, and make signature capture stable on mobile. Do not reopen the recently archived representation architecture or include Drive, email, or credential operations.

The current failure experience hides the useful server cause. Both HTTP adapters return inconsistent error shapes, `submitConsentToApi` assumes `error` is a string, and `WizardPage` replaces every failure with a generic `alert`. A nested safe error envelope therefore degrades to an unhelpful message. The representation path also has more validation and persistence constraints than the adult path, so it is the highest-value contract to cover end-to-end with synthetic data.

The mobile canvas has a concrete destructive resize behavior: every window resize resets the backing dimensions, calls `pad.clear()`, and clears `hasStroke`. Mobile viewport/orientation changes can therefore erase an in-progress signature. Sizing also depends on a flex container whose effective height may be unstable, and resize does not preserve existing stroke data.

## Current flow and likely fault boundaries

1. `WizardPage.handleSubmitFinal` builds the state and calls `submitConsentToApi`.
2. `src/lib/submissions.ts` POSTs to `/api/consents`; on failure it throws from `errorBody.error` without normalizing string versus structured envelopes.
3. Express `server/routes/consents.ts` and Vercel `api/consents/index.ts` both call `generateAndSubmitConsent`, but validation/database failures become status 500 with raw `Error.message`; only public-boundary errors are structured.
4. `server/consents.ts` derives minority server-side, requires representation for minors, validates all representative fields, inserts the consent, then upserts the representative signature metadata.
5. `WizardPage` logs the raw exception and displays only a generic blocking alert. It has no inline retry state and no safe correlation identifier.
6. `SignaturePad` recreates/clears the drawing surface on resize and can lose strokes during mobile viewport changes.

## Recommended bounded change

| Area | Recommendation |
|---|---|
| Submission contract | Introduce one privacy-safe public submission error envelope with stable code, safe Spanish message, retryability, and request/correlation ID. Never return database messages, PII, submitted payloads, signatures, or credentials. |
| Adapter parity | Map known validation, representation, conflict/idempotency, and persistence-stage failures consistently in both Express and Vercel adapters. Unknown failures remain generic 500 responses while server logs carry the correlation ID and safe stage/code. |
| Client parsing | Normalize legacy string errors and the structured envelope in `submissions.ts`; expose an actionable typed error to the wizard. |
| Wizard UX | Replace the generic alert with visible inline/modal error feedback, preserve all entered state and the idempotency key, disable duplicate submission while pending, and offer retry for retryable failures. Success UI must appear only after the API succeeds. |
| Represented/minor regression | Add focused synthetic tests proving the complete representative payload reaches creation, its sole signature is attributed to the representative, and safe failures remain actionable without leaking data. Adult behavior should remain unchanged. |
| Mobile signature | Size the canvas from stable CSS dimensions and device-pixel ratio without erasing strokes on viewport resize/orientation change; preserve or redraw stroke data, and ensure pointer/touch capture plus 44px controls. Add resize/orientation regression coverage. |

## Review-budget forecast

Keep the implementation at or below the 300 changed-line review budget by targeting existing seams:

- `src/lib/submissions.ts` and focused tests: error normalization.
- `src/pages/WizardPage.tsx` and a focused test: actionable retry UI/state.
- `server/consents.ts` plus both adapters and focused tests: safe error classification/observability.
- `src/components/SignaturePad.tsx` plus focused component tests: mobile resize preservation.

If this cannot remain coherent under 300 changed lines, split server/client submission reliability from signature canvas rather than importing operational work. Avoid broad refactors, schema migrations, PDF/finalization changes, or styling churn.

## OpenSpec interactions

- `repair-consent-studio-representative-flow` is archived at `openspec/changes/archive/2026-07-29-repair-consent-studio-representative-flow/` and its canonical specs are synced. This change consumes those representation and public-boundary contracts; it must not supersede or rewrite them.
- The archived verification already identifies a separate `Step1_Client.tsx` age-zero presentation warning. It is not the reported urgent failure and should remain outside this bounded slice unless a failing represented-submission test proves it causal.
- `consent-pdf-single-source-of-truth` is still present as an active directory but already has a verify report. This change must not touch final PDF generation, authenticated artist finalization, Storage/Drive final-file behavior, or its specifications.
- `saas-document-integrity`, `saas-multitenant-foundation`, and `saas-multitenant-panels` are historical planning artifacts that conflict with the configured single-studio runtime and are unrelated.
- `openspec/config.yaml` pointed at the already archived `repair-consent-studio-representative-flow`; exploration activation updates it to this new change without deleting historical artifacts.

## Explicit non-goals and follow-up changes

1. **Drive hardening:** retries, permissions, reconciliation, folder policy, and delivery diagnostics belong in a separate change.
2. **Email delivery:** recipient workflow, templates, attachment/link policy, retry/bounce handling, and provider selection belong in a separate change.
3. **Operational credential handover:** rotation, secret storage, ownership transfer, runbooks, and production access are operator-controlled and separate.
4. Production sanitary attestation remains an existing operational release gate; this change must not invent, expose, or modify those values.
5. No database migration, canonical PDF redesign, multitenancy, broad observability platform, or production deployment.

## Verification path for the later apply phase

- Strict TDD: capture focused RED before each minimal fix.
- Test represented minor submission success and safe failures through both adapter contracts with synthetic values.
- Test client parsing for structured, legacy, malformed, and non-JSON failures.
- Test wizard retry preserves signature/form/idempotency state and prevents duplicate clicks.
- Test canvas stroke survival across resize/orientation/DPR changes and touch interaction.
- Run focused Vitest suites, then `npm test`, `npm run lint`, and `npm run build`.
- Confirm responses/log assertions contain no representative/client PII or signature data and confirm the git index remains empty.

## Risks

- The exact production failure is not reproducible from static inspection; implementation must begin with a synthetic failing test or privacy-safe correlation evidence, not a guessed database fix.
- Existing raw server error messages may contain database detail; classification must default to redaction.
- Canvas tests in jsdom cannot fully reproduce mobile browser viewport behavior; retain a manual 375px/orientation check as supplemental evidence.
- The repository is already dirty and contains overlapping historical changes; apply must remain path-bounded and avoid attributing unrelated diffs to this change.
