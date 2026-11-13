// Actual Hub and reward UI; same-document traversal only, fictional session/data/receipts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const source=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const historyFixture=Function('return '+source.slice(source.indexOf('async function handoffFixture('),source.indexOf('(async()=>')))();
(async()=>{const b=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const direction of ['back','forward'])for(const mode of ['normal','review','pending','uncertain','confirmed','recovered','review-cancel','pending-finish','rapid','outside','foreign']){
  const label=direction+'/'+mode;if(process.env.TRAINER_HISTORY_CASE&&process.env.TRAINER_HISTORY_CASE!==label)continue;
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6000);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');await p.setRequestInterception(true);p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section='+(direction==='back'?'support':'trainers'));
  const state=['normal','review','review-cancel'].includes(mode)?'normal':mode==='pending-finish'?'pending':mode==='confirmed'?'confirmed':mode==='pending'?'pending':'uncertain';await p.evaluate(historyFixture,state);
  for(const n of ['admin-next-trainers','admin-next-record','admin-next-rewards','admin-next'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});
  if(direction==='back'){await p.waitForSelector('[data-next-tab=trainers]');if(mode==='foreign')await p.evaluate(()=>history.replaceState({foreign:true},'',location.href));await p.click('[data-next-tab=trainers]');
   if(mode==='rapid'){await p.click('[data-next-tab=support]');await p.click('[data-next-tab=trainers]');}}
  await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');
  if(direction==='forward'){await p.click('[data-record-support]');if(mode==='foreign')await p.evaluate(()=>history.replaceState({foreign:true},'',location.href));if(mode==='rapid'){await p.click('[data-next-tab=trainers]');await p.click('[data-next-tab=support]');await p.evaluate(()=>history.go(-3));}else await p.goBack();await p.waitForFunction(()=>!document.querySelector('#next-panel-trainers').hidden);}
  if(mode!=='normal'){
   await p.click('[data-trainer-pane=gifts]');await p.waitForSelector('[name=key]');await p.select('[name=key]','honey');await p.focus('[data-reward-form] [type=submit]');await p.keyboard.press('Enter');await p.waitForSelector('.reward-review-form');
   if(['review','review-cancel'].includes(mode))await p.$eval('textarea',n=>n.value='Local review retained');
   if(!['review','review-cancel'].includes(mode)){await p.$eval('textarea',n=>n.value='Local history fixture');await p.focus('.reward-deliver');await p.keyboard.press('Enter');if(state==='pending')await p.waitForFunction(()=>typeof releaseHandoffWrite==='function');else await p.waitForSelector('[data-reward-retry]:not([hidden])');}
  }
  const expected=await p.url(),length=await p.evaluate(()=>history.length),mounts=await p.evaluate(()=>supportMounts.length),writes=await p.evaluate(()=>window.writes.length);await p.evaluate(direction=>history[direction](),direction);
  if(mode==='normal'){await p.waitForFunction(()=>new URL(location.href).searchParams.get('section')==='support');await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>document.activeElement.matches('#next-panel-support h2')),true,'Ordinary traversal should orient focus to destination');}
  else{
   await p.waitForFunction(expected=>location.href===expected,{},expected);await new Promise(r=>setTimeout(r,200));assert.equal(await p.$eval('#next-panel-trainers',n=>n.hidden),false);assert.equal(await p.evaluate(()=>history.length),length,'Blocked managed traversal must not add history entries');assert.equal(await p.evaluate(()=>supportMounts.length),mounts);assert.equal(await p.evaluate(()=>window.writes.length),writes);
   if(mode==='review'||mode==='review-cancel'){assert.equal(await p.$eval('dialog',n=>n.open),true);assert.match(await p.evaluate(()=>document.activeElement.textContent),/Finish or cancel/);assert.equal(await p.evaluate(()=>!!document.activeElement.closest('dialog')),true);assert.equal(await p.$eval('textarea',n=>n.value),'Local review retained');}
   if(mode==='rapid'){await p.evaluate(direction=>{history[direction]();history[direction]();},direction);await new Promise(r=>setTimeout(r,350));assert.equal(await p.url(),expected);assert.equal(await p.$eval('#next-panel-trainers',n=>n.hidden),false);}
   if(mode==='outside'){await p.evaluate(()=>{const outside=document.createElement('button');outside.id='outside-history';outside.textContent='Outside control';document.body.prepend(outside);outside.focus();});await new Promise(r=>setTimeout(r,250));assert.equal(await p.evaluate(()=>document.activeElement.id),'outside-history');}
   if(mode==='recovered'||mode==='pending-finish'||mode==='review-cancel'){
    if(mode==='review-cancel')await p.keyboard.press('Escape');else if(mode==='pending-finish')await p.evaluate(()=>releaseHandoffWrite());else{await p.focus('[data-reward-retry]');await p.keyboard.press('Enter');}
    await p.waitForFunction(()=>PLAY_ADMIN_REWARDS.canLeave(document.querySelector('#next-trainer-detail')));await p.evaluate(direction=>history[direction](),direction);await p.waitForFunction(()=>new URL(location.href).searchParams.get('section')==='support');assert.equal(await p.$eval('#next-panel-support',n=>n.hidden),false);assert.equal(await p.evaluate(()=>window.writes.length),mode==='recovered'?2:mode==='pending-finish'?1:0);
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS Trainer history '+label);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
