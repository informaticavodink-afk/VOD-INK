# Verify report: stabilize consent submission and signature

## Status

**FAILED for completion/archive; AUTOMATED IMPLEMENTATION CONDITIONALLY VERIFIED.** The corrected Wizard and SignaturePad suites are executable React/jsdom behavior tests rather than source-string tests, and all focused/full validation is green. The physical 375 CSS-pixel check is explicitly supplemental in the design/spec, so its absence does not invalidate the automated mechanics. Nevertheless, it remains an unchecked implementation-owned task and therefore is a CRITICAL completeness/archive blocker under the SDD checkbox contract. Strict-TDD coverage also remains incomplete for part of the promised SignaturePad scenario matrix, and a changed server representation test contains a ghost-loop assertion path.

## Structured status and action context

- Active change: `stabilize-consent-submission-and-signature`, explicitly selected by the user; this resolves the native status engine's earlier ambiguous selection.
- Artifact store: OpenSpec.
- `actionContext.mode`: `repo-local`; the current repository is the authoritative workspace and allowed edit root.
- Implementation ownership is proven by task ownership markers; inspected files are inside the allowed root.
- `openspec/config.yaml` was reviewed. It accurately keeps completed planning phases through `tasks` and `next_phase: apply`, because an implementation-owned manual task and strict-TDD evidence gaps remain. No config edit was necessary in this verify rerun.
- `git diff --cached --name-only` returned empty; no staged files exist.

## Findings

### CRITICAL

1. **Unchecked implementation task blocks completion and archive.**
   - `openspec/changes/stabilize-consent-submission-and-signature/tasks.md:47`
   - Exact line: `- [ ] Manually verify at a 375 CSS-pixel viewport that drawing survives portrait→landscape→portrait, remains submittable, touch/pointer input continues, and every signature control measures at least 44×44 CSS px; record browser/device and observations as supplemental evidence, not a replacement for automation. <!-- sdd-owner: implementation -->`
   - This check is supplemental/manual acceptance, not a substitute for automation. Automated mechanics may be reported green, but the checkbox cannot be claimed complete and archive is not ready.

2. **The SignaturePad correction is behavioral, but it does not execute the complete checked scenario matrix.**
   - `src/components/SignaturePad.test.tsx`
   - The six jsdom tests instantiate the component and exercise dimensions/DPR, one-stroke scaling, zero/unchanged guards, DPR-only redraw, callback isolation, save eligibility, cleanup, and control classes.
   - They do not execute portrait→landscape→portrait round-trip preservation, multiple strokes, or a combined dimension-and-DPR change with proof that logical strokes are redrawn exactly once. The “continued drawing” case mutates the mocked pad data and directly invokes its `endStroke` listener rather than delivering a post-resize pointer/touch interaction.
   - These omissions conflict with the checked slice-3 TRIANGULATE task and the stronger claim in `apply-progress.md`; strict-TDD evidence is incomplete even though the covered cases pass.

3. **A changed representation test has a ghost-loop success path.**
   - `server/consents.test.ts:89-99`
   - `classifies canonical representation failures without embedding submitted values` wraps the production call in `try/catch` and asserts only inside `catch`. If `deriveConsentRepresentation` stops throwing, the loop performs no assertion and the test still passes.
   - Under the strict-TDD assertion-quality contract this is CRITICAL; the test must explicitly assert rejection/throwing before inspecting the error.

### WARNING

1. **Touch-target automation asserts Tailwind class tokens, not rendered CSS geometry.**
   - `src/components/SignaturePad.test.tsx`, test `retains touch-safe minimum classes on capture and preview controls`.
   - The assertion is an implementation-detail CSS check. It usefully guards intended classes but cannot prove computed 44×44 CSS-pixel dimensions in jsdom; the unchecked physical-browser task remains the intended supplemental evidence.

2. **Stacked review boundaries are attested, not proven by Git/PR boundaries.**
   - `openspec/changes/stabilize-consent-submission-and-signature/tasks.md` forecasts three `stacked-to-main` slices below 300 changed lines.
   - `apply-progress.md` reports approximately 254/141/68 lines, and current file-level scope does not contradict that forecast, but the working tree combines all slices and parent review/lifecycle checkboxes remain deferred.

## Corrected-test review

