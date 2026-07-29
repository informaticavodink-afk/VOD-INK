# Consent Representation Specification

## Purpose

Define legal representation independently from minority while preserving one reusable representative form and one public-side signature.

## Requirements

### Requirement: Independent minority and representation states

The system MUST retain minority classification independently from explicit legal representation. Minority MUST be determined consistently from the client's birth date according to the authoritative classification rule; this specification MUST NOT introduce a numeric legal-age threshold. Every minor MUST be represented and MUST NOT disable representation, while an adult MAY select representation.

#### Scenario: Force representation for an authoritative minor classification

- GIVEN a synthetic client's birth date is classified as minor by the authoritative rule
- WHEN representation state is evaluated
- THEN representation is required and cannot be disabled
- AND minority and representation remain separately identifiable

#### Scenario: Allow either adult representation choice

- GIVEN a synthetic client's birth date is classified as adult by the authoritative rule
- WHEN the client completes the representation choice
- THEN the client may select represented or not represented
- AND adult classification alone does not determine representation

### Requirement: Representation-driven reusable form

The system MUST use the existing representative form whenever representation is required or selected and MUST NOT introduce a duplicate representative form. Representative labels, visibility, and validation MUST follow explicit representation rather than minority alone.

#### Scenario: Reuse the form for a represented adult

- GIVEN an adult explicitly selects representation
- WHEN representative details are requested
- THEN the existing representative form is shown and validated

#### Scenario: Reuse the form for a minor

- GIVEN the client is authoritatively classified as a minor
- WHEN representative details are requested
- THEN the same existing representative form is shown and validated

### Requirement: Complete-or-null representative record

When representation applies, the system MUST require and persist a complete representative record, including birth date and phone. Partial representative data MUST be rejected and MUST NOT be truncated or fabricated. When representation does not apply, every representative field MUST be `null`.

#### Scenario: Persist a complete representative

- GIVEN a represented synthetic client provides every required representative field
- WHEN the consent is validated and stored
- THEN the complete representative record, including birth date and phone, is persisted

#### Scenario: Reject partial representative data

- GIVEN representation applies and one or more required representative fields are missing
- WHEN validation is attempted
- THEN the consent is rejected as incomplete
- AND no missing representative value is fabricated

#### Scenario: Keep non-represented data null

- GIVEN an adult does not select representation
- WHEN the consent is stored
- THEN all representative fields are `null`

### Requirement: Sole representative public-side signature

Whenever representation applies, including for a represented adult, the sole public-side signature MUST belong to the legal representative. The system MUST NOT add a second adult signature. When representation does not apply, the public-side signature MUST belong to the consenting adult.

#### Scenario: Attribute a represented adult signature

- GIVEN an adult has explicitly selected representation
- WHEN the public-side signature is captured and attributed
- THEN its signer is the legal representative
- AND no second adult signature is requested or stored

#### Scenario: Attribute a minor's signature

- GIVEN a minor has required representation
- WHEN the public-side signature is captured and attributed
- THEN its signer is the legal representative

#### Scenario: Attribute a non-represented adult signature

- GIVEN an adult has not selected representation
- WHEN the public-side signature is captured and attributed
- THEN its signer is the consenting adult

### Requirement: Safe legacy-state diagnostics and tests

Existing consistent representation records MUST be preserved. Partial or conflicting legacy states MUST be reported before stronger rules are enforced, without guessing values or logging personal identifiers. Tests and fixtures MUST use synthetic people.

#### Scenario: Surface a conflicting legacy state

- GIVEN a legacy consent has partial representative data or conflicts between minority and representation
- WHEN readiness diagnostics run
- THEN the record is surfaced using non-personal references or counts
- AND no representative value is invented or silently discarded
- AND no personal identifier is logged

#### Scenario: Exercise representation behavior synthetically

- GIVEN representation acceptance behavior is tested
- WHEN person records are needed
- THEN every person and identifier is synthetic
- AND no personal identifier is logged
