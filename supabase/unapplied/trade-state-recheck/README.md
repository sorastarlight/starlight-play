# Trade state recheck — installed CODEX-116

Owner-approved migration20261022162826 installed only play_trade_cancel(uuid) and play_trade_decline(uuid). A concurrent completed/accepted update can no longer be overwritten by stale cancellation/decline. Conditional updates recheck state and reject before side effects when stale. Existing ownership checks,permissions and normal responses remain. No hosted trade test or historical repair ran.

Local evidence:2baseline reproductions and16REAL LOCAL SQL checks execute exact guarded install/rollback with fictional rows and concurrent sessions. Acceptance side is modeled as its committed state transition,not full specimen/reward/trigger/RLS integration. Read-back proves exact candidate bodies/attributes and unchanged withdrawal/direct-cancel definitions and attributes. Migration/verification:evidence in docs/project-command-center/LAUNCH-CODEX116-TRADE-STATE.md.

Both packets are transactional and guard exact source,ACL,owner,search_path,security-definer,volatility,strictness and parallel attributes. INSTALL.sql is an installed recovery delta,not an unexecuted proposal despite the historical unapplied folder. ROLLBACK.sql restores the two original race-prone definitions only from exact candidate state;do not run automatically. Neither packet authorizes extra SQL,gameplay or data repair.

INSTALL.sql SHA256 2e1657bdfd0d05bdcfe39f580dc8f2b326b5f813ae0b96e8c1e6444a8427c901
ROLLBACK.sql SHA256 45482d9032d5bdbcfbb9bb8eec370dec8d9cae5923a84d19dc2c35428100087e

Preserve exact LF bytes via .gitattributes. Local harness/captured baseline remain private under LOCALAPPDATA/PokemonStreamLink/security/codex116.
