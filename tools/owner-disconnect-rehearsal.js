/* Real PostgreSQL authorization regression. Synthetic data, loopback only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('url');
const {refuseHosted}=require('./a19-schema-rehearsal.js');const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache','d54-pg-harness');
async function main(){
 refuseHosted();const dir=fs.mkdtempSync(path.join(cache,'owner-guard-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'local-synthetic-only',port:55461,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let client,count=0;
 try{await cluster.initialise();await cluster.start();client=cluster.getPgClient('postgres','127.0.0.1');await client.connect();assert.equal((await client.query('select host(inet_server_addr()) as host')).rows[0].host,'127.0.0.1');
 await client.query(`CREATE SCHEMA auth;CREATE SCHEMA private;CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.uid',true),'')::uuid $$;
 CREATE FUNCTION private.play_staff_role() RETURNS text LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.role',true),'') $$;
 CREATE TABLE public.twitch_connections(id int,user_id uuid,twitch_user_id text,is_primary bool,confirmed bool,twitch_login text);
 CREATE TABLE public.fixture_audit(event text);
 CREATE FUNCTION private.sync_primary_twitch(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
 CREATE FUNCTION private.account_audit_write(text,uuid,text,jsonb) RETURNS void LANGUAGE sql AS $$ INSERT INTO public.fixture_audit VALUES($1) $$;
 CREATE FUNCTION public.admin_user_account(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 INSERT INTO public.twitch_connections VALUES(1,'aaaaaaaa-0000-4000-8000-000000000001','synthetic-twitch',false,true,'synthetic');`);
 await client.query(fs.readFileSync(path.join(root,'tests/fixtures/account-disconnect-original.sql'),'utf8').replace(/^\uFEFF/,''));
 const call="select public.admin_disconnect_twitch('aaaaaaaa-0000-4000-8000-000000000001','synthetic-twitch')";
 // Demonstrate original flaw only in disposable data, then roll back.
 await client.query('BEGIN;SET LOCAL ROLE anon');await client.query(call);await client.query('ROLLBACK');count++;console.log('PASS Original nullable role bypass reproduced on disposable data only');
 await client.query(fs.readFileSync(path.join(root,'supabase/harden-owner-twitch-disconnect.sql'),'utf8'));
 const seedCount=async()=>Number((await client.query('select count(*) as n from public.twitch_connections')).rows[0].n);
 await assert.rejects(async()=>{try{await client.query('SET ROLE anon');await client.query(call);}finally{await client.query('RESET ROLE');}},e=>e.code==='42501');assert.equal(await seedCount(),1);count++;
 for(const role of ['', 'player','moderator','admin']){await client.query("select set_config('fixture.uid','bbbbbbbb-0000-4000-8000-000000000002',false),set_config('fixture.role',$1,false)",[role]);await client.query('SET ROLE authenticated');await assert.rejects(()=>client.query(call),/Only the owner/);await client.query('RESET ROLE');assert.equal(await seedCount(),1);count++;}
 await client.query("select set_config('fixture.uid','',false),set_config('fixture.role','owner',false)");await assert.rejects(()=>client.query(call),/Only the owner/);assert.equal(await seedCount(),1);count++;
 await client.query("select set_config('fixture.uid','bbbbbbbb-0000-4000-8000-000000000002',false),set_config('fixture.role','owner',false)");
 await client.query('BEGIN;SET LOCAL ROLE authenticated');await client.query(call);await client.query('RESET ROLE');assert.equal(await seedCount(),0);assert.equal((await client.query('select count(*)::int as n from fixture_audit')).rows[0].n,1);await client.query('ROLLBACK');assert.equal(await seedCount(),1);count++;
 const perms=(await client.query("select has_function_privilege('anon','public.admin_disconnect_twitch(uuid,text)','execute') as anon,has_function_privilege('authenticated','public.admin_disconnect_twitch(uuid,text)','execute') as signedin")).rows[0];assert.equal(perms.anon,false);assert.equal(perms.signedin,true);count++;
 assert.equal((await client.query('select count(*)::int as n from fixture_audit')).rows[0].n,0);console.log(`${count} real SQL authorization checks passed; no hosted calls`);
 }finally{if(client)await client.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
