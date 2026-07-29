# Studio Data Integrity Specification

## Purpose

Define exact, tenant-scoped studio correction and the verified-data conditions required for new document finalization.

## Requirements

### Requirement: Exact slug-scoped studio correction

The system MUST idempotently correct exactly one studio whose slug is `vod-ink` to `legal_name = vod ink`, `trade_name = vod ink`, `address = calle la peña 107 bajo`, `city = Santander`, `postal_code = 39011`, `tax_id = 72203726X`, and `phone = 659937105`. These values MUST remain persisted studio data and MUST NOT be embedded as PDF template, renderer, browser, or global document constants. The system MUST NOT insert a fallback studio or modify another slug, and MUST report a missing or non-unique target without logging personal identifiers.

#### Scenario: Correct the unique target idempotently

- GIVEN exactly one studio has slug `vod-ink`
- WHEN the correction is applied once or repeatedly
- THEN only that row has all seven exact values
- AND every repeated application produces the same resulting data
- AND finalization continues to source those values from the current persisted studio row

#### Scenario: Reject an unsafe target set

- GIVEN no studio or more than one studio matches slug `vod-ink`
- WHEN the correction is attempted
- THEN no fallback studio is inserted or selected
- AND no other studio is modified
- AND the condition is reported without personal identifiers

### Requirement: Paired sanitary demo handling

The system MUST treat only the untouched pair `health_registration_number = SAN/07/2024-C` and `health_authorization_date = 2024-06-15` as auto-clearable demo data. It MUST clear and report both members together. If either value differs, is missing, or is mixed with the other demo value, the system MUST preserve both stored values and surface the studio for review. The system MUST NOT invent a sanitary value.

#### Scenario: Clear the exact untouched demo pair

- GIVEN the `vod-ink` studio contains exactly `SAN/07/2024-C` and `2024-06-15`
- WHEN sanitary correction is evaluated
- THEN both sanitary fields are cleared together
- AND the demo-pair finding is reported without personal identifiers

#### Scenario: Preserve mixed or different sanitary data

- GIVEN the stored sanitary fields are not the exact untouched demo pair
- WHEN sanitary correction is evaluated
- THEN both stored values are preserved unchanged
- AND the studio is surfaced for review
- AND no replacement value is fabricated

### Requirement: Verified studio data finalization gate

The system MUST permit a new finalization only when the server recognizes both current sanitary fields as complete, non-demo, verified data. A failed gate MUST identify the required studio-data action, MUST leave the same consent pending and visible, and MUST create no PDF, file record, stored object, or Drive side effect.

#### Scenario: Block incomplete or unverified sanitary data

- GIVEN a pending consent and current studio sanitary data that is incomplete, demo, or not server-recognized as verified
- WHEN finalization is attempted
- THEN finalization is rejected with an actionable studio-data message
- AND the same consent remains pending and visible
- AND no PDF, file, stored object, or Drive side effect is created

#### Scenario: Allow verified current studio data

- GIVEN a pending consent and complete current sanitary data recognized by the server as verified
- WHEN finalization is attempted
- THEN the studio-data gate permits document finalization
- AND the document data uses the current persisted studio values rather than hardcoded substitutes

### Requirement: Privacy-safe verification evidence

Tests, fixtures, and diagnostics for studio correction and finalization gating MUST use synthetic people when person data is required and MUST NOT log personal identifiers.

#### Scenario: Produce safe diagnostic evidence

- GIVEN correction or gate behavior is verified
- WHEN test or diagnostic evidence is emitted
- THEN any person represented is synthetic
- AND no personal identifier is logged
