// Actual Hub, Staff access adapter/controller; only endpoint/session replies are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const source=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+source.slice(source.indexOf('async function handoffFixture('),source.indexOf('(async()=>')))();
function installStaffHub(mode){
 window.actor='aaaaaaaa-1111-4111-8111-111111111111';const original=playCall,mount=PLAY_STAFF_ACCESS.mount,id='22222222-2222-4222-8222-222222222222';
 window.staffWrites=[];window.staffReads=0;window.staffReadFailure=false;window.staffSnapshot={actorId:actor,trainerId:id,trainerName:'Fictional Cedar',role:'player',revision:'r1',choices:['player','moderator'],history:[]};
 PLAY_STAFF_ACCESS.mount=(...args)=>window.staffTool=mount(...args);
 window.playCall=async(name,args)=>{
  if(name==='admin_list_users')return{users:[{id,displayName:'Fictional Cedar',login:'cedar',role:'player'}],total:1};
  if(name==='admin_staff_access_read'){staffReads++;if(staffReadFailure)throw Error('Fictional read unavailable');const s=structuredClone(staffSnapshot);if(mode==='read-actor')s.actorId='bbbbbbbb-2222-4222-8222-222222222222';if(mode==='read-trainer')s.trainerId='cccccccc-3333-4333-8333-333333333333';return s;}
  if(name==='admin_staff_access_save'){
   staffWrites.push(structuredClone(args));if(mode.startsWith('pending'))await new Promise(r=>window.releaseStaffWrite=r);
   if(mode==='denied')throw Object.assign(Error('Fictional denial'),{code:'42501'});
   staffSnapshot.role=args.p_intent.role;staffSnapshot.revision='r2';staffSnapshot.history=[{before:'player',after:args.p_intent.role,reason:args.p_intent.reason,createdAt:'2026-11-13T12:00:00Z'}];
   const r={status:'saved',requestId:args.p_intent.requestId,trainerId:id};if(mode==='null')return null;if(mode==='wrong-request')r.requestId='dddddddd-4444-4444-8444-444444444444';if(mode==='wrong-trainer')r.trainerId='cccccccc-3333-4333-8333-333333333333';if(mode==='wrong-status')r.status='queued';return r;
  }
  return original(name,args);
 };
}
async function prepareStaffHub(mode){
 const wait=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Staff fixture unavailable');};
 document.querySelector('[data-trainer-pane=access]').click();await wait(()=>window.staffTool&&staffTool.state.phase!=='loading');
 if(mode.startsWith('read-'))return;
 const form=document.querySelector('[data-role-form]');form.elements.role.value='moderator';form.elements.role.dispatchEvent(new Event('change',{bubbles:true}));form.elements.reason.value='Fictional documented access change';form.elements.reason.dispatchEvent(new Event('input',{bubbles:true}));
 if(!mode.startsWith('draft')){form.querySelector('[type=submit]').focus();form.querySelector('[type=submit]').click();await wait(()=>document.querySelector('dialog[open]'));}
 if(['saved','null','wrong-request','wrong-trainer','wrong-status','denied','reload-fail','retry'].includes(mode)||mode.startsWith('pending')){document.querySelector('[data-role-save]').focus();document.querySelector('[data-role-save]').click();await wait(()=>staffWrites.length===1);if(!mode.startsWith('pending'))await wait(()=>staffTool.state.phase!=='saving');}
}
const cases=['review-reload','review-record','review-back','review-forward','review-cancel','review-outside','draft-record','draft-discard','pending-record','pending-reset','saved','null','wrong-request','wrong-trainer','wrong-status','denied','read-actor','read-trainer','reload-fail','retry'];
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{for(const mode of cases){if(process.env.STAFF_HUB_CASE&&process.env.STAFF_HUB_CASE!==mode)continue;const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);await page.setRequestInterception(true);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');page.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await page.goto('https://fixture.invalid/admin-next.html?section=trainers');await page.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-staff-access'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await page.evaluate(installStaffHub,mode);await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});await page.waitForSelector('[data-open-trainer]');await page.click('[data-open-trainer]');await page.waitForSelector('[data-record-support]');await page.evaluate(prepareStaffHub,mode);await page.evaluate(()=>window.staleStaffSave=document.querySelector('[data-role-save]'));
 if(mode.startsWith('review')||mode.startsWith('draft')||mode==='pending-record'){
  const url=page.url();if(mode==='review-reload')await page.evaluate(()=>staffTool.warnBeforeLeaving());else if(mode==='review-back'||mode==='review-forward')await page.evaluate(mode=>{history.pushState({foreign:true},'',location.href);if(mode==='review-forward'){history.back();setTimeout(()=>history.forward(),100);}else history.back();},mode);else if(mode==='review-outside')await page.evaluate(()=>{staffTool.warnBeforeLeaving();const b=document.createElement('button');b.id='outside-staff';b.textContent='Other review control';document.querySelector('dialog[open]').append(b);b.focus();});else await page.evaluate(()=>document.querySelector('[data-trainers-back]').click());await new Promise(r=>setTimeout(r,350));
  assert.equal(page.url(),url);assert.equal(await page.$eval('#next-panel-trainers',n=>n.hidden),false);
  if(mode==='review-outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside-staff');else{assert.match(await page.evaluate(()=>document.activeElement.textContent),/access change|access.*saved/);if(mode.startsWith('review'))assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog[open]')),true,'Warning must remain inside open Staff access review');}
  if(mode==='review-cancel'){await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Review access change');await page.evaluate(()=>staleStaffSave.click());}
  if(mode==='draft-discard'){await page.click('[data-role-discard]');assert.equal(await page.evaluate(()=>staffTool.canLeave()),true);}
 }
 if(mode==='pending-reset'){await page.evaluate(()=>{playSupabase.auth.getSession=async()=>({data:{session:null}});authChange('SIGNED_OUT',null);releaseStaffWrite();});await new Promise(r=>setTimeout(r,300));assert.equal(await page.evaluate(()=>staffTool.state.phase),'closed');assert.equal(await page.$eval('#staff',n=>n.hidden),true);}
 else if(mode==='pending-outside'){await page.evaluate(()=>{const b=document.createElement('button');b.id='outside-staff';b.textContent='Outside';document.body.prepend(b);b.focus();releaseStaffWrite();});await page.waitForFunction(()=>staffTool.state.phase!=='saving');await new Promise(r=>setTimeout(r,250));assert.equal(await page.evaluate(()=>document.activeElement.id),'outside-staff');}
 else if(mode==='pending-record'){await page.evaluate(()=>releaseStaffWrite());await page.waitForFunction(()=>staffTool.state.phase!=='saving');}
 if(['saved','null','wrong-request','wrong-trainer','wrong-status','denied','reload-fail','retry'].includes(mode)){
  assert.match(await page.$eval('[data-staff-access] [role=status]',n=>n.textContent),['saved','reload-fail','retry'].includes(mode)?/Staff access updated/:mode==='denied'?/Access or trainer details changed/:/result could not be confirmed/);
  if(mode==='reload-fail'||mode==='retry'){await page.evaluate(()=>staffReadFailure=true);await page.focus('[data-role-load]');await page.keyboard.press('Enter');await page.waitForFunction(()=>staffTool.state.phase==='error');assert.equal(await page.evaluate(()=>staffTool.state.snapshot),null);if(mode==='retry')await page.evaluate(()=>staffReadFailure=false);}
  if(mode!=='reload-fail'){await page.focus('[data-role-load]');await page.keyboard.press('Enter');await page.waitForFunction(()=>staffTool.state.phase==='ready');assert.equal(await page.evaluate(()=>staffTool.state.snapshot.role),mode==='denied'?'player':'moderator');assert.equal(await page.$eval('[name=reason]',n=>n.value),'');}
 }
 if(mode.startsWith('read-')){assert.equal(await page.evaluate(()=>staffTool.state.snapshot),null);assert.equal(await page.$$eval('[data-role-form]',n=>n.length),0);}
 const writes=await page.evaluate(()=>staffWrites);assert.equal(writes.length,mode.startsWith('pending')||['saved','null','wrong-request','wrong-trainer','wrong-status','denied','reload-fail','retry'].includes(mode)?1:0);if(writes.length)assert.deepEqual(writes[0].p_intent,{trainerId:'22222222-2222-4222-8222-222222222222',requestId:'11111111-1111-4111-8111-111111111111',revision:'r1',role:'moderator',reason:'Fictional documented access change'});assert.deepEqual(errors,[]);console.log('PASS full Hub staff '+mode);await page.close();}}finally{await browser.close();}}
module.exports={installStaffHub,prepareStaffHub,cases};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
