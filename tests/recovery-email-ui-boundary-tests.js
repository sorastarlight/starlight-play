const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/admin-next-recovery-email.js'),'utf8'),target='11111111-1111-4111-8111-111111111111';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function fixture(script=source){
 const calls=[],dialogs=[];let button,status,html='';const host={isConnected:true,querySelector:s=>s==='button'?button:status};
 Object.defineProperty(host,'innerHTML',{get:()=>html,set:value=>{html=value;if(button)button.isConnected=false;button={disabled:false,isConnected:true,focus(){this.focused=true;}};status={isConnected:true,textContent:'',removeAttribute(){},setAttribute(){},focus(){this.focused=true;}};}});
 const document={body:{append(d){d.isConnected=true;dialogs.push(d);}},createElement(){const cancel={},outcome={isConnected:true,textContent:'',removeAttribute(){},setAttribute(){},focus(){this.focused=true;}},submit={disabled:false},form={elements:{reason:{value:'Requested account help'},caseRef:{value:'CASE-FIXTURE'}},valid:true,reportValidity(){return this.valid;},querySelector:()=>submit};return{isConnected:false,open:false,parts:{form,cancel,outcome,submit},handlers:{},setAttribute(){},querySelector(s){return s==='form'?form:s==='[data-cancel]'?cancel:outcome;},addEventListener(name,fn){this.handlers[name]=fn;},showModal(){this.open=true;},close(){if(this.open){this.open=false;this.handlers.close?.();}},remove(){this.isConnected=false;}};}};
 host.ownerDocument=document;host.contains=n=>n===button||n===status;document.activeElement=document.body;document.defaultView={setTimeout:f=>f()};
 const root={},ctx={window:root,document,crypto:{randomUUID:()=> '22222222-2222-4222-8222-222222222222'}};vm.runInNewContext(script,ctx);
 const transport=body=>{const pending=deferred();calls.push({...body,...pending});return pending.promise;};
 const prepared=()=>({data:{state:'prepared',targetUuid:target,challengeId:'fixture-challenge',snapshotRevision:'fixture-revision',maskedDestination:'t•••@•••'}});
 return{root,host,get button(){return button;},get status(){return status;},dialogs,calls,prepared,mount(){root.PLAY_ADMIN_RECOVERY_EMAIL.mount(host,{id:target,displayName:'Example Trainer'},transport);}};
}
async function ready(f){f.mount();const pending=f.button.onclick();assert.equal(f.calls.at(-1).action,'prepare');f.calls.at(-1).resolve(f.prepared());await pending;return f.dialogs.at(-1);}
module.exports={fixture,ready};
if(require.main===module)(async()=>{let checks=0;
 let f=fixture(),dialog=await ready(f);dialog.close();assert(f.button.focused);assert.equal(f.button.disabled,false);checks++;
 f=fixture();dialog=await ready(f);const pending=dialog.parts.form.onsubmit({preventDefault(){},target:dialog.parts.form});assert.equal(f.calls.at(-1).action,'send');assert.equal(f.button.disabled,true);dialog.close();assert(f.status.focused);const count=f.calls.length;await f.button.onclick();await dialog.parts.form.onsubmit({preventDefault(){},target:dialog.parts.form});assert.equal(f.calls.length,count);checks++;
 f.calls.at(-1).reject(Error('timeout'));await pending;assert(f.status.textContent.includes('attempted'));assert.equal(f.button.disabled,true);await f.button.onclick();assert.equal(f.calls.length,count);checks++;
 for(const state of ['accepted','failed','uncertain','limited']){f=fixture();dialog=await ready(f);const send=dialog.parts.form.onsubmit({preventDefault(){},target:dialog.parts.form});f.calls.at(-1).resolve({data:{state}});await send;dialog.close();const old=f.calls.length;await f.button.onclick();assert.equal(f.calls.length,old);assert.equal(f.button.disabled,true);checks++;}
 f=fixture();dialog=await ready(f);dialog.parts.form.valid=false;await dialog.parts.form.onsubmit({preventDefault(){},target:dialog.parts.form});assert.equal(f.calls.length,1);assert.equal(f.button.disabled,false);checks++;
 f=fixture();f.mount();const preparing=f.button.onclick();f.root.PLAY_ADMIN_RECOVERY_EMAIL.clear();f.calls.at(-1).resolve(f.prepared());await preparing;assert.equal(f.dialogs.length,0);checks++;
 f=fixture();dialog=await ready(f);const oldSend=dialog.parts.form.onsubmit({preventDefault(){},target:dialog.parts.form});const reply=f.calls.at(-1);f.root.PLAY_ADMIN_RECOVERY_EMAIL.clear();f.mount();const freshStatus=f.status.textContent;reply.resolve({data:{state:'accepted'}});await oldSend;assert.equal(f.status.textContent,freshStatus);assert.equal(f.button.disabled,false);
 const fresh=fixture();fresh.mount();assert.equal(fresh.button.disabled,false);checks++;
 console.log('PASS '+checks+' actual-source mocked recovery-email lifecycle checks;no email/provider/network operation');
})().catch(e=>{console.error(e);process.exitCode=1;});
