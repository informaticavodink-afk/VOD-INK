# Proposal: Registration-number-only attestation and verification

## Intent

Complete the approved change in two phases: remove the authorization date from future-consent paths, then verify this work and prior repairs. Finalization remains fail-closed on Aitana's attested registration number without exposing it or altering signed history.

## Scope

### In Scope
- **Phase 1 — implementation:** resume at blocked `A2a-infra-3`, then complete registration-only database, API, admin, finalization, canonical v4/PDF, types, compatibility, and activation units in dependency order.
- Retain the nullable historical column and legacy readers; never change finalized artifacts.
- Keep strict-TDD evidence per slice.
- **Phase 2 — verification:** run focused/full Vitest, lint, build, pgTAP, two-project concurrency, finalization ordering/idempotency, canonical/PDF output, ACL/privacy, migration, cleanup, and regression checks.
- Use `auto-chain`, `stacked-to-main`; every implementation/corrective PR MUST be at most 400 attributed changed lines.

### Out of Scope
- Real registration values in code or evidence.
- Production mutation, deployment, data entry, production E2E, or Drive/Gmail changes.
- Dropping or clearing the historical date column.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `studio-data-integrity`: Use current-number attestation and invalidation while preserving historical date state.
- `consent-document-finalization`: Require the attested number and emit registration-only v4 output while preserving idempotency and immutability.

## Approach

Retain the accepted dependency chain. Repair `A2a-infra-3` cleanup before dependent work, then implement autonomous strict-TDD units. Phase 2 follows Phase 1. Each defect gets a capped focused TDD PR, then the full matrix reruns. Activation remains gated on proven compatible deployment.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/` | Modified | Compatibility and evidence |
| `server/`, `api/` | Modified | Settings and finalization |
| `src/` | Modified | Active date removal and v4 output |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cleanup blocks concurrency evidence | High | Persist resource identities through verified cleanup; preflight first |
| Mixed versions bypass readiness | Medium | Disabled-first compatibility and fail-closed version checks |
| Broad deletion damages history | Medium | Target active v4 paths; assert legacy artifacts remain unchanged |

## Rollback Plan

Before v4 finalizations, revert compatible application/database slices together. Afterward, block finalization and forward-fix or use a registration-compatible rollback. Never mutate historical artifacts.

## Dependencies

- `A2a-infra-3` is the first blocked implementation prerequisite.
- Accepted A1 and exact test-tool pins remain inputs.

## Success Criteria

- [ ] Active future flows require only a valid currently attested registration number and contain no authorization date.
- [ ] Historical date state and artifacts remain unchanged.
- [ ] Phase 2 verification passes with cleanup and privacy evidence.
- [ ] Every implementation/corrective PR is independently reviewable and at most 400 attributed changed lines.
