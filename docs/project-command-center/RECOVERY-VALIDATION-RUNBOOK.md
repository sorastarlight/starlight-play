# Recovery validation before release

Owner accepted daily backups for public launch. Use that accepted loss-window requirement when selecting a recovery point;no shorter-window/PITR requirement is imposed. A completed suitable backup and actual restore evidence remain outstanding. Acceptance of the policy is not authorization to restore or spend.

CODEX-59 preparation, October21,2026. Operator plan only: no restore/export, new project, worker change, DNS, credential entry or spending is authorized by this document. Current project is starlight-play (`dtflmlbjhttoewqgkujf`). Preserve the private legacy archives and existing approved activation cutoffs.

## Current evidence and limits

The last inspected physical backup is October21 07:44:55UTC. PITR was off. Nine later migrations map to10 repository packets in `evidence/post-backup-packet-inventory.json`. All10 actual file SHA256 values match that inventory in `evidence/recovery-packet-checksums.json`. This verifies retained repository bytes, not hosted migration-byte equivalence, ability to execute packets against a restored database, restoration of later player data or a successful full restore.

Later EmailQA gifts/evolution/Oak/Pass grants, audit records and Auth configuration are not recovered simply by replacing function definitions. The archive/selective restore tested for CODEX-41/42 is distinct from whole-project disaster recovery. Do not use legacy RESTORE.sql as a generic rollback for current WIRE data.

## Choose and identify a recovery target

1. Obtain a completed recovery point after the approved changes and retained QA outcomes, or explicitly document the earlier point's data-loss window. Check dashboard backup completion/time rather than assuming a daily job completed. Preserve timezone and project identity in the evidence.
2. Record the exact restore method and isolated destination before approval. A local logical dump/import, a hosted project clone and an in-place physical restore are different procedures; no method has been selected or executed here. Any target provisioning, private data export or hosted restore needs its scoped authorization and cost review. Do not restore production merely to obtain a test PASS.
3. Establish isolation before any restored runtime can process work: no production browser/bridge clients, no outbound Auth/helpdesk mail, no production OAuth redirects/webhooks and no active restored schedulers until their restored job definitions and queues have been inspected. The isolation mechanism depends on the selected target; stop if it cannot be guaranteed. Never rewrite production callback/DNS settings to make a drill target work.

## Validate before enabling runtime

| Area | Required evidence |
|---|---|
|Identity|Source/destination project IDs, recovery point UTC, database version/extensions and restore completion. No secret values in reports.|
|Data|Expected profiles, current WIRE catches, inventories, ledgers and staff/ticket audits at the chosen point. Private legacy archive existence, access controls and recorded counts. Explain legitimate time-window differences instead of forcing current hashes onto old data.|
|Schema/access|Migration inventory, explicit table privileges/RLS/private-schema isolation, zero anonymous admin RPCs and expected role grants. Source/security/owner/ACL/configuration checks for the recently approved functions.|
|Familiarity|Activation lifecycle/cutoff, immutable capture identities, outbox statuses/attempts and job command/schedule. Use `supabase/unapplied/familiarity-worker/HEALTH.sql` for read-only inspection. Do not deliver/reconcile/requeue/reset or move the cutoff as a validation shortcut.|
|Other jobs|Inventory restored retention/operational jobs and their destinations before any resume. Completed support/recovery retention is90 days; preserve unresolved/uncertain recovery records.|
|Auth/email|Email/Twitch provider intent, URLs, leaked-password policy, customized templates and SMTP destination configuration checked separately. No reset/signup email or credential handling without the designated test scope.|
|Assets/client|Published Git revision/APP stamp, required static assets and any Storage objects. Database metadata is not proof of stored-object recovery. No production cache/DNS switch during validation.|
|Usability|Read-only player/staff pages render against the isolated target; role denials remain. A gameplay smoke requires a separate bounded packet after recovery verification.|

## If an older point needs migration replay

Compare its actual installed signatures/data/cron state with each reviewed packet in chronological order. Do not concatenate or bulk-run the10 inventory paths. Each original guard represents an approved baseline, not permission to override drift. The worker activation packet in particular must not start processing merely to recreate a job definition. Prepare a destination-specific replay plan, test it transactionally/local where possible, and obtain the required hosted decision before executing it. Record which later player actions cannot be recovered from the chosen backup; never fabricate replacements.

## Acceptance record

Record the chosen recovery point, target/method, actual commands or dashboard steps, isolation proof, timings, check results and unresolved differences. Resume only the specifically approved jobs after validation. Reconnecting production clients/DNS and final release/build stamping remain separate decisions. If a guard fails, stop that recovery path and retain diagnostics; do not silently regenerate a manifest or weaken permissions.

Release recovery remains OPEN until this procedure has an actual approved target/method and successful restore evidence. No RPO/RTO guarantee is claimed.

Supabase's [backup documentation](https://supabase.com/docs/guides/platform/backups) explains daily backup restoration/downtime and that Storage object contents are outside database backups. This plan does not enable paid PITR or choose a paid clone.
