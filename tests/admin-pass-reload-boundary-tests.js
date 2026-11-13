const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),api=require(process.argv[2]||'../js/admin-reward-bundles');
const source=fs.readFileSync('js/admin-pass-editor.js','utf8'),start=source.indexOf(' function reload(){'),end=source.indexOf(' function render(s){',start);assert(start>=0&&end>start);
function fixture(phase='ready',isDirty=true){let loads=0,kept=0,modalCount=0;const dialogs=[];const button={disabled:false,focus(){kept++;}};const host={isConnected:true,append:d=>dialogs.push(d),closest:()=>null,contains:()=>false,querySelector:selector=>selector==='dialog[open]'?dialogs.find(d=>d.open)||null:button};const model={getState:()=>({phase}),load(){loads++;}};
 const document={body:{},activeElement:null,createElement(){modalCount++;const listeners={},controls={};return{open:false,isConnected:true,setAttribute(){},querySelector:key=>controls[key]||(controls[key]={}),addEventListener:(k,f)=>listeners[k]=f,close(){this.open=false;listeners.close?.();},remove(){this.isConnected=false;},showModal(){this.open=true;}};}};
 document.activeElement=document.body;const context={editorEpoch:0,document,host,model,dirty:()=>isDirty,reloadDialog:null};vm.createContext(context);vm.runInContext(source.slice(start,end),context);return{run:()=>context.reload(),dialogs,button,host,setPhase:p=>phase=p,counts:()=>({loads,kept,modalCount})};}
(async()=>{
 let n=0;
 const cancel=fixture();cancel.run();assert.equal(cancel.counts().loads,0);cancel.dialogs[0].querySelector('[data-keep-edits]').onclick();assert.equal(cancel.counts().loads,0);assert.equal(cancel.counts().kept,1);n++;
 const confirm=fixture();confirm.run();confirm.run();assert.equal(confirm.counts().modalCount,1);const action=confirm.dialogs[0].querySelector('[data-reload-confirm]').onclick;action();action();assert.equal(confirm.counts().loads,1);n++;
 const closed=fixture();closed.run();closed.dialogs[0].open=false;closed.dialogs[0].querySelector('[data-reload-confirm]').onclick();assert.equal(closed.counts().loads,0);n++;
 const clean=fixture('ready',false);clean.run();assert.equal(clean.counts().loads,1);assert.equal(clean.counts().modalCount,0);n++;
 for(const phase of ['loading','saving']){const f=fixture(phase);f.run();assert.equal(f.counts().loads,0);assert.equal(f.counts().modalCount,0);n++;}
 const hidden=fixture();hidden.run();hidden.host.isConnected=false;hidden.dialogs[0].querySelector('[data-keep-edits]').onclick();assert.equal(hidden.counts().kept,0);n++;
 const id='12121212-1212-4121-8121-121212121212',catalog=[{id:'item:figy',kind:'item',name:'Figy Berry',category:'Berries',sprite:'images/items/figy-berry.png',enabled:true,maxQuantity:100}],entry={catalogId:'item:figy',quantity:1,secret:false};
 const raw={revision:'r1',rotationActive:true,catalog,daily:[entry],weekly:[entry]};let resolve,reads=0,saves=0;const m=api.create(kind=>kind==='read'?(reads++,Promise.resolve(raw)):(saves++,new Promise(r=>resolve=r)));
 await m.load();m.reviewMode(false,id);const pending=m.save();await m.load();assert.equal(reads,1);assert.equal(m.getState().phase,'saving');await assert.rejects(m.save());assert.equal(saves,1);resolve({status:'saved',requestId:id,revision:'r2'});await pending;assert.equal(m.getState().phase,'saved');n++;
 let finish;const loading=api.create(()=>{reads++;return new Promise(r=>finish=r);});const before=reads,p=loading.load();await loading.load();assert.equal(reads,before+1);finish(raw);await p;n++;
 assert(source.includes("if(e.target.closest('[data-load]')){reload();return;}"));n++;
 console.log(`PASS ${n} actual reload-handler/controller checks;no transport outside stubs`);
})().catch(e=>{console.error(e);process.exitCode=1;});
