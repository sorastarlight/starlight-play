/* Current-catalog WIRE + catch triggers + Familiarity recording integration.
 * Fictional data, disposable loopback PostgreSQL only. No hosted connection.
 * Local TEST outcomes and expired deadlines are deliberate integration fixtures,
 * not ordinary-catch odds or D85 timing proof. Default mode does not deliver;
 * --with-familiarity-delivery opts into additional LOCAL delivery fixtures.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { refuseHosted, splitSql } = require('./a19-schema-rehearsal');
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.resolve(__dirname, '.cache/d54-pg-harness');
const EVIDENCE = path.join(ROOT, 'docs/project-command-center/evidence');
const CATALOG = require('../docs/project-command-center/evidence/wire-combined-catalog-20261020.json');
const INDEX_DEPS = require('../docs/project-command-center/evidence/wire-combined-index-dependencies-20261020.json');
const WITH_DELIVERY = process.argv.includes('--with-familiarity-delivery');
const DELIVERY = require('../docs/project-command-center/evidence/familiarity-delivery-catalog-20261020.json');
const FUNCTIONS = [...CATALOG.functions, ...INDEX_DEPS.functions, ...(WITH_DELIVERY ? DELIVERY.functions : [])];
const TABLES = [...require('../docs/project-command-center/evidence/wire-combined-tables-20261020.json'), ...(WITH_DELIVERY ? DELIVERY.tables : [])];
const IDENTITIES = require('../docs/project-command-center/evidence/wire-combined-identities-20261020.json');
const REF = require('../docs/project-command-center/evidence/wire-combined-reference-20261020.json');
const REF_CHECKSUMS = require('../docs/project-command-center/evidence/wire-reference-checksums-20261020.json');
const D85 = require('../docs/project-command-center/evidence/d85-local-replica-inputs.json');
const HOST = '127.0.0.1';
const PORT = 55466;
const TRAINER = 'aaaaaaaa-0029-4029-8029-000000000029';
const quote = s => '"' + s.replaceAll('"', '""') + '"';
function assert(ok, msg) { if (!ok) throw new Error(msg); }
async function main() {
  refuseHosted();
  assert(process.argv.includes('--local-only'), 'Explicit --local-only required');
  const Embedded = (await import(pathToFileURL(path.join(CACHE, 'node_modules/embedded-postgres/dist/index.js')).href)).default;
  const dir = fs.mkdtempSync(path.join(CACHE, 'wire-current-'));
  assert(dir.startsWith(CACHE + path.sep), 'Unsafe temporary directory');
  const cluster = new Embedded({ databaseDir:dir,user:'postgres',password:'wire-current-local-only',port:PORT,persistent:false,
    initdbFlags:['--encoding=UTF8','--no-locale'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{} });
  let db;
  let db2;
  const checks=[];
  const pass = name => { checks.push(name); console.log('PASS '+name); };
  async function query(sql, args) { try { return await db.query(sql,args); } catch(e) { e.message+=' [SQL: '+sql.slice(0,180)+']'; throw e; } }
  async function seed(table,row) {
    const keys=Object.keys(row);
    const meta=TABLES.find(t=>t.schema+'.'+t.name===table);
    await query('INSERT INTO '+table+' ('+keys.map(quote).join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',keys.map(k=>/^jsonb?$/.test(meta.columns.find(c=>c.name===k).type)?JSON.stringify(row[k]):row[k]));
  }
  async function value(sql,args) { return (await query(sql,args)).rows[0]; }
  async function snapshot() {
    return value(`SELECT (SELECT xp FROM public.profiles WHERE id=$1) xp,
      (SELECT pokeball FROM public.inventories WHERE user_id=$1) balls,
      (SELECT count(*)::int FROM public.catches) catches,
      (SELECT count(*)::int FROM public.item_ledger) item_rows,
      (SELECT count(*)::int FROM public.xp_ledger) xp_rows,
      (SELECT count(*)::int FROM public.mastery_ledger) mastery_rows,
      (SELECT count(*)::int FROM public.candy_ledger) candy_rows,
      (SELECT count(*)::int FROM public.trainer_notices) notices,
      (SELECT count(*)::int FROM private.species_mastery_outbox) outbox`,[TRAINER]);
  }
  async function round(wire,outcome='catch',borrowed=false,form=1) {
    await query('SELECT private.streamlink_wire_set_enabled($1)',[wire]);
    const id=crypto.randomUUID();
    // TEST only forces a local result; rewardMode live exercises actual triggers.
    await query(`INSERT INTO public.encounter_rounds(id,dex,name,variant,gender,pokemon_form_id,trigger_source,rules,deadlines)
      VALUES($1,1,'Bulbasaur','normal','Male',$2,'TEST','{"rewardMode":"live","testOutcome":"${outcome}"}',
      jsonb_build_object('join',now()-interval '4 seconds','prepare',now()-interval '3 seconds','throw',now()-interval '2 seconds','reveal',now()-interval '1 second'))`,[id,form]);
    await query(`INSERT INTO public.encounter_players(round_id,user_id,ball,ball_at,throw_processed,result_reason)
      VALUES($1,$2,'pokeball',now()-interval '2.5 seconds',false,$3)`,[id,TRAINER,borrowed?'standard_throw':null]);
    return id;
  }
  async function settle(id) { await query('SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id=$1',[id]); }
  async function mustReject(sql,args,state) {
    try { await query(sql,args); } catch(e) { assert(e.code===state,'Wrong rejection: '+e.message); return; }
    throw new Error('Expected rejection '+state);
  }
  let completed=false;
  try {
    await cluster.initialise(); await cluster.start();
    db=cluster.getPgClient('postgres',HOST); await db.connect();
    const target=await value("SELECT inet_server_addr()::text addr,current_setting('server_version') version");
    assert(['127.0.0.1','127.0.0.1/32','::ffff:127.0.0.1'].includes(target.addr),'Not loopback');
    pass('Disposable loopback PostgreSQL confirmed');
    await query("CREATE SCHEMA private; CREATE SCHEMA extensions; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE SEQUENCE public.catch_serial; SET check_function_bodies=off; SET TIME ZONE 'UTC'");
    for(const t of TABLES) {
      const cols=t.columns.map(c=>quote(c.name)+' '+c.type+(c.default?' DEFAULT '+c.default:'')+(c.notnull?' NOT NULL':''));
      await query('CREATE TABLE '+quote(t.schema)+'.'+quote(t.name)+' ('+cols.join(',')+')');
    }
    for(const c of IDENTITIES) if(TABLES.some(t=>t.schema===c.schema&&t.name===c.name)) {
      await query('ALTER TABLE '+quote(c.schema)+'.'+quote(c.name)+' ALTER COLUMN '+quote(c.column)+' ADD GENERATED '+(c.identity==='a'?'ALWAYS':'BY DEFAULT')+' AS IDENTITY');
    }
    for(const f of FUNCTIONS) {
      assert(!/\b(?:dblink|pg_read_file|pg_read_binary_file|lo_import)\s*\(|\bnet\.|\bCOPY\b/i.test(f.definition),'Unsafe local snapshot function: '+f.name);
      await query(f.definition);
    }
    // Reproduce the hosted setter's observed denied client EXECUTE privilege.
    await query('REVOKE ALL ON FUNCTION private.streamlink_wire_set_enabled(boolean) FROM PUBLIC,anon,authenticated');
    for(const t of TABLES) {
      for(const c of t.constraints||[]) if(c.type!=='f') await query('ALTER TABLE '+quote(t.schema)+'.'+quote(t.name)+' ADD CONSTRAINT '+quote(c.name)+' '+c.definition);
      for(const idx of t.indexes||[]) await query(idx);
    }
    for(const tr of CATALOG.triggers) await query(tr.definition);
    if(WITH_DELIVERY) {
      for(const tr of DELIVERY.metadata.triggers) await query(tr.definition);
      await query('CREATE VIEW public.species_mastery_progress WITH (security_invoker=true) AS '+DELIVERY.metadata.view);
      // Local JWT-claim fixture only; does not model real Supabase sessions.
      await query(`CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        GRANT USAGE ON SCHEMA auth,private TO authenticated;
        GRANT SELECT ON public.species_mastery_events,public.species_mastery_progress TO authenticated;
        ALTER TABLE public.species_mastery_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.species_mastery_events FORCE ROW LEVEL SECURITY;
        CREATE POLICY species_mastery_events_own ON public.species_mastery_events FOR SELECT USING (trainer_id=(SELECT auth.uid()));`);
      for(const f of DELIVERY.functions) await query('REVOKE ALL ON FUNCTION private.'+quote(f.name)+'('+f.identity+') FROM PUBLIC,anon,authenticated');
    }
    for(const f of FUNCTIONS) {
      const hashes=(await query(`SELECT md5(p.prosrc) hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2`,[f.schema,f.name])).rows;
      assert(hashes.some(r=>r.hash===f.body_md5),'Loaded body differs: '+f.name);
    }
    assert((await value("SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.catches'::regclass AND NOT tgisinternal")).n===6,'Missing catch triggers');
    pass('All catalog body hashes and all six catch triggers verified');
    const seedDir=path.join(ROOT,'supabase/unapplied/a19-schema/seed');
    for(const name of ['00_meta.sql','01_natures.sql','02_species.sql','03_forms.sql','05_form_abilities.sql','06_moves.sql','07_learnsets.sql','09_obtain.sql','10_form_policies.sql']) {
      for(const sql of splitSql(fs.readFileSync(path.join(seedDir,name),'utf8'))) await query(sql);
    }
    for(const expected of REF_CHECKSUMS) {
      assert(/^ref_[a-z_]+$/.test(expected.name),'Unsafe reference table name');
      const got=await value(`SELECT count(*)::int AS rows,md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_md5 FROM private.${expected.name} t`);
      if(got.rows!==expected.rows||got.content_md5!==expected.content_md5) {
        fs.writeFileSync(path.join(CACHE,'wire-reference-mismatch.json'),JSON.stringify({table:expected.name,expected,got,rows:(await query('SELECT to_jsonb(t) row FROM private.'+expected.name+' t')).rows},null,2)+'\n');
        throw new Error('Reference snapshot differs: '+expected.name+'; reference-only diagnostics saved under harness cache');
      }
    }
    pass('All nine used reference tables match hosted row counts and canonical content checksums');
    await seed('public.site_config',{id:1,game_settings:D85.reference.settings});
    await seed('public.species',D85.reference.species[0]);
    await seed('public.capture_balls',D85.reference.balls[0]);
    for(const [name,rows] of Object.entries(REF)) for(const row of rows||[]) await seed('public.'+name,row);
    await seed('public.profiles',{id:TRAINER,display_name:'WIRE Fictional Trainer',xp:100000});
    await seed('public.inventories',{user_id:TRAINER,pokeball:20,greatball:0,ultraball:0,berry:0,bait:0,starter_granted:true});
    await query("INSERT INTO private.streamlink_wire_switch(id,enabled) VALUES(1,false); INSERT INTO private.species_mastery_activation(singleton,lifecycle,activated_at) VALUES(true,'active',now()-interval '1 day')");
    pass('Only fictional trainer and reference data seeded; local Familiarity active');

    const beforeOff=await snapshot();
    const off=await round(false); await settle(off);
    const legacy=await value('SELECT * FROM public.catches WHERE round_id=$1',[off]);
    assert(legacy.public_id.startsWith('LG')&&legacy.content_build===null,'Off path must remain legacy');
    assert(legacy.server_inserted_at instanceof Date,'Off path insertion stamp missing');
    const afterOff=await snapshot();
    assert(afterOff.balls===beforeOff.balls-1&&afterOff.xp>beforeOff.xp&&afterOff.notices>beforeOff.notices&&afterOff.outbox===beforeOff.outbox+1,'Off-path trigger effects missing');
    pass('WIRE off: legacy fields, ball debit, XP, Pokédex notice, insertion stamp and Familiarity outbox coexist');
    await settle(off); assert(JSON.stringify(await snapshot())===JSON.stringify(afterOff),'Off replay side effects changed');
    pass('WIRE-off replay adds no specimen, debit, XP, notice, candy, mastery or outbox row');

    const beforeOn=await snapshot();
    const on=await round(true);
    const stampBefore=(await value('SELECT clock_timestamp() t')).t;
    await settle(on);
    const stampAfter=(await value('SELECT clock_timestamp() t')).t;
    const mon=await value('SELECT * FROM public.catches WHERE round_id=$1',[on]);
    assert(mon.public_id.startsWith('SL')&&mon.content_build==='sl-ref-20261013-227b573','WIRE generated identity missing');
    assert(mon.nature_id>=1&&mon.nature_id<=25&&['1','2'].includes(mon.ability_slot),'Invalid ordinary nature/ability');
    assert(['hp','atk','def','spa','spd','spe'].every(k=>mon['iv_'+k]>=0&&mon['iv_'+k]<=31&&mon['ev_'+k]===0&&mon['av_'+k]===0),'Invalid IV/EV/AV');
    assert(mon.hp_current===mon.hp_max&&mon.hp_max>0&&mon.move_slots.length>0&&mon.move_slots.length<=4,'Missing HP/moves');
    assert(mon.ot_user_id===TRAINER&&mon.ot_name==='WIRE Fictional Trainer'&&mon.met_level===mon.level,'Catch stamp metadata missing');
    assert(mon.server_inserted_at instanceof Date&&mon.server_inserted_at>=mon.caught_at&&mon.server_inserted_at>=stampBefore&&mon.server_inserted_at<=stampAfter,'Timestamp mismatch');
    const afterOn=await snapshot();
    assert(afterOn.balls===beforeOn.balls-1&&afterOn.xp>beforeOn.xp&&afterOn.outbox===beforeOn.outbox+1,'On-path trigger effects missing');
    pass('WIRE on: generated fields survive actual stamp/XP/presentation triggers and queue Familiarity');
    await settle(on); assert(JSON.stringify(await snapshot())===JSON.stringify(afterOn),'On replay side effects changed');
    pass('WIRE-on replay is exactly once across all recorded side effects');
    await mustReject('UPDATE public.catches SET server_inserted_at=server_inserted_at+interval \'1 second\' WHERE id=$1',[mon.id],'55000');
    await mustReject('UPDATE public.catches SET caught_at=caught_at+interval \'1 second\' WHERE id=$1',[mon.id],'55000');
    pass('Both actual timestamp freeze triggers reject edits');

    const escape=await round(true,'escape'); const preEscape=await snapshot(); await settle(escape); const postEscape=await snapshot();
    assert(postEscape.balls===preEscape.balls-1&&postEscape.catches===preEscape.catches&&postEscape.outbox===preEscape.outbox&&postEscape.xp===preEscape.xp,'Escape effects incorrect');
    pass('Owned escape spends one ball and creates no catch, catch XP or Familiarity row');
    const borrowed=await round(true,'catch',true); const preBorrow=await snapshot(); await settle(borrowed); const postBorrow=await snapshot();
    assert(postBorrow.balls===preBorrow.balls&&postBorrow.item_rows===preBorrow.item_rows&&postBorrow.catches===preBorrow.catches+1&&postBorrow.outbox===preBorrow.outbox+1,'Borrowed throw effects incorrect');
    pass('Borrowed catch remains free while generation and Familiarity recording run');

    // Failure injection is a local AFTER INSERT trigger; catalog bodies are unchanged.
    await query(`CREATE FUNCTION public.wire_local_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'wire-local-injected-failure'; END $$;
      CREATE TRIGGER z_wire_local_fail AFTER INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION public.wire_local_fail()`);
    const failed=await round(true); const preFail=await snapshot();
    await mustReject('SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id=$1',[failed],'P0001');
    assert(JSON.stringify(await snapshot())===JSON.stringify(preFail),'Failed persistence left side effects');
    const failedPlayer=await value('SELECT result,throw_processed FROM public.encounter_players WHERE round_id=$1',[failed]);
    assert(failedPlayer.result===null&&failedPlayer.throw_processed===false,'Failure left ghost settlement');
    await query('DROP TRIGGER z_wire_local_fail ON public.catches; DROP FUNCTION public.wire_local_fail()');
    pass('Injected persistence failure rolls back catch, XP, debit, notices, candy, mastery and queue; no ghost result');
    await settle(failed);
    const postRetry=await snapshot();
    assert(postRetry.catches===preFail.catches+1&&postRetry.balls===preFail.balls-1&&postRetry.outbox===preFail.outbox+1,'Local retry did not settle once');
    await settle(failed); assert(JSON.stringify(await snapshot())===JSON.stringify(postRetry),'Local retry duplicated side effects');
    pass('After removing local failure injection, the same unresolved round settles once and replay stays stable');

    db2=cluster.getPgClient('postgres',HOST); await db2.connect();
    const concurrent=await round(true); const preConcurrent=await snapshot();
    await Promise.all([settle(concurrent),db2.query('SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id=$1',[concurrent])]);
    const postConcurrent=await snapshot();
    assert(postConcurrent.catches===preConcurrent.catches+1&&postConcurrent.balls===preConcurrent.balls-1&&postConcurrent.outbox===preConcurrent.outbox+1,'Concurrent settlement duplicated or lost effects');
    await settle(concurrent); assert(JSON.stringify(await snapshot())===JSON.stringify(postConcurrent),'Concurrent replay changed side effects');
    pass('Concurrent current-stack settlement produces exactly one specimen, debit and queue row');

    // The current note function deliberately catches queue errors. Verify that
    // recording failure cannot turn a successful catch into a failed settlement.
    await query(`CREATE FUNCTION public.wire_local_queue_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'wire-local-queue-failure'; END $$;
      CREATE TRIGGER wire_local_queue_fail BEFORE INSERT ON private.species_mastery_outbox FOR EACH ROW EXECUTE FUNCTION public.wire_local_queue_fail()`);
    const queueFailed=await round(true); const preQueue=await snapshot(); await settle(queueFailed);
    const postQueue=await snapshot();
    assert(postQueue.catches===preQueue.catches+1&&postQueue.balls===preQueue.balls-1&&postQueue.xp>preQueue.xp&&postQueue.outbox===preQueue.outbox,'Queue failure changed catch authority');
    const retryCatch=await value('SELECT id FROM public.catches WHERE round_id=$1',[queueFailed]);
    await query('DROP TRIGGER wire_local_queue_fail ON private.species_mastery_outbox; DROP FUNCTION public.wire_local_queue_fail()');
    assert((await value('SELECT private.note_species_mastery_catch($1) ok',[retryCatch.id])).ok,'Local queue retry rejected');
    const postQueueRetry=await snapshot();
    await query('SELECT private.note_species_mastery_catch($1)',[retryCatch.id]);
    assert(postQueueRetry.outbox===preQueue.outbox+1&&JSON.stringify(await snapshot())===JSON.stringify(postQueueRetry),'Local queue retry not idempotent');
    pass('Queue failure leaves successful catch intact; explicit local note retry queues once without duplicate rewards');

    const restored=await round(false); await settle(restored);
    assert((await value('SELECT public_id FROM public.catches WHERE round_id=$1',[restored])).public_id.startsWith('LG'),'Disable did not restore legacy path');
    assert((await value('SELECT public_id FROM public.catches WHERE id=$1',[mon.id])).public_id===mon.public_id,'Disable rewrote existing generated specimen');
    pass('Disabling WIRE restores legacy writes and preserves already generated specimens');
    const integrity=await value(`SELECT
      (SELECT count(*)::int FROM private.species_mastery_outbox o LEFT JOIN public.catches c ON c.id=o.catch_id WHERE c.id IS NULL OR o.status<>'pending' OR o.attempts<>0) bad,
      (SELECT count(*)::int FROM public.catches) catches,
      (SELECT count(*)::int FROM private.species_mastery_outbox) outbox`);
    assert(integrity.bad===0&&integrity.catches===integrity.outbox,'Queue integrity mismatch');
    pass('All recorded catches have one pending outbox row; no orphan, delivered or attempted row');
    const proposal=fs.readFileSync(path.join(EVIDENCE,'wire-activation-proposal.sql'),'utf8');
    // Test the concrete proposed operational transaction locally, including a
    // stale-fingerprint rejection. No hosted SQL is executed by this script.
    const stale=proposal.replace('851717f6de5bdb67ec916559c2d75e67','00000000000000000000000000000000');
    await mustReject(stale,[],'P0001'); await query('ROLLBACK');
    assert((await value('SELECT enabled FROM private.streamlink_wire_switch WHERE id=1')).enabled===false,'Stale packet flipped switch');
    pass('Proposed activation transaction rejects fingerprint drift without switching on');
    await query(proposal);
    assert((await value('SELECT enabled FROM private.streamlink_wire_switch WHERE id=1')).enabled===true,'Proposed packet did not enable local switch');
    await query('SELECT private.streamlink_wire_set_enabled(false)');
    assert((await value('SELECT enabled FROM private.streamlink_wire_switch WHERE id=1')).enabled===false,'Local rollback did not disable');
    pass('Concrete activation-only packet and existing-function rollback both verified locally');
    let deliveryResult=null;
    if(WITH_DELIVERY) deliveryResult=await require('./familiarity-delivery-local-cases')({db,db2,query,value,snapshot,round,settle,TRAINER,pass,mustReject});
    completed=true;
    const report={classification:'REAL SQL — disposable loopback PostgreSQL; synthetic integration fixtures',observedAt:new Date().toISOString(),postgres:target.version,checks,final:await snapshot(),deliveryResult,functions:FUNCTIONS.length,catchTriggers:CATALOG.triggers.length,limitations:['No hosted gameplay or production WIRE toggle.','Forced local TEST outcomes and expired deadlines: not ordinary odds/timing proof.','Catalog-shaped tables include NOT NULL/defaults, identities, non-FK constraints and indexes; foreign keys and nested triggers on unrelated tables are excluded. Real authentication is not modeled.','Reference pin seed plus limited public reference snapshot; default progression settings for this fixture.',WITH_DELIVERY?'Familiarity delivery/reconcile/event guards and view RLS tested locally with synthetic auth.uid claims only; no hosted delivery, scheduler or browser UI test.':'No Familiarity reconciliation, event delivery, scheduler or browser UI test.']};
    fs.writeFileSync(path.join(EVIDENCE,WITH_DELIVERY?'familiarity-current-stack-result.json':'wire-current-stack-result.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } finally {
    if(db2) await db2.end().catch(()=>{});
    if(db) await db.end().catch(()=>{});
    await cluster.stop().catch(()=>{});
    const resolved=path.resolve(dir);
    assert(resolved.startsWith(CACHE+path.sep)&&path.basename(resolved).startsWith('wire-current-'),'Unsafe cleanup');
    fs.rmSync(resolved,{recursive:true,force:true});
    console.log('Local cluster removed; completed='+completed);
  }
}
if(require.main===module) main().catch(e=>{console.error('WIRE LOCAL STOP:',e.message);process.exit(1);});
