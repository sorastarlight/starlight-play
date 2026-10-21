/* Actual wrapper bodies, fictional tables/dependencies; disposable loopback PostgreSQL only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness');
 const dir=fs.mkdtempSync(path.join(cache,'launch-security-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-local-only',port:55469,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let db;const results=[];const pass=name=>{results.push(name);console.log('PASS '+name);};
 try{
 await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();
 assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
 await db.query(`create schema private;create schema auth;create role anon nologin;create role authenticated nologin;create role service_role nologin;
 create sequence public.fixture_settles minvalue 0 start 0;create table public.fixture_calls(name text);create table public.profiles(id uuid,twitch_login text,starlight_pass bool,pass_source text,pass_checked_at timestamptz,updated_at timestamptz);
 create table public.catches(id uuid);create table public.species(dex int);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
 create function private.play_staff_role(uuid default auth.uid()) returns text language sql stable as $$select case when auth.uid() is not null then nullif(current_setting('fixture.role',true),'') end$$;
 create function private.settle_due_rounds() returns void language plpgsql as $$begin perform nextval('public.fixture_settles');insert into public.fixture_calls values('settle');end$$;
 create function private.admin_overview() returns jsonb language plpgsql as $$begin perform private.require_hub();return '{"overview":true}'::jsonb;end$$;
 create function private.play_console_json(int) returns jsonb language sql as $$select '[]'::jsonb$$;
 create function private.store_catalog() returns jsonb language sql as $$select '{"bits":[{"sku":"fixture","name":"Fictional pack","grants":{"coins":1}}]}'::jsonb$$;
 create function private.grant_known(uuid,jsonb) returns void language sql as $$insert into public.fixture_calls values('grant')$$;
 insert into public.profiles(id,twitch_login,starlight_pass)values('aaaaaaaa-0000-4000-8000-000000000001','fictional',false);`);
 const rows=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/launch-security-catalog-20261020.json')));
 const defs=JSON.parse(fs.readFileSync(path.join(root,'supabase/unapplied/launch-security/changes.json')));
 for(const name of ['is_play_admin','require_hub','require_staff_edit'])await db.query(rows.find(r=>r.schema==='private'&&r.proname===name).definition);
 for(const d of defs)await db.query(d.before);
 // Only disposable reproduction of the original authorization-order defect.
 await db.query('begin');await assert.rejects(()=>db.query('select public.admin_overview()'),e=>e.code==='42501');await db.query('rollback');assert.equal((await db.query('select is_called from fixture_settles')).rows[0].is_called,true);pass('Original unauthorized overview reached settlement before rejection (nontransactional fixture counter)');
 for(const d of defs)await db.query(d.after);
 const calls=[['admin_overview','select public.admin_overview()'],['admin_set_pass',"select public.admin_set_pass('fictional',true)"],['admin_grant_bits_pack',"select public.admin_grant_bits_pack('fictional','fixture')"],['admin_oak_qa',"select public.admin_oak_qa('GRANT_MON',null,'{}')"],['admin_qa_grant_pass_reward',"select public.admin_qa_grant_pass_reward('invalid')"]];
 for(const role of ['', 'player','moderator','admin','owner']){
  await db.query("select set_config('fixture.uid',$1,false),set_config('fixture.role',$2,false)",[role?'aaaaaaaa-0000-4000-8000-000000000002':'',role==='player'?'':role]);
  for(const [name,call]of calls){
   const allowed=name==='admin_overview'?['moderator','admin','owner'].includes(role):['admin','owner'].includes(role);
   await db.query('truncate fixture_calls');const settles=(await db.query('select last_value from fixture_settles')).rows[0].last_value;await db.query('set role authenticated');
   try{if(!allowed)await assert.rejects(()=>db.query(call),/not allowed|Only admins/);
    else if(name==='admin_oak_qa')await assert.rejects(()=>db.query(call),/Pick a target Trainer/);
    else if(name==='admin_qa_grant_pass_reward')await assert.rejects(()=>db.query(call),/Unknown Pass QA reward kind/);
    else await db.query(call);
   }finally{await db.query('reset role');}
   if(!allowed){assert.equal((await db.query('select count(*)::int n from fixture_calls')).rows[0].n,0);assert.equal((await db.query('select last_value from fixture_settles')).rows[0].last_value,settles);}
   if(allowed&&name==='admin_overview')assert.equal((await db.query("select count(*)::int n from fixture_calls where name='settle'")).rows[0].n,1);
   pass(`${role||'signed-out'} ${name}: ${allowed?'authorized path':'denied before side effects'}`);
  }
 }
 // Exercise each actual revoke signature using a harmless stand-in of the same identity.
 const exposed=rows.filter(r=>r.schema==='public'&&r.proname.startsWith('admin_')&&r.anon_execute);
 await db.query('revoke execute on function public.admin_oak_qa(text,uuid,jsonb) from public,anon');
 await db.query('begin');
 for(const r of exposed){
  const d=defs.find(d=>d.signature===r.identity);
  if(!d)await db.query(`create function public.${r.proname}(${r.args}) returns jsonb language sql as $$select '{}'::jsonb$$`);
  await db.query(`grant execute on function public.${r.proname}(${r.args}) to public,anon,authenticated`);
 }
 const packet=fs.readFileSync(path.join(root,'supabase/unapplied/launch-security/INSTALL.sql'),'utf8');
 const revokes=packet.split('\n').filter(l=>l.startsWith('revoke execute on function '));assert.equal(revokes.length,84);
 for(const sql of revokes)await db.query(sql);
 assert.equal((await db.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and left(p.proname,6)='admin_' and has_function_privilege('anon',p.oid,'execute')")).rows[0].n,0);pass('All 84 exact revoke signatures remove PUBLIC and anon access');
 for(const r of exposed)assert((await db.query('select has_function_privilege(\'authenticated\', $1,\'execute\') ok',[r.identity])).rows[0].ok);pass('Authenticated execute retained on all 84 ACL targets');
 await db.query('savepoint deny_check');await db.query('set local role anon');await assert.rejects(()=>db.query('select public.admin_overview()'),e=>e.code==='42501');await db.query('rollback to savepoint deny_check');await db.query('reset role');pass('Anonymous overview rejected at ACL');
 await db.query('rollback');
 for(const d of defs){await db.query(d.before);const r=rows.find(r=>d.signature===r.identity);assert.equal((await db.query('select md5(prosrc) hash from pg_proc where oid=$1::regprocedure',[d.signature])).rows[0].hash,r.body_md5);}pass('All five original wrapper bodies restore exactly');
 const retired=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/launch-retired-selftest-catalog.json')));await db.query(retired.definition);await db.query('grant execute on function public.phase5_identity_selftest() to anon,authenticated,service_role');
 await db.query(fs.readFileSync(path.join(root,'supabase/unapplied/launch-security/RETIRE-SELFTEST.sql'),'utf8'));
 for(const role of ['anon','authenticated']){await db.query('set role '+role);await assert.rejects(()=>db.query('select public.phase5_identity_selftest()'),e=>e.code==='42501');await db.query('reset role');pass('Retired frame selftest denied to '+role+' without executing its body');}
 assert((await db.query("select has_function_privilege('service_role','public.phase5_identity_selftest()','execute') ok")).rows[0].ok);pass('Retired selftest service permission preserved');
 fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/launch-security-local-result.json'),JSON.stringify({at:new Date().toISOString(),classification:'REAL LOCAL SQL; dependency stubs and fictional records',checks:results.length,results,limitations:'Full hosted economy, role resolution and business dependencies not exercised. No production RPC called.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
 console.log(results.length+' REAL LOCAL SQL checks passed');
}
main().catch(e=>{console.error(e);process.exit(1)});
