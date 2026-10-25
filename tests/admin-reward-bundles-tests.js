const assert=require('node:assert/strict'),api=require('../js/admin-reward-bundles.js');
const id='11111111-1111-4111-8111-111111111111';
const master={id:'item:masterball',kind:'item',name:'Master Ball',category:'Balls',sprite:'images/items/master-ball.png',enabled:true,maxQuantity:100};
const entry={catalogId:master.id,quantity:1,secret:true};
const snapshot={revision:'r1',catalog:[master],daily:[entry],weekly:[entry]};
(async()=>{
 let saves=0,resolveSave;const model=api.create(async(kind,payload)=>kind==='read'?structuredClone(snapshot):(saves++,new Promise(r=>resolveSave=()=>r({status:'saved',requestId:payload.requestId,revision:'r2'}))));
 await model.load();assert.equal(model.getState().phase,'ready');model.add('weekly',{...entry,quantity:2});assert.equal(model.getState().daily.length,1);assert.equal(model.getState().weekly.length,2);
 assert.throws(()=>model.add('weekly',{...entry,quantity:100}));assert.equal(model.getState().weekly.length,2);
 assert.throws(()=>model.remove('monthly',0));assert.throws(()=>model.replace('weekly',99,entry));
 const detached=model.getState();detached.daily[0].quantity=99;assert.equal(model.getState().daily[0].quantity,1);
 const review=model.review(id);review.daily.rewards[0].quantity=50;assert.equal(model.getState().review.daily.rewards[0].quantity,1);assert.throws(()=>model.add('daily',entry));model.cancel();
 model.remove('daily',0);assert.throws(()=>model.review(id));model.add('daily',entry);model.review(id);
 const saving=model.save();await assert.rejects(model.save());assert.equal(saves,1);resolveSave();await saving;assert.equal(model.getState().phase,'saved');
 const bad=api.create(async kind=>kind==='read'?snapshot:{status:'saved',requestId:'wrong',revision:'r2'});await bad.load();bad.review(id);await bad.save();assert.equal(bad.getState().phase,'uncertain');await assert.rejects(bad.save());
 let resolve;const stale=api.create(()=>new Promise(r=>resolve=r));const loading=stale.load();stale.reset();resolve(snapshot);await loading;assert.equal(stale.getState().phase,'closed');assert.equal(stale.getState().catalog.length,0);
 const denied=api.create(async()=>{throw Error('Access denied');});await denied.load();assert.equal(denied.getState().phase,'error');assert.equal(denied.getState().catalog.length,0);
 console.log('Typed Pass drafts: independent lists, Master Ball eligibility, aggregate limits, immutable review, single-flight receipts, uncertain result and account reset pass.');
})().catch(e=>{console.error(e);process.exitCode=1;});
