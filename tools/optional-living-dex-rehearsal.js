// Actual RPC bodies on loopback PostgreSQL; synthetic rows and counted reward stubs.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness'),directory=fs.mkdtempSync(path.join(cache,'last-copy-'));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:directory,user:'postgres',password:'fictional-only',port:55480,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let db;const checks=[];
 const pass=x=>{checks.push(x);console.log('PASS '+x);};const user='bbbbbbbb-0052-4052-8052-000000000001',mon='aaaaaaaa-0052-4052-8052-000000000001';
 const folder=path.join(root,'supabase/unapplied/optional-living-dex');const file=x=>fs.readFileSync(path.join(folder,x),'utf8');
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
  await db.query(`create schema private;create schema auth;create role anon;create role authenticated;create role service_role;
   create table public.catches(id uuid primary key,user_id uuid,dex int,name text,nickname text,variant text,favorite bool default false,locked bool default false,is_alpha bool default false,transferred_at timestamptz);
   create table public.profiles(id uuid,team_ids uuid[]);create table public.species(dex int,name text,family_id int,family_candy_species_id int,evo_stage int);
   create table public.evolution_families(id int,name text,base_dex int);create table public.trade_listings(catch_id uuid,status text);
   create table public.oak_transfers(user_id uuid,dex int,catch_id uuid,candy_key text);create table public.trainer_stats(user_id uuid,released int,updated_at timestamptz);
   create table private.fixture_rewards(amount int,type text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
   create function private.family_has_enabled_evo(int) returns bool language sql as $$select true$$;
   create function private.grant_family_candy(uuid,int,int,text,text,jsonb) returns void language sql as $$insert into private.fixture_rewards values($3,$4)$$;
   create function private.pull_from_team(uuid,uuid) returns void language plpgsql as $$begin return;end$$;
   create function public.play_storage() returns jsonb language sql as $$select '{}'::jsonb$$;
   insert into public.species values(11,'Metapod',10,10,2);insert into public.evolution_families values(10,'Caterpie',10);
   insert into public.profiles values('${user}','{}');insert into public.trainer_stats values('${user}',0,now());
   select set_config('fixture.uid','${user}',false);`);
  await db.query(file('BASELINE.sql'));
  for(const f of ['play_transfer_oak(uuid)','play_release(uuid,text)'])await db.query('grant execute on function public.'+f+' to public,anon,authenticated,service_role');
  const reset=async()=>db.query(`truncate public.catches,public.trade_listings,public.oak_transfers,private.fixture_rewards;update public.profiles set team_ids='{}';insert into public.catches(id,user_id,dex,name,variant) values('${mon}','${user}',11,'Metapod','normal');select set_config('fixture.uid','${user}',false);`);
  const oak=()=>db.query('select public.play_transfer_oak($1)',[mon]);const release=(confirm='')=>db.query('select public.play_release($1,$2)',[mon,confirm]);
  await reset();await assert.rejects(oak,/only currently owned/);await assert.rejects(release,/only currently owned/);pass('Actual old Oak and release bodies block the sole specimen');
  await db.query(file('INSTALL.sql'));pass('Guarded two-function install preserves ACL and attributes');
  await oak();assert.equal((await db.query('select sum(amount) n from private.fixture_rewards')).rows[0].n,'2');assert((await db.query('select transferred_at from public.catches')).rows[0].transferred_at);assert.equal((await db.query('select count(*) n from public.oak_transfers')).rows[0].n,'1');pass('Sole specimen transfers once with existing two-candy reward and history');
  await assert.rejects(oak,/not in your storage/);assert.equal((await db.query('select count(*) n from private.fixture_rewards')).rows[0].n,'1');pass('Repeated Oak request cannot award twice');
  await reset();await release();assert.equal((await db.query('select sum(amount) n from private.fixture_rewards')).rows[0].n,'2');await assert.rejects(release,/not in your collection/);pass('Sole specimen releases once with unchanged reward; repeat denied');
  for(const flag of ['locked','favorite']){await reset();await db.query('update public.catches set '+flag+'=true');await assert.rejects(oak,/Favorite or locked/);await assert.rejects(release,/Favorite or locked/);assert.equal((await db.query('select count(*) n from private.fixture_rewards')).rows[0].n,'0');pass(flag+' still blocks both operations before rewards');}
  await reset();await db.query("insert into public.trade_listings values($1,'open')",[mon]);await assert.rejects(oak,/trade board/);await assert.rejects(release,/trade listing/);pass('Open trade listing still blocks both operations');
  await reset();await db.query('update public.profiles set team_ids=array[$1::uuid]',[mon]);await assert.rejects(oak,/off your team/);pass('Oak team protection retained');
  await reset();await db.query("update public.catches set variant='shiny'");await assert.rejects(release,/SHINY/);await release('SHINY');pass('Shiny release confirmation is still required and accepted');
  await reset();await db.query("select set_config('fixture.uid','',false)");await assert.rejects(oak,/Sign in/);await assert.rejects(release,/Sign in/);pass('Unauthenticated caller denied');
  await reset();await db.query("select set_config('fixture.uid','cccccccc-0052-4052-8052-000000000001',false)");await assert.rejects(oak,/not in your storage/);await assert.rejects(release,/not in your collection/);pass('Wrong owner denied');
  await db.query(file('ROLLBACK.sql'));await reset();await assert.rejects(oak,/only currently owned/);pass('Guarded rollback restores last-copy policy');
  await db.query('revoke execute on function public.play_transfer_oak(uuid) from public');await assert.rejects(()=>db.query(file('INSTALL.sql')),/privilege drift/);await db.query('rollback');pass('Install refuses ACL drift');
  fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/optional-living-dex-local.json'),JSON.stringify({classification:'REAL LOCAL SQL: actual old/new RPC bodies; fictional rows; counted reward/team/snapshot interfaces',checks,limitations:'Hosted gameplay mutation not performed; full live triggers and real reward helper internals are not exercised here.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exit(1)});
