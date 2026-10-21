/* Called only inside the disposable current-stack rehearsal. No network client. */
module.exports = async function run({db,db2,query,value,snapshot,round,settle,TRAINER,pass,mustReject}) {
  const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
  const count=async()=> (await value('SELECT count(*)::int n FROM public.species_mastery_events')).n;
  const progress=async()=>value('SELECT eligible_captures,tier_level,tier_name FROM public.species_mastery_progress WHERE trainer_id=$1 AND dex=1',[TRAINER]);
  async function deliver(limit) { return (await value('SELECT private.deliver_species_mastery_outbox($1) n',[limit])).n; }
  async function catchOne(borrowed=false) {
    const id=await round(true,'catch',borrowed); await settle(id);
    const caught=await value('SELECT id FROM public.catches WHERE round_id=$1',[id]);
    if(!caught) throw new Error('Local forced-catch fixture produced no specimen: '+JSON.stringify(await value('SELECT r.resolved,r.cancelled,r.rules,p.result,p.result_reason,p.throw_processed FROM public.encounter_rounds r JOIN public.encounter_players p ON p.round_id=r.id WHERE r.id=$1',[id])));
    return caught.id;
  }
  const unchanged=async before=>assert(JSON.stringify(await snapshot())===JSON.stringify(before),'Delivery changed catch/economy/notice totals');
  const before=await snapshot();
  assert(await deliver(2)===2&&await count()===2,'Bounded delivery did not limit to two');
  let p=await progress();assert(p.eligible_captures===2&&p.tier_name==='Familiar'&&p.tier_level===1,'Familiar tier incorrect');
  pass('Actual queue admission/event guard and bounded delivery write two events and Familiar progress');
  assert(await deliver(1)===1&&(await progress()).tier_name==='Acquainted','Three-catch threshold incorrect');
  assert(await deliver(3)===3&&(await progress()).tier_name==='Experienced','Six-catch threshold incorrect');
  assert(await deliver(25)===1&&await count()===7,'Remaining delivery count incorrect');
  await unchanged(before);
  pass('Delivery advances 3/6-catch tiers without changing Pokémon, XP, candy, mastery points, items or notices');
  assert(await deliver(25)===0&&(await value('SELECT private.reconcile_species_mastery_outbox(25) n')).n===0,'Delivered catches re-enrolled');
  await unchanged(before);
  pass('Repeated delivery and reconciliation add no duplicate events or rewards');
  const first=await value('SELECT catch_id FROM public.species_mastery_events ORDER BY catch_id LIMIT 1');
  await mustReject('UPDATE public.species_mastery_events SET dex=2 WHERE catch_id=$1',[first.catch_id],'55000');
  await mustReject(`INSERT INTO public.species_mastery_events(catch_id,trainer_id,dex,round_id,source_key)
    SELECT id,'bbbbbbbb-0032-4032-8032-000000000032'::uuid,dex,round_id,source_key FROM public.catches WHERE id=$1`,[first.catch_id],'23514');
  pass('Event trigger rejects mutation and forged trainer identity');

  await query(`CREATE FUNCTION public.familiarity_queue_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'local queue unavailable'; END $$;
    CREATE TRIGGER familiarity_queue_failure BEFORE INSERT ON private.species_mastery_outbox FOR EACH ROW EXECUTE FUNCTION public.familiarity_queue_failure()`);
  const missed=await catchOne();
  assert(!(await value('SELECT EXISTS(SELECT 1 FROM private.species_mastery_outbox WHERE catch_id=$1) yes',[missed])).yes,'Injected queue failure did not miss');
  await query('DROP TRIGGER familiarity_queue_failure ON private.species_mastery_outbox; DROP FUNCTION public.familiarity_queue_failure()');
  const preReconcile=await snapshot();
  assert((await value('SELECT private.reconcile_species_mastery_outbox(1) n')).n===1,'Missing catch not recovered');
  assert((await value('SELECT private.reconcile_species_mastery_outbox(1) n')).n===0,'Reconcile queued twice');
  assert(await deliver(1)===1&&await count()===8,'Recovered catch not delivered');
  const postReconcile=await snapshot();
  assert(postReconcile.outbox===preReconcile.outbox+1,'Wrong recovered queue count');
  delete preReconcile.outbox;delete postReconcile.outbox;
  assert(JSON.stringify(preReconcile)===JSON.stringify(postReconcile),'Reconcile altered gameplay rewards');
  pass('A missed note is reconciled and delivered once without repeating the catch or its rewards');

  // These lifecycle updates are local state fixtures, not operator-function tests.
  await query("UPDATE private.species_mastery_activation SET lifecycle='paused',paused_at=now() WHERE singleton");
  const paused=await catchOne();
  assert(await deliver(25)===0,'Paused delivery ran');
  assert((await value('SELECT status FROM private.species_mastery_outbox WHERE catch_id=$1',[paused])).status==='pending','Paused note did not queue');
  await query("UPDATE private.species_mastery_activation SET lifecycle='active',paused_at=null WHERE singleton");
  assert(await deliver(1)===1,'Resumed fixture did not deliver');
  pass('Paused lifecycle accepts notes and blocks delivery; active fixture resumes the same queue');
  await query('BEGIN');
  try {
    await query("UPDATE private.species_mastery_activation SET lifecycle='draining',drain_started_at=clock_timestamp() WHERE singleton");
    const closedToNew=await catchOne();
    assert(!(await value('SELECT EXISTS(SELECT 1 FROM private.species_mastery_outbox WHERE catch_id=$1) yes',[closedToNew])).yes,'Drain admitted a new note');
    assert((await value('SELECT private.reconcile_species_mastery_outbox(25) n')).n===0,'Drain reconciled new work');
    await mustReject('INSERT INTO private.species_mastery_outbox(catch_id) VALUES($1)',[closedToNew],'23514');
  } finally { await query('ROLLBACK'); }
  pass('Actual admission trigger blocks new work in a draining fixture; successful catch still survives');

  async function injectEventFailure() {
    await query(`CREATE FUNCTION public.familiarity_event_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'local event unavailable'; END $$;
      CREATE TRIGGER z_familiarity_event_failure AFTER INSERT ON public.species_mastery_events FOR EACH ROW EXECUTE FUNCTION public.familiarity_event_failure()`);
  }
  async function clearEventFailure() { await query('DROP TRIGGER z_familiarity_event_failure ON public.species_mastery_events; DROP FUNCTION public.familiarity_event_failure()'); }
  const retry=await catchOne();const preRetry=await snapshot();const oldEvents=await count();
  await injectEventFailure();assert(await deliver(1)===0,'Injected delivery should fail');
  let state=await value('SELECT status,attempts FROM private.species_mastery_outbox WHERE catch_id=$1',[retry]);
  assert(state.status==='pending'&&state.attempts===1&&await count()===oldEvents,'Retry state incorrect');
  await clearEventFailure();assert(await deliver(1)===1&&await count()===oldEvents+1,'Retry did not deliver once');await unchanged(preRetry);
  pass('Transient event failure preserves pending work and a later retry inserts exactly one event');
  await catchOne(true);await catchOne(true);
  const preConcurrent=await snapshot();const preConcurrentEvents=await count();
  const delivered=await Promise.all([deliver(1),db2.query('SELECT private.deliver_species_mastery_outbox(1) n').then(r=>r.rows[0].n)]);
  assert(delivered.reduce((a,b)=>a+b,0)===2&&await count()===preConcurrentEvents+2,'Concurrent delivery duplicated or lost events');
  await unchanged(preConcurrent);
  pass('Concurrent bounded delivery workers write each event once without changing gameplay rewards');
  const exhausted=await catchOne();const preExhaust=await snapshot();await injectEventFailure();
  for(let i=0;i<8;i++)assert(await deliver(1)===0,'Injected failure unexpectedly delivered');
  await clearEventFailure();state=await value('SELECT status,attempts FROM private.species_mastery_outbox WHERE catch_id=$1',[exhausted]);
  assert(state.status==='exhausted'&&state.attempts===8&&await deliver(25)===0,'Retry cap not enforced');await unchanged(preExhaust);
  pass('Eight transient failures mark work exhausted without creating events or changing the catch');
  const testRound=await round(true);
  await query(`UPDATE public.encounter_rounds SET rules=jsonb_set(rules,'{rewardMode}','"test"'::jsonb) WHERE id=$1`,[testRound]);
  await settle(testRound);const testCatch=await value('SELECT id FROM public.catches WHERE round_id=$1',[testRound]);
  assert(await deliver(1)===0,'Test-reward catch earned Familiarity');
  state=await value('SELECT status,attempts FROM private.species_mastery_outbox WHERE catch_id=$1',[testCatch.id]);
  assert(state.status==='rejected'&&state.attempts===1,'Eligibility reject state incorrect');
  pass('Event guard rejects a test-reward catch while preserving its specimen');

  await query('BEGIN');
  try {
    await query("UPDATE private.species_mastery_activation SET activated_at=clock_timestamp()+interval '1 day' WHERE singleton");
    const preCutoff=await catchOne();assert(await deliver(1)===0,'Pre-cutoff insertion earned progress');
    state=await value('SELECT status FROM private.species_mastery_outbox WHERE catch_id=$1',[preCutoff]);
    assert(state.status==='rejected','Pre-cutoff event was not rejected');
  } finally { await query('ROLLBACK'); }
  pass('Server insertion before a fixture cutoff is rejected; the cutoff fixture is rolled back');

  for(const [threshold,name] of [[12,'Specialist'],[20,'Expert']]) {
    while(await count()<threshold) { await catchOne(true);assert(await deliver(1)===1,'Tier fixture delivery failed'); }
    p=await progress();assert(p.eligible_captures===threshold&&p.tier_name===name,'Tier threshold incorrect: '+threshold);
  }
  pass('Actual progress view reaches Specialist at12 and Expert at20 eligible catches');
  await query('SET ROLE authenticated');
  try {
    await query("SELECT set_config('request.jwt.claim.sub',$1,false)",[TRAINER]);
    p=await progress();assert(p.eligible_captures===20,'Own progress not visible');
    await query("SELECT set_config('request.jwt.claim.sub','bbbbbbbb-0032-4032-8032-000000000032',false)");
    assert((await value('SELECT count(*)::int n FROM public.species_mastery_progress')).n===0,'Other trainer progress leaked');
    await mustReject('SELECT private.deliver_species_mastery_outbox(1)',[],'42501');
    await mustReject('SELECT private.reconcile_species_mastery_outbox(1)',[],'42501');
    await mustReject('DELETE FROM public.species_mastery_events',[],'42501');
  } finally { await query('RESET ROLE'); }
  pass('Security-invoker view/RLS isolate synthetic trainers; authenticated cannot deliver, reconcile or delete events');
  // Rehearse the concrete one-event proposal with fictional identities only.
  await query('BEGIN');
  try {
    const proposalCatch=await catchOne(true);
    const localRound=(await value('SELECT round_id FROM public.catches WHERE id=$1',[proposalCatch])).round_id;
    const cutoff=(await value('SELECT activated_at::text cutoff FROM private.species_mastery_activation WHERE singleton')).cutoff;
    let proposal=require('node:fs').readFileSync(require('node:path').join(__dirname,'../docs/project-command-center/evidence/familiarity-one-event-proposal.sql'),'utf8')
      .replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')
      .replaceAll('875c6f48-60b3-42c8-b540-370407839281',proposalCatch)
      .replaceAll('15372f80-c560-4486-bf68-e997a73ac2b8',TRAINER)
      .replaceAll('a4716fd6-2b68-42bf-93f7-07a75e27b2fc',localRound)
      .replaceAll('2026-10-20T16:55:59.896904Z',cutoff).replaceAll('dex=10','dex=1');
    async function rejectProposal(sql,pattern){
      await query('SAVEPOINT proposal_case');let error;
      try{await query(sql);}catch(e){error=e;}
      await query('ROLLBACK TO SAVEPOINT proposal_case');await query('RELEASE SAVEPOINT proposal_case');
      assert(error&&pattern.test(error.message),'Proposal did not reject expected condition: '+String(error));
    }
    await rejectProposal(proposal.replaceAll(TRAINER,'bbbbbbbb-0032-4032-8032-000000000032'),/QA identity changed/);
    pass('One-event proposal rejects wrong trainer before delivery');
    await query('SAVEPOINT extra_pending');await catchOne(true);
    await rejectProposal(proposal,/Pending scope changed/);await query('ROLLBACK TO SAVEPOINT extra_pending');
    pass('One-event proposal rejects additional pending scope');
    await rejectProposal(proposal.replace('c3e2401751521a93e3c98bd858e1cae9','00000000000000000000000000000000'),/Worker drift/);
    pass('One-event proposal rejects worker fingerprint drift');
    const preProposal=await snapshot(),preEvents=await count();await query(proposal);
    assert(await count()===preEvents+1,'One-event proposal count mismatch');await unchanged(preProposal);
    pass('Concrete one-event proposal delivers only expected fictional catch and preserves gameplay state');
    await rejectProposal(proposal,/Pending scope changed|Already delivered/);assert(await count()===preEvents+1,'Proposal replay added an event');
    pass('Completed one-event proposal refuses a second execution');
  } finally {await query('ROLLBACK');}
  return {events:await count(),progress:await progress(),statuses:(await query('SELECT status,count(*)::int rows,max(attempts) max_attempts FROM private.species_mastery_outbox GROUP BY status ORDER BY status')).rows,
    limitations:['Pause/resume states are local fixtures, not lifecycle operator-function tests.','auth.uid is a synthetic local claim fixture, not a real Supabase login.','No live delivery or queue modification.']};
};
