const assert=require('node:assert/strict');
const {create}=require('../js/pc-items');
async function run(){
 let html='',click,account='old',reads=0,finish;
 const notices=[],input={value:'1',max:'3',focus(){}},node={focus(){},setAttribute(){},querySelector:()=>input},status={textContent:''};
 const el={get innerHTML(){return html},set innerHTML(v){html=v},addEventListener(n,f){if(n==='click')click=f},querySelector(s){if(s==='[data-pc-grid]'&&!html.includes('data-pc-grid'))return null;return s==='[data-pc-status]'?status:node},querySelectorAll:()=>[]};
 const data={ok:true,bag:{pokeball:3},stored:{pokeball:4},used:3,capacity:20,slots:['pokeball',...Array(29).fill(null)],waiting:{}};
 const api=create(el,{client:{auth:{getSession:async()=>({data:{session:{user:{id:account}}}})}},uuid:()=> 'fixture',notify:n=>notices.push(n),call:async name=>{
 if(name==='play_pc_item_transfer')throw Object.assign(Error('Rejected transfer'),{code:'P0001'});
 if(account==='old'&&++reads===2)return new Promise(resolve=>finish=resolve);
 return structuredClone(data);
 }});
 const act=(selector,dataset={})=>click({target:{closest:s=>s===selector?{dataset}:null}});
 await api.load('old');await act('[data-bag-item]',{bagItem:'pokeball'});
 const transfer=act('[data-move]',{move:'deposit'});await new Promise(r=>setImmediate(r));assert(finish);
 api.reset();account='new';await api.load('new');const count=notices.length;
 finish(data);await transfer;
 assert.equal(notices.length,count,'old rejected-transfer refresh must not warn the new account');
 console.log('PASS rejected-transfer refresh cannot mark a replacement account stale');
}
run().catch(e=>{console.error(e);process.exitCode=1});
