const assert=require('node:assert/strict');
const {create}=require('../js/pc-items');
const tick=()=>new Promise(r=>setImmediate(r));
async function run(fail=false){
 let html='',writes=0;const handlers={},calls=[],notices=[];
 const grid=require('./helpers/pc-grid-dom')(),node={setAttribute(){},querySelector(){return null}},status={textContent:''};
 const el={get innerHTML(){return html},set innerHTML(v){html=v;writes++},addEventListener(n,f){handlers[n]=f},querySelector(s){if(s==='[data-pc-grid]')return html.includes('data-pc-grid')?grid:null;return s==='[data-pc-status]'?status:node},querySelectorAll:()=>[]};
 const data={ok:true,bag:{},stored:{a:2,b:3},used:0,capacity:10,slots:['a','b',...Array(28).fill(null)],waiting:{}};
 const ui=create(el,{client:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})}},notify:n=>notices.push(n),call:async(n,a)=>{if(n==='play_pc_items')return structuredClone(data);assert.equal(n,'play_pc_item_arrange');return new Promise((resolve,reject)=>calls.push({args:a,resolve,reject}))}});
 await ui.load('fixture');const initialWrites=writes;
 const drag=(from,to)=>{const source={dataset:{slot:String(from)},classList:{add(){}}},dest={dataset:{slot:String(to)}};handlers.dragstart({target:{closest:()=>source},dataTransfer:{setData(){}},preventDefault(){}});handlers.drop({target:{closest:()=>dest},preventDefault(){}})};
 drag(0,2);assert(grid.innerHTML.indexOf('data-slot="2" data-select="a"')>=0,'move rendered before response');await tick();assert.equal(calls.length,1);
 drag(2,3);await tick();assert.equal(calls.length,1,'one in-flight writer');assert(grid.innerHTML.includes('data-slot="3" data-select="a"'));
 if(fail){calls[0].reject(Error('conflict'));await tick();await tick();assert(grid.innerHTML.includes('data-slot="0" data-select="a"'));assert(notices.some(n=>n.kind==='warning'));}
 else {calls[0].resolve({ok:true});await tick();assert.equal(calls.length,2);assert.deepEqual(calls[1].args.p_expected,calls[0].args.p_slots);assert.equal(calls[1].args.p_slots[3],'a');calls[1].resolve({ok:true});await tick();assert.equal(notices.filter(n=>n.kind==='success').length,1);}
 assert.equal(writes,initialWrites,'workspace stays mounted');
 drag(0,4);await tick();ui.reset();calls.at(-1).resolve({ok:true});await tick();assert.equal(el.innerHTML,'','old completion cannot restore another account UI');
}
(async()=>{await run();await run(true);console.log('PASS immediate arrangement, serialized rapid moves, failure recovery and account reset')})().catch(e=>{console.error(e);process.exitCode=1});
