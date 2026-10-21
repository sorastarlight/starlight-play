/* Packet generation only. No hosted connection or apply command. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/legacy-retirement/cleanup');
const scoped=['public.catches','public.profiles','public.oak_transfers','public.trade_listings','public.trade_offers','public.direct_trades'];
const protectedTables=['public.inventories','public.candy_ledger','public.evolution_log','public.coin_ledger','public.item_ledger','public.xp_ledger','public.mastery_ledger','public.trainer_stats','public.species_seen','public.form_seen','public.species_mastery','public.species_mastery_events','private.species_mastery_outbox','private.species_mastery_activation','private.catch_insert_authority','private.stream_director'];
const legacy="ruleset_id is null and content_build is null and hp_max is null and nature_id is null";
const schemaSql=`(select md5(coalesce(string_agg(s,E'\\n' order by s),'')) from (
 select 'column:'||n.nspname||'.'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||a.attidentity::text||':'||a.attgenerated::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') s from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped and (n.nspname||'.'||c.relname)=any(array[${scoped.map(t=>`'${t}'`).join(',')}])
 union all select 'constraint:'||conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid=any(array[${scoped.map(t=>`'${t}'::regclass`).join(',')}]) or confrelid=any(array[${scoped.map(t=>`'${t}'::regclass`).join(',')}])
 union all select 'trigger:'||pg_get_triggerdef(t.oid)||':'||t.tgenabled::text||':'||md5(p.prosrc) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and tgrelid=any(array[${scoped.map(t=>`'${t}'::regclass`).join(',')}])
 union all select 'runtime:'||p.proname||':'||md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('stamp_catch_row','catch_json','admin_catch_battle_json','persist_streamlink_catch','persist_staff_gift')
) fingerprints)`;
const hashSql=(table,where='true')=>`(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),''))) from ${table} t where ${where})`;
const hasOld=`exists(select 1 from public.catches c where ${legacy} and (c.id=any(p.team_ids) or p.pc_layout::text like '%'||c.id::text||'%' or p.showcase::text like '%'||c.id::text||'%'))`;
const PREFLIGHT_SQL=`begin read only; select jsonb_build_object('schema_hash',${schemaSql},'legacy',${hashSql('public.catches',legacy)},'survivors',${hashSql('public.catches',`not (${legacy})`)},'oak',${hashSql('public.oak_transfers',`catch_id in(select id from public.catches where ${legacy})`)},'listings',${hashSql('public.trade_listings',`catch_id in(select id from public.catches where ${legacy})`)},'profile_count',(select count(*) from public.profiles p where ${hasOld})) manifest; rollback;`;
const quote=x=>`'${JSON.stringify(x).replaceAll("'","''")}'::jsonb`;
const helpers=`
create or replace function pg_temp.legacy_row_hash(rel regclass,predicate text default 'true') returns jsonb language plpgsql as $h$
declare result jsonb;begin execute format('select jsonb_build_object(''count'',count(*),''hash'',md5(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' order by to_jsonb(t)::text),''''))) from %s t where %s',rel,predicate) into result;return result;end $h$;
create or replace function pg_temp.legacy_strip_refs(value jsonb,ids text[]) returns jsonb language plpgsql as $h$
declare result jsonb;begin
 if value is null then return null;end if;
 if jsonb_typeof(value)='string' then if (value#>>'{}')=any(ids) then return 'null'::jsonb;end if;return value;
 elsif jsonb_typeof(value)='array' then select coalesce(jsonb_agg(pg_temp.legacy_strip_refs(v,ids) order by ord),'[]'::jsonb) into result from jsonb_array_elements(value) with ordinality a(v,ord);return result;
 elsif jsonb_typeof(value)='object' then
  if value->>'id'=any(ids) then return 'null'::jsonb;end if;
  select coalesce(jsonb_object_agg(k,pg_temp.legacy_strip_refs(v,ids)),'{}'::jsonb) into result from jsonb_each(value) a(k,v) where not(k=any(ids));return result;
 end if;return value;end $h$;
`;
const start=`begin;set local lock_timeout='5s';set local statement_timeout='30s';
lock table ${[...scoped,'public.encounter_rounds',...protectedTables].join(',')} in share row exclusive mode;
${helpers}`;
const preservedArray=`array[${protectedTables.map(t=>`'${t}'`).join(',')}]`;
const snapshot=`for rel in select unnest(${preservedArray}) loop protected_before:=protected_before||jsonb_build_object(rel,pg_temp.legacy_row_hash(rel::regclass));end loop;
select md5(coalesce(string_agg((to_jsonb(p)-array['team_ids','pc_layout','showcase','updated_at'])::text,E'\\n' order by id),'')) into profiles_before from public.profiles p;`;
const verifyProtected=`for rel in select unnest(${preservedArray}) loop if pg_temp.legacy_row_hash(rel::regclass) is distinct from protected_before->rel then raise exception 'Protected state changed: %',rel;end if;end loop;
if (select md5(coalesce(string_agg((to_jsonb(p)-array['team_ids','pc_layout','showcase','updated_at'])::text,E'\\n' order by id),'')) from public.profiles p) is distinct from profiles_before then raise exception 'Profile non-pointer data changed';end if;`;
const quiet=`if not exists(select 1 from private.stream_director where status='OFFLINE' and manual_hold and not rpg_session_active and queued is null and next_encounter_at is null) then raise exception 'Director is not held offline';end if;
if exists(select 1 from public.encounter_rounds r where not coalesce((to_jsonb(r)->>'cancelled')::boolean,false) and coalesce((to_jsonb(r)->>'ends_at')::timestamptz,'infinity'::timestamptz)>clock_timestamp()) then raise exception 'Active or unrecognized encounter';end if;`;
const archiveHash=`(select md5(coalesce(string_agg(relation||':'||row_key||':'||payload::text,E'\\n' order by relation,row_key),'')) from private.legacy_retirement_rows where run_key='legacy110-v1')`;
function makePacket(manifest){
 const m=quote(manifest),check=`if ${schemaSql} is distinct from expected->>'schema_hash' then raise exception 'Schema or trigger source drift';end if;`;
 const decl=`declare expected jsonb:=${m};ids uuid[];id_text text[];rec record;rel text;protected_before jsonb:='{}';profiles_before text;before_ptr jsonb;after_ptr jsonb;n bigint;`;
 const install=start+`
-- PROPOSAL ONLY: creates private archive and removes the pinned legacy set. Needs separate execution approval.
create table private.legacy_retirement_runs(run_key text primary key,status text not null,manifest jsonb not null,archive_hash text,created_at timestamptz not null default clock_timestamp(),restored_at timestamptz);
create table private.legacy_retirement_rows(run_key text not null references private.legacy_retirement_runs(run_key),relation text not null,row_key text not null,payload jsonb not null,primary key(run_key,relation,row_key));
alter table private.legacy_retirement_runs enable row level security;alter table private.legacy_retirement_rows enable row level security;
revoke all on private.legacy_retirement_runs,private.legacy_retirement_rows from public,anon,authenticated;
do $cleanup$ ${decl}begin
 ${check}${quiet}${snapshot}
 if pg_temp.legacy_row_hash('public.catches', '${legacy}') is distinct from expected->'legacy' or (select count(*) from public.catches where ruleset_id is null)<>(expected#>>'{legacy,count}')::bigint then raise exception 'Legacy row-set drift';end if;
 if pg_temp.legacy_row_hash('public.catches','not (${legacy})') is distinct from expected->'survivors' then raise exception 'Surviving specimen drift';end if;
 select array_agg(id order by id),array_agg(id::text order by id) into ids,id_text from public.catches where ${legacy};
 if exists(select 1 from public.trade_offers where catch_id=any(ids) or listing_id in(select id from public.trade_listings where catch_id=any(ids))) or exists(select 1 from public.direct_trades where a_catch=any(ids) or b_catch=any(ids)) or exists(select 1 from public.species_mastery_events where catch_id=any(ids)) or exists(select 1 from private.species_mastery_outbox where catch_id=any(ids)) or exists(select 1 from private.catch_insert_authority where catch_id=any(ids)) then raise exception 'New unsupported reference; revise proposal';end if;
 if pg_temp.legacy_row_hash('public.oak_transfers','catch_id in(select id from public.catches where ${legacy})') is distinct from expected->'oak' or pg_temp.legacy_row_hash('public.trade_listings','catch_id in(select id from public.catches where ${legacy})') is distinct from expected->'listings' then raise exception 'Linked row drift';end if;
 insert into private.legacy_retirement_runs(run_key,status,manifest) values('legacy110-v1','archived',expected);
 insert into private.legacy_retirement_rows select 'legacy110-v1','catches',id::text,to_jsonb(c) from public.catches c where id=any(ids);
 insert into private.legacy_retirement_rows select 'legacy110-v1','oak_transfers',id::text,to_jsonb(t) from public.oak_transfers t where catch_id=any(ids);
 insert into private.legacy_retirement_rows select 'legacy110-v1','trade_listings',id::text,to_jsonb(t) from public.trade_listings t where catch_id=any(ids);
 for rec in select p.* from public.profiles p where exists(select 1 from unnest(ids) x where x=any(p.team_ids) or p.pc_layout::text like '%'||x::text||'%' or p.showcase::text like '%'||x::text||'%') for update loop
  before_ptr:=jsonb_build_object('team_ids',to_jsonb(rec.team_ids),'pc_layout',rec.pc_layout,'showcase',rec.showcase);
  after_ptr:=jsonb_build_object('team_ids',coalesce((select jsonb_agg(x order by ord) from unnest(rec.team_ids) with ordinality a(x,ord) where not(x=any(ids))),'[]'::jsonb),'pc_layout',pg_temp.legacy_strip_refs(rec.pc_layout,id_text),'showcase',pg_temp.legacy_strip_refs(rec.showcase,id_text));
  if exists(select 1 from unnest(id_text) x where after_ptr::text like '%'||x||'%') then raise exception 'Unrecognized nested pointer; revise proposal';end if;
  insert into private.legacy_retirement_rows values('legacy110-v1','profile_pointers',rec.id::text,jsonb_build_object('before',before_ptr,'after',after_ptr));
  update public.profiles p set team_ids=x.team_ids,pc_layout=x.pc_layout,showcase=x.showcase from jsonb_populate_record(null::public.profiles,after_ptr) x where p.id=rec.id;
 end loop;
 if (select count(*) from private.legacy_retirement_rows where relation='profile_pointers')<>(expected->>'profile_count')::bigint then raise exception 'Profile pointer scope drift';end if;
 update private.legacy_retirement_runs set archive_hash=${archiveHash} where run_key='legacy110-v1';
 delete from public.oak_transfers where catch_id=any(ids);get diagnostics n=row_count;if n<>(expected#>>'{oak,count}')::bigint then raise exception 'Oak removal count mismatch';end if;
 delete from public.trade_listings where catch_id=any(ids);get diagnostics n=row_count;if n<>(expected#>>'{listings,count}')::bigint then raise exception 'Listing removal count mismatch';end if;
 delete from public.catches where id=any(ids);get diagnostics n=row_count;if n<>(expected#>>'{legacy,count}')::bigint then raise exception 'Specimen removal count mismatch';end if;
 if exists(select 1 from public.catches where ruleset_id is null) or pg_temp.legacy_row_hash('public.catches') is distinct from expected->'survivors' then raise exception 'Unexpected remaining specimens';end if;
 ${verifyProtected}
end $cleanup$;commit;
`;
 const triggers=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-cleanup-schema-baseline.json')))[0].audit.triggers.filter(t=>t.relation==='catches'||t.relation==='trade_listings');
 const toggle=action=>triggers.map(t=>`alter table public.${t.relation} ${action} trigger ${t.tgname};`).join('\n');
 const restore=start+`
-- PROPOSAL ONLY: selective restore; exact archived IDs; no catch rewards or stamp replay.
do $restore$ ${decl}begin
 ${check}${quiet}${snapshot}
 create temporary table legacy_restore_snapshot(protected jsonb,profiles text,survivors jsonb) on commit drop;
 insert into legacy_restore_snapshot values(protected_before,profiles_before,pg_temp.legacy_row_hash('public.catches','not (${legacy})'));
 if not exists(select 1 from private.legacy_retirement_runs where run_key='legacy110-v1' and status='archived' and manifest=expected and archive_hash=${archiveHash}) then raise exception 'Archive absent, modified, or already restored';end if;
 if exists(select 1 from public.catches c join private.legacy_retirement_rows a on a.run_key='legacy110-v1' and a.relation='catches' and a.row_key=c.id::text) then raise exception 'Restoration ID conflict';end if;
 for rec in select * from private.legacy_retirement_rows where run_key='legacy110-v1' and relation='profile_pointers' loop
  if (select jsonb_build_object('team_ids',to_jsonb(p.team_ids),'pc_layout',p.pc_layout,'showcase',p.showcase) from public.profiles p where id=rec.row_key::uuid) is distinct from rec.payload->'after' then raise exception 'Profile pointers changed after cleanup';end if;
 end loop;
end $restore$;
${toggle('disable')}
insert into public.catches overriding system value select (jsonb_populate_record(null::public.catches,payload)).* from private.legacy_retirement_rows where run_key='legacy110-v1' and relation='catches';
insert into public.oak_transfers overriding system value select (jsonb_populate_record(null::public.oak_transfers,payload)).* from private.legacy_retirement_rows where run_key='legacy110-v1' and relation='oak_transfers';
insert into public.trade_listings overriding system value select (jsonb_populate_record(null::public.trade_listings,payload)).* from private.legacy_retirement_rows where run_key='legacy110-v1' and relation='trade_listings';
${toggle('enable')}
do $restore$ ${decl}begin
 for rec in select * from private.legacy_retirement_rows where run_key='legacy110-v1' and relation='profile_pointers' loop
  update public.profiles p set team_ids=x.team_ids,pc_layout=x.pc_layout,showcase=x.showcase from jsonb_populate_record(null::public.profiles,rec.payload->'before') x where p.id=rec.row_key::uuid;
 end loop;
 if pg_temp.legacy_row_hash('public.catches','${legacy}') is distinct from expected->'legacy' or pg_temp.legacy_row_hash('public.oak_transfers','catch_id in(select id from public.catches where ${legacy})') is distinct from expected->'oak' or pg_temp.legacy_row_hash('public.trade_listings','catch_id in(select id from public.catches where ${legacy})') is distinct from expected->'listings' then raise exception 'Restored row mismatch';end if;
 select protected,profiles into protected_before,profiles_before from legacy_restore_snapshot;
 ${verifyProtected}
 if pg_temp.legacy_row_hash('public.catches','not (${legacy})') is distinct from (select survivors from legacy_restore_snapshot) then raise exception 'Survivors changed during restore';end if;
 ${check}
 update private.legacy_retirement_runs set status='restored',restored_at=clock_timestamp() where run_key='legacy110-v1';
end $restore$;commit;
`;
 return {install,restore};
}
if(require.main===module){
 if(process.argv.includes('--preflight'))process.stdout.write(PREFLIGHT_SQL);
 else {const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-cleanup-manifest.json')));const p=makePacket(manifest);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'ARCHIVE_AND_REMOVE.sql'),p.install);fs.writeFileSync(path.join(folder,'RESTORE.sql'),p.restore);fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Prepared proposal-only archive/removal and restore; no database connection.');}
}
module.exports={makePacket,PREFLIGHT_SQL,schemaSql,hashSql,protectedTables,scoped};
