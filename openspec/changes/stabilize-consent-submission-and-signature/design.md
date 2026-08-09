# Design: stabilize consent submission and signature

## Context and constraints

This change is a narrow reliability repair for the existing single-studio public wizard. It consumes the approved proposal and all three delta specifications. It does not change representation rules, Supabase schema/RLS, PDF/finalization, Drive/email, credentials, or tenancy. There is no database migration.

The implementation must use strict TDD (focused RED, minimal GREEN, TRIANGULATE edge cases, REFACTOR rerun). Because the forecast exceeds the 300 changed-line review budget, delivery is split into three independently reviewable slices; no slice may exceed 300 changed lines.

## Decisions

### 1. One shared privacy-safe server classifier

Add `server/publicConsentErrors.ts`, imported directly by both `server/routes/consents.ts` and `api/consents/index.ts`. It owns:

```ts
type PublicConsentErrorCode =
  | 'SUBMISSION_INVALID'
  | 'REPRESENTATION_INVALID'
  | 'SUBMISSION_CONFLICT'
  | 'SUBMISSION_TEMPORARILY_UNAVAILABLE'
  | 'SUBMISSION_FAILED';

type PublicConsentErrorBody = {
  error: { code: PublicConsentErrorCode; message: string; retryable: boolean; correlationId: string };
};

type PublicConsentFailure = { status: number; body: PublicConsentErrorBody; log: { code: string; stage: SafeStage; correlationId: string } };
```

`classifyPublicConsentError(error, correlationId)` returns only constants from a closed definition map. Known domain errors use a small `PublicConsentError(code, stage)` class; Zod validation is mapped without serializing issues. Existing public-boundary errors such as unavailable artist are translated to the closest stable public classification while preserving their safe status/retry semantics. Unknown values always become generic `SUBMISSION_FAILED`, status 500, non-specific Spanish text, and `retryable: true` (the unchanged idempotency key makes ambiguous persistence retries safe).

The classifier never derives response or log text from `Error.message`, Supabase errors, request bodies, Zod issue values, signatures, names, identifiers, or credentials. `SafeStage` is a closed enum (`request`, `validation`, `representation`, `idempotency`, `consent-write`, `signature-write`, `unknown`), not arbitrary input. Adapter logging is exactly one structured safe object (`console.error('[public-consent]', failure.log)`), never the caught error.

Each adapter creates a fresh UUID with `crypto.randomUUID()` at request entry and uses it for early body errors and caught failures. It may also return `X-Correlation-ID`; the JSON field remains authoritative. Client-provided correlation IDs are ignored. Successful response shape is unchanged.

In `server/consents.ts`, replace message-based outward behavior only at public creation seams: throw typed validation/representation errors, and wrap Supabase lookup/write failures by safe stage without embedding `error.message`. Existing cleanup behavior after a signature failure remains in place and receives a typed `signature-write` failure after cleanup. Do not refactor authenticated finalization errors.

### 2. Typed, defensive client normalization

In `src/lib/submissions.ts`, add `SubmissionError extends Error` with readonly `code`, `retryable`, `correlationId`, and safe `message`, plus an exported pure normalizer. It accepts `unknown` plus HTTP status and recognizes only a structurally valid envelope whose code is in the client allow-list, message is a non-empty string, retryability is boolean, and correlation ID is a bounded token. A compatible legacy string is mapped to a fixed safe Spanish message rather than displayed verbatim. Malformed JSON, HTML/non-JSON responses, unknown codes, and network errors all map to fixed safe defaults; raw response text is never read into UI/log output.

`submitConsentToApi` reads JSON once when possible, throws the normalized typed error, and converts fetch failures into the same type. This is the only error contract consumed by the wizard.

### 3. Bounded wizard recovery UX

`WizardPage` adds one nullable `submissionError` state. `handleSubmitFinal` starts with a synchronous `isSubmitting` guard, clears the prior error, obtains/reuses `getOrCreateIdempotencyKey()`, and does not clear wizard/signature state on failure. It catches only for presentation; no raw exception is logged. The existing confirmation modal is not success UI and its misleading “autenticada correctamente” copy is changed to neutral confirmation copy.

A compact accessible error panel/dialog is rendered above the footer or in the existing modal layer with `role="alert"`, safe message, and `Referencia: {correlationId}`. A retry button appears only when `retryable`; it calls the same handler and therefore reuses session storage’s key. All submit/retry controls are disabled while pending and remain at least 44×44 CSS px. Non-retryable errors preserve state and offer only return/edit. `submissionComplete` remains reachable only after the API resolves successfully. Reset and successful countdown retain existing key-clearing behavior.

The implementation avoids new data-fetching libraries, global state, animation, or component extraction. Primitive state and event-driven updates minimize rerenders and reserve panel space to avoid disruptive content jumps.

### 4. Preserve logical signature strokes during resize

Keep the change inside `src/components/SignaturePad.tsx`. The capture container receives a stable CSS `min-h` (recommended `min-h-[240px] sm:min-h-[280px]`) instead of depending on `h-full` alone. Existing 44px button minima remain; add a minimum width where text controls could collapse.

