# Tasks: stabilize consent submission and signature

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~610 (~260 + ~220 + ~130) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 server contract/adapters/regressions → PR 2 client normalization/Wizard recovery → PR 3 SignaturePad/mobile stability |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

Each slice is an autonomous review and rollback boundary and must remain below the pre-approved 300 changed-line maximum. Capture RED/GREEN/TRIANGULATE/REFACTOR command output in the apply evidence; do not combine slices if their total exceeds the limit.

## Delivery slice 1 — Safe server contract, adapter parity, and representation regressions (~260 lines)

- [x] **RED:** Add focused failing classifier tests in `server/publicConsentErrors.test.ts` for every closed public code/status/retryability mapping, bounded correlation IDs, generic unknown failures, and canary redaction of PII, signatures, credentials, payload values, Zod details, and raw database messages; record the focused Vitest command and expected assertion failures before production edits. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `server/publicConsentErrors.ts` with the closed error definitions, `SafeStage`, typed `PublicConsentError`, and `classifyPublicConsentError`; return only constant safe Spanish messages/log fields and make the RED classifier command pass with the minimal implementation. <!-- sdd-owner: implementation -->
- [x] **RED:** Extend `server/publicAdapters.test.ts` with failing Express/Vercel parity cases for known validation, representation, conflict/idempotency, persistence, early malformed-body, and unknown failures, asserting equivalent semantics, fresh authoritative correlation IDs, one safe structured log, and absence of every redaction canary; capture failures before adapter edits. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `server/routes/consents.ts` and `api/consents/index.ts` to generate `crypto.randomUUID()` at request entry, ignore client correlation input, classify through `server/publicConsentErrors.ts`, emit the authoritative JSON envelope (optionally `X-Correlation-ID`), and log only `console.error('[public-consent]', failure.log)`; pass the focused adapter suite without changing successful responses. <!-- sdd-owner: implementation -->
- [x] **RED:** Add focused failing synthetic regressions to `server/consents.publicBoundary.test.ts` and/or `server/consents.test.ts` for represented minor success, represented adult success without changing minority, complete representative persistence, exactly one representative signer, incomplete representation with no partial/fabricated records, signature-write cleanup, and unchanged non-represented adult behavior; record the failing command before service edits. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update only public-creation seams in `server/consents.ts` to throw typed validation/representation/idempotency/consent-write/signature-write failures while preserving canonical age rules, full representative data, sole-signer attribution, idempotency, and existing cleanup; do not alter authenticated finalization, schema, RLS, or PDFs, and pass the focused service tests. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Exercise both adapters against adjacent known and unknown service failures plus malformed input, and inspect serialized responses/captured logs and synthetic fixtures to prove no submitted representative/signature values or internal messages escape; rerun classifier, adapter, and consent focused suites and retain the results. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Remove duplicate classification/adapter plumbing without broadening the public service seam, rerun the unchanged focused slice-1 suites, confirm the slice stays under 300 changed lines, and document rollback as reverting the shared classifier/adapter/service-stage changes while retaining generic redaction. <!-- sdd-owner: implementation -->

## Delivery slice 2 — Typed client normalization and actionable Wizard recovery (~220 lines)

- [x] **RED:** Add `src/lib/submissions.test.ts` with focused failing cases for valid envelopes, allow-listed codes, bounded correlation tokens, legacy string errors, malformed JSON, non-JSON/HTML, unknown codes, invalid fields, HTTP failures, and network rejection; assert untrusted body text is never surfaced and capture the failing Vitest output before production edits. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `src/lib/submissions.ts` with typed `SubmissionError`, an exported pure defensive normalizer, fixed safe fallbacks, and single-attempt JSON parsing in `submitConsentToApi`; normalize fetch failures without reading raw response text into UI/logs and make the focused tests pass minimally. <!-- sdd-owner: implementation -->
- [x] **RED:** Add `src/pages/WizardPage.submission.test.tsx` with focused failing tests for the synchronous pending guard, safe alert message/reference, retry-button gating, same idempotency key on retry, preservation of client/representation/signature state, non-retryable return/edit behavior, neutral confirmation copy, and success state only after the API promise resolves; record failures before page edits. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `src/pages/WizardPage.tsx` with nullable normalized error state, an early `isSubmitting` guard, prior-error clearing, preserved `getOrCreateIdempotencyKey()` and wizard/signature state, no raw exception logging, accessible `role="alert"` feedback, correlation reference, conditional retry, disabled pending controls, and at least 44×44px actions; keep existing successful key clearing/reset and pass the focused tests. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Extend the focused suites for duplicate rapid activation, retryable then successful resolution, non-retryable failure, represented/minor state preservation, and unchanged adult non-represented success; verify no success UI appears during pending or failure and no second request/key is created. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Consolidate only local normalization/presentation duplication without adding global state, data libraries, animation, or component extraction; rerun unchanged `src/lib/submissions.test.ts` and `src/pages/WizardPage.submission.test.tsx`, confirm the slice remains under 300 changed lines, and document independent client rollback. <!-- sdd-owner: implementation -->

