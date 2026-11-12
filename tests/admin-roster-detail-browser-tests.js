// Real roster/presenters in Firefox; bounded fictional reads, fake inspector guards, no writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['close','escape','guard','reset']){
  const page=await browser.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent('<main id="editor"></main>');
  for(const name of ['admin-next-trainers.js','admin-next-record.js','admin-next-roster.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+name),'utf8')});
  await page.evaluate(mode=>{const id='11111111-1111-4111-8111-111111111111';window.reads=0;window.warns=0;window.resets=0;window.allowed=mode!=='guard';window.app=PLAY_ADMIN_ROSTER.mount(document.querySelector('#editor'),id,async()=>{reads++;return {ok:true,userId:id,pokemon:[{id:'fictional-mon',dex:1,name:'Bulbasaur',level:5,battleData:{stats:{hp:20},ivs:{hp:30},evs:{hp:0}}}],hasMore:false,nextCursor:null,pageSize:40,generation:1};},PLAY_ADMIN_NEXT_TRAINERS,{mountInspector:()=>({canLeave:()=>allowed,warnBeforeLeaving:()=>warns++,reset:()=>resets++})});},mode);
  await page.waitForSelector('[data-roster-mon]');await page.focus('[data-roster-mon]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-roster-close')),true);assert.match(await page.$eval('dialog',e=>e.textContent),/Bulbasaur.*Level 5/);assert.match(await page.$eval('table',e=>e.textContent),/20.*30.*0/);
  if(mode==='reset'){await page.evaluate(()=>app.reset());assert.equal(await page.$$('dialog').then(r=>r.length),0);assert.equal(await page.$eval('#editor',e=>e.textContent),'');}
  else{
   if(mode==='guard'){await page.keyboard.press('Escape');assert.equal(await page.$eval('dialog',e=>e.open),true);assert.equal(await page.evaluate(()=>warns),1);await page.keyboard.press('Enter');assert.equal(await page.$eval('dialog',e=>e.open),true);assert.equal(await page.evaluate(()=>warns),2);await page.evaluate(()=>allowed=true);}
   await page.keyboard.press(mode==='close'?'Enter':'Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-roster-mon')),true);
  }
  assert.equal(await page.evaluate(()=>reads),1);assert.equal(await page.evaluate(()=>resets),mode==='reset'?2:1);assert.deepEqual(errors,[]);console.log('PASS roster detail '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
