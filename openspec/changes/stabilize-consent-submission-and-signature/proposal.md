# Stabilize public consent submission and mobile signature

## Change

`stabilize-consent-submission-and-signature`

## Intent

Make represented and minor public consent submissions reliable, diagnosable, and safely retryable while preventing mobile viewport changes from erasing an in-progress signature. Preserve the canonical representation and public-boundary contracts already delivered by `repair-consent-studio-representative-flow`.

## Current-state gap

The public submission path currently obscures actionable failures:

- Express and Vercel adapters do not expose one consistent safe error contract.
- The client assumes `error` is a string, so structured errors can collapse into an unhelpful message.
- The wizard replaces all failures with a generic alert and offers no clear retry state.
- Represented/minor submissions cross additional validation and persistence boundaries, but lack focused end-to-end regression coverage.
- The signature canvas clears its backing surface and stroke state during resize, so mobile viewport or orientation changes can erase a signature.

The exact production failure is not proven by static inspection. This change therefore improves the observable contract and regression coverage rather than guessing at a database fix.

## Goals

1. Define one privacy-safe public submission error envelope with a stable code, safe Spanish message, retryability, and request/correlation ID.
2. Apply consistent known-failure classification in both Express and Vercel consent adapters, while redacting unknown internal failures.
3. Normalize structured, legacy string, malformed, and non-JSON failures in the client.
4. Show actionable submission feedback, preserve form/signature/idempotency state, prevent duplicate pending submissions, and permit retry only where appropriate.
5. Cover represented/minor submission success and safe failure behavior with synthetic data, including complete representative persistence and sole representative signer attribution.
6. Preserve signature strokes through mobile resize, orientation, and device-pixel-ratio changes while retaining usable touch/pointer controls.

## Proposed scope

### 1. Privacy-safe submission errors and observability

The public consent endpoint will return a stable safe envelope for known validation, representation, conflict/idempotency, and persistence-stage failures. The envelope will contain only:

- a stable public error code;
- a user-safe Spanish message;
- whether retry is appropriate;
- a request/correlation identifier.

Both HTTP adapters will map equivalent failures consistently. Unknown failures will remain generic server errors. Server diagnostics may include the correlation ID and safe failure stage/code, but must never include submitted payloads, client or representative PII, signatures, credentials, or raw database messages.

### 2. Recoverable wizard submission

The submission client will normalize both the new envelope and compatible legacy failure shapes into an actionable typed error. The wizard will:

- display safe, visible feedback instead of only a generic alert;
- preserve all entered data, signature, and the current idempotency key after failure;
- disable duplicate submission while a request is pending;
- offer retry when the normalized error is retryable;
- show success only after the API confirms creation.

Adult submissions that do not use representation must retain their existing behavior.

### 3. Represented/minor regression contract

Focused synthetic tests will exercise the existing canonical rules without redefining them:

- authoritative minority remains separate from representation;
- minors require a complete representative record;
- represented submissions persist the complete representative payload;
- the sole public-side signature belongs to the representative whenever representation applies;
- partial data is rejected safely and no personal data appears in responses, logs, fixtures, or diagnostics.

This change consumes, and does not supersede, `consent-representation` and `public-consent-boundary`.

### 4. Stable mobile signature canvas

Canvas sizing will use stable CSS dimensions and device-pixel ratio without destructive clearing during viewport changes. Existing stroke data will be preserved or redrawn after resize/orientation changes. Pointer and touch capture must remain usable, and interactive controls must retain a minimum 44px touch target.

Automated coverage will verify stroke survival across resize/orientation/DPR changes and touch interaction. A manual 375px orientation check remains supplemental because jsdom cannot reproduce every mobile-browser viewport behavior.

## Affected areas

| Capability | Expected areas |
|---|---|
| Public API error contract | `server/consents.ts`, `server/routes/consents.ts`, `api/consents/index.ts` |
| Client error normalization | `src/lib/submissions.ts` and focused tests |
| Submission UX and retry state | `src/pages/WizardPage.tsx` and focused tests |
| Represented/minor regression | consent service and adapter tests using synthetic fixtures |
| Mobile signature capture | `src/components/SignaturePad.tsx` and component tests |
| Specifications | Narrow deltas for submission reliability/observability and signature stability; no rewrite of archived representation contracts |

