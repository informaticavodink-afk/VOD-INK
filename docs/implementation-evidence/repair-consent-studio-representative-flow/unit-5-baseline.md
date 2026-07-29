# Work unit 5 — Representation wizard

All fixtures and people used in this unit are synthetic. No production, database, external service, commit, publication, or later-unit operation was performed.

## TDD evidence

- **RED:** `npm test -- --environment jsdom src/steps/Step1_Client.test.tsx` initially reported 2 intended failures and 4 passes. Adult opt-in and navigation-ref saves captured the stale `estaRepresentado` closure: representation remained false and representative fields were replaced with empty fields.
- **GREEN:** The smallest production change adds `estaRepresentado` to the `saveStateRef` effect dependencies. The Step1 suite then passed **7/7**.
- **TRIANGULATE:** The focused Step1 suite covers minor-forced representation with disabled opt-out, adult opt-in/out and clearing, minor↔adult birth-date transitions, represented-only missing birth date/phone validation, unrepresented validation bypass/null cleanup, and both adult save/back directions. The combined Step1/Step6 command passed **9/9**.
- **REFACTOR:** No broad redesign was made. The Step1 suite uses a test-only DatePicker input mock; the existing Step6 provider and SignaturePad/canvas mocks remain test-only. Production behavior remains one reusable representative form and one signer surface.

## Implementation

`WizardPage` carries `tieneRepresentanteLegal` through wizard state and submission. `Step1_Client` uses the shared date-only age calculator for presentation, forces representation for minors, disables minor opt-out, permits adult opt-in/out, reuses the existing representative form, conditionally validates it, clears representative fields on opt-out, and now refreshes the navigation save closure whenever representation changes. `Step6_SignatureClient` attributes the sole public signer from representation state rather than minority.

## Validation

- `npm test -- --environment jsdom src/steps/Step1_Client.test.tsx` — passed 7/7.
- `npm test -- --environment jsdom src/steps/Step1_Client.test.tsx src/steps/Step6_SignatureClient.test.tsx` — passed 9/9.
- `npm run lint` — passed (`tsc --noEmit`).
- `git diff --check` — passed; only pre-existing LF/CRLF working-copy warnings were emitted.

## Review boundary

The corrective interaction coverage is a coherent **5A Step1 state/synchronization sub-split**: 243 test lines plus the one-line dependency correction (**244 behavior lines**, under the 300-line target). Existing WizardPage/Step6 wiring and signature attribution remain the separate 5B boundary; no 5B redesign was added.

Residual risk: Step1 interaction tests mock the calendar widget's presentation and do not mount the full WizardPage navigation/reload flow. Unit 6 and later remain unstarted.
