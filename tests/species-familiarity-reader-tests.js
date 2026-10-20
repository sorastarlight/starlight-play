const assert = require('assert/strict');
const {create,presentation} = require('../js/species-familiarity');
const A='aaaaaaaa-0033-4033-8033-000000000033', B='bbbbbbbb-0033-4033-8033-000000000033';
function deferred() { let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}; }
function client(respond) {
  const calls=[];
  return {calls,from(table){const call={table,filters:[]};calls.push(call);return {select(columns){call.columns=columns;return this;},eq(k,v){call.filters.push([k,v]);return this;},maybeSingle(){return respond(call,calls.length);}};}};
}
const row=(dex=1,count=3,tier_level=2,tier_name='Acquainted')=>({data:{dex,eligible_captures:count,tier_level,tier_name},error:null});
const cases=[];
const test=(name,run)=>cases.push({name,run});
test('signed-out and unreleased dex requests make no read',async()=>{
  const c=client(()=>row());const store=create(c);await store.load(1);store.reset(A);
  for(const dex of [0,152,10050,NaN,'1',1.5])await store.load(dex);
  assert.equal(c.calls.length,0);assert.equal(presentation({status:'signed-out'}).label,'Sign in to view');
});
test('reads only the own-trainer species progress row and preserves server tier/count',async()=>{
  const c=client(()=>row());const store=create(c);store.reset(A);const state=await store.load(1);
  assert.deepEqual(c.calls,[{table:'species_mastery_progress',filters:[['trainer_id',A],['dex',1]],columns:'dex,eligible_captures,tier_level,tier_name'}]);
  assert.equal(presentation(state).label,'Acquainted · 3 recorded catches');
});
test('pending requests are deduplicated and completed rows cached',async()=>{
  const d=deferred(),c=client(()=>d.promise),store=create(c);store.reset(A);const one=store.load(1),two=store.load(1);assert.equal(one,two);assert.equal(store.get(1).status,'loading');d.resolve(row());await one;await store.load(1);assert.equal(c.calls.length,1);
});
test('missing delivered progress is empty, never a fabricated zero or Mastery-derived tier',async()=>{
  const c=client(()=>({data:null,error:null})),store=create(c);store.reset(A);const state=await store.load(1);assert.deepEqual(state,{status:'empty'});assert.equal(presentation(state).label,'Not recorded yet');assert(!Object.hasOwn(state,'count'));
});
test('failed reads stay unavailable and never expose database error details',async()=>{
  const c=client(()=>({data:null,error:new Error('private SQL diagnostic')})),store=create(c);store.reset(A);const state=await store.load(1);assert.equal(state.status,'unavailable');assert(!JSON.stringify(presentation(state)).includes('private SQL'));assert(!Object.hasOwn(state,'count'));
});
test('malformed or mismatched view rows fail closed',async()=>{
  for(const data of [row(2).data,row(1,-1).data,row(1,3,2,'<img onerror=alert(1)>').data,row(1,3,8,'Expert').data,{...row().data,eligible_captures:'3'}]){const store=create(client(()=>({data})));store.reset(A);assert.equal((await store.load(1)).status,'unavailable');}
});
test('late old-account success cannot replace new-account progress',async()=>{
  const old=deferred(),fresh=deferred();const c=client((_,i)=>i===1?old.promise:fresh.promise),store=create(c);store.reset(A);const p=store.load(1);store.reset(B);const q=store.load(1);fresh.resolve(row(1,20,5,'Expert'));await q;old.resolve(row());assert.equal((await p).status,'stale');assert.equal(store.get(1).tier,'Expert');assert.equal(store.get(1).count,20);
});
test('logout invalidates an in-flight read and same-user reset starts a fresh epoch',async()=>{
  const d=deferred(),c=client(()=>d.promise),store=create(c);store.reset(A);const p=store.load(1);store.reset(null);d.resolve(row());assert.equal((await p).status,'stale');assert.equal(store.get(1).status,'signed-out');store.reset(A);await store.load(1);assert.equal(c.calls.length,2);
});
test('late old-account error cannot poison the new owner cache',async()=>{
  const d=deferred(),c=client((_,i)=>i===1?d.promise:row()),store=create(c);store.reset(A);const old=store.load(1);store.reset(B);await store.load(1);d.resolve({error:new Error('old failure')});await old;assert.equal(store.get(1).status,'ready');
});
test('species are cached separately and the Kanto boundary includes Mew',async()=>{
  const c=client(call=>row(call.filters.find(([k])=>k==='dex')[1])),store=create(c);store.reset(A);await store.load(1);await store.load(151);assert.equal(c.calls.length,2);assert.equal(store.get(151).status,'ready');
});
test('all server tier names display directly and singular count is readable',async()=>{
  for(const [level,tier,count] of [[1,'Familiar',1],[2,'Acquainted',3],[3,'Experienced',6],[4,'Specialist',12],[5,'Expert',20]]){const store=create(client(()=>row(1,count,level,tier)));store.reset(A);const copy=presentation(await store.load(1));assert(copy.label.startsWith(tier));assert(copy.label.endsWith(count===1?'recorded catch':'recorded catches'));}
});
(async()=>{for(const t of cases){await t.run();console.log('PASS '+t.name);}console.log(cases.length+' LOCAL HARNESS checks passed');})().catch(e=>{console.error(e);process.exit(1);});
