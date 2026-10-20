/* SYNTHETIC SDK/RPC contracts. Real SQL is covered by the local PG rehearsal. */
const assert=require('assert/strict');
const {createController}=require('../supabase/unapplied/account-link-policy/verified-disconnect-controller');
let n=0;async function test(name,fn){await fn();n++;console.log('PASS '+name);}
function fixture(options={}){
 const s={actor:'trainer-a',authActor:'trainer-a',present:true,unlinkCalls:[],calls:[],saved:null,finishThrows:0};
 const auth={
  async getUser(){return {data:{user:{id:s.authActor}}};},
  async getUserIdentities(){if(options.onIdentities)options.onIdentities(s);return options.identitiesError?{error:Error('Offline')}:{data:{identities:[{id:'email-id',provider:'email'},{id:'twitch-id',provider:options.wrongProvider?'email':'twitch'}]}};},
  async unlinkIdentity(identity){s.unlinkCalls.push(identity);if(options.onUnlink)await options.onUnlink(s);if(!options.keepProvider)s.present=false;if(options.unlinkThrows)throw Error('Network response lost');return {error:options.unlinkError?Error('Rejected'):null};}
 };
 const call=async(name,p)=>{
  s.calls.push(name);
  if(name==='play_prepare_twitch_disconnect'){
   s.saved={state:'prepared',requestUuid:p.p_request_uuid,identityId:'twitch-id',twitchId:p.p_twitch_user_id,expiresAt:options.expiry||new Date(Date.now()+600000).toISOString()};
   if(options.onPrepare)options.onPrepare(s);
   return options.wrongReceipt?{...s.saved,requestUuid:'foreign'}:s.saved;
  }
  if(name==='play_twitch_disconnect_state')return s.saved||{state:'none'};
  if(name==='play_finish_twitch_disconnect'){
   if(s.finishThrows-->0)throw Error('RPC unavailable');
   return {state:options.badFinish?'unexpected':s.present?'awaitingProvider':'completed',requestUuid:p.p_request_uuid};
  }
  if(name==='play_cancel_twitch_disconnect')return {state:s.present?'cancelled':'needsReconciliation',requestUuid:p.p_request_uuid};
  throw Error('Unexpected RPC');
 };
 const dependencies={call,auth,actorId:()=>s.actor,uuid:()=> '11111111-1111-4111-8111-111111111111'};
 return {s,controller:createController(dependencies),dependencies};
}
async function main(){
 await test('Confirmation required before provider removal',async()=>{const {s,controller:c}=fixture();await c.prepare('101');assert.equal((await c.execute(false)).state,'confirmationRequired');assert.equal(s.unlinkCalls.length,0);});
 await test('Supported API removes exact Twitch identity then verifies completion',async()=>{const {s,controller:c}=fixture();await c.prepare('101');assert.equal((await c.execute(true)).state,'completed');assert.deepEqual(s.unlinkCalls.map(x=>x.id),['twitch-id']);assert.equal(s.calls.at(-1),'play_finish_twitch_disconnect');});
 await test('Wrong account from Auth cannot start RPC',async()=>{const {s,controller:c}=fixture();s.authActor='trainer-b';assert.equal((await c.prepare('101')).state,'accountChanged');assert.equal(s.calls.length,0);});
 await test('Stale prepare response cannot target new account',async()=>{const {s,controller:c}=fixture({onPrepare:s=>{s.actor='trainer-b';s.authActor='trainer-b';}});assert.equal((await c.prepare('101')).state,'accountChanged');assert.equal((await c.execute(true)).state,'noPendingRequest');assert.equal(s.unlinkCalls.length,0);});
 await test('Account switch after identity lookup prevents unlink',async()=>{const {s,controller:c}=fixture({onIdentities:s=>{s.actor='trainer-b';s.authActor='trainer-b';}});await c.prepare('101');assert.equal((await c.execute(true)).state,'accountChanged');assert.equal(s.unlinkCalls.length,0);});
 await test('Email identity cannot be unlinked as Twitch',async()=>{const {s,controller:c}=fixture({wrongProvider:true});await c.prepare('101');assert.equal((await c.execute(true)).state,'retry');assert.equal(s.unlinkCalls.length,0);});
 await test('Uncertain provider response reconciles actual server absence',async()=>{const {s,controller:c}=fixture({unlinkThrows:true});await c.prepare('101');assert.equal((await c.execute(true)).state,'completed');assert.equal(s.unlinkCalls.length,1);});
 await test('Provider error with identity still present never claims completion',async()=>{const {s,controller:c}=fixture({keepProvider:true,unlinkError:true});await c.prepare('101');assert.equal((await c.execute(true)).state,'retry');assert.equal(s.present,true);});
 await test('Retry after lost response reconciles without second mutation',async()=>{const {s,controller:c}=fixture();await c.prepare('101');s.present=false;assert.equal((await c.execute(true)).state,'completed');assert.equal(s.unlinkCalls.length,0);});
 await test('Malformed receipt rejected before provider API',async()=>{const {s,controller:c}=fixture({wrongReceipt:true});await assert.rejects(()=>c.prepare('101'));assert.equal(s.unlinkCalls.length,0);});
 await test('Invalid expiry rejected before provider API',async()=>{const {s,controller:c}=fixture({expiry:'bad-time'});await assert.rejects(()=>c.prepare('101'));assert.equal(s.unlinkCalls.length,0);});
 await test('Expired review cannot start provider mutation',async()=>{const {s,controller:c}=fixture({expiry:new Date(Date.now()-1).toISOString()});await c.prepare('101');assert.equal((await c.execute(true)).state,'expired');assert.equal(s.unlinkCalls.length,0);});
 await test('SDK lookup failure preserves retryable request',async()=>{const {s,controller:c}=fixture({identitiesError:true});await c.prepare('101');assert.equal((await c.execute(true)).state,'retry');assert.equal(s.unlinkCalls.length,0);});
 await test('Server RPC failure preserves request for safe reconciliation',async()=>{const {s,controller:c}=fixture();await c.prepare('101');s.finishThrows=1;await assert.rejects(()=>c.execute(true));s.present=false;assert.equal((await c.execute(true)).state,'completed');assert.equal(s.unlinkCalls.length,0);});
 await test('Unexpected finish response cannot trigger provider operation',async()=>{const {s,controller:c}=fixture({badFinish:true});await c.prepare('101');await assert.rejects(()=>c.execute(true));assert.equal(s.unlinkCalls.length,0);});
 await test('Cancellation after provider removal reconciles instead',async()=>{const {s,controller:c}=fixture();await c.prepare('101');s.present=false;assert.equal((await c.cancel()).state,'completed');assert.equal(s.unlinkCalls.length,0);});
 await test('Refresh can resume own durable pending request',async()=>{const {s,controller:c,dependencies}=fixture();await c.prepare('101');const next=createController(dependencies);assert.equal((await next.resume()).state,'review');assert.equal((await next.execute(true)).state,'completed');assert.equal(s.unlinkCalls.length,1);});
 await test('Reset discards old account operation',async()=>{const {s,controller:c}=fixture();await c.prepare('101');c.reset();assert.equal((await c.execute(true)).state,'noPendingRequest');assert.equal(s.unlinkCalls.length,0);});
 await test('Concurrent confirmations perform one provider mutation',async()=>{let release,entered;const gate=new Promise(r=>{release=r;});const started=new Promise(r=>{entered=r;});const {s,controller:c}=fixture({onUnlink:async()=>{entered();await gate;}});await c.prepare('101');const first=c.execute(true);await started;assert.equal((await c.execute(true)).state,'busy');release();assert.equal((await first).state,'completed');assert.equal(s.unlinkCalls.length,1);});
 console.log(`${n} SYNTHETIC SDK/RPC contract checks passed; no real Auth/provider calls`);
}
main().catch(e=>{console.error(e);process.exit(1);});
