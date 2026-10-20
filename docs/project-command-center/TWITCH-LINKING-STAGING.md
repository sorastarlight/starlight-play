# Proposed limited hosted stage — not yet authorized

Reviewable implementation: `TWITCH-LINKING-IMPLEMENTATION.md`, unapplied SQL001/002 plus rollback files, local SQL rehearsal and staged disconnect controller.65 REAL LOCAL SQL checks and19 SYNTHETIC SDK/RPC contract checks pass. No hosted installation or provider actions have occurred.

## Concrete next stage

1. Refresh catalog/source fingerprints and existing dependencies. Stop if the disconnect source no longer matches body MD5 `9eb6275c39191242b6789697a6e419ce`. Keep an exact prior definition/execute-ACL snapshot. Inspect only aggregate counts of existing aliases, extra links and mismatched Auth/application bindings; do not expose trainer identities or force cleanup.
2. Install001 then002 using the normal Supabase migration tool, with `enabled=false` and `qa_user=NULL`. Do not infer activation authority from a successful install. Verify object definitions, RLS/ACL, advisors and source/ACL restoration plan. Disabled wrappers must preserve existing behavior; retain APPrc133 and all gameplay/D86 holds.
3. If included in the owner's authorization, set `qa_user` to EmailQA only before enabling the policy. Every other trainer continues under existing rules. No protected trainer, PlayTester/PlayerQA promotion, owner exception insertion, Sora/Twinkle identity mutation or gameplay test is permitted.
4. Use a separate Twitch test identity controlled by the owner; the owner performs credential entry/provider consent. Require a fresh EmailQA password sign-in before disconnect. Never inspect passwords, Auth tokens or provider secrets. Verify actual callback/trigger rollback, a rejected second identity, correct pending/confirmed state, and supported SDK unlink/reconciliation. Do not create or delete Auth identities with production SQL. If a second dedicated Twitch test identity is unavailable, leave that runtime branch unverified rather than borrowing a protected identity.
5. Turn the QA policy off after the checks and retain exact outcome records. Any uncertain provider action must be reconciled against the same QA request, never retried as a fresh destructive operation. No claim of full policy/production readiness from local SQL or a disabled install.

## Still held

General activation, ordinary-player UI replacement, new exception-management UI, changing legacy gameplay attribution, full intent/nonce enforcement, broader role policy, receipt retention scheduling and rollout to other trainers require their remaining implementation/review. Provider compatibility evidence comes before wiring the final UI. The new code's receipts have no automatic deletion job; completed-receipt retention must be chosen before general rollout, and unresolved requests remain available for reconciliation.

Rollback002 then001 in an approved maintenance window; archive exception/receipt state first, preserve existing identities/links/profile/economy/audit data. The local rehearsal proves function-body and execute-ACL restoration. No automatic production rollback or trainer cleanup is authorized by this document.
