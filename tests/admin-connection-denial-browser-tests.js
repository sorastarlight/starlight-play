// Real Hub + Account adapter/controller. Only session and endpoint replies are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const {connectionFixture,prepareConnection}=require('./admin-connection-recovery-browser-tests');
const text=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+text.slice(text.indexOf('async function handoffFixture('),text.indexOf('(async()=>')))();
function installDeniedResponses(scenario){
 window.denyConnectionRead=false;window.holdDeniedRead=false;window.deniedAttempts=[];const original=playCall;
 window.playCall=async(name,args)=>{
  if(['admin_user_account','admin_identity_inspect'].includes(name)){
   if(holdDeniedRead&&name==='admin_user_account')await new Promise(r=>window.releaseDeniedRead=r);
   if(denyConnectionRead)throw Object.assign(Error('Fictional read permission revoked'),{code:'42501'});
  }
  if(['admin_set_twitch_primary','admin_set_twitch_flags','admin_disconnect_twitch'].includes(name)&&scenario.startsWith('dispatch-')){
   const request={name,args:structuredClone(args)};deniedAttempts.push(request);connectionWrites.push(request);
   const status=scenario.endsWith('401')?401:scenario.endsWith('403')?403:scenario.endsWith('500')?500:null;
   throw Object.assign(Error('Fictional server denial'),status?{status,...(scenario.includes('mixed')?{code:'FICTIONAL_BACKEND_CODE'}:{})}:{code:'42501'});
  }
  return original(name,args);
 };
}
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const action of ['primary','flags','disconnect'])for(const scenario of ['preflight','dispatch-42501','dispatch-401','dispatch-403','dispatch-mixed-401','dispatch-mixed-403','dispatch-mixed-500','reload-confirmed','reload-unknown','retry','downgrade','outside','reset']){
  const label=action+'/'+scenario;if(process.env.CONNECTION_DENIAL_CASE&&process.env.CONNECTION_DENIAL_CASE!==label)continue;
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);await p.setRequestInterception(true);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section=support');await p.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.evaluate(connectionFixture,['reload-unknown','retry','outside','reset'].includes(scenario)?'unknown':'confirmed');await p.evaluate(installDeniedResponses,scenario);await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});await p.click('[data-next-tab=trainers]');await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');await p.evaluate(prepareConnection,action);await p.evaluate(()=>window.oldConnectionConfirm=document.querySelector('[data-account-confirm]'));
  if(scenario==='preflight')await p.evaluate(()=>denyConnectionRead=true);
  await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase!=='saving');
  if(scenario==='dispatch-mixed-500'){assert.equal(await p.evaluate(()=>connectionTool.state.phase),'ready');assert.equal(await p.evaluate(()=>connectionTool.state.uncertain),true);assert.notEqual(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.equal(await p.evaluate(()=>connectionTool.canLeave()),false);assert.match(await p.$eval('.account-tool-status',n=>n.textContent),/Save outcome uncertain/);await p.evaluate(()=>oldConnectionConfirm.click());await new Promise(r=>setTimeout(r,150));}
  else if(scenario==='preflight'||scenario.startsWith('dispatch-')){
   assert.equal(await p.evaluate(()=>connectionTool.state.phase),'error');assert.equal(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.equal(await p.evaluate(()=>connectionTool.state.uncertain),false);assert.match(await p.$eval('.account-tool-status',n=>n.textContent),/Staff access changed. Account details cleared/);assert.equal(await p.$$eval('[data-account-flags],[data-account-primary],[data-account-disconnect]',n=>n.length),0);await p.evaluate(()=>oldConnectionConfirm.click());await new Promise(r=>setTimeout(r,150));
   assert.equal(await p.evaluate(()=>connectionAccount.connections.length),2);assert.equal(await p.evaluate(()=>connectionAccount.connections[0].primary),true);assert.equal(await p.evaluate(()=>connectionAccount.connections[1].gameplayEnabled),false);
  }else{
   const before=await p.evaluate(()=>structuredClone(connectionWrites));
   if(scenario==='downgrade')await p.evaluate(()=>{connectionAccount.staffRole='moderator';connectionAccount.canEdit=false;connectionAccount.ownerTools=false;});else await p.evaluate(()=>denyConnectionRead=true);
   if(['outside','reset'].includes(scenario))await p.evaluate(()=>holdDeniedRead=true);
   await p.focus('[data-account-reload]');await p.keyboard.press('Enter');
   if(['outside','reset'].includes(scenario)){
    await p.waitForFunction(()=>typeof releaseDeniedRead==='function');
    if(scenario==='reset'){await p.evaluate(()=>{playSupabase.auth.getSession=async()=>({data:{session:null}});authChange('SIGNED_OUT',null);});await p.waitForFunction(()=>document.querySelector('#staff').hidden);await p.evaluate(()=>releaseDeniedRead());await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>connectionTool.state.phase),'closed');}
    else{await p.evaluate(()=>{const b=document.createElement('button');b.id='outside-denial';b.textContent='Outside control';document.body.prepend(b);b.focus();releaseDeniedRead();});await p.waitForFunction(()=>connectionTool.state.phase==='error');await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>document.activeElement.id),'outside-denial');}
   }else if(scenario==='downgrade'){
    await p.waitForFunction(()=>connectionTool.state.phase==='ready');assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.canEdit),false);assert.equal(await p.$$eval('[data-account-ranking],[data-account-flags],[data-account-primary],[data-account-disconnect]',n=>n.length),0);await p.evaluate(()=>oldConnectionConfirm.click());await new Promise(r=>setTimeout(r,150));assert.equal(await p.$eval('[role=alert]',n=>n.textContent),'','A closed confirmation stays inert after the capability reload');
   }else{
    await p.waitForFunction(()=>connectionTool.state.phase==='error');assert.equal(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.equal(await p.evaluate(()=>connectionTool.state.uncertain),true);assert.equal(await p.evaluate(()=>connectionTool.canLeave()),false);assert.equal(await p.$$eval('[data-account-flags],[data-account-primary],[data-account-disconnect]',n=>n.length),0);assert.match(await p.$eval('.account-tool-status',n=>n.textContent),/previous change still needs inspection/);
    if(scenario==='retry'){await p.evaluate(()=>denyConnectionRead=false);await p.focus('[data-account-reload]');await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase==='ready');assert.equal(await p.evaluate(()=>connectionTool.canLeave()),true);}
   }
   assert.deepEqual(await p.evaluate(()=>connectionWrites),before);
  }
  const writes=await p.evaluate(()=>connectionWrites);assert.equal(writes.length,scenario==='preflight'?0:1);if(writes.length){assert.equal(writes[0].args.p_user,'22222222-2222-4222-8222-222222222222');assert.equal(writes[0].args.p_twitch_user_id,'9102');}
  assert.deepEqual(errors,[]);console.log('PASS connection denial '+label);await p.close();
 }
}finally{await browser.close();}}
module.exports={installDeniedResponses};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
