// Actual Trainer gift presenter, fictional transport only; no hosted calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
async function trainerGiftFixture(){
 window.writes=[];window.PLAY_SPECIES=['Bulbasaur','Ivysaur','Venusaur','Charmander'];window.PLAY_EVO_CANDY_PNG={1:1,2:1,3:1,4:4};
 window.PLAY_ADMIN_GIFT_GENERATIONS=[{id:'fixture',name:'Fictional generation',min:1,max:4}];
 Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111',configurable:true});
 const data={canWrite:true,pokemonGiftMaxQty:100,catalog:{items:[{id:'honey',name:'Honey'}]},actions:[]};
 window.mountGift=()=>PLAY_ADMIN_REWARDS.mount(document.querySelector('#editor'),{id:'fictional-trainer',login:'FixtureTrainer'},'gifts',{read:async()=>structuredClone(data),write:async intent=>{writes.push(structuredClone(intent));return{ok:true,requestId:intent.p_request,message:'Fictional gift confirmed.'};}});
 window.openGift=kind=>{const input=document.querySelector('[name=gift_kind]');input.focus();input.value=kind;input.dispatchEvent(new Event('change',{bubbles:true}));};
 await mountGift();
}
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['pokemon','candy','closed-choice','replacement','outside','hidden','clear','kind-change','review-cancel','review-back','closed-review','review-clear','review-success','review-double','review-hidden','review-remount','review-outside','review-filled-cancel','review-candy']){
  if(process.env.GIFT_PICKER_CASE&&process.env.GIFT_PICKER_CASE!==mode)continue;
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);await page.setRequestInterception(true);page.on('request',r=>r.abort());
  await page.setContent('<button id="outside">Outside editor</button><main id="editor"><div data-trainer-rewards></div></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-rewards.js'),'utf8')});await page.evaluate(trainerGiftFixture);
  await page.evaluate(mode=>openGift(['candy','review-candy'].includes(mode)?'candy':'pokemon'),mode);
  if(['closed-choice','clear','kind-change','hidden'].includes(mode)){
   await page.evaluate(mode=>{const d=document.querySelector('dialog'),choice=d.querySelector('[data-pick-dex="1"]');if(mode==='clear')PLAY_ADMIN_REWARDS.clear();else if(mode==='kind-change'){const input=document.querySelector('[name=gift_kind]');input.value='candy';input.dispatchEvent(new Event('change',{bubbles:true}));}else if(mode==='hidden')document.querySelector('#editor').hidden=true;else d.close();choice.click();},mode);
   assert.equal(await page.$eval('[name=dex]',n=>n.value),'','Dismissed/stale choice must not alter gift');
  }else if(mode==='replacement'){
   await page.evaluate(()=>{document.querySelector('dialog').close();document.querySelector('[data-species-picker]').click();});await new Promise(r=>setTimeout(r,100));
   assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-species-search')),true,'Old close must not steal new search focus');
   await page.focus('[data-pick-dex="1"]');await page.keyboard.press('Enter');assert.equal(await page.$eval('[name=dex]',n=>n.value),'1');
  }else if(mode==='outside'){
   await page.evaluate(()=>{document.querySelector('dialog').close();document.querySelector('#outside').focus();});await new Promise(r=>setTimeout(r,100));assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');
  }else{
   if(mode==='candy'){await page.$eval('[data-species-search]',n=>{n.value='Venusaur';n.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.$$eval('[data-pick-dex]',n=>n.length),1);}
   await page.focus('[data-pick-dex="1"]');await page.keyboard.press('Enter');await new Promise(r=>setTimeout(r,100));
   assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-species-picker')),true);assert.equal(await page.$eval('[name=dex]',n=>n.value),'1');
   if(mode.startsWith('review-')||mode==='closed-review'){
    await page.$eval('[name=qty]',n=>n.value='3');await page.focus('[data-reward-form] [type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('.reward-review-form');
    assert.match(await page.$eval('.reward-review-hero',n=>n.textContent),mode==='review-candy'?/3 Bulbasaur Evolution Candy.*FixtureTrainer/:/Bulbasaur.*Quantity 3.*Level 5.*FixtureTrainer/);
    if(['review-cancel','review-back','review-filled-cancel'].includes(mode)){if(mode==='review-filled-cancel')await page.$eval('textarea',n=>n.value='Local cancellation reason');if(['review-back','review-filled-cancel'].includes(mode)){await page.focus('[data-modal-cancel]');await page.keyboard.press('Enter');}else await page.keyboard.press('Escape');await new Promise(r=>setTimeout(r,100));assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Review gift');}
    else{await page.evaluate(async mode=>{const d=document.querySelector('dialog'),form=d.querySelector('form');d.querySelector('textarea').value='Fictional local check';if(mode==='review-hidden')document.querySelector('#editor').hidden=true;if(mode==='review-remount')await mountGift();if(mode==='review-outside'){d.close();document.querySelector('#outside').focus();}if(mode==='closed-review')d.close();if(mode==='review-clear')PLAY_ADMIN_REWARDS.clear();form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));if(mode==='review-double')form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},mode);await new Promise(r=>setTimeout(r,300));}
   }
  }
  if(mode==='review-outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');
  assert.equal(await page.evaluate(()=>writes.length),['review-success','review-double','review-candy'].includes(mode)?1:0);if(['review-success','review-double','review-candy'].includes(mode)){const saved=await page.evaluate(()=>writes[0]);assert.equal(saved.p_user,'fictional-trainer');assert.equal(saved.p_action,mode==='review-candy'?'candy':'pokemon_batch');assert.deepEqual(saved.p_payload,mode==='review-candy'?{dex:1,qty:3}:{dex:1,level:5,shiny:false,qty:3});assert.equal(saved.p_reason,'Fictional local check');}assert.deepEqual(errors,[]);console.log('PASS Trainer gift picker '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
