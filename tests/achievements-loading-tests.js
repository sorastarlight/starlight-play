const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/achievements.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 18; i++) await Promise.resolve(); };
const A = {user:{id:'fictional-a'}}, B = {user:{id:'fictional-b'}};
function fixture(initial = A, deferProfile = false) {
  let session = initial, authChange, navOptions;
  const nodes = {}, calls = [], timers = [], nav = [], profiles = [];
  const node = id => nodes[id] || (nodes[id] = {hidden:id === 'prog-app',innerHTML:'',textContent:'',value:'',events:{},addEventListener(k,f){this.events[k]=f;}});
  const client = {auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>authChange=fn},from:()=>({select:()=>({eq:()=>({maybeSingle:()=>deferProfile ? new Promise(resolve=>profiles.push(resolve)) : Promise.resolve({data:{display_name:session?.user.id}})})})})};
  const window = {playSupabase:client,setTimeout:fn=>timers.push(fn),playBindAccountNav:o=>navOptions=o,playAuthNoise:e=>e==='TOKEN_REFRESHED',playSetAccountNav:(s)=>nav.push(s?.user.id),playSetLoadingGate:(g,a)=>{g.hidden=false;a.hidden=true;},playRestoreGate:(g,t)=>{g.hidden=false;g.textContent=t;},playCall:rpc=>new Promise((resolve,reject)=>calls.push({rpc,resolve,reject})),playEscapeAttr:x=>String(x).replace(/</g,'&lt;'),playRpcError:e=>e.message};
  vm.runInNewContext(source,{window,document:{getElementById:node}});
  return {nodes,calls,nav,profiles,change(next,event){session=next;authChange(event||(next?'SIGNED_IN':'SIGNED_OUT'),next);},runTimers(){while(timers.length)timers.shift()();},signOut(){navOptions.onSignOut();},retry(){node('gate').events.click({target:{closest:()=>true}});}};
}
const progress = name => ({achievements:[{id:name,name,description:'Fictional progress',target:2,progress:1,rewards:{}}],titles:[],badges:[]});
async function state(f) { f.calls.filter(c=>c.rpc==='play_state').at(-1).resolve({trainer:{}}); await flush(); }
async function loaded(f,name='Current') { await state(f);f.calls.filter(c=>c.rpc==='play_progression').at(-1).resolve(progress(name));await flush(); }
async function main() {
  let f=fixture(null);await flush();assert.equal(f.calls.length,0);assert.equal(f.nodes['prog-app'].hidden,true);console.log('PASS Signed-out view makes no progress call');
  f=fixture();await flush();await state(f);const old=f.calls.at(-1);f.change(null);old.resolve(progress('Old account'));await flush();assert.equal(f.nodes['prog-app'].hidden,true);assert.equal(f.nodes['ach-grid'].innerHTML,'');console.log('PASS Late progress cannot reopen signed-out content');
  f=fixture();await flush();await state(f);const oldProgress=f.calls.at(-1);f.change(B);assert.equal(f.nodes['ach-grid'].innerHTML,'');f.runTimers();await flush();await loaded(f,'New account');oldProgress.resolve(progress('Old account'));await flush();assert.match(f.nodes['ach-grid'].innerHTML,/New account/);assert(!f.nodes['ach-grid'].innerHTML.includes('Old account'));console.log('PASS Prior-account progress cannot overwrite new account');
  f=fixture();await flush();const oldState=f.calls[0];f.change(B);f.runTimers();await flush();await loaded(f,'New account');oldState.resolve({trainer:{name:'Old account'}});await flush();assert.equal(f.nav.at(-1),B.user.id);assert.equal(f.calls.filter(c=>c.rpc==='play_progression').length,1);console.log('PASS Late navigation snapshot cannot repaint prior identity');
  f=fixture(A,true);await flush();const oldProfile=f.profiles[0];f.change(B);f.runTimers();await flush();f.profiles[1]({data:{display_name:'New account'}});await flush();await loaded(f,'New account');oldProfile({data:{display_name:'Old account'}});await flush();assert.equal(f.nav.at(-1),B.user.id);assert.equal(f.calls.length,2);console.log('PASS Late profile cannot start stale navigation or progress requests');
  f=fixture();await flush();await state(f);f.calls.at(-1).reject(Error('<offline>'));await flush();assert.equal(f.nodes['prog-app'].hidden,true);assert.match(f.nodes.gate.innerHTML,/Try again/);assert.match(f.nodes.gate.innerHTML,/&lt;offline>/);f.retry();await flush();await loaded(f);assert.equal(f.nodes['prog-app'].hidden,false);console.log('PASS Escaped failure and retry recover current progress');
  f=fixture();await flush();await state(f);const staleError=f.calls.at(-1);f.change(B);f.runTimers();await flush();await loaded(f,'New account');staleError.reject(Error('Old failure'));await flush();assert.equal(f.nodes.gate.hidden,true);assert.equal(f.nodes['prog-app'].hidden,false);console.log('PASS Stale failure cannot replace new successful content');
  f.signOut();assert.equal(f.nodes['ach-grid'].innerHTML,'');assert.equal(f.nodes['prog-app'].hidden,true);f.nodes['ach-search'].events.input();assert.equal(f.nodes['ach-grid'].innerHTML,'');console.log('PASS Sign-out clears cached progress before filter interaction');
  console.log('8 LOCAL actual-source mocked load/race checks;no network/Auth/gameplay mutation');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
