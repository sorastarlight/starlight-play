// Fictional account navigation guard outcomes in real Firefox. No hosted requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['draft','saving','reset','outside']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());
  await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-account-tools.js'),'utf8')});
  await page.evaluate(mode=>{const id='11111111-1111-4111-8111-111111111111';window.writes=0;
   const data={ok:true,staffRole:'owner',canEdit:true,ownerTools:true,user:{id,emailLogin:true},connections:[]};
   window.app=PLAY_ADMIN_ACCOUNT_TOOLS.mount(document.querySelector('#editor'),id,()=>{writes++;return new Promise(()=>{});},data,{ok:true,rankingVisible:true});
   if(mode==='saving')app.save({action:'ranking',changes:{visible:false,reason:'Fictional draft'}});
   else document.querySelector('textarea').value='Fictional draft';
   document.querySelector('[data-account-reload]').focus();
  },mode);
  assert.equal(await page.evaluate(()=>app.canLeave()),false);
  await page.evaluate(mode=>{app.warnBeforeLeaving();if(mode==='reset')app.reset();if(mode==='outside')document.querySelector('#outside').focus();},mode);
  await new Promise(r=>setTimeout(r,300));
  if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');
  else if(mode==='reset')assert.equal(await page.evaluate(()=>app.state.phase),'closed');
  else{
   const status=await page.evaluate(()=>({text:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label'),role:document.activeElement.getAttribute('role'),hidden:document.activeElement.firstElementChild?.getAttribute('aria-hidden')}));
   assert.match(status.label,mode==='saving'?/being saved/:/Finish reviewing or discard/);assert.equal(status.label,status.text);assert.equal(status.role,'status');assert.equal(status.hidden,'true');
  }
  assert.equal(await page.evaluate(()=>writes),mode==='saving'?1:0);console.log('PASS account navigation '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
