/* Invoked inside the isolated cleanup rehearsal; never opens a hosted connection. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {changes}=require('./prepare-legacy-runtime');const {makePacket,PREFLIGHT_SQL,schemaSql}=require('./prepare-legacy-cleanup');const {stateSql,addHashes,makeSchemaPacket,av}=require('./prepare-legacy-schema');
async function run({db,root,pass,originalHash,specimenHash,profile,originalProfile}){
 assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
 const get=async(sql,key)=>{const r=await db.query(sql);return r.find(x=>x.rows?.[0]?.[key])?.rows[0][key];};
 const rollback=()=>db.query('rollback');
 const reject=async(sql,re)=>{await assert.rejects(()=>db.query(sql),re);await rollback();};
 // The baseline round-trip is complete before resetting fictional archive tables.
 assert.equal((await db.query("select status from private.legacy_retirement_runs where run_key='legacy110-v1'")).rows[0].status,'restored');
 await db.query('drop table private.legacy_retirement_rows;drop table private.legacy_retirement_runs;');
 await db.query(`create table public.species(dex int,name text,tradable bool);create table public.evolution_rules(id text);
 create table public.lgpe_species(dex int primary key,types text[],hp int,atk int,def int,spa int,spd int,spe int,moves jsonb);
 insert into public.lgpe_species values(10,array['Bug'],50,50,50,50,50,50,'[]');grant select on public.lgpe_species to anon,authenticated;`);
 const extra=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-fallback-extra-baseline.json')));
 for(const f of extra.filter(f=>['lgpe_stat','lgpe_pick_moves'].includes(f.name)))await db.query(f.definition);
 const self=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/legacy-fallback-function-baseline.json')))[0].audit.functions.find(f=>f.name==='public_ledger_lockdown_self_test');await db.query(self.definition);
 for(const f of changes)await db.query(f.definition);
 const cleanupManifest=await get(PREFLIGHT_SQL,'manifest'),cleanup=makePacket(cleanupManifest);await db.query(cleanup.install);
 const runtimeFolder=path.join(root,'supabase/unapplied/legacy-runtime-retirement');await db.query(fs.readFileSync(path.join(runtimeFolder,'INSTALL.sql'),'utf8'));
 await reject(cleanup.restore,/Schema or trigger source drift/);pass('Old specimen restore correctly refuses a newer runtime instead of bypassing source guards');
 let state=await addHashes(await get(stateSql,'state'),q=>db.query(q));let packet=makeSchemaPacket(state,{originalRestoreSQL:cleanup.restore});
 const tableAcl=async()=>(await db.query("select has_table_privilege('anon','public.lgpe_species','SELECT') a,has_table_privilege('authenticated','public.lgpe_species','SELECT') b")).rows[0];const oldAcl=await tableAcl();
 const helperAcl=async()=>(await db.query("select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') auth from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('lgpe_stat','lgpe_pick_moves') order by p.proname")).rows;
 const oldHelperAcl=await helperAcl();
 await db.query(packet.install);
 assert.equal((await db.query("select count(*) n from information_schema.columns where table_schema='public' and table_name='catches' and column_name like 'av_%'")).rows[0].n,'0');pass('All six AV columns removed with rebuilt before-write trigger; no CASCADE');
 const ref=(await db.query("select to_regclass('public.lgpe_species') old,to_regclass('private.retired_lgpe_species') archive,has_table_privilege('anon','private.retired_lgpe_species','SELECT') anon,has_table_privilege('authenticated','private.retired_lgpe_species','SELECT') auth")).rows[0];assert.equal(ref.old,null);assert(ref.archive);assert.equal(ref.anon,false);assert.equal(ref.auth,false);pass('Legacy reference table leaves public runtime and remains privately recoverable without player grants');
 assert.equal((await db.query("select to_regprocedure('private.lgpe_stat(integer,integer,integer,integer,boolean)') stat,to_regprocedure('private.lgpe_pick_moves(integer,integer)') moves")).rows[0].stat,null);
 assert.equal((await db.query("select to_regprocedure('private.lgpe_pick_moves(integer,integer)') moves")).rows[0].moves,null);pass('Unused legacy stat/move functions retired with RESTRICT');
 assert.equal((await db.query("select count(*) n from private.legacy_retirement_rows where run_key='legacy-schema-v1' and relation='catch_av'")).rows[0].n,'1');pass('Retired per-specimen AV values privately archived before schema removal');
 const integrity=(await db.query("select archive_hash=(select md5(string_agg(relation||':'||row_key||':'||payload::text,E'\\n' order by relation,row_key)) from private.legacy_retirement_rows where run_key='legacy110-v1') valid from private.legacy_retirement_runs where run_key='legacy110-v1'")).rows[0].valid;assert(integrity);pass('Schema archive does not alter original110-specimen recovery archive integrity');
 await db.query(packet.rollback);assert.deepEqual(await tableAcl(),oldAcl);assert.deepEqual(await helperAcl(),oldHelperAcl);pass('Schema rollback restores AV values, legacy reference data and exact player/helper privilege matrix');
 // A re-added column has a new attnum; recalculate locally, never bypass the production manifest.
 await db.query("delete from private.legacy_retirement_rows where run_key='legacy-schema-v1';delete from private.legacy_retirement_runs where run_key='legacy-schema-v1'");
 state=await addHashes(await get(stateSql,'state'),q=>db.query(q));packet=makeSchemaPacket(state,{originalRestoreSQL:cleanup.restore});await db.query(packet.install);
 const failed=packet.recover.replace('insert into public.oak_transfers overriding system value',()=>"do $$begin raise exception 'fictional recovery chain failure';end$$;insert into public.oak_transfers overriding system value");
 await reject(failed,/fictional recovery chain failure/);assert.equal((await db.query("select count(*) n from information_schema.columns where table_schema='public' and table_name='catches' and column_name like 'av_%'")).rows[0].n,'0');assert((await db.query("select to_regclass('private.retired_lgpe_species') a")).rows[0].a);pass('Failure in combined schema/source/specimen recovery rolls every prior stage back atomically');
 await db.query(packet.recover);assert.equal(await specimenHash(),originalHash);const restored=await profile();for(const k of ['team_ids','showcase','pc_layout','xp'])assert.deepEqual(restored[k],originalProfile[k]);pass('Combined recovery restores exact full specimen JSON and original pointers despite dropped/re-added AV attributes');
 for(const f of changes){const signature=f.schema+'.'+f.name+'('+f.args.split(',').filter(Boolean).map(a=>a.trim().replace(/^\w+\s+/,'')).join(',')+')';assert.equal((await db.query('select md5(prosrc) h from pg_proc where oid=$1::regprocedure',[signature])).rows[0].h,f.before);}pass('Combined recovery also restores all12 previous runtime source bodies');
 assert.equal((await db.query("select status from private.legacy_retirement_runs where run_key='legacy110-v1'")).rows[0].status,'restored');pass('Old specimen run and new schema run retain distinct recovery states');
}
module.exports={run};
if(require.main===module){console.error('Run node tools/legacy-cleanup-rehearsal.js --schema-chain; isolated fixture required.');process.exit(1);}
