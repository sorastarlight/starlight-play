// Exact captured guard/role/caller bodies, fictional local database only. Never issues a live token.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('url');
const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),folder=path.join(root,'supabase/unapplied/owner-guard-null');
 const base=JSON.parse(fs.readFileSync(path.join(folder,'baseline.json'))),target=base.find(x=>x.signature==='private.require_owner()');
 const fixed={...target,definition:target.definition.replace('if not private.can_manage_secrets() then','if private.can_manage_secrets() is not true then')};
 assert.notEqual(fixed.definition,target.definition);
 const lit=s=>"'"+s.replaceAll("'","''")+"'",sig=x=>x.schema==='public'?'public.'+x.signature:x.signature;
 const source=x=>x.definition.split('AS $function$')[1].split('$function$')[0];
 const crypto=require('crypto'),md5=s=>crypto.createHash('md5').update(s).digest('hex');fixed.hash=md5(source(fixed));
 const guard=rows=>`DO $guard$ BEGIN\n${rows.map(x=>`IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=${lit(sig(x))}::regprocedure AND md5(prosrc)=${lit(x.hash)} AND ${x.acl===null?'proacl is null':'proacl::text='+lit(x.acl)} AND ${x.proconfig===null?'proconfig is null':'proconfig=ARRAY['+x.proconfig.map(lit).join(',')+']'} AND pg_get_userbyid(proowner)=${lit(x.owner)} AND prosecdef=${x.prosecdef} AND provolatile=${lit(x.provolatile)}) THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;`).join('\n')}\nEND $guard$;\n`;
 const after=base.map(x=>x===target?fixed:x),install='BEGIN;\n'+guard(base)+fixed.definition+';\nCOMMIT;\n',rollback='BEGIN;\n'+guard(after)+target.definition+';\nCOMMIT;\n';
 fs.writeFileSync(path.join(folder,'INSTALL.sql'),install);fs.writeFileSync(path.join(folder,'ROLLBACK.sql'),rollback);
 const cache=path.join(__dirname,'.cache/d54-pg-harness'),Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:fs.mkdtempSync(path.join(cache,'owner-null-')),user:'postgres',password:'fictional-only',port:55486,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let db;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
 const uid='aaaaaaaa-0067-4067-8067-000000000001';
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
  await db.query(`create schema private;create schema auth;create schema extensions;create role anon;create role authenticated;create role service_role;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
   create table public.site_config(id int primary key,broadcaster_twitch_login text,twitch_broadcaster_id text,twitch_client_id text,updated_at timestamptz);
   insert into site_config values(1,'fictional-broadcaster','fictional-broadcaster-id',null,now());
   create table public.twitch_connections(user_id uuid,confirmed boolean,twitch_user_id text,twitch_login text);
   create table auth.identities(user_id uuid,provider text,identity_data jsonb,provider_id text);
   create table public.staff_roles(user_id uuid primary key,role text);
   create table private.stream_bridge(id int primary key,token_hash text,last_error text,github_token text,twitch_client_secret text);
   insert into private.stream_bridge(id)values(1);
   create function extensions.gen_random_bytes(int) returns bytea language sql as $$select decode(repeat('ab',$1),'hex')$$;
   create function private.token_hash(text) returns text language sql as $$select md5($1)$$;
   create function private.play_snapshot(uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
   create sequence private.fixture_writes minvalue 0 start 0;
   create function private.count_fixture_writes() returns trigger language plpgsql as $$begin perform nextval('private.fixture_writes');return new;end;$$;
   create trigger count_bridge before insert or update on private.stream_bridge for each row execute function private.count_fixture_writes();
   create trigger count_channel before update on site_config for each row execute function private.count_fixture_writes();`);
  for(const x of [...base].sort((a,b)=>Number(!a.signature.startsWith('private.play_staff_role('))-Number(!b.signature.startsWith('private.play_staff_role('))))await db.query(x.definition);
  for(const x of base.filter(x=>x.schema==='public'))await db.query('revoke all on function '+sig(x)+' from public;grant execute on function '+sig(x)+' to authenticated,service_role');
  const calls=["select public.admin_issue_bridge_token()","select public.admin_save_channel('fictional-channel','fictional-client','fictional-id')","select public.admin_save_github_token('fictional-only')","select public.admin_save_twitch_client_secret('fictional-only')"];
  const identity=async(role,pgRole='authenticated',withUid=true)=>{await db.query('reset role');await db.query('delete from staff_roles');if(role)await db.query('insert into staff_roles values($1,$2)',[uid,role]);await db.query("select set_config('fixture.uid',$1,false)",[withUid?uid:'']);await db.query('set role '+pgRole);};
  const writes=async()=>{await db.query('reset role');return(await db.query('select last_value,is_called from private.fixture_writes')).rows[0];};
  await identity(null);await db.query('reset role');assert.equal((await db.query('select private.can_manage_secrets() allowed')).rows[0].allowed,null);await db.query('set role authenticated');for(const sql of calls)await db.query(sql);assert.equal((await writes()).last_value,'4');pass('Baseline ordinary authenticated trainer bypasses all four owner-only wrappers in fictional data');
  await db.query('insert into twitch_connections values($1,true,$2,$3)',[uid,'fictional-id','fictional-channel']);assert.equal((await db.query('select private.play_staff_role($1) role',[uid])).rows[0].role,'owner');await db.query('delete from twitch_connections');pass('Baseline channel write can promote a matching confirmed Twitch identity to owner without a staff assignment');
  await db.query(install);assert.equal((await db.query("select md5(prosrc) h from pg_proc where oid='private.require_owner()'::regprocedure")).rows[0].h,fixed.hash);pass('Guarded single-function install matches strict boolean source');
  for(const role of [null,'moderator','admin','staff']){
   const before=await writes();await identity(role);for(const sql of calls)await assert.rejects(db.query(sql),e=>e.code==='42501');assert.deepEqual(await writes(),before);pass('All four secret/channel writes denied before side effects for '+(role||'unassigned trainer'));
  }
  const before=await writes();await identity(null,'service_role',false);for(const sql of calls)await assert.rejects(db.query(sql),e=>e.code==='42501');assert.deepEqual(await writes(),before);pass('No-subject service context cannot pass owner guard');
  await identity(null,'anon',false);for(const sql of calls)await assert.rejects(db.query(sql),e=>e.code==='42501');await db.query('reset role');pass('Existing anonymous EXECUTE denial remains intact');
  await identity('owner');for(const sql of calls)await db.query(sql);await db.query('reset role');pass('Assigned owner retains all four permitted operations');
  await db.query('delete from staff_roles');await db.query('insert into twitch_connections values($1,true,$2,$3)',[uid,'fictional-id','fictional-channel']);await db.query("select set_config('fixture.uid',$1,false)",[uid]);await db.query('set role authenticated');await db.query(calls[0]);await db.query('reset role');pass('Confirmed broadcaster ownership remains permitted through exact role helper');
  await db.query(rollback);assert.equal((await db.query("select md5(prosrc) h from pg_proc where oid='private.require_owner()'::regprocedure")).rows[0].h,target.hash);pass('Rollback restores exact baseline source');
  await db.query("alter function private.can_manage_secrets() set search_path=pg_catalog");await assert.rejects(db.query(install),/permission drift/);await db.query('rollback');pass('Install refuses permission/configuration drift in guard dependency');
  await db.query('alter function private.can_manage_secrets() set search_path=public');await db.query('grant execute on function public.admin_issue_bridge_token() to anon');await assert.rejects(db.query(install),/permission drift/);await db.query('rollback');await db.query('revoke execute on function public.admin_issue_bridge_token() from anon');pass('Install refuses anonymous caller-permission drift');
  await db.query(target.definition.replace('begin','begin\n -- fictional source drift'));await assert.rejects(db.query(install),/permission drift/);await db.query('rollback');pass('Install refuses target source drift rather than silently overwriting it');
  fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/owner-guard-null-local.json'),JSON.stringify({classification:'REAL LOCAL SQL: exact captured role/helper/guard/four caller bodies;fictional data,UID context,hash/random/snapshot stand-ins;not hosted RPC testing',checks,targetBefore:target.hash,targetAfter:fixed.hash},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(error=>{console.error(error);process.exit(1);});
