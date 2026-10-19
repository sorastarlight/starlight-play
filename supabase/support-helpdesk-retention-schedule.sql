-- Owner approved90-day closed-ticket retention.
SELECT cron.schedule('support-ticket-retention','37 4 * * *',$job$
SELECT private.prune_support_history();
DELETE FROM cron.job_run_details
WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='support-ticket-retention')
AND end_time<now()-interval '90 days';
$job$);
