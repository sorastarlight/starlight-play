/* Disposable PostgreSQL, actual read formatter/helper bodies, fictional records only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness'),dir=fs.mkdtempSync(path.join(cache,'legacy-retire-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-local-only',port:55471,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let db;const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
 await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
 await db.query(`create schema private;
 create table public.catches(id uuid,user_id uuid,public_id text,dex int,name text,nickname text,variant text,gender text,ball text,caught_at timestamptz,level int,size_class text,is_alpha bool,
 iv_hp int,iv_atk int,iv_def int,iv_spa int,iv_spd int,iv_spe int,av_hp int,av_atk int,av_def int,av_spa int,av_spd int,av_spe int,ev_hp int,ev_atk int,ev_def int,ev_spa int,ev_spd int,ev_spe int,
 moves text[],ot_name text,ot_number int,ot_user_id uuid,met_level int,met_location text,height_m numeric,weight_kg numeric,friendship int,transferred_at timestamptz,favorite bool,locked bool,obtained_method text,trade_evo_ready bool,pokemon_form_id int,ruleset_id text,content_build text,nature_id int,hp_current int,hp_max int);
 create table public.lgpe_species(dex int,types text[],hp int,atk int,def int,spa int,spd int,spe int);
 create table public.trade_listings(catch_id uuid,status text);create table public.species(dex int,tradable bool);
 create table public.pokemon_forms(pokemon_form_id int,form_key text,form_label text,is_base bool);
 create table private.ref_forms(content_build text,form_id int,dex int,hp int,atk int,def int,spa int,spd int,spe int,primary key(content_build,form_id));
 create table private.ref_natures(content_build text,id int,up_stat text,down_stat text,primary key(content_build,id));
 create function private.canonical_form_id(int,int) returns int language sql immutable as $$select $2$$;
 create function private.form_display_name(int,int) returns text language sql immutable as $$select 'Fictional species'::text$$;
 insert into public.lgpe_species values(10,array['Bug'],50,50,50,50,50,50);
 insert into public.species values(10,true);insert into public.pokemon_forms values(10,'base','Base',true);
 insert into private.ref_forms values('fixture',10,10,45,30,35,20,20,45),('wrong-build',10,10,99,99,99,99,99,99),('fixture',11,10,60,60,60,60,60,60);
 insert into private.ref_natures values('fixture',1,'atk','spd'),('wrong-build',1,'def','atk');
 insert into public.catches(id,user_id,public_id,dex,name,variant,gender,ball,level,pokemon_form_id,ruleset_id,content_build,nature_id,hp_current,hp_max,iv_hp,iv_atk,iv_def,iv_spa,iv_spd,iv_spe,av_hp,av_atk,av_def,av_spa,av_spd,av_spe,ev_hp,ev_atk,ev_def,ev_spa,ev_spd,ev_spe)
 values('aaaaaaaa-0039-4039-8039-000000000039','bbbbbbbb-0039-4039-8039-000000000039','SL-FIXTURE',10,'Fictional Caterpie','normal','Female','pokeball',6,10,'streamlink-gen9-xgen','fixture',1,22,22,20,4,12,7,9,23,0,0,0,0,0,0,0,0,0,0,0,0);`);

 await db.query(`alter table public.catches add column ability_id int,add column move_slots jsonb;create table public.profiles(id uuid,display_name text,twitch_login text);
 alter table private.ref_forms add column types text[];update private.ref_forms set types=array['Bug'];
 alter table private.ref_natures add column name text;create table private.ref_abilities(content_build text,ability_id int,slug text);create table private.ref_moves(content_build text,move_id int,slug text);`);
 const defs=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-retirement-function-baseline.json')));
 for(const x of defs)await db.query(x.definition);
 const read=async()=> (await db.query('select private.catch_json(c) payload from public.catches c')).rows[0].payload;
 const rowHash=async()=> (await db.query('select md5(to_jsonb(c)::text) hash from public.catches c')).rows[0].hash;
 const before=await read();let rowBefore;
 const folder=path.join(root,'supabase/unapplied/legacy-retirement');
 const packet=fs.readFileSync(path.join(folder,'INSTALL.sql'),'utf8');
 await db.query("create or replace function private.catch_json(c public.catches) returns jsonb language plpgsql stable as $$begin return '{}'::jsonb;end$$");
 await assert.rejects(()=>db.query(packet),/Source drift: catch_json/);await db.query('rollback');await db.query(defs.find(x=>x.name==='catch_json').definition);pass('Source drift aborts packet before replacing any functions');
 await db.query(packet);pass('All five actual function replacements install behind exact source guards');

 await db.query(`alter table public.catches add column source_key text unique,add column round_id uuid,add column ability_slot text,add column status text,add column held_item text,add column gigantamax_factor bool;
 create table private.ref_species(content_build text,dex int,slug text);insert into private.ref_species values('fixture',10,'caterpie');
 create function private.require_staff_edit() returns void language plpgsql as $$begin if current_setting('fixture.staff',true) is distinct from 'yes' then raise exception 'staff denied' using errcode='42501';end if;end$$;
 create function private.streamlink_wire_is_enabled() returns bool language sql as $$select true$$;
 create function private.streamlink_protected_trainer(uuid) returns bool language sql as $$select false$$;
 create function private.streamlink_secure_u32() returns bigint language sql as $$select 10::bigint$$;
 create function private.streamlink_json_int(jsonb) returns int language sql as $$select ($1#>>'{}')::int$$;
 create function private.streamlink_generate_prepare(int,int,text,text,text) returns jsonb language sql as $$select jsonb_build_object('ok',true,'dex',$1,'build',$4)$$;
 create function private.streamlink_complete_and_bind(jsonb,bool,int,int,int,int,int,int,int,int,bigint,uuid) returns jsonb language sql as $$select '{"ok":true,"dex":10,"formId":10,"level":6,"gender":"female","ivs":{"hp":20,"atk":4,"def":12,"spa":7,"spd":9,"spe":23},"legacyMoves":["Tackle"],"moveSlots":[],"friendship":70,"heightM":0.3,"weightKg":2.9,"natureId":1,"abilityId":19,"abilitySlot":"ordinary","rulesetId":"streamlink-gen9-xgen","contentBuild":"fixture","hpCurrent":22,"hpMax":22}'::jsonb$$;
 create function private.assert_streamlink_legal(jsonb,text,uuid) returns jsonb language sql as $$select '{"ok":true}'::jsonb$$;
 create function private.streamlink_next_public_id(text) returns text language sql as $$select $1||gen_random_uuid()::text$$;`);
 const triggerBase=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-retirement-trigger-dependencies.json')))[0].audit.functions.find(x=>x.name==='catches_before_write');
 await db.query(triggerBase.definition);await db.query('create trigger catches_before_write before insert on public.catches for each row execute function private.catches_before_write()');
 rowBefore=await rowHash();
 const user='bbbbbbbb-0039-4039-8039-000000000039';
 const persist=async(name,key,ctx='catch')=>(await db.query(`select private.${name}($1,10,6,$2,$3,'poke',null,false,'fixture') result`,[user,ctx,key])).rows[0].result;
 const first=await persist('persist_streamlink_catch','play:fixture');assert.equal(first.ok,true);let stored=(await db.query('select av_hp,iv_hp,ev_hp,hp_max from public.catches where source_key=$1',['play:fixture'])).rows[0];assert.deepEqual(stored,{av_hp:null,iv_hp:20,ev_hp:0,hp_max:22});pass('Actual catch writer persists modern specimen without explicit AV values');
 assert.equal((await persist('persist_streamlink_catch','play:fixture')).replay,true);pass('Actual catch writer retains source-key replay handling');
 await assert.rejects(()=>persist('persist_staff_gift','grant:staff-reward:fixture','grant'),e=>e.code==='42501');pass('Actual staff writer still invokes authorization before insertion');
 await db.query("select set_config('fixture.staff','yes',false)");assert.equal((await persist('persist_staff_gift','grant:staff-reward:fixture','grant')).ok,true);stored=(await db.query('select av_hp,iv_hp,ev_hp,hp_max from public.catches where source_key=$1',['grant:staff-reward:fixture'])).rows[0];assert.deepEqual(stored,{av_hp:null,iv_hp:20,ev_hp:0,hp_max:22});pass('Actual staff writer persists modern fields without AV under fictional allowed staff');
 await db.query("delete from public.catches where source_key is not null");
 const after=await read();assert.deepEqual(after.stats,before.stats);assert.deepEqual(after.types,['Bug']);assert(!('cp' in after));assert(!('avs' in after));pass('WIRE stats preserved, pinned types used, CP and AV response fields removed');
 const strip=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!['cp','avs','types'].includes(k)));assert.deepEqual(strip(before),strip(after));assert.equal(await rowHash(),rowBefore);pass('Other payload fields and specimen row unchanged');
 const staff=(await db.query('select private.admin_catch_battle_json(c) data from public.catches c')).rows[0].data;assert(!('avs' in staff));assert('ivs' in staff&&'evs' in staff);pass('Actual staff serializer removes AV while keeping IV/EV');
 await db.query('drop table public.lgpe_species');assert.deepEqual((await read()).stats,before.stats);pass('New serializer works with legacy species table absent');
 await db.query("update public.catches set content_build='missing'");let missing=await read();assert.deepEqual(missing.types,[]);assert.equal(missing.stats.atk,null);assert.equal(missing.stats.hp,22);pass('Missing exact WIRE reference stays unavailable without borrowing legacy data');
 await db.query("update public.catches set content_build='fixture',ruleset_id=null");const old=await read();assert(Object.values(old.stats).every(x=>x===null));pass('Unpinned legacy specimens are not fabricated into WIRE stats');
 await db.query("update public.catches set ruleset_id='streamlink-gen9-xgen'");
 await db.query(`create table public.lgpe_species(dex int,types text[],hp int,atk int,def int,spa int,spd int,spe int);insert into public.lgpe_species values(10,array['Bug'],50,50,50,50,50,50);`);
 await db.query(fs.readFileSync(path.join(folder,'ROLLBACK.sql'),'utf8'));assert.deepEqual(await read(),before);pass('Rollback restores exact original full payload');
 for(const x of defs.filter(x=>['catch_json','admin_catch_battle_json','persist_streamlink_catch','persist_staff_gift','stamp_catch_row'].includes(x.name))){const got=(await db.query('select md5(prosrc) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=$1 and p.proname=$2',[x.schema,x.name])).rows[0].hash;assert.equal(got,x.body_md5);}pass('All five rollback bodies match baseline hashes');
 fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/legacy-retirement-local-result.json'),JSON.stringify({at:new Date().toISOString(),classification:'REAL LOCAL SQL with fictional data and small presentation stubs',checks,limitations:'Actual writer success/replay/authorization hook tested with fictional generation and authorization stubs. Actual before-write trigger and stamp executed for writer fixtures. After-insert XP/presentation/outbox triggers, real generator legality, real Supabase roles and hosted UI not exercised.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
 console.log(checks.length+' REAL LOCAL SQL checks passed');
}main().catch(e=>{console.error(e);process.exit(1)});
