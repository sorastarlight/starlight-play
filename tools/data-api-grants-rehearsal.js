/* Isolated PostgreSQL proof of new-table grant behavior; fictional rows only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
async function main(){
 require('./a19-schema-rehearsal').refuseHosted();
 const cache=path.join(__dirname,'.cache/d54-pg-harness'),dir=fs.mkdtempSync(path.join(cache,'api-grants-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const pg=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-only',port:55474,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let db;let checks=0;
 const pass=message=>{checks++;console.log('PASS '+message);};
 try{await pg.initialise();await pg.start();db=pg.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
 await db.query(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;
 create table public.api_fixture(id int primary key,owner_id text);alter table public.api_fixture enable row level security;
 create policy owned_read on public.api_fixture for select to authenticated using(owner_id=current_setting('fixture.owner',true));
 insert into public.api_fixture values(1,'trainer-a'),(2,'trainer-b');set fixture.owner='trainer-a';set role authenticated;`);
 await assert.rejects(()=>db.query('select * from public.api_fixture'),e=>e.code==='42501');pass('RLS policy alone cannot read a new table without an explicit grant');
 await db.query('reset role;grant select on public.api_fixture to authenticated;set role authenticated');assert.deepEqual((await db.query('select id from public.api_fixture')).rows,[{id:1}]);pass('Explicit SELECT plus RLS returns only the signed-in fixture owner row');
 await assert.rejects(()=>db.query("update public.api_fixture set owner_id='trainer-a' where id=2"),e=>e.code==='42501');pass('SELECT grant does not enable direct writes');
 await db.query('reset role;set role anon');await assert.rejects(()=>db.query('select * from public.api_fixture'),e=>e.code==='42501');pass('Authenticated grant does not expose rows to anon');
 await db.query('reset role;set role service_role');await assert.rejects(()=>db.query('select * from public.api_fixture'),e=>e.code==='42501');pass('Service-role RLS bypass still requires a table grant');
 await db.query('reset role;grant select on public.api_fixture to service_role;set role service_role');assert.equal((await db.query('select * from public.api_fixture')).rows.length,2);pass('Scoped backend SELECT works without granting INSERT/UPDATE/DELETE');
 await db.query(`reset role;create schema private;create table private.rpc_fixture(value int);insert into private.rpc_fixture values(42);
 create function public.fixture_read() returns int language sql security definer set search_path=pg_catalog as $$select value from private.rpc_fixture$$;
 revoke all on function public.fixture_read() from public;grant execute on function public.fixture_read() to authenticated;set role authenticated;`);
 assert.equal((await db.query('select public.fixture_read() value')).rows[0].value,42);await assert.rejects(()=>db.query('select * from private.rpc_fixture'),e=>e.code==='42501');pass('Approved definer RPC can access private storage without direct player table grants');
 }finally{if(db)await db.end();await pg.stop();}console.log(checks+' REAL LOCAL SQL grant checks passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
