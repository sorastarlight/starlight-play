const assert=require('node:assert/strict');
const {create}=require('../js/pc-items');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function scenario(rejectOld){
 let account='old',html='',pending;
 const states=[],notices=[];
 const node={innerHTML:'',textContent:'',close(){},setAttribute(){},querySelector(){return null}};
 const el={get innerHTML(){return html},set innerHTML(v){html=v},addEventListener(){},querySelector(s){if(s==='[data-pc-grid]'&&!html.includes('data-pc-grid'))return null;return node},querySelectorAll(){return []}};
 const data={ok:true,bag:{},stored:{},used:0,capacity:20,slots:Array(30).fill(null),waiting:{}};
 const api=create(el,{client:{auth:{getSession:async()=>({data:{session:{user:{id:account}}}})}},onState:d=>states.push(d),notify:n=>notices.push(n),call:()=>account==='old'?new Promise((resolve,reject)=>pending={resolve,reject}):Promise.resolve(data)});
 const old=api.load('old');await tick();assert(pending);
 api.reset();account='new';await api.load('new');const current=html,count=states.length;
 if(rejectOld)pending.reject(Error('old request failed'));else pending.resolve({...data,stored:{secret:999},slots:['secret',...Array(29).fill(null)]});
 await old;
 assert.equal(html,current,'old read must not replace the current account workspace');
 assert.equal(states.length,count,'old completion must not change box counters');
 assert.equal(notices.length,0,'old completion must not notify the new account');
 api.reset();assert.equal(html,'');
}
(async()=>{await scenario(false);await scenario(true);console.log('PASS late PC read success/failure after account replacement')})().catch(e=>{console.error(e);process.exitCode=1});
