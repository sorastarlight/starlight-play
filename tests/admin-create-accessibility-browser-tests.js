// Actual hidden-product editor in isolated Firefox, fictional catalog/receipts only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
async function createFixture(mode){
 window.calls=[];window.app=PLAY_ADMIN_CREATE.mount(document.querySelector('#editor'),async(name,args)=>{
  calls.push({name,args});if(name==='admin_store_draft_options'){
   if(mode==='retry'&&calls.length===1)throw Error('Fictional catalog failure');
   if(['pending-reset','outside'].includes(mode))await new Promise(r=>window.release=r);
   return {ok:true,categories:mode==='empty'?[]:[{id:'11111111-1111-4111-8111-111111111111',name:'Fictional supplies',kind:'coins',system:false,visible:true}],items:[{sku:'existing'}],rewards:PLAY_ADMIN_CREATE.items.map(i=>({...i,category:'Supplies'}))};
  }
  if(name!=='admin_store_create_draft')throw Error('Unexpected fixture command');
  if(['save-reset','save-outside'].includes(mode))await new Promise(r=>window.release=r);
  if(mode==='denied')throw Object.assign(Error('Fictional denial'),{code:'42501'});
  if(mode==='duplicate')throw Object.assign(Error('Fictional duplicate'),{code:'23505'});
  if(mode==='unknown')throw Error('Fictional lost receipt');
  return {ok:true,item:{...args.p_row,status:'draft',visible:false,featured:false,bits:0,productKind:'item',sort:100,sprite:'poke-ball.png'}};
 });
 window.fillDraft=()=>{for(const [k,v]of Object.entries({name:'Fictional field kit',sku:'fictional-field-kit',categoryId:'11111111-1111-4111-8111-111111111111',quantity:'2',cost:'100'})){const n=document.querySelector('[name='+k+']');n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));}};
}
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{for(const mode of ['retry','empty','saved','unknown','denied','duplicate','cancel-stale','reload-cancel','pending-reset','outside','save-reset','save-outside']){
 if(process.env.CREATE_CASE&&process.env.CREATE_CASE!==mode)continue;
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);await page.setRequestInterception(true);page.on('request',r=>r.abort());await page.setContent('<button id="outside">Outside workspace</button><main id="editor"></main>');await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-create.js'),'utf8')});await page.evaluate(createFixture,mode);await page.focus('[data-create-load]');await page.keyboard.press('Enter');
 if(['pending-reset','outside'].includes(mode)){await page.waitForFunction(()=>typeof release==='function');if(mode==='pending-reset')await page.evaluate(()=>app.reset());else await page.focus('#outside');await page.evaluate(()=>release());await new Promise(r=>setTimeout(r,250));if(mode==='pending-reset')assert.equal(await page.evaluate(()=>app.state.phase),'closed');else assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');}
 else{await page.waitForFunction(()=>app.state.phase!=='loading');await new Promise(r=>setTimeout(r,250));if(mode==='retry'){assert.match(await page.evaluate(()=>document.activeElement.textContent),/unavailable/);await page.focus('[data-create-load]');await page.keyboard.press('Enter');await page.waitForFunction(()=>app.state.phase==='ready');await new Promise(r=>setTimeout(r,250));assert.match(await page.evaluate(()=>document.activeElement.textContent),/New products begin/);}
 else if(mode==='empty')assert.match(await page.evaluate(()=>document.activeElement.textContent),/No enabled/);
 else{await page.evaluate(()=>fillDraft());if(mode==='reload-cancel'){await page.focus('[data-create-load]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');await page.keyboard.press('Escape');assert.equal(await page.$eval('[name=name]',n=>n.value),'Fictional field kit');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-create-load')),true);}
 else{await page.focus('[type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');if(mode==='cancel-stale'){await page.evaluate(()=>window.oldConfirm=document.querySelector('[data-create-confirm]'));await page.keyboard.press('Escape');await page.evaluate(()=>oldConfirm.click());await new Promise(r=>setTimeout(r,100));assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='admin_store_create_draft').length),0,'Closed review must not create a product');}
 else{await page.focus('[data-create-confirm]');await page.keyboard.press('Enter');if(['save-reset','save-outside'].includes(mode)){await page.waitForFunction(()=>typeof release==='function');if(mode==='save-reset')await page.evaluate(()=>app.reset());else await page.focus('#outside');await page.evaluate(()=>release());}await page.waitForFunction(()=>app.state.phase!=='saving');await new Promise(r=>setTimeout(r,250));if(mode==='save-reset')assert.equal(await page.evaluate(()=>app.state.phase),'closed');else if(mode==='save-outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');else assert.match(await page.evaluate(()=>document.activeElement.textContent),mode==='saved'?/Hidden draft created/:mode==='denied'?/Staff access changed/:mode==='duplicate'?/already in use/:/outcome uncertain/);assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='admin_store_create_draft').length),1);}
 }}}
 assert.deepEqual(errors,[]);console.log('PASS Add Product accessibility '+mode);await page.close();
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
