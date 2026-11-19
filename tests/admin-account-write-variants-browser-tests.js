// Actual Hub/Account adapter and controller; endpoint/session responses are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const {connectionFixture}=require('./admin-connection-recovery-browser-tests');
const source=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+source.slice(source.indexOf('async function handoffFixture('),source.indexOf('(async()=>')))();
function installVariant(action,fault){
 const original=playCall;window.variantWrites=[];
 if(action==='ranking-show')connectionIdentity.rankingVisible=false;
 window.playCall=async(name,args)=>{
  if(name==='admin_set_ranking_visible'){
   variantWrites.push({name,args:structuredClone(args)});connectionIdentity.rankingVisible=args.p_visible;
   if(fault==='null')return null;if(fault==='bad-ok')return{ok:'true',rankingVisible:args.p_visible};if(fault==='missing-visible')return{ok:true};if(fault==='string-visible')return{ok:true,rankingVisible:String(args.p_visible)};if(fault==='opposite')return{ok:true,rankingVisible:!args.p_visible};
   return{ok:true,rankingVisible:args.p_visible,...(fault==='with-other-fields'?{message:'Fictional saved note',unused:'ignored'}:{})};
  }
  const before=structuredClone(connectionAccount),result=await original(name,args);
  if(name!=='admin_set_twitch_flags')return result;
  variantWrites.push({name,args:structuredClone(args)});
  if(fault==='null')return null;if(fault==='stale')return before;
  const selected=result.connections.find(r=>r.twitchUserId==='9102');
  if(fault==='wrong-type')selected.type=selected.type==='secondary'?'player':'secondary';
  if(fault==='wrong-login')selected.loginEnabled=!selected.loginEnabled;
  if(fault==='wrong-gameplay')selected.gameplayEnabled=!selected.gameplayEnabled;
  if(fault==='unconfirmed-target')selected.confirmed=false;
  if(fault==='wrong-record-id')selected.id='dddddddd-4444-4444-8444-444444444444';
  if(fault==='missing-member')result.connections=result.connections.filter(r=>r.twitchUserId!=='9101');
  if(fault==='reordered')result.connections.reverse();return result;
 };
}
async function prepareVariant(action){
 const wait=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Variant fixture unavailable');};
 document.querySelector('[data-trainer-pane=connections]').click();await wait(()=>document.querySelector('[data-account-flags]'));
 let target;
 if(action.startsWith('ranking-')){const form=document.querySelector('[data-account-ranking]');form.elements.reason.value='Fictional ranking correction';target=form.querySelector('button');}
 else{const form=document.querySelector('[data-account-flags][data-tid="9102"]');if(action==='signin'){form.elements.loginEnabled.checked=true;form.elements.loginEnabled.dispatchEvent(new Event('change',{bubbles:true}));}else{form.elements.type.value=action;form.elements.type.dispatchEvent(new Event('change',{bubbles:true}));}target=form.querySelector('button');}
 target.focus();target.click();await wait(()=>document.querySelector('dialog[open]'));document.querySelector('[data-account-confirm]').focus();
}
const cases=[...['signin','bot','utility'].flatMap(a=>['exact','reordered','wrong-type','wrong-login','wrong-gameplay','unconfirmed-target','wrong-record-id','missing-member','null','stale'].map(f=>[a,f])),...['ranking-hide','ranking-show'].flatMap(a=>['null','bad-ok','missing-visible','string-visible','opposite','exact','with-other-fields'].map(f=>[a,f]))];
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const [action,fault] of cases){const label=action+'/'+fault;if(process.env.ACCOUNT_VARIANT_CASE&&process.env.ACCOUNT_VARIANT_CASE!==label)continue;const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);await page.setRequestInterception(true);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');page.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await page.goto('https://fixture.invalid/admin-next.html?section=trainers');await page.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await page.evaluate(connectionFixture,'confirmed');await page.evaluate(installVariant,action,fault);await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});await page.waitForSelector('[data-open-trainer]');await page.click('[data-open-trainer]');await page.waitForSelector('[data-record-support]');await page.evaluate(prepareVariant,action);await page.evaluate(()=>{window.oldVariantConfirm=document.querySelector('[data-account-confirm]');window.previousVariantSnapshot=structuredClone(connectionTool.state.snapshot);});await page.keyboard.press('Enter');await page.waitForFunction(()=>connectionTool.state.phase!=='saving');
  const valid=['exact','reordered','with-other-fields'].includes(fault),writes=await page.evaluate(()=>variantWrites);assert.equal(writes.length,1);assert.equal(writes[0].args.p_user,'22222222-2222-4222-8222-222222222222');
  if(action.startsWith('ranking-'))assert.deepEqual(writes[0],{name:'admin_set_ranking_visible',args:{p_user:'22222222-2222-4222-8222-222222222222',p_visible:action==='ranking-show',p_reason:'Fictional ranking correction'}});
  else assert.deepEqual(writes[0],{name:'admin_set_twitch_flags',args:{p_user:'22222222-2222-4222-8222-222222222222',p_twitch_user_id:'9102',p_gameplay_enabled:false,p_login_enabled:action==='signin',p_connection_type:action==='signin'?'secondary':action}});
  assert.equal(await page.evaluate(()=>connectionTool.state.uncertain),true);assert.equal(await page.evaluate(()=>connectionTool.canLeave()),false);assert.match(await page.$eval('.account-tool-status',n=>n.textContent),valid?/Change saved/:/Save outcome uncertain/);
  if(!valid){assert.deepEqual(await page.evaluate(()=>connectionTool.state.snapshot),await page.evaluate(()=>previousVariantSnapshot));await page.evaluate(()=>connectionReadFault=true);await page.focus('[data-account-reload]');await page.keyboard.press('Enter');await page.waitForFunction(()=>connectionTool.state.phase==='error');assert.equal(await page.evaluate(()=>connectionTool.state.snapshot),null);assert.equal(await page.evaluate(()=>connectionTool.state.uncertain),true);}
  await page.evaluate(()=>{oldVariantConfirm.click();connectionReadFault=false;});await page.focus('[data-account-reload]');await page.keyboard.press('Enter');await page.waitForFunction(()=>connectionTool.state.phase==='ready');assert.equal(await page.evaluate(()=>connectionTool.canLeave()),true);assert.equal(await page.evaluate(()=>connectionTool.state.snapshot.target),'22222222-2222-4222-8222-222222222222');if(action.startsWith('ranking-'))assert.equal(await page.evaluate(()=>connectionTool.state.snapshot.rankingVisible),action==='ranking-show');else{const row=await page.evaluate(()=>connectionTool.state.snapshot.connections.find(r=>r.twitchUserId==='9102'));assert.equal(row.type,action==='signin'?'secondary':action);assert.equal(row.loginEnabled,action==='signin');assert.equal(row.gameplayEnabled,false);assert.equal(await page.evaluate(()=>connectionWrites.length),1);}await page.evaluate(()=>oldVariantConfirm.click());assert.deepEqual(await page.evaluate(()=>variantWrites),writes);assert.equal(await page.evaluate(()=>connectionReads.every(r=>r.args.p_user==='22222222-2222-4222-8222-222222222222')),true);assert.deepEqual(errors,[]);console.log('PASS account write variant '+label);await page.close();
 }
}finally{await browser.close();}}
module.exports={installVariant,prepareVariant,cases};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
