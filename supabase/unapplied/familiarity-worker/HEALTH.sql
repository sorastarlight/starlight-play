-- Read-only operator query, not a delivery/reconciliation call.
begin read only;
select lifecycle,activated_at,drain_started_at from private.species_mastery_activation where singleton;
select status,count(*) rows,max(attempts) max_attempts,min(enqueued_at) oldest_admission from private.species_mastery_outbox group by status;
select jobid,jobname,schedule,active,username,database from cron.job where jobname='streamlink-species-familiarity';
select status,count(*) runs,max(end_time) latest_end from cron.job_run_details
 where jobid in(select jobid from cron.job where jobname='streamlink-species-familiarity')
 and start_time>now()-interval '1 day' group by status;
rollback;
