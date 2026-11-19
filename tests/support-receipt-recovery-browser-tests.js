// Fictional Service Desk receipts/read failures; no real messages, attachments or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({browser:'firefox',headless:true});const failures=[];let passed=0;
 const check=(label,fn)=>{try{fn();}catch(e){failures.push(label+': '+e.message);}};
 try{
  for(const mode of ['reply-detail-fail','reply-list-fail','attachment-detail-fail','reply-null','create-detail-fail','create-list-fail','create-incomplete','create-null','create-attachment-unknown','create-refresh-navigation']){
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setRequestInterception(true);page.on('request',r=>r.abort());
   await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><main id="editor"></main>');
   await page.evaluate(mode=>{
    window.calls=[];window.created=new Set();let written=false,failedRead=false,sequence=0;
    Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-'+String(++sequence).padStart(12,'0')});
    const ticket=id=>({id,caseNo:id,subject:'Fictional case '+id,state:'open',category:'bug',subcategory:'general',revision:written?2:1,playerId:'fictional',priority:'normal'});
    window.playSupabase={auth:{getUser:async()=>({data:{user:{id:'fictional'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(name,args)=>{
     calls.push({name,...args});const action=args.p_action;
     if(written&&!failedRead&&mode==='create-refresh-navigation'&&action==='list'){failedRead=true;return new Promise(resolve=>window.finishList=()=>resolve({data:{state:'ready',tickets:[ticket('A'),ticket('C')],openCount:2,nextCursor:null}}));}
     if(written&&!failedRead&&((action==='get'&&mode.endsWith('detail-fail'))||(action==='list'&&mode.endsWith('list-fail')))){failedRead=true;return{error:{code:'NETWORK'}};}
     if(action==='list')return{data:{state:'ready',tickets:[ticket('A'),...(created.size?[ticket('C')]:[])],openCount:1,nextCursor:null}};
     if(action==='get')return{data:{state:'ready',ticket:ticket(args.p_payload.ticketId),messages:[],events:[],nextCursor:null}};
     if(action==='inspect')return{data:{attachment:null}};if(action==='capability')return{data:{state:'ready',replyAttachments:true}};
     if(action==='reply'||action==='create'){
      written=true;const attempts=calls.filter(c=>c.p_action===action).length;
      if(action==='create')created.add(args.p_payload.requestUuid);
      if(mode==='reply-null')return{data:null};
      if(['create-incomplete','create-null'].includes(mode)&&attempts===1)return{data:mode==='create-null'?null:{state:'saved'}};
      if(mode==='create-attachment-unknown'&&attempts===1)return{error:{code:'NETWORK'}};
      return{data:{state:'saved',ticket:ticket(action==='create'?'C':'A')}};
     }
     throw Error('Unexpected fixture action');
    }};
    window.attach=selector=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(20)],'fictional.png',{type:'image/png'}));document.querySelector(selector).files=dt.files;};
   },mode);
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/support.js'),'utf8')});await page.evaluate(mode=>window.app=PLAY_SUPPORT.mount(document.querySelector('#editor'),{staff:!mode.startsWith('create')}),mode);
   const press=async s=>{await page.focus(s);await page.keyboard.press('Enter');};
   const settle=async()=>{await page.evaluate(async()=>{for(let n=0;n<50;n++)await Promise.resolve();});};
   await page.waitForSelector('[data-ticket="A"]');
   if(mode.startsWith('create')){
    await press('[data-new]');await page.waitForSelector('dialog[open]');await page.select('dialog [name=category]','bug');await page.type('dialog [name=subject]','Fictional issue');await page.type('dialog [name=body]','Fictional details with sufficient length.');
    if(mode.includes('attachment'))await page.evaluate(()=>attach('[data-attachment]'));
    await press('dialog button.support-primary');await settle();
   }else{
    await press('[data-ticket="A"]');await page.waitForSelector('[data-reply]');await page.waitForFunction(()=>!document.querySelector('[data-reply-attachment]').disabled);
    await page.type('[data-reply] [name=body]','Fictional reply');await page.type('[data-reply] [name=reason]','Fictional reason');if(mode.startsWith('attachment'))await page.evaluate(()=>attach('[data-reply-file]'));
    await press('[data-reply] button.support-primary');await page.waitForFunction(()=>!app.mutationPending);await settle();
   }
   if(mode==='create-refresh-navigation'){
    await page.waitForFunction(()=>typeof finishList==='function');await press('[data-ticket="A"]');await page.waitForFunction(()=>app.ticket?.id==='A');await page.evaluate(()=>finishList());await settle();
    const checkedSelection=await page.evaluate(()=>app.selected);check(mode,()=>assert.equal(checkedSelection,'A'));
    assert.equal(await page.evaluate(()=>calls.filter(c=>c.p_action==='create').length),1);
   }else if(mode.endsWith('-fail')){
    const message=await page.$eval('[data-support-status]',e=>e.textContent);
    check(mode,()=>assert.match(message,/(saved|created).*refresh/i));check(mode+' duplicate warning',()=>assert.match(message,/do not.*(submit|create|send)/i));
    await press('[data-search] button');await page.waitForSelector('[data-ticket="'+(mode.startsWith('create')?'C':'A')+'"]');await press('[data-ticket="'+(mode.startsWith('create')?'C':'A')+'"]');await page.waitForSelector('[data-reply]');
    assert.equal(await page.evaluate(()=>calls.filter(c=>['reply','create'].includes(c.p_action)).length),1);
   }else if(mode==='reply-null'){
    const message=await page.$eval('[data-support-status]',e=>e.textContent);check(mode,()=>assert.match(message,/confirm/));assert.equal(await page.$eval('[data-reply] [name=body]',e=>e.value),'Fictional reply');
   }else{
    const open=!!(await page.$('dialog[open]'));check(mode+' retains draft',()=>assert.equal(open,true));
    if(open){assert.equal(await page.$eval('dialog [name=subject]',e=>e.value),'Fictional issue');await press('dialog button.support-primary');await settle();const writes=await page.evaluate(()=>calls.filter(c=>c.p_action==='create'));assert.equal(writes.length,2);assert.deepEqual(writes[0].p_payload,writes[1].p_payload);assert.equal(writes[0].p_file,writes[1].p_file);assert.equal(await page.evaluate(()=>created.size),1);}
   }
   assert.deepEqual(errors,[]);passed++;await page.close();
  }
 }finally{await browser.close();}
 if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} failed assertions across ${passed} receipt/recovery scenarios`);}
 console.log(`PASS ${passed} Firefox Service Desk receipt/refresh/recovery scenarios; fictional transports only; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
