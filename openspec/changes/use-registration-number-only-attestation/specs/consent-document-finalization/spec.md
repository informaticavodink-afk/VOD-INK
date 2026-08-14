# Delta for Consent Document Finalization

## ADDED Requirements

### Requirement: Phase 1 registration-only canonical output

New canonical data and PDFs MUST include the current number attested for itself, MUST omit every authorization-date dependency or output, and MUST identify this contract by output version.

#### Scenario: Finalize registration-only output
- GIVEN an eligible pending consent and current attested number
- WHEN it is newly finalized
- THEN canonical data and visible PDF include that number
- AND neither output contains authorization date

### Requirement: Phase 2 comprehensive finalization verification

After Phase 1, Phase 2 MUST verify ordering, concurrency, canonical/PDF output, representation, version identity, historical immutability/readability, privacy, storage/database consistency, cleanup ownership, and regressions. Supported focused, test, lint, build, database, and Supabase checks MUST pass.

#### Scenario: Accept the verified flow
- GIVEN Phase 1 is accepted and owned resources exist
- WHEN the complete matrix runs
- THEN required checks pass
- AND all and only owned resources are removed

#### Scenario: Reject a regression
- GIVEN any required check fails
- WHEN acceptance is evaluated
- THEN acceptance fails closed without production mutation

## MODIFIED Requirements

### Requirement: Fail-closed pending finalization

Finalization MUST require a qualifying current number attested for itself and MUST NOT use authorization date. A blocked or mixed-version attempt MUST give safe guidance, retain the visible pending consent, and create no PDF, file, stored object, Drive artifact, final reference, or other side effect.

(Previously: Finalization required complete current studio sanitary data recognized as verified.)

#### Scenario: Block without side effects
- GIVEN a visible pending consent whose number is missing, non-qualifying, changed, or unattested
- WHEN finalization is attempted
- THEN it fails and the consent remains pending and visible
- AND no finalization side effect exists

#### Scenario: Reject mixed versions
- GIVEN finalization components disagree on the registration-only contract
- WHEN finalization is attempted
- THEN it fails before side effects

### Requirement: Actionable idempotent retry with current data

Retry MUST reload current studio data and reuse the pending consent. Once eligible, repeated or concurrent attempts MUST establish at most one finalized document and final file/reference. Retry MUST NOT use authorization date.

(Previously: Retry used complete verified sanitary data and retained consent and file idempotency.)

#### Scenario: Retry after attestation
- GIVEN a blocked consent becomes eligible
- WHEN that consent is retried
- THEN current data finalizes that consent without replacement

#### Scenario: Repeat safely
- GIVEN an eligible consent
- WHEN finalization runs repeatedly or concurrently
- THEN at most one finalized document and final file/reference exist
- AND no duplicate final file exists

### Requirement: Finalized document immutability and version identity

Every final document MUST identify its output version. Its PDF, canonical snapshot, stored file, and final reference MUST remain immutable and readable under that version. Later number, date-compatibility, or renderer changes MUST affect only later documents and MUST NOT alter or reinterpret history.

(Previously: Finalized output was immutable and versioned, with later studio or renderer changes prospective only.)

#### Scenario: Identify revised output
- GIVEN a consent is finalized under registration-only output
- WHEN inspected
- THEN its version is identifiable and omits authorization date

#### Scenario: Preserve history
- GIVEN an artifact was finalized under an earlier version
- WHEN registration-only behavior runs
- THEN its bytes, snapshot, file, reference, version interpretation, and readability remain unchanged

### Requirement: Privacy-safe document verification

Verification MUST use synthetic people, identifiers, and numbers, MUST check visible representative birth date and phone when applicable, and MUST NOT expose actual numbers or real-person data.

(Previously: Verification used synthetic people and identifiers, checked representative birth date and phone, and avoided logged personal identifiers.)

#### Scenario: Verify representative output safely
- GIVEN a PDF uses a synthetic represented person and number
- WHEN visible output is verified
- THEN representative birth date and phone are observable
- AND no actual number or real-person data appears in evidence
