// Actual Hub/account/correction views; fictional transports, no hosted application calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const base=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+base.slice(base.indexOf('async function handoffFixture('),base.indexOf('(async()=>')))();
function installHistoryTools(mode){
 window.historyWrites=[];window.historyReads=0;
 const id='22222222-2222-4222-8222-222222222222',original=playCall;
 window.playCall=async(name,args)=>{
  if(name==='admin_list_users')return{users:[{id,displayName:'Fictional Cedar',login:'cedar',role:'player'}],total:1};
  const r=await original(name,args);
  if(name==='admin_user_account')Object.assign(r,{staffRole:'owner',canEdit:true,ownerTools:true,connections:[],user:{...r.user,emailLogin:true}});
  if(name==='admin_identity_inspect')Object.assign(r,{ok:true,rankingVisible:true});return r;
 };
 for(const [name,kind] of [['PLAY_ADMIN_ACCOUNT_TOOLS','account'],['PLAY_TRAINER_CORRECTIONS','inventory']]){
  const api=window[name],mount=api.mount;
  api.adapter=()=>async(operation,request)=>{
   if(operation==='write'||operation==='save'){
    historyWrites.push(structuredClone(request));
    if(mode==='pending'||mode==='pending-finish')await new Promise(r=>window.releaseHistoryWrite=r);
    if(mode==='uncertain'||mode==='recovered')throw Object.assign(Error('Fictional unconfirmed result'),{correctionOutcomeUnknown:true});
   }else historyReads++;
   if(kind==='inventory'&&operation==='save')return{trainerId:id,requestId:request.requestId,status:'saved'};
   return kind==='account'?{target:id,staffRole:'owner',canEdit:true,ownerTools:true,emailLogin:true,rankingVisible:operation==='write'?false:true,connections:[]}:{trainerId:id,revision:'r1',protected:false,values:[{id:'honey',name:'Honey',kind:'item',value:5,editable:true}],pokemon:[],history:mode==='recovered'&&historyWrites.length?[{requestId:historyWrites[0].requestId,status:'saved'}]:[]};
  };
  api.mount=(...args)=>window.historyTool=mount(...args);
 }
}
async function prepareHistoryAction(kind,mode){
 const wait=async fn=>{for(let i=0;i<140;i++){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Local history setup unavailable');};
 document.querySelector('[data-trainer-pane='+ (kind==='account'?'connections':'inventory')+']').click();
 await wait(()=>kind==='account'?document.querySelector('[data-account-ranking]'):document.querySelector('[data-section=items]'));
 if(kind==='inventory'){
  document.querySelector('[data-section=items]')?.click();
  await wait(()=>document.querySelector('[data-value-id]'));document.querySelector('[data-value-id]').click();
  const input=document.querySelector('[name=value]');input.value='6';input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 const form=document.querySelector(kind==='account'?'[data-account-ranking]':'[data-correction-form]');
 form.querySelector('textarea').value='Retained local staff reason';form.querySelector('textarea').dispatchEvent(new Event('input',{bubbles:true}));
 if(['review','cancel','pending','uncertain','recovered','pending-finish'].includes(mode)){
  form.querySelector('[type=submit]').click();await wait(()=>document.querySelector('dialog[open]'));
  if(['pending','uncertain','recovered','pending-finish'].includes(mode)){document.querySelector(kind==='account'?'[data-account-confirm]':'[data-correction-save]').click();await wait(()=>historyWrites.length===1);if(!['pending','pending-finish'].includes(mode))await wait(()=>historyTool.state.phase!=='saving');}
 }
 (document.querySelector('dialog[open] button')||document.querySelector(kind==='account'?'[data-trainer-account-tools] [role=status]':'[data-trainer-corrections] [role=status]')).focus();
}
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const direction of ['back','forward'])for(const kind of ['account','inventory'])for(const mode of ['draft','review','pending','uncertain','discard','cancel','outside','reset','recovered','pending-finish']){
  const label=direction+'/'+kind+'/'+mode;if(process.env.ACCOUNT_HISTORY_CASE&&process.env.ACCOUNT_HISTORY_CASE!==label)continue;
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6500);await p.setRequestInterception(true);
  const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
  p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section='+(direction==='back'?'support':'trainers'));
  await p.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools','admin-trainer-corrections'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.evaluate(installHistoryTools,mode);await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});
  if(direction==='back')await p.click('[data-next-tab=trainers]');await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');
  if(direction==='forward'){await p.click('[data-record-support]');await p.goBack();await p.waitForFunction(()=>!document.querySelector('#next-panel-trainers').hidden);}
  await p.evaluate(prepareHistoryAction,kind,mode);const url=p.url(),length=await p.evaluate(()=>history.length),writes=await p.evaluate(()=>historyWrites.length),payloads=await p.evaluate(()=>structuredClone(historyWrites));await p.evaluate(direction=>history[direction](),direction);await new Promise(r=>setTimeout(r,350));
  assert.equal(await p.evaluate(()=>location.href),url,label+' retains URL');assert.equal(await p.$eval('#next-panel-trainers',n=>n.hidden),false);assert.equal(await p.evaluate(()=>history.length),length);assert.equal(await p.evaluate(()=>historyWrites.length),writes);
  const warning=await p.evaluate(()=>document.activeElement.textContent);assert.match(warning,kind==='account'?/account|result|Reload/:/correction|result|Reload/);
  if(['review','cancel'].includes(mode))assert.equal(await p.evaluate(()=>!!document.activeElement.closest('dialog[open]')),true,'Warning must be inside modal');
  if(['draft','discard','outside','reset'].includes(mode)){assert.equal(await p.$eval('textarea',n=>n.value),'Retained local staff reason');if(kind==='inventory')assert.equal(await p.$eval('[name=value]',n=>n.value),'6');}
  if(mode==='outside'){await p.evaluate(()=>{const b=document.createElement('button');b.id='external-focus';b.textContent='Outside control';document.body.prepend(b);historyTool.warnBeforeLeaving();b.focus();});await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>document.activeElement.id),'external-focus');}
  if(['discard','cancel','reset','recovered','pending-finish'].includes(mode)){
   if(mode==='pending-finish'){await p.evaluate(()=>releaseHistoryWrite());await p.waitForFunction(()=>historyTool.state.phase!=='saving');}
   if(mode==='recovered'||mode==='pending-finish'){await p.click(kind==='account'?'[data-account-reload]':'[data-correction-load]');await p.waitForFunction(()=>historyTool.state.phase==='ready');assert.equal(await p.evaluate(()=>historyTool.canLeave()),true);}
   if(mode==='cancel')await p.keyboard.press('Escape');
   if(mode==='reset')await p.evaluate(()=>{actor=null;playSupabase.auth.getSession=async()=>({data:{session:null}});authChange('SIGNED_OUT',null);});
   else if(!['recovered','pending-finish'].includes(mode))await p.click(kind==='account'?'[data-account-discard]':'[data-discard]');
   if(mode!=='reset'){await p.evaluate(direction=>history[direction](),direction);await p.waitForFunction(()=>new URL(location.href).searchParams.get('section')==='support');}
   else{await p.waitForFunction(()=>document.querySelector('#staff').hidden);assert.equal(await p.evaluate(()=>historyTool.state.phase),'closed');assert.equal(await p.$$eval('[data-account-confirm],[data-correction-save]',n=>n.length),0);}
  }
  assert.equal(await p.evaluate(()=>historyWrites.length),writes);assert.deepEqual(await p.evaluate(()=>historyWrites),payloads,'Navigation must preserve exact requests');assert.deepEqual(errors,[]);console.log('PASS account/inventory history '+label);await p.close();
 }
}finally{await browser.close();}}
module.exports={installHistoryTools,prepareHistoryAction};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
