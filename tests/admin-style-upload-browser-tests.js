// Actual portrait editor/crop/PNG encoding; all reads, uploads and saves are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});let passed=0;
 try{
  for(const mode of ['success','prepare-error','upload-error','unregistered','save-error','denied-save','reset-prepare','reset-upload','reset-save','navigate-save','cancel-review']){
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setRequestInterception(true);page.on('request',r=>r.abort());
   await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><button id="outside">Outside editor</button><main id="editor"></main>');
   for(const file of ['play-portrait.js','admin-assets.js','admin-trainer-styles.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js',file),'utf8')});
   await page.evaluate(mode=>{
    window.calls=[];window.saveAttempts=0;const assets=[];let row={id:'fixture',name:'Fictional portrait',gender:'',outfit:'',games:'',visible:false,ext:'png',portraitFile:null,portraitCrop:{},assetKind:'pixel',revision:'a'.repeat(32)};
    let requestSequence=0;Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-'+String(++requestSequence).padStart(12,'0')});
    window.playLoadImage=async()=>{const c=document.createElement('canvas');c.width=32;c.height=48;c.getContext('2d').fillRect(8,4,16,40);return c;};
    const encode=playPortraitBlob;window.playPortraitBlob=canvas=>new Promise((resolve,reject)=>window.finishPrepare=async()=>mode==='prepare-error'?reject(Error('Fictional encode failure')):resolve(await encode(canvas)));
    window.app=PLAY_ADMIN_STYLES.mount(document.querySelector('#editor'),async(kind,payload)=>{
     calls.push({kind,filename:payload?.filename,request:payload?.p_request});
     if(kind==='read')return{styles:[structuredClone(row)],assets:structuredClone(assets)};
     if(kind==='upload')return new Promise((resolve,reject)=>window.finishUpload=()=>{
      if(mode==='upload-error')return reject(Error('Fictional lost upload receipt'));
      if(mode!=='unregistered')assets.push({filename:payload.filename,kind:'portrait',label:'Fictional published portrait'});
      resolve({filename:payload.filename,registered:mode!=='unregistered'});
     });
     saveAttempts++;return new Promise((resolve,reject)=>window.finishSave=()=>{
      if(mode==='save-error'&&saveAttempts===1)return reject(Error('Fictional missing style receipt'));
      if(mode==='denied-save')return reject(Object.assign(Error('Fictional session changed'),{code:'42501'}));
      row={...row,...payload.p_request.changes,revision:'b'.repeat(32)};resolve({ok:true,requestId:payload.p_request.requestId,style:structuredClone(row)});
     });
    });
   },mode);
   const press=async selector=>{await page.focus(selector);await page.keyboard.press('Enter');};
   await press('[data-style-load]');await page.waitForSelector('[data-style-id]');await press('[data-style-id]');await press('[data-style-pane="portrait"]');
   await page.waitForFunction(()=>document.querySelector('[data-style-preview-status]').textContent.startsWith('Preview ready'));
   await press('[data-style-crop-review]');await page.waitForSelector('dialog[open]');
   if(mode==='cancel-review'){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind!=='read').length),0);passed++;await page.close();continue;}
   await page.focus('dialog [name=reason]');await page.keyboard.type('Fictional staged review');await press('[data-style-confirm]');await page.waitForFunction(()=>typeof finishPrepare==='function');
   if(mode==='reset-prepare'){await page.evaluate(()=>app.reset());await page.focus('#outside');}
   await page.evaluate(()=>finishPrepare());
   if(!['reset-prepare','prepare-error'].includes(mode)){
    await page.waitForFunction(()=>typeof finishUpload==='function');
    assert.equal(await page.$eval('[data-style-load]',b=>b.disabled),true);
    if(mode==='reset-upload'){await page.evaluate(()=>app.reset());await page.focus('#outside');}
    await page.evaluate(()=>finishUpload());
    if(!['reset-upload','upload-error','unregistered'].includes(mode)){
     await page.waitForFunction(()=>typeof finishSave==='function');
     if(mode==='reset-save'){await page.evaluate(()=>app.reset());await page.focus('#outside');}
     if(mode==='navigate-save'){await page.evaluate(()=>document.querySelector('#editor').hidden=true);await page.focus('#outside');}
     await page.evaluate(()=>finishSave());
    }
   }
   await page.waitForFunction(()=>!['saving','uploading'].includes(app.state.phase));
   const result=await page.evaluate(()=>({phase:app.state.phase,message:app.state.message,uploads:calls.filter(c=>c.kind==='upload').length,saves:saveAttempts,focus:document.activeElement.id==='outside'?'outside':document.activeElement.getAttribute('role'),selected:app.state.selected}));
   const reset=mode.startsWith('reset');assert.equal(result.focus,reset||mode==='navigate-save'?'outside':'status');
   assert.equal(result.uploads,['reset-prepare','prepare-error'].includes(mode)?0:1);
   assert.equal(result.saves,['success','save-error','denied-save','reset-save','navigate-save'].includes(mode)?1:0);
   assert.equal(result.phase,reset?'closed':['success','navigate-save'].includes(mode)?'saved':['prepare-error','denied-save'].includes(mode)?'error':'uncertain');
   if(mode==='prepare-error')assert.match(result.message,/No changes were sent/);
   if(['upload-error','unregistered','save-error'].includes(mode))assert(result.message.includes(await page.evaluate(()=>calls.find(c=>c.kind==='upload').filename)));
   if(reset||mode==='denied-save')assert.equal(result.selected,null);
   if(mode==='save-error'){
    // Recover by selecting the already registered portrait, without a second upload.
    await press('[data-style-load]');await page.waitForSelector('[data-style-id]');await press('[data-style-id]');await press('[data-style-pane="portrait"]');
    const filename=await page.evaluate(()=>calls.find(c=>c.kind==='upload').filename);await page.select('[data-style-existing]',filename);await press('[data-style-existing-review]');
    await page.waitForSelector('dialog[open]');await page.focus('dialog [name=reason]');await page.keyboard.type('Reviewed existing upload');await press('[data-style-confirm]');await page.waitForFunction(()=>saveAttempts===2);await page.evaluate(()=>finishSave());await page.waitForFunction(()=>app.state.phase==='saved');
    assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind==='upload').length),1);assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind==='save').at(-1).request.changes.portraitFile),filename);
    assert.equal(await page.evaluate(()=>new Set(calls.filter(c=>c.kind==='save').map(c=>c.request.requestId)).size),2,'A newly reviewed recovery save uses a fresh request ID');
   }
   assert.deepEqual(errors,[]);passed++;await page.close();
  }
 }finally{await browser.close();}
 console.log(`PASS ${passed} Firefox two-stage portrait preparation/upload/save/cancel/reset/navigation/recovery scenarios; fictional transports; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
