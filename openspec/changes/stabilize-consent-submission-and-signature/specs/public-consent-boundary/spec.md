# Delta for Public Consent Boundary

## ADDED Requirements

### Requirement: Privacy-safe structured submission failures

Every failed public consent submission MUST return a safe error result containing a stable public code, a safe Spanish message, an explicit retryability value, and a request or correlation identifier. The result and associated diagnostics MUST NOT expose submitted payloads, client or representative personal data, signature data, credentials, or raw database or internal error messages. Unknown failures MUST use a generic non-disclosing server-failure classification.

#### Scenario: Return a known safe failure

- GIVEN a public consent submission encounters a known validation, representation, idempotency/conflict, or persistence-stage failure
- WHEN the failure response is produced
- THEN it contains a stable public code, safe Spanish message, retryability value, and correlation identifier
- AND it contains no submitted data, signature data, credentials, raw database message, or other internal detail

#### Scenario: Redact an unknown failure

- GIVEN a public consent submission encounters an unclassified internal failure
- WHEN the failure response and diagnostics are produced
- THEN the response uses a generic non-disclosing server-failure classification
- AND diagnostics correlate the failure using only the correlation identifier and safe stage or code
- AND neither response nor diagnostics exposes personal, signature, credential, payload, or raw internal data

### Requirement: Equivalent adapter failure semantics

All supported public consent HTTP adapters MUST apply equivalent status, public code, safe-message, retryability, correlation, and redaction semantics for the same failure class. A client MUST be able to normalize the structured result, compatible legacy string failures, malformed bodies, and non-JSON failures without exposing unsafe content.

#### Scenario: Classify the same failure through each adapter

- GIVEN equivalent synthetic public submissions encounter the same known failure through the Express and Vercel adapters
- WHEN each adapter responds
- THEN both responses express the same public failure classification and retryability semantics
- AND each supplies a correlation identifier
- AND both satisfy the same redaction rules

#### Scenario: Normalize a compatible legacy or invalid failure body

- GIVEN a public submission fails with a legacy string error, malformed response body, or non-JSON response
- WHEN the client normalizes the failure
- THEN it produces safe actionable failure information
- AND untrusted response content is not displayed as an internal diagnostic

### Requirement: Pending and idempotent submission recovery

The public wizard MUST permit no more than one submission request to be pending for the current attempt. It MUST preserve all entered form data, signature data, and the current idempotency key after failure. It MUST offer retry only when the normalized failure is retryable, and a retry MUST reuse the preserved idempotency key. Success state MUST appear only after the API confirms successful creation.

#### Scenario: Prevent duplicate requests while pending

- GIVEN a public consent request is pending
- WHEN the user activates submission again
- THEN no additional request is started
- AND the current form, signature, and idempotency state remain unchanged

#### Scenario: Preserve state after a retryable failure

- GIVEN a pending submission fails with a retryable safe error
- WHEN failure feedback is shown
- THEN the entered form data, signature, and current idempotency key remain available
- AND visible safe feedback includes the actionable message and correlation identifier
- AND retry is offered

#### Scenario: Retry the same submission safely

- GIVEN a retryable failure preserved the current submission state
- WHEN the user retries
- THEN the request reuses the preserved idempotency key
- AND success is shown only after the API confirms creation
- AND an ambiguous prior attempt cannot cause the wizard to create duplicate consents through concurrent submission

#### Scenario: Do not offer an unsafe retry

- GIVEN a normalized submission failure is not retryable
- WHEN failure feedback is shown
- THEN the wizard preserves the entered state
- AND it does not offer retry for that failure

### Requirement: Unchanged non-represented adult submission

The reliability behavior MUST preserve the established public submission behavior for an adult to whom representation does not apply, except for the added safe failure, pending, and retry presentation defined by this change.

#### Scenario: Submit for a non-represented adult

- GIVEN a synthetic adult does not use representation and provides a valid public consent submission
- WHEN the API confirms creation
- THEN creation succeeds according to the existing public consent contract
- AND no representative record or representative signer is introduced
