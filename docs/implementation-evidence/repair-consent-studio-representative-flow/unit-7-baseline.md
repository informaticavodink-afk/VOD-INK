# Work unit 7 — Artist retry UX

All fixtures use synthetic consent IDs, artist IDs, signatures, names, and response bodies. No database, Storage, Drive, production, or external call was made. Work units 8–9 and parent lifecycle rows remain untouched.

## Scope and coherent slices

The unit requires two small behavior slices because the API error contract and modal interaction have separate review boundaries:

| Slice | Scope | Review material |
|---|---|---:|
| 7A | `src/lib/artistFinalization.ts`, its contract tests, `ArtistPage` sign-artist wiring, and page-level jsdom coverage | 77 + 73 + 19 + 116 = **285 lines** |
| 7B | `InterventionModal` retry presentation/state preservation, the `ArtistConsents` action label, and focused jsdom component tests | 79 + 1 + 210 = **290 lines** |

Each slice stays below the 300-line target. The combined patch is not represented as a single review unit.

## TDD evidence

### RED

`npm test -- src/components/artist/ArtistRetryUx.test.tsx` failed **7/7** before the implementation. The modal tried to render the structured stable error envelope as a React child and did not offer a retry action. The failures therefore covered the intended missing behavior: exact sanitary message, retry action, and retryable/non-retryable distinction.

### GREEN

The smallest implementation added a narrow client error mapper, a sign-artist API operation that accepts an existing consent ID and current signature, and a modal retry button that reuses `react-hook-form` values plus the existing signature state. The first focused run passed **9/9**:

```text
npm test -- src/components/artist/ArtistRetryUx.test.tsx src/components/artist/InterventionModal.test.tsx
```

The pending consent remains in the parent list because the failed sign operation never removes or recreates it. `ArtistPage` retries only `PATCH /api/consents/<same-id>/sign-artist`; it does not call the public wizard or `POST /api/consents`.

### TRIANGULATE

The final focused tests cover:

- repeated blocked health retries with the same synthetic consent and signature;
- success after a second mocked request following health attestation;
- modal close/reopen with the same pending context;
- preserving the signature while the same consent's technique data refreshes;
- a real `ArtistConsents` pending-artist card, status label, and intervention callback;
- `FINALIZATION_RETRYABLE` upload failure as retryable;
- `FINALIZATION_CONTENT_CONFLICT` as non-retryable;
- generic 500 and authentication 401/403 errors without a retry action; and
- stable `STUDIO_HEALTH_UNVERIFIED` 409 mapping with the exact actionable Spanish message.

The exact rerun passed **16/16** across the three focused files:

```text
npm test -- src/lib/artistFinalization.test.ts src/components/artist/ArtistRetryUx.test.tsx src/components/artist/InterventionModal.test.tsx --testTimeout=15000
→ 3 files passed, 16 tests passed
```

The page-level synthetic jsdom test separately passed **1/1**:

```text
npm test -- src/pages/ArtistPage.test.tsx --testTimeout=15000
→ 1 file passed, 1 test passed
```

### REFACTOR

Error-to-action mapping is centralized in `src/lib/artistFinalization.ts`. The modal does not duplicate technique state: retry submits the existing form state and signature through `handleSubmit`. Technique refreshes reset only form values and no longer clear the current signature for the same consent. The first corrective rerun reached 15/16 because the new real-card assertion exposed a missing accessible name on the intervention action; adding `aria-label="Firmar intervención y consentimiento"` kept the visible behavior unchanged, and the final rerun reached 16/16.

## Validation

- `npm test -- src/lib/artistFinalization.test.ts src/components/artist/ArtistRetryUx.test.tsx src/components/artist/InterventionModal.test.tsx --testTimeout=15000` — passed **16/16** on the rerun.
- `npm test -- src/pages/ArtistPage.test.tsx --testTimeout=15000` — passed **1/1**; synthetic pending-card retention and same-ID/current-signature page wiring.
- `npm run lint` — passed (`tsc --noEmit`).
- `git diff --check` — passed with no whitespace errors; unrelated dirty-worktree LF→CRLF warnings remain.

## Residual risks

No full authenticated browser session or production adapter was exercised. The page test uses synthetic Supabase/component seams, so realtime reconnect behavior and live adapter/auth behavior remain untested. Server finalization invariants remain unchanged and production finalization stays fail-closed until authorized sanitary attestation.
