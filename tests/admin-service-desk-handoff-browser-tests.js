// Production Hub shell/record/reward modules; fictional session and transports only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
async function handoffFixture(mode='normal'){
 window.calls=[];window.writes=[];window.supportMounts=[];window.rewardReads=0;window.actor='fictional-staff';
 window.playSupabase={auth:{getSession:async()=>({data:{session:{user:{id:actor}}}}),onAuthStateChange:fn=>window.authChange=fn},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{display_name:'Fictional staff'}})}),rpc:async name=>{if(name!=='is_play_admin')throw Error('Unexpected role operation');return{data:true};}};
 window.playSetAccountNav=()=>{};window.playBindAccountNav=()=>{};
 window.PLAY_SUPPORT={mount:(_node,opts)=>supportMounts.push(structuredClone(opts)),unmount:()=>{}};
 Object.defineProperty(crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111',configurable:true});
 window.playCall=async(name,args)=>{calls.push({name,args:structuredClone(args)});
  if(name==='admin_list_users')return{users:[{id:'fixture',displayName:'Fictional Cedar',login:'cedar',role:'player'}],total:1};
  if(name==='admin_user_account')return{ok:true,user:{id:args.p_user,displayName:'Fictional Cedar',login:'cedar'},mons:[]};
  if(name==='admin_identity_inspect')return{ok:true,trainer:{level:3},cosmetics:[],titles:[],badges:[],catalog:[],ownedAvatarPacks:[]};
  if(name==='admin_trainer_rewards'){rewardReads++;if(mode==='confirmed'&&rewardReads>1)throw Error('Fictional history unavailable');return{canWrite:true,catalog:{items:[{id:'honey',name:'Honey'}]},actions:[]};}
  if(name==='admin_trainer_reward_action'){writes.push(structuredClone(args));if(mode==='pending')await new Promise(r=>window.releaseHandoffWrite=r);return{ok:true,requestId:mode==='uncertain'&&writes.length===1?'wrong-fictional-receipt':args.p_request,message:'Fictional gift confirmed.'};}
  throw Error('Unexpected application call '+name);
 };
}
(async()=>{const b=await puppeteer.launch({browser:'firefox',headless:true});try{for(const mode of ['normal','review','pending','uncertain','confirmed','recovered']){
 if(process.env.HANDOFF_CASE&&process.env.HANDOFF_CASE!==mode)continue;
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');await p.setRequestInterception(true);p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section=trainers');await p.evaluate(handoffFixture,mode==='recovered'?'uncertain':mode);
 for(const n of ['admin-next-trainers','admin-next-record','admin-next-rewards','admin-next'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');
 if(mode!=='normal'){
  await p.click('[data-trainer-pane=gifts]');await p.waitForSelector('[name=key]');await p.select('[name=key]','honey');await p.focus('[data-reward-form] [type=submit]');await p.keyboard.press('Enter');await p.waitForSelector('.reward-review-form');
  if(mode!=='review'){await p.$eval('textarea',n=>n.value='Local fixture gift');await p.focus('.reward-deliver');await p.keyboard.press('Enter');if(mode==='pending')await p.waitForFunction(()=>typeof releaseHandoffWrite==='function');else await p.waitForSelector('[data-reward-retry]:not([hidden])');}
  if(mode==='recovered'){const prior=p.url();await p.focus('[data-record-support]');await p.keyboard.press('Enter');assert.equal(p.url(),prior);assert.match(await p.$eval('[data-reward-status]',n=>n.getAttribute('aria-label')),/unconfirmed/);await p.focus('[data-reward-retry]');await p.keyboard.press('Enter');await p.waitForFunction(()=>PLAY_ADMIN_REWARDS.canLeave(document.querySelector('#next-trainer-detail')));}
 }
 const before=await p.url();if(mode==='review')await p.$eval('[data-record-support]',n=>n.click());else{await p.focus('[data-record-support]');await p.keyboard.press('Enter');}await new Promise(r=>setTimeout(r,220));
 if(['normal','recovered'].includes(mode)){assert.equal(await p.evaluate(()=>document.activeElement.matches('#next-panel-support h2')),true);assert.match(await p.$eval('#next-support-context',n=>n.textContent),/Fictional Cedar.*@cedar.*fixture/);assert.equal(await p.evaluate(()=>supportMounts.at(-1).playerId),'fixture');}
 else{assert.equal(await p.url(),before,'Unfinished reward action must not change navigation URL');assert.equal(await p.$eval('#next-panel-support',n=>n.hidden),true);assert.equal(await p.evaluate(()=>supportMounts.length),0);if(mode!=='review')assert.match(await p.evaluate(()=>document.activeElement.textContent),/Finish or cancel|unconfirmed|confirmed/);}
 assert.equal(await p.evaluate(()=>writes.length),mode==='normal'||mode==='review'?0:mode==='recovered'?2:1);if(mode==='recovered')assert.deepEqual(await p.evaluate(()=>writes[0]),await p.evaluate(()=>writes[1]),'Recovery must retrieve the same reviewed request');assert.deepEqual(errors,[]);console.log('PASS Service Desk handoff '+mode);await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
