// Real local PNG decoding with delayed callbacks and fictional upload receipts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});const failures=[];let count=0;
 try{
  for(const mode of ['prepare','outside','outside-error','reset-prepare','reload-prepare','saved','partial','unknown','reset-upload']){
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('blob:')?r.continue():r.abort());
   await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src blob:"><button id="outside">Outside editor</button><main id="editor"></main>');
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-assets.js'),'utf8')});
   await page.evaluate(mode=>{
    window.calls=[];window.decoded=[];window.revoked=[];
    const NativeImage=Image,originalRevoke=URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL=url=>{revoked.push(url);originalRevoke(url);};
    window.Image=function(){const img=new NativeImage();let loaded,failed;Object.defineProperty(img,'onload',{set:fn=>loaded=fn});Object.defineProperty(img,'onerror',{set:fn=>failed=fn});img.addEventListener('load',()=>decoded.push(error=>error?failed?.():loaded?.()));return img;};
    Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111'});
    window.app=PLAY_ADMIN_ASSETS.mount(document.querySelector('#editor'),async(kind,payload)=>{
     calls.push({kind,filename:payload?.filename});if(kind==='read')return{canUpload:true,assets:[]};
     return new Promise((resolve,reject)=>window.finishUpload=()=>mode==='unknown'?reject(Error('Fictional lost receipt')):resolve({registered:mode!=='partial',filename:payload.filename}));
    });
    window.choose=async()=>{const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);const file=new File([await new Promise(resolve=>canvas.toBlob(resolve))],'fixture.png',{type:'image/png'}),transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('[name=image]');input.focus();input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));};
   },mode);
   await page.focus('[data-assets-load]');await page.keyboard.press('Enter');await page.waitForSelector('[name=image]');await page.evaluate(()=>choose());await page.waitForFunction(()=>decoded.length===1);
   if(mode==='outside'||mode==='outside-error'||mode==='reset-prepare')await page.focus('#outside');
   if(mode==='reset-prepare')await page.evaluate(()=>app.reset());
   if(mode==='reload-prepare'){await page.focus('[data-assets-load]');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[role=status]').textContent==='Images loaded.');}
   await page.evaluate(mode=>decoded.shift()(mode==='outside-error'),mode);
   if(['prepare','outside','outside-error','reset-prepare','reload-prepare'].includes(mode)){
    const state=await page.evaluate(()=>({focus:document.activeElement.id==='outside'?'outside':document.activeElement.name||document.activeElement.getAttribute('role'),text:document.querySelector('[role=status]').textContent,preview:!!document.querySelector('.admin-asset-preview'),fields:!!document.querySelector('[name=image]'),revoked:revoked.length}));
    const expected=mode==='outside'||mode==='outside-error'||mode==='reset-prepare'?'outside':mode==='reload-prepare'?'status':'label';
    try{assert.equal(state.focus,expected,mode+' late decode focus');}catch(e){failures.push(e.message);}
    assert.equal(state.preview,mode==='prepare'||mode==='outside');
    if(mode==='reset-prepare'){assert.equal(state.fields,false);assert(state.revoked>0);}
    if(mode==='reload-prepare'){assert.equal(state.text,'Images loaded.');assert(state.revoked>0);}
    assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind==='upload').length),0);
   }else{
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent==='Image ready for review.');
    await page.focus('button[type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
    await page.focus('[data-assets-confirm]');await page.keyboard.press('Enter');await page.waitForFunction(()=>typeof finishUpload==='function');
    assert.equal(await page.$eval('[data-assets-confirm]',e=>e.disabled),true);assert.equal(await page.$eval('[data-assets-cancel]',e=>e.disabled),true);
    if(mode==='reset-upload'){await page.evaluate(()=>app.reset());await page.focus('#outside');}
    await page.evaluate(()=>finishUpload());
    if(mode==='reset-upload'){assert.equal(await page.$('[name=image]'),null);assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');}
    else{
     await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
     const message=await page.$eval('[role=status]',e=>e.textContent);
     assert.match(message,mode==='saved'?/published and added/:mode==='partial'?/library entry was not confirmed/:/upload result could not be confirmed/);
     if(mode!=='saved')assert(message.includes(await page.evaluate(()=>calls.find(c=>c.kind==='upload').filename)));
     assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
     await page.focus('[data-assets-load]');await page.keyboard.press('Enter');await page.waitForSelector('[name=image]');assert.equal(await page.$eval('button[type=submit]',e=>e.disabled),true);
    }
    assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind==='upload').length),1);
   }
   assert.deepEqual(errors,[]);count++;await page.close();
  }
 }finally{await browser.close();}
 if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} failures across ${count} completed async scenarios`);}
 console.log(`PASS ${count} Image Library Firefox async decode/upload-result scenarios; fictional uploads only; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
