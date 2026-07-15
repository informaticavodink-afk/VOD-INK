# SDD Proposal — Document integrity slice

## Change
`saas-document-integrity`

## Intent
Add the first robust-document layer without breaking the existing consent flow:
PDF hash persistence, separated signature metadata, and phase-specific PDF storage
paths.

## Scope

### In scope
- Add `consent_signatures` table.
- Compute SHA-256 for generated PDFs and store it in `consent_files.sha256`.
- Store client/representative and artist signature metadata in
  `consent_signatures`.
- Stop using one mutable PDF path. Write:
  - `.../{consentId}/client-signed.pdf`
  - `.../{consentId}/artist-signed.pdf`
- Keep existing `consents.legal_acceptance` signature fields for compatibility.

### Out of scope
- Versioned legal templates.
- Public token flow `/c/:publicToken`.
- Full signature image Storage extraction.
- Removing legacy `legal_acceptance` JSON signatures.

## Success criteria
- [ ] Initial client submission creates `client-signed.pdf` and a client or
      representative signature row.
- [ ] Artist signing creates `artist-signed.pdf` and an artist signature row.
- [ ] Every PDF row has `sha256`.
- [ ] Existing panels and downloads still work.
- [ ] `npm run lint` and `npm run build` pass.
