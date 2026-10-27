const assert=require('node:assert/strict');
const {create}=require('../js/pc-items');
async function run(){
 let html='',click,transfers=0;const notices=[],input={value:'1',max:'3',focus(){}};
 const node={focus(){},setAttribute(){},querySelector:()=>input};
 const el={get innerHTML(){return html},set innerHTML(v){html=v},addEventListener(n,f){if(n==='click')click=f},querySelector(s){if(s==='[data-pc-grid]'&&!html.includes('data-pc-grid'))return null;return node},querySelectorAll:()=>[]};
 const data={ok:true,bag:{pokeball:3},stored:{pokeball:4},used:3,capacity:20,slots:['pokeball',...Array(29).fill(null)],waiting:{}};
 const api=create(el,{client:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})}},uuid:()=> 'fixture',notify:n=>notices.push(n),call:async n=>{if(n==='play_pc_items')return structuredClone(data);transfers++;return {ok:true,item:'pokeball',quantity:3,direction:'deposit'}}});
 const act=(selector,dataset={})=>click({target:{closest:s=>s===selector?{dataset}:null}});
 await api.load('fixture');await act('[data-bag-item]',{bagItem:'pokeball'});
 for(const value of ['', '0','-1','1.5','4','Infinity','NaN','9007199254740992']){input.value=value;const before=notices.length;await act('[data-move]',{move:'deposit'});assert.equal(transfers,0,`invalid quantity ${value} reached server`);assert.equal(notices.length,before+1);assert.equal(notices.at(-1).kind,'error')}
 input.max='0';input.value='1';await act('[data-move]',{move:'deposit'});assert.equal(transfers,0,'zero available capacity must block transfer');
 input.max='3';input.value='3';await act('[data-move]',{move:'deposit'});assert.equal(transfers,1,'exact available maximum remains usable');
 console.log('PASS invalid transfer quantities, zero capacity, visible errors and exact maximum');
}
run().catch(e=>{console.error(e);process.exitCode=1});
