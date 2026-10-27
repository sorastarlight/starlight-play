const assert=require('node:assert/strict'),{create}=require('../js/oak-daily');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let actor='a';const pending=[],toasts=[],reveals=[],host={innerHTML:'',hidden:false,addEventListener(){}};
 const ui=create({host,client:{auth:{getUser:async()=>({data:{user:{id:actor}}})}},call:async n=>n==='play_oak_checkin_state'?{wallet:{dailySupplyReady:true,dailyClaimed:false}}:new Promise(resolve=>pending.push(resolve)),present:e=>reveals.push(e),toast:e=>toasts.push(e)});
 await ui.load({user:{id:'a'}});const first=ui.claim();await tick();assert.equal(pending.length,1);
 actor='b';await ui.load({user:{id:'b'}});const second=ui.claim();await tick();assert.equal(pending.length,2,'new account can claim without waiting for old request');
 pending[0]({grants:{coins:1}});await first;await ui.claim();assert.equal(pending.length,2,'old completion cannot unlock new account in-flight request');assert.equal(toasts.length,0);
 pending[1]({grants:{coins:2}});await second;assert.equal(toasts.length,1);assert.equal(reveals.length,1);assert.equal(reveals[0][0].rewards[0].amount,2);
 console.log('Oak account change resets busy state; obsolete completion cannot unlock, reveal or notify for the replacement account');
})().catch(e=>{console.error(e);process.exitCode=1;});
