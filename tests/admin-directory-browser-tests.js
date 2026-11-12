// Actual Hub shell and presenters; intercepted fixture origin, fictional staff/session reads.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
(async()=>{const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const mode of ['empty','match','error-retry','denied','outside','signout','tab','paging','profile']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html',body:html}):r.abort());await page.goto('https://fixture.invalid/admin-next.html?section=trainers');
  await page.evaluate(mode=>{window.calls=[];window.actor='fictional-staff';const button=document.createElement('button');button.id='outside';button.textContent='Outside workspace';document.body.prepend(button);
   window.playSupabase={auth:{getSession:async()=>({data:{session:actor?{user:{id:actor}}:null}}),onAuthStateChange:fn=>{window.authChange=fn;}},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{display_name:'Fictional staff'}})}),rpc:async name=>{if(name!=='is_play_admin')throw Error('Unexpected RPC');return {data:true};}};window.playSetAccountNav=()=>{};window.playBindAccountNav=()=>{};window.playRpcError=()=> 'Could not load trainers.';
   window.playCall=async(name,args)=>{calls.push({name,args:structuredClone(args)});if(name==='admin_user_account')return {ok:true,user:{id:args.p_user,displayName:'Fictional Cedar',login:'cedar'},connections:[]};if(name==='admin_identity_inspect')return {ok:true,trainer:{level:3},cosmetics:[],titles:[],badges:[],catalog:[],ownedAvatarPacks:[]};if(name!=='admin_list_users')throw Error('Unexpected application call '+name);
    const count=calls.filter(c=>c.name===name).length;if(count===2){if(['outside','signout','tab','profile'].includes(mode))await new Promise(r=>window.release=r);if(mode==='error-retry')throw Error('Fictional read failed');if(mode==='denied')throw Object.assign(Error('Fictional denied'),{code:'42501'});}
    const paging=mode==='paging',offset=args.p_offset||0,empty=mode==='empty'&&count===2,n=empty?0:paging&&offset===0?50:1;return {users:Array.from({length:n},(_,i)=>({id:'fixture-'+(offset+i),displayName:'Fictional Cedar '+(offset+i),login:'cedar'+(offset+i),role:'player'})),total:empty?0:paging?51:1,offset};
   };
  },mode);
  for(const name of ['admin-next-trainers.js','admin-next-record.js','admin-next.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+name),'utf8')});
  await page.waitForFunction(()=>!document.querySelector('#staff').hidden&&document.querySelector('[data-open-trainer]'));
  if(mode==='paging'){await page.focus('[data-trainers-next]');await page.keyboard.press('Enter');}
  else{await page.type('#next-trainer-q','cedar');await page.keyboard.press('Enter');}
  await page.waitForFunction(()=>calls.filter(c=>c.name==='admin_list_users').length===2);
  if(['outside','signout','tab','profile'].includes(mode)){
   if(mode==='outside')await page.focus('#outside');if(mode==='signout')await page.evaluate(()=>{actor='';authChange('SIGNED_OUT',null);});if(mode==='tab')await page.click('[data-next-tab=mart]');if(mode==='profile'){await page.focus('[data-open-trainer]');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#next-trainers').classList.contains('is-profile'));}
   await page.evaluate(()=>release());await new Promise(r=>setTimeout(r,300));
   if(mode==='outside')assert.equal(await page.evaluate(()=>document.activeElement.id),'outside');if(mode==='signout'){assert.equal(await page.$eval('#staff',e=>e.hidden),true);assert.equal(await page.$$eval('[data-open-trainer]',r=>r.length),0);assert.equal(await page.$eval('#next-trainer-list-status',e=>e.getAttribute('aria-label')),null);}if(mode==='tab')assert.equal(await page.evaluate(()=>document.activeElement.dataset.nextTab),'mart');if(mode==='profile')assert.equal(await page.evaluate(()=>document.activeElement.id),'next-trainer-detail-status');
  }else{
   await new Promise(r=>setTimeout(r,300));assert.equal(await page.evaluate(()=>document.activeElement.id),'next-trainer-list-status');const text=await page.evaluate(()=>document.activeElement.textContent);assert.match(text,mode==='empty'?/No trainers match/:mode==='error-retry'?/Could not load trainers/:mode==='denied'?/restricted to staff/:mode==='paging'?/Showing 51/:/1 trainer/);
   if(mode==='error-retry'){await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Find');await page.keyboard.press('Enter');await new Promise(r=>setTimeout(r,300));assert.match(await page.evaluate(()=>document.activeElement.textContent),/1 trainer/);assert.equal(await page.$eval('#next-trainer-q',e=>e.value),'cedar');}
   if(mode==='denied')assert.equal(await page.$$eval('[data-open-trainer]',r=>r.length),0);
   if(mode==='paging'){assert.equal(await page.evaluate(()=>calls[1].args.p_offset),50);await page.focus('[data-trainers-prev]');await page.keyboard.press('Enter');await new Promise(r=>setTimeout(r,300));assert.match(await page.evaluate(()=>document.activeElement.textContent),/Showing 1/);}
  }
  assert.equal(await page.evaluate(()=>calls.every(c=>['admin_list_users','admin_user_account','admin_identity_inspect'].includes(c.name))),true);assert.deepEqual(errors,[]);console.log('PASS directory '+mode);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
