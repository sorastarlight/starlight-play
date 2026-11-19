// Isolated Firefox: actual crop rendering, controllable fictional sprite loads, no writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});let checks=0;
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>r.abort());
  await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><button id="outside">Outside editor</button><main id="editor"></main>');
  for(const file of ['play-portrait.js','admin-trainer-styles.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js',file),'utf8')});
  await page.evaluate(()=>{
   window.loads=[];window.calls=[];window.renders=0;
   const render=playPortraitRender;window.playPortraitRender=(...args)=>{renders++;return render(...args);};
   window.playLoadImage=src=>new Promise((resolve,reject)=>loads.push({src,resolve:()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=48;const ctx=canvas.getContext('2d');ctx.fillStyle='green';ctx.fillRect(8,4,16,40);resolve(canvas);},reject:()=>reject(Error('Fictional missing sprite'))}));
   const row={id:'fixture-a',name:'Fixture A',gender:'',outfit:'',games:'',visible:false,ext:'png',portraitFile:null,portraitCrop:{},assetKind:'pixel',revision:'a'.repeat(32)};
   window.app=PLAY_ADMIN_STYLES.mount(document.querySelector('#editor'),async kind=>{calls.push(kind);if(kind!=='read')throw Error('Writes prohibited');return{styles:[row,{...row,id:'fixture-b',name:'Fixture B'}],assets:[]};});
  });
  await page.focus('[data-style-load]');await page.keyboard.press('Enter');await page.waitForSelector('[data-style-id]');
  await page.focus('[data-style-id="fixture-a"]');await page.keyboard.press('Enter');
  await page.focus('[data-style-pane="portrait"]');await page.keyboard.press('Enter');await page.waitForFunction(()=>loads.length===1);
  await page.evaluate(()=>loads.shift().reject());await page.waitForFunction(()=>document.querySelector('[data-style-preview-status]').textContent.includes('could not be prepared'));
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.stylePane),'portrait');checks++;
  await page.keyboard.press('Enter');await page.waitForFunction(()=>loads.length===1);await page.evaluate(()=>loads.shift().resolve());
  await page.waitForFunction(()=>document.querySelector('[data-style-preview-status]').textContent.startsWith('Preview ready'));
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.stylePane),'portrait');assert.equal(await page.evaluate(()=>renders),1);checks++;
  await page.focus('[data-style-crop-review]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
  assert(await page.$eval('[data-reviewed-portrait]',c=>c.getContext('2d').getImageData(128,128,1,1).data[3]>0));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  await page.waitForFunction(()=>document.activeElement.hasAttribute('data-style-crop-review'));checks++;
  // Two keyboard crop adjustments: only the newest load may paint.
  await page.focus('[data-style-crop="zoom"]');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>loads.length===2);
  await page.evaluate(()=>loads.pop().resolve());await page.waitForFunction(()=>renders===2);await page.evaluate(()=>loads.shift().reject());
  assert(await page.$eval('[data-style-preview-status]',e=>e.textContent.startsWith('Preview ready')));assert.equal(await page.evaluate(()=>document.activeElement.dataset.styleCrop),'zoom');checks++;
  // Leave the selected style while its preview is pending, discarding the local crop.
  await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>loads.length===1);
  await page.focus('[data-style-id="fixture-b"]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
  await page.focus('[data-style-confirm]');await page.keyboard.press('Enter');await page.waitForFunction(()=>app.state.selected?.id==='fixture-b');
  await page.evaluate(()=>loads.shift().resolve());assert.equal(await page.evaluate(()=>renders),2);assert.equal(await page.$eval('.trainer-style-heading h4',e=>e.textContent),'Fixture B');checks++;
  await page.focus('[data-style-pane="portrait"]');await page.keyboard.press('Enter');await page.waitForFunction(()=>loads.length===1);
  await page.focus('#outside');await page.evaluate(()=>loads.shift().resolve());await page.waitForFunction(()=>renders===3);assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');checks++;
  await page.focus('[data-style-pane="portrait"]');await page.keyboard.press('Enter');await page.waitForFunction(()=>loads.length===1);
  await page.evaluate(()=>app.reset());await page.focus('#outside');await page.evaluate(()=>loads.shift().resolve());
  assert.equal(await page.evaluate(()=>renders),3);assert.equal(await page.$('[data-style-canvas]'),null);assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');checks++;
  assert.equal(await page.evaluate(()=>calls.filter(kind=>kind!=='read').length),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 console.log(`PASS ${checks} Firefox portrait preview failure/retry/cancel/latest-result/navigation/outside-focus/reset checks; no saves or uploads; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
