const assert=require('node:assert/strict'),api=require('../js/admin-next-progression');
const cfg={xpBase:100,xpExponent:1.35,joinXp:5,catchXp:10,maxLevel:100,levelCatchBonus:false,unrelated:{preserve:true}},raw={ok:true,config:cfg};
(async()=>{
assert.deepEqual(api.project(raw),{xpBase:100,xpExponent:1.35,joinXp:5,catchXp:10});
assert.deepEqual(api.patch(api.project(raw),{xpBase:'100',xpExponent:'1.4',joinXp:'5',catchXp:'10'}),{xpExponent:1.4});
for(const [key,value]of [['xpExponent',1.351],['xpExponent',Infinity],['joinXp',-1],['catchXp',1.5],['xpBase',0]])assert.throws(()=>api.amount(value,key));
assert.throws(()=>api.patch(api.project(raw),{...api.project(raw),levelCatchBonus:true}));assert.throws(()=>api.project({ok:true,config:{joinXp:5}}));
let actor='staff-a',calls=[];const transport=api.adapter({identity:()=>actor,allowed:()=>true,session:async()=>({data:{session:{user:{id:actor}}}}),call:async(name,args)=>{calls.push({name,args});return raw;}});
await transport('admin_progression_overview');await transport('admin_progression_save',{p_balance:{joinXp:6}});assert.deepEqual(calls,[{name:'admin_progression_overview',args:undefined},{name:'admin_progression_save',args:{p_balance:{joinXp:6}}}]);
await assert.rejects(transport('admin_progression_save',{p_balance:{levelCatchBonus:true}}));await assert.rejects(transport('admin_save_game_settings',{}));assert.equal(calls.length,2);
const race=api.adapter({identity:()=>actor,allowed:()=>true,session:async()=>({data:{session:{user:{id:actor}}}}),call:async()=>{actor='staff-b';return raw;}});await assert.rejects(race('admin_progression_overview'),e=>e.code==='42501');
let resolve,reads=0,saves=0;const model=api.controller(async(name)=>{if(name==='admin_progression_overview'){reads++;return raw;}saves++;return new Promise(r=>resolve=r);});await model.open();model.state.draft.joinXp='6';const saving=model.save();await model.save();assert.equal(saves,1);model.reset();resolve({ok:true,config:{...cfg,joinXp:6}});await saving;assert.equal(model.state.phase,'closed');assert.equal(model.state.current,null);
const uncertain=api.controller(async(name)=>{if(name==='admin_progression_overview')return raw;saves++;throw Error('lost receipt');});await uncertain.open();uncertain.state.draft.catchXp='11';await uncertain.save();assert.equal(uncertain.state.uncertain,true);const before=saves;await uncertain.save();assert.equal(saves,before);assert.equal(cfg.catchXp,10);assert.deepEqual(cfg.unrelated,{preserve:true});
console.log('Progression: strict fields/ranges, partial patches, session changes, late replies, one-shot save and uncertain result passed');
})().catch(e=>{console.error(e);process.exitCode=1});