Before changing backing dimensions, capture `pad.toData()` (logical point groups). Measure the container with `getBoundingClientRect()`, ignore zero dimensions, and skip when CSS width, CSS height, and DPR are unchanged. Set CSS/backing dimensions, reset the transform with `context.setTransform(ratio, 0, 0, ratio, 0, 0)`, then redraw preserved groups with `pad.fromData(...)`. To preserve relative placement when dimensions change, scale each point’s `x` and `y` by new/old CSS dimensions before redraw; pressure/time and stroke options remain unchanged. Set `hasStroke` from preserved data and never call `onClear` during resize.

Use `ResizeObserver` on the container as the primary signal and retain `window.resize` as a narrow fallback/DPR signal; both call one coalesced sizing function. Cleanup disconnects observers/listeners and pad handlers. Pointer/touch behavior remains delegated to `signature_pad` with `touch-none`. Lock/unlock/save semantics and the submitted PNG contract remain unchanged.

## Data flow

1. Wizard snapshots current state and obtains the session idempotency key.
2. Client sends the existing payload; adapter creates a server correlation UUID.
3. Service validates canonical age/representation, resolves public studio/artist, checks idempotency, writes consent, and writes the sole signer (`representative` when represented, otherwise `client`).
4. Success returns the unchanged creation result. Failure is converted to a typed safe domain/stage error, classified once, safely logged, and returned identically by Express and Vercel.
5. Client normalizes any failure into `SubmissionError`; wizard renders only normalized fields and preserves all state/key for a permitted retry.
6. SignaturePad stores logical strokes in the library instance and redraws scaled data after layout/DPR changes; confirmation still emits one PNG data URL.

## File-level plan and contracts

- Add `server/publicConsentErrors.ts`: closed definitions, typed domain error, classifier, correlation-safe envelope.
- Add `server/publicConsentErrors.test.ts`: known/unknown classification, UUID field, redaction probes.
- Update `server/consents.ts`: typed public creation failures at validation and Supabase stages only; canonical representation and sole-signer logic unchanged.
- Update `server/routes/consents.ts` and `api/consents/index.ts`: per-request correlation ID, shared classifier, identical safe logging/response.
- Update `server/publicAdapters.test.ts` and focused consent tests: adapter parity, represented minor/adult success, incomplete representation, adult non-represented regression, no partial/fabricated signer.
- Update `src/lib/submissions.ts`; add `src/lib/submissions.test.ts`: typed normalization for structured, legacy, malformed, non-JSON, unknown-code, and network failures.
- Update `src/pages/WizardPage.tsx`; add `src/pages/WizardPage.submission.test.tsx`: pending guard, retry visibility, state/signature/key preservation, same-key retry, non-retryable behavior, success only after resolve.
- Update `src/components/SignaturePad.tsx`; add `src/components/SignaturePad.test.tsx`: stable dimensions/DPR, scaled `toData`/`fromData`, combined resize exactly once, continued drawing, no false clear, 44px controls.

No production fixture may contain real people. Tests use obviously synthetic names/UUIDs and fake PNG prefixes. Redaction assertions seed canary PII, signature, credential, and raw Postgres-message strings into thrown/request values and assert they are absent from serialized response and captured logs.

## Strict TDD sequence

For each slice, commit/capture evidence in this order:

1. **RED:** add the smallest focused failing contract test before production edits.
2. **GREEN:** implement only enough behavior to pass that test.
3. **TRIANGULATE:** add adjacent class/adapter, represented/adult, malformed body, duplicate click, or resize/DPR cases.
4. **REFACTOR:** remove duplication and rerun the focused suite unchanged.
5. Run full `npm test`, `npm run lint`, and `npm run build`; verify `git diff --cached --name-only` is empty.

Canvas automation mocks `signature_pad`, canvas context, dimensions, DPR, and `ResizeObserver`; it proves preservation mechanics, while a supplemental manual 375px portrait→landscape→portrait check validates browser layout/touch behavior.

## Reviewable delivery forecast

The complete change is forecast at **~610 changed lines**, so it must not be one review unit.

| Slice | Scope | Production | Tests | Total forecast |
|---|---|---:|---:|---:|
| 1 | Shared classifier, service stage errors, Express/Vercel parity, represented/minor/adult regression | 115 | 145 | **260** |
| 2 | Client normalization and bounded Wizard pending/retry/error UX | 75 | 145 | **220** |
| 3 | Signature resize preservation, stable min-height, mobile regression | 65 | 65 | **130** |

Slices are chained in that order. Slice 2 depends on the envelope from slice 1; slice 3 is behaviorally independent. If any slice forecasts above 300 during task planning, split its production contract from its regression matrix before apply; do not trim privacy or representation assertions.

## Rollout and rollback

No feature flag or data rollout is required. Deploy server envelope/classifier first (legacy client remains compatible), then client UX, then canvas stabilization. Monitor only aggregate safe codes/stages correlated by UUID; do not add an observability platform. Each slice can be reverted independently. No schema/data rollback or PDF regeneration exists.

## Residual risks

- Static analysis does not identify the production DB cause; correlation/stage classification improves diagnosis without guessing a schema fix.
- A consent/signature two-write sequence cannot become fully atomic without DB work; preserve existing cleanup and idempotent retry, and test absence of partial records at supported failure seams.
- jsdom cannot reproduce every mobile visual-viewport quirk; retain the documented 375px manual orientation check.
- Legacy server strings are intentionally not displayed verbatim, so they may be less specific but remain safe.
