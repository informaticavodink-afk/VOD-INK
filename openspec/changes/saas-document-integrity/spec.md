# SDD Specification — Document integrity slice

## Requirements

### FR-1 Signature metadata

The system must store one row per captured signature in `consent_signatures`.
Rows include `consent_id`, `studio_id`, optional `artist_id`, `signer_type`,
`signer_name`, `signature_hash`, optional `signature_storage_path`, `signed_at`,
and `metadata`.

### FR-2 PDF hash

Every generated PDF uploaded to Supabase Storage must have its SHA-256 persisted
in `consent_files.sha256`.

### FR-3 Phase-specific files

Initial client submission writes `client-signed.pdf`. Artist signing writes
`artist-signed.pdf`. The artist signing flow must not overwrite the initial PDF.

### FR-4 Compatibility

`consents.legal_acceptance.firmaCliente` and `firmaAplicador` remain populated so
existing PDF regeneration and UI logic continue to work.

## Scenarios

### SC-1 Client submits consent

Given the public wizard has a client signature
When the consent is submitted
Then `consent_files.sha256` is populated
And `consent_signatures` contains a `client` row.

### SC-2 Representative signs for a minor

Given the public wizard marks the client as minor
When the representative signs
Then `consent_signatures.signer_type` is `representative`.

### SC-3 Artist signs later

Given a consent is pending artist signature
When the artist signs
Then a new `artist-signed.pdf` file row is inserted
And `consent_signatures` contains an `artist` row.

## Acceptance criteria

- [ ] Migration creates `consent_signatures` with RLS enabled.
- [ ] Server computes SHA-256 for initial and final PDFs.
- [ ] Server inserts signature metadata rows.
- [ ] Lint/build pass.
