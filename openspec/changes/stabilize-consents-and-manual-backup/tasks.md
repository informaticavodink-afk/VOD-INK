# Tasks: Stabilize Consents and Manual Backup

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 2,100-3,100 total; 80-300 per PR |
| 300-line project budget risk | High |
| Chained PRs recommended | Yes; PR 1 -> PR 14 |
| Delivery / chain | auto-chain / stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

Strict-TDD evidence accompanies each <=300-line PR; split before review if exceeded.

## Phase 1: Urgent Stability

- [x] 1.1 **PR 1 (140-240):** RED/GREEN the explicit composite artist embed and tenant-safe list in `ConsentsManager*`.
- [ ] 1.2 **PR 2 (160-280):** Make local Supabase/PostgREST and two-FK checks mandatory; unqualified embed or unavailable REST MUST fail release. Implementation ready; remote enforcement awaits 1.9.
- [ ] 1.3 **PR 3 (160-260):** RED/GREEN immutable download, safe filename, unavailable/unauthorized errors and no false success.
- [ ] 1.4 **PR 4 (180-290):** Test ZIP counts, unique names, opaque diagnostics, cleanup, partial and zero-success; extract coordinator.
- [ ] 1.5 **PR 5 (120-220):** Wire truthful ZIP UI counts/refusal to `ConsentsManager`; keep coordinator tests with behavior.
- [ ] 1.6 **PR 6 (180-290):** Prove synthetic minor submission/finalization and complete representative record including birth date/phone and signature attribution.
- [ ] 1.7 **PR 7 (140-260):** Prove PDF/list/download/ZIP identity; audit two reported attempts read-only as opaque found/not-found/inconclusive, assuming nothing.
- [ ] 1.8 Confirm delivered chain `A2a-infra-3 -> A2a -> A2b -> A3 -> A4 -> C -> D -> E -> F -> G`; do not reimplement it. Verify exact compatible commit and A-disabled contract.
- [ ] 1.9 **DEPLOY STOP:** planning is not authorization. Obtain fresh publication approval, deploy compatible Phase 1 code, reconcile repo/commit/Vercel, and validate A disabled.
- [ ] 1.10 Drain workers; run read-only Supabase identity, ledger, reader and no-v4-side-effect preflight.
- [ ] 1.11 **SQL STOP:** obtain separate fresh approval for exact project/migration; apply existing B only, then prove enabled adapters and finalization gates.
- [ ] 1.12 **PR 8 (120-220):** After enabled postflight, deliver the preserved no-date UI/client slice; verify no date payload and unchanged v2/v3 history.
- [ ] 1.13 **DEPLOY STOP:** freshly authorize PR 8 publication; run adult/minor/list/PDF/ZIP/no-date Production acceptance.
- [ ] 1.14 **PR 9 (80-180):** Record exact identities, mandatory REST result, privacy-safe receipts and rollback state; change legal wording only with approval.
- [ ] 1.15 If no v4 exists, rollback activation only with compatible app and checks. After any v4, block finalization and forward-fix; never rewrite signed data.

## Phase 2: Deferred Manual Drive Backup

Blocked until 1.14 passes.

- [ ] 2.1 **PR 10 (180-290):** Resolve OAuth subject and selected Drive folder ID with memory-only `drive.file` token; no ledger access beforehand.
- [ ] 2.2 **PR 11 (180-300):** Add RLS ledger/claims unique on account subject, folder ID, consent ID and final SHA-256; test races.
- [ ] 2.3 **PR 12 (180-300):** Reconcile ledger plus Drive `appProperties`; test retry, concurrency, interruption and destination/account changes.
- [ ] 2.4 **PR 13 (160-280):** Add connect/destination/disconnect UI and privacy-safe audit state.
- [ ] 2.5 **PR 14 (180-300):** Add foreground Create backup progress/resume; prove close stops work and no email/cron/n8n/queue/refresh-token path exists.
