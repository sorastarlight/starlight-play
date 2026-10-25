# Recovery changes after CODEX-71

The successful logical snapshot was exported October21 at21:05–21:06 UTC. It predates the following approved security change. The private original archive is retained unchanged and its isolated local server remains stopped.

| Hosted migration | Reviewed packet | SHA256 of INSTALL.sql | Status |
|---|---|---|---|
|20261022014528 codex73_site_config_browser_update_boundary|supabase/unapplied/site-config-write-boundary/INSTALL.sql|e776607a90e6e59cd941c964eacb6649dcd22df291fe8887fc3dd032490c31bf|Installed/independently verified;14 fictional local SQL checks|

A future restored environment must retain the CODEX-73 privilege boundary before exposing its Data API or admitting trainers. Review and replay only against matching guarded original schema/ACLs;unexplained drift is a stop. Do not automatically execute rollback,it restores risky grants. Packet testing is not a second full restored-archive replay certificate. No new export,production restore,job activation or private artifact mutation occurred. Physical backup/full Auth recovery remain outside certification.

## Edge code dependencies after the drill

Database backups do not replace deployed Edge source/configuration recovery. Preserve the reviewed source and redeploy the secure versions when recovering;do not revert to their pre-correction versions. Existing environment secrets must stay in the provider/secure credential process,never copied into this document or Git. No redeploy/restore is authorized by this inventory.

| Function | Secure deployed version | Candidate source SHA256 | Required setting | Evidence |
|---|---|---|---|---|
|refresh-pass|7|145799c1499259185e6538b0f2dd2d6791856a6cd39e6405259af31cf1fbba1c|verify_jwt=true|CODEX-80 retrieved-source verification|
|store-asset|5|3b6303df53bf911ddd44f570bf0a9655f2d8c89da80971db6ad8842ab5578753|verify_jwt=true|CODEX-83 retrieved-source verification|

CODEX-85 read-only dashboard check still lists21Oct202607:44:55UTC as latest PHYSICAL snapshot;it predates CODEX-73 SQL installed22Oct01:45UTC. A newer post-change snapshot has not been verified. Storage objects are excluded from database backup per dashboard notice. No Restore control clicked,new export,physical recovery or integration replay performed.

## CODEX-94 current backup observation

October22 read-only dashboard now lists PHYSICAL backup22Oct202607:44:04UTC, after CODEX-73 migration20261022014528 (catalog entry verified). Local guarded INSTALL.sql SHA-256 still matches the table above. The pending newer-snapshot observation is satisfied; older CODEX-85 statements are historical. Backup contents/physical restore/full Auth recovery are not certified. Original logical archive still needs its CODEX-73 replay delta; Edge7/5 dependencies remain. No Restore/export/credentials action. Evidence:evidence/codex94-backup-observation.json.

## CODEX-96 approved deltas after the new physical backup

| Migration | Guarded install | SHA256 |
|---|---|---|
|20261022084110 codex96_purchase_unlock_atomicity|supabase/unapplied/purchase-unlock-atomicity/INSTALL.sql|f1b7c6e2f12c60fae47e1329f51ac6b877f8339bf73b451eee3e07390a398b94|
|20261022084115 codex96_username_reminder_no_write|supabase/unapplied/username-reminder-no-write/INSTALL.sql|db08f88bf6eca02eda89b13a728476f1e0a8ced7dc4f93b61dddae3ccf045022|

Installed and independently source/attribute verified after explicit owner approval. Both original logical archive and latest observed22Oct07:44:04UTC physical snapshot predate these changes. Replay guarded deltas before admitting trainers or use a later verified backup; do not automatically rollback. Next daily snapshot may be checked when due, without polling unchanged state. No extra export/restore/schedule authorized.

CODEX-104:four new packet paths are pinned text eol=lf in .gitattributes. Windows checkout had changed raw hashes through CRLF;only EOL drift was found and original LF bytes restored. All4post-Git-checkout hashes match reviewed originals;28fresh local cases execute the repository install/rollback copies. Preserve exact files/attributes before any guarded recovery. This is not a new hosted/full-archive restore certificate. See OVERNIGHT-CODEX104.md.

