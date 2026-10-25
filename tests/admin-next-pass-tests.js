const assert=require('node:assert/strict'),fs=require('node:fs'),api=require('../js/admin-next-pass.js');
const rewards={daily:{berry:2,bait:1,coins:20},weekly:{berry:3,pokeball:5,lure:1,coins:150}};
const raw={ok:true,passRewards:rewards,unrelatedPrivateCatalog:{secret:'discard'}};
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
(async()=>{
  for(const [,sprite] of Object.values(api.items))assert(fs.existsSync('images/items/'+sprite+'.png'));assert.deepEqual(api.project(raw),rewards);assert(!JSON.stringify(api.project(raw)).includes('secret'));
  for(const v of [0,-1,1.2,2147483648,'','1e2',' 2',null,NaN,Infinity,true])assert.throws(()=>api.quantity(v));
  assert.equal(api.quantity('2147483647'),2147483647);assert.equal(api.quantity(1),1);
  for(const bag of [{},{berry:0},{berry:'1'},{unknown:1},[],null,{berry:2,extra:3}])assert.throws(()=>api.project({ok:true,passRewards:{daily:bag,weekly:rewards.weekly}}));
  for(const r of [null,{ok:false,passRewards:rewards},{ok:true,passRewards:{daily:rewards.daily}},{ok:true,passRewards:{...rewards,unknown:{coins:1}}}])assert.throws(()=>api.project(r));
  let identity='staff',actual='staff',allowed=true,calls=[];
  const a=api.adapter({identity:()=>identity,allowed:()=>allowed,session:async()=>({data:{session:{user:{id:actual}}}}),call:async(...args)=>{calls.push(args);return raw;}});
  for(const [name,args] of [['admin_overview'],['admin_content_studio',{}],['admin_save_pass_rewards',{p_daily:{coins:1}}],['admin_save_pass_rewards',{...api.payload(rewards),extra:1}]])await assert.rejects(a(name,args));
  allowed=false;await assert.rejects(a('admin_content_studio'));allowed=true;actual='other';await assert.rejects(a('admin_content_studio'));actual=identity;assert.equal(calls.length,0);
  await a('admin_save_pass_rewards',api.payload(rewards));assert.deepEqual(calls[0],['admin_save_pass_rewards',{p_daily:rewards.daily,p_weekly:rewards.weekly}]);
  const wait=deferred();const race=api.adapter({identity:()=>identity,allowed:()=>allowed,session:async()=>({data:{session:{user:{id:actual}}}}),call:()=>wait.promise});const pending=race('admin_content_studio');await Promise.resolve();actual='other';wait.resolve(raw);await assert.rejects(pending);actual='staff';
  const seen=[];const model=api.controller(async(name,args)=>{seen.push({name,args});return name==='admin_content_studio'?raw:{ok:true,passRewards:{daily:args.p_daily,weekly:args.p_weekly}};});
  await model.load();await model.save();assert.equal(seen.length,0);await model.open();assert(!model.dirty());model.state.draft.daily={coins:20,bait:1,berry:2};assert(!model.dirty());
  assert(model.add('daily','greatball'));assert.equal(model.state.draft.weekly.greatball,undefined);assert(!model.add('daily','greatball'));assert(!model.add('other','coins'));assert(!model.add('daily','unknown'));
  model.remove('daily','berry');assert.equal(model.state.draft.weekly.berry,3);assert.equal(rewards.daily.berry,2);model.edit('daily','greatball','2147483647');await model.save();assert(model.state.locked);assert(!model.dirty());assert.equal(seen.length,2);await model.save();assert.equal(seen.length,2);assert(!model.edit('weekly','coins','1'));await model.load();assert(!model.state.locked);assert(!model.dirty());
  model.state.draft.daily={coins:1};assert.throws(()=>model.remove('daily','coins'));model.edit('daily','coins','');await assert.rejects(model.save());model.discard();assert(!model.dirty());
  for(const result of [null,{ok:false},{ok:true,passRewards:rewards}]){const m=api.controller(async name=>name==='admin_content_studio'?raw:result);await m.open();m.edit('daily','coins','21');await m.save();assert(m.state.locked);assert.equal(m.state.draft.daily.coins,'21');}
  for(const code of ['42501',401,403]){const m=api.controller(async name=>{if(name==='admin_content_studio')return raw;throw Object.assign(Error('denied'),{code});});await m.open();m.edit('daily','coins','21');await m.save();assert.equal(m.state.current,null);assert.equal(m.state.draft,null);}
  const lost=api.controller(async name=>{if(name==='admin_content_studio')return raw;throw Error('lost');});await lost.open();lost.edit('daily','coins','21');await lost.save();assert(lost.state.locked);
  for(const phase of ['load','save']){const d=deferred();let count=0;const m=api.controller(async name=>{count++;return phase==='load'||name!=='admin_content_studio'?d.promise:raw;});const p=phase==='load'?m.open():(await m.open(),m.edit('daily','coins','21'),m.save());await m.load();await m.save();assert.equal(count,phase==='load'?1:2);m.reset();d.resolve(raw);await p;assert.equal(m.state.phase,'closed');assert.equal(m.state.draft,null);}
  const invalid=api.controller(async()=>({ok:true,passRewards:{daily:{extra:1},weekly:rewards.weekly}}));await invalid.open();assert.equal(invalid.state.phase,'error');assert.equal(invalid.state.draft,null);
  const shell=fs.readFileSync('js/admin-next.js','utf8'),html=fs.readFileSync('admin-next.html','utf8');assert(shell.includes('passBundles?.reset()'));assert(html.includes('id="next-pass-bundles"'));assert(html.indexOf('js/admin-next-pass.js')<html.indexOf('js/admin-next.js'));
  console.log('Pass bundles: strict projection, scope, session races, isolated drafts, single-flight, receipts, denial and stale completions passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
