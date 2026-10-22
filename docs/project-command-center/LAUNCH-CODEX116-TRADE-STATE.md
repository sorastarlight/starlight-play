# CODEX-116 Trade state race — installed and verified

## Problem and correction

Concurrent acceptance could commit after cancellation/decline had checked state but before its unqualified state update resumed. Two REAL LOCAL concurrent-session baseline reproductions changed completed -> cancelled and accepted -> declined using exact captured functions and fictional rows. Current acceptance source confirms these terminal state names. No actual hosted trade or player history was probed.

The owner explicitly approved only the tested two-function correction and read-only verification. Migration20261022162826 codex116_trade_state_recheck installed the exact reviewed packet. play_trade_cancel(uuid) now rechecks open state and owner in the UPDATE,then refuses before touching pending offers if no row updated. play_trade_decline(uuid) similarly rechecks pending state and refuses if stale. Existing owner/session checks,normal response text,permissions and other trade logic remain.

## Verification

Sixteen REAL LOCAL SQL packet/ownership/concurrency cases pass with actual INSTALL.sql/ROLLBACK.sql:both concurrent refusals,normal/repeated actions,foreign and missing identities,unmodified withdrawal/direct-cancel controls,exact rollback,and source/ACL/mixed-state drift refusal. Two generator/fixture errors were caught locally and corrected before the successful complete run. The acceptance side models only its committed status transition;not full specimen/reward/trigger/RLS integration or hosted gameplay.

Fresh hosted preflight matched target source and ACL/config/owner/behavior attributes;reviewed raw packet hashes matched. After installation,both full generated definitions and body fingerprints equal candidates;ACL,search_path,owner,security-definer,volatility,strictness and parallel attributes unchanged. Withdrawal/direct-cancel bodies,definitions and checked attributes unchanged. No application function invoked,player-data repair,trade,reward,provider,email or APPstamp action. Rollback not needed. Approval is spent and grants no further mutation authority.

## Recovery and artifacts

Installed guarded packets:supabase/unapplied/trade-state-recheck/INSTALL.sql and ROLLBACK.sql. The historical folder name does not mean uninstalled. Both exact paths pinned LF in .gitattributes;Git checkout-index recreated both with reviewed raw hashes. Build31HTML/464references passes. No unchanged100-suite rerun claimed;latest full frontend run remains CODEX-114.

INSTALL SHA256 2e1657bdfd0d05bdcfe39f580dc8f2b326b5f813ae0b96e8c1e6444a8427c901
ROLLBACK SHA256 45482d9032d5bdbcfbb9bb8eec370dec8d9cae5923a84d19dc2c35428100087e

Private source/harness/results:LOCALAPPDATA/PokemonStreamLink/security/codex116. Clusters stopped and ephemeral fixtures removed;no credentials/real player data used. Original private recovery archive unchanged. Current observed backups predate this migration;future recovery needs the matching guarded delta or a verified later snapshot. No restore/export/scheduling authorized. See RECOVERY-POST-DRILL-DELTAS.md.

Evidence:evidence/codex116-trade-packet.json,evidence/codex116-hosted-verification.json,evidence/codex116-packet-bytes.json. Main frontend739fbc19 remains unchanged;APP20261008-rc133. Sora NO;Twinkle NO;PlayTester role unchanged. Required real-device/assistive/provider acceptance remains open;Twitch testing held.
