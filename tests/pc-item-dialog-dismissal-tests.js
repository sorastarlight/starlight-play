const assert=require('node:assert/strict');
const {create}=require('../js/pc-items');
async function run(){
 let html='',click,closed=0,finish;const events={},input={value:'1',max:'3',focus(){}};
 const node={focus(){},setAttribute(){},removeAttribute(){},querySelector:()=>input};
 const dialog={...node,addEventListener:(n,f)=>events[n]=f,showModal(){},close(){closed++},getBoundingClientRect:()=>({left:10,right:100,top:10,bottom:100})};
 const el={get innerHTML(){return html},set innerHTML(v){html=v},addEventListener(n,f){if(n==='click')click=f},querySelector(s){if(s==='[data-pc-grid]'&&!html.includes('data-pc-grid'))return null;return s==='[data-bag-panel]'?dialog:node},querySelectorAll:()=>[]};
 const data={ok:true,bag:{pokeball:3,berry:2},stored:{pokeball:4},used:3,capacity:20,slots:['pokeball',...Array(29).fill(null)],waiting:{}};
 const api=create(el,{client:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})}},uuid:()=> 'fixture',notify(){},call:async n=>n==='play_pc_items'?structuredClone(data):new Promise(r=>finish=r)});
 const act=(selector,dataset={})=>click({target:{closest:s=>s===selector?{dataset}:null}});
 await api.load('fixture');await act('[data-bag-toggle]');
 events.click({target:dialog,clientX:50,clientY:50});assert.equal(closed,0,'dialog padding is not backdrop');
 events.click({target:dialog,clientX:1,clientY:1});assert.equal(closed,1,'idle backdrop closes');
 await act('[data-bag-toggle]');let prevented=false;events.cancel({preventDefault(){prevented=true}});assert(prevented);assert.equal(closed,2,'idle Escape closes');
 await act('[data-bag-toggle]');await act('[data-bag-item]',{bagItem:'pokeball'});
 const pending=act('[data-move]',{move:'deposit'});await new Promise(r=>setImmediate(r));assert(finish);
 events.cancel({preventDefault(){}});events.click({target:dialog,clientX:1,clientY:1});await act('[data-bag-close]');assert.equal(closed,2,'busy dialog cannot hide an in-flight transfer');
 finish({ok:true,quantity:1,item:'pokeball',direction:'deposit'});await pending;
 await act('[data-bag-close]');assert.equal(closed,3,'close recovers after completion');
 await act('[data-bag-toggle]');await act('[data-bag-item]',{bagItem:'berry'});await act('[data-bag-close]');assert.match(node.innerHTML,/Your stored items/,'Bag-only selection must not imply a withdrawn PC stack');console.log('PASS dialog backdrop, padding, Escape, busy dismissal and completion');
}
run().catch(e=>{console.error(e);process.exitCode=1});