## Impact

- **Public clients and representatives:** submission failures become understandable and safely retryable without re-entering data or redrawing a signature.
- **Support and operations:** correlation IDs and safe failure stages improve diagnosis without exposing personal data.
- **Engineering:** Express and Vercel behavior converge on one testable contract.
- **Existing workflows:** adult non-represented creation and the established representation rules remain unchanged.

## Non-goals

- Drive retries, permissions, reconciliation, folder policy, or delivery diagnostics.
- Email provider selection, delivery, templates, bounce handling, or recipient workflow.
- Credential rotation, secret handover, production access, or operational runbooks.
- PDF generation, authenticated artist finalization, canonical document changes, Storage final-file behavior, or finalized-document immutability.
- Database schema changes or migrations.
- Production deployment or release operations.
- A broad observability platform or logging refactor.
- Multitenancy, organizations, memberships, or changes to the single-studio boundary.
- Fixing the separate `Step1_Client.tsx` age-zero presentation warning unless a focused failing represented-submission test proves it causal.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Raw internal errors leak database or personal detail | Default unknown failures to a generic envelope; log only safe code/stage plus correlation ID; assert prohibited data is absent. |
| Error classification hides the true production cause | Start implementation with focused failing tests and retain correlation-based diagnostics rather than guessing a persistence fix. |
| Retry creates duplicate consents | Preserve the current idempotency key, disable concurrent clicks, and cover retry behavior explicitly. |
| Adapter behavior diverges | Exercise the same failure classes through both Express and Vercel contracts. |
| Canvas redraw changes scale or loses strokes | Preserve normalized stroke data and test resize, orientation, and DPR transitions. |
| Mobile behavior differs from jsdom | Add a supplemental 375px manual orientation check without treating it as a substitute for automated coverage. |
| Scope expands into adjacent operational work | Keep Drive, email, credentials, PDF/finalization, schema, and deployment explicitly excluded. |

## Rollback

- Revert the client error/retry presentation to the previous submission handling while leaving the server envelope backward-compatible with legacy clients.
- Revert server classification and correlation plumbing independently if it causes adapter regressions; unknown failures must continue to remain redacted.
- Revert canvas resize preservation to the prior component implementation if drawing regressions occur, accepting the known resize-loss behavior temporarily.
- No data rollback, migration rollback, PDF regeneration, or production operation is required because this change introduces no schema or finalized-document mutation.

## Review workload forecast

Target existing seams and keep each coherent implementation slice within the 300 changed-line review budget:

1. Server error classification, adapter parity, and privacy-safe tests.
2. Client normalization plus wizard retry/pending-state behavior.
3. Signature resize preservation and mobile-focused tests.

If any slice cannot remain coherent within 300 changed lines, split submission reliability from signature stabilization before apply rather than broadening scope.

## Success criteria

- [ ] Represented/minor public submission succeeds through the supported consent contract with complete synthetic representative data and correct sole-signer attribution.
- [ ] Express and Vercel adapters return equivalent safe envelopes for known failure classes.
- [ ] Unknown failures expose no raw database message, submitted payload, PII, signature, or credential.
- [ ] Every surfaced failure includes a safe actionable message and correlation ID; retryability is explicit.
- [ ] The client handles structured, legacy string, malformed, and non-JSON failure responses safely.
- [ ] Failed submissions preserve form data, signature, and idempotency key; pending submissions cannot be duplicated.
- [ ] Retryable failures provide a retry path, and success UI appears only after confirmed API success.
- [ ] Adult non-represented submission behavior remains unchanged.
- [ ] Signature strokes survive resize, orientation, and DPR changes, with working pointer/touch capture and 44px controls.
- [ ] Tests and diagnostics use synthetic people and contain no personal identifiers.
- [ ] No Drive, email, credential, PDF/finalization, database schema, or deployment behavior changes.

## Approved proposal assumptions

The user approved the full remediation plan and automatic execution before this phase. This proposal therefore assumes the bounded reliability slice, privacy posture, canonical representation invariants, explicit non-goals, and 300-line split rule are settled; no additional proposal question round is required.

## Next phase

`spec`
