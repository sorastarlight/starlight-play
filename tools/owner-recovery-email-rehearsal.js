/* Real PostgreSQL authorization regression. Synthetic data, loopback only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('url');
const {refuseHosted}=require('./a19-schema-rehearsal.js');const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache','d54-pg-harness');
async function main(){
 refuseHosted();const dir=fs.mkdtempSync(path.join(cache,'recovery-mail-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'local-synthetic-only',port:55463,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let client,count=0;
 try{await cluster.initialise();await cluster.start();client=cluster.getPgClient('postgres','127.0.0.1');await client.connect();assert.equal((await client.query('select host(inet_server_addr()) as host')).rows[0].host,'127.0.0.1');


 await client.query(`CREATE SCHEMA auth;CREATE SCHEMA private;CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.uid',true),'')::uuid $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT current_setting('fixture.jwt',true)::jsonb $$;
 CREATE FUNCTION private.play_staff_role() RETURNS text LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.role',true),'') $$;
 CREATE FUNCTION private.streamlink_protected_trainer(uuid) RETURNS bool LANGUAGE sql AS $$ SELECT $1='aaaaaaaa-0000-4000-8000-000000000003'::uuid $$;
 CREATE FUNCTION private.profile_has_password(uuid) RETURNS bool LANGUAGE sql AS $$ SELECT true $$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,deleted_at timestamptz,banned_until timestamptz);
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,not_after timestamptz);
 CREATE TABLE profiles(id uuid,username text);
 CREATE TABLE twitch_connections(id uuid,user_id uuid,twitch_login text,confirmed bool,login_enabled bool,gameplay_enabled bool,is_primary bool,last_verified_at timestamptz);
 INSERT INTO profiles VALUES('aaaaaaaa-0000-4000-8000-000000000001','synthetic'),('aaaaaaaa-0000-4000-8000-000000000002','other'),('aaaaaaaa-0000-4000-8000-000000000003','protected');
 INSERT INTO auth.users VALUES('bbbbbbbb-0000-4000-8000-000000000001',null,null);
 INSERT INTO auth.sessions VALUES('cccccccc-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001',null);`);
 await client.query(fs.readFileSync(path.join(root,'supabase/owner-account-diagnostics.sql'),'utf8'));
 await client.query(fs.readFileSync(path.join(root,'supabase/owner-recovery-email.sql'),'utf8'));
 await client.query(fs.readFileSync(path.join(root,'supabase/owner-recovery-retention.sql'),'utf8'));
 const target='aaaaaaaa-0000-4000-8000-000000000001',owner='bbbbbbbb-0000-4000-8000-000000000001',sid='cccccccc-0000-4000-8000-000000000001',revision='a'.repeat(64);
 const set=async(role='owner',age=0,method='oauth',session=sid)=>client.query("select set_config('fixture.uid',$1,false),set_config('fixture.role',$2,false),set_config('fixture.jwt',$3,false)",[owner,role,JSON.stringify({session_id:session,amr:[{method,timestamp:Math.floor(Date.now()/1000)-age}]})]);
 const gate=()=>client.query('select public.owner_recovery_email_gate($1) as data',[target]);
 const denied=async(fn)=>{await assert.rejects(fn,e=>e.code==='42501');count++;};
 await set();await client.query('SET ROLE anon');await denied(gate);await client.query('RESET ROLE');
 for(const role of ['','player','moderator','admin']){await set(role);await client.query('SET ROLE authenticated');await denied(gate);await client.query('RESET ROLE');}
 await set();await client.query("select set_config('fixture.uid','',false)");await denied(gate);
 await set('owner',301);await denied(gate);await set('owner',0,'token_refresh');await denied(gate);
 await set('owner',0,'oauth','cccccccc-0000-4000-8000-000000000002');await denied(gate);
 await set();assert.equal((await gate()).rows[0].data.enabled,false);count++;
 await client.query('SET ROLE authenticated');await denied(()=>client.query('select public.owner_recovery_email_finish($1,$2)',[sid,'accepted']));await denied(()=>client.query('select * from private.owner_recovery_receipts'));await client.query('RESET ROLE');
 // Enable only this disposable local database. Hosted deployment stays disabled.
 await client.query('UPDATE private.owner_recovery_settings SET enabled=true,retention_days=90');
 const prepare=async(t=target)=>(await client.query('select public.owner_recovery_email_prepare($1,$2,$3) as data',[t,revision,'t•••@•••'])).rows[0].data;
 const reserve=async(p,request='dddddddd-0000-4000-8000-000000000001',reason='Synthetic help')=>(await client.query('select public.owner_recovery_email_reserve($1,$2,$3,$4,$5,$6) as data',[request,p.challengeId,p.targetUuid,p.snapshotRevision,reason,'fixture-case'])).rows[0].data;
 await denied(()=>prepare('aaaaaaaa-0000-4000-8000-000000000003'));
 await client.query('SET ROLE authenticated');const p=await prepare();assert.equal(p.state,'prepared');const receipt=await reserve(p);assert.equal(receipt.dispatch,true);count++;
 const replay=await reserve(p);assert.equal(replay.dispatch,false);assert.equal(replay.state,'uncertain');count++;
 await denied(()=>reserve(p,undefined,'Changed reason'));await denied(()=>reserve({...p,targetUuid:'aaaaaaaa-0000-4000-8000-000000000002'}));
 await denied(()=>reserve(p,'dddddddd-0000-4000-8000-000000000002'));await client.query('RESET ROLE');
 await client.query('SET ROLE service_role');await client.query('select public.owner_recovery_email_finish($1,$2)',[receipt.receiptId,'uncertain']);await client.query('RESET ROLE');
 const next=await prepare();assert.equal((await reserve(next,'dddddddd-0000-4000-8000-000000000002')).state,'uncertain');count++;
 await client.query("UPDATE private.owner_recovery_receipts SET state='accepted'");
 const limited=await prepare('aaaaaaaa-0000-4000-8000-000000000002');assert.equal((await reserve(limited,'dddddddd-0000-4000-8000-000000000002')).state,'limited');count++;
 // Advance fixture receipt age, then verify actor cap and expired challenges.
 await client.query("UPDATE private.owner_recovery_receipts SET created_at=now()-interval '2 minutes'");
 const expired=await prepare();await client.query("UPDATE private.owner_recovery_challenges SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.challengeId]);await denied(()=>reserve(expired,'dddddddd-0000-4000-8000-000000000002'));
 await client.query("UPDATE auth.sessions SET not_after=now()-interval '1 second'");await denied(gate);
 assert.equal((await client.query('select count(*)::int n from private.owner_recovery_receipts')).rows[0].n,1);count++;

 await client.query('UPDATE auth.sessions SET not_after=null');await set();
 await client.query('UPDATE private.owner_recovery_settings SET qa_target=$1',[target]);
 assert.equal((await client.query('select public.owner_recovery_email_gate($1) data',['aaaaaaaa-0000-4000-8000-000000000002'])).rows[0].data.enabled,false);count++;
 assert.equal((await prepare('aaaaaaaa-0000-4000-8000-000000000002')).state,'disabled');count++;
 await client.query("UPDATE private.owner_recovery_receipts SET created_at=now()-interval '100 days',finished_at=now()-interval '100 days',state='uncertain'");
 await client.query('select private.prune_owner_recovery_history()');assert.equal((await client.query('select count(*)::int n from private.owner_recovery_receipts')).rows[0].n,1);count++;
 await client.query("UPDATE private.owner_recovery_receipts SET state='accepted'");
 await client.query('SET ROLE authenticated');await denied(()=>client.query('select private.prune_owner_recovery_history()'));await client.query('RESET ROLE');
 await client.query('select private.prune_owner_recovery_history()');assert.equal((await client.query('select count(*)::int n from private.owner_recovery_receipts')).rows[0].n,0);count++;
 await client.query('UPDATE private.owner_recovery_settings SET retention_days=null');assert.equal((await gate()).rows[0].data.enabled,false);count++;
 console.log(`${count} real SQL recovery checks passed; no hosted calls or emails`);
 }finally{if(client)await client.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
