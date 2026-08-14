# Delta for Studio Data Integrity

## ADDED Requirements

### Requirement: Phase 1 registration-only active contract

Active UI, client, server, API, readiness, and attestation MUST require one normalized official registration number and MUST NOT use authorization date. Empty, demo, placeholder, and sentinel numbers MUST NOT qualify.

#### Scenario: Attest a qualifying number
- GIVEN a qualifying number normalizes to the current stored number
- WHEN the studio attests it
- THEN that number is attested
- AND no active boundary uses authorization date

#### Scenario: Reject a non-qualifying number
- GIVEN a number is empty, whitespace-only, demo, placeholder, or sentinel
- WHEN attestation is requested
- THEN it is rejected with safe guidance

### Requirement: Phase 1 attestation lifecycle and historical compatibility

Attestation MUST bind to the normalized current number. A different number MUST invalidate it; an equivalent update MUST preserve it. The nullable date column, historical values, and legacy readers MUST remain unchanged and MUST NOT influence eligibility.

#### Scenario: Change the normalized number
- GIVEN the current number is attested
- WHEN it changes to a different qualifying normalized number
- THEN prior attestation is invalid
- AND explicit re-attestation is required

#### Scenario: Preserve compatibility state
- GIVEN the date is null or historical and the number remains normalized unchanged
- WHEN the active contract runs
- THEN attestation and stored date remain unchanged
- AND legacy readers retain historical state

### Requirement: Phase 2 database and environment verification

After Phase 1, Phase 2 MUST verify database/Supabase compatibility, migrations, mixed versions, concurrency, ACL/privacy, and regressions. Runs MUST prove resource ownership, remove only owned resources, and leave no owned leaks; unproven ownership MUST fail verification.

#### Scenario: Verify concurrency and cleanup
- GIVEN isolated owned resources and supported versions
- WHEN both update/attestation interleavings and cleanup run
- THEN state matches serialized current-number attestation semantics
- AND all and only owned resources are removed

#### Scenario: Reject unverifiable compatibility
- GIVEN any required check fails
- WHEN Phase 2 evaluates acceptance
- THEN acceptance fails closed without production mutation

## MODIFIED Requirements

### Requirement: Verified studio data finalization gate

New finalization MUST require a qualifying current number attested for itself. Authorization date MUST NOT substitute. Failure MUST give safe actionable guidance, retain the visible pending consent, and create no PDF, file, stored object, Drive side effect, or final reference.

(Previously: Finalization required both sanitary fields to be complete, non-demo, and verified.)

#### Scenario: Block invalid or unattested state
- GIVEN a pending consent with a missing, non-qualifying, changed, or unattested number
- WHEN finalization is attempted
- THEN it fails without finalization side effects
- AND the same consent remains pending and visible

#### Scenario: Allow current attested state
- GIVEN a pending consent and its qualifying current number attested for itself
- WHEN finalization is attempted
- THEN the gate permits finalization using persisted data
- AND authorization date is not used

### Requirement: Privacy-safe verification evidence

Tests and fixtures MUST use synthetic people and numbers. Evidence MUST NOT contain number values, payloads, or PII. Authoritative updates and attestation transitions MUST emit policy-required audits with safe action, state, actor context, timestamp, and optional contract version; rejected outcomes MUST do likewise when required.

(Previously: Tests, fixtures, and diagnostics used synthetic people when needed and did not log personal identifiers.)

#### Scenario: Record safe evidence
- GIVEN an update or attestation reaches its authoritative boundary
- WHEN evidence is emitted
- THEN safe audit state is recorded without number, payload, or PII

#### Scenario: Preserve unchanged attestation
- GIVEN an update normalizes to the unchanged current number
- WHEN its audit is recorded
- THEN attestation remains unchanged without implicit re-attestation

#### Scenario: Audit a rejected outcome
- GIVEN policy classifies a rejected update or attestation as auditable
- WHEN it is rejected
- THEN safe attempted action and resulting state are recorded without number, payload, or PII
