const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('path').join(__dirname,'../js/help.js'),'utf8');
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
function fixture(session, fail=false) {
  const paints=[], reads=[], timers=[], status={textContent:''}; let change, options, rpcCalls=0;
  const client={auth:{getSession:async()=>{if(fail)throw Error('offline');return{data:{session}};},onAuthStateChange:fn=>{change=fn;return{};}},from:table=>{
    assert.equal(table,'profiles');return {select:fields=>{assert.equal(fields,'display_name, twitch_login, avatar_url');return{eq:(key,id)=>{assert.equal(key,'id');return{maybeSingle:()=>new Promise(resolve=>reads.push({id,resolve}))};}};}};
  }};
  const window={playSupabase:client,playBindAccountNav:opts=>{options=opts;},playSetAccountNav:(...args)=>paints.push(args),playAuthNoise:event=>['INITIAL_SESSION','TOKEN_REFRESHED'].includes(event),setTimeout:fn=>timers.push(fn),playCall:()=>{rpcCalls++;throw Error('No RPC allowed');}};
  vm.runInNewContext(source,{window,document:{getElementById:()=>status}});
  return{paints,reads,status,change:(...args)=>change(...args),runTimers:()=>{while(timers.length)timers.shift()();},signOut:()=>options.onSignOut(),rpcCalls:()=>rpcCalls};
}
async function main(){
  let f=fixture(null);await flush();assert.equal(f.paints[0][0],null);assert.equal(f.reads.length,0);console.log('PASS Signed-out guide exits unknown navigation state');
  const A={user:{id:'fictional-a'}},B={user:{id:'fictional-b'}};
  f=fixture(A);await flush();assert.equal(f.reads[0].id,'fictional-a');f.reads[0].resolve({data:{display_name:'A'}});await flush();assert.equal(f.paints[0][0],A);assert.equal(f.rpcCalls(),0);console.log('PASS Signed-in guide renders current profile using reads only');
  f=fixture(A);await flush();f.change('SIGNED_OUT',null);f.reads[0].resolve({data:{display_name:'Old'}});await flush();assert.equal(f.paints.length,0);f.runTimers();await flush();assert.equal(f.paints[0][0],null);console.log('PASS Auth sign-out invalidates an in-flight profile response immediately');
  f=fixture(A);await flush();f.change('SIGNED_IN',B);assert.equal(f.reads.length,1);f.runTimers();await flush();assert.equal(f.reads[1].id,'fictional-b');f.reads[1].resolve({data:{display_name:'B'}});await flush();f.reads[0].resolve({data:{display_name:'A'}});await flush();assert.equal(f.paints.length,1);assert.equal(f.paints[0][0],B);console.log('PASS Account switch schedules outside Auth callback and suppresses old identity');
  f=fixture(A);await flush();f.change('TOKEN_REFRESHED',A);f.runTimers();await flush();assert.equal(f.reads.length,1);f.signOut();f.reads[0].resolve({data:{display_name:'Old'}});await flush();assert.equal(f.paints.length,0);console.log('PASS Token noise and explicit navigation sign-out cannot repaint stale identity');
  f=fixture(null,true);await flush();assert.equal(f.paints[0][0],null);assert.match(f.status.textContent,/unavailable/);assert.equal(f.rpcCalls(),0);console.log('PASS Session failure resolves shell with retry guidance and no gameplay RPC');
  console.log('6 LOCAL mocked navigation checks passed;no Auth or network call');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
