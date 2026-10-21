/* Local schema-packet generation. Existing private recovery archive is retained. */
const fs=require('fs'),path=require('path');const {schemaSql}=require('./prepare-legacy-cleanup');const {changes}=require('./prepare-legacy-runtime');
const root=path.resolve(__dirname,'..'),av=['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'];
const linesSql='(select jsonb_agg(s order by s) '+schemaSql.slice(schemaSql.indexOf('from ('));
const stateSql=`begin read only;select jsonb_build_object(
 'schema_hash',${schemaSql},'schema_lines',${linesSql},
 'max_attribute',(select max(attnum) from pg_attribute where attrelid='public.catches'::regclass),
 'trigger',(select pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.catches'::regclass and tgname='catches_before_write'),
 'specimens',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(c)::text,E'\\n' order by to_jsonb(c)::text),'')),'supported_hash',md5(coalesce(string_agg((to_jsonb(c)-array[${av.map(k=>`'${k}'`).join(',')}])::text,E'\\n' order by (to_jsonb(c)-array[${av.map(k=>`'${k}'`).join(',')}])::text),'')),'legacy',count(*)filter(where ruleset_id is distinct from 'streamlink-gen9-xgen'),'nonzero_av',count(*)filter(where ${av.map(k=>`coalesce(${k},0)<>0`).join(' or ')})) from public.catches c),
 'reference',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(s)::text,E'\\n' order by dex),''))) from public.lgpe_species s),
 'reference_rls',(select relrowsecurity from pg_class where oid='public.lgpe_species'::regclass),
 'function_grants',(select jsonb_object_agg(name,grants) from(select p.proname name,string_agg(format('grant execute on function %s to %s%s;',p.oid::regprocedure,case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end,case when a.is_grantable then ' with grant option' else '' end),E'\\n' order by a.grantee) grants from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='private' and p.proname in('lgpe_stat','lgpe_pick_moves') group by p.proname)x),
 'restore_grants',(select coalesce(string_agg(format('grant %s on public.lgpe_species to %s%s;',privilege_type,case when grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(grantee)) end,case when is_grantable then ' with grant option' else '' end),E'\\n' order by grantee,privilege_type),'') from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='public.lgpe_species'::regclass)
) state;rollback;`;
const quote=x=>`'${JSON.stringify(x).replaceAll("'","''")}'::jsonb`;
function proposedLines(s){
 const after=s.schema_lines.filter(x=>!av.some(k=>x.startsWith('column:public.catches:')&&x.split(':')[3]===k)).map(x=>x.startsWith('trigger:CREATE TRIGGER catches_before_write ')?x.replace(', av_hp, av_atk, av_def, av_spa, av_spd, av_spe',''):x);
 const rollback=s.schema_lines.map(x=>{if(!x.startsWith('column:public.catches:'))return x;const a=x.split(':'),i=av.indexOf(a[3]);if(i<0)return x;a[2]=String(s.max_attribute+i+1);return a.join(':');});
 const recovery=rollback.map(x=>{for(const f of changes){if(x===`runtime:${f.name}:${f.after}`)return `runtime:${f.name}:${f.before}`;}return x;});return {after,rollback,recovery};
}
const md5Sql=lines=>`select md5(coalesce(string_agg(value,E'\\n' order by value),'')) hash from jsonb_array_elements_text(${quote(lines)})`;
function makeSchemaPacket(s,options={}){
 const manifest={...s};delete manifest.schema_lines;const lit=quote(manifest),newTrigger=s.trigger.replace(', av_hp, av_atk, av_def, av_spa, av_spd, av_spe','');
 if(newTrigger===s.trigger)throw Error('Expected AV trigger dependency not found');
 const oldSelf=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-fallback-function-baseline.json')))[0].audit.functions.find(f=>f.name==='public_ledger_lockdown_self_test');
 const self=oldSelf.definition.replace(",'lgpe_species'",'');if(self===oldSelf.definition)throw Error('Lockdown inventory mismatch');
 const extras=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-fallback-extra-baseline.json'))),helpers=extras.filter(f=>['lgpe_stat','lgpe_pick_moves'].includes(f.name));
 const sig=f=>`private.${f.name}(${f.args.split(',').map(a=>a.trim().replace(/^\w+\s+/,'')).join(',')})`;
 const begin="begin;set local lock_timeout='5s';set local statement_timeout='30s';\nlock table public.catches,private.legacy_retirement_runs,private.legacy_retirement_rows in access exclusive mode;\n";
 const supportedHash=`(select md5(coalesce(string_agg((to_jsonb(c)-array[${av.map(k=>`'${k}'`).join(',')}])::text,E'\\n' order by (to_jsonb(c)-array[${av.map(k=>`'${k}'`).join(',')}])::text),'')) from public.catches c)`;
 const archiveHash=`(select md5(coalesce(string_agg(relation||':'||row_key||':'||payload::text,E'\\n' order by relation,row_key),'')) from private.legacy_retirement_rows where run_key='legacy-schema-v1')`;
 const install=begin+`lock table public.lgpe_species in access exclusive mode;
do $guard$ begin
 if ${schemaSql} is distinct from '${s.schema_hash}' then raise exception 'Schema/source drift before AV retirement';end if;
 if ${supportedHash} is distinct from '${s.specimens.supported_hash}' or (select count(*) from public.catches)<>${s.specimens.count} or exists(select 1 from public.catches where ruleset_id is distinct from 'streamlink-gen9-xgen' or ${av.map(k=>`coalesce(${k},0)<>0`).join(' or ')}) then raise exception 'Modern specimen scope changed';end if;
 if exists(select 1 from private.legacy_retirement_runs where run_key='legacy-schema-v1') or to_regclass('private.retired_lgpe_species') is not null then raise exception 'Schema archive already exists';end if;
 if not exists(select 1 from private.legacy_retirement_runs where run_key='legacy110-v1' and status='archived') then raise exception 'Expected specimen recovery archive missing';end if;
 if (select md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by dex),'')) from public.lgpe_species t) is distinct from '${s.reference.hash}' then raise exception 'Legacy reference data drift';end if;
 ${helpers.map(f=>`if (select md5(prosrc) from pg_proc where oid='${sig(f)}'::regprocedure) is distinct from '${f.body_md5}' then raise exception 'Legacy helper source drift';end if;`).join('\n')}
 if (select md5(prosrc) from pg_proc where oid='private.public_ledger_lockdown_self_test()'::regprocedure) is distinct from '${oldSelf.body_md5}' then raise exception 'Lockdown selftest drift';end if;
end $guard$;
insert into private.legacy_retirement_runs(run_key,status,manifest) values('legacy-schema-v1','archived',${lit});
insert into private.legacy_retirement_rows select 'legacy-schema-v1','catch_av',id::text,jsonb_build_object('id',id,${av.map(k=>`'${k}',${k}`).join(',')}) from public.catches;
update private.legacy_retirement_runs set archive_hash=${archiveHash} where run_key='legacy-schema-v1';
drop trigger catches_before_write on public.catches;
${newTrigger};
${av.map(k=>`alter table public.catches drop column ${k} restrict;`).join('\n')}
${self};
${helpers.map(f=>`drop function ${sig(f)} restrict;`).join('\n')}
alter table public.lgpe_species set schema private;
alter table private.lgpe_species rename to retired_lgpe_species;
alter table private.retired_lgpe_species enable row level security;
revoke all on private.retired_lgpe_species from public,anon,authenticated;
do $verify$ begin
 if ${schemaSql} is distinct from '${s.after_hash}' or ${supportedHash} is distinct from '${s.specimens.supported_hash}' then raise exception 'Supported schema/data verification failed';end if;
 if has_table_privilege('anon','private.retired_lgpe_species','SELECT') or has_table_privilege('authenticated','private.retired_lgpe_species','SELECT') then raise exception 'Retired reference access';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' and p.prosrc ~* '(public[.]lgpe_species|private[.]lgpe_stat[(]|private[.]lgpe_pick_moves[(]|(^|[^a-z0-9_])av_(hp|atk|def|spa|spd|spe)([^a-z0-9_]|$))') then raise exception 'Live legacy source reference remains';end if;
end $verify$;commit;\n`;
 const rollback=begin+`lock table private.retired_lgpe_species in access exclusive mode;
do $guard$ begin
 if ${schemaSql} is distinct from '${s.after_hash}' or ${supportedHash} is distinct from '${s.specimens.supported_hash}' then raise exception 'Schema rollback drift';end if;
 if not exists(select 1 from private.legacy_retirement_runs where run_key='legacy-schema-v1' and status='archived' and archive_hash=${archiveHash}) then raise exception 'Schema archive integrity/state';end if;
end $guard$;
${av.map(k=>`alter table public.catches add column ${k} integer;`).join('\n')}
update public.catches c set ${av.map(k=>`${k}=(a.payload->>'${k}')::int`).join(',')} from private.legacy_retirement_rows a where a.run_key='legacy-schema-v1' and a.relation='catch_av' and a.row_key=c.id::text;
drop trigger catches_before_write on public.catches;
${s.trigger};
alter table private.retired_lgpe_species rename to lgpe_species;
alter table private.lgpe_species set schema public;
alter table public.lgpe_species ${s.reference_rls?'enable':'disable'} row level security;
${s.restore_grants}
${helpers.map(f=>f.definition+';').join('\n')}
do $acl$ declare f record;g record;begin
 for f in select p.oid,p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in('lgpe_stat','lgpe_pick_moves') loop
  for g in select grantee from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid=f.oid loop
   execute format('revoke all on function %s from %s',f.signature,case when g.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(g.grantee)) end);
  end loop;
 end loop;
end $acl$;
${Object.values(s.function_grants).join('\n')}
${oldSelf.definition};
do $verify$ begin if ${schemaSql} is distinct from '${s.rollback_hash}' then raise exception 'Restored schema shape mismatch';end if;
if (select md5(coalesce(string_agg(to_jsonb(c)::text,E'\\n' order by to_jsonb(c)::text),'')) from public.catches c) is distinct from '${s.specimens.hash}' then raise exception 'AV restoration mismatch';end if;
end $verify$;
update private.legacy_retirement_runs set status='schema-restored',restored_at=clock_timestamp() where run_key='legacy-schema-v1';commit;\n`;
 const coreRollback=fs.readFileSync(path.join(root,'supabase/unapplied/legacy-runtime-retirement/ROLLBACK.sql'),'utf8');
 const originalRestore=options.originalRestoreSQL||fs.readFileSync(path.join(root,'supabase/unapplied/legacy-retirement/cleanup/RESTORE.sql'),'utf8');
 const adaptedRestore=originalRestore.replaceAll("is distinct from expected->>'schema_hash'",`is distinct from '${s.recovery_hash}'`);
 const strip=q=>q.replace(/^([\s\S]*?)begin;/i,'$1').replace(/commit;\s*$/i,'');
 const recover="-- Emergency selective recovery only: schema rollback, source rollback, then reviewed specimen restore.\nbegin;\n"+strip(rollback)+strip(coreRollback)+strip(adaptedRestore)+'\ncommit;\n';
 return {install,rollback,recover};
}
async function addHashes(state,query){const lines=proposedLines(state);for(const [k,v] of Object.entries(lines))state[k+'_hash']=(await query(md5Sql(v))).rows[0].hash;return state;}
if(require.main===module){if(process.argv.includes('--preflight'))process.stdout.write(stateSql);else{const s=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-schema-manifest.json')));const p=makeSchemaPacket(s),folder=path.join(root,'supabase/unapplied/legacy-schema-retirement');fs.mkdirSync(folder,{recursive:true});for(const [file,key] of [['INSTALL.sql','install'],['ROLLBACK.sql','rollback'],['RECOVER_SCHEMA_AND_SPECIMENS.sql','recover']])fs.writeFileSync(path.join(folder,file),p[key]);fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(s,null,2)+'\n');console.log('Prepared guarded schema/archive and compatible recovery packets.');}}
module.exports={stateSql,proposedLines,md5Sql,makeSchemaPacket,addHashes,av};