## CODEX-116 approved trade state delta

| Migration | Guarded install | SHA256 |
|---|---|---|
|20261022162826 codex116_trade_state_recheck|supabase/unapplied/trade-state-recheck/INSTALL.sql|2e1657bdfd0d05bdcfe39f580dc8f2b326b5f813ae0b96e8c1e6444a8427c901|

Owner-approved and exact-source/attribute verified. Two functions only;no player mutation/history repair or hosted trade test. Both observed older recovery points predate this delta. Replay only on matching guarded baseline or use a verified newer snapshot;no automatic rollback (it restores the race). Exact INSTALL/ROLLBACKbytes pinned LF and verified after Git checkout-index. No new backup,restore,export or job authority. See LAUNCH-CODEX116-TRADE-STATE.md.

## CODEX-118 approved notice delta

|Migration|Guarded install|SHA256|
|---|---|---|
|20261022171505 codex118_atomic_notice_claim|supabase/unapplied/atomic-notice-claim/INSTALL.sql|145fef9bbf6b78f79c84518e308707322e235d3ed285a19e532306e46f2b7ea5|

Owner-approved and exact-source/attribute verified;one function only,no notice endpoint or player repair. Older observed logical/physical recovery points predate this delta. Retain matching guarded replay or verify a newer snapshot;no automatic rollback,new export,restore or scheduling authorized.

## Local integrity preflight — CODEX-119

Run `node tools/check-recovery-packets.js` or normal build validation before reviewing a recovery operation. recovery-packets.json pins both reviewed files for every migration table above; raw hashes, LF bytes, safe paths and migration versions/order must match. New approved deltas require an explicit reviewed manifest entry. Do not replace expected hashes on unexplained drift. This check reads local files only and never executes SQL or authorizes a restore.

## CODEX-121 approved release confirmation delta

|Migration|Guarded install|SHA256|
|---|---|---|
|20261022185226 codex121_shiny_release_confirmation|supabase/unapplied/shiny-release-confirmation/INSTALL.sql|4598cffd04b99167f6dd31e3e2228ddea3cdc5ef02618df1340a2b9311347fbd|

Owner-approved and exact source/attribute verified;one expression in one function. No release,player repair or other gameplay call. Older observed snapshots predate this delta. Preserve matching guarded replay or verify a newer snapshot;no automatic rollback,new export,restore or scheduling authorized.

## CODEX-127/128 approved claim serialization deltas

|Migration|Guarded install|SHA256|
|---|---|---|
|20261023012959 codex127_daily_supply_serialization|supabase/unapplied/daily-supply-serialization/INSTALL.sql|131b454a521e652b5a1138653b28f59e7798e86a2b617a77b7d5d41e069dd4cd|
|20261023013015 codex128_pass_claim_serialization|supabase/unapplied/pass-claim-serialization/INSTALL.sql|6cc5979cbcd228264fafa4ff387bf159f1179511e2d168b977cc962637b8d0b6|

Both explicitly approved and installed;exact source/attributes verified and seven control definitions/attributes unchanged. Old logical/observed physical snapshots predate both deltas. Preserve guarded replay or verify a newer snapshot before admitting trainers. No hosted claim,player repair,new export/restore,scheduler or stamp.

## CODEX-129 approved Pass delivery-result delta

|Migration|Guarded install|SHA256|
|---|---|---|
|20261023020246 codex129_pass_duplicate_delivery_clock|supabase/unapplied/pass-delivery-result/INSTALL.sql|f0a6b92afb314b954538dbdea303be29930cd668cf5e71c008016753835b465a|

Owner-approved one-function replacement;exact candidate/attributes verified,6controls unchanged,no claims/grants/player repair. This builds on CODEX-128:replay in recorded order,and review rollback in reverse dependency order. Historical CODEX-128 candidate fingerprints are superseded by CODEX-129 on the current database. Old snapshots require the9reviewed deltas or a verified newer snapshot;no new export/restore is authorized.

## CODEX-131 empty-schema compatibility proof

