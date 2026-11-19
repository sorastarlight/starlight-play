// Real Firefox DOM with fictional transports. No hosted adapter or requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const specs=[
 {name:'items',file:'admin-item-definitions.js',api:'PLAY_ADMIN_ITEM_DEFINITIONS',load:'[data-item-load]',select:'[data-item-definition]',confirm:'[data-item-confirm]',form:'[data-item-form]',status:'[data-items-status]',row:{kind:'ball',key:'quickball',name:'Fictional Quick Ball',description:null,rarity:'uncommon',economicTier:'specialist',shopPrice:350,storeEnabled:true,enabled:true,sprite:'images/items/quick-ball.png',baseMultiplier:1,conditionalMultiplier:1.5,conditionType:'THROW_EARLY',conditionConfig:{maxProgress:.34},guaranteedCapture:false,revision:'a'.repeat(32)}},
 {name:'styles',file:'admin-trainer-styles.js',api:'PLAY_ADMIN_STYLES',load:'[data-style-load]',select:'[data-style-id]',confirm:'[data-style-confirm]',form:'[data-style-form]',status:'[data-styles-status]',row:{id:'fictional-style',name:'Fictional style',gender:'',outfit:'',games:'',visible:false,ext:'png',portraitFile:null,portraitCrop:{},assetKind:'pixel',revision:'a'.repeat(32)}}
];
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});let passed=0;const failures=[];
 const check=(label,actual,expected)=>{try{assert.equal(actual,expected,label);}catch(e){failures.push(e.message);}};
 try{
  for(const spec of specs.filter(s=>!process.argv[2]||s.name===process.argv[2]))for(const outcome of ['success','unknown','denied','background-success','background-error','reset']){
   const label=`${spec.name}/${outcome}`,page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setRequestInterception(true);page.on('request',r=>r.abort());
   await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><button id="outside">Outside editor</button><main id="editor"></main>');
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js',spec.file),'utf8')});
   await page.evaluate(({spec,outcome})=>{
    window.calls=[];window.failRead=true;let row=structuredClone(spec.row);
    Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111'});
    window.app=window[spec.api].mount(document.querySelector('#editor'),async(kind,payload)=>{
     calls.push({kind,payload});
     if(kind==='read'){if(failRead){failRead=false;throw Error('Fictional read failure');}return spec.name==='items'?{ok:true,items:[structuredClone(row)]}:{styles:[structuredClone(row)],assets:[]};}
     return new Promise((resolve,reject)=>window.complete=()=>{
      if(outcome==='denied')return reject(Object.assign(Error('Fictional denial'),{code:'42501'}));
      if(outcome==='unknown'||outcome==='background-error')return reject(Error('Fictional missing receipt'));
      const intent=payload.p_request||payload;row={...row,...intent.changes,revision:'b'.repeat(32)};
      resolve({ok:true,requestId:intent.requestId,[spec.name==='items'?'item':'style']:structuredClone(row)});
     });
    });
   },{spec,outcome});
   await page.focus(spec.load);await page.keyboard.press('Enter');await page.waitForFunction(()=>app.state.phase==='error');
   check(label+' failed read focus',await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
   await page.focus(spec.load);await page.keyboard.press('Enter');await page.waitForFunction(()=>app.state.phase==='ready');
   check(label+' retry focus',await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
   await page.focus(spec.select);await page.keyboard.press('Enter');
   await page.focus(spec.form+' [name=name]');await page.keyboard.down('Control');await page.keyboard.press('a');await page.keyboard.up('Control');await page.keyboard.type('Fictional updated name');
   await page.focus(spec.form+' button[type=submit]');await page.keyboard.press('Enter');await page.waitForSelector('dialog[open]');
   assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));
   await page.focus('dialog [name=reason]');await page.keyboard.type('Isolated local review');
   await page.focus(spec.confirm);await page.keyboard.press('Enter');await page.waitForFunction(()=>app.state.phase==='saving');
   if(outcome.startsWith('background')||outcome==='reset')await page.focus('#outside');
   if(outcome==='reset')await page.evaluate(()=>app.reset());
   await page.evaluate(()=>complete());await page.waitForFunction(()=>app.state.phase!=='saving');
   const result=await page.evaluate(status=>({focus:document.activeElement.id==='outside'?'outside':document.activeElement.getAttribute('role'),message:document.querySelector(status).textContent,phase:app.state.phase,writes:calls.filter(c=>c.kind!=='read').length,fields:document.querySelectorAll('input').length}),spec.status);
   check(label+' result focus',result.focus,outcome.startsWith('background')||outcome==='reset'?'outside':'status');
   assert.equal(result.writes,1);
   if(outcome==='reset'){assert.equal(result.phase,'closed');assert.equal(result.fields,0);}
   else{
    assert.match(result.message,/saved|not confirmed|not be confirmed|access changed/i);
    await page.focus(spec.load);await page.keyboard.press('Enter');
    if(await page.$('dialog[open]')){await page.focus(spec.confirm);await page.keyboard.press('Enter');}
    await page.waitForFunction(()=>app.state.phase==='ready');
    check(label+' recovery focus',await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
    assert.equal(await page.evaluate(()=>calls.filter(c=>c.kind!=='read').length),1,'Recovery must not repeat save');
   }
   assert.deepEqual(errors,[]);passed++;await page.close();
  }
 }finally{await browser.close();}
 if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} focus failures across ${passed} completed scenarios`);}
 assert(passed>0);console.log(`PASS ${passed} Item Effects/Trainer styles Firefox outcome scenarios; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
