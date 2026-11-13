// Preview and reopened reviews with the actual presenter and fictional transport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
async function reviewFixture(preview){
 window.writes=[];window.ids=0;window.PLAY_SPECIES=['Bulbasaur'];
 Object.defineProperty(crypto,'randomUUID',{value:()=>`11111111-1111-4111-8111-${String(++ids).padStart(12,'0')}`,configurable:true});
 const data={canWrite:true,catalog:{items:[{id:'honey',name:'Honey'}]},actions:[]};
 window.mountReview=()=>PLAY_ADMIN_REWARDS.mount(document.querySelector('#editor'),{id:'fictional-trainer',login:'FixtureTrainer'},'gifts',{previewOnly:preview,read:async()=>structuredClone(data),write:async intent=>{writes.push(structuredClone(intent));return{ok:true,requestId:intent.p_request,message:'Fictional gift confirmed.'};}});
 await mountReview();document.querySelector('[name=key]').value='honey';document.querySelector('[name=qty]').value='3';
}
(async()=>{const b=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['preview-copy','preview-force','preview-enter','preview-cancel','preview-outside','preview-reset','reopen-cancel','reopen-success','reopen-stale','reopen-quantity','reason-correction','remount']){
  if(process.env.REVIEW_CASE&&process.env.REVIEW_CASE!==mode)continue;
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);await p.setRequestInterception(true);p.on('request',r=>r.abort());await p.setContent('<button id="outside">Outside editor</button><main id="editor"><div data-trainer-rewards></div></main>');await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-rewards.js'),'utf8')});await p.evaluate(reviewFixture,mode.startsWith('preview'));
  async function open(){await p.focus('[data-reward-form] [type=submit]');await p.keyboard.press('Enter');await p.waitForSelector('.reward-review-form');}
  await open();
  if(mode==='preview-copy'){assert.match(await p.$eval('.record-note',n=>document.querySelector('dialog .record-note').textContent),/Preview only.*No gifts.*staff history/);assert.equal(await p.$eval('.reward-deliver',n=>n.disabled),true);}
  else if(mode.startsWith('preview')){
   if(mode==='preview-cancel'){await p.focus('[data-modal-cancel]');await p.keyboard.press('Enter');await new Promise(r=>setTimeout(r,100));assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Review gift');}
   else if(mode==='preview-outside'){await p.evaluate(()=>{document.querySelector('dialog').close();document.querySelector('#outside').focus();});await new Promise(r=>setTimeout(r,100));assert.equal(await p.evaluate(()=>document.activeElement.id),'outside');}
   else if(mode==='preview-enter'){await p.focus('textarea');await p.keyboard.type('Local fixture only');await p.keyboard.down('Control');await p.keyboard.press('Enter');await p.keyboard.up('Control');}
   else await p.evaluate(mode=>{const d=document.querySelector('dialog'),f=d.querySelector('form');d.querySelector('textarea').value='Local fixture only';if(mode==='preview-reset')PLAY_ADMIN_REWARDS.clear();f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},mode);
  }else if(mode==='reason-correction'){
   await p.evaluate(()=>{const f=document.querySelector('.reward-review-form');f.querySelector('textarea').value='x';f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});assert.equal(await p.evaluate(()=>document.activeElement.name),'reason');await p.$eval('textarea',n=>{n.value='Local corrected reason';n.dispatchEvent(new Event('input',{bubbles:true}));});await p.focus('.reward-deliver');await p.keyboard.press('Enter');
  }else{
   await p.evaluate(()=>{window.oldReview=document.querySelector('dialog form');});await p.keyboard.press('Escape');await new Promise(r=>setTimeout(r,100));assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Review gift');
   if(mode==='reopen-quantity')await p.$eval('[name=qty]',n=>n.value='7');await open();
   if(mode==='reopen-cancel'){await p.keyboard.press('Escape');}
   else if(mode==='remount'){await p.evaluate(async()=>{const f=document.querySelector('dialog form');await mountReview();f.querySelector('textarea').value='Local obsolete review';f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});}
   else{if(mode==='reopen-stale'){await p.evaluate(()=>{oldReview.querySelector('textarea').value='Local obsolete review';oldReview.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});assert.equal(await p.evaluate(()=>writes.length),0);assert.equal(await p.$eval('dialog',n=>n.open),true);}
    await p.$eval('textarea',n=>n.value='Local reopened reason');await p.focus('.reward-deliver');await p.keyboard.press('Enter');}
  }
  await new Promise(r=>setTimeout(r,250));const expected=['reopen-success','reopen-stale','reopen-quantity','reason-correction'].includes(mode)?1:0;assert.equal(await p.evaluate(()=>writes.length),expected);
  if(expected){const value=await p.evaluate(()=>writes[0]);assert.equal(value.p_action,'item');assert.equal(value.p_user,'fictional-trainer');assert.deepEqual(value.p_payload,{key:'honey',qty:mode==='reopen-quantity'?7:3});assert.equal(value.p_request,mode==='reason-correction'?'11111111-1111-4111-8111-000000000001':'11111111-1111-4111-8111-000000000002');}
  assert.deepEqual(errors,[]);console.log('PASS gift review '+mode);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
