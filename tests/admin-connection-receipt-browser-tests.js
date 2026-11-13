// Real Hub/Account adapter; only post-dispatch endpoint replies and session facade are fictional.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
const {connectionFixture,prepareConnection}=require('./admin-connection-recovery-browser-tests');
const source=fs.readFileSync(path.join(__dirname,'admin-service-desk-handoff-browser-tests.js'),'utf8');
const handoffFixture=Function('return '+source.slice(source.indexOf('async function handoffFixture('),source.indexOf('(async()=>')))();
const commonFaults=['null','bad-ok','wrong-target','not-array','null-row','duplicate-id','duplicate-provider','case-duplicate-id','multiple-primary','wrong-record-id','wrong-provider-id','missing-member','extra-member','stale','bad-capability','bad-boolean'];
function corruptConnectionReceipt(action,value,fault,before){
 if(fault==='null')return null;if(fault==='stale')return structuredClone(before);
 const result=structuredClone(value);if(fault==='bad-ok')result.ok='true';if(fault==='wrong-target')result.user.id='55555555-5555-4555-8555-555555555555';if(fault==='not-array'){result.connections={};return result;}
 const selected=result.connections.find(r=>r.twitchUserId==='9102')||result.connections[0],other=result.connections[0];
 if(fault==='null-row')result.connections[0]=null;
 if(fault==='duplicate-id')result.connections.push({...other,twitchUserId:'9998',primary:false});
 if(fault==='duplicate-provider')result.connections.push({...other,id:'cccccccc-3333-4333-8333-333333333333',primary:false});
 if(fault==='case-duplicate-id')result.connections.push({...other,id:other.id.toUpperCase(),twitchUserId:'9998',primary:false});
 if(fault==='multiple-primary'){result.connections.forEach(r=>r.primary=true);if(result.connections.length===1)result.connections.push({...other,id:'cccccccc-3333-4333-8333-333333333333',twitchUserId:'9998',primary:true});}
 if(fault==='wrong-record-id')selected.id='dddddddd-4444-4444-8444-444444444444';
 if(fault==='wrong-provider-id')selected.twitchUserId='9998';
 if(fault==='missing-member')result.connections=result.connections.filter(r=>r.twitchUserId!=='9101');
 if(fault==='extra-member')result.connections.push({...other,id:'cccccccc-3333-4333-8333-333333333333',twitchUserId:'9998',primary:false});
 if(fault==='bad-capability')result.canEdit='true';if(fault==='bad-boolean')selected.loginEnabled='false';
 if(fault==='unconfirmed-target')selected.confirmed=false;
 if(fault==='valid-reordered')result.connections.reverse();if(fault==='valid-case')result.connections.forEach(r=>r.id=r.id.toUpperCase());
 return result;
}
function installReceiptReplies(action,fault){
 const call=playCall;connectionAccount.connections[0].id='aaaaaaaa-1111-4111-8111-111111111111';connectionAccount.connections[1].id='bbbbbbbb-2222-4222-8222-222222222222';
 if(fault==='valid-empty')connectionAccount.connections=connectionAccount.connections.filter(r=>r.twitchUserId==='9102');
 window.playCall=async(name,args)=>{const before=structuredClone(connectionAccount),result=await call(name,args);return ['admin_set_twitch_primary','admin_set_twitch_flags','admin_disconnect_twitch'].includes(name)?corruptConnectionReceipt(action,result,fault,before):result;};
}
async function main(){const browser=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const action of ['primary','flags','disconnect'])for(const fault of [...commonFaults,...(action==='disconnect'?[]:['unconfirmed-target']),'valid-exact','valid-reordered','valid-case',...(action==='disconnect'?['valid-empty']:[])]){
  const label=action+'/'+fault;if(process.env.CONNECTION_RECEIPT_CASE&&process.env.CONNECTION_RECEIPT_CASE!==label)continue;
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);await p.setRequestInterception(true);const html=fs.readFileSync(path.join(__dirname,'../admin-next.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');p.on('request',r=>r.url().startsWith('https://fixture.invalid/admin-next.html')?r.respond({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());await p.goto('https://fixture.invalid/admin-next.html?section=trainers');await p.evaluate(handoffFixture);for(const n of ['admin-next-trainers','admin-next-record','admin-account-tools'])await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/'+n+'.js'),'utf8')});await p.evaluate(connectionFixture,'confirmed');await p.addScriptTag({content:corruptConnectionReceipt.toString()});await p.evaluate(installReceiptReplies,action,fault);await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next.js'),'utf8')});await p.waitForSelector('[data-open-trainer]');await p.click('[data-open-trainer]');await p.waitForSelector('[data-record-support]');await p.evaluate(prepareConnection,action);await p.evaluate(()=>{window.oldReceiptConfirm=document.querySelector('[data-account-confirm]');window.beforeReceiptSnapshot=structuredClone(connectionTool.state.snapshot);});await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase!=='saving');
  assert.equal(await p.evaluate(()=>connectionWrites.length),1);assert.equal(await p.evaluate(()=>connectionTool.state.uncertain),true);assert.equal(await p.evaluate(()=>connectionTool.canLeave()),false);
  assert.match(await p.$eval('.account-tool-status',n=>n.textContent),fault.startsWith('valid-')?/Change saved/:/Save outcome uncertain/);
  if(!fault.startsWith('valid-'))assert.deepEqual(await p.evaluate(()=>connectionTool.state.snapshot),await p.evaluate(()=>beforeReceiptSnapshot),'Unverified receipt data must not replace the known Account snapshot');const original=await p.evaluate(()=>structuredClone(connectionWrites));assert.equal(original[0].args.p_user,'22222222-2222-4222-8222-222222222222');assert.equal(original[0].args.p_twitch_user_id,'9102');await p.evaluate(()=>oldReceiptConfirm.click());
  if(!fault.startsWith('valid-')){await p.evaluate(()=>connectionReadFault=true);await p.focus('[data-account-reload]');await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase==='error');assert.equal(await p.evaluate(()=>connectionTool.state.uncertain),true);assert.equal(await p.evaluate(()=>connectionTool.state.snapshot),null);assert.equal(await p.evaluate(()=>connectionTool.canLeave()),false);}
  await p.evaluate(()=>connectionReadFault=false);await p.focus('[data-account-reload]');await p.keyboard.press('Enter');await p.waitForFunction(()=>connectionTool.state.phase==='ready');assert.equal(await p.evaluate(()=>connectionTool.canLeave()),true);assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.target),'22222222-2222-4222-8222-222222222222');if(fault==='valid-empty')assert.equal(await p.evaluate(()=>connectionTool.state.snapshot.connections.length),0);await p.evaluate(()=>oldReceiptConfirm.click());await new Promise(r=>setTimeout(r,150));assert.deepEqual(await p.evaluate(()=>connectionWrites),original);assert.equal(await p.evaluate(()=>connectionReads.every(r=>r.args.p_user==='22222222-2222-4222-8222-222222222222')),true);assert.deepEqual(errors,[]);console.log('PASS connection receipt '+label);await p.close();
 }
}finally{await browser.close();}}
module.exports={corruptConnectionReceipt,installReceiptReplies,commonFaults};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
