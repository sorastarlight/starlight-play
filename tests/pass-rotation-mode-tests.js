const assert=require('node:assert/strict'),api=require('../js/admin-reward-bundles');
const id='12121212-1212-4121-8121-121212121212',catalog=[{id:'item:figy',kind:'item',name:'Figy Berry',category:'Berries',sprite:'images/items/figy-berry.png',enabled:true,maxQuantity:100}],entry={catalogId:'item:figy',quantity:1,secret:false};
(async()=>{
 const calls=[];let resolve;
 const model=api.create(async(kind,payload)=>{calls.push({kind,payload});return kind==='read'?{revision:'r1',rotationActive:true,catalog,daily:[entry],weekly:[entry]}:new Promise(r=>resolve=r);});
 await model.load();assert.equal(model.getState().rotationActive,true);assert.throws(()=>model.reviewMode(true,'invalid'));
 model.reviewMode(false,id);const detached=model.getState();detached.review.enabled=true;const save=model.save();assert.equal(calls.at(-1).kind,'mode');assert.equal(calls.at(-1).payload.enabled,false);await assert.rejects(model.save());resolve({status:'saved',requestId:id,revision:'r2'});await save;assert.equal(model.getState().rotationActive,false);
 await model.load();model.reviewMode(false,id);const obsolete=model.save();model.reset();resolve({status:'saved',requestId:id,revision:'r2'});await obsolete;assert.equal(model.getState().phase,'closed');assert.equal(model.getState().rotationActive,false);
 console.log('Reward mode review, immutable intent, explicit transport, single-flight save and obsolete account response checks pass');
})().catch(e=>{console.error(e);process.exitCode=1;});
