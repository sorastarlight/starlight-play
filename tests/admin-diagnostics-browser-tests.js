// Read-only diagnostic UI with fictional masked data; all external requests blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['success','retry','mismatch','clear','outside','remount','escaping','refresh-failure','superseded']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());
  await page.setContent('<button id="outside">Outside workspace</button><main id="container"><div data-trainer-diagnostics></div></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-diagnostics.js'),'utf8')});
  await page.evaluate(mode=>{const id='11111111-1111-4111-8111-111111111111';window.calls=[];window.mount=()=>PLAY_ADMIN_DIAGNOSTICS.mount(document.querySelector('#container'),{id},'connections',async target=>{calls.push(target);if(['clear','outside','remount'].includes(mode)||mode==='superseded'&&calls.length===2)await new Promise(r=>window.release=r);
   if(mode==='retry'&&calls.length===1||mode==='refresh-failure'&&calls.length===2)throw Error('Fictional read failed');
   return {data:{targetUuid:mode==='mismatch'?'other':id,maskedEmail:mode==='escaping'?'<img src=x onerror=alert(1)>':'c•••@•••',emailVerified:true,passwordPresent:true,authProviders:['twitch'],observedAt:'2026-11-12T20:00:00Z',remainingRoutes:'Email and Twitch sign-in are available.'}};
  });mount();},mode);
  await page.focus('[data-trainer-diagnostics] > button');await page.keyboard.press('Enter');await page.waitForFunction(()=>calls.length===1);
  if(mode==='superseded'){
   await page.waitForFunction(()=>!document.querySelector('[data-trainer-diagnostics] > button').disabled);await page.evaluate(()=>{const b=document.querySelector('[data-trainer-diagnostics] > button');b.focus();b.click();});await page.waitForFunction(()=>calls.length===2);await new Promise(r=>setTimeout(r,250));assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BODY');await page.evaluate(()=>release());await new Promise(r=>setTimeout(r,250));assert.match(await page.evaluate(()=>document.activeElement.textContent),/inspection loaded/i);
  }else if(['clear','outside','remount'].includes(mode)){

   await page.evaluate(mode=>{if(mode==='clear')PLAY_ADMIN_DIAGNOSTICS.clear();if(mode==='outside')document.querySelector('#outside').focus();if(mode==='remount')mount();release();},mode);
   await new Promise(r=>setTimeout(r,300));
   if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');else assert(!await page.$('dl'),'Discarded response must not repopulate details');
  }else{
   await page.waitForFunction(()=>!document.querySelector('[data-trainer-diagnostics] > button').disabled);await new Promise(r=>setTimeout(r,250));
   let status=await page.evaluate(()=>({text:document.activeElement.textContent,role:document.activeElement.getAttribute('role')}));
   assert.equal(status.role,'status');assert.match(status.text,['retry','mismatch'].includes(mode)?/Inspection unavailable/:/inspection loaded/i);
   if(['retry','refresh-failure'].includes(mode)){
    await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BUTTON');await page.keyboard.press('Enter');await page.waitForFunction(()=>calls.length===2&&!document.querySelector('[data-trainer-diagnostics] > button').disabled);await new Promise(r=>setTimeout(r,250));
    const text=await page.evaluate(()=>document.activeElement.textContent);assert.match(text,mode==='retry'?/inspection loaded/i:/Inspection unavailable/);if(mode==='refresh-failure')assert(!await page.$('dl'));
   }
   if(mode==='escaping'){assert(!await page.$('img'));assert.match(await page.$eval('dl',e=>e.textContent),/<img src=x/);}
   if(mode==='success')assert.equal(await page.$$eval('dl dt',rows=>rows.length),5);
  }
  assert.equal(await page.evaluate(()=>calls.length),['retry','refresh-failure','superseded'].includes(mode)?2:1);console.log('PASS diagnostics '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
