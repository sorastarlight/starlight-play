const assert=require('node:assert/strict');
const {html,create}=require('../js/catch-rewards');
async function run(){
 const output=html({dropChance:.35,items:[{id:'x" onclick="bad',label:'<script>',pokemon:'A&B',item:'pokeball',outcome:'miss'}]},()=>'/ball.png');
 assert(output.includes('35%'));assert(output.includes('&lt;script&gt;'));assert(output.includes('A&amp;B'));assert(!output.includes('id="x" onclick'));
 let handler,account='a',calls=0,pending,claims=0;
 const status={textContent:''},button={disabled:false,dataset:{rewardClaim:'receipt'}},element={hidden:true,innerHTML:'',addEventListener:(_,fn)=>handler=fn,querySelector:()=>status,querySelectorAll:()=>[button]};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:account}}}})}};
 const api=create(element,{client,call:async name=>{calls++;if(name==='play_pending_catch_rewards')return{ok:true,items:[],dropChance:.9};return new Promise(resolve=>pending=resolve);},onClaim:async()=>{claims++;}});
 await api.load('a');assert(element.innerHTML.includes('90%'));assert.equal(element.hidden,false);
 const event={target:{closest:selector=>selector==='[data-reward-claim]'?button:null}};
 const first=handler(event);await new Promise(resolve=>setImmediate(resolve));assert(button.disabled);
 await handler(event);assert.equal(calls,2);pending({ok:true,status:'pending'});await first;assert(status.textContent.includes('bag is full'));assert.equal(claims,0);assert(!button.disabled);
 const second=handler(event);await new Promise(resolve=>setImmediate(resolve));account='b';api.reset();pending({ok:true,status:'delivered'});await second;assert.equal(claims,0);assert(element.hidden);assert.equal(element.innerHTML,'');
 account='a';await api.load('a');const third=handler(event);await new Promise(resolve=>setImmediate(resolve));pending({ok:true,status:'delivered'});await third;assert.equal(claims,1);
 const fourth=handler(event);await new Promise(resolve=>setImmediate(resolve));pending({ok:false});await fourth;assert(status.textContent.includes('could not be confirmed'));assert(!button.disabled);
 console.log('PASS catch rewards: escaping, chance, full bag, duplicate click, account transition, delivery and uncertain response');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
