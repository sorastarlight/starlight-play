const assert = require('node:assert/strict');
const {create} = require('../js/pc-items');
async function scenario(mode) {
  let html='',writes=0,reads=0,transfers=0,click,failRead=false;
  const notices=[],requests=[];
  const input={value:'2',max:'3',disabled:false,focus(){}};
  const node={disabled:false,hidden:true,focus(){},setAttribute(){},querySelector:()=>input};
  const status={textContent:''};
  const el={get innerHTML(){return html},set innerHTML(v){html=v;writes++},addEventListener(n,f){if(n==='click')click=f},querySelector(s){if(s==='[data-pc-grid]'&&!html.includes('data-pc-grid'))return null;return s==='[data-pc-status]'?status:s==='[data-pc-quantity]'?input:node},querySelectorAll:()=>[]};
  const data={ok:true,bag:{pokeball:3},stored:{pokeball:4},used:3,capacity:20,slots:['pokeball',...Array(29).fill(null)],waiting:{}};
  const api=create(el,{client:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})}},uuid:()=> 'same-request',notify:n=>notices.push(n),call:async(name,args)=>{
    if(name==='play_pc_items'){reads++;if(failRead)throw Error('offline');return structuredClone(data)}
    if(name==='play_pc_item_transfer'){transfers++;requests.push(args.p_request);if(mode==='uncertain'&&transfers===1)throw Error('response lost');if(mode==='refresh-failure')failRead=true;return{ok:true,item:'pokeball',quantity:2,direction:'deposit'}}
    throw Error('Unexpected call');
  }});
  const act=(selector,dataset={})=>click({target:{closest:s=>s===selector?{dataset}:null}});
  await api.load('fixture');await act('[data-bag-item]',{bagItem:'pokeball'});const initialWrites=writes;
  await act('[data-move]',{move:'deposit'});
  assert.equal(writes,initialWrites,'actions must not replace the workspace with loading markup');
  if(mode==='uncertain'){
    await act('[data-move]',{move:'deposit'});assert.equal(transfers,1,'new transfers blocked while uncertain');
    await act('[data-pc-retry]');assert.deepEqual(requests,['same-request','same-request']);
  } else if(mode==='refresh-failure') {
    assert.match(status.textContent,/Transfer completed/);await act('[data-move]',{move:'deposit'});assert.equal(transfers,1,'stale counts cannot cause another transfer');
    failRead=false;await act('[data-pc-refresh]');assert.match(status.textContent,/updated/);
  }
  assert(notices.some(n=>n.kind==='success'&&/transferred/.test(n.body)));
  assert(reads>=2);assert.equal(writes,initialWrites);
}
(async()=>{for(const mode of ['success','uncertain','refresh-failure'])await scenario(mode);console.log('PASS stable item workspace, success feedback, same-request retry and stale-read protection')})().catch(e=>{console.error(e);process.exitCode=1});