- `src/pages/WizardPage.submission.test.tsx`: prior source reads/string checks are gone. Three React Testing Library tests execute duplicate prevention, pending/success ordering, safe non-retryable feedback, retry gating, stable idempotency, and represented client/representative/signature preservation. No tautology, type-only-only assertion, ghost loop, or smoke-only test was found.
- `src/components/SignaturePad.test.tsx`: prior source reads/string checks are gone. Six React/jsdom tests instantiate `SignaturePad` with mocked `signature_pad`, canvas geometry/context, DPR, and `ResizeObserver`. Assertions are substantive for the covered mechanics, subject to the CRITICAL scenario gaps and CSS-token WARNING above.

## Spec coverage

- **Privacy-safe structured failures and adapter parity:** GREEN through classifier/adapter tests and full suite.
- **Representation/minor persistence and safe failure:** implementation and service suites are green, but strict assertion quality is conditional because of the ghost-loop test noted above.
- **Client normalization:** GREEN for allow-listed envelopes, malformed/legacy bodies, invalid fields, HTTP failures, and network rejection.
- **Wizard pending/idempotent recovery:** GREEN with executable integration behavior tests; the prior source-string blocker is resolved.
- **Signature sizing/DPR/stroke preservation:** GREEN for covered component mechanics, CONDITIONAL for the unexecuted round-trip/multi-stroke/combined-event scenarios.
- **375px physical layout/touch behavior:** NOT RUN; explicitly supplemental/manual and accurately left unchecked.
- **Scope exclusions:** inspected diff contains no Drive, email, credential handover, PDF/finalization, schema/migration, deployment, or tenancy implementation.

## Task completion

- All automated implementation checkboxes are marked complete.
- Exact unchecked implementation line is listed under CRITICAL finding 1; none other remain.
- Parent-owned bounded review and lifecycle lines remain unchecked/deferred. They are not implementation-owned, but archive still requires those gates.

## Strict TDD compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | Conditional | Apply-progress contains RED/GREEN/TRIANGULATE/REFACTOR evidence tables by slice and correction. |
| Reported test files exist | Pass | Corrected Wizard and SignaturePad files exist and execute under jsdom. |
| GREEN reconfirmed | Pass | Focused 2 files/9 tests and full 24 files/171 tests pass. |
| Triangulation adequate | Fail | SignaturePad lacks executed round-trip, multiple-stroke, and combined resize+DPR exactly-once cases. |
| Assertion quality | Fail | One ghost-loop server test; one CSS implementation-detail warning. |
| Manual browser evidence | Not run | Supplemental 375px task remains unchecked. |

Test layers for the correction: 3 Wizard integration tests and 6 SignaturePad component integration/unit-boundary tests; no real-browser E2E test was added. Coverage analysis was skipped because it was not required by the configured verification commands.

## Commands run

1. `npm test -- src/pages/WizardPage.submission.test.tsx src/components/SignaturePad.test.tsx` — **passed**, 2 files / 9 tests.
2. `npm test` — **passed**, 24 files / 171 tests.
3. `npm run lint` — **passed**, `tsc --noEmit` returned no errors.
4. `npm run build` — **passed**, Vite and server esbuild completed; Vite emitted a non-failing >500 kB chunk advisory.
5. `git diff --cached --name-only` — **passed**, empty output.
6. `git diff --check` — **passed**; only the existing Git LF→CRLF warning for `openspec/config.yaml` was emitted.

## Review workload / PR boundary

- Forecast: three chained slices, `stacked-to-main`, each below 300 changed lines.
- Apply-progress attests approximately 254, 141, and 68 lines. No `size:exception` is recorded or apparently needed.
- Current working tree is a combined unstaged chain, so autonomous commit/PR rollback boundaries cannot be independently proven.

## Exact blockers

1. Record the physical 375px browser/device verification and check the exact implementation task, or retain it as explicitly incomplete supplemental acceptance; archive cannot be declared ready while it remains unchecked.
2. Add executable SignaturePad coverage for portrait→landscape→portrait, multiple strokes, and a combined dimension+DPR sizing cycle with exactly-once preservation.
3. Correct the ghost-loop assertion structure in `server/consents.test.ts:89-99` so absence of the expected exception fails the test.
4. Complete parent-owned bounded reviews and lifecycle gate before archive.

## Residual risks

- jsdom cannot establish real mobile viewport, orientation, computed touch-target geometry, or device input behavior.
- The two-write consent/signature operation remains non-atomic by design; cleanup and idempotent retry mitigate but do not eliminate infrastructure failure risk.
- Combined unstaged delivery does not independently prove the planned stacked PR boundaries.
