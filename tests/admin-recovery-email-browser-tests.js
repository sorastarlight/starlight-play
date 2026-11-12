// Isolated recovery UI with fictional prepare/send receipts; never sends an email.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['disabled','prepare-denied','mismatch','cancel','accepted','failed','uncertain','limited','clear-prepare','closed-send','outside-send']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-recovery-email.js'),'utf8')});
  await page.evaluate(mode=>{const id='11111111-1111-4111-8111-111111111111';window.calls=[];Object.defineProperty(crypto,'randomUUID',{value:()=> '22222222-2222-4222-8222-222222222222'});PLAY_ADMIN_RECOVERY_EMAIL.mount(document.querySelector('#editor'),{id,displayName:'Fictional Cedar'},async body=>{calls.push(structuredClone(body));if(body.action==='prepare'){
   if(mode==='clear-prepare')await new Promise(r=>window.release=r);if(mode==='disabled')return {data:{state:'disabled'}};if(mode==='prepare-denied')throw Error('Fictional denied');return {data:{state:'prepared',targetUuid:mode==='mismatch'?'wrong':id,challengeId:'fictional-challenge',snapshotRevision:'fictional-revision',maskedDestination:'c•••@•••'}};
  }if(['closed-send','outside-send'].includes(mode))await new Promise(r=>window.release=r);if(mode==='uncertain')throw Error('Fictional timeout');return {data:{state:['closed-send','outside-send'].includes(mode)?'accepted':mode}};});},mode);
  await page.focus('#editor > button');await page.keyboard.press('Enter');await page.waitForFunction(()=>calls.length===1);
  if(['disabled','prepare-denied','mismatch'].includes(mode)){
   await new Promise(r=>setTimeout(r,300));assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');assert.match(await page.evaluate(()=>document.activeElement.textContent),mode==='disabled'?/awaiting email-template/:/Owner access and a recent sign-in/);assert.equal(await page.$$eval('dialog',r=>r.length),0);
  }else if(mode==='clear-prepare'){
   await page.evaluate(()=>{PLAY_ADMIN_RECOVERY_EMAIL.clear();release();});await new Promise(r=>setTimeout(r,300));assert.equal(await page.$$eval('dialog',r=>r.length),0);
  }else{
   await page.waitForSelector('dialog[open]');assert.equal(await page.$eval('dialog',d=>d.contains(document.activeElement)),true);
   if(mode==='cancel'){
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Review recovery email');
   }else{
    await page.type('dialog textarea','Fictional recovery acceptance');await page.type('dialog [name=caseRef]','CASE-FIXTURE');await page.focus('dialog button[type=submit]');await page.keyboard.press('Enter');await page.waitForFunction(()=>calls.length===2);
    if(['closed-send','outside-send'].includes(mode)){
     await page.keyboard.press('Escape');if(mode==='outside-send')await page.focus('#outside');await page.evaluate(()=>release());await new Promise(r=>setTimeout(r,350));if(mode==='outside-send')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');assert.match(await page.$eval('#editor [role=status]',e=>e.textContent),/attempted/);
    }else{
     await new Promise(r=>setTimeout(r,350));assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-send-status')),true);const text=await page.evaluate(()=>document.activeElement.textContent);assert.match(text,mode==='accepted'?/accepted.*Delivery has not been confirmed/:mode==='failed'?/rejected/:mode==='limited'?/limited/:/could not be confirmed/);await page.keyboard.press('Escape');await new Promise(r=>setTimeout(r,250));assert.match(await page.evaluate(()=>document.activeElement.textContent),/attempted/);
    }
    assert.equal(await page.$eval('#editor > button',b=>b.disabled),true);await page.evaluate(()=>document.querySelector('#editor > button').onclick());assert.equal(await page.evaluate(()=>calls.length),2);assert.deepEqual(await page.evaluate(()=>calls.map(c=>c.action)),['prepare','send']);assert.equal(await page.evaluate(()=>calls[1].reason),'Fictional recovery acceptance');
   }
  }
  assert.equal(await page.evaluate(()=>calls.length),['accepted','failed','uncertain','limited','closed-send','outside-send'].includes(mode)?2:1);console.log('PASS recovery email '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
