/* Generates exact source/data-guarded packets locally; no connection/apply code. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/familiarity-capture-identity');
const state=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/familiarity-capture-identity-baseline.json')));
const sql=fs.readFileSync(path.join(folder,'FUNCTIONS.sql'),'utf8').replace(/\r\n/g,'\n');
const oldNames=['species_mastery_outbox_admit','record_species_mastery_event','species_mastery_events_guard','reconcile_species_mastery_outbox'];
const fresh=['familiarity_capture_identity','freeze_familiarity_capture_identity'];
const md5=s=>crypto.createHash('md5').update(s).digest('hex');
const definitions=[...sql.matchAll(/CREATE (?:OR REPLACE )?FUNCTION private\.(\w+)[\s\S]*?AS \$function\$([\s\S]*?)\$function\$;/g)];
if(definitions.length!==6)throw Error('Expected four replacements and two helpers');
const after=Object.fromEntries(definitions.map(m=>[m[1],md5(m[2])]));
const hashes={events:state.event_hash,outbox:state.outbox_hash,specimens:'62a30076d38ae7c0cec63621ffe6a32e'};
const hash=(table,alias,order,strip='')=>`(select md5(coalesce(string_agg((to_jsonb(${alias})${strip})::text,chr(10) order by ${order}),'')) from ${table} ${alias})`;
const eventHash=hash('public.species_mastery_events','e','catch_id');
const outboxHash=hash('private.species_mastery_outbox','o','catch_id',"-'capture_identity'");
const catchHash=hash('public.catches','c','to_jsonb(c)::text');
const stable=`if ${eventHash} is distinct from '${hashes.events}' or ${outboxHash} is distinct from '${hashes.outbox}' or ${catchHash} is distinct from '${hashes.specimens}' then raise exception 'Capture/event/queue data drift';end if;`;
const sourceGuard=state.functions.map(f=>`if (select md5(prosrc) from pg_proc where oid='${f.signature}'::regprocedure) is distinct from '${f.md5}' or (select proacl::text from pg_proc where oid='${f.signature}'::regprocedure) is distinct from ${f.acl===null?'null':"'"+f.acl.replaceAll("'","''")+"'"} then raise exception 'Familiarity function/ACL drift: ${f.name}';end if;`).join('\n');
const otherGuard=`if (${state.other_hash_sql}) is distinct from '${state.other_hash}' then raise exception 'Unrelated function catalog drift';end if;`;
const attributeGuard=state.functions.map(f=>`if (select to_jsonb(proconfig) from pg_proc where oid='${f.signature}'::regprocedure) is distinct from ${f.config===null?'NULL':"'"+JSON.stringify(f.config).replaceAll("'","''")+"'::jsonb"} or (select prosecdef from pg_proc where oid='${f.signature}'::regprocedure) is distinct from ${f.security_definer} or (select pg_get_userbyid(proowner) from pg_proc where oid='${f.signature}'::regprocedure) is distinct from '${f.owner}' then raise exception 'Function attribute drift: ${f.name}';end if;`).join('\n');
const begin="begin;set local lock_timeout='5s';set local statement_timeout='30s';\nlock table public.catches,public.capture_log,public.species_mastery_events in share row exclusive mode;\nlock table private.species_mastery_outbox in access exclusive mode;\n";
const install=begin+`do $guard$ begin
 ${stable}
 ${sourceGuard}
 ${attributeGuard}
 ${otherGuard}
 if exists(select 1 from private.species_mastery_outbox where status<>'delivered') then raise exception 'Outstanding queue requires a separately reviewed migration';end if;
 if (select activated_at from private.species_mastery_activation where singleton) is distinct from '${state.activation.activated_at}'::timestamptz then raise exception 'Activation cutoff drift';end if;
 if exists(select 1 from information_schema.columns where table_schema='private' and table_name='species_mastery_outbox' and column_name='capture_identity') then raise exception 'Capture identity already installed';end if;
end $guard$;
alter table private.species_mastery_outbox add column capture_identity jsonb;
alter table private.species_mastery_outbox add constraint familiarity_capture_identity_required check(capture_identity is not null or status='delivered');
${sql}
create trigger freeze_familiarity_capture_identity before update on private.species_mastery_outbox for each row execute function private.freeze_familiarity_capture_identity();
${fresh.map(n=>`revoke all on function private.${n}(${n==='familiarity_capture_identity'?'uuid':''}) from PUBLIC,anon,authenticated,service_role;`).join('\n')}
do $verify$ begin
 ${stable}
 ${otherGuard}
 ${attributeGuard}
 ${definitions.map(m=>`if (select md5(prosrc) from pg_proc where oid='private.${m[1]}(${m[1]==='familiarity_capture_identity'||m[1]==='record_species_mastery_event'?'uuid':m[1]==='reconcile_species_mastery_outbox'?'integer':''})'::regprocedure) is distinct from '${after[m[1]]}' then raise exception 'Installed source mismatch';end if;`).join('\n')}
 if exists(select 1 from private.species_mastery_outbox where capture_identity is not null) then raise exception 'Unexpected historical backfill';end if;
 if has_table_privilege('anon','private.species_mastery_outbox','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','private.species_mastery_outbox','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Queue browser access';end if;
end $verify$;commit;
`;
const rollback=begin+`do $guard$ begin
 ${stable}
 ${otherGuard}
 if exists(select 1 from private.species_mastery_outbox where capture_identity is not null) then raise exception 'New snapshot rows require a fresh rollback review';end if;
 ${definitions.map(m=>`if (select md5(prosrc) from pg_proc where oid='private.${m[1]}(${m[1]==='familiarity_capture_identity'||m[1]==='record_species_mastery_event'?'uuid':m[1]==='reconcile_species_mastery_outbox'?'integer':''})'::regprocedure) is distinct from '${after[m[1]]}' then raise exception 'Rollback source drift';end if;`).join('\n')}
end $guard$;
drop trigger freeze_familiarity_capture_identity on private.species_mastery_outbox;
${state.functions.filter(f=>oldNames.includes(f.name)).map(f=>f.definition+';').join('\n')}
drop function private.familiarity_capture_identity(uuid) restrict;
drop function private.freeze_familiarity_capture_identity() restrict;
alter table private.species_mastery_outbox drop constraint familiarity_capture_identity_required;
alter table private.species_mastery_outbox drop column capture_identity restrict;
do $verify$ begin ${stable} ${sourceGuard} ${attributeGuard} ${otherGuard} end $verify$;commit;
`;
if(require.main===module){fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({oldNames,fresh,before:state.functions.map(f=>({name:f.name,md5:f.md5,acl:f.acl})),after,hashes,cutoff:state.activation.activated_at},null,2)+'\n');console.log('Prepared immutable capture identity packet and strict pre-use rollback');}
module.exports={install,rollback,after,oldNames,fresh};
