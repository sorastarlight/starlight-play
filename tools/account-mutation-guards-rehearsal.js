// Exact captured account/nickname bodies and serial helper; fictional LOCAL data only.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/account-mutation-guards');
 const base=JSON.parse(fs.readFileSync(path.join(folder,'baseline.json'))),serial=JSON.parse(fs.readFileSync(path.join(folder,'serial-dependency.json')));
 const targets=base.filter(x=>!x.signature.startsWith('private.'));
 const fixed=targets.map(x=>({...x,definition:x.signature.startsWith('play_set_nickname')
  ?x.definition.replace('user_id = uid and transferred_at is null;','user_id = uid and transferred_at is null for update;')
  :x.definition.replace("end if; if kind <> ''", "end if; perform private.twitch_link_serial(uid); if kind <> ''").replace('if p_login_enabled is false and not private.profile_has_password(uid)',"if (p_login_enabled is false or (p_login_enabled is null and kind in ('bot', 'utility'))) and not private.profile_has_password(uid)")}));
 for(let i=0;i<targets.length;i++)assert.notEqual(targets[i].definition,fixed[i].definition);
 const body=s=>s.split('AS $function$')[1].split('$function$')[0],md5=s=>crypto.createHash('md5').update(s).digest('hex'),lit=s=>"'"+s.replaceAll("'","''")+"'";
 const guard=items=>'DO $guard$ BEGIN\n'+items.map(x=>{
  const sig=x.signature.startsWith('private.')?x.signature:'public.'+x.signature;
  return `IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=${lit(sig)}::regprocedure AND md5(prosrc)=${lit(md5(body(x.definition)))} AND ${x.acl===null?'proacl is null':'proacl::text='+lit(x.acl)} AND ${x.proconfig===null?'proconfig is null':'proconfig=ARRAY['+x.proconfig.map(lit).join(',')+']'} AND prosecdef=${x.security_definer} AND provolatile=${lit(x.volatility)} AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Account mutation source or privilege drift'; END IF;`;
 }).join('\n')+'\nEND $guard$;\n';
 const dependencies=[...base.filter(x=>x.signature.startsWith('private.')),serial];
 const packet=(from,to)=>'BEGIN;\n'+guard([...from,...dependencies])+to.map(x=>x.definition+';').join('\n')+'\nCOMMIT;\n';
 const install=packet(targets,fixed),rollback=packet(fixed,targets);
 fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);
 const cache=path.join(__dirname,'.cache/d54-pg-harness'),Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:fs.mkdtempSync(path.join(cache,'account-guards-')),user:'postgres',password:'fictional-only',port:55485,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 const A='aaaaaaaa-0060-4060-8060-000000000001',B='bbbbbbbb-0060-4060-8060-000000000001',X='aaaaaaaa-0060-4060-8060-000000000002';
 let db,c1,c2;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
  await db.query(`create schema auth;create schema private;create role anon;create role authenticated;create role service_role;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
   create table auth.users(id uuid primary key,email text,encrypted_password text);
   insert into auth.users values('${A}',null,null),('${B}',null,null);
   create table profiles(id uuid primary key);insert into profiles values('${A}'),('${B}');
   create table twitch_connections(id uuid primary key default gen_random_uuid(),user_id uuid,twitch_user_id text,confirmed bool default true,login_enabled bool default true,gameplay_enabled bool default true,connection_type text default 'player',updated_at timestamptz);
   create table private.twitch_link_mutex(key text primary key,revision bigint not null default 0);
   create table private.fixture_audit(action text,actor uuid,identity text,payload jsonb);
   create function private.account_audit_write(text,uuid,text,jsonb) returns void language sql as $$insert into private.fixture_audit values($1,$2,$3,$4)$$;
   create function public.play_account_state() returns jsonb language sql as $$select '{}'::jsonb$$;
   create function public.play_storage() returns jsonb language sql as $$select '{}'::jsonb$$;
   create table catches(id uuid primary key,user_id uuid,transferred_at timestamptz,nickname text);`);
  for(const x of [...base,serial])await db.query(x.definition);
  await db.query('revoke all on function private.twitch_link_serial(uuid,text) from public,anon,authenticated,service_role');
  for(const x of targets)await db.query('grant execute on function public.'+x.signature+' to public,anon,authenticated,service_role');
  c1=cluster.getPgClient('postgres','127.0.0.1');c2=cluster.getPgClient('postgres','127.0.0.1');await c1.connect();await c2.connect();
  const user=(client,id)=>client.query("select set_config('fixture.uid',$1,false)",[id||'']);
  const flags=(client,id,login=null,kind=null)=>client.query('select public.play_set_twitch_flags($1,null,$2,$3)',[id,login,kind]);
  const nick=(client,name)=>client.query('select public.play_set_nickname($1,$2)',[X,name]);
  const methods=async()=>(await db.query('select private.twitch_login_methods($1) n',[A])).rows[0].n;
  const reset=async(two=false,password=false)=>{
   await c1.query('rollback');await c2.query('rollback');
   await db.query(`truncate twitch_connections,private.twitch_link_mutex,private.fixture_audit,catches;update auth.users set email=null,encrypted_password=null;insert into twitch_connections(user_id,twitch_user_id) values('${A}','first');insert into catches values('${X}','${A}',null,'Before')`);
   if(two)await db.query('insert into twitch_connections(user_id,twitch_user_id) values($1,$2)',[A,'second']);
   if(password)await db.query("update auth.users set email='fictional@example.invalid',encrypted_password='fictional-fixture-only' where id=$1",[A]);
   await user(db,A);await user(c1,A);await user(c2,A);
  };
  const waitForLock=async client=>{const pid=(await client.query('select pg_backend_pid() pid')).rows[0].pid;return pid;};
  const pid2=await waitForLock(c2);
  const blocked=async()=>{for(let i=0;i<100;i++){const row=(await db.query('select wait_event_type from pg_stat_activity where pid=$1',[pid2])).rows[0];if(row?.wait_event_type==='Lock')return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Expected local concurrent operation to block');};
  const settled=promise=>promise.then(value=>({ok:true,value}),error=>({ok:false,error}));
  for(const kind of ['bot','utility']){await reset();await flags(db,'first',null,kind);assert.equal(await methods(),0);pass('Baseline implicit '+kind+' conversion disables sole login');}
  await reset(true);await c1.query('begin');await c2.query('begin');await flags(c1,'first',false);await flags(c2,'second',false);await c1.query('commit');await c2.query('commit');assert.equal(await methods(),0);pass('Baseline concurrent flag updates can disable both remaining logins');
  await reset();await c1.query('begin');await c1.query('update catches set user_id=$1 where id=$2',[B,X]);await c2.query('begin');let pending=settled(nick(c2,'OldOwner'));await blocked();await c1.query('commit');assert.equal((await pending).ok,true);await c2.query('commit');assert.equal((await db.query('select nickname from catches where id=$1',[X])).rows[0].nickname,'OldOwner');pass('Baseline former owner can rename after concurrent ownership transfer commits');
  await db.query(install);pass('Guarded two-function correction installs with original helper dependencies');
  for(const kind of ['bot','utility']){await reset();await assert.rejects(flags(db,'first',null,kind),/Add an email login/);assert.equal(await methods(),1);pass('Implicit '+kind+' conversion cannot disable sole login');}
  await reset();await assert.rejects(flags(db,'first',false),/Add an email login/);pass('Existing explicit last-login protection retained');
  for(const isolation of ['read committed','repeatable read']){
   await reset(true);await c1.query('begin isolation level '+isolation);await c2.query('begin isolation level '+isolation);await c2.query('select count(*) from twitch_connections');await flags(c1,'first',false);pending=settled(flags(c2,'second',false));await blocked();await c1.query('commit');const result=await pending;assert.equal(result.ok,false);assert.match(result.error.message,isolation==='read committed'?/Add an email login/:/could not serialize/);await c2.query('rollback');assert.equal(await methods(),1);pass('Concurrent flag changes preserve one login under '+isolation);
  }
  await reset(true);await flags(db,'first',null,'bot');assert.equal(await methods(),1);pass('Bot conversion with another login remains available');
  await reset(false,true);await flags(db,'first',null,'utility');assert.equal(await methods(),0);pass('Existing password-account fallback still permits utility conversion');
  await reset();await flags(db,'first',true,'bot');assert.equal(await methods(),1);pass('Explicit retained login flag preserves existing behavior');
  await reset();await user(db,B);await assert.rejects(flags(db,'first',false),/not linked/);await user(db,null);await assert.rejects(flags(db,'first',false),/Sign in first/);pass('Foreign identity and anonymous mutation denied');
  await reset();await nick(db,'  New Name  ');assert.equal((await db.query('select nickname from catches')).rows[0].nickname,'New Name');await nick(db,'');assert.equal((await db.query('select nickname from catches')).rows[0].nickname,null);pass('Owned nickname trim/save/clear preserved');
  await assert.rejects(nick(db,'1234567890123'),/12 characters/);await assert.rejects(nick(db,'<bad>'),/Nicknames can use/);await user(db,null);await assert.rejects(nick(db,'Name'),/Sign in first/);pass('Nickname validation and anonymous denial preserved');
  await reset();await c1.query('begin');await c1.query('update catches set user_id=$1 where id=$2',[B,X]);await c2.query('begin');pending=settled(nick(c2,'OldOwner'));await blocked();await c1.query('commit');const transferred=await pending;assert.equal(transferred.ok,false);assert.match(transferred.error.message,/not in your storage/);await c2.query('rollback');assert.equal((await db.query('select nickname from catches')).rows[0].nickname,'Before');pass('Former-owner nickname race rejected after transfer lock wait');
  await reset();await c1.query('begin');await c1.query('update catches set transferred_at=now() where id=$1',[X]);await c2.query('begin');pending=settled(nick(c2,'Released'));await blocked();await c1.query('commit');const released=await pending;assert.equal(released.ok,false);await c2.query('rollback');assert.equal((await db.query('select nickname from catches')).rows[0].nickname,'Before');pass('Nickname race rejected after release lock wait');
  await db.query(rollback);for(const x of targets)assert.equal((await db.query('select md5(prosrc) h from pg_proc where oid=$1::regprocedure',['public.'+x.signature])).rows[0].h,x.source_md5);pass('Rollback restores exact two original sources');
  await db.query('alter function private.twitch_link_serial(uuid,text) set search_path=public');await assert.rejects(db.query(install),/privilege drift/);await db.query('rollback');pass('Install refuses serialization-helper configuration drift');
  fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/account-mutation-guards-local.json'),JSON.stringify({classification:'REAL LOCAL SQL with simultaneous transactions;exact captured mutation/helper bodies;fictional auth rows/account response/audit/storage wrappers',checks,functions:fixed.map(x=>({signature:x.signature,sourceMd5:md5(body(x.definition))})),limitations:'No hosted identity/nickname mutation,OAuth exchange,email delivery,real JWT/RLS integration or broad concurrency workload.'},null,2)+'\n');
 }finally{if(c1){await c1.query('rollback').catch(()=>{});await c1.end();}if(c2){await c2.query('rollback').catch(()=>{});await c2.end();}if(db)await db.end();await cluster.stop();}
}
main().catch(error=>{console.error(error);process.exit(1);});
