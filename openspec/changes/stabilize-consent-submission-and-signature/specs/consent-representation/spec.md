# Delta for Consent Representation

## ADDED Requirements

### Requirement: Representation-preserving public submission outcomes

Public submission processing MUST preserve the canonical minority, representation, representative-record, and sole-signer outcomes without introducing an alternative representation rule. A valid represented submission MUST persist the complete representative data accepted under the canonical representation requirements and MUST attribute the sole public-side signature to that representative. An invalid represented submission MUST fail safely without partial creation or fabricated representative values.

#### Scenario: Create consent for a represented minor

- GIVEN a synthetic client is classified as a minor by the authoritative rule
- AND the submission contains the complete representative data required by the canonical representation contract
- WHEN public consent creation succeeds
- THEN the complete representative record is persisted
- AND the sole public-side signature is attributed to the representative
- AND no second public-side signature is created

#### Scenario: Create consent for a represented adult

- GIVEN a synthetic adult explicitly uses representation
- AND the submission contains the complete representative data required by the canonical representation contract
- WHEN public consent creation succeeds
- THEN the complete representative record is persisted
- AND the sole public-side signature is attributed to the representative
- AND adult classification is not changed to minority

#### Scenario: Reject incomplete represented submission safely

- GIVEN representation applies to a synthetic client
- AND the representative data is incomplete or invalid under the canonical representation contract
- WHEN public consent creation is attempted
- THEN creation is rejected without a partial consent or representative record
- AND no missing representative value is fabricated
- AND the public failure follows the privacy-safe submission error contract

#### Scenario: Preserve representation state after submission failure

- GIVEN a represented or minor submission fails before confirmed creation
- WHEN the wizard returns to an actionable failure state
- THEN the representation choice or requirement, representative form data, and representative signature remain intact
- AND retry does not require redefining or reselecting canonical representation state

### Requirement: Synthetic representation submission evidence

Verification of represented and minor public submission success or failure MUST use synthetic people and identifiers. Responses, diagnostics, logs, and fixtures MUST NOT contain real personal data or expose submitted representative or signature values as diagnostic content.

#### Scenario: Verify represented submission without disclosure

- GIVEN represented or minor submission behavior is exercised
- WHEN response, fixture, and diagnostic evidence is inspected
- THEN every represented person and identifier is synthetic
- AND failure output and diagnostics contain no submitted representative fields or signature data