All9reviewed installs replay in order on a separate empty PG17 schema fixture from the retained schema archive;20latest function guards match and browser configuration writes remain denied. Reverse9rollbacks restore585function metadata records/143relation-permission records/56policies exactly.142tables remain empty. No player/Auth records or data archive imported,no production connection,original archive unchanged. Local runtime stopped/fixture removed. This supplements CODEX-71/126 data verification;it is not physical/full Auth/storage restore certification or permission to replay/rollback in production. See LAUNCH-CODEX131-SCHEMA-REPLAY.md.

## CODEX-135 approved team active-ownership delta

|Migration|Guarded install|SHA256|
|---|---|---|
|20261023025714 codex135_team_active_ownership_serialization|supabase/unapplied/team-active-ownership/INSTALL.sql|d0df06fc6fab4439ccea0e4d74e800efcf1f29f053b51b957d2cf90edd6a624f|

Owner explicitly approved one-function replacement and source-only verification. Exact candidate and unchanged attributes verified without a team/trade/release call. This is the tenth post-drill delta;older snapshots need ordered replay or verified newer coverage. No player-pointer repair,restore or new gameplay authority.


CODEX-161 recovery observation:scheduled dashboard lists PHYSICAL23Oct07:44:31UTC/03:44:31EDT,after latest recorded migration20261023025714/CODEX-135. Storage metadata0buckets. No Restore/export/password/settings/player action;not physical/full Auth/storage certification. Older logical archive still needs10guarded deltas. See LAUNCH-CODEX161-POST-CORRECTION-BACKUP.md.

## CODEX-163/164 Auth configuration dependency

Owner explicitly approved enabling Supabase Auth Allow manual linking on October23;persisted dashboard verification complete. Recovery/rebuild acceptance must verify this setting is enabled for the existing Connect Twitch API. Signup remains enabled,email confirmation remains enabled,and anonymous sign-in remains disabled. Treat hosted Auth configuration as an explicit recovery dependency;do not assume a database archive or physical snapshot restores control-plane settings. This record is not permission to restore or change Auth settings elsewhere. No credential values are retained. See LAUNCH-CODEX163-MANUAL-LINKING.md.

CODEX-168 approved database delta: migration20261023173738 replaces only admin_trainer_reward_action/admin_trainer_rewards for atomic Pokémon quantities1–100. Exact candidate fingerprints7e58b6d5f7cb647e5f414d53ccb27d87/5be46a3ecf0f489b4864fb714a433319;ACL/security/search_path and private generation/permission helpers unchanged. No gifts invoked. Private guarded INSTALL/ROLLBACK at C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex168/;SHA256 recorded in LAUNCH-CODEX168-POKEMON-GIFT-QUANTITY.md. Eleventh post-drill delta;observed07:44:31UTC backup predates this17:37:38UTC change. No newer backup claimed,restore or replay performed.

CODEX-170 recovery extension PASS:11ordered guarded installs and reverse rollbacks on separate empty PG17 fixture;21existing latest guards plus2gift full-definition fingerprints match. Reverse restores585function/143relation-permission/56policy records exactly;142tables empty throughout. No Auth/player import,new export,production connection or original archive change;runtime stopped/fixture cleaned. Physical/full Auth/storage recovery remains unverified;no new backup coverage claimed.

## CODEX-174 installed read-only roster

|Migration|Guarded install|SHA256|
|---|---|---|
|20261023190339 codex174_readonly_trainer_pokemon_roster|supabase/unapplied/admin-trainer-roster/INSTALL.sql|e35d96e3c0e3926445175fe24b45cbbd2600b8b6fa51b15eb2c74d30e34b02df|

Twelfth installed post-drill delta,after private CODEX-168 packet20261023173738. Repository manifest verifies22tracked packets;the separate private gift pair remains outsideGit and must be inserted chronologically before this endpoint. Latest local recovery rehearsal applies/reverses all12 in chronological order,restoring585function/143relation/56policy metadata records,142tables empty;runtime stopped,no production recovery connection or original archive mutation. Existing07:44:31UTC physical backup predates168/174;no newer backup observed. Not physical/full Auth/storage certification or production restore permission.


## CODEX-178 installed report correction

