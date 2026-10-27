const assert=require('node:assert/strict'),{create}=require('../js/pass-crates');
(async()=>{
 let actor='a',epoch=0,calls=0,fail=false,dbFail=false,refreshFail=false,wait=null;
 const saved=new Map(),notices=[],storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const ui=create({client:{auth:{getUser:async()=>({data:{user:{id:actor}}})}},call:async(n,a)=>{assert.equal(n,'play_open_pass_crate');calls++;if(wait)await wait;if(fail)throw Error('network');if(dbFail)throw{code:'P0001',message:'Withdraw first'};return{ok:true,message:'Supplies arrived'}},storage,uuid:()=> 'request-one',notify:n=>notices.push(n),generation:()=>epoch,refresh:async()=>{if(refreshFail)throw Error('refresh')}});
 fail=true;await ui.open();assert.equal(saved.get('pass-crate-open:a'),'request-one');assert.match(notices.at(-1).body,/retry safely/);
 fail=false;await ui.open();assert.equal(saved.size,0);assert.equal(notices.at(-1).kind,'success');assert.equal(calls,2);
 dbFail=true;await ui.open();assert.equal(saved.size,0);assert.equal(notices.at(-1).kind,'error');dbFail=false;
 refreshFail=true;await ui.open();assert.equal(saved.size,0);assert.equal(notices.at(-1).title,'Supplies delivered');refreshFail=false;
 let release;wait=new Promise(r=>release=r);const before=calls,p=ui.open();await new Promise(r=>setImmediate(r));await ui.open();assert.equal(calls,before+1);actor='b';epoch++;const noteCount=notices.length;release();await p;assert.equal(notices.length,noteCount);assert(saved.has('pass-crate-open:a'));assert.equal(ui.pending('b'),undefined);
 let blockedCalls=0;const blocked=create({client:{auth:{getUser:async()=>({data:{user:{id:'a'}}})}},call:async()=>blockedCalls++,storage:{getItem(){},setItem(){throw Error('disabled')}},notify:n=>notices.push(n)});await blocked.open();assert.equal(blockedCalls,0);assert.equal(notices.at(-1).kind,'error');
 console.log('Pass crate: safe retry, confirmed denial, refresh failure, double click, account switch and unavailable storage pass');
})().catch(e=>{console.error(e);process.exitCode=1});
