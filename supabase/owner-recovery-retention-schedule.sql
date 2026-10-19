-- Owner approved 90-day completed recovery audit retention, 2026-10-19.
-- Run after owner-recovery-retention.sql. Policy/QA target are operational configuration.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('owner-recovery-history-retention','17 4 * * *', $job$
SELECT private.prune_owner_recovery_history();
DELETE FROM cron.job_run_details
WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='owner-recovery-history-retention')
AND end_time<now()-interval '90 days';
$job$);
