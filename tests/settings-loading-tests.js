const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/settings.js'),'utf8');
const start=source.indexOf('  async function load() {'),end=source.indexOf('  const teamStatusProxy =',start);
const marker='  els.check?.addEventListener("click", async () => {';const flag=source.indexOf('  let passCheckBusy = false;');const a=flag<0?source.indexOf(marker):flag,b=source.indexOf('  els.perfPicks?',a);
assert.ok(start>=0&&end>start&&a>=0&&b>a);
function fixture(){
  let failure='session',handler,finish,requests=0;const attrs={};
  const els={gate:{hidden:false,textContent:''},box:{hidden:true},pass:{textContent:''},check:{disabled:false,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],addEventListener:(_,fn)=>handler=fn}};
  const session={user:{id:'fictional'},provider_token:'fictional-token'};
  const supabase={auth:{getSession:async()=>{if(failure==='session')throw Error('Session unavailable');return {data:{session:failure==='signedout'?null:session}};}},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{if(failure==='profile')throw Error('Profile unavailable');return {data:{username:'fictional'}};}})})}),
    functions:{invoke:async(name,args)=>{assert.equal(name,'refresh-pass');assert.equal(args.body.accessToken,'fictional-token');requests++;if(failure==='transport')throw Error('Offline');if(failure==='pending')return new Promise(resolve=>finish=resolve);return {data:{active:true},error:null};}}};
  const window={playSetAccountNav(){},playRestoreGate:(g,t)=>g.textContent=t,playSetLoadingGate(){},playRpcError:e=>e.message,playEncounterSettings:x=>x,
    playCall:async name=>name==='play_trainer'?{trainer:{name:'Fictional'}}:{}};
  const ctx={els,supabase,window,passCheckBusy:false,GATE_COPY:'Sign in',profileDirty:()=>false,draft:null,login:'',staffRole:'',ownedPacks:[],bag:{},encounter:{},card:null,savedCard:null,cosmetics:[],catches:[],
    paintPass(){},loadAccountState:async()=>{},snapshotDraft(){},loadProgression:async()=>{},loadPcStorage:async()=>{},applyHash(){},fillEncounter(){},fillPerf(){},markDirtyFlag(){},functionMessage:async(_,fallback)=>fallback};
  vm.createContext(ctx);vm.runInContext(source.slice(start,end)+'\n'+source.slice(a,b)+'\nthis.runLoad=load;',ctx);
  return {els,attrs,setFailure:v=>failure=v,run:()=>ctx.runLoad(),click:()=>handler(),requests:()=>requests,finish:()=>finish({data:{active:true},error:null})};
}
const flush=async()=>{for(let i=0;i<18;i++)await Promise.resolve();};
(async()=>{
  let f=fixture();await f.run();assert.equal(f.els.gate.textContent,'Session unavailable');assert.equal(f.els.box.hidden,true);
  f=fixture();f.setFailure('profile');await f.run();assert.equal(f.els.gate.textContent,'Profile unavailable');
  f.setFailure(null);await f.run();assert.equal(f.els.gate.hidden,true);assert.equal(f.els.box.hidden,false);
  f=fixture();await f.click();assert.match(f.els.pass.textContent,/Could not check/);assert.equal(f.els.check.disabled,false);
  f=fixture();f.setFailure('transport');await f.click();assert.match(f.els.pass.textContent,/Could not check/);assert.equal(f.els.check.disabled,false);
  f=fixture();f.setFailure('signedout');await f.click();assert.equal(f.els.pass.textContent,'Sign in first.');assert.equal(f.requests(),0);
  f=fixture();f.setFailure('pending');const pending=f.click();await flush();assert.equal(f.els.check.disabled,true);assert.equal(f.attrs['aria-busy'],'true');await f.click();assert.equal(f.requests(),1);f.finish();await pending;assert.equal(f.els.check.disabled,false);assert.equal(f.attrs['aria-busy'],undefined);
  console.log('7 LOCAL actual-source Settings loading/Pass feedback cases pass;fictional dependencies only');
})().catch(error=>{console.error(error);process.exitCode=1;});
