/* Actual heartbeat bodies; fictional profiles and XP/snapshot interfaces only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
async function main(){
  require('./a19-schema-rehearsal').refuseHosted();
  const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness');
  const dir=fs.mkdtempSync(path.join(cache,'heartbeat-clock-'));assert(dir.startsWith(cache+path.sep));
  const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
  const pg=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-only',port:55478,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
  let db,other;const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s);};
  const trainer='aaaaaaaa-0047-4047-8047-000000000001';
  try{
    await pg.initialise();await pg.start();db=pg.getPgClient('postgres','127.0.0.1');await db.connect();
    assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
    await db.query(`create schema private;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
      create table public.profiles(id uuid primary key,watch_seconds bigint,last_heartbeat_at timestamptz,last_seen_at timestamptz,updated_at timestamptz);
      create table public.stream_status(id int primary key,is_live boolean);
      create table private.fixture_xp(user_id uuid,amount int);
      create function private.award_xp(uuid,int) returns void language sql as $$insert into private.fixture_xp values($1,$2)$$;
      create function private.play_snapshot(uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
      insert into public.stream_status values(1,true);
      create role anon;create role authenticated;create role service_role;`);
    await db.query("select set_config('fixture.uid',$1,false)",[trainer]);
    async function setup(seconds=0,age=20){await db.query('delete from private.fixture_xp');await db.query('delete from public.profiles');await db.query("insert into public.profiles(id,watch_seconds,last_heartbeat_at) values($1,$2,case when $3::int is null then null else clock_timestamp()-make_interval(secs=>$3) end)",[trainer,seconds,age]);await db.query('update public.stream_status set is_live=true');}
    const value=async()=>Number((await db.query('select watch_seconds n from public.profiles where id=$1',[trainer])).rows[0].n);
    const xp=async()=>Number((await db.query('select coalesce(sum(amount),0) n from private.fixture_xp')).rows[0].n);
    const packet=name=>fs.readFileSync(path.join(root,'supabase/unapplied/heartbeat-clock',name),'utf8');
    await db.query(packet('BASELINE.sql'));await setup();
    await db.query('grant execute on function public.play_heartbeat(integer) to public,postgres,anon,authenticated,service_role');
    await db.query('do $$begin for i in 1..40 loop perform public.play_heartbeat(45);end loop;end$$');
    assert.equal(await value(),1800);assert.equal(await xp(),10);pass('Baseline defect:40 immediate requests create1800 watch seconds and10 XP in one transaction');
    await db.query(packet('INSTALL.sql'));await setup();
    pass('Guarded install accepts exact baseline source and permissions');
    await db.query('do $$begin for i in 1..40 loop perform public.play_heartbeat(45);end loop;end$$');
    assert.equal(await value(),20);assert.equal(await xp(),0);pass('Proposed body caps the identical burst at20 actual elapsed seconds');
    await setup(0,null);await db.query('select public.play_heartbeat(45)');assert.equal(await value(),0);pass('First heartbeat establishes time without inventing credit');
    await setup(170,20);await db.query('select public.play_heartbeat(20)');assert.equal(await value(),190);assert.equal(await xp(),1);pass('Ordinary20-second interval crosses existing180-second XP threshold once');
    await setup(0,3600);await db.query('select public.play_heartbeat(2147483647)');assert.equal(await value(),45);pass('Long absence and huge request retain existing45-second ceiling');
    await setup(0,20);await db.query('select public.play_heartbeat(-2)');assert.equal(await value(),0);await setup(0,20);await db.query('select public.play_heartbeat(null)');assert.equal(await value(),0);pass('Null/negative request never adds watch time');
    await setup(0,-30);await db.query('select public.play_heartbeat(45)');assert.equal(await value(),0);assert((await db.query('select last_heartbeat_at>clock_timestamp() future from public.profiles')).rows[0].future);pass('Future timestamp cannot earn credit or be rewound');
    await setup(0,20);await db.query('update public.stream_status set is_live=false');await db.query('select public.play_heartbeat(20)');assert.equal(await value(),0);assert.equal(await xp(),0);pass('Offline stream awards neither time nor XP');
    await setup();other=pg.getPgClient('postgres','127.0.0.1');await other.connect();await other.query("select set_config('fixture.uid',$1,false)",[trainer]);
    await db.query('begin');await db.query('select public.play_heartbeat(45)');
    const blocked=other.query('select public.play_heartbeat(45)');await db.query('commit');await blocked;
    assert.equal(await value(),20);pass('Concurrent tab serializes on trainer row and cannot duplicate elapsed credit');
    await db.query("select set_config('fixture.uid','',false)");await assert.rejects(db.query('select public.play_heartbeat(20)'),e=>e.code==='42501');pass('Signed-out request rejected before mutation');
    await db.query("select set_config('fixture.uid','bbbbbbbb-0047-4047-8047-000000000001',false)");await assert.rejects(db.query('select public.play_heartbeat(20)'),e=>e.code==='42501');pass('Missing trainer profile rejected');
    await assert.rejects(db.query(packet('INSTALL.sql')),/drift/);await db.query('rollback');pass('Repeated installation refuses changed source');
    await db.query(packet('ROLLBACK.sql'));
    assert.equal((await db.query("select md5(prosrc) h from pg_proc where oid='public.play_heartbeat(integer)'::regprocedure")).rows[0].h,'5bae000402269cfebe4b2f1ea3c53ba7');pass('Exact rollback restores original source without changing watch records');
    await db.query('revoke execute on function public.play_heartbeat(integer) from anon');
    await assert.rejects(db.query(packet('INSTALL.sql')),/drift/);await db.query('rollback');pass('Installation refuses ACL drift');
    fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/heartbeat-clock-local-result.json'),JSON.stringify({at:new Date().toISOString(),classification:'REAL LOCAL SQL: exact hosted baseline heartbeat and proposed function; fictional schema and XP/snapshot fixtures; no hosted mutation',checks},null,2)+'\n');
  }finally{if(other)await other.end();if(db)await db.end();await pg.stop();}
  console.log(checks.length+' REAL LOCAL SQL checks passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
