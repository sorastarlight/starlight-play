# CODEX-49 — Current recovery readiness

> Current status: CODEX-71 COMPLETE (October21): owner reset the database password and updated the protected helper credential. Actual bounded logical export/isolated PG17 restore passed:111 table projections/digests,585 functions,143 relations,56 policies,322 indexes,30 triggers and444 constraints verified. One exact PG17 CHECK parenthesization difference is archive-confirmed and passes49 boundary/NULL cases;default owner-only ACL representation normalized narrowly.31 omitted table data sets remain empty. Private artifacts retained outsideGit,user+SYSTEM ACL;runtime stopped. Auth/DataAPI HTTP200 and actual EmailQA Inventory pass. Physical restore/full Auth service recovery remain unverified;no new gameplay,hosted SQL,spending or APP stamp. See RECOVERY-DRILL-CODEX71.md. Earlier access holds are historical.

Read-only inspection October21,2026, America/New_York. Correct hosted project starlight-play (dtflmlbjhttoewqgkujf), production/main. Dashboard session was available; no new sign-in or credential handling needed.

Scheduled-backup dashboard lists physical backups dated October14–21. Latest visible backup: October21 at07:44:55 UTC,03:44:55 EDT. This confirms an available recovery point, not a performed restore or recovery-time guarantee. It predates the later CODEX-44/45/46/48 changes made today. Final release recovery evidence should include a backup after the final accepted schema/runtime state, or a reviewed replay plan for subsequent changes. No extra paid backup or new project was provisioned.

Point-in-time recovery tab shows the Enable add-on notice: PITR is not enabled. Nothing was enabled. A whole-database restore rolls back other writes and causes downtime; it remains a separate important owner decision. An available backup is not a license to restore automatically.

Supabase database backups do not include Storage object contents. Read-only catalog inventory currently finds zero Storage buckets and zero profile avatar references to Supabase Storage. The current project therefore has no Storage object set to export. Reassess when uploads are introduced. Repo-hosted sprite/site assets are retained through Git history; third-party avatars are not converted into privately backed-up site files. See [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

Existing targeted recovery: both private legacy-retirement archives remain preserved; selective schema/source/specimen recovery was locally rehearsed in CODEX-42, not executed hosted. Later data/source changes may intentionally cause old guarded packets to refuse. Heartbeat rollback restores its old insecure credit behavior only; Familiarity STOP unschedules future work without deleting earned progress. None substitutes for a full tested restore/reprovision process.

Remaining release gate: full schema replay/reset is not certified; do not bulk-replay historical migrations or files under unapplied. No reset, restore, backup deletion, Storage mutation, spending or build stamp occurred during this inspection. Sora NO; Twinkle NO; PlayTester role unchanged; EmailQA no account/gameplay mutation by this inspection.

CODEX-94 CURRENT,October22: the scheduled dashboard now lists PHYSICAL backup22Oct07:44:04UTC (03:44:04EDT), after CODEX-73. The pending post-change recovery-point observation is complete. Earlier October21 snapshot descriptions above are historical; physical restore/full Auth service certification remains open. See OVERNIGHT-CODEX94.md and RECOVERY-POST-DRILL-DELTAS.md. No Restore/export/password/runtime action.


CODEX-161 recovery observation:scheduled dashboard lists PHYSICAL23Oct07:44:31UTC/03:44:31EDT,after latest recorded migration20261023025714/CODEX-135. Storage metadata0buckets. No Restore/export/password/settings/player action;not physical/full Auth/storage certification. Older logical archive still needs10guarded deltas. See LAUNCH-CODEX161-POST-CORRECTION-BACKUP.md.


CODEX-188 current backup observation:at24Oct08:12:28UTC,dashboardlistsPHYSICAL24Oct07:44:07UTC(03:44:07EDT)withRestoreavailable,noinprogresslabel. Itpostdateslatestcatalogmigration20261024044601/CODEX178. Post-changeavailabilityobservationcomplete;noRestore/export/settings/applicationaction. Physicalrestore/fullAuth/Storagecertificationremainseparate. See LAUNCH-CODEX188-POST-REPORT-BACKUP.md.
