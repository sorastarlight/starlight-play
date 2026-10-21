// Exact current/proposed RPC bodies, fictional trainers, local reward interface stubs.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness'),dir=fs.mkdtempSync(path.join(cache,'direct-trade-'));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-only',port:55481,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let db;const checks=[],pass=x=>{checks.push(x);console.log('PASS '+x);};
 const folder=path.join(root,'supabase/unapplied/direct-trade-validation'),file=x=>fs.readFileSync(path.join(folder,x),'utf8');
 const A='aaaaaaaa-0053-4053-8053-000000000001',B='bbbbbbbb-0053-4053-8053-000000000001',C='cccccccc-0053-4053-8053-000000000001',X='aaaaaaaa-0053-4053-8053-000000000002',Y='bbbbbbbb-0053-4053-8053-000000000002';
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
  await db.query(`create schema auth;create schema private;create role anon;create role authenticated;create role service_role;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
  create table public.profiles(id uuid primary key,twitch_login text);insert into public.profiles values('${A}','fictional-a'),('${B}','fictional-b'),('${C}','fictional-c');
  create table public.catches(id uuid primary key,user_id uuid,dex int,transferred_at timestamptz,locked bool default false,favorite bool default false,trade_locked_until timestamptz);
  create table public.species(dex int primary key,tradable bool);insert into public.species values(10,true),(11,true);
  create table public.direct_trades(id uuid primary key default gen_random_uuid(),a_user uuid,b_user uuid,a_catch uuid,b_catch uuid,status text,expires_at timestamptz,a_confirmed bool default false,b_confirmed bool default false,completed_at timestamptz);
  create table public.trainer_stats(user_id uuid,trades_done int default 0,traded_away int default 0,traded_in int default 0,updated_at timestamptz);insert into public.trainer_stats(user_id) values('${A}'),('${B}');
  create table private.fixture_effects(kind text,trainer uuid);
  create function private.pull_from_team(uuid,uuid) returns void language plpgsql as $$begin return;end$$;
  create function private.mark_trade_receive(uuid,uuid,uuid) returns void language sql as $$update public.catches set trade_locked_until=now()+interval '5 minutes' where id=$2$$;
  create function private.trade_xp(uuid,text) returns void language sql as $$insert into private.fixture_effects values('xp',$1)$$;
  create function private.evaluate_achievements(uuid,bool) returns void language plpgsql as $$begin return;end$$;`);
  await db.query(file('BASELINE.sql'));for(const name of ['play_direct_trade_create(text,uuid)','play_direct_trade_set(uuid,uuid)','play_direct_trade_confirm(uuid)'])await db.query('grant execute on function public.'+name+' to public,anon,authenticated,service_role');
  const user=uid=>db.query("select set_config('fixture.uid',$1,false)",[uid||'']);
  const reset=async()=>{await db.query(`truncate public.catches,public.direct_trades,private.fixture_effects;update public.species set tradable=true;update public.trainer_stats set trades_done=0,traded_away=0,traded_in=0;insert into public.catches(id,user_id,dex) values('${X}','${A}',10),('${Y}','${B}',11);`);await user(A);};
  const create=async()=>(await db.query("select public.play_direct_trade_create('fictional-b',$1) r",[X])).rows[0].r.tradeId;
  const offer=id=>db.query('select public.play_direct_trade_set($1,$2)',[id,Y]);const confirm=id=>db.query('select public.play_direct_trade_confirm($1)',[id]);
  const negotiate=async()=>{const id=await create();await user(B);await offer(id);await user(A);return id;};
  const finish=async id=>{await user(A);await confirm(id);await user(B);await confirm(id);};
  await reset();await db.query("update public.catches set trade_locked_until=now()+interval '5 minutes'");let id=await negotiate();await finish(id);assert.equal((await db.query('select user_id from public.catches where id=$1',[X])).rows[0].user_id,B);pass('Baseline direct trade bypasses future five-minute cooldown and swaps specimens');
  await reset();id=await negotiate();await db.query('update public.species set tradable=false where dex=10');await finish(id);pass('Baseline final confirmation permits species disabled after offer');
  await db.query(file('INSTALL.sql'));pass('Guarded three-function replacement installs with unchanged privileges');
  await reset();await db.query("update public.catches set trade_locked_until=now()+interval '5 minutes' where id=$1",[X]);await assert.rejects(create,/just received/);pass('Request creation denies cooldown specimen');
  await reset();id=await create();await user(B);await db.query("update public.catches set trade_locked_until=now()+interval '5 minutes' where id=$1",[Y]);await assert.rejects(()=>offer(id),/just received/);pass('Offer replacement denies cooldown specimen');
  for(const target of [X,Y]){await reset();id=await negotiate();await db.query("update public.catches set trade_locked_until=now()+interval '5 minutes' where id=$1",[target]);await user(A);await confirm(id);await user(B);await assert.rejects(()=>confirm(id),/just received/);assert.equal((await db.query('select user_id from public.catches where id=$1',[X])).rows[0].user_id,A);assert.equal((await db.query('select count(*) n from private.fixture_effects')).rows[0].n,'0');pass('Final confirmation rechecks cooldown on '+(target===X?'requester':'partner')+' without swap or rewards');}
  await reset();id=await negotiate();await db.query('update public.species set tradable=false where dex=10');await user(A);await confirm(id);await user(B);await assert.rejects(()=>confirm(id),/cannot be traded/);pass('Final confirmation rechecks current species tradability');
  await reset();id=await negotiate();await db.query("update public.catches set trade_locked_until=now()-interval '1 second'");await finish(id);assert.equal((await db.query('select status from public.direct_trades')).rows[0].status,'COMPLETED');assert.equal((await db.query('select count(*) n from private.fixture_effects')).rows[0].n,'2');pass('Expired cooldown and sole-copy trades still succeed with one reward per participant');
  await assert.rejects(()=>confirm(id),/no longer open/);assert.equal((await db.query('select count(*) n from private.fixture_effects')).rows[0].n,'2');pass('Completed-trade replay remains denied without repeat rewards');
  for(const flag of ['locked','favorite']){await reset();id=await negotiate();await db.query('update public.catches set '+flag+'=true where id=$1',[X]);await user(A);await confirm(id);await user(B);await assert.rejects(()=>confirm(id),/no longer available/);pass('Existing '+flag+' protection survives final confirmation');}
  await reset();id=await negotiate();await user(C);await assert.rejects(()=>confirm(id),/not yours/);await assert.rejects(()=>offer(id),/not yours/);pass('Third party cannot alter or confirm another trade');
  await user(null);await assert.rejects(create,/Sign in/);await assert.rejects(()=>confirm(id),/Sign in/);pass('Unauthenticated callers denied');
  await db.query(file('ROLLBACK.sql'));await reset();await db.query("update public.catches set trade_locked_until=now()+interval '5 minutes'");await create();pass('Guarded rollback restores original cooldown-bypass behavior');
  await db.query('revoke execute on function public.play_direct_trade_confirm(uuid) from anon');await assert.rejects(()=>db.query(file('INSTALL.sql')),/privilege drift/);await db.query('rollback');pass('Unexpected ACL drift refuses installation');
  fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/direct-trade-validation-local.json'),JSON.stringify({classification:'REAL LOCAL SQL, exact hosted RPC bodies, fictional trainers; counted reward and receive stubs',checks,limitations:'No hosted trading, full RLS/JWT/trigger/economy pipeline, provider or natural concurrency workload exercised.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exit(1)});
