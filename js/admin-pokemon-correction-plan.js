/* Disconnected correction planner. No transport, page import, grants or stat formula. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_POKEMON_CORRECTION_PLAN=api;})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),clone=x=>JSON.parse(JSON.stringify(x));
 const keys=new Set(['level','nature_id','iv_hp','iv_atk','iv_def','iv_spa','iv_spd','iv_spe','ev_hp','ev_atk','ev_def','ev_spa','ev_spd','ev_spe']);
 const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
 function prepare(snapshot,changes,reason,requestId){
  if(!object(snapshot)||!uuid(snapshot.trainerId)||!uuid(snapshot.specimenId)||!uuid(requestId)||typeof snapshot.revision!=='string'||!snapshot.revision.trim())throw Error('Reload the Pokemon record.');
  if(snapshot.canCorrect!==true||snapshot.protected!==false||snapshot.ownershipCurrent!==true||snapshot.trading!==false)throw Error('This Pokemon cannot be corrected.');
  if(snapshot.hiddenAbility!==false)throw Error('Hidden-ability records need a separate integrity review.');
  if(!object(snapshot.values)||!object(snapshot.constraints)||!object(changes)||!Object.keys(changes).length)throw Error('Choose a supported correction.');
  if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>500)throw Error('Enter a staff reason between 3 and 500 characters.');
  const after=clone(snapshot.values),diff=[];
  for(const [key,value]of Object.entries(changes)){
   if(!keys.has(key)||!Object.hasOwn(snapshot.values,key)||!Object.hasOwn(snapshot.constraints,key))throw Error('This field is unavailable for correction.');
   const rule=snapshot.constraints[key];
   if(!object(rule)||rule.editable!==true)throw Error('This field is read only.');
   if(key==='nature_id'){
    if(!Array.isArray(rule.allowed)||!rule.allowed.length||!rule.allowed.every(x=>Number.isSafeInteger(x)&&x>0)||!Number.isSafeInteger(value)||!rule.allowed.includes(value))throw Error('Choose a supported nature.');
   }else if(!Number.isSafeInteger(rule.min)||!Number.isSafeInteger(rule.max)||rule.min>rule.max||!Number.isSafeInteger(value)||value<rule.min||value>rule.max)throw Error('Enter a value within the recorded limits.');
   if(value!==snapshot.values[key]){after[key]=value;diff.push({field:key,before:snapshot.values[key],after:value});}
  }
  if(Object.hasOwn(changes,'level')&&(!Number.isInteger(snapshot.minimumMoveLevel)||snapshot.minimumMoveLevel<1||snapshot.minimumMoveLevel>100||after.level<snapshot.minimumMoveLevel))throw Error('The current moves do not support this level, or their limits are unavailable.');
  if(!diff.length)throw Error('No values have changed.');
  if(Object.keys(changes).some(k=>k.startsWith('ev_'))){
   const evKeys=['ev_hp','ev_atk','ev_def','ev_spa','ev_spd','ev_spe'];
   if(!Number.isSafeInteger(snapshot.evTotalLimit)||snapshot.evTotalLimit<0||evKeys.some(k=>!Number.isSafeInteger(after[k])||after[k]<0)||evKeys.reduce((n,k)=>n+after[k],0)>snapshot.evTotalLimit)throw Error('The combined training values exceed the recorded limit or are unavailable.');
  }
  return {trainerId:snapshot.trainerId,specimenId:snapshot.specimenId,expectedRevision:snapshot.revision,requestId,reason:reason.trim(),changes:clone(changes),review:diff,after,requiresServerRecalculation:true,requiresIntegrityAuthorization:true};
 }
 return Object.freeze({prepare});
});
