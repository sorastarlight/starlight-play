# CODEX-67 â€” Owner guard must reject null permission results

INSTALLED / VERIFIED. Owner explicitly approved the correction. Migration 20261021181614 installed the exact guarded one-function packet. Hosted source hash e20b1b2f24e047a83e9a33a47737e38c matches local tests; ACL, owner, configuration, security mode and volatility are unchanged. Aggregate fingerprints of all other public/private functions, site configuration, staff roles and catches are unchanged. No live secret-management endpoint was invoked. Evidence: docs/project-command-center/evidence/owner-guard-null-hosted.json. No incident assessment or credential rotation is claimed.

## Problem and proposed correction

private.play_staff_role can return null for an authenticated trainer without a staff assignment. private.can_manage_secrets compares that value to owner and therefore also returns null. private.require_owner currently uses IF NOT permission;PostgreSQL does not enter that denial branch for null. Four authenticated public routines depend on that guard:admin_issue_bridge_token,admin_save_channel,admin_save_github_token,admin_save_twitch_client_secret. Their anonymous ACL denials do not protect against an ordinary authenticated account.

Exact captured definitions with fictional data reproduce all four guard bypasses. Channel configuration also feeds the exact staff-role helper;the local test demonstrates matching a confirmed Twitch identity can consequently confer owner status without assigning a staff role. No affected hosted endpoint was invoked,no hosted token/secret value was read,and no existing exploitation assessment is claimed.

INSTALL.sql replaces only private.require_owner(),changing its denial condition to `private.can_manage_secrets() IS NOT TRUE`. Only a true owner result passes. It preserves the function signature,owner,ACL,stability and security mode. Seven exact source/permission/configuration fingerprints cover the guard,two authorization dependencies and four public callers. Drift aborts the transaction. No table,role,credential,provider,owner mapping,channel data,player data or database password changes. No credential rotation,gameplay or APP stamp included.

## Evidence

Run `node tools/owner-guard-null-rehearsal.js` for15 REAL LOCAL SQL checks. Uses captured role/helper/guard/four caller bodies,fictional auth/config tables and nontransactional write counters;hash/random/snapshot helpers are local stand-ins. Covers baseline bypass/derived owner identity,fixed denial for unassigned/moderator/admin/legacy-staff/no-subject service contexts,anonymous denial,assigned owner and confirmed broadcaster success,exact rollback and dependency/ACL/source drift refusals. Results:docs/project-command-center/evidence/owner-guard-null-local.json. No hosted authorization mutation smoke is needed to install this guard.

ROLLBACK.sql restores the old vulnerable condition and therefore is not a routine automatic fallback. Use only with separately reviewed containment/explicit authority if a real regression requires it. A source guard failure is a stop;never regenerate fingerprints against unexplained drift.

After approval:read-only before-state fingerprints,apply the one-function migration,verify exact source and unchanged ACL/attributes/other functions plus hashes of relevant site/bridge/staff/player records without displaying secret fields. Do not call issuance/save endpoints as a hosted test. Publish completion evidence only after the fix is verified. Database password remains explicitly unchanged and recovery drill remains held.
