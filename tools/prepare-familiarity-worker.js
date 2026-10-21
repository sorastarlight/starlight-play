/* Proposal generator only; no hosted client or automatic application. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/familiarity-worker');
const baseline=require('../docs/project-command-center/evidence/familiarity-capture-identity-hosted-verification.json');
const worker=fs.readFileSync(path.join(folder,'WORKER.sql'),'utf8').replace(/\r\n/g,'\n'),hash=crypto.createHash('md5').update(worker.split('$function$')[1]).digest('hex');
const name='streamlink-species-familiarity',schedule='* * * * *';
const prune=`delete from cron.job_run_details where runid in (select d.runid from cron.job_run_details d where d.jobid=(select jobid from cron.job where jobname='${name}') and d.end_time<now()-interval '7 days' order by d.runid limit 1000)`;
const command="set statement_timeout='15s';set lock_timeout='1s';select private.process_species_familiarity();"+prune+';';
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const sources=baseline.functions.map(f=>`if (select md5(prosrc) from pg_proc where oid='${f.signature}'::regprocedure) is distinct from '${f.md5}' or (select proacl::text from pg_proc where oid='${f.signature}'::regprocedure) is distinct from ${f.acl===null?'NULL':literal(f.acl)} then raise exception 'Familiarity dependency drift: ${f.name}';end if;`).join('\n');
const activate=`-- PROPOSAL: permanent periodic processing. Requires separate owner approval.\nbegin;set local lock_timeout='5s';set local statement_timeout='30s';
do $guard$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then raise exception 'Existing pg_cron required; do not provision an add-on';end if;
 if current_user<>'postgres' then raise exception 'Expected existing postgres scheduler role';end if;
 if exists(select 1 from cron.job where jobname ilike '%familiar%' or jobname ilike '%mastery%') or to_regprocedure('private.process_species_familiarity()') is not null then raise exception 'Worker/job already exists';end if;
 if (select activated_at from private.species_mastery_activation where singleton) is distinct from '${baseline.activation.activated_at}'::timestamptz or (select lifecycle from private.species_mastery_activation where singleton) is distinct from 'active' then raise exception 'Activation/cutoff drift';end if;
 if exists(select 1 from private.species_mastery_outbox where status<>'delivered') then raise exception 'Outstanding queue requires explicit scope review';end if;
 if not (select relrowsecurity from pg_class where oid='private.species_mastery_outbox'::regclass) or (select count(*) from pg_trigger where tgrelid='private.species_mastery_outbox'::regclass and tgname in('species_mastery_outbox_admit','freeze_familiarity_capture_identity') and tgenabled='O')<>2 then raise exception 'Queue security/identity triggers changed';end if;
 if exists(select 1 from public.catches c where c.server_inserted_at>=(select activated_at from private.species_mastery_activation where singleton) and c.source_key like 'play:%' and not exists(select 1 from private.species_mastery_outbox o where o.catch_id=c.id) and not exists(select 1 from public.species_mastery_events e where e.catch_id=c.id)) then raise exception 'Unqueued capture evidence requires explicit scope review';end if;
 ${sources}
end $guard$;
${worker}
select cron.schedule('${name}','${schedule}',${literal(command)});
do $verify$ begin
 if (select md5(prosrc) from pg_proc where oid='private.process_species_familiarity()'::regprocedure) is distinct from '${hash}' then raise exception 'Worker source mismatch';end if;
 if (select count(*) from cron.job where jobname='${name}' and schedule='${schedule}' and command=${literal(command)} and active and username='postgres' and database=current_database())<>1 then raise exception 'Scheduled job mismatch';end if;
 if has_function_privilege('anon','private.process_species_familiarity()','EXECUTE') or has_function_privilege('authenticated','private.process_species_familiarity()','EXECUTE') or has_function_privilege('service_role','private.process_species_familiarity()','EXECUTE') then raise exception 'Unexpected client worker access';end if;
end $verify$;commit;
`;
const stop=`-- Stops future runs only; an in-flight transaction may finish. Keeps all earned progress.\nbegin;set local lock_timeout='5s';set local statement_timeout='30s';
do $stop$ declare id bigint;begin
 select jobid into id from cron.job where jobname='${name}' and schedule='${schedule}' and command=${literal(command)} and username='postgres' and database=current_database();
 if id is null then raise exception 'Exact worker job missing or changed';end if;
 if (select md5(prosrc) from pg_proc where oid='private.process_species_familiarity()'::regprocedure) is distinct from '${hash}' then raise exception 'Worker source drift';end if;
 perform cron.unschedule(id);
end $stop$;commit;
`;
if(require.main===module){fs.writeFileSync(path.join(folder,'ACTIVATE.sql'),activate);fs.writeFileSync(path.join(folder,'STOP.sql'),stop);fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({name,schedule,command,worker_md5:hash,cutoff:baseline.activation.activated_at,limit:25,jobLogRetentionDays:7},null,2)+'\n');console.log('Prepared bounded worker activation/stop proposals; neither executed');}
module.exports={worker,hash,command,prune,activate,stop};
