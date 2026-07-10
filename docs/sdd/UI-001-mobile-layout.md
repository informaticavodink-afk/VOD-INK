# SDD UI-001 — Mobile layout foundation

## Goal

Stabilize the public consent wizard on mobile devices and simplify its production-facing interface.

## Implemented

- Prevent accidental input zoom on iOS by using a 16px mobile input font size.
- Remove global touch event interception from `index.html`.
- Lock the document shell while preserving controlled internal scrolling.
- Add safe-area handling for mobile headers and footers.
- Improve compact layouts for short and narrow screens.
- Remove the horizontal direct-step navigation bar from the public wizard.
- Remove test-mode controls, warnings, and validation bypass logic.
- Add a reusable VOD INK typographic brand mark to the entry screen.

## Constraints

- The repository currently contains no official VOD INK SVG or PNG logo asset.
- `BrandMark.tsx` is intentionally isolated so the typographic mark can be replaced with the official asset without changing the entry-screen layout.

## Acceptance checks

- The public wizard cannot skip required validation through a test control.
- Header and footer remain fixed while step content scrolls internally.
- The entry screen displays VOD INK branding instead of the generic signature icon.
- Focusing a text field on iPhone does not trigger automatic page zoom.
- No horizontal step-navigation bar is visible in the customer flow.
