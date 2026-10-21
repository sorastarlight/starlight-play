-- PROPOSAL: permanent periodic processing. Requires separate owner approval.
begin;set local lock_timeout='5s';set local statement_timeout='30s';
do $guard$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then raise exception 'Existing pg_cron required; do not provision an add-on';end if;
 if current_user<>'postgres' then raise exception 'Expected existing postgres scheduler role';end if;
 if exists(select 1 from cron.job where jobname ilike '%familiar%' or jobname ilike '%mastery%') or to_regprocedure('private.process_species_familiarity()') is not null then raise exception 'Worker/job already exists';end if;
 if (select activated_at from private.species_mastery_activation where singleton) is distinct from '2026-10-20T16:55:59.896904+00:00'::timestamptz or (select lifecycle from private.species_mastery_activation where singleton) is distinct from 'active' then raise exception 'Activation/cutoff drift';end if;
 if exists(select 1 from private.species_mastery_outbox where status<>'delivered') then raise exception 'Outstanding queue requires explicit scope review';end if;
 if not (select relrowsecurity from pg_class where oid='private.species_mastery_outbox'::regclass) or (select count(*) from pg_trigger where tgrelid='private.species_mastery_outbox'::regclass and tgname in('species_mastery_outbox_admit','freeze_familiarity_capture_identity') and tgenabled='O')<>2 then raise exception 'Queue security/identity triggers changed';end if;
 if exists(select 1 from public.catches c where c.server_inserted_at>=(select activated_at from private.species_mastery_activation where singleton) and c.source_key like 'play:%' and not exists(select 1 from private.species_mastery_outbox o where o.catch_id=c.id) and not exists(select 1 from public.species_mastery_events e where e.catch_id=c.id)) then raise exception 'Unqueued capture evidence requires explicit scope review';end if;
 if (select md5(prosrc) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'c3e2401751521a93e3c98bd858e1cae9' or (select proacl::text from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: deliver_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '49e59ca336a343a2765ab811c06c96b6' or (select proacl::text from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: enqueue_species_mastery_event';end if;
if (select md5(prosrc) from pg_proc where oid='private.familiarity_capture_identity(uuid)'::regprocedure) is distinct from 'c78768599888d786e781ec18a7000c33' or (select proacl::text from pg_proc where oid='private.familiarity_capture_identity(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: familiarity_capture_identity';end if;
if (select md5(prosrc) from pg_proc where oid='private.freeze_familiarity_capture_identity()'::regprocedure) is distinct from 'eefcec159767d8366b6805645db2b829' or (select proacl::text from pg_proc where oid='private.freeze_familiarity_capture_identity()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: freeze_familiarity_capture_identity';end if;
if (select md5(prosrc) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '313944ac139f33465e57d86c0a1c5678' or (select proacl::text from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: note_species_mastery_catch';end if;
if (select md5(prosrc) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '90390247a30521352ddb9dbe9710160b' or (select proacl::text from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: reconcile_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '639f65cdaac61ff00604481bcad0a71f' or (select proacl::text from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: record_species_mastery_event';end if;
if (select md5(prosrc) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '0ccce9747f3b20c2f99b07a8883651a6' or (select proacl::text from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: requeue_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from 'a33d9b63f44df44771b7d2d9a43cb2af' or (select proacl::text from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from NULL then raise exception 'Familiarity dependency drift: round_is_test';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from 'b42d8a354c079ddc9f56e4f86e930950' or (select proacl::text from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: species_mastery_events_guard';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from 'efd7d332b2ab9f3d0283accd08a6f02a' or (select proacl::text from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity dependency drift: species_mastery_outbox_admit';end if;
end $guard$;
-- Proposed owner-only worker. This file does not create or enable a job.
CREATE FUNCTION private.process_species_familiarity()
RETURNS jsonb LANGUAGE plpgsql
SET search_path TO pg_catalog AS $function$
DECLARE state text; admitted integer:=0; delivered integer:=0; health jsonb;
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtextextended('streamlink:species-familiarity-worker',0)) THEN
  RETURN jsonb_build_object('status','busy','reconciled',0,'delivered',0);
 END IF;
 SELECT a.lifecycle INTO state FROM private.species_mastery_activation a WHERE a.singleton FOR SHARE;
 IF state IS NULL OR state NOT IN('active','draining') THEN
  RETURN jsonb_build_object('status',coalesce(state,'unavailable'),'reconciled',0,'delivered',0);
 END IF;
 IF state='active' THEN admitted:=private.reconcile_species_mastery_outbox(25);END IF;
 delivered:=private.deliver_species_mastery_outbox(25);
 SELECT jsonb_build_object('pending',count(*)filter(where o.status='pending'),
  'rejected',count(*)filter(where o.status='rejected'),'exhausted',count(*)filter(where o.status='exhausted'))
 INTO health FROM private.species_mastery_outbox o;
 RETURN jsonb_build_object('status',state,'reconciled',admitted,'delivered',delivered,'queue',health);
END;
$function$;
REVOKE ALL ON FUNCTION private.process_species_familiarity() FROM PUBLIC,anon,authenticated,service_role;

select cron.schedule('streamlink-species-familiarity','* * * * *','set statement_timeout=''15s'';set lock_timeout=''1s'';select private.process_species_familiarity();delete from cron.job_run_details where runid in (select d.runid from cron.job_run_details d where d.jobid=(select jobid from cron.job where jobname=''streamlink-species-familiarity'') and d.end_time<now()-interval ''7 days'' order by d.runid limit 1000);');
do $verify$ begin
 if (select md5(prosrc) from pg_proc where oid='private.process_species_familiarity()'::regprocedure) is distinct from '8a0744ad845bbe99639b01b307a41712' then raise exception 'Worker source mismatch';end if;
 if (select count(*) from cron.job where jobname='streamlink-species-familiarity' and schedule='* * * * *' and command='set statement_timeout=''15s'';set lock_timeout=''1s'';select private.process_species_familiarity();delete from cron.job_run_details where runid in (select d.runid from cron.job_run_details d where d.jobid=(select jobid from cron.job where jobname=''streamlink-species-familiarity'') and d.end_time<now()-interval ''7 days'' order by d.runid limit 1000);' and active and username='postgres' and database=current_database())<>1 then raise exception 'Scheduled job mismatch';end if;
 if has_function_privilege('anon','private.process_species_familiarity()','EXECUTE') or has_function_privilege('authenticated','private.process_species_familiarity()','EXECUTE') or has_function_privilege('service_role','private.process_species_familiarity()','EXECUTE') then raise exception 'Unexpected client worker access';end if;
end $verify$;commit;
