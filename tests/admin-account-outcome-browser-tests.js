// Real Account controls with intercepted requests and fictional outcomes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['saved','unknown','denied','changed','session-unknown','outside','reset']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());
  await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-account-tools.js'),'utf8')});
  await page.evaluate(mode=>{const id='11111111-1111-4111-8111-111111111111';window.writes=0;
   const data={ok:true,staffRole:'owner',canEdit:true,ownerTools:true,user:{id,emailLogin:true},connections:[]},identity={ok:true,rankingVisible:true};
   window.app=PLAY_ADMIN_ACCOUNT_TOOLS.mount(document.querySelector('#editor'),id,async()=>{writes++;await new Promise(r=>window.release=r);
    if(mode==='unknown')throw Error('Unconfirmed');if(mode==='denied')throw Object.assign(Error('Denied'),{code:'42501'});if(mode==='changed')throw Object.assign(Error('Changed'),{code:'ACCOUNT_CHANGED'});if(mode==='session-unknown')throw Object.assign(Error('Session changed'),{accountOutcomeUnknown:true});
    return {...PLAY_ADMIN_ACCOUNT_TOOLS.project(id,data,identity),rankingVisible:false};
   },data,identity);
   document.querySelector('textarea').value='Fictional staff reason';
  },mode);
  await page.focus('[data-account-ranking] button');await page.keyboard.press('Enter');await page.waitForSelector('[data-account-confirm]');
  await page.focus('[data-account-confirm]');await page.keyboard.press('Enter');await page.waitForFunction(()=>writes===1);
  await page.evaluate(mode=>{if(mode==='outside')document.querySelector('#outside').focus();if(mode==='reset')app.reset();release();},mode);
  await new Promise(r=>setTimeout(r,350));
  if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');
  else if(mode==='reset')assert.equal(await page.evaluate(()=>app.state.phase),'closed');
  else{
   const status=await page.evaluate(()=>({text:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label'),message:app.state.message,role:document.activeElement.getAttribute('role')}));
   if(status.label!==null)assert.equal(status.label,status.message);assert.equal(status.text,status.message);assert.equal(status.role,'status');
   assert.match(status.message,mode==='saved'?/Change saved/:mode==='denied'?/Staff access changed/:mode==='changed'?/details changed/:mode==='session-unknown'?/request was sent/:/uncertain/);
  }
  assert.equal(await page.evaluate(()=>writes),1);console.log('PASS account outcome '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
