# Owner account diagnostics — CODEX-11

The owner confirmed proceeding with the accepted recovery proposal. Connections now has an explicit **Inspect sign-in methods** control. It returns masked email (including masked domain), email verification, password-presence boolean, Auth provider names and observation time. Existing Twitch app connection cards remain separate from Auth identities. Actual working sign-in routes remain Unknown until tested.

This slice is read-only. It does not send mail, reset passwords, unlink identities, revoke consent, impersonate accounts or change staff permissions. The recovery design's recent-reauthentication gate is not implemented by this read-only slice; it remains required design work before recovery mutations. `snapshotRevision` identifies this observation only; it is not a prepared-action token or consistency guarantee across Auth and database reads.

## Authorization and privacy

Caller JWT verification is enabled. The Edge Function validates the current caller with Auth getUser, then calls the database context with that caller's token. The context requires a non-null caller and the current owner role, denies missing/protected targets (including PlayTester/PlayerQA), and only then permits Auth Admin getUserById on that exact target. Admin/moderator/player/null callers have no diagnostics access. R18 remains open.

Auth Admin credentials remain server-only. Browser responses contain no full email, identity payload, password/hash, recovery link or provider/session token. No response logging or browser persistence is added. Responses use no-store, a fixed production CORS origin, escaped output and stale-response guards. Existing Twitch connection data may predate the inspection; the inspection does not prove an unlink would be safe.

## Installation and verification

- Applied `supabase/owner-account-diagnostics.sql` as migration `20261019052945_owner_account_diagnostics_context`.
- Installed context fingerprint `ec01e836ea960686d83f3b2409149db9`; STABLE, SECURITY DEFINER, search_path=pg_catalog; anon execute false, authenticated entry true with explicit owner guard.
- Edge `owner-account-diagnostics` version 1 ACTIVE, verify_jwt true. Deployed source retrieved and checked; unauthenticated hosted POST returns HTTP 401 without a target lookup.
- 12 synthetic endpoint/privacy/UI-state checks; 10 real disposable PostgreSQL authorization checks. No hosted trainer diagnostics invoked. Local browser fixture verified masked results; fixture does not use Auth or live trainer data.
- All 74 nonwriting suites pass; build validation preserves APP 20261008-rc133 (30 root pages, 411 stamps).
- Security advisor flags the intentional authenticated SECURITY DEFINER entry; owner guard is exercised in real local SQL. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). No new table or RLS policy is added.

Real owner-to-trainer Auth inspection remains unverified. No test email sent, password changed, protected account accessed, gameplay RPC called, spending incurred, build stamped, or D86 started. WIRE/Familiarity state is unchanged.

Next: the accepted recovery proposal's audited owner recovery-email flow, with recent reauthentication, fixed redirect, rate limiting and explicit confirmation; do not infer it exists from this diagnostics control. Helpdesk architecture remains separate.
