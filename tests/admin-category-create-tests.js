const assert=require('node:assert/strict'),api=require('../js/admin-next-floors');
const id='11111111-1111-4111-8111-111111111111',existing={id,key:'supplies',name:'Supplies',blurb:'Items',kind:'coins',visible:true,system:true};
const draft=kind=>({key:'new-category',name:' New category ',blurb:'Useful items',kind});
const receipt=p=>({ok:true,categoryId:id,categories:[{...p,id,system:false}]});
(async()=>{
for(const kind of ['coins','bits','avatars']){const p=api.createPayload(draft(kind),[]).p_row;assert.deepEqual(p,{id:null,key:'new-category',name:'New category',blurb:'Useful items',kind,visible:false});}
for(const diff of [{kind:'balls'},{kind:'pass'},{kind:'other'},{key:'Has Spaces'},{key:'a'.repeat(41)},{key:''},{name:' '},{name:'a'.repeat(121)},{blurb:'a'.repeat(501)}])assert.throws(()=>api.createPayload({...draft('coins'),...diff}));
assert.throws(()=>api.createPayload({...draft('coins'),key:'supplies'},[existing]));
let calls=0;const gate=api.adapter({identity:()=>id,allowed:()=>true,session:async()=>({data:{session:{user:{id}}}}),call:async()=>{calls++;return{ok:true}}});const p=api.createPayload(draft('coins'));
await gate('admin_store_save_category',p);assert.equal(calls,1);
for(const diff of [{visible:true},{system:false},{sort:100},{kind:'pass'},{key:'a'.repeat(41)}])await assert.rejects(gate('admin_store_save_category',{p_row:{...p.p_row,...diff}}));assert.equal(calls,1);
for(const mode of ['ok','duplicate-id','visible','system','kind','key','name','lost','denied']){let saves=0;const c=api.controller(async(n,args)=>{if(n==='admin_store_get')return{ok:true,categories:mode==='duplicate-id'?[existing]:[]};saves++;if(mode==='lost')throw Error('network');if(mode==='denied')throw Object.assign(Error('denied'),{code:'42501'});const r=receipt(args.p_row);if(mode==='visible')r.categories[0].visible=true;if(mode==='system')r.categories[0].system=true;if(mode==='kind')r.categories[0].kind='pass';if(mode==='key')r.categories[0].key='wrong';if(mode==='name')r.categories[0].name='wrong';return r;});
await c.open();c.create();assert.equal(c.state.mode,'create');assert(!c.dirty());c.state.draft=draft('bits');assert(c.dirty());await c.save();await c.save();assert.equal(saves,1);
if(mode==='ok')assert.match(c.state.message,/Hidden category created/);else if(mode==='denied')assert.equal(c.state.categories,null);else assert.match(c.state.message,/uncertain/);
c.reset();assert.equal(c.state.mode,'edit');assert.equal(c.state.draft,null);
}
let resolve;const wait=new Promise(r=>resolve=r);const c=api.controller(async n=>n==='admin_store_get'?{ok:true,categories:[]}:wait);await c.open();c.create();c.state.draft=draft('coins');const pending=c.save();c.reset();resolve(receipt(p.p_row));await pending;assert.equal(c.state.phase,'closed');assert.equal(c.state.categories,null);
console.log('Category creation: typed hidden drafts, exact payloads, access adapter, strict receipts, no retries and late-account reset pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
