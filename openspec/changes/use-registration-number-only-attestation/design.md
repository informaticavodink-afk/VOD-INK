# Design: Registration-number-only attestation and verification

## Technical Approach

Deliver exactly two macro phases. **Phase 1** completes the accepted fail-closed A/B rollout and removes authorization date only from active future-consent paths. It preserves `studios.health_authorization_date` as nullable history-only state, all legacy/v2/v3 readers and renderers, and every signed snapshot, file reference, Storage object, and PDF byte. **Phase 2** comprehensively verifies Phase 1 plus the previously implemented repairs; any defect becomes a separate focused TDD correction before the complete matrix is rerun.

`A2a-infra-3` remains the first blocked prerequisite: its independent-session concurrency harness must retain exact private resource identities until cleanup is proved. A2a and every successor remain blocked until infra-3 is accepted.

## Architecture Decisions

| Decision | Choice | Rejected alternative | Rationale |
|---|---|---|---|
| Authority | Versioned, service-role-only SQL RPCs own mutation and readiness | UI/server inference from `studios` | One transactional, auditable, fail-closed contract |
| Date boundary | Omit date from active DTOs, RPC v2, readiness, v4 schema/composer/PDF | Drop/clear the column or global-delete references | Protects historical data and legacy rendering |
| Document version | New strict `consent-v4-registration-only`; preserve legacy/v2/v3 readers/renderers | Reinterpret old snapshots with the new renderer | Signed artifacts remain immutable and readable |
| Rollout | Migration A installs v2 disabled; reviewed app deploys; separate migration B activates after drain proof | Apply compatibility and activation together | Mixed versions fail closed and rollback remains bounded |
| Delivery | `auto-chain`, `stacked-to-main`, autonomous PRs at **<=400 attributed changed lines** | Merge concerns to reduce PR count | Keeps review, verification, and rollback coherent |

## Data Flow

```text
/admin number + explicit attestation
  -> shared server parser (reject unknown date field)
  -> update_studio_settings_as_manager_v2
  -> normalized number + bound attestation + privacy-safe audit

finalize pending consent
  -> get_studio_finalization_context_v2
  -> READY only for enabled contract + current attested number
  -> canonical consent-v4-registration-only
  -> v4 PDF -> immutable final metadata/object/reference

legacy/v2/v3 artifact -> versioned historical reader/renderer -> unchanged output
```

No PDF, file, Storage, Drive, or final-reference side effect may precede readiness success.

## File Changes

| Area | Action | Description |
|---|---|---|
| `supabase/migrations/20260812122407_registration_attestation_compatibility.sql` | Modify | Finish disabled migration A: locking, signed-artifact invariants, v2 RPCs, audit, ACLs; never rewrite date history |
| `supabase/tests/*.sql`, `supabase/tests/all_signed_final_file_concurrency.test.ts` | Modify/Create | Static invariants plus two-project real-session concurrency and exact cleanup proof |
| `server/studioSettings.ts`, `server/routes/studioSettings.ts`, `api/studio-settings.ts`, `api/_lib/parseBody.ts` | Modify | Registration-only active transport and adapter parity |
| `src/lib/studioSettingsClient.ts`, `src/components/admin/StudioSettingsManager.tsx` | Modify | Remove active date state, field, copy, and payload |
| `server/consents.ts` | Modify | Call readiness RPC before side effects; preserve retry/idempotency |
| `server/consentPdfData.ts`, `src/domain/consents/consentPdfSchema.ts`, `src/types.ts` | Modify | Add strict v4 while retaining legacy/v2/v3 compatibility |
| `src/lib/pdf.ts` | Modify | Render v4 without date; keep historical branches |
| `src/types/supabase.ts` | Regenerate | Add versioned RPC types; retained table row may still expose nullable historical date |
| Focused `*.test.ts(x)` suites | Modify | Contract, UI, finalization, canonical, PDF, compatibility, privacy |
| Separate activation migration B | Create | Enable v2 and retire legacy RPC only after operational gate |

## Interfaces / Contracts

- Active request: identity/contact fields, `health_registration_number`, `attest_health_data`, exact `registration-attestation-v2`; any authorization-date key is invalid.
- Mutation RPC returns safe outcome code, contract version, and resulting attestation state; it never reads/writes date.
- Readiness RPC returns context only for `READY`; failures return safe metadata and no registration/date.
- v4 canonical schema requires registration number and forbids authorization date.

## Phase and PR Plan

**Phase 1:** retain autonomous order `A2a-infra-3 -> A2a -> A2b -> A3 -> A4 -> C -> D -> E -> F -> G`, then gated `B`. Accepted A1/infra-1/infra-2 stay inputs. Each unit is one PR unless forecast exceeds 400, in which case split by invariant/layer before implementation. Focused RED/GREEN/TRIANGULATE/REFACTOR evidence travels with each PR.

**Phase 2:** one verification-only PR/artifact for full Vitest, lint, build, pgTAP, two-project concurrency/cleanup, finalization ordering/idempotency, v4 canonical/PDF, legacy compatibility, ACL/privacy, migration transactionality/ledger, and repository/resource cleanliness. Each discovered fix is its own <=400-line TDD PR; rerun the whole matrix afterward.

## Migration / Rollout

Migration A stays unapplied until all A units are reviewed. Pause automatic production deployment before sequential publication. Deploy compatible application against disabled A, prove old workers drained, then separately approve B. After v4 finalization, rollback must block finalization and forward-fix rather than reinterpret history. Production mutation, deployment, real registration entry, and production E2E require separate authorization.

## Open Questions

None. Infra-3 is a known blocked prerequisite, not an unresolved product decision.
