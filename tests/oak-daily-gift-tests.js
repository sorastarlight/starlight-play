const assert=require('node:assert/strict'),{create}=require('../js/oak-daily');
function fixture(){let actor='a',defer=null;const host={innerHTML:'',hidden:true,addEventListener(){}},calls=[],reveals=[],toasts=[];let wallet={dailySupplyReady:true,dailyClaimed:false,dailyPreview:{pokeball:3,coins:40,berry:'berry',berryQty:1,greatball:1}};
 const api=create({host,client:{auth:{getUser:async()=>({data:{user:{id:actor}}})}},call:async(name)=>{calls.push(name);if(name==='play_store')return{wallet};if(defer)return await new Promise(r=>defer=r);return{grants:{coins:40,pokeball:3,berry:1}};},present:(...a)=>reveals.push(a),toast:o=>toasts.push(o),label:k=>k});
 return{api,host,calls,reveals,toasts,setWallet:w=>wallet=w,switch:id=>actor=id,hold:()=>defer=true,finish:r=>defer(r)};
}
(async()=>{let n=0,f=fixture();await f.api.load(null);assert(f.host.hidden);assert.equal(f.calls.length,0);n++;
 f=fixture();await f.api.load({user:{id:'a'}});assert(f.host.innerHTML.includes('Collect daily gift'));assert(f.host.innerHTML.includes('greatball ×1'));assert.equal(f.calls.length,1);n++;
 await f.api.claim();assert.equal(f.calls.filter(x=>x==='play_claim_daily_supply').length,1);assert(f.host.innerHTML.includes('Collected'));assert.equal(f.reveals[0][0][0].kind,'supply-claim');assert.equal(f.toasts[0].kind,'success');await f.api.claim();assert.equal(f.calls.length,2);n++;
 f=fixture();f.setWallet({dailySupplyReady:false,dailyClaimed:true});await f.api.load({user:{id:'a'}});await f.api.claim();assert.equal(f.calls.length,1);assert(f.host.innerHTML.includes('Collected'));n++;
 f=fixture();await f.api.load({user:{id:'a'}});f.switch('b');await f.api.claim();assert.equal(f.calls.length,1);n++;
 f=fixture();await f.api.load({user:{id:'a'}});f.hold();const p=f.api.claim();for(let i=0;i<5;i++)await Promise.resolve();await f.api.claim();assert.equal(f.calls.length,2);f.switch('b');await f.api.load({user:{id:'b'}});f.finish({grants:{coins:40}});await p;assert.equal(f.reveals.length,0);assert.equal(f.toasts.length,0);n++;
 console.log(n+' local Oak daily supply cases pass;no hosted claims');
})().catch(e=>{console.error(e);process.exitCode=1});
