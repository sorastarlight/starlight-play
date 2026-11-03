/* Disconnected recovery review. A future server must load its own immutable receipt. */
(function(root,factory){
 const planner=typeof module==='object'&&module.exports?require('./admin-pokemon-correction-plan.js'):root.PLAY_POKEMON_CORRECTION_PLAN;
 const api=factory(planner);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_POKEMON_CORRECTION_RECOVERY=api;
})(typeof window==='undefined'?globalThis:window,planner=>{
 'use strict';
 const fields=new Set(['level','nature_id','iv_hp','iv_atk','iv_def','iv_spa','iv_spd','iv_spe','ev_hp','ev_atk','ev_def','ev_spa','ev_spd','ev_spe']);
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 function prepare(current,receipt,reason,requestId){
  if(!object(receipt)||receipt.status!=='applied'||typeof receipt.id!=='string'||!receipt.id.trim()||
     !current||receipt.trainerId!==current.trainerId||receipt.specimenId!==current.specimenId||
     typeof receipt.beforeRevision!=='string'||!receipt.beforeRevision.trim()||
     typeof receipt.afterRevision!=='string'||!receipt.afterRevision.trim()||
     receipt.beforeRevision===receipt.afterRevision||current.revision!==receipt.afterRevision){
   throw Error('This correction cannot be reversed from the current record. Reload its history.');
  }
  if(!Array.isArray(receipt.changes)||!receipt.changes.length||receipt.changes.length>fields.size)throw Error('The original correction details are unavailable.');
  const changes={},seen=new Set();
  for(const change of receipt.changes){
   if(!object(change)||!fields.has(change.field)||seen.has(change.field)||
      !Number.isSafeInteger(change.before)||!Number.isSafeInteger(change.after)||change.before===change.after||
      !object(current.values)||current.values[change.field]!==change.after){
    throw Error('The Pokémon no longer matches the original correction. Reload its history.');
   }
   seen.add(change.field);changes[change.field]=change.before;
  }
  const plan=planner.prepare(current,changes,reason,requestId);
  return {...plan,reversesReceiptId:receipt.id,requiresOriginalServerReceipt:true,restoresAuditedBeforeImage:true,requiresUnchangedAfterRevision:true};
 }
 return Object.freeze({prepare});
});
