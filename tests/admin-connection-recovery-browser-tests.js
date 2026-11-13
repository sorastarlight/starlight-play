// Actual Hub and Account adapter/controller. Only endpoint responses/session facade are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const text=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+text.slice(text.indexOf('async function handoffFixture('),text.indexOf('(async()=>')))();
function connectionFixture(scenario){
 const id='22222222-2222-4222-8222-222222222222',original=playCall,mount=PLAY_ADMIN_ACCOUNT_TOOLS.mount;
 window.connectionWrites=[];window.connectionReads=[];window.connectionReadFault=false;window.connectionSessionChanged=false;window.holdConnectionRead=false;
 window.connectionAccount={ok:true,user:{id,displayName:'Fictional Cedar',login:'cedar',emailLogin:true},staffRole:'owner',canEdit:true,ownerTools:true,connections:[
  {id:'33333333-3333-4333-8333-333333333333',twitchUserId:'9101',type:'player',primary:true,confirmed:true,loginEnabled:true,gameplayEnabled:true,displayName:'Cedar Main',login:'cedarmain'},
  {id:'44444444-4444-4444-8444-444444444444',twitchUserId:'9102',type:'secondary',primary:false,confirmed:true,loginEnabled:false,gameplayEnabled:false,displayName:'Cedar Second',login:'cedarsecond'}]};
 window.connectionIdentity={ok:true,rankingVisible:true,trainer:{level:3},cosmetics:[],titles:[],badges:[],catalog:[],ownedAvatarPacks:[]};
 playSupabase.auth.getSession=async()=>({data:{session:{user:{id:connectionSessionChanged?'different-fictional-staff':actor}}}});
 PLAY_ADMIN_ACCOUNT_TOOLS.mount=(...args)=>window.connectionTool=mount(...args);
 window.playCall=async(name,args)=>{
  if(name==='admin_list_users')return{users:[{id,displayName:'Fictional Cedar',login:'cedar',role:'player'}],total:1};
  if(name==='admin_user_account'||name==='admin_identity_inspect'){
   connectionReads.push({name,args:structuredClone(args)});
   if(name==='admin_user_account'&&holdConnectionRead)await new Promise(r=>window.releaseConnectionRead=r);
   if(connectionReadFault)throw Error('Fictional connection inspection unavailable');
   return structuredClone(name==='admin_user_account'?connectionAccount:connectionIdentity);
  }
  if(['admin_set_twitch_primary','admin_set_twitch_flags','admin_disconnect_twitch'].includes(name)){
   connectionWrites.push({name,args:structuredClone(args)});
   if(['pending','reset-pending'].includes(scenario))await new Promise(r=>window.releaseConnectionWrite=r);
   if(name==='admin_set_twitch_primary')connectionAccount.connections.forEach(r=>r.primary=r.twitchUserId===args.p_twitch_user_id);
   if(name==='admin_set_twitch_flags')Object.assign(connectionAccount.connections.find(r=>r.twitchUserId===args.p_twitch_user_id),{type:args.p_connection_type,loginEnabled:args.p_login_enabled,gameplayEnabled:args.p_gameplay_enabled});
   if(name==='admin_disconnect_twitch')connectionAccount.connections=connectionAccount.connections.filter(r=>r.twitchUserId!==args.p_twitch_user_id);
   if(scenario==='session-afterwrite')connectionSessionChanged=true;
   return ['unknown','reload-failure','reload-retry'].includes(scenario)?{ok:true}:structuredClone(connectionAccount);
  }
  return original(name,args);
 };
}
async function prepareConnection(action){
 const wait=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Connection fixture unavailable');};
 document.querySelector('[data-trainer-pane=connections]').click();await wait(()=>document.querySelector('[data-account-flags]'));
 let target;
 if(action.endsWith('flags')){
  const form=document.querySelector('[data-account-flags][data-tid="9102"]');if(action==='bot-flags'){form.elements.type.value='bot';form.elements.type.dispatchEvent(new Event('change',{bubbles:true}));}else{const field=form.elements[action==='signin-flags'?'loginEnabled':'gameplayEnabled'];field.checked=true;field.dispatchEvent(new Event('change',{bubbles:true}));}target=form.querySelector('button');
 }else target=document.querySelector(action==='primary'?'[data-account-primary="9102"]':'[data-account-disconnect="9102"]');
 target.focus();target.click();await wait(()=>document.querySelector('dialog[open]'));document.querySelector('[data-account-confirm]').focus();
}
async function main(){const b=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const action of ['primary','flags','signin-flags','bot-flags','disconnect'])for(const scenario of ['cancel','confirmed','pending','unknown','reload-failure','reload-retry','stale-preflight','session-afterwrite','reset-pending','reset-preflight','outside-reload','reset-reload']){
  const label=action+'/'+scenario;if(process.env.CONNECTION_RECOVERY_CASE&&process.env.CONNECTION_RECOVERY_CASE!==label)continue;
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);await p.setRequestInterception(true);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section=support');await p.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.evaluate(connectionFixture,scenario);await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});await p.click('[data-next-tab=trainers]');await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');await p.evaluate(prepareConnection,action);
  const url=await p.evaluate(()=>location.href);const review=await p.$eval('dialog',n=>n.textContent);assert.match(review,/Cedar Second|cedarsecond|9102/);
  if(scenario==='cancel'){
   await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal(await p.evaluate(()=>connectionWrites.length),0);assert.equal(await p.evaluate(()=>!!document.activeElement.closest('[data-trainer-account-tools]')),true);assert.equal(await p.evaluate(()=>connectionTool.canLeave()),!action.endsWith('flags'));
  }else{
   if(scenario==='stale-preflight')await p.evaluate(()=>connectionIdentity.rankingVisible=false);
   if(scenario==='reset-preflight')await p.evaluate(()=>holdConnectionRead=true);
   await p.keyboard.press('Enter');
   if(['pending','reset-pending'].includes(scenario))await p.waitForFunction(()=>typeof releaseConnectionWrite==='function');else if(scenario==='reset-preflight')await p.waitForFunction(()=>typeof releaseConnectionRead==='function');else await p.waitForFunction(()=>connectionTool.state.phase!=='saving');
   if(['reset-pending','reset-preflight'].includes(scenario)){
    await p.evaluate(()=>{playSupabase.auth.getSession=async()=>({data:{session:null}});authChange('SIGNED_OUT',null);});await p.waitForFunction(()=>document.querySelector('#staff').hidden);await p.evaluate(()=>{if(typeof releaseConnectionWrite==='function')releaseConnectionWrite();if(typeof releaseConnectionRead==='function')releaseConnectionRead();});await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>connectionTool.state.phase),'closed');assert.equal(await p.$$eval('[data-account-confirm]',n=>n.length),0);
   }else if(scenario==='stale-preflight'){
    assert.equal(await p.evaluate(()=>connectionTool.state.phase),'error');assert.equal(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.match(await p.$eval('.account-tool-status',n=>n.textContent),/changed/);
   }else{
    assert.equal(await p.evaluate(()=>connectionWrites.length),1);
    if(scenario==='session-afterwrite'){assert.equal(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.match(await p.$eval('.account-tool-status',n=>n.textContent),/Do not repeat/);}
    const before=await p.evaluate(()=>structuredClone(connectionWrites));await p.evaluate(()=>history.back());await new Promise(r=>setTimeout(r,300));assert.equal(await p.evaluate(()=>location.href),url);assert.equal(await p.evaluate(()=>connectionTool.canLeave()),false);
    if(['reload-failure','reload-retry'].includes(scenario)){
     await p.evaluate(()=>connectionReadFault=true);await p.focus('[data-account-reload]');await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase==='error');assert.equal(await p.evaluate(()=>connectionTool.canLeave()),false);assert.match(await p.$eval('.account-tool-status',n=>n.textContent),/previous change still needs inspection/);
    }
    if(['confirmed','reload-retry','outside-reload','reset-reload'].includes(scenario)){
     await p.evaluate(()=>connectionReadFault=false);
     if(['outside-reload','reset-reload'].includes(scenario))await p.evaluate(()=>holdConnectionRead=true);
     await p.focus('[data-account-reload]');await p.keyboard.press('Enter');
     if(['outside-reload','reset-reload'].includes(scenario)){
      await p.waitForFunction(()=>typeof releaseConnectionRead==='function');
      if(scenario==='outside-reload')await p.evaluate(()=>{const b=document.createElement('button');b.id='outside-connection';b.textContent='Outside control';document.body.prepend(b);b.focus();releaseConnectionRead();});
      else{await p.evaluate(()=>{playSupabase.auth.getSession=async()=>({data:{session:null}});authChange('SIGNED_OUT',null);});await p.waitForFunction(()=>document.querySelector('#staff').hidden);await p.evaluate(()=>releaseConnectionRead());}
      await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>connectionTool.state.phase),scenario==='reset-reload'?'closed':'ready');if(scenario==='outside-reload')assert.equal(await p.evaluate(()=>document.activeElement.id),'outside-connection');
     }else{await p.waitForFunction(()=>connectionTool.state.phase==='ready');assert.equal(await p.evaluate(()=>connectionTool.canLeave()),true);}
    }
    if(['confirmed','reload-retry','outside-reload'].includes(scenario)){
     const snapshot=await p.evaluate(()=>structuredClone(connectionTool.state.snapshot));assert.equal(snapshot.target,'22222222-2222-4222-8222-222222222222');assert.equal(snapshot.connections.filter(r=>r.primary).length,1);const row=snapshot.connections.find(r=>r.twitchUserId==='9102');if(action==='primary')assert.equal(row.primary,true);if(action.endsWith('flags')){assert.equal(row.gameplayEnabled,action==='flags');assert.equal(row.loginEnabled,action==='signin-flags');assert.equal(row.type,action==='bot-flags'?'bot':'secondary');}if(action==='disconnect'){assert.equal(row,undefined);assert.equal(snapshot.connections[0].twitchUserId,'9101');assert.equal(snapshot.connections[0].loginEnabled,true);}
    }
    assert.deepEqual(await p.evaluate(()=>connectionWrites),before);
   }
  }
  const writes=await p.evaluate(()=>connectionWrites);assert.equal(writes.length,['cancel','stale-preflight','reset-preflight'].includes(scenario)?0:1);
  if(writes.length){assert.equal(writes[0].args.p_user,'22222222-2222-4222-8222-222222222222');assert.equal(writes[0].args.p_twitch_user_id,'9102');assert.equal(writes[0].name,{primary:'admin_set_twitch_primary',flags:'admin_set_twitch_flags','signin-flags':'admin_set_twitch_flags','bot-flags':'admin_set_twitch_flags',disconnect:'admin_disconnect_twitch'}[action]);if(action.endsWith('flags')){assert.equal(writes[0].args.p_gameplay_enabled,action==='flags');assert.equal(writes[0].args.p_login_enabled,action==='signin-flags');assert.equal(writes[0].args.p_connection_type,action==='bot-flags'?'bot':'secondary');}}
  assert.deepEqual(errors,[]);console.log('PASS connection recovery '+label);await p.close();
 }
}finally{await b.close();}}
module.exports={connectionFixture,prepareConnection};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
