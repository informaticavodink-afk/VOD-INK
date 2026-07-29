# Public Consent Boundary Specification

## Purpose

Define server-resolved studio context, least-privilege artist discovery, and durable studio/artist binding for public consent creation.

## Requirements

### Requirement: Stable server-resolved public studio context

The system MUST preserve the existing stable QR/root-domain public entry point. The server MUST resolve its trusted public context to exactly one studio and MUST NOT rely on a browser-supplied `studio_id`. Unknown or ambiguous context MUST be rejected before consent insertion.

#### Scenario: Resolve the preserved entry point

- GIVEN a visitor opens the existing QR/root-domain entry point with valid public context
- WHEN the public consent flow begins
- THEN the server resolves exactly one studio
- AND the browser is not asked to supply or authorize a `studio_id`

#### Scenario: Reject unresolved context

- GIVEN the entry-point context is unknown or does not resolve to exactly one studio
- WHEN consent creation is requested
- THEN the request is rejected before consent insertion

### Requirement: Active artist binding within resolved studio

The system MUST accept a selected artist only when the server finds that artist active within the server-resolved studio. It MUST reject an inactive, unknown, or cross-studio artist before creating a consent.

#### Scenario: Bind an active artist

- GIVEN the server has resolved a studio
- AND the selected artist is active in that studio
- WHEN public consent creation is requested
- THEN the created consent is bound to that studio and artist

#### Scenario: Reject a cross-studio artist identifier

- GIVEN the server has resolved one studio
- AND a synthetic request selects an artist belonging to another studio
- WHEN public consent creation is requested
- THEN the request is rejected before consent insertion
- AND no personal identifier is logged

### Requirement: Least-privilege public artist projection

Public artist output MUST be an allowlist containing only artist `id`, display name, displayed qualification, and optional display photo URL. It MUST NOT expose DNI or tax identifiers, studio IDs, Drive IDs, phone numbers, document metadata, or other internal metadata.

#### Scenario: Return display-only artist data

- GIVEN active artists exist for the resolved studio
- WHEN the public wizard requests artist choices
- THEN each item contains only `id`, display name, displayed qualification, and optional display photo URL

#### Scenario: Keep sensitive fields outside public output

- GIVEN an artist record contains DNI or tax identifiers, studio IDs, Drive IDs, phone data, document data, or internal metadata
- WHEN its public projection is returned
- THEN none of those fields or equivalent internal values is present

### Requirement: Durable consent and artist studio match

The system MUST durably prevent a consent's studio from differing from its referenced artist's studio on both creation and later mutation. Existing mismatches MUST be reported for manual review and MUST NOT be guessed, silently reassigned, or exposed with personal identifiers.

#### Scenario: Prevent a mismatched write

- GIVEN a synthetic consent references an artist from a different studio
- WHEN creation or mutation is attempted through any write path
- THEN the write is rejected by the durable data invariant

#### Scenario: Report an existing mismatch safely

- GIVEN a pre-existing consent/artist studio mismatch is detected
- WHEN diagnostics run
- THEN the mismatch is surfaced for manual review using non-personal record references or counts
- AND neither studio nor artist binding is silently changed
- AND no personal identifier is logged

### Requirement: Synthetic and privacy-safe boundary verification

Tests and diagnostics for public artist discovery and studio binding MUST use synthetic people and MUST NOT log personal identifiers.

#### Scenario: Verify boundary behavior safely

- GIVEN public-boundary acceptance scenarios are exercised
- WHEN fixtures or diagnostics are produced
- THEN all represented people are synthetic
- AND no personal identifier is logged
