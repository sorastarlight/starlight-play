// Actual Hub/controllers with fictional adapters. All application network calls are blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const {installHistoryTools,prepareHistoryAction}=require('./admin-account-inventory-history-browser-tests');
const source=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+source.slice(source.indexOf('async function handoffFixture('),source.indexOf('(async()=>')))();
function installReloadTools(scenario){
 window.reloadAttempts=0;window.reloadFault=true;window.reloadFound=false;
 for(const name of ['PLAY_ADMIN_ACCOUNT_TOOLS','PLAY_TRAINER_CORRECTIONS']){
  const api=window[name],factory=api.adapter;
  api.adapter=(...args)=>{const base=factory(...args);return async(operation,request)=>{
   if(operation==='read'&&historyWrites.length){
    reloadAttempts++;
    if(['loading','outside','reset','outside-success','reset-success'].includes(scenario))await new Promise(r=>window.releaseRecoveryRead=r);
    if(reloadFault&&!['still','found','repeat','duplicate','mismatch','failed-receipt'].includes(scenario))throw Error('Fictional inspection unavailable');
   }
   let snapshot;try{snapshot=await base(operation,request);}catch(error){if(scenario==='session'&&operation==='write')error.accountOutcomeUnknown=true;throw error;}
   if(operation==='read'&&name==='PLAY_TRAINER_CORRECTIONS'&&reloadFound)snapshot.history=[{requestId:historyWrites[0].requestId,status:'saved'}];
   if(operation==='read'&&name==='PLAY_TRAINER_CORRECTIONS'&&historyWrites.length){const id=historyWrites[0].requestId;if(scenario==='duplicate')snapshot.history=[{requestId:id,status:'saved'},{requestId:id,status:'saved'}];if(scenario==='mismatch')snapshot.history=[{requestId:'wrong-'+id,status:'saved'}];if(scenario==='failed-receipt')snapshot.history=[{requestId:id,status:'failed'}];}
   return snapshot;
  };};
 }
}
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const direction of ['back','forward'])for(const kind of ['account','inventory'])for(const scenario of kind==='account'?['failure','confirmed','session','retry','loading','outside','reset','outside-success','reset-success']:['failure','still','found','repeat','duplicate','mismatch','failed-receipt','outside','reset','outside-success','reset-success']){
  const label=direction+'/'+kind+'/'+scenario;if(process.env.RECOVERY_RELOAD_CASE&&process.env.RECOVERY_RELOAD_CASE!==label)continue;
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);await p.setRequestInterception(true);
  const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section='+(direction==='back'?'support':'trainers'));
  await p.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools','admin-trainer-corrections'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.evaluate(installHistoryTools,scenario==='confirmed'?'finish':'uncertain');await p.evaluate(installReloadTools,scenario);await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});
  if(direction==='back')await p.click('[data-next-tab=trainers]');await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');if(direction==='forward'){await p.click('[data-record-support]');await p.goBack();await p.waitForFunction(()=>!document.querySelector('#next-panel-trainers').hidden);}
  await p.evaluate(prepareHistoryAction,kind,'uncertain');
  const original=await p.evaluate(()=>structuredClone(historyWrites)),url=await p.evaluate(()=>location.href),length=await p.evaluate(()=>history.length),reload=kind==='account'?'[data-account-reload]':'[data-correction-load]';
  await p.focus(reload);await p.keyboard.press('Enter');
  if(['loading','outside','reset','outside-success','reset-success'].includes(scenario))await p.waitForFunction(()=>typeof releaseRecoveryRead==='function');else await p.waitForFunction(()=>historyTool.state.phase!=='loading');
  if(scenario.startsWith('reset')){
   await p.evaluate(scenario=>{if(scenario==='reset-success')reloadFault=false;playSupabase.auth.getSession=async()=>({data:{session:null}});authChange('SIGNED_OUT',null);},scenario);await p.waitForFunction(()=>document.querySelector('#staff').hidden);await p.evaluate(()=>releaseRecoveryRead());await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>historyTool.state.phase),'closed');assert.equal(await p.$$eval('[data-account-confirm],[data-correction-save]',n=>n.length),0);
  }else if(scenario.startsWith('outside')){
   await p.evaluate(scenario=>{if(scenario==='outside-success')reloadFault=false;const b=document.createElement('button');b.id='outside-recovery';b.textContent='Outside control';document.body.prepend(b);b.focus();releaseRecoveryRead();},scenario);await p.waitForFunction(()=>historyTool.state.phase!=='loading');await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>document.activeElement.id),'outside-recovery');
  }else{
   const blocked=async()=>{await p.evaluate(direction=>history[direction](),direction);await new Promise(r=>setTimeout(r,300));assert.equal(await p.evaluate(()=>location.href),url,'Recovery inspection must retain URL');assert.equal(await p.$eval('#next-panel-trainers',n=>n.hidden),false);assert.equal(await p.evaluate(()=>history.length),length);assert.equal(await p.evaluate(()=>historyTool.canLeave()),false);};
   await blocked();
   if(kind==='inventory')assert.equal(await p.evaluate(()=>historyTool.state.recovery.requestId),original[0].requestId);
   if(['failure','confirmed','session','retry'].includes(scenario))assert.equal(await p.evaluate(()=>historyTool.state.phase),'error');
   if(scenario==='loading'){await p.evaluate(()=>releaseRecoveryRead());await p.waitForFunction(()=>historyTool.state.phase==='error');await blocked();}
   if(scenario==='repeat'){await p.focus(reload);await p.keyboard.press('Enter');await p.waitForFunction(()=>historyTool.state.phase==='ready');await blocked();assert.equal(await p.evaluate(()=>reloadAttempts),2);}
   if(scenario==='retry'||scenario==='found'){
    await p.evaluate(()=>{reloadFault=false;reloadFound=true;});await p.focus(reload);await p.keyboard.press('Enter');await p.waitForFunction(()=>historyTool.state.phase==='ready');assert.equal(await p.evaluate(()=>historyTool.canLeave()),true);await p.evaluate(direction=>history[direction](),direction);await p.waitForFunction(()=>new URL(location.href).searchParams.get('section')==='support');
   }
  }
  assert.deepEqual(await p.evaluate(()=>historyWrites),original,'Never repeat the original write during inspection');assert.deepEqual(errors,[]);console.log('PASS recovery reload '+label);await p.close();
 }
}finally{await browser.close();}}
module.exports={installReloadTools};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
