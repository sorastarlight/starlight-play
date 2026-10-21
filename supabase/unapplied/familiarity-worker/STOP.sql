-- Stops future runs only; an in-flight transaction may finish. Keeps all earned progress.
begin;set local lock_timeout='5s';set local statement_timeout='30s';
do $stop$ declare id bigint;begin
 select jobid into id from cron.job where jobname='streamlink-species-familiarity' and schedule='* * * * *' and command='set statement_timeout=''15s'';set lock_timeout=''1s'';select private.process_species_familiarity();delete from cron.job_run_details where runid in (select d.runid from cron.job_run_details d where d.jobid=(select jobid from cron.job where jobname=''streamlink-species-familiarity'') and d.end_time<now()-interval ''7 days'' order by d.runid limit 1000);' and username='postgres' and database=current_database();
 if id is null then raise exception 'Exact worker job missing or changed';end if;
 if (select md5(prosrc) from pg_proc where oid='private.process_species_familiarity()'::regprocedure) is distinct from '8a0744ad845bbe99639b01b307a41712' then raise exception 'Worker source drift';end if;
 perform cron.unschedule(id);
end $stop$;commit;
