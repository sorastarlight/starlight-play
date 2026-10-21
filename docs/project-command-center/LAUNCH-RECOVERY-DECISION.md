# Launch recovery decision

ACCEPTED: owner explicitly chose “Daily backups are acceptable” for public launch. Retain the existing daily-backup approach and its potential roughly one-day loss window. This resolves the recovery requirement choice only;it does not certify backup completion/restore execution, authorize PITR/spending, provision a target or permit an in-place restore. Existing service/plan stays unchanged. Historical comparison follows.

No recovery policy choice recorded yet. Owner requested an important-decision gate only. The remaining choice concerns potential loss of player progress during an outage, not a cosmetic or routine implementation detail.

Existing daily backup approach: retain current service/plan and accept that recovery may lose changes after the selected daily backup, potentially roughly a day. A completed post-change recovery point and an actual restore drill are still required before claiming recovery readiness. Ten repository packet files do not recover later player actions by themselves. No loss of existing data has occurred in this review.

Shorter-window requirement: treat recovery of substantially more recent player progress as a launch prerequisite. This is a requirement decision only. A concrete method, measured coverage/cost and tested restore plan must be reviewed before any implementation. It does not authorize a paid PITR add-on, plan change, project provisioning, private export or restore. Do not promise zero data loss or a restore-time guarantee from this selection.

Supabase documents daily backups and the possibility of losing a day's data, with PITR as a paid add-on for finer recovery. See [Database Backups](https://supabase.com/docs/guides/platform/backups). Current PITR-off/physical-backup state is from the recorded dashboard inspection, not a new setting change.

Scope of the answer: set the launch data-loss requirement, then finish the corresponding recovery plan. Authorization for any later consequential operation remains separate. Current service keeps running unchanged while this is decided.
