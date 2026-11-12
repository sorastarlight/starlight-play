// Actual nested diagnostic/recovery widgets; fictional transports only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['separate-results','cancel','prepare-switch','send-switch']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent('<main id="container"><div data-trainer-diagnostics></div></main>');
  for(const name of ['admin-next-recovery-email.js','admin-next-diagnostics.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+name),'utf8')});
  await page.evaluate(mode=>{window.calls=[];Object.defineProperty(crypto,'randomUUID',{value:()=> '33333333-3333-4333-8333-333333333333'});window.mount=id=>PLAY_ADMIN_DIAGNOSTICS.mount(document.querySelector('#container'),{id,displayName:'Fictional Cedar'},'connections',async target=>{calls.push('inspect');return {data:{targetUuid:target,maskedEmail:'c•••@•••',emailVerified:true,passwordPresent:true,authProviders:['twitch'],observedAt:'Fictional observation'}};},async body=>{calls.push(body.action);if(mode==='prepare-switch'&&body.action==='prepare'||mode==='send-switch'&&body.action==='send')await new Promise(r=>window.release=r);return {data:body.action==='prepare'?{state:'prepared',targetUuid:body.targetUuid,challengeId:'fixture',snapshotRevision:'r1',maskedDestination:'c•••@•••'}:{state:'accepted'}};});mount('11111111-1111-4111-8111-111111111111');},mode);
  if(mode==='separate-results'){
   await page.focus('[data-trainer-diagnostics] > button');await page.keyboard.press('Enter');await new Promise(r=>setTimeout(r,250));assert.match(await page.evaluate(()=>document.activeElement.textContent),/inspection loaded/i);assert.equal(await page.$eval('[data-recovery-email] > button',b=>b.textContent),'Review recovery email');
  }else{
   await page.focus('[data-recovery-email] > button');await page.keyboard.press('Enter');
   if(mode==='prepare-switch')await page.waitForFunction(()=>calls.includes('prepare'));
   else{
    await page.waitForSelector('dialog[open]');if(mode==='cancel'){await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Review recovery email');}
    else{await page.type('dialog textarea','Fictional integration acceptance');await page.focus('dialog button[type=submit]');await page.keyboard.press('Enter');await page.waitForFunction(()=>calls.includes('send'));}
   }
   if(mode.endsWith('switch')){await page.evaluate(()=>{mount('22222222-2222-4222-8222-222222222222');release();});await new Promise(r=>setTimeout(r,300));assert.equal(await page.$$eval('dialog',r=>r.length),0);assert.equal(await page.$eval('[data-recovery-email] > button',b=>b.disabled),false);assert(!await page.$eval('[data-recovery-email]',r=>/attempted|accepted/.test(r.textContent)));}
  }
  assert.deepEqual(await page.evaluate(()=>calls),mode==='separate-results'?['inspect']:mode==='send-switch'?['prepare','send']:['prepare']);console.log('PASS account support integration '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
