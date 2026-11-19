// Isolated real DOM; Service Desk RPCs and identity responses are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});let passed=0;const failures=[];
 try{
  for(const mode of ['reply-identity-navigation','attachment-identity-navigation','attachment-prepare-navigation','transition-cancel','create-cancel','create-attachment-cancel','reply-unknown-retry','attachment-unknown-retry','invalid-attachment','reply-background-result','attachment-background-result','reply-foreground-result']){
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setRequestInterception(true);page.on('request',r=>r.abort());
   await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><button id="outside">Outside editor</button><main id="editor"></main>');
   await page.evaluate(mode=>{
    window.calls=[];window.holdNextIdentity=false;window.holdNextBytes=false;window.authChange=null;let sequence=0;
    Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-'+String(++sequence).padStart(12,'0')});
    const user=()=>({data:{user:{id:'fictional'}}});
    const read=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(!holdNextBytes)return read.call(this);holdNextBytes=false;return new Promise(resolve=>window.finishBytes=async()=>resolve(await read.call(this)));};
    const ticket=id=>({id,caseNo:id,subject:'Fictional case '+id,state:'open',category:'bug',subcategory:'general',revision:1,playerId:'fictional',priority:'normal'});
    window.playSupabase={auth:{getUser:async()=>{if(!holdNextIdentity)return user();holdNextIdentity=false;return new Promise(resolve=>window.finishIdentity=()=>resolve(user()));},onAuthStateChange:fn=>{authChange=fn;return{data:{subscription:{unsubscribe(){}}}};}},rpc:async(name,args)=>{
     calls.push({name,...args});const action=args.p_action;
     if(action==='list')return{data:{state:'ready',tickets:[ticket('A'),ticket('B')],openCount:2,nextCursor:null}};
     if(action==='get')return{data:{state:'ready',ticket:ticket(args.p_payload.ticketId),messages:[],events:[],nextCursor:null}};
     if(action==='inspect')return{data:{attachment:null}};
     if(action==='capability')return{data:{state:'ready',replyAttachments:true}};
     if(['reply','transition','create'].includes(action)){
      const writes=calls.filter(c=>['reply','transition','create'].includes(c.p_action));
      if(mode.includes('-result'))return new Promise(resolve=>window.finishMutation=()=>resolve({data:{state:'saved',ticket:ticket('A')}}));
      if(mode.includes('unknown-retry')&&writes.length===1)return{error:{code:'NETWORK'}};
      return{data:{state:'saved',ticket:ticket('A')}};
     }
     throw Error('Unexpected fictional action '+action);
    }};
    window.chooseFile=async(invalid,selector='[data-reply-file]')=>{const file=invalid?new File(['bad'],'bad.svg',{type:'image/svg+xml'}):new File([new Uint8Array(20)],'fictional.png',{type:'image/png'}),dt=new DataTransfer();dt.items.add(file);document.querySelector(selector).files=dt.files;};
   },mode);
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/support.js'),'utf8')});
   await page.evaluate(mode=>window.app=PLAY_SUPPORT.mount(document.querySelector('#editor'),{staff:!mode.startsWith('create')}),mode);
   const press=async selector=>{await page.focus(selector);await page.keyboard.press('Enter');};
   await page.waitForSelector('[data-ticket="A"]');
   if(mode.startsWith('create')){
    await press('[data-new]');await page.waitForSelector('dialog[open]');
    await page.select('dialog [name=category]','bug');await page.type('dialog [name=subject]','Fictional issue');await page.type('dialog [name=body]','A fictional issue with enough detail.');
    if(mode==='create-attachment-cancel')await page.evaluate(()=>chooseFile(false,'[data-attachment]'));
    await page.evaluate(()=>holdNextIdentity=true);await press('dialog button.support-primary');await page.waitForFunction(()=>typeof finishIdentity==='function');
    await press('dialog [data-cancel]');await page.waitForFunction(()=>!document.querySelector('dialog'));await page.evaluate(()=>finishIdentity());
   }else{
    await press('[data-ticket="A"]');await page.waitForSelector('[data-reply]');await page.waitForFunction(()=>!document.querySelector('[data-reply-attachment]').disabled);
    if(mode==='transition-cancel'){
     await press('[data-transition="resolved"]');await page.type('dialog [name=reason]','Fictional review');if(mode==='create-attachment-cancel')await page.evaluate(()=>chooseFile(false,'[data-attachment]'));
    await page.evaluate(()=>holdNextIdentity=true);await press('dialog button.support-primary');await page.waitForFunction(()=>typeof finishIdentity==='function');
     await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));await page.evaluate(()=>finishIdentity());
    }else{
     await page.type('[data-reply] [name=body]','Fictional reply text');await page.type('[data-reply] [name=reason]','Fictional review');
     if(mode.includes('attachment'))await page.evaluate(invalid=>chooseFile(invalid),mode==='invalid-attachment');
     if(mode.includes('identity'))await page.evaluate(()=>holdNextIdentity=true);
     if(mode.includes('prepare'))await page.evaluate(()=>holdNextBytes=true);
     await press('[data-reply] button.support-primary');
     if(mode.includes('-result')){await page.waitForFunction(()=>typeof finishMutation==='function');if(mode.includes('background'))await page.focus('#outside');await page.evaluate(()=>finishMutation());}
     else if(mode.includes('navigation')){
      await page.waitForFunction(mode=>typeof window[mode.includes('prepare')?'finishBytes':'finishIdentity']==='function',{},mode);
      await press('[data-ticket="B"]');await page.waitForFunction(()=>app.ticket?.id==='B');
      await page.evaluate(mode=>window[mode.includes('prepare')?'finishBytes':'finishIdentity'](),mode);
     }else if(mode.includes('unknown-retry')){
      await page.waitForFunction(()=>!app.mutationPending&&document.querySelector('[data-support-status]').textContent.toLowerCase().includes('could not'));
      assert.equal(await page.$eval('[data-reply] [name=body]',e=>e.value),'Fictional reply text');
      await press('[data-reply] button.support-primary');
     }
    }
   }
   await page.waitForFunction(()=>!app.mutationPending);
   // Let the resumed identity promise finish its complete request/re-render chain.
   await page.evaluate(async()=>{for(let n=0;n<30;n++)await Promise.resolve();});
   const writes=await page.evaluate(()=>calls.filter(c=>['reply','transition','create'].includes(c.p_action)));
   const expected=mode.includes('unknown-retry')?2:mode.includes('-result')?1:0;
   try{assert.equal(writes.length,expected,mode+' dispatched mutations');}catch(e){failures.push(e.message);}
   if(mode.includes('background-result')){try{assert.equal(await page.evaluate(()=>document.activeElement.id),'outside',mode+' preserves outside focus');}catch(e){failures.push(e.message);}}
   if(mode==='reply-foreground-result')assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-case-heading')),true);
   if(expected===2){assert.equal(writes[0].p_payload.requestUuid,writes[1].p_payload.requestUuid);assert.deepEqual(writes[0].p_payload,writes[1].p_payload);assert.equal(writes[0].p_file,writes[1].p_file);assert.match(await page.$eval('[data-support-status]',e=>e.textContent),/Saved/);}
   if(mode==='invalid-attachment')assert.match(await page.$eval('[data-support-status]',e=>e.textContent),/PNG or JPEG/);
   assert.deepEqual(errors,[]);passed++;await page.close();
  }
 }finally{await browser.close();}
 if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} failures across ${passed} Service Desk scenarios`);}
 console.log(`PASS ${passed} Service Desk Firefox presend navigation/cancel/preparation and same-request recovery scenarios; no real messages/uploads; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
