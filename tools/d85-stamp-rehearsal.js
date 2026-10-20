/* One ordinary LOCAL throw. Never connects to hosted services.
 * Exact catalog function bodies; catalog-shaped tables with synthetic constraints.
 * Only the server insertion stamp trigger is installed: specimen generation,
 * XP and presentation triggers are outside this focused settlement/stamp check.
 * A natural escape is a valid result, NOT stamp proof. No automatic reroll.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { refuseHosted } = require('./a19-schema-rehearsal');
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.resolve(__dirname, '.cache/d54-pg-harness');
const INPUT = require('../docs/project-command-center/evidence/d85-local-replica-inputs.json');
const TIMING = require('../docs/project-command-center/evidence/d85-local-timings.json');
const HOST = '127.0.0.1';
const PORT = 55465;
const A = 'aaaaaaaa-0085-4085-8085-000000000085';
function assert(ok, msg) { if (!ok) throw new Error(msg); }
function quote(s) { return '"' + s.replaceAll('"', '""') + '"'; }
async function main() {
  refuseHosted();
  assert(process.argv.includes('--one-local-throw'), 'Explicit --one-local-throw required; this script never rerolls automatically');
  const Embedded = (await import(pathToFileURL(path.join(CACHE, 'node_modules/embedded-postgres/dist/index.js')).href)).default;
  const dir = fs.mkdtempSync(path.join(CACHE, 'd85-'));
  assert(dir.startsWith(CACHE + path.sep), 'Temporary path outside harness cache');
  const cluster = new Embedded({databaseDir:dir, user:'postgres', password:'d85-disposable-local', port:PORT,
    persistent:false, initdbFlags:['--encoding=UTF8','--no-locale'], postgresFlags:['-c','listen_addresses=127.0.0.1'], onLog:()=>{}});
  let db;
  const checks = [];
  function pass(msg) { checks.push(msg); console.log('PASS ' + msg); }
  try {
    await cluster.initialise(); await cluster.start();
    db = cluster.getPgClient('postgres', HOST); await db.connect();
    const target = (await db.query('SELECT inet_server_addr()::text addr, current_setting(\'server_version\') version')).rows[0];
    assert([HOST, '127.0.0.1/32', '::ffff:127.0.0.1/128', '::ffff:127.0.0.1'].includes(target.addr), 'Database is not loopback: '+target.addr);
    pass('Disposable loopback database confirmed');
    await db.query('CREATE SCHEMA private; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; SET check_function_bodies=off');
    const tables = new Map();
    for (const c of INPUT.columns) {
      const key = quote(c.schema)+'.'+quote(c.name);
      if (!tables.has(key)) tables.set(key, []);
      tables.get(key).push(quote(c.column)+' '+c.type);
    }
    for (const [name, cols] of tables) await db.query('CREATE TABLE '+name+' ('+cols.join(',')+')');
    await db.query(`CREATE TABLE public.encounter_activity(round_id uuid,user_id uuid,display_name text,kind text,item text);
      CREATE TABLE private.store_items(grants jsonb);
      ALTER TABLE public.catches ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE public.catches ALTER COLUMN caught_at SET DEFAULT now();
      CREATE UNIQUE INDEX d85_catch_once ON public.catches(round_id,user_id);
      CREATE UNIQUE INDEX d85_capture_once ON public.capture_log(round_id,user_id);
      ALTER TABLE public.encounter_players ADD PRIMARY KEY(round_id,user_id);
      ALTER TABLE public.encounter_rounds ADD PRIMARY KEY(id);
      INSERT INTO private.streamlink_wire_switch(id,enabled) VALUES(1,false);
      INSERT INTO private.species_mastery_activation(singleton,lifecycle) VALUES(true,'inactive');`);
    const excluded = new Set(['capture_self_test','capture_table_for_tier','capture_items_json','capture_round_context']);
    for (const f of INPUT.functions) if (!excluded.has(f.name)) await db.query(f.definition);
    await db.query(TIMING.definition);
    await db.query('CREATE TRIGGER catch_server_inserted_at BEFORE INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION private.stamp_catch_server_inserted_at()');
    // Check every loaded body, including spending/odds/timer helpers, before any throw.
    for (const f of INPUT.functions.filter(f=>!excluded.has(f.name))) {
      const found = await db.query(`SELECT md5(p.prosrc) hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname=$1`,[f.name]);
      assert(found.rows.some(r=>r.hash===f.body_md5), 'Body mismatch: '+f.name);
    }
    pass('All loaded function body hashes equal hosted catalog snapshot');
    async function seed(table, row) {
      const keys = Object.keys(row);
      await db.query('INSERT INTO '+table+' ('+keys.map(quote).join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')', keys.map(k=>Array.isArray(row[k])?row[k]:typeof row[k]==='object'&&row[k]!==null?JSON.stringify(row[k]):row[k]));
    }
    await seed('public.site_config', {id:1,game_settings:INPUT.reference.settings});
    await seed('public.species', INPUT.reference.species[0]);
    await seed('public.capture_balls', INPUT.reference.balls[0]);
    await seed('public.profiles', {id:A,display_name:'D85 Synthetic Trainer',xp:0});
    await seed('public.inventories', {user_id:A,pokeball:1,berry:0,bait:0,greatball:0,ultraball:0,balls:{},berries:{}});
    const id = crypto.randomUUID();
    const deadlines = (await db.query('SELECT private.round_deadlines($1::jsonb,clock_timestamp()) d',[JSON.stringify(TIMING.timings)])).rows[0].d;
    await seed('public.encounter_rounds', {id,dex:1,name:'Bulbasaur',variant:'normal',gender:'Male',pokemon_form_id:1,rules:{rewardMode:'live'},trigger_source:'live',deadlines,cancelled:false,resolved:false,hidden:false,phase:'join'});
    await seed('public.encounter_players', {round_id:id,user_id:A,ball:'pokeball',throw_processed:false,ball_at:deadlines.prepare});
    assert((await db.query('SELECT count(*)::int n FROM public.profiles')).rows[0].n===1,'Unexpected trainer');
    assert((await db.query('SELECT private.round_is_active(r.*) active FROM public.encounter_rounds r WHERE id=$1',[id])).rows[0].active,'Launch guard rejected local active round');
    pass('One synthetic trainer, ordinary ball, canonical guard and full 105-second deadlines');
    console.log('Waiting for unchanged canonical phase deadlines; no forced outcome or timer rewrites.');
    while (Date.now() < Date.parse(deadlines.reveal)+50) await new Promise(r=>setTimeout(r,Math.min(1000,Math.max(1,Date.parse(deadlines.reveal)+50-Date.now()))));
    const before = (await db.query('SELECT clock_timestamp() t')).rows[0].t;
    await db.query('SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id=$1',[id]);
    const after = (await db.query('SELECT clock_timestamp() t')).rows[0].t;
    const player = (await db.query('SELECT chance,roll,caught,result FROM public.encounter_players WHERE round_id=$1',[id])).rows[0];
    assert(player.result==='Caught'||player.result==='Escaped','No natural settlement result');
    assert(Number(player.chance)===0.16, 'Unexpected ordinary Bulbasaur odds');
    assert(Number(player.roll)>=0 && Number(player.roll)<1,'Invalid secure roll');
    assert((Number(player.roll)<Number(player.chance))===player.caught,'Result differs from real odds');
    pass('Canonical odds and cryptographic roll settled naturally');
    const inv = (await db.query('SELECT pokeball FROM public.inventories WHERE user_id=$1',[A])).rows[0];
    const spends = (await db.query("SELECT amount,item_key FROM public.item_ledger WHERE user_id=$1",[A])).rows;
    assert(inv.pokeball===0&&spends.length===1&&spends[0].amount===-1&&spends[0].item_key==='pokeball','Ordinary ball not spent exactly once');
    pass('Canonical spending consumed exactly one ball with one ledger debit');
    const catches = (await db.query('SELECT id,caught_at,server_inserted_at FROM public.catches WHERE round_id=$1',[id])).rows;
    assert(catches.length===(player.caught?1:0),'Catch count disagrees with outcome');
    if (player.caught) {
      const stamp = catches[0].server_inserted_at;
      assert(stamp instanceof Date && Number.isFinite(stamp.getTime()) && stamp>=before&&stamp<=after,'Invalid server stamp');
      pass('Natural catch received finite server insertion stamp within settlement interval');
    } else pass('Natural escape preserved; no specimen created, stamp path remains unobserved');
    await db.query('SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id=$1',[id]);
    assert((await db.query('SELECT count(*)::int n FROM public.item_ledger')).rows[0].n===1,'Replay spent twice');
    assert((await db.query('SELECT count(*)::int n FROM public.catches')).rows[0].n===catches.length,'Replay created specimen');
    pass('Replay adds neither debit nor specimen');
    const state = (await db.query('SELECT private.streamlink_wire_is_enabled() wire,(SELECT lifecycle FROM private.species_mastery_activation WHERE singleton) lifecycle')).rows[0];
    assert(state.wire===false&&state.lifecycle==='inactive','Activation changed');
    pass('WIRE and Familiarity remain inactive');
    const report = {classification:'REAL SQL: disposable loopback Postgres only',postgres:target.version,observedAt:new Date().toISOString(),roundId:id,syntheticTrainer:A,timings:TIMING.timings,player,stampObserved:player.caught,checks,limitations:['Catalog-shaped tables use local constraints, not full production schema.','Only insertion stamp trigger installed; specimen generation, XP and presentation triggers excluded.','No hosted gameplay; no D86 authority; escape is not stamp proof.']};
    const out = path.join(CACHE,'d85-latest-result.json');
    fs.writeFileSync(out, JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    console.log('Evidence: '+out);
  } finally {
    if(db) await db.end().catch(()=>{});
    await cluster.stop().catch(()=>{});
    const resolved=path.resolve(dir);
    assert(resolved.startsWith(CACHE+path.sep)&&path.basename(resolved).startsWith('d85-'),'Unsafe cleanup path');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
}
if(require.main===module) main().catch(e=>{console.error('D85 STOP:',e.message);process.exit(1);});
