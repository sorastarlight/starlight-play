// Staff access accessibility only: local fictional reads, no role saves.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['read','review','draft','outside','reset','saved','denied','unknown']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());
  await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-staff-access.js'),'utf8')});
  await page.evaluate(async mode=>{const id='11111111-1111-4111-8111-111111111111';window.reads=0;window.writes=0;Object.defineProperty(crypto,'randomUUID',{value:()=> '33333333-3333-4333-8333-333333333333'});
   window.app=PLAY_STAFF_ACCESS.mount(document.querySelector('#editor'),async(kind,payload)=>{if(kind!=='read'){writes++;if(mode==='saved')return {status:'saved',requestId:payload.requestId,trainerId:payload.trainerId};if(mode==='denied')throw Object.assign(Error('Fictional denial'),{code:'42501'});if(mode==='unknown')throw Error('Fictional unconfirmed result');throw Error('Writes blocked');}reads++;if(reads===2&&mode==='read')throw Error('Fictional read failure');if(reads===2&&['outside','reset'].includes(mode))await new Promise(r=>window.release=r);
    return {actorId:'22222222-2222-4222-8222-222222222222',trainerId:id,trainerName:'Fictional Cedar',role:'player',revision:'r1',choices:['player','moderator'],history:[]};});
   await app.open(id);
  },mode);
  if(['saved','denied','unknown'].includes(mode)){
   await page.select('[name=role]','moderator');await page.type('[name=reason]','Fictional staff draft');await page.focus('[data-role-form] button[type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');await page.focus('[data-role-save]');await page.keyboard.press('Enter');await page.waitForFunction(()=>['saved','error'].includes(app.state.phase));await new Promise(r=>setTimeout(r,250));
   const outcome=await page.evaluate(()=>({text:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label'),role:document.activeElement.getAttribute('role')}));assert.equal(outcome.role,'status');assert.equal(outcome.label,outcome.text);assert.match(outcome.text,mode==='saved'?/Staff access updated/:mode==='denied'?/Access or trainer details changed/:/result could not be confirmed/);
  }else if(['read','outside','reset'].includes(mode)){

   await page.focus('[data-role-load]');await page.keyboard.press('Enter');
   if(mode==='read'){
    await page.waitForFunction(()=>app.state.phase==='error');await new Promise(r=>setTimeout(r,250));
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),await page.evaluate(()=>app.state.message));assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
    await page.focus('[data-role-load]');await page.keyboard.press('Enter');await page.waitForFunction(()=>app.state.phase==='ready');await new Promise(r=>setTimeout(r,250));
    assert.match(await page.evaluate(()=>document.activeElement.textContent),/Staff access loaded/);
   }else{
    await page.waitForFunction(()=>reads===2);await page.evaluate(mode=>{if(mode==='outside')document.querySelector('#outside').focus();else app.reset();release();},mode);await new Promise(r=>setTimeout(r,250));
    if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');else assert.equal(await page.evaluate(()=>app.state.phase),'closed');
   }
  }else{
   await page.select('[name=role]','moderator');await page.type('[name=reason]','Fictional staff draft');
   if(mode==='review'){
    await page.focus('[data-role-form] button[type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Review access change');
    assert.equal(await page.$eval('[name=reason]',e=>e.value),'Fictional staff draft');
   }else{
    await page.focus('[data-role-load]');await page.keyboard.press('Enter');await new Promise(r=>setTimeout(r,250));
    const warning=await page.evaluate(()=>({text:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label')}));assert.match(warning.label,/Finish reviewing or discard/);assert.equal(warning.label,warning.text);assert.equal(await page.evaluate(()=>reads),1);assert.equal(await page.evaluate(()=>app.canLeave()),false);
   }
  }
  assert.equal(await page.evaluate(()=>writes),['saved','denied','unknown'].includes(mode)?1:0);console.log('PASS staff access '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
