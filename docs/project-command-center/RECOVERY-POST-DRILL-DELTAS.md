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
