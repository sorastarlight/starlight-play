# CODEX-49 — Current recovery readiness

Read-only inspection October21,2026, America/New_York. Correct hosted project starlight-play (dtflmlbjhttoewqgkujf), production/main. Dashboard session was available; no new sign-in or credential handling needed.

Scheduled-backup dashboard lists physical backups dated October14–21. Latest visible backup: October21 at07:44:55 UTC,03:44:55 EDT. This confirms an available recovery point, not a performed restore or recovery-time guarantee. It predates the later CODEX-44/45/46/48 changes made today. Final release recovery evidence should include a backup after the final accepted schema/runtime state, or a reviewed replay plan for subsequent changes. No extra paid backup or new project was provisioned.

Point-in-time recovery tab shows the Enable add-on notice: PITR is not enabled. Nothing was enabled. A whole-database restore rolls back other writes and causes downtime; it remains a separate important owner decision. An available backup is not a license to restore automatically.

Supabase database backups do not include Storage object contents. Read-only catalog inventory currently finds zero Storage buckets and zero profile avatar references to Supabase Storage. The current project therefore has no Storage object set to export. Reassess when uploads are introduced. Repo-hosted sprite/site assets are retained through Git history; third-party avatars are not converted into privately backed-up site files. See [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

Existing targeted recovery: both private legacy-retirement archives remain preserved; selective schema/source/specimen recovery was locally rehearsed in CODEX-42, not executed hosted. Later data/source changes may intentionally cause old guarded packets to refuse. Heartbeat rollback restores its old insecure credit behavior only; Familiarity STOP unschedules future work without deleting earned progress. None substitutes for a full tested restore/reprovision process.

Remaining release gate: full schema replay/reset is not certified; do not bulk-replay historical migrations or files under unapplied. No reset, restore, backup deletion, Storage mutation, spending or build stamp occurred during this inspection. Sora NO; Twinkle NO; PlayTester role unchanged; EmailQA no account/gameplay mutation by this inspection.
