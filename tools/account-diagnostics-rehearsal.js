/* Real PostgreSQL authorization regression. Synthetic data, loopback only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('url');
const {refuseHosted}=require('./a19-schema-rehearsal.js');const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache','d54-pg-harness');
async function main(){
 refuseHosted();const dir=fs.mkdtempSync(path.join(cache,'diagnostics-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'local-synthetic-only',port:55462,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let client,count=0;
 try{await cluster.initialise();await cluster.start();client=cluster.getPgClient('postgres','127.0.0.1');await client.connect();assert.equal((await client.query('select host(inet_server_addr()) as host')).rows[0].host,'127.0.0.1');

 await client.query(`CREATE SCHEMA auth; CREATE SCHEMA private; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.uid',true),'')::uuid $$;
 CREATE FUNCTION private.play_staff_role() RETURNS text LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.role',true),'') $$;
 CREATE FUNCTION private.streamlink_protected_trainer(uuid) RETURNS bool LANGUAGE sql AS $$ SELECT $1='aaaaaaaa-0000-4000-8000-000000000003'::uuid $$;
 CREATE FUNCTION private.profile_has_password(uuid) RETURNS bool LANGUAGE sql AS $$ SELECT true $$;
 CREATE TABLE profiles(id uuid,username text);
 CREATE TABLE twitch_connections(id uuid,user_id uuid,twitch_login text,confirmed bool,login_enabled bool,gameplay_enabled bool,is_primary bool,last_verified_at timestamptz);
 INSERT INTO profiles VALUES ('aaaaaaaa-0000-4000-8000-000000000001','synthetic'),('aaaaaaaa-0000-4000-8000-000000000002','PlayerQA'),('aaaaaaaa-0000-4000-8000-000000000003','protected');`);
 await client.query(fs.readFileSync(path.join(root,'supabase/owner-account-diagnostics.sql'),'utf8'));
 const call="select public.owner_account_diagnostics_context('aaaaaaaa-0000-4000-8000-000000000001') as data";
 await client.query('SET ROLE anon');await assert.rejects(()=>client.query(call),e=>e.code==='42501');await client.query('RESET ROLE');count++;
 for(const role of ['', 'player','moderator','admin']){
 await client.query("select set_config('fixture.uid','bbbbbbbb-0000-4000-8000-000000000001',false),set_config('fixture.role',$1,false)",[role]);
 await client.query('SET ROLE authenticated');await assert.rejects(()=>client.query(call),e=>e.code==='42501');await client.query('RESET ROLE');count++;}
 await client.query("select set_config('fixture.uid','',false),set_config('fixture.role','owner',false)");await assert.rejects(()=>client.query(call),e=>e.code==='42501');count++;
 await client.query("select set_config('fixture.uid','bbbbbbbb-0000-4000-8000-000000000001',false)");
 await client.query('SET ROLE authenticated');
 const data=(await client.query(call)).rows[0].data;assert.equal(data.passwordPresent,true);assert.deepEqual(data.appConnections,[]);count++;
 for(const id of ['aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000004']){
 await assert.rejects(()=>client.query('select public.owner_account_diagnostics_context($1)',[id]),e=>e.code==='42501');count++;}
 await client.query('RESET ROLE');assert.equal((await client.query('select count(*)::int n from profiles')).rows[0].n,3);
 console.log(`${count} real SQL diagnostics checks passed; synthetic accounts only`);
 }finally{if(client)await client.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
