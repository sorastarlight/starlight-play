// Navigation guards with local fictional reads/writes; no hosted requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');
(async () => {
 const browser = await puppeteer.launch({browser:'firefox', headless:true});
 try {
  for (const mode of ['draft','saving','recovery','reset','outside']) {
   const page = await browser.newPage();
   await page.setRequestInterception(true);page.on('request', r => r.abort());
   await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-trainer-corrections.js'),'utf8')});
   await page.evaluate(async mode => {
    const trainerId='11111111-1111-4111-8111-111111111111';window.writes=0;
    window.app=PLAY_TRAINER_CORRECTIONS.mount(document.querySelector('#editor'),async(kind,payload)=>{
     if(kind==='save'){writes++;if(mode==='saving')return new Promise(()=>{});throw Object.assign(Error('Unconfirmed'),{correctionOutcomeUnknown:true});}
     return {trainerId,revision:'r1',protected:false,values:[{id:'coins',name:'PokéCoins',kind:'currency',value:150,editable:true}],pokemon:[],history:[]};
    });
    await app.open(trainerId);
    if(mode==='saving'||mode==='recovery'){
     app.review({type:'quantity',id:'coins',value:151},'Fictional correction','22222222-2222-4222-8222-222222222222');
     if(mode==='recovery')await app.save();else app.save();
    }else{
     document.querySelector('[data-value-id]').click();
     const input=document.querySelector('[name=value]');input.value='151';input.dispatchEvent(new Event('input',{bubbles:true}));
    }
   },mode);
   await new Promise(r=>setTimeout(r,250));
   assert.equal(await page.evaluate(()=>app.canLeave()),false);
   await page.evaluate(mode=>{
    app.warnBeforeLeaving();
    if(mode==='reset')app.reset();
    if(mode==='outside')document.querySelector('#outside').focus();
   },mode);
   await new Promise(r=>setTimeout(r,300));
   if(mode==='reset')assert.equal(await page.evaluate(()=>app.state.phase),'closed');
   else if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');
   else {
    const outcome=await page.evaluate(()=>({label:document.activeElement.getAttribute('aria-label'),text:document.activeElement.textContent,hidden:document.activeElement.firstElementChild?.getAttribute('aria-hidden')}));
    assert.match(outcome.label,mode==='recovery'?/previous correction is unconfirmed/:mode==='saving'?/being saved/:/Finish reviewing or discard/);
    assert.equal(outcome.label,outcome.text);assert.equal(outcome.hidden,'true');
   }
   assert.equal(await page.evaluate(()=>writes),['saving','recovery'].includes(mode)?1:0);
   console.log('PASS navigation warning '+mode);await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
