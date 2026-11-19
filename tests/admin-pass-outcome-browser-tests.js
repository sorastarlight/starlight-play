// Actual Pass modules in isolated Firefox; fictional transports and blocked network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});
 try{
  for(const outcome of ['success','unknown','background','reset']){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setRequestInterception(true);page.on('request',r=>r.abort());
   await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><button id="outside">Outside editor</button><main id="editor"></main>');
   for(const file of ['admin-reward-catalog.js','admin-reward-bundles.js','admin-pass-editor.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js',file),'utf8')});
   await page.evaluate(outcome=>{
    window.calls=[];window.failRead=true;
    const item={id:'item:figy',kind:'item',name:'Figy Berry',category:'Berries',sprite:'images/items/figy-berry.png',enabled:true,maxQuantity:100};
    const raw={revision:'r1',catalog:[item],daily:[{catalogId:item.id,quantity:1,secret:false}],weekly:[{catalogId:item.id,quantity:1,secret:false}]};
    // A deterministic local request ID; the fixture never invokes a hosted adapter.
    Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111'});
    window.app=PLAY_ADMIN_PASS_EDITOR.mount(document.querySelector('#editor'),async(kind,payload)=>{
     calls.push({kind,payload});
     if(kind==='read'){if(failRead){failRead=false;throw Error('Fictional read failed. Reload rewards.');}return structuredClone(raw);}
     return new Promise((resolve,reject)=>window.complete=()=>{
      if(outcome==='unknown')return reject(Error('Fictional missing receipt'));
      raw.daily=payload.daily.rewards;raw.weekly=payload.weekly.rewards;raw.revision='r2';
      resolve({status:'saved',requestId:payload.requestId,revision:'r2'});
     });
    });
   },outcome);
   await page.focus('[data-load]');await page.keyboard.press('Enter');
   await page.waitForFunction(()=>app.getState().phase==='error');
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status','Pass failed load retains result focus');
   await page.focus('[data-load]');await page.keyboard.press('Enter');
   await page.waitForFunction(()=>app.getState().phase==='ready');
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status','Pass retry retains result focus');
   await page.focus('[data-focus="daily-0-qty"]');await page.keyboard.down('Control');await page.keyboard.press('a');await page.keyboard.up('Control');await page.keyboard.type('2');await page.keyboard.press('Tab');
   await page.focus('[data-review]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
   assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));
   await page.focus('[data-save]');await page.keyboard.press('Enter');await page.waitForFunction(()=>app.getState().phase==='saving');
   if(['background','reset'].includes(outcome))await page.focus('#outside');
   if(outcome==='reset')await page.evaluate(()=>app.reset());
   await page.evaluate(()=>complete());await page.waitForFunction(()=>app.getState().phase!=='saving');
   const result=await page.evaluate(()=>({phase:app.getState().phase,text:document.querySelector('[role=status]').textContent,focus:document.activeElement.id==='outside'?'outside':document.activeElement.getAttribute('role'),writes:calls.filter(c=>c.kind!=='read').length,fields:document.querySelectorAll('input').length}));
   assert.equal(result.writes,1);
   assert.equal(result.focus,['background','reset'].includes(outcome)?'outside':'status');
   assert.equal(result.phase,outcome==='reset'?'closed':outcome==='unknown'?'uncertain':'saved');
   if(outcome==='reset')assert.equal(result.fields,0);
   else{
    assert.match(result.text,outcome==='unknown'?/not be confirmed/:/saved/);
    await page.focus('[data-load]');await page.keyboard.press('Enter');
    if(await page.$('dialog[open]')){await page.focus('[data-reload-confirm]');await page.keyboard.press('Enter');}
    await page.waitForFunction(()=>app.getState().phase==='ready');
    assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind!=='read').length),1);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status','Pass outcome reload retains result focus');
   }
   assert.deepEqual(errors,[]);console.log(`PASS Pass/${outcome}: failed read, retry, review, simulated save and safe recovery`);await page.close();
  }
 }finally{await browser.close();}
 console.log('PASS 4 Firefox Pass DOM scenarios; speech not tested');
})().catch(e=>{console.error(e);process.exitCode=1;});
