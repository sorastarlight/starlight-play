const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/evolve.js'),'utf8');
const start=source.indexOf('  async function load() {'),end=source.indexOf('  restoreResearchTrack();',start);
assert.ok(start>=0&&end>start);
function fixture(){
  let fail='session';const calls=[];
  const els={gate:{hidden:false,textContent:''},app:{hidden:true}};
  const window={playSetAccountNav(){},playRestoreGate:(g,t)=>{g.hidden=false;g.textContent=t;},playSetLoadingGate(){},playRpcError:e=>e.message,
    playCall:async name=>{calls.push(name);if(fail==='collection'&&name==='play_collection')throw Error('Collection unavailable');return {};}};
  const supabase={auth:{getSession:async()=>{if(fail==='session')throw Error('Session unavailable');return {data:{session:fail==='signedout'?null:{user:{id:'fictional'}}}};}},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{if(fail==='profile')throw Error('Profile unavailable');return {data:{}};}})})})};
  const ctx={window,supabase,els,render(){},trainerCard:null,data:null,storage:null,research:null};
  vm.createContext(ctx);vm.runInContext(source.slice(start,end)+'\nthis.runLoad=load;',ctx);
  return {els,calls,setFailure:v=>fail=v,run:()=>ctx.runLoad()};
}
(async()=>{
  let f=fixture();await f.run();assert.equal(f.els.gate.textContent,'Session unavailable');assert.deepEqual(f.calls,[]);
  f=fixture();f.setFailure('profile');await f.run();assert.equal(f.els.gate.textContent,'Profile unavailable');assert.deepEqual(f.calls,[]);
  f=fixture();f.setFailure('signedout');await f.run();assert.equal(f.els.gate.textContent,"Sign in to visit Prof. Oak's Lab.");assert.deepEqual(f.calls,[]);
  f=fixture();f.setFailure('collection');await f.run();assert.equal(f.els.gate.textContent,'Collection unavailable');assert.equal(f.els.app.hidden,true);
  f.setFailure(null);await f.run();assert.equal(f.els.gate.hidden,true);assert.equal(f.els.app.hidden,false);
  assert.deepEqual(f.calls,['play_state','play_collection','play_storage','play_oak_research','play_state','play_collection','play_storage','play_oak_research']);
  console.log('5 LOCAL actual-source Oak loading cases pass;fictional reads only;no evolution/transfer');
})().catch(error=>{console.error(error);process.exitCode=1;});
