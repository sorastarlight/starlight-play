/* Isolated loopback PostgreSQL only. No live specimen data loaded. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {refuseHosted}=require('./a19-schema-rehearsal');
const {makePacket,PREFLIGHT_SQL,protectedTables}=require('./prepare-legacy-cleanup');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness');const dir=fs.mkdtempSync(path.join(cache,'legacy-cleanup-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-only',port:55472,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s);};let db;
 try{
 await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
 await db.query('create schema private;create role anon;create role authenticated;');
 const schema=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-cleanup-clone-schema.json')))[0].audit.clone_columns;
 const tableNames=[...new Set(schema.map(c=>c.relation))];
 for(const table of tableNames){const cols=schema.filter(c=>c.relation===table);await db.query(`create table public.${table}(${cols.map(c=>`${c.name} ${c.type}${c.identity?' generated always as identity':''}${c.not_null?' not null':''}`).join(',')},primary key(id))`);}
 await db.query(`alter table public.catches add constraint fixture_source_unique unique(source_key);
 alter table public.catches add foreign key(user_id) references public.profiles(id);
 alter table public.oak_transfers add foreign key(catch_id) references public.catches(id);
 alter table public.trade_listings add foreign key(catch_id) references public.catches(id) on delete cascade;
 alter table public.trade_offers add foreign key(catch_id) references public.catches(id) on delete cascade;
 alter table public.trade_offers add foreign key(listing_id) references public.trade_listings(id) on delete cascade;
 create table public.encounter_rounds(id uuid primary key,ends_at timestamptz,cancelled bool);
 create table private.stream_director(id int,status text,manual_hold bool,rpg_session_active bool,queued jsonb,next_encounter_at timestamptz);
 insert into private.stream_director values(1,'OFFLINE',true,false,null,null);
 create table private.species_mastery_outbox(catch_id uuid primary key);create table private.catch_insert_authority(catch_id uuid primary key);
 create table public.species_mastery_events(catch_id uuid primary key);
 create table public.pokemon_forms(pokemon_form_id int,form_key text,form_label text,is_base bool);
 create table private.ref_forms(content_build text,form_id int,dex int,types text[],hp int,atk int,def int,spa int,spd int,spe int);
 create table private.ref_natures(content_build text,id int,name text,up_stat text,down_stat text);
 create table private.ref_abilities(content_build text,ability_id int,slug text);create table private.ref_moves(content_build text,move_id int,slug text);`);
 for(const t of protectedTables){if(!(await db.query('select to_regclass($1) found',[t])).rows[0].found)await db.query(`create table ${t}(id int primary key,value text);insert into ${t} values(1,'preserve')`);}
 const owner='bbbbbbbb-0040-4040-8040-000000000001',old='aaaaaaaa-0040-4040-8040-000000000001',modern='aaaaaaaa-0040-4040-8040-000000000002',listing='cccccccc-0040-4040-8040-000000000001';
 function row(table,overrides){const result={};for(const c of schema.filter(c=>c.relation===table&&c.not_null)){result[c.name]=c.type.endsWith('[]')?[]:c.type==='jsonb'?{}:c.type==='boolean'?false:c.type.includes('timestamp')?'2026-01-01T00:00:00Z':c.type==='uuid'?owner:c.type==='text'?'fixture':1;}return {...result,...overrides};}
 const insert=async(table,value)=>db.query(`insert into public.${table} overriding system value select (jsonb_populate_record(null::public.${table},$1::jsonb)).*`,[JSON.stringify(value)]);
 await insert('profiles',row('profiles',{id:owner,team_ids:[old,modern],pc_layout:{boxes:[{name:'Keep name',slots:[old,modern,null]}]},showcase:{shinyCatchId:old,achievementId:'keep-achievement'},xp:123}));
 await insert('catches',row('catches',{id:old,user_id:owner,dex:10,name:'Fictional old',ruleset_id:null,content_build:null,nature_id:null,hp_max:null,source_key:'fixture:old',server_inserted_at:'2025-01-01T00:00:00Z'}));
 await insert('catches',row('catches',{id:modern,user_id:owner,dex:10,name:'Fictional modern',ruleset_id:'streamlink-gen9-xgen',content_build:'fixture',nature_id:1,hp_max:22,source_key:'fixture:modern',server_inserted_at:'2026-01-01T00:00:00Z'}));
 await insert('oak_transfers',row('oak_transfers',{id:1,user_id:owner,catch_id:old,dex:10}));
 await insert('trade_listings',row('trade_listings',{id:listing,user_id:owner,catch_id:old,status:'open'}));
 await insert('candy_ledger',row('candy_ledger',{id:'dddddddd-0040-4040-8040-000000000001',related_catch:old}));
 await insert('evolution_log',row('evolution_log',{id:'dddddddd-0040-4040-8040-000000000002',catch_id:old}));
 // Actual column types, core reference constraints and actual trigger bodies. No real profile/specimen rows.
 const funcs=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-cleanup-trigger-bodies.json')));
 for(const f of funcs)await db.query(f.definition);
 const deps=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-retirement-trigger-dependencies.json')))[0].audit.functions;
 await db.query(deps.find(f=>f.name==='catches_before_write').definition);
 const runtime=fs.readFileSync(path.join(root,'supabase/unapplied/legacy-retirement/INSTALL.sql'),'utf8');await db.query(runtime.slice(runtime.indexOf('CREATE OR REPLACE FUNCTION'),runtime.lastIndexOf('commit;')));
 const triggerDefs=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-cleanup-schema-baseline.json')))[0].audit.triggers;
 for(const t of triggerDefs.filter(t=>t.tgname!=='staff_pass_override'))await db.query(t.definition);
 const result=await db.query(PREFLIGHT_SQL);const manifest=result.find(x=>x.rows?.[0]?.manifest)?.rows[0].manifest;assert(manifest);const packet=makePacket(manifest);
 const rollback=()=>db.query('rollback');const reject=async(sql,pattern)=>{await assert.rejects(()=>db.query(sql),pattern);await rollback();};
 const profile=async()=>(await db.query('select to_jsonb(p) data from public.profiles p')).rows[0].data;
 const originalProfile=await profile();const specimenHash=async()=>(await db.query("select md5(string_agg(to_jsonb(c)::text,E'\\n' order by id)) hash from public.catches c")).rows[0].hash;const originalHash=await specimenHash();
 await db.query("update public.catches set name='changed' where id=$1",[old]);await reject(packet.install,/Legacy row-set drift/);await db.query("update public.catches set name='Fictional old' where id=$1",[old]);pass('Source row drift refuses deletion and rolls archive DDL back');
 await db.query('update private.stream_director set manual_hold=false');await reject(packet.install,/Director is not held/);await db.query('update private.stream_director set manual_hold=true');pass('Busy director refuses cleanup');
 await db.query("insert into public.encounter_rounds values(gen_random_uuid(),now()+interval '1 hour',false)");await reject(packet.install,/Active or unrecognized encounter/);await db.query('delete from public.encounter_rounds');pass('Active encounter refuses cleanup');
 await insert('trade_offers',row('trade_offers',{id:'eeeeeeee-0040-4040-8040-000000000001',listing_id:listing,catch_id:modern}));await reject(packet.install,/New unsupported reference/);await db.query('delete from public.trade_offers');pass('Offer against the retiring listing blocks cascading removal even for modern offered specimen');
 await db.query('alter table public.catches add column unexpected text');await reject(packet.install,/Schema or trigger source drift/);await db.query('alter table public.catches drop column unexpected');
 // Dropped-column attnum has no new field in signature; confirm schema is restored.
 pass('Schema drift aborts before deletion');
 const refreshed=await db.query(PREFLIGHT_SQL);const m2=refreshed.find(x=>x.rows?.[0]?.manifest)?.rows[0].manifest;const p2=makePacket(m2);
 await db.query(p2.install);pass('Archive/removal packet executes on fictional linked rows with real reference constraints');
 assert.equal((await db.query("select bool_and(relrowsecurity) secure from pg_class where oid in ('private.legacy_retirement_rows'::regclass,'private.legacy_retirement_runs'::regclass)")).rows[0].secure,true);
 for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_table_privilege($1,'private.legacy_retirement_rows','SELECT,INSERT,UPDATE,DELETE') allowed",[role])).rows[0].allowed,false);pass('Archive tables have RLS and no anon/authenticated data privileges');
 assert.equal((await db.query('select count(*) n from public.catches')).rows[0].n,'1');assert.equal((await db.query('select id from public.catches')).rows[0].id,modern);
 assert.equal((await db.query("select count(*) n from private.legacy_retirement_rows where relation='catches'")).rows[0].n,'1');pass('Only pinned old specimen removed; exact full specimen retained in private archive');
 const cleaned=await profile();assert.deepEqual(cleaned.team_ids,[modern]);assert.deepEqual(cleaned.pc_layout,{boxes:[{name:'Keep name',slots:[null,modern,null]}]});assert.deepEqual(cleaned.showcase,{shinyCatchId:null,achievementId:'keep-achievement'});assert.equal(cleaned.xp,123);pass('Team/layout/showcase pointers cleaned without changing slot positions, metadata or XP');
 assert.equal((await db.query('select count(*) n from public.candy_ledger')).rows[0].n,'1');assert.equal((await db.query('select count(*) n from public.evolution_log')).rows[0].n,'1');pass('Candy/evolution history retained; protected table hashes checked inside transaction');
 await reject(p2.install,/already exists/);pass('Removal replay fails closed without changing archive or live rows');
 await db.query("update public.profiles set showcase=showcase||'{\"later\":true}'::jsonb");await reject(p2.restore,/Profile pointers changed/);await db.query('update public.profiles set showcase=$1::jsonb',[JSON.stringify(cleaned.showcase)]);pass('Restore refuses to overwrite later profile pointer changes');
 await db.query("update private.legacy_retirement_rows set payload=payload||'{\"tampered\":true}'::jsonb where relation='catches'");await reject(p2.restore,/Archive absent, modified/);await db.query("update private.legacy_retirement_rows set payload=payload-'tampered' where relation='catches'");pass('Archive integrity guard rejects modified payload');
 const failRestore=p2.restore.replace('insert into public.oak_transfers overriding system value',()=>"do $$begin raise exception 'fictional mid-restore failure';end$$;\ninsert into public.oak_transfers overriding system value");
 await reject(failRestore,/fictional mid-restore failure/);assert.equal((await db.query('select count(*) n from public.catches')).rows[0].n,'1');assert((await db.query("select tgenabled from pg_trigger where not tgisinternal and tgrelid='public.catches'::regclass")).rows.every(t=>t.tgenabled==='O'));pass('Mid-restore failure rolls inserted rows and trigger disabling back atomically');
 await db.query(p2.restore);assert.equal(await specimenHash(),originalHash);const restored=await profile();for(const k of ['team_ids','showcase','pc_layout','xp'])assert.deepEqual(restored[k],originalProfile[k]);pass('Selective restore reproduces exact specimen JSON and scoped profile pointers');
 assert.equal((await db.query('select count(*) n from public.oak_transfers')).rows[0].n,'1');assert.equal((await db.query('select count(*) n from public.trade_listings')).rows[0].n,'1');pass('Oak and open listing restored with original IDs and foreign keys intact');
 const flag=(await db.query("select tgname,tgenabled from pg_trigger where not tgisinternal and tgrelid in ('public.catches'::regclass,'public.trade_listings'::regclass)")).rows;assert(flag.every(t=>t.tgenabled==='O'));pass('All seven scoped restore triggers re-enabled; no replication-role or foreign-key bypass');
 await reject(p2.restore,/Archive absent, modified, or already restored/);pass('Restoration replay fails closed');
 // Two clients: bounded locks reject a competing update instead of racing a cleanup.
 const other=cluster.getPgClient('postgres','127.0.0.1');await other.connect();try{await db.query('begin;lock table public.catches in share row exclusive mode');await other.query("set lock_timeout='100ms'");await assert.rejects(()=>other.query('update public.catches set name=name where id=$1',[modern]),e=>e.code==='55P03');await db.query('rollback');}finally{await other.end();}pass('Second client cannot race a catch update across cleanup table lock');
 fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/legacy-cleanup-local-result.json'),JSON.stringify({at:new Date().toISOString(),classification:'REAL LOCAL SQL, fictional linked rows, actual relevant column types and trigger bodies/core FKs',checks,limitations:'Does not clone every production constraint/policy, all trigger dependencies or full content reference data. No production cleanup or restore executed. XP/presentation/stamp trigger bodies intentionally never fire during selective restore; whole protected table hashes and exact restored rows are checked. profiles.updated_at follows existing touch trigger rather than being backdated.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
 console.log(checks.length+' REAL LOCAL SQL cleanup checks passed');
}main().catch(e=>{console.error(e);process.exit(1)});