Thirteenth installed post-drill delta:20261024044601 codex178_report_query_corrections. Exact guarded pair supabase/unapplied/admin-report-query-corrections/INSTALL.sql and ROLLBACK.sql;SHA256145330761fbec67e1203e9407830bda1728ab7a0d2934fa6f2b7bfa7abc20a20 / ef59de0c89024bd39228bef0cd99adacd83afcf706a080ee11ef14f77a157eaa. Only two report functions;no data/permission changes. The next completed physical backup must be observed after this change;none claimed yet.24tracked packet files plus the privateCODEX168pair;CODEX-180 completed chronological13delta forward/reverse rehearsal with metadata restored and tables empty;see LAUNCH-CODEX180-RECOVERY-EXTENSION.md.

|Migration|Guarded install|SHA256|
|---|---|---|
|20261024044601 codex178_report_query_corrections|supabase/unapplied/admin-report-query-corrections/INSTALL.sql|145330761fbec67e1203e9407830bda1728ab7a0d2934fa6f2b7bfa7abc20a20|


CODEX-188 current backup observation:at24Oct08:12:28UTC,dashboardlistsPHYSICAL24Oct07:44:07UTC(03:44:07EDT)withRestoreavailable,noinprogresslabel. Itpostdateslatestcatalogmigration20261024044601/CODEX178. Post-changeavailabilityobservationcomplete;noRestore/export/settings/applicationaction. Physicalrestore/fullAuth/Storagecertificationremainseparate. See LAUNCH-CODEX188-POST-REPORT-BACKUP.md.

Current availability clarification — CODEX-240:the complete14-delta local replay/reverse record remains the current logical-recovery evidence. CODEX-229 subsequently observed a completed PHYSICAL recovery point at2026-10-25 07:44:36UTC,after latest migration20261025042627. Statements below that the next post-change point is unobserved are historical and resolved for availability only. Do not repoll unchanged. This does not certify backup contents,physical restore,full Auth or Storage recovery. [Recorded observation](LAUNCH-CODEX229-POST-CREATE-BACKUP.md).

## CODEX-215 installed create-only Mart draft endpoint

Fourteenth installed post-drill delta:20261025042627 codex215_admin_mart_create_draft. One new owner/admin-guarded function,explicit authenticated/service-role execute and anonymous/PUBLIC denial;no table/data changes. Full body/hash/attributes/ACL and10unchanged dependencies plus existing edit verified without invocation.

|Migration|Guarded install|SHA256|
|---|---|---|
|20261025042627 codex215_admin_mart_create_draft|supabase/unapplied/admin-mart-create-draft/INSTALL.sql|289013bf77bf071a9fa6ff6903ca669122d255d92c3c674efbb7f219e07e13b3|

supabase/unapplied/admin-mart-create-draft/INSTALL.sql SHA256 289013bf77bf071a9fa6ff6903ca669122d255d92c3c674efbb7f219e07e13b3

supabase/unapplied/admin-mart-create-draft/ROLLBACK.sql SHA256 f2a8718930ccc1c034777759bff3c35153388fd7c803c9b638fea63fa5ba9870

All14deltas replay/reverse on separate empty PG17 schema fixture;585function/143relation/56policy baseline metadata restored;142tables empty throughout. Original schema archive unchanged,runtime stopped.3newSQLfiles preserve exactLFbytes after Git checkout;operational pair pinned in recovery-packets.json. Latest observed Oct24 07:44:07UTC physical backup predates this migration;next completed post-change backup remains unobserved until due. No production restore/export,Auth/player data import,job activation or full physical/Auth/Storage certification. Evidence:evidence/codex215-recovery-replay.json and evidence/codex215-recovery-files.json.

## CODEX-229 current post-create physical availability

CODEX-229 post-SQL215 backup availability verified:completed PHYSICAL recovery point **October25 07:44:36UTC /03:44:36Eastern**,after latest migration20261025042627. [Report](LAUNCH-CODEX229-POST-CREATE-BACKUP.md). No restore/export;backup-content/physical restore/Auth/Storage certification remains outside evidence. Pending newer-backup observation is complete;do not poll it again unchanged.

Latest migration remains20261025042627. Retained logical archive/delta packets stay unchanged;no new export or restore. Older pending-backup observations above are historical.
