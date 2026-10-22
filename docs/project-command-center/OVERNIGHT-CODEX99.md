# CODEX-99 — Dynamic SQL boundary review

Read-only hosted pg_proc inspection: four public/private function bodies contain the word EXECUTE, but two are permission-check strings rather than dynamic SQL statements. Anchored statement scan finds two functions: private.public_ledger_lockdown_self_test (browser EXECUTE denied) and public.admin_grant_bag (anon denied, authenticated entry guarded by require_staff_edit). The private ledger routine interpolates a fixed table-name list with identifier quoting; it was not invoked.

The staff bag branch first restricts columns to seven literal inventory keys, quotes each identifier via format %I and binds quantity/user via USING. Its require_staff_edit source calls require_hub and coalesces missing staff role to empty before requiring owner/admin. Source review is not a fresh Auth integration test.

A fresh loopback PostgreSQL rehearsal exercised the exact extracted allowlist/dynamic-UPDATE branch using fictional inventories.21 REAL LOCAL SQL cases pass: seven selected-column/target-only decrements, seven zero clamps, four rejected unsupported keys, two rejected malformed/overflow quantities, and rollback of an earlier branch update after a later invalid key. This is not execution of the full staff grant function or its other ledger/grant branches. No newly confirmed injection flaw in this scoped review. Broad search_path/nested authorization review is not declared complete.

Private source fragment, test and result:LOCALAPPDATA/PokemonStreamLink/security/codex99. Sanitized evidence and hashes:evidence/codex99-dynamic-sql.json. Ephemeral local server stopped and directory cleanup verified. No hosted function invocation, user data retrieval, grants, privileged action, SQL install, provider/credential/gameplay/spending/scheduling change or APP stamp. Latest frontend maina51bcbbf remains unchanged. No unchanged95-suite rerun.

The important launch-scope prompt from CODEX-98 is still pending. Do not interpret this independent review or elapsed time as accepted device/provider deferrals. Continue genuinely independent work within the existing overnight hard stop. Sora NO;Twinkle NO;PlayTester unchanged.
