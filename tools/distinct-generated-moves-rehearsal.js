// Loopback-only reproduction using pinned reference data and actual generator SQL.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();
 const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness');
 const directory=fs.mkdtempSync(path.join(cache,'distinct-moves-'));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:directory,user:'postgres',password:'fictional-only',port:55479,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 const packet=path.join(root,'supabase/unapplied/distinct-generated-moves');let db;const checks=[];
 const pass=name=>{checks.push(name);console.log('PASS '+name);};
 try{
  await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();
  assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
  const apply=async file=>db.query(fs.readFileSync(path.join(root,file),'utf8'));
  await apply('supabase/unapplied/a19-schema/rehearsal/000_synthetic_baseline.sql');
  await apply('supabase/unapplied/a19-schema/001_private_ref_tables.sql');
  const seeds='supabase/unapplied/a19-schema/seed';
  for(const name of fs.readdirSync(path.join(root,seeds)).filter(x=>x.endsWith('.sql')).sort())await apply(seeds+'/'+name);
  await apply('supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql');
  await apply('supabase/unapplied/a19-genval/001_generate_and_assert.sql');
  await apply('supabase/unapplied/a19-genval/local/010_fixture.sql');
  await db.query(fs.readFileSync(path.join(packet,'BASELINE.sql'),'utf8'));
  const generate=async(form,level)=>(await db.query("select private.generate_streamlink_mon_fixture($1,$2,'grant','distinct-moves-fixture') mon",[form,level])).rows[0].mon;
  const validate=async mon=>(await db.query("select private.assert_streamlink_legal($1::jsonb,'grant',null) result",[JSON.stringify(mon)])).rows[0].result;
  const before=await generate(11,5);const rejected=await validate(before);
  assert.equal(rejected.ok,false);assert(rejected.errors.includes('duplicate-move'));pass('Actual baseline generator produces duplicate Harden and validator rejects Metapod');
  await db.query("create temporary table old_slices as select f.form_id,l.level,private.streamlink_level_up_slice(f.content_build,f.form_id,l.level) moves from private.ref_forms f cross join generate_series(1,100) l(level) where f.is_base and f.dex between 1 and 151");
  await db.query(fs.readFileSync(path.join(packet,'INSTALL.sql'),'utf8'));pass('Guarded install preserves source attributes and owner-only ACL');
  const after=await generate(11,5);assert.equal((await validate(after)).ok,true);assert.equal(after.moveSlots.length,1);assert.equal(after.moveSlots[0].moveId,106);pass('Corrected Metapod has exactly one legal Harden');
  const matrix=(await db.query("select o.form_id,o.level,o.moves old_moves,private.streamlink_level_up_slice('sl-ref-20261013-227b573',o.form_id,o.level) moves from old_slices o")).rows;
  let changed=0,oldDuplicate=0;
  for(const row of matrix){
   const ids=row.moves.map(m=>m.moveId),oldIds=row.old_moves.map(m=>m.moveId);
   assert.equal(new Set(ids).size,ids.length);assert(ids.length<=4);
   const duplicate=new Set(oldIds).size!==oldIds.length;
   if(duplicate)oldDuplicate++;
   if(JSON.stringify(row.moves)!==JSON.stringify(row.old_moves)){changed++;assert(duplicate,'Only formerly duplicated results may change');}
  }
  assert.equal(matrix.length,15100);assert(changed>0);pass('All 15,100 Kanto base-form/level combinations contain at most four distinct moves; other outputs unchanged');
  for(const form of [1,10,11,14,25,150,151])for(const level of [1,5,50,100]){
   const mon=await generate(form,level);const legal=await validate(mon);assert.equal(legal.ok,true,JSON.stringify({form,level,legal}));
  }
  pass('28 actual generated specimens pass unchanged legality validator');
  await db.query(fs.readFileSync(path.join(packet,'ROLLBACK.sql'),'utf8'));
  assert.equal((await validate(await generate(11,5))).ok,false);pass('Baseline restoration reproduces original rejection');
  await db.query('grant execute on function private.streamlink_level_up_slice(text,integer,integer) to anon');
  await assert.rejects(()=>db.query(fs.readFileSync(path.join(packet,'INSTALL.sql'),'utf8')),/privilege drift/);await db.query('rollback');pass('Install refuses unexpected privilege drift');
  fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/distinct-generated-moves-local.json'),JSON.stringify({classification:'REAL LOCAL SQL; pinned reference seeds; fictional generator inputs; no hosted writes',checks,matrixCases:matrix.length,changedCases:changed,oldDuplicateCases:oldDuplicate,limitations:'Does not exercise hosted authenticated gift persistence, row triggers, staff audit, or Oak transfer.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
}
main().catch(e=>{console.error(e);process.exit(1)});
