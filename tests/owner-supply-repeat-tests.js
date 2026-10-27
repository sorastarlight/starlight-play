const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
(async()=>{
let now=100000,callback=null,calls=[],wallet={ownerRepeat:true,ownerOakNextAt:new Date(now+30000).toISOString()},host={innerHTML:'',hidden:false,addEventListener(){}};
const FakeDate=class extends Date{static now(){return now;}};
const root={},context={window:root,Date:FakeDate,setTimeout:fn=>(callback=fn,1),clearTimeout:()=>{callback=null;}};
vm.runInNewContext(fs.readFileSync('js/oak-daily.js','utf8'),context);
const api=root.PLAY_OAK_DAILY.create({host,client:{auth:{getUser:async()=>({data:{user:{id:'fictional'}}})}},call:async name=>{calls.push(name);return name==='play_store'?{wallet}:{ownerRepeat:true,nextClaimAt:new Date(now+30000).toISOString(),grants:{pokeball:1}};}});
await api.load({user:{id:'fictional'}});await api.claim();assert.equal(calls.length,1);assert(host.innerHTML.includes('30 seconds'));
now+=30001;callback();assert(host.innerHTML.includes('Collect daily gift'));await api.claim();assert.equal(calls.length,2);await api.claim();assert.equal(calls.length,2);
await api.load(null);assert.equal(callback,null);assert.equal(host.hidden,true);
const source=fs.readFileSync('js/store.js','utf8');const start=source.indexOf('  function scheduleOwnerRewards()'),end=source.indexOf('  async function refreshStore()',start);
const button={disabled:true,textContent:''};const ctx={Date:FakeDate,clearTimeout(){},setTimeout:fn=>(callback=fn,1),lastWallet:{ownerRepeat:true,passWeeklyVerified:true,passWeeklyNextAt:new Date(now+30000).toISOString()},lastPass:{},claimBusy:false,ownerRewardTimer:null,describePass:()=>({active:true}),document:{getElementById:()=>button}};
vm.runInNewContext(source.slice(start,end)+'scheduleOwnerRewards();',ctx);now+=30001;callback();assert.equal(button.disabled,false);assert.equal(button.textContent,'Claim weekly bonus');
ctx.lastWallet={ownerRepeat:true,passWeeklyVerified:true,passWeeklyNextAt:new Date(now+30000).toISOString()};vm.runInNewContext('scheduleOwnerRewards()',ctx);const obsolete=callback;ctx.lastWallet=null;button.disabled=true;now+=30001;obsolete();assert.equal(button.disabled,true);
console.log('Owner cooldown, repeat prevention, timed readiness and stale-account timer checks pass');
})().catch(e=>{console.error(e);process.exitCode=1;});
