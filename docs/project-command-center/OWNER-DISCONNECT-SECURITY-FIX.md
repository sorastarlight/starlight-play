# Existing owner Twitch-disconnect authorization repair

Discovered during I13 source/catalog audit. Scope: routine security correction to an existing action; no new recovery capability, no role expansion and no account action executed.

The deployed SECURITY DEFINER admin_disconnect_twitch(uuid,text) used `if private.play_staff_role() <> 'owner' then`. SQL NULL does not enter that IF branch; the live role helper returns NULL for signed-out or unassigned callers. Both anon and authenticated inherited EXECUTE. This was reproduced only in disposable local PostgreSQL, with synthetic connection rows and stub downstream helpers. No hosted target identity IDs were fetched and no hosted disconnect call was made. This finding is distinct from ordinary UI permission checks.

Applied migration `harden_owner_twitch_disconnect` from supabase/harden-owner-twitch-disconnect.sql. Preflight source MD5 f51b54c3c819b0d01b9e5ad1a132354a prevents overwriting drift. Only the authorization predicate changes: require non-null auth.uid() and `play_staff_role() IS DISTINCT FROM 'owner'` rejection. Revoke PUBLIC and anon EXECUTE; authenticated retains entry, with owner guard in body. Existing disconnect, primary-selection and audit behavior unchanged.

Post-install catalog: null-safe guard present; anon EXECUTE false, authenticated true; source MD5 df3260e967a875cee832f3083285a8da. This catalog verification does not invoke the account mutator. No account data was read or changed.

REAL SQL: `node tools/owner-disconnect-rehearsal.js` passed 9 checks on disposable loopback embedded PostgreSQL: reproduce old anonymous/null-role bypass on synthetic row and roll back; deny anonymous through ACL; deny signed-in NULL/player/moderator/admin roles; deny absent caller even with synthetic owner role; allow real signed-in synthetic owner with exactly one synthetic audit event; verify grants. All successful synthetic disconnects rolled back. Test fixture is the original function definition without secrets; dependencies are stubbed. Hosted account behavior is untested by design.

Do not restore the old guard or PUBLIC/anon grant during rollback. Pause the action by revoking authenticated entry if needed; preserve audit history. A complete future identity-recovery workflow still needs last-login protection and separate owner-approved implementation as specified in ACCOUNT-RECOVERY-ISSUE-13.md. R18 remains open; this patch does not grant moderators anything.

Security advisor review after installation: the function is no longer reported as anonymously executable. It retains the intentional [authenticated SECURITY DEFINER entry warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable); signed-in entry is followed by the explicit owner check tested above. No role or table access was expanded.
