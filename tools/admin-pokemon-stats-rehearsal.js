/* Disposable loopback PostgreSQL; fictional records only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {refuseHosted}=require('./a19-schema-rehearsal.js');
async function main(){
 refuseHosted();
 const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache','d54-pg-harness');
 const dir=fs.mkdtempSync(path.join(cache,'admin-stats-'));
 assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'local-fictional-only',port:55468,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let db,count=0;
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();
  assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
  await db.query(`create schema private;create role anon nologin;create role authenticated nologin;
   create table public.catches(id uuid,user_id uuid,dex int,name text,nickname text,variant text,gender text,ball text,level int,caught_at timestamptz,transferred_at timestamptz,
   iv_hp int,iv_atk int,iv_def int,iv_spa int,iv_spd int,iv_spe int,ev_hp int,ev_atk int,ev_def int,ev_spa int,ev_spd int,ev_spe int,av_hp int,av_atk int,av_def int,av_spa int,av_spd int,av_spe int,
   hp_current int,hp_max int,nature_id int,ability_id int,content_build text,move_slots jsonb,moves text[]);
   create table private.ref_natures(content_build text,id int,name text,primary key(content_build,id));
   create table private.ref_abilities(content_build text,ability_id int,slug text,primary key(content_build,ability_id));
   create table private.ref_moves(content_build text,move_id int,slug text,primary key(content_build,move_id));
   create table public.profiles(id uuid,username text,twitch_login text,display_name text,avatar_url text,starlight_pass bool,created_at timestamptz,last_seen_at timestamptz);
   create table public.inventories(user_id uuid,berry int,bait int,pokeball int,greatball int,ultraball int,lure int,coins int,bag_bonus int,balls jsonb,items jsonb);
   create table public.twitch_connections(id uuid,user_id uuid,twitch_user_id text,twitch_login text,twitch_display_name text,avatar_url text,is_primary bool,gameplay_enabled bool,login_enabled bool,connection_type text,authorization_status text,confirmed bool,linked_at timestamptz,last_verified_at timestamptz);
   create table public.evolution_families(id int,name text,base_dex int);
   create table public.family_candy(user_id uuid,family_id int,qty int);
   create table public.species(dex int,name text,family_id int,family_candy_species_id int);
   create function private.play_staff_role(uuid default null) returns text language sql stable as $$select 'owner'::text$$;
   create function private.profile_has_password(uuid) returns bool language sql stable as $$select true$$;
   insert into public.profiles(id,username) values ('aaaaaaaa-0000-4000-8000-000000000001','Fictional');
   insert into private.ref_natures values ('fixture',1,'Hardy'),('other',1,'Wrong build');
   insert into private.ref_abilities values ('fixture',1,'solar-power');
   insert into private.ref_moves values ('fixture',1,'tackle'),('fixture',2,'growl');
   insert into public.catches(id,user_id,dex,name,level,caught_at,iv_hp,ev_hp,av_hp,hp_current,hp_max,nature_id,ability_id,content_build,move_slots,moves)
   values ('bbbbbbbb-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',4,'Fictional Charmander',5,now(),0,0,0,0,20,1,1,'fixture','[{"moveId":2},{"moveId":1,"name":"Tackle"}]',array['wrong-legacy']);`);
  const folder=path.join(root,'supabase/unapplied/admin-pokemon-stats');
  const rollback=fs.readFileSync(path.join(folder,'ROLLBACK.sql'),'utf8');
  const original=rollback.slice(rollback.indexOf('CREATE OR REPLACE FUNCTION'),rollback.indexOf('drop function private.admin_catch_battle_json'));
  await db.query(original);
  const before=(await db.query("select md5(pg_get_functiondef('private.admin_account_json(uuid)'::regprocedure)) hash")).rows[0].hash;
  await db.query('begin');await db.query(fs.readFileSync(path.join(folder,'INSTALL.sql'),'utf8'));await db.query('commit');
  const read=async()=> (await db.query("select private.admin_account_json('aaaaaaaa-0000-4000-8000-000000000001') data")).rows[0].data;
  const installedHash=(await db.query("select md5(pg_get_functiondef('private.admin_account_json(uuid)'::regprocedure)) hash")).rows[0].hash;
  console.log('Installed helper definition MD5 '+installedHash);
  const data=await read(),battle=data.mons[0].battleData;
  assert.equal(battle.ivs.hp,0);assert.equal(battle.ivs.atk,null);assert.equal(battle.evs.hp,0);count++;
  assert.equal(battle.hpCurrent,0);assert.equal(battle.hpMax,20);count++;
  assert.equal(battle.nature,'Hardy');assert.equal(battle.ability,'Solar Power');count++;
  assert.deepEqual(battle.moves.map(m=>m.name),['Growl','Tackle']);count++;
  assert.equal(data.user.username,'Fictional');assert.equal(data.mons[0].level,5);count++;
  await db.query("update public.catches set content_build='missing'");
  const missing=(await read()).mons[0].battleData;assert.equal(missing.nature,null);assert.equal(missing.ability,null);assert.equal(missing.moves[0].name,null);count++;
  await db.query("update public.catches set move_slots=null,moves=array['scratch']");assert.deepEqual((await read()).mons[0].battleData.moves,['scratch']);count++;
  await db.query("update public.catches set move_slots='[]'");assert.deepEqual((await read()).mons[0].battleData.moves,[]);count++;
  const acl=(await db.query("select has_function_privilege('anon','private.admin_catch_battle_json(public.catches)','execute') a,has_function_privilege('authenticated','private.admin_catch_battle_json(public.catches)','execute') b")).rows[0];assert.equal(acl.a,false);assert.equal(acl.b,false);count++;
  await db.query('grant usage on schema private to anon,authenticated');
  for(const role of ['anon','authenticated']){
   await db.query('set role '+role);
   await assert.rejects(()=>db.query('select private.admin_catch_battle_json(null::public.catches)'),e=>e.code==='42501');
   await db.query('reset role');count++;
  }
  await db.query("update public.catches set transferred_at=now()");assert.deepEqual((await read()).mons,[]);count++;
  await db.query('begin');await db.query(rollback);await db.query('commit');
  assert.equal((await db.query("select md5(pg_get_functiondef('private.admin_account_json(uuid)'::regprocedure)) hash")).rows[0].hash,before);count++;
  assert.equal((await db.query("select to_regprocedure('private.admin_catch_battle_json(public.catches)') fn")).rows[0].fn,null);count++;
  console.log(`${count} REAL LOCAL SQL checks passed; no hosted or protected-account reads/writes`);
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exit(1)});
