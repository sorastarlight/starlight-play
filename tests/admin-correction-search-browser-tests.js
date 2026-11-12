// Search feedback only: no correction, selection or hosted request.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['item-empty','item-match','candy-empty','candy-match','balance-empty','balance-match','pokemon-empty','pokemon-match','outside','reset','draft','changed']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-trainer-corrections.js'),'utf8')});
  await page.evaluate(async()=>{const id='11111111-1111-4111-8111-111111111111';window.writes=0;window.app=PLAY_TRAINER_CORRECTIONS.mount(document.querySelector('#editor'),async kind=>{if(kind!=='read'){writes++;throw Error('Writes blocked');}return {trainerId:id,revision:'r1',protected:false,values:[{id:'coins',kind:'currency',name:'PokéCoins',value:150,editable:true},{id:'pokeball',kind:'item',name:'Poké Ball',value:5,editable:true},{id:'candy1',kind:'candy',name:'Bulbasaur Candy',value:10,editable:true}],pokemon:[{id:'33333333-3333-4333-8333-333333333333',name:'Bulbasaur',level:5,locked:false,favorite:false,trading:false}],history:[]};});await app.open(id);});
  const pokemon=mode.startsWith('pokemon'),item=mode.startsWith('item'),candy=mode.startsWith('candy'),match=mode.endsWith('match'),selector=pokemon?'[data-mon-search]':'[data-value-search]';
  if(mode==='draft'){await page.focus('[data-value-id]');await page.keyboard.press('Enter');await page.$eval('[name=value]',e=>{e.value='151';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.type('[name=reason]','Fictional draft');}
  if(item||candy){await page.focus('[data-section='+(item?'items':'candy')+']');await page.keyboard.press('Enter');assert.match(await page.$eval('[data-value-search]',e=>e.closest('label').textContent),item?/Find an item/:/Find Evolution Candy/);}
  if(pokemon){await page.focus('[data-section=pokemon]');await page.keyboard.press('Enter');}
  await page.type(selector,match?(pokemon||candy?'Bulbasaur':item?'Ball':'coins'):'zzzz');await page.keyboard.press('Enter');
  if(mode==='changed'){await page.focus(selector);await page.type(selector,'coins');}
  if(mode==='outside')await page.focus('#outside');if(mode==='reset')await page.evaluate(()=>app.reset());await new Promise(r=>setTimeout(r,250));
  if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');
  else if(mode==='changed'){assert.equal(await page.$eval(selector,e=>e===document.activeElement),true);assert.equal(await page.$eval('[data-correction-search-status]',e=>e.hidden),true);}
  else if(mode==='reset')assert.equal(await page.evaluate(()=>app.state.phase),'closed');
  else{
   const summary=await page.evaluate(()=>({text:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label'),role:document.activeElement.getAttribute('role')}));assert.equal(summary.role,'status');assert.equal(summary.label,summary.text);assert.match(summary.text,match?(pokemon?/1 matching Pokémon/:item?/1 matching item/:candy?/1 matching Candy family/:/1 matching balance/):(pokemon?/No matching Pokémon/:item?/No matching items/:candy?/No matching Candy families/:/No matching balances/));
   if(match){await page.keyboard.press('Tab');assert.equal(await page.evaluate(pokemon=>pokemon?document.activeElement.name==='specimen':document.activeElement.hasAttribute('data-value-id'),pokemon),true);}
   else{await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');assert.equal(await page.$eval(selector,e=>e===document.activeElement),true);}
   assert.equal(await page.evaluate(()=>app.canLeave()),mode!=='draft');assert.equal(await page.$$eval('dialog',r=>r.length),0);assert.equal(await page.$$eval('[name=specimen]:checked',r=>r.length),0);
  }
  if(mode==='draft'){assert.equal(await page.$eval('[name=value]',e=>e.value),'151');assert.equal(await page.$eval('[name=reason]',e=>e.value),'Fictional draft');}
  assert.equal(await page.evaluate(()=>writes),0);console.log('PASS correction search '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
