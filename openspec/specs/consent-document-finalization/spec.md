# Consent Document Finalization Specification

## Purpose

Define complete representative document output, fail-closed retry behavior, and immutable finalized-document identity. The legacy `/api/upload-to-drive` endpoint remains outside this capability and this change.

## Requirements

### Requirement: Independent canonical representation contract

The canonical document data MUST carry minority and representation independently. Whenever representation applies, it MUST contain the complete persisted representative record, including representative birth date and phone, and the visible PDF representative section MUST render those two fields.

#### Scenario: Render a minor's representative details

- GIVEN a synthetic minor has a complete required representative record
- WHEN a new canonical PDF is finalized
- THEN minority and representation are independently represented in canonical data
- AND the visible representative section includes the persisted representative birth date and phone

#### Scenario: Render a represented adult's details

- GIVEN a synthetic adult explicitly has representation and a complete representative record
- WHEN a new canonical PDF is finalized
- THEN the visible representative section includes the persisted representative birth date and phone
- AND signer attribution identifies the representative

#### Scenario: Omit representation for a non-represented adult

- GIVEN a synthetic adult has no representation and all representative fields are null
- WHEN a new canonical PDF is finalized
- THEN canonical data records no representation
- AND the document does not fabricate representative details

### Requirement: Fail-closed pending finalization

Finalization MUST proceed only with complete current studio sanitary data recognized by the server as verified. A blocked attempt MUST provide an actionable studio-data message, MUST leave the same consent pending and visible, and MUST create no PDF bytes, file record, stored object, Drive artifact, or final reference.

#### Scenario: Block without side effects

- GIVEN a visible pending consent and studio sanitary data that is incomplete or not recognized as verified
- WHEN finalization is attempted
- THEN the attempt fails with an actionable studio-data message
- AND that same consent remains pending and visible
- AND no PDF, file, stored object, Drive artifact, or final reference is created

### Requirement: Actionable idempotent retry with current data

A retry MUST reload current studio data server-side and MUST reuse the existing consent. Once requirements are satisfied, repeated or concurrent attempts MUST yield at most one finalized document and at most one corresponding final file/reference; they MUST NOT recreate the consent or duplicate final files.

#### Scenario: Retry after studio data correction

- GIVEN finalization of a pending consent was blocked
- AND its studio now has complete server-recognized verified sanitary data
- WHEN the same consent is retried
- THEN current studio data is used
- AND the existing consent is finalized without creating a replacement consent

#### Scenario: Repeat finalization attempts safely

- GIVEN a consent is eligible for finalization
- WHEN finalization or retry is requested repeatedly or concurrently
- THEN at most one finalized document is established
- AND at most one corresponding final file/reference is established
- AND no duplicate final file is created

### Requirement: Finalized document immutability and version identity

Every newly finalized document MUST be identifiable by its document-output version. Once finalized, its PDF bytes, snapshots, stored files, and final references MUST remain immutable. Studio corrections or renderer changes MUST affect only documents finalized afterward and MUST NOT regenerate, replace, or reinterpret existing finalized output.

#### Scenario: Identify revised output

- GIVEN a consent is finalized under the revised document contract
- WHEN its finalized output is inspected
- THEN the document-output version is identifiable

#### Scenario: Preserve existing finalized artifacts

- GIVEN a PDF, snapshot, file, or reference was finalized before studio data or document behavior changed
- WHEN the change is deployed or a pending consent is retried
- THEN the existing finalized bytes, snapshots, files, and references remain unchanged

### Requirement: Privacy-safe document verification

Document tests and diagnostics MUST use synthetic people and identifiers, MUST verify visible representative birth date and phone in generated output, and MUST NOT log personal identifiers.

#### Scenario: Verify representative output safely

- GIVEN a generated PDF uses a synthetic represented person
- WHEN its visible text and layout are verified
- THEN representative birth date and phone are observable in the representative section
- AND no real-person data or personal identifier appears in logs or fixtures
