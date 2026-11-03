/* Disconnected activation adapter. No page imports or transport globals. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_POKEMON_INSPECTOR_ADAPTER=api;})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';const clone=x=>JSON.parse(JSON.stringify(x)),uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
 function create({actorId,trainerId,specimenId,session,identity,allowed,call,makeId}){
  if(![actorId,trainerId,specimenId].every(uuid)||[session,identity,allowed,call,makeId].some(f=>typeof f!=='function'))throw Error('Stat adapter context is required.');
  let active=true;
  async function verify(id){if(!active||id!==actorId||identity()!==actorId||allowed(trainerId)!==true)return false;const s=await session();return active&&identity()===actorId&&allowed(trainerId)===true&&!s?.error&&s?.data?.session?.user?.id===actorId;}
  const denied=()=>Object.assign(Error('Staff session or selected trainer changed.'),{code:'42501'});
  function bind(a){if(!a||a.actorId!==actorId||a.trainerId!==trainerId||a.specimenId!==specimenId)throw denied();}
  async function dispatch(name,args,write=false){if(await verify(actorId)!==true)throw denied();const result=await call(name,clone(args));if(await verify(actorId)!==true)throw Object.assign(Error(write?'The correction result needs inspection.':'Staff session changed.'),write?{dispatched:true}:{code:'42501'});return clone(result);}
  function receipt(r){if(!r||!uuid(r.id)||r.trainerId!==trainerId||r.specimenId!==specimenId||!['applied','reversed','reversal'].includes(r.status)||typeof r.beforeRevision!=='string'||typeof r.afterRevision!=='string'||!Array.isArray(r.changes)||r.changes.length>14)throw Error('Correction history unavailable.');const fields=new Set(['level','nature_id',...['iv','ev'].flatMap(k=>['hp','atk','def','spa','spd','spe'].map(v=>k+'_'+v))]),seen=new Set();for(const c of r.changes){if(!fields.has(c.field)||seen.has(c.field)||!Number.isSafeInteger(c.before)||!Number.isSafeInteger(c.after))throw Error('Correction history unavailable.');seen.add(c.field);}return Object.fromEntries(['id','status','trainerId','specimenId','beforeRevision','afterRevision','changes','reason','createdAt','reversesReceiptId','actorId','requestChanges'].filter(k=>r[k]!==undefined).map(k=>[k,clone(r[k])]));}
  return Object.freeze({actorId,makeId,verify,
   async load(a){bind(a);const r=await dispatch('admin_trainer_pokemon_stats_read',{p_owner:trainerId,p_id:specimenId});if(r.trainerId!==trainerId||r.specimenId!==specimenId||r.canCorrect!==true||r.protected!==false||r.ownershipCurrent!==true||r.trading!==false)throw denied();return r;},
   async submit(r){if(!r||r.trainerId!==trainerId||r.specimenId!==specimenId||!uuid(r.requestId)||Object.keys(r).some(k=>!['trainerId','specimenId','expectedRevision','requestId','reason','changes','reversesReceiptId'].includes(k)))throw denied();return dispatch('admin_trainer_pokemon_stats_write',{p_intent:r},true);},
   async readReceipt(a){bind(a);if(a.receiptId!==null&&!uuid(a.receiptId))throw Error('Invalid correction reference.');const r=await dispatch('admin_trainer_pokemon_stats_receipt',{p_owner:trainerId,p_id:specimenId,p_receipt:a.receiptId});if(a.receiptId===null){if(r.trainerId!==trainerId||r.specimenId!==specimenId||!Array.isArray(r.rows)||r.rows.length>10)throw Error('Correction history unavailable.');const rows=r.rows.map(receipt);if(new Set(rows.map(x=>x.id)).size!==rows.length)throw Error('Correction history unavailable.');return{trainerId,specimenId,rows};}const item=receipt(r);if(item.id!==a.receiptId)throw Error('Correction reference changed.');return item;},
   reset(){active=false;}
  });
 }
 return Object.freeze({create});
});
