/* Disposable PostgreSQL, actual read formatter/helper bodies, fictional records only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const {refuseHosted}=require('./a19-schema-rehearsal');
async function main(){
 refuseHosted();const root=path.resolve(__dirname,'..'),cache=path.join(__dirname,'.cache/d54-pg-harness'),dir=fs.mkdtempSync(path.join(cache,'wire-display-'));assert(dir.startsWith(cache+path.sep));
 const Embedded=(await import(pathToFileURL(path.join(cache,'node_modules/embedded-postgres/dist/index.js')).href)).default;
 const cluster=new Embedded({databaseDir:dir,user:'postgres',password:'fictional-local-only',port:55470,persistent:false,initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 let db;const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
 await cluster.initialise();await cluster.start();db=cluster.getPgClient('postgres','127.0.0.1');await db.connect();assert.equal((await db.query('select host(inet_server_addr()) host')).rows[0].host,'127.0.0.1');
 await db.query(`create schema private;
 create table public.catches(id uuid,user_id uuid,public_id text,dex int,name text,nickname text,variant text,gender text,ball text,caught_at timestamptz,level int,size_class text,is_alpha bool,
 iv_hp int,iv_atk int,iv_def int,iv_spa int,iv_spd int,iv_spe int,av_hp int,av_atk int,av_def int,av_spa int,av_spd int,av_spe int,ev_hp int,ev_atk int,ev_def int,ev_spa int,ev_spd int,ev_spe int,
 moves text[],ot_name text,ot_number int,ot_user_id uuid,met_level int,met_location text,height_m numeric,weight_kg numeric,friendship int,transferred_at timestamptz,favorite bool,locked bool,obtained_method text,trade_evo_ready bool,pokemon_form_id int,ruleset_id text,content_build text,nature_id int,hp_current int,hp_max int);
 create table public.lgpe_species(dex int,types text[],hp int,atk int,def int,spa int,spd int,spe int);
 create table public.trade_listings(catch_id uuid,status text);create table public.species(dex int,tradable bool);
 create table public.pokemon_forms(pokemon_form_id int,form_key text,form_label text,is_base bool);
 create table private.ref_forms(content_build text,form_id int,dex int,hp int,atk int,def int,spa int,spd int,spe int,primary key(content_build,form_id));
 create table private.ref_natures(content_build text,id int,up_stat text,down_stat text,primary key(content_build,id));
 create function private.canonical_form_id(int,int) returns int language sql immutable as $$select $2$$;
 create function private.form_display_name(int,int) returns text language sql immutable as $$select 'Fictional species'::text$$;
 insert into public.lgpe_species values(10,array['Bug'],50,50,50,50,50,50);
 insert into public.species values(10,true);insert into public.pokemon_forms values(10,'base','Base',true);
 insert into private.ref_forms values('fixture',10,10,45,30,35,20,20,45),('wrong-build',10,10,99,99,99,99,99,99),('fixture',11,10,60,60,60,60,60,60);
 insert into private.ref_natures values('fixture',1,'atk','spd'),('wrong-build',1,'def','atk');
 insert into public.catches(id,user_id,public_id,dex,name,variant,gender,ball,level,pokemon_form_id,ruleset_id,content_build,nature_id,hp_current,hp_max,iv_hp,iv_atk,iv_def,iv_spa,iv_spd,iv_spe,av_hp,av_atk,av_def,av_spa,av_spd,av_spe,ev_hp,ev_atk,ev_def,ev_spa,ev_spd,ev_spe)
 values('aaaaaaaa-0039-4039-8039-000000000039','bbbbbbbb-0039-4039-8039-000000000039','SL-FIXTURE',10,'Fictional Caterpie','normal','Female','pokeball',6,10,'streamlink-gen9-xgen','fixture',1,22,22,20,4,12,7,9,23,0,0,0,0,0,0,0,0,0,0,0,0);`);
 const base=JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/wire-catch-json-formatter-baseline.json')))[0];
 for(const dep of JSON.parse(fs.readFileSync(path.join(root,'docs/project-command-center/evidence/wire-stat-formatter-dependencies.json'))))await db.query(dep.definition);
 await db.query(base.definition);
 const read=async()=> (await db.query('select private.catch_json(c) payload from public.catches c')).rows[0].payload;
 const rowHash=async()=> (await db.query('select md5(to_jsonb(c)::text) hash from public.catches c')).rows[0].hash;
 const before=await read(),originalRow=await rowHash();assert.equal(before.stats.hp,23);pass('Actual legacy formatter reproduces HP23 on fictional WIRE HP22');
 const folder=path.join(root,'supabase/unapplied/wire-stat-formatter');await db.query(fs.readFileSync(path.join(folder,'INSTALL.sql'),'utf8'));
 const after=await read();assert.deepEqual(after.stats,{hp:22,atk:8,def:9,spa:7,spd:6,spe:11});pass('WIRE display uses stored HP and pinned form/nature with existing stat helper');
 const withoutStats=p=>{const x={...p};delete x.stats;return x;};assert.deepEqual(withoutStats(after),withoutStats(before));pass('All non-stat fields including CP retain identical payload');
 assert.equal(await rowHash(),originalRow);pass('Read formatter changes no stored specimen field');
 await db.query("update public.catches set ruleset_id=null");const legacy=await read();assert.deepEqual(legacy,before);pass('Legacy catch payload remains exactly identical');await db.query("update public.catches set ruleset_id='streamlink-gen9-xgen'");
 await db.query('update public.catches set level=50');const high=await read();assert.equal(high.stats.atk,40);assert.equal(high.stats.spd,26);assert.equal(high.stats.hp,22);pass('Nature modifiers use correct floors while HP remains stored');
 await db.query('update public.catches set level=100,ev_atk=4');assert.equal((await read()).stats.atk,77);pass('Stored EV contribution is included by existing server helper');
 await db.query('update public.catches set level=6,ev_atk=0,nature_id=999');const missingNature=(await read()).stats;assert.equal(missingNature.hp,22);assert(Object.entries(missingNature).filter(([k])=>k!=='hp').every(([,v])=>v===null));pass('Missing nature is unavailable instead of an invented neutral nature');
 await db.query("update public.catches set nature_id=1,content_build='missing'");const missingRef=(await read()).stats;assert.equal(missingRef.hp,22);assert.equal(missingRef.atk,null);pass('Missing reference pin does not borrow another build or legacy base');
 await db.query("update public.catches set content_build='fixture',iv_atk=null");assert.equal((await read()).stats.atk,null);await db.query('update public.catches set iv_atk=0');assert.equal((await read()).stats.atk,8);pass('Missing IV stays null while known zero remains valid');
 await db.query('update public.catches set ev_atk=null');assert.equal((await read()).stats.atk,null);pass('Missing EV does not become an invented zero');
 await db.query('update public.catches set hp_max=null');assert.equal((await read()).stats.hp,null);await db.query('update public.catches set hp_max=0');assert.equal((await read()).stats.hp,0);pass('Stored HP missing/zero distinction preserved');
 await db.query('update public.catches set ev_atk=0,iv_atk=4,hp_max=22,pokemon_form_id=11');assert.equal((await read()).stats.atk,13);pass('Pinned alternate form uses its own base stats');
 await db.query('update public.catches set pokemon_form_id=10');
 await db.query(fs.readFileSync(path.join(folder,'ROLLBACK.sql'),'utf8'));assert.deepEqual(await read(),before);assert.equal((await db.query("select md5(prosrc) hash from pg_proc where oid='private.catch_json(public.catches)'::regprocedure")).rows[0].hash,base.body_md5);pass('Rollback restores exact original body and payload');
 fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/wire-stat-formatter-local-result.json'),JSON.stringify({at:new Date().toISOString(),classification:'REAL LOCAL SQL; fictional specimens and presentation dependency stubs',checks,limitations:'Does not exercise real Supabase sessions, REST permissions, all formatter callers or full production reference data.'},null,2)+'\n');
 }finally{if(db)await db.end();await cluster.stop();}
 console.log(checks.length+' REAL LOCAL SQL checks passed');
}main().catch(e=>{console.error(e);process.exit(1)});
