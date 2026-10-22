# Recovery changes after CODEX-71

The successful logical snapshot was exported October21 at21:05–21:06 UTC. It predates the following approved security change. The private original archive is retained unchanged and its isolated local server remains stopped.

| Hosted migration | Reviewed packet | SHA256 of INSTALL.sql | Status |
|---|---|---|---|
|20261022014528 codex73_site_config_browser_update_boundary|supabase/unapplied/site-config-write-boundary/INSTALL.sql|e776607a90e6e59cd941c964eacb6649dcd22df291fe8887fc3dd032490c31bf|Installed/independently verified;14 fictional local SQL checks|

A future restored environment must retain the CODEX-73 privilege boundary before exposing its Data API or admitting trainers. Review and replay only against matching guarded original schema/ACLs;unexplained drift is a stop. Do not automatically execute rollback,it restores risky grants. Packet testing is not a second full restored-archive replay certificate. No new export,production restore,job activation or private artifact mutation occurred. Physical backup/full Auth recovery remain outside certification.
