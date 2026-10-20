# Twitch link policy — local guard implementation

Owner approved implementation and local tests on 2026-10-19. CODEX-20 covers the first server-enforcement layer. It does **not** declare all of issue #17 complete or authorize hosted installation/activation.

## Implemented

`supabase/unapplied/account-link-policy/001_link_guard.sql` is an unapplied, transactional SQL package which starts **disabled**. It adds:

- Guard triggers at Auth identity ingress and application connection insertion/confirmation. Ordinary trainers get one unique verified numeric Twitch identity; pending and unrepresented Auth identities reserve the slot. An existing email login is separate.
- Canonical checks for legacy `miu:`/leading-zero aliases; raw provider ID and returned subject must agree. Cross-trainer collisions, ambiguous duplicate aliases and direct identity transfers are denied without moving existing links.
- Written per-trainer/per-identity mutex rows. Concurrent ordinary links produce one winner. REPEATABLE READ fails with a serialization error instead of accepting a stale count. Staff role rows are share-locked so a concurrent committed demotion is observed before an exception is used.
- Private bounded exceptions (2–10 links). Approval/revocation requires the existing exact-owner, real-session, recent-AMR guard plus purpose, reason, case reference and expected revision. A moderator role alone is insufficient; protected targets are rejected. No automatic exception is installed for Sora or anyone else.
- An actor/session-checked own-policy RPC reporting count, limit, ability to add and review-needed status. Exceptions/mutex/settings have RLS and no anonymous/player direct grants. Neither client metadata nor exception approval grants unrelated staff powers.
- Existing extra confirmed links survive activation, demotion and exception revocation. New additions are denied when over limit; no forced unlink, provider deletion, collection change or primary reassignment occurs.

`rollback_link_guard.sql` removes only the new policy objects, preserving Auth identities, connection rows, profiles and existing audit records. Archive exception configuration before any separately approved hosted rollback.

## Verification

`node tools/twitch-link-policy-rehearsal.js`: **65 REAL LOCAL SQL checks passed**, embedded PostgreSQL 17.5 bound to loopback, disposable directory removed. It uses the exact captured current `handle_new_identity` body and actual recent-owner AMR/session guard body; Auth/session/role inputs and protected-target classification are synthetic fixtures. It does not run Supabase Auth/GoTrue or real Twitch OAuth.

Checks include natural first-link creation, rejection/rollback of second identities, alias/provider mismatch, server-side pending confirmation, reassignment denial, staff exception authorization/revision/audit, stale session and AMR, direct ACL denial, ordinary concurrent links, REPEATABLE READ, concurrent demotion, orphan Auth slot reservation and rollback preservation. No user credentials or hosted account rows were used. Hosted dependency catalogs confirm the existing role/protected/recent-owner/audit helpers and tables exist; no hosted policy installation occurred.

An injected post-start failure was separately verified to exit with code1 after cleanup. `embedded-postgres`'s async beforeExit hook otherwise can turn a mere `process.exitCode=1` into code0. The two new rehearsal tools explicitly exit1 after `finally` cleanup. Earlier successful output remains evidence of its checks; exit status alone should not be used to infer older harness success after an error.

Build validator passed:31 root HTML pages,422 first-party stamped references, APP `20261008-rc133`. No product frontend or existing production function body changed.

## Remaining work before activation

1. Verify real Supabase/Twitch linking callbacks and provider errors using separately authorized dedicated QA. Local SQL cannot prove Auth's same-provider identity behavior, callback transaction boundaries, or whether a rejected trigger is presented helpfully by GoTrue.
2. Connect player UI to the own-policy state, hide second-link/utility entry points for ordinary trainers and fail closed when intent creation fails. Add owner exception review UI with reasons and revision confirmation. These controls must be reviewed against actual callback behavior before publishing them.
3. Integrate and verify the locally implemented provider unlink/replacement flow described below. The current production disconnect remains unchanged. Never remove real Auth rows directly with SQL.
4. Audit/resolve legacy gameplay name/profile fallbacks, one-time OAuth intent binding/rate limits and recovery semantics from the policy report. Do not silently change gameplay attribution as part of a count guard.
5. After explicit hosted authorization, install disabled, inspect only aggregate existing-conflict counts, verify hosted ACL/advisors, then stage QA. No forced cleanup of existing multi-links. General activation remains a separate decision, with unresolved conflicts reviewed and protected trainers excluded from automated tests.

The local guard is a completed milestone; **production readiness and the full linking policy remain incomplete**. No hosted SQL writes, OAuth/provider tests, link changes, role edits, gameplay, D86, email, spending or APP stamp occurred in this batch. Sora mutated NO; Twinkle mutated NO; PlayTester role unchanged.

## Verified disconnect staging (local only)

`002_verified_disconnect.sql` prepares an actor-bound, rate-limited, durable request only after a verified email and fresh password sign-in prove a backup login. The client uses the supported `unlinkIdentity` API; finalization checks provider absence server-side before removing the exact application connection. It clears only the matching legacy profile identity when no confirmed connection remains. Private pending state can be recovered after refresh; provider errors and cancellation after removal reconcile instead of reporting false success. Completed replays and concurrent finalization add one audit outcome. Protected actors and ambiguous legacy duplicates require separate review. The old disconnect RPC is source-pinned, wrapped, and blocked for policy-active actors so it cannot bypass the staged flow. Disabled/other-actor behavior remains delegated to its exact original body. Roll back002 before001; original function body restoration is tested.

The staged `verified-disconnect-controller.js` is not loaded by production pages.19 SYNTHETIC SDK/RPC contract checks cover confirmation, actor switches, wrong provider IDs, uncertain outcomes, expiration, refresh recovery, concurrency and replay. Provider deletion in the SQL fixture is explicitly SIMULATED; real GoTrue unlink/link behavior remains unverified. The latest rehearsal has65 REAL LOCAL SQL checks including disconnect prepare/finish/cancel, privacy, rates, replacement and rollback.

A `qa_user` setting scopes enforcement to one dedicated trainer for a future separately approved QA phase; tests verify other trainers retain existing behavior in that mode. Initial installation still starts disabled. No hosted schema, Auth, links, role data or product UI changes have been made.

Concrete next stage: [disabled installation and limited QA proposal](./TWITCH-LINKING-STAGING.md). No hosted approval has been inferred from the local implementation decision.
