// Actual Firefox file decoding and keyboard cancellation; no OS chooser or upload.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});const failures=[];let checks=0;
 const check=(label,actual,expected)=>{checks++;try{assert.equal(actual,expected,label);}catch(e){failures.push(e.message);}};
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('blob:')?r.continue():r.abort());
  await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src blob:"><button id="outside">Outside editor</button><main id="editor"></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-assets.js'),'utf8')});
  await page.evaluate(()=>{
   window.calls=[];window.readMode='fail';window.revoked=[];
   const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};
   Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111'});
   window.app=PLAY_ADMIN_ASSETS.mount(document.querySelector('#editor'),async kind=>{
    calls.push(kind);if(kind!=='read')throw Error('No uploads permitted in this fixture');
    if(readMode==='fail'){readMode='ok';throw Error('Fictional read failure');}
    const data={canUpload:true,assets:[]};
    if(readMode==='pending')return new Promise(resolve=>window.finishRead=()=>resolve(data));
    return data;
   });
   window.choose=async mode=>{
    let file;
    if(mode==='type')file=new File(['not an image'],'fixture.svg',{type:'image/svg+xml'});
    else if(mode==='size')file=new File([new Uint8Array(900001)],'fixture.png',{type:'image/png'});
    else if(mode==='corrupt')file=new File(['not a png'],'fixture.png',{type:'image/png'});
    else if(mode!=='cancel'){
     const canvas=document.createElement('canvas');canvas.width=mode==='dimensions'?8193:2;canvas.height=2;
     canvas.getContext('2d').fillRect(0,0,2,2);
     file=new File([await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))],'fixture.png',{type:'image/png'});
    }
    const transfer=new DataTransfer();if(file)transfer.items.add(file);
    const input=document.querySelector('[name=image]');input.focus();input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   };
  });
  await page.focus('[data-assets-load]');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('could not be loaded'));
  check('Image library error result focus',await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
  await page.focus('[data-assets-load]');await page.keyboard.press('Enter');await page.waitForSelector('[name=image]');
  check('Image library retry result focus',await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
  for(const [mode,pattern]of [['type',/PNG/],['size',/900 KB/],['corrupt',/could not be opened/],['dimensions',/megapixels/]]){
   await page.evaluate(mode=>choose(mode),mode);
   await page.waitForSelector('[name=image][aria-invalid=true]');
   const state=await page.evaluate(()=>({focus:document.activeElement.name,error:document.querySelector('[role=alert]').textContent,linked:document.querySelector('[name=image]').getAttribute('aria-describedby')===document.querySelector('[role=alert]').id,disabled:document.querySelector('button[type=submit]').disabled}));
   assert.match(state.error,pattern);assert.equal(state.linked,true);assert.equal(state.disabled,true);check(mode+' rejection focus',state.focus,'image');
  }
  await page.evaluate(()=>choose('cancel'));
  check('empty selection returns file focus',await page.evaluate(()=>document.activeElement.name),'image');
  assert.equal(await page.$eval('[role=alert]',e=>e.textContent),'');
  await page.evaluate(()=>choose('valid'));await page.waitForFunction(()=>document.querySelector('[role=status]').textContent==='Image ready for review.');
  check('real PNG decode focuses name',await page.evaluate(()=>document.activeElement.name),'label');
  assert.equal(await page.$eval('[name=image]',e=>e.hasAttribute('aria-invalid')),false);
  const preview=await page.$eval('.admin-asset-preview img',e=>e.src);
  for(const cancel of ['Escape','Back']){
   await page.focus('button[type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
   check(cancel+' review focus',await page.evaluate(()=>document.activeElement.hasAttribute('data-assets-cancel')),true);
   if(cancel==='Escape')await page.keyboard.press('Escape');else await page.keyboard.press('Enter');
   await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
   check(cancel+' cancellation focus',await page.evaluate(()=>document.activeElement.type),'submit');
   assert.equal(await page.$eval('.admin-asset-preview img',e=>e.src),preview);
   assert.equal(await page.$eval('[name=label]',e=>e.value),'fixture');
  }
  await page.focus('#outside');await page.evaluate(()=>app.reset());
  assert.equal(await page.$('[name=image]'),null);check('reset preserves outside focus',await page.evaluate(()=>document.activeElement.id),'outside');
  assert(await page.evaluate(preview=>revoked.includes(preview),preview),'reset revokes the selected image URL');
  await page.evaluate(()=>window.readMode='pending');await page.focus('[data-assets-load]');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>typeof finishRead==='function');await page.focus('#outside');await page.evaluate(()=>{app.reset();finishRead();});
  assert.equal(await page.$('[name=image]'),null);check('late read after reset preserves outside focus',await page.evaluate(()=>document.activeElement.id),'outside');
  assert.equal(await page.evaluate(()=>calls.filter(kind=>kind!=='read').length),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} focus failures across ${checks} Image Library checks`);}
 console.log(`PASS ${checks} Image Library Firefox focus checks plus real PNG validation, review cancellation, URL cleanup and late-read reset; zero uploads; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
