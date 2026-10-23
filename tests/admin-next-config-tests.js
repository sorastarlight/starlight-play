const assert=require("node:assert/strict"),api=require("../js/admin-next-config.js");
const values={participationReward:25,captureReward:25,newDexReward:100,shinyReward:250,legendaryReward:350,streamAttendanceReward:50};
const response={ok:true,config:{...values,dailySupply:{coins:99},firstFemaleReward:88,unknownFutureField:{keep:true}},circulation:123};
const deferred=()=>{let resolve;return {promise:new Promise(done=>resolve=done),resolve};};
(async()=>{
  assert.deepEqual(api.project(response),values);assert(!JSON.stringify(api.project(response)).includes("unknownFuture"));
  for(const value of [-1,1.5,NaN,Infinity,"25",null,2147483648])assert.throws(()=>api.amount(value));assert.equal(api.amount(0),0);
  for(const raw of [null,{ok:false,config:values},{ok:true,config:{}},{ok:true,config:{...values,shinyReward:null}}])assert.throws(()=>api.project(raw));
  const draft=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,String(value)]));draft.participationReward="0";
  assert.deepEqual(api.patch(values,draft),{participationReward:0});assert.equal(response.config.unknownFutureField.keep,true);
  assert.throws(()=>api.patch(values,{...draft,unknownFutureField:1}));for(const bad of ["","-1","1.5","1e2","Infinity","2147483648"])assert.throws(()=>api.patch(values,{...draft,captureReward:bad}));
  let id="staff",actual="staff",allowed=true;const calls=[];
  const read=api.adapter({identity:()=>id,allowed:()=>allowed,session:async()=>({data:{session:{user:{id:actual}}}}),call:async(...args)=>{calls.push(args);return response;}});
  await assert.rejects(read("admin_overview"));await assert.rejects(read("admin_economy_save",{p_balance:{dailySupply:{coins:1}}}));await assert.rejects(read("admin_economy_save",{p_balance:{captureReward:-1}}));await assert.rejects(read("admin_economy_save",{p_balance:{}}));assert.equal(calls.length,0);
  allowed=false;await assert.rejects(read("admin_economy_overview"));allowed=true;actual="other";await assert.rejects(read("admin_economy_overview"));actual=id;
  await read("admin_economy_save",{p_balance:{participationReward:0}});assert.deepEqual(calls[0],["admin_economy_save",{p_balance:{participationReward:0}}]);
  const identityWait=deferred();const identityRace=api.adapter({identity:()=>id,allowed:()=>allowed,session:async()=>({data:{session:{user:{id:actual}}}}),call:()=>identityWait.promise});const identityPending=identityRace("admin_economy_overview");await Promise.resolve();actual="other";identityWait.resolve(response);await assert.rejects(identityPending);actual=id;
  const recorded=[];const model=api.controller(async(command,args)=>{recorded.push({command,args});return command==="admin_economy_save"?{ok:true,config:{...values,...args.p_balance}}:response;});
  await model.save();assert.equal(recorded.length,0);await model.open();model.state.draft.participationReward="0";assert(model.dirty());await model.save();assert.deepEqual(recorded[1].args,{p_balance:{participationReward:0}});assert(model.state.uncertain);await model.save();assert.equal(recorded.length,2);await model.load();assert(!model.state.uncertain);assert(!model.dirty());
  let lateReads=0;const wait=deferred(),late=api.controller(()=>{lateReads++;return wait.promise;});const pending=late.open();await late.load();assert.equal(lateReads,1);late.reset();wait.resolve(response);await pending;assert.equal(late.state.current,null);assert.equal(late.state.phase,"closed");
  const saveWait=deferred(),saveRace=api.controller(async name=>name==="admin_economy_overview"?response:saveWait.promise);await saveRace.open();saveRace.state.draft.captureReward="26";const oldSave=saveRace.save();saveRace.reset();saveWait.resolve({ok:true,config:{...values,captureReward:26}});await oldSave;assert.equal(saveRace.state.phase,"closed");assert.equal(saveRace.state.draft,null);
  for(const receipt of [null,{ok:false},{ok:true,config:values}]){const uncertain=api.controller(async name=>name==="admin_economy_overview"?response:receipt);await uncertain.open();uncertain.state.draft.captureReward="26";await uncertain.save();assert(uncertain.state.uncertain);assert.equal(uncertain.state.draft.captureReward,"26");}
  const denied=api.controller(async name=>{if(name==="admin_economy_overview")return response;throw Object.assign(Error("fictional denied"),{code:"42501"});});await denied.open();denied.state.draft.captureReward="26";await denied.save();assert.equal(denied.state.phase,"error");assert.equal(denied.state.current,null);assert.equal(denied.state.draft,null);
  const lost=api.controller(async name=>{if(name==="admin_economy_overview")return response;throw Error("fictional lost receipt");});await lost.open();lost.state.draft.captureReward="26";await lost.save();assert(lost.state.uncertain);
  const error=api.controller(async()=>({ok:true,config:{...values,captureReward:null}}));await error.open();assert.equal(error.state.phase,"error");assert.equal(error.state.draft,null);
  console.log("Reward editor: selected projections, strict fields/amounts/session/transport, exact changed-key payload, single flight, stale reset, receipt/denial and no write retry pass.");
})().catch(error=>{console.error(error);process.exitCode=1;});