## Delivery slice 3 — Stable SignaturePad dimensions and mobile stroke preservation (~130 lines)

- [x] **RED:** Add `src/components/SignaturePad.test.tsx` with mocked `signature_pad`, canvas context, bounds, DPR, and `ResizeObserver`; add failing assertions for stable non-zero CSS/backing dimensions, DPR transforms, scaled `toData`/`fromData` stroke preservation, combined resize/DPR redraw exactly once, zero/unchanged-size skips, retained `hasStroke`, no resize `onClear`, continued drawing, cleanup, and 44×44px controls, then capture focused failing output. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `src/components/SignaturePad.tsx` with stable `min-h-[240px] sm:min-h-[280px]`, non-collapsing control widths, one coalesced sizing function, `ResizeObserver` plus narrow window fallback, unchanged-size/zero guards, reset DPR transform, scaled logical point groups, and complete cleanup; preserve lock/unlock/save and PNG contracts and pass the focused suite minimally. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Add portrait→landscape→portrait, multiple-stroke, DPR-only, combined-event, and post-resize touch/pointer cases to `src/components/SignaturePad.test.tsx`; prove pressure/time/options survive scaling and logical strokes are neither lost nor duplicated. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Simplify resize bookkeeping without destructive clears, rerun the unchanged SignaturePad suite, confirm the slice remains under 300 changed lines, and document rollback to the prior canvas behavior as an independent component revert. <!-- sdd-owner: implementation -->
- [x] Manually verify at a 375 CSS-pixel viewport that drawing survives portrait→landscape→portrait, remains submittable, touch/pointer input continues, and every signature control measures at least 44×44 CSS px; record browser/device and observations as supplemental evidence, not a replacement for automation. <!-- sdd-owner: implementation -->

## Verification-blocker correction

- [x] Replace Wizard source-string checks with executable jsdom React tests for synchronous duplicate prevention, safe failure/retry gating, stable retry idempotency, represented-client/signature state preservation, and success only after promise resolution; focused suite passed 3 tests without production changes. <!-- sdd-owner: implementation -->
- [x] Replace SignaturePad source-string checks with executable jsdom React tests using mocked `signature_pad`, canvas context/bounds, DPR, and `ResizeObserver` for dimensions/transforms, stroke scaling and preservation, guards, callback isolation, continued drawing, cleanup, and minimum touch classes; focused suite passed 6 tests without production changes. <!-- sdd-owner: implementation -->
- [x] Replace catch-only canonical-representation loops with promise rejection assertions that fail when no rejection occurs and verify the safe typed code/stage without exposing submitted birth dates. <!-- sdd-owner: implementation -->
- [x] Execute SignaturePad portrait→landscape→portrait, multiple-stroke metadata, and combined ResizeObserver/window+DPR scenarios, asserting exactly-once redraw and logical stroke preservation; jsdom verifies the emitted 44px utility-class contract but not computed physical layout. <!-- sdd-owner: implementation -->

## Final apply verification

- [x] Run `npm test`, `npm run lint`, and `npm run build` after all three slices and blocker corrections; the latest run passed 24 files / 174 tests, lint/build passed, the build emitted only the existing >500 kB chunk advisory, no files were staged, and Drive, email, credential handover, PDF/finalization, schema, deployment, and tenancy remained outside this change. <!-- sdd-owner: implementation -->

## Parent review and lifecycle gates

- [ ] Start or reuse a bounded review for slice 1, checking privacy redaction, adapter parity, canonical representation, synthetic fixtures, rollback boundary, and the 300-line maximum before advancing the chain. <!-- sdd-owner: parent -->
- [ ] Start or reuse a bounded review for slice 2, checking defensive normalization, pending/idempotent retry behavior, state preservation, accessibility, rollback boundary, and the 300-line maximum before advancing the chain. <!-- sdd-owner: parent -->
- [ ] Start or reuse a bounded review for slice 3, checking resize/DPR stroke preservation, mobile controls, automated/manual evidence, rollback boundary, and the 300-line maximum. <!-- sdd-owner: parent -->
- [ ] After apply evidence and all bounded reviews pass, perform the lifecycle gate for completion/archival without adding Drive, email, credential handover, or other excluded future work to this change. <!-- sdd-owner: parent -->
