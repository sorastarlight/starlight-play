# Launch security hardening — CODEX-34

Owner instruction, October 20, 2026: proceed through the seven launch objectives in order, autonomously, asking only for important decisions. This authorizes the first objective's security fixes, not unrelated gameplay, scheduling, resets, spending or a release stamp.

## Installed and independently verified

Migration `20261021011358` (`launch_admin_authorization_hardening`) completed October 21 UTC / evening October 20 EDT.

- **R1 closed:** `public.admin_overview()` calls `private.require_hub()` before settlement. Authorized staff settlement and return data remain unchanged.
- **R2 closed for the current catalog:** revoked PUBLIC/anon EXECUTE from84 public admin functions. Independent verification found **zero anonymously executable admin functions**, with authenticated EXECUTE unchanged on every inspected function. Internal-only functions were not granted new privileges.
- **R18 closed for the four recorded legacy endpoints:** `admin_set_pass`, `admin_grant_bits_pack`, `admin_oak_qa`, and `admin_qa_grant_pass_reward` first call the established `require_staff_edit()` guard. Owner/admin access remains; moderators cannot invoke these edits. Existing inner checks/business logic and staff roles are unchanged.

Read-only comparison of112 catalog functions confirmed exactly five expected body changes; other inspected bodies and authenticated permissions remained unchanged. Verification used catalogs, not production gameplay or successful staff mutations.

Advisor triage found obsolete `phase5_identity_selftest()`, which has no runtime callers and grants retired frames to a fixed historical QA account. Migration `20261021011646` removed PUBLIC/anon/authenticated EXECUTE. Independent verification at01:16:47 UTC confirmed both browser roles denied, service-role access preserved, original body MD5 `75b08e01fa171f084446fb0e4b06a718` unchanged. Its body was never invoked.

## Validation

- **33 REAL LOCAL SQL checks:** actual wrapper/retirement bodies with fictional records and dependency stubs. Signed-out/player/moderator denials; owner/admin paths; nontransactional settlement counter proves denied overview calls do not reach settlement;84 exact revoke signatures; authenticated access retained; original five bodies restore exactly; retired self-test denied at ACL.
- **77 non-writing source/local-model suites passed**, excluding known artifact-writing `a19-schema-tests.js` and `special-events-ux-tests.js`. Corrected one obsolete historical-handoff assertion to recognize current D85 completion and sole-runner records while preserving archival evidence checks.
- Build: **31 HTML /423 references**; APP `20261008-rc133` unchanged.
- Local role claims/business dependencies are fixtures, not real sessions or full hosted economy validation.
- Initial harness fixture ACL/identity/transaction errors were corrected before installation. A truncated first read-only hosted preflight failed syntax validation without writes; the complete packet then passed all source/ACL pins.

Evidence is under `evidence/launch-security-*` and `evidence/launch-static-regressions.json`. Reviewed SQL/manifest: `supabase/unapplied/launch-security/`. Despite that archival folder name, INSTALL and RETIRE-SELFTEST are now applied; do not reapply the original-source-pinned INSTALL. `ROLLBACK.sql` restores known vulnerabilities and requires emergency review, never automatic execution; it does not reopen the separately retired self-test.

## Wider advisor follow-up

These targeted closures are not a blanket security sign-off. Advisor findings:270 mutable search paths;79 other anonymous security-definer functions before self-test retirement;197 authenticated security-definer findings;46 RLS/no-policy informational findings; leaked-password protection disabled. Triage actual exposure instead of weakening RLS or bulk-changing gameplay functions. Five bridge entrypoints inspected check `bridge_ok` before writes. No admin-prefixed advisor finding remained. Clients cannot CREATE objects in public/private/auth; authenticated private-schema USAGE makes helper ACL review relevant even though private is not exposed by PostgREST. Guest `play_sync` calls the director; page loads are not presumed read-only QA.

References: [function security](https://supabase.com/docs/guides/database/functions), [search-path advisor](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous definer advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No paid upgrade is authorized.

Next: hosted gameplay decision because encounters are shared. See LAUNCH-READINESS.md. No gameplay/delivery/scheduling/reset/stamp ran. Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA/EmailQA mutated NO; no staff-role changes or spending.
