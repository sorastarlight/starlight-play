// Bounded roster reads with fictional responses; no account/gameplay writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['retry','empty','invalid','outside','reset','paging-error','new-query']){
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-roster.js'),'utf8')});
  await page.evaluate(mode=>{const id='11111111-1111-4111-8111-111111111111';window.calls=[];window.app=PLAY_ADMIN_ROSTER.mount(document.querySelector('#editor'),id,async args=>{calls.push(structuredClone(args));if(calls.length===2){if(['retry','paging-error'].includes(mode))throw Error('Fictional read failed');if(['outside','reset'].includes(mode))await new Promise(r=>window.release=r);}
   const more=mode==='paging-error'&&calls.length===1,rows=mode==='empty'&&calls.length===2?[]:Array.from({length:more?40:1},(_,i)=>({id:'fictional-'+i,dex:1,name:'Bulbasaur',level:5,caughtAt:'2026-11-12T12:00:00Z'}));
   return {ok:true,userId:mode==='invalid'&&calls.length===2?'other':id,pokemon:rows,hasMore:more,nextCursor:more?{id:'fictional-39',caughtAt:'2026-11-12T12:00:00Z'}:null,pageSize:40,generation:1};
  },{monArt:()=>'',pokemonFacts:()=>'',statsPanel:()=>''});},mode);await page.waitForFunction(()=>app.state.phase==='ready');
  if(mode==='paging-error'){await page.focus('[data-roster-next]');await page.keyboard.press('Enter');}
  else{await page.type('[name=query]','Bulbasaur');await page.keyboard.press('Enter');}
  await page.waitForFunction(()=>calls.length===2);
  if(['outside','reset'].includes(mode)){
   await page.evaluate(mode=>{if(mode==='outside')document.querySelector('#outside').focus();else app.reset();release();},mode);await new Promise(r=>setTimeout(r,300));if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');else{assert.equal(await page.evaluate(()=>app.state.phase),'closed');assert.equal(await page.$eval('#editor',e=>e.textContent),'');}
  }else{
   await page.waitForFunction(()=>['ready','error'].includes(app.state.phase));await new Promise(r=>setTimeout(r,250));assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
   const text=await page.evaluate(()=>document.activeElement.textContent);assert.match(text,['retry','invalid','paging-error'].includes(mode)?/Roster unavailable/:mode==='empty'?/No matching Pokémon/:/Showing 1/);
   if(mode==='retry'){
    assert.equal(await page.$eval('[name=query]',e=>e.value),'Bulbasaur');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-roster-reload')),true);await page.keyboard.press('Enter');await page.waitForFunction(()=>calls.length===3&&app.state.phase==='ready');await new Promise(r=>setTimeout(r,250));assert.equal(await page.evaluate(()=>calls[2].p_query),'Bulbasaur');assert.match(await page.evaluate(()=>document.activeElement.textContent),/Showing 1/);
   }
   if(mode==='new-query'){assert.equal(await page.evaluate(()=>app.state.page),0);assert.equal(await page.evaluate(()=>app.state.history.length),1);assert.equal(await page.evaluate(()=>calls[1].p_cursor),null);}
   if(mode==='invalid')assert.equal(await page.$$eval('[data-roster-mon]',r=>r.length),0);
  }
  assert.equal(await page.evaluate(()=>calls.length),mode==='retry'?3:2);console.log('PASS roster recovery '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
