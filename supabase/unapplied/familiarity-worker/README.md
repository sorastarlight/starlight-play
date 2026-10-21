# CODEX-46 — Bounded automatic Familiarity processing proposal

Prepared after the owner-approved CODEX-45 original-capture correction. NOT installed, scheduled or activated. Previous approval explicitly excluded a worker. This is the separate persistent global-processing decision required for launch.

## Concrete operation

Create one owner-only private SQL worker and one job named streamlink-species-familiarity in the already-installed pg_cron extension. Run once per minute, as the existing postgres scheduler role in the same database. No Edge Function, HTTP call, new credential, extension install, paid service, plan change or encounter scheduling.

While active: recover at most25 provable eligible missed admissions, then deliver at most25 pending capture events. While draining: deliver only the already-admitted queue; do not reconcile. While paused/inactive/closed: do neither. Transaction advisory locking prevents overlapping manual/periodic batches; the established worker preserves SKIP LOCKED, idempotency, eight-attempt exhaustion and explicit requeue rules. No terminal row is automatically requeued. Original-capture eligibility/cutoff remains CODEX-45's exact rules. No new capture, reward grant, specimen/economy mutation, reset or APP stamp.

The command sets15s statement and1s lock timeouts. Each run also prunes at most1000 completed run-log rows older than7 days, restricted to this job ID. This concerns operational scheduler logs only; it never deletes Familiarity events, snapshots or gameplay records. Existing support/recovery jobs are unchanged. Failures and terminal queue counts are inspectable through HEALTH.sql and Supabase Cron; no external alerting service is provisioned. This is not a claim of automated human notification.

ACTIVATE.sql guards exact current dependency source/ACLs, unchanged active cutoff, queue RLS/identity triggers, no pending/rejected/exhausted work, no unqueued post-cutoff Play specimens, and no existing Familiarity job/worker. At preparation the live queue has1 delivered event, no outstanding work and zero missed-admission candidates. It creates only the private invoker worker and the one exact job; it does not directly call delivery/reconciliation. The next minute's scheduler execution is the persistent processing this approval would authorize.

STOP.sql unschedules only the exact reviewed job after source/job verification and preserves all progress/snapshots. An in-flight batch may finish; stopping future runs does not cancel its transaction or reset data. The private owner-only worker remains for inspection. Re-enabling after stop requires reviewing current state; ACTIVATE.sql deliberately refuses an existing worker instead of silently creating duplicate scheduling.

## Validation and limitations

Ten REAL LOCAL SQL worker/log tests pass in addition to28 immutable-capture checks:25-row bounds/backlog, exactly-once delivery, bounded reconciliation, overlap lock, pause/resume/drain/close, terminal visibility and no automatic terminal retry, denied client roles, and7-day/1000-row same-job log pruning. Actual proposed worker body and current snapshot/delivery dependencies run against fictional records. Cron tables for pruning are fixtures; the actual scheduler daemon, connection/dispatch behavior and activation/unschedule API have not been run locally or hosted. Their exact hosted signatures were read-only verified against the [Supabase Cron docs](https://supabase.com/docs/guides/cron) and [pg_cron documentation](https://github.com/citusdata/pg_cron).

After approval: recheck source/queue/job guards, apply exact packet, independently verify ACL/source/job schedule/command/role, observe one scheduled success without creating an encounter, and confirm gameplay/event/queue invariance while idle. If errors occur, stop this exact job and preserve evidence; do not manufacture a catch, bulk requeue terminal work, move the activation cutoff or change paid settings.

Reproduce: node tools/prepare-familiarity-worker.js; node tools/familiarity-capture-identity-rehearsal.js --with-worker. Evidence: docs/project-command-center/evidence/familiarity-worker-local-result.json. WORKER.sql and HEALTH.sql are not activation instructions by themselves. No production job exists from this preparation.
