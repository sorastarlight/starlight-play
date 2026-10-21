/* Actual retired routine definitions; denied roles never execute their bodies. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
async function main(){
 require('./a19-schema-rehearsal').refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness'),dir=fs.mkdtempSync(path.join(cache,'selftest-retirement-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const pg=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-only',port:55475,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});let db;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{await pg.initialise();await pg.start();db=pg.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) h')).rows[0].h,'127.0.0.1');
 await db.query('create schema private;create role anon;create role authenticated;create role service_role;create role fixture_member in role authenticated;grant usage on schema private to anon,authenticated,service_role;set check_function_bodies=off');
 const targets=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/launch-selftest-body-baseline.json')));for(const f of targets)await db.query(f.definition);
 let packet=fs.readFileSync(path.join(root,'supabase/unapplied/launch-selftest-retirement/INSTALL.sql'),'utf8');
 const hashQuery=packet.slice(packet.indexOf('if (')+4,packet.indexOf(") is distinct from '99992dfde9c2981902c89d8077b0c24f'"));
 const initial=(await db.query(hashQuery)).rows[0].hash;packet=packet.replaceAll('99992dfde9c2981902c89d8077b0c24f',initial);
 const reject=async(re)=>{await assert.rejects(()=>db.query(packet),re);await db.query('rollback');};
 const first=targets[0];await db.query(first.definition.replace('$function$','$function$\n-- fictional source drift\n'));await reject(/source\/ACL drift/);await db.query(first.definition);pass('Source mismatch aborts before permissions change');
 await db.query('grant execute on function '+first.signature+' to service_role');await reject(/source\/ACL drift/);await db.query('drop function '+first.signature);await db.query(first.definition);pass('ACL mismatch refuses to overwrite a concurrent permission decision');
 await db.query(packet);
 for(const role of ['anon','authenticated','fixture_member']){await db.query('set role '+role);for(const f of targets){await assert.rejects(()=>db.query('select '+f.signature),e=>e.code==='42501');pass(role+' denied before '+f.name+' body executes');}await db.query('reset role');}
 for(const f of targets){assert.equal((await db.query('select md5(prosrc) hash from pg_proc where oid=$1::regprocedure',[f.signature])).rows[0].hash,f.md5);assert((await db.query("select has_function_privilege('service_role',$1,'EXECUTE') ok",[f.signature])).rows[0].ok);pass(f.name+' exact source and backend access preserved');}
 assert.equal((await db.query(hashQuery)).rows[0].hash,initial);pass('Every unrelated function attribute remains unchanged');
 fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/launch-selftest-local-result.json'),JSON.stringify({at:new Date().toISOString(),classification:'REAL LOCAL SQL; exact six function definitions; fictional roles; privileged bodies never invoked',checks},null,2)+'\n');
 }finally{if(db)await db.end();await pg.stop();}console.log(checks.length+' REAL LOCAL SQL self-test permission checks passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
