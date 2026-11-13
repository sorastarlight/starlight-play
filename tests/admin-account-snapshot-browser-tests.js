// Actual Hub/Account adapter; malformed data is injected only at the fictional endpoint boundary.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const {connectionFixture,prepareConnection}=require('./admin-connection-recovery-browser-tests');
const src=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+src.slice(src.indexOf('async function handoffFixture('),src.indexOf('(async()=>')))();
const faults=['null-account','wrong-target','missing-user','bad-ok','null-identity','bad-ranking','not-array','over-limit','null-row','bad-uuid','bad-twitch','bad-type','bad-boolean','missing-permission','duplicate-id','duplicate-twitch','case-duplicate-id','multiple-primary'];
function corruptSnapshot(name,value,fault){
 if(!fault)return value;
 if(name==='admin_identity_inspect'){if(fault==='null-identity')return null;if(fault==='bad-ranking')return{...value,rankingVisible:'yes'};return value;}
 if(name!=='admin_user_account')return value;
 if(fault==='null-account')return null;const data=structuredClone(value);
 if(fault==='wrong-target')data.user.id='55555555-5555-4555-8555-555555555555';
 if(fault==='missing-user')data.user=null;if(fault==='bad-ok')data.ok='true';
 if(fault==='not-array')data.connections={};if(fault==='over-limit')data.connections=Array.from({length:101},()=>data.connections[0]);
 if(fault==='null-row')data.connections[0]=null;if(fault==='bad-uuid')data.connections[0].id='not-a-uuid';
 if(fault==='bad-twitch')data.connections[0].twitchUserId='not-an-id';if(fault==='bad-type')data.connections[0].type='unknown';
 if(fault==='bad-boolean')data.connections[0].loginEnabled='false';if(fault==='missing-permission')delete data.canEdit;
 if(fault==='duplicate-id')data.connections[1].id=data.connections[0].id;
 if(fault==='duplicate-twitch')data.connections[1].twitchUserId=data.connections[0].twitchUserId;
 if(fault==='case-duplicate-id'){data.connections[0].id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';data.connections[1].id='AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';}
 if(fault==='multiple-primary')data.connections.forEach(r=>r.primary=true);
 if(fault==='valid-empty')data.connections=[];if(fault==='valid-no-primary')data.connections.forEach(r=>r.primary=false);if(fault==='valid-unconfirmed')data.connections.forEach(r=>Object.assign(r,{primary:false,confirmed:false,loginEnabled:false,gameplayEnabled:false}));if(fault==='valid-read-only')Object.assign(data,{staffRole:'moderator',canEdit:false,ownerTools:false});
 return data;
}
function installSnapshotReplies(){const corrupt=window.corruptSnapshot,call=playCall;window.snapshotFault='';window.playCall=async(name,args)=>corrupt(name,await call(name,args),snapshotFault);}
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const phase of ['inspect','preflight','recovery'])for(const fault of phase==='inspect'?[...faults,'valid-empty','valid-no-primary','valid-unconfirmed','valid-read-only']:faults){
  const label=phase+'/'+fault;if(process.env.ACCOUNT_SNAPSHOT_CASE&&process.env.ACCOUNT_SNAPSHOT_CASE!==label)continue;
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);await p.setRequestInterception(true);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section=trainers');await p.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.evaluate(connectionFixture,phase==='recovery'?'unknown':'confirmed');await p.addScriptTag({content:corruptSnapshot.toString()});await p.evaluate(installSnapshotReplies);await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');await p.evaluate(prepareConnection,'primary');await p.evaluate(()=>window.oldSnapshotConfirm=document.querySelector('[data-account-confirm]'));
  if(phase==='inspect')await p.keyboard.press('Escape');
  if(phase==='recovery'){await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.uncertain);}
  await p.evaluate(fault=>snapshotFault=fault,fault);
  if(phase==='preflight')await p.keyboard.press('Enter');else{await p.focus('[data-account-reload]');await p.keyboard.press('Enter');}
  await p.waitForFunction(()=>!['loading','saving'].includes(connectionTool.state.phase));if(fault.startsWith('valid-')){assert.equal(await p.evaluate(()=>connectionTool.state.phase),'ready');assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.target),'22222222-2222-4222-8222-222222222222');assert.equal(await p.evaluate(()=>connectionTool.canLeave()),true);if(fault==='valid-no-primary')assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.connections.filter(r=>r.primary).length),0);if(fault==='valid-unconfirmed')assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.connections.every(r=>!r.confirmed)),true);if(fault==='valid-empty')assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.connections.length),0);if(fault==='valid-read-only'){assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.canEdit),false);assert.equal(await p.$$eval('[data-account-primary],[data-account-flags],[data-account-disconnect]',n=>n.length),0);}await p.evaluate(()=>oldSnapshotConfirm.click());await new Promise(r=>setTimeout(r,150));assert.equal(await p.evaluate(()=>connectionWrites.length),0);assert.equal(await p.evaluate(()=>connectionReads.every(r=>r.args.p_user==='22222222-2222-4222-8222-222222222222')),true);assert.deepEqual(errors,[]);console.log('PASS account snapshot '+label);await p.close();continue;}assert.equal(await p.evaluate(()=>connectionTool.state.phase),'error',label+' must reject unverifiable data');assert.equal(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.equal(await p.$$eval('[data-account-flags],[data-account-primary],[data-account-disconnect]',n=>n.length),0);assert.equal(await p.evaluate(()=>connectionTool.state.uncertain),phase==='recovery');assert.equal(await p.evaluate(()=>connectionWrites.length),phase==='recovery'?1:0);
  const before=await p.evaluate(()=>structuredClone(connectionWrites));await p.evaluate(()=>snapshotFault='');await p.focus('[data-account-reload]');await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase==='ready');assert.equal(await p.evaluate(()=>connectionTool.canLeave()),true);assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.target),'22222222-2222-4222-8222-222222222222');
  await p.evaluate(()=>oldSnapshotConfirm.click());await new Promise(r=>setTimeout(r,200));assert.deepEqual(await p.evaluate(()=>connectionWrites),before,'A closed review cannot dispatch after snapshot recovery');assert.equal(await p.evaluate(()=>connectionReads.every(r=>r.args.p_user==='22222222-2222-4222-8222-222222222222')),true);assert.deepEqual(errors,[]);console.log('PASS account snapshot '+label);await p.close();
 }
}finally{await browser.close();}}
module.exports={corruptSnapshot,installSnapshotReplies,faults};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
