/* Staged controller: NOT loaded by production pages. Uses supported Auth API,
 * no password/token access, and server-observed absence before app finalization. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.playVerifiedTwitchDisconnect=api;})(globalThis,function(){
 'use strict';
 function createController({call,auth,actorId,uuid=()=>globalThis.crypto.randomUUID()}){
  let generation=0,pending=null,busy=false,boundActor=actorId();
  function reset(){generation++;pending=null;busy=false;}
  function syncActor(){const next=actorId();if(next!==boundActor){reset();boundActor=next;}}
  function same(op){return op.generation===generation&&op.actor===actorId();}
  async function current(op){if(!same(op))return false;const r=await auth.getUser();return !r.error&&r.data?.user?.id===op.actor&&same(op);}
  function stale(){return {state:'accountChanged',message:'The signed-in account changed. Start again.'};}
  function receipt(result,op){
   if(result?.requestUuid!==op.id||!['prepared','completed','cancelled'].includes(result.state))throw Error('Could not verify the disconnect request.');
   if(result.state==='prepared'&&(typeof result.identityId!=='string'||!result.identityId||!Number.isFinite(Date.parse(result.expiresAt))))throw Error('Could not verify the Twitch identity.');
   return {...op,...result};
  }
  async function resume(){
   syncActor();
   if(busy)return {state:'busy'};
   const op={actor:actorId(),generation};if(!op.actor)return {state:'signInRequired'};
   busy=true;
   try{
    if(!await current(op))return stale();
    const r=await call('play_twitch_disconnect_state',{});
    if(!same(op))return stale();
    if(r?.state==='none'){pending=null;return {state:'none'};}
    if(typeof r?.requestUuid!=='string'||!r.requestUuid||typeof r.twitchId!=='string'||!r.twitchId)throw Error('Could not recover the pending disconnect.');
    const verified=receipt(r,{...op,id:r.requestUuid,twitchId:r.twitchId});
    if(r.state!=='prepared')throw Error('Could not recover the pending disconnect.');
    pending=Object.freeze(verified);
    return {state:'review',requestUuid:r.requestUuid,twitchId:r.twitchId,expiresAt:r.expiresAt};
   }finally{if(same(op))busy=false;}
  }
  async function prepare(twitchId){
   syncActor();
   if(busy)return {state:'busy'};
   const actor=actorId();if(!actor)return {state:'signInRequired'};
   if(pending)return {state:'pending',requestUuid:pending.id};
   const op={actor,generation,id:uuid(),twitchId:String(twitchId)};
   busy=true;
   try{
    if(!await current(op))return stale();
    const r=await call('play_prepare_twitch_disconnect',{p_twitch_user_id:op.twitchId,p_request_uuid:op.id});
    if(!same(op))return stale();
    const verified=receipt(r,op);
    if(r.state!=='prepared')return {state:r.state,requestUuid:op.id};
    pending=Object.freeze(verified);
    return {state:'review',requestUuid:op.id,twitchId:op.twitchId,expiresAt:r.expiresAt};
   }finally{if(same(op))busy=false;}
  }
  async function finish(op){
   if(!await current(op))return stale();
   const r=await call('play_finish_twitch_disconnect',{p_request_uuid:op.id});
   if(!same(op))return stale();
   if(r?.requestUuid!==op.id||!['completed','awaitingProvider'].includes(r.state))throw Error('The disconnect outcome could not be verified. Retry this request.');
   if(r.state==='completed')pending=null;
   return r;
  }
  async function execute(confirmed){
   syncActor();
   if(busy)return {state:'busy'};
   const op=pending;if(!op)return {state:'noPendingRequest'};
   if(confirmed!==true)return {state:'confirmationRequired'};
   busy=true;
   try{
    // Reconcile first so a retry never repeats a completed provider mutation.
    let outcome=await finish(op);if(outcome.state!=='awaitingProvider')return outcome;
    if(Date.parse(op.expiresAt)<=Date.now())return {state:'expired',requestUuid:op.id,message:'Cancel this request and start again.'};
    const ids=await auth.getUserIdentities();
    if(!await current(op))return stale();
    if(ids.error)return {state:'retry',requestUuid:op.id,message:'Could not verify your sign-in methods. Retry this request.'};
    const target=ids.data?.identities?.find(i=>i.id===op.identityId&&i.provider==='twitch');
    if(!target)return {state:'retry',requestUuid:op.id,message:'The Twitch identity could not be verified. Retry this request.'};
    try{await auth.unlinkIdentity(target);}catch(_){/* outcome reconciled server-side below */}
    outcome=await finish(op);
    if(outcome.state==='awaitingProvider')return {state:'retry',requestUuid:op.id,message:'Twitch is still connected. Retry or cancel this request.'};
    return outcome;
   }finally{if(same(op))busy=false;}
  }
  async function cancel(){
   syncActor();
   if(busy)return {state:'busy'};
   const op=pending;if(!op)return {state:'noPendingRequest'};
   busy=true;
   try{
    if(!await current(op))return stale();
    const r=await call('play_cancel_twitch_disconnect',{p_request_uuid:op.id});
    if(!same(op))return stale();
    if(r?.requestUuid!==op.id||!['completed','cancelled','needsReconciliation'].includes(r.state))throw Error('Could not verify the cancellation.');
    if(r.state==='needsReconciliation')return await finish(op);
    pending=null;return r;
   }finally{if(same(op))busy=false;}
  }
  return {prepare,execute,cancel,resume,reset};
 }
 return {createController};
});
