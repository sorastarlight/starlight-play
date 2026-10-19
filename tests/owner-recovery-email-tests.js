const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const {createRecoveryHandler,RESET_DESTINATION}=await import(pathToFileURL(path.resolve('supabase/functions/owner-recovery-email/handler.mjs')));
 const target='aaaaaaaa-0000-4000-8000-000000000001',id='bbbbbbbb-0000-4000-8000-000000000001',revision='a'.repeat(64);
 let count=0;const check=async(name,fn)=>{await fn();count++;console.log('PASS '+name)};
 function fixture(opts={}){const calls=[];let attempts=0;
  const handler=createRecoveryHandler({caller:()=>({auth:{getUser:async()=>opts.signedOut?{error:{}}:{data:{user:{id:'owner'}}}},rpc:async(name,args)=>{
   calls.push(name);if(name.endsWith('_gate'))return opts.denied?{error:{}}:{data:{enabled:!opts.disabled}};
   if(name.endsWith('_prepare'))return {data:{state:'prepared',targetUuid:target,challengeId:id,snapshotRevision:revision,maskedDestination:'t•••@•••'}};
   if(name.endsWith('_reserve'))return {data:opts.reserve||{dispatch:true,receiptId:id,state:'dispatching'}};throw Error('unexpected');
  }}),adminUser:async()=>{calls.push('admin');return {data:{user:{id:opts.mismatch?'other':target,email:'trainer@private.invalid',email_confirmed_at:opts.unverified?null:'verified'}}}},
  revision:async()=>revision,send:async(email,url)=>{attempts++;assert.equal(email,'trainer@private.invalid');assert.equal(url,RESET_DESTINATION);if(opts.throwSend)throw Error('private provider error');return opts.sendResult||{}},
  finish:async(_id,state)=>{calls.push(state);if(opts.finishError)throw Error('db failure');return {}}});
  const request=async(overrides={})=>{const body={action:'send',targetUuid:target,requestUuid:id,challengeId:id,snapshotRevision:revision,reason:'Requested help',...overrides};
   const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{authorization:'Bearer synthetic',origin:'https://play.sorastarlight.net'},body:JSON.stringify(body)}));
   return {status:response.status,data:await response.json()};};return {calls,request,attempts:()=>attempts,handler};}
 await check('Non-owner/stale caller denied before Auth Admin',async()=>{const f=fixture({denied:true});assert.equal((await f.request()).status,403);assert(!f.calls.includes('admin'));assert.equal(f.attempts(),0)});
 await check('Signed-out caller denied',async()=>{const f=fixture({signedOut:true});assert.equal((await f.request()).status,401);assert.equal(f.attempts(),0)});
 await check('Disabled configuration never resolves destination or sends',async()=>{const f=fixture({disabled:true});assert.equal((await f.request()).data.state,'disabled');assert(!f.calls.includes('admin'));assert.equal(f.attempts(),0)});
 await check('Only the existing verified destination is eligible',async()=>{for(const opts of [{unverified:true},{mismatch:true}]){const f=fixture(opts);assert.notEqual((await f.request()).status,200);assert.equal(f.attempts(),0)}});
 await check('Prepare returns masked confirmation and never dispatches',async()=>{const f=fixture();const r=await f.request({action:'prepare'});assert.equal(r.data.state,'prepared');assert(!JSON.stringify(r).includes('private.invalid'));assert.equal(f.attempts(),0)});
 await check('Stale revision rejected before reservation',async()=>{const f=fixture();assert.equal((await f.request({snapshotRevision:'other'})).status,409);assert.equal(f.attempts(),0);assert(!f.calls.some(x=>x.endsWith('_reserve')))});
 await check('Empty reason and malformed request IDs rejected',async()=>{for(const overrides of [{reason:''},{requestUuid:'bad'},{challengeId:'bad'},{caseRef:42}]){const f=fixture();assert.equal((await f.request(overrides)).status,409);assert.equal(f.attempts(),0)}});
 await check('Replay, cooldown and uncertain receipts never dispatch',async()=>{for(const state of ['accepted','failed','uncertain','limited']){const f=fixture({reserve:{state,dispatch:false}});assert.equal((await f.request()).data.state,state);assert.equal(f.attempts(),0)}});
 await check('Provider acceptance is distinct from delivered',async()=>{const f=fixture();const r=await f.request({redirectTo:'https://evil.invalid',email:'evil@evil.invalid'});assert.equal(r.data.state,'accepted');assert.equal(f.attempts(),1);assert(f.calls.indexOf('owner_recovery_email_reserve')<f.calls.indexOf('accepted'));assert(!JSON.stringify(r).includes('private.invalid'))});
 await check('Definitive provider rejection recorded as failed',async()=>{const f=fixture({sendResult:{error:{status:429,message:'secret'}}});assert.equal((await f.request()).data.state,'failed');assert(f.calls.includes('failed'))});
 await check('Timeout and 5xx are uncertain, not retried',async()=>{for(const opts of [{throwSend:true},{sendResult:{error:{status:503}}}]){const f=fixture(opts);assert.equal((await f.request()).data.state,'uncertain');assert.equal(f.attempts(),1)}});
 await check('Failed receipt finalization never claims success',async()=>{const f=fixture({finishError:true});assert.equal((await f.request()).data.state,'uncertain');assert.equal(f.attempts(),1)});
 await check('Cross-origin and GET requests cannot send',async()=>{const f=fixture();for(const opts of [{method:'GET'},{method:'POST',headers:{origin:'https://evil.invalid'}}]){const response=await f.handler(new Request('https://fixture.invalid',opts));assert(response.status>=400)}assert.equal(f.attempts(),0)});
 console.log(`${count} synthetic recovery-email checks passed; no hosted mail`);
})().catch(e=>{console.error(e);process.exitCode=1});
