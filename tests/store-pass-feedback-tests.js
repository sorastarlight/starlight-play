const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/store.js'),'utf8');
const start='  els.floors?.addEventListener("click", async (event) => {';
const end='\n  els.floors?.addEventListener("keydown",';
const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);const body=source.slice(a+start.length,b).replace(/\}\);\s*$/,'');
const helpers=source.slice(source.indexOf('  async function functionMessage('),source.indexOf('  async function refreshStore('));
const flush=async()=>{for(let i=0;i<18;i++)await Promise.resolve();};
function fixture({session={provider_token:'fictional-token'},authError=null,reply={data:{active:true},error:null},transportError=null,deferred=false,loadError=null}={}){
 const note={textContent:''},button={disabled:false,isConnected:true,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}},calls=[];let resolve,reject,loads=0;
 const client={auth:{getSession:async()=>{if(authError)throw authError;return{data:{session}};}},functions:{invoke:async(name,args)=>{calls.push({name,args});if(transportError)throw transportError;if(deferred)return new Promise((yes,no)=>{resolve=yes;reject=no;});return reply;}}};
 const handler=vm.runInNewContext(`(()=>{${helpers}\nreturn async(event)=>{${body}};})()`,{supabase:client,els:{status:note},document:{querySelector:()=>note},load:async()=>{loads++;if(loadError)throw loadError;},window:{}});
 return{note,button,calls,click:()=>handler({target:{closest:s=>s==='#check-pass'?button:null}}),finish:value=>resolve(value),fail:error=>reject(error),loads:()=>loads};
}
(async()=>{
 let n=0,f=fixture({transportError:Error('offline')});await assert.doesNotReject(f.click());assert.match(f.note.textContent,/Could not check Starlight Pass/);assert.equal(f.button.disabled,false);n++;
 f=fixture({authError:Error('session offline')});await assert.doesNotReject(f.click());assert.match(f.note.textContent,/Could not check Starlight Pass/);assert.equal(f.calls.length,0);assert.equal(f.button.disabled,false);n++;
 f=fixture({session:null});await f.click();assert.equal(f.note.textContent,'Sign in first.');assert.equal(f.calls.length,0);assert.equal(f.button.disabled,false);n++;
 f=fixture({session:{}});await f.click();assert.match(f.note.textContent,/Twitch did not keep a session token/);assert.equal(f.calls.length,0);assert.equal(f.button.disabled,false);n++;
 f=fixture({deferred:true});const first=f.click();await flush();assert.equal(f.button.disabled,true);await f.click();assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'refresh-pass');assert.equal(f.calls[0].args.body.accessToken,'fictional-token');f.finish({data:{active:true},error:null});await first;assert.equal(f.button.disabled,false);assert.equal(f.loads(),1);assert.equal(f.note.textContent,'Starlight Pass is active.');n++;
 f=fixture({reply:{data:null,error:{message:'non-2xx response',context:{json:async()=>({message:'Please reconnect Twitch.'})}}}});await f.click();assert.equal(f.note.textContent,'Please reconnect Twitch.');assert.equal(f.button.disabled,false);assert.equal(f.loads(),0);n++;
 f=fixture({reply:{data:null,error:{message:'non-2xx response'}}});await f.click();assert.match(f.note.textContent,/Could not check Starlight Pass/);assert.equal(f.button.disabled,false);n++;
 f=fixture({reply:{data:{active:false},error:null}});await f.click();assert.equal(f.note.textContent,'Twitch says you are not subscribed right now.');assert.equal(f.loads(),1);n++;
 f=fixture({deferred:true});const failed=f.click();await flush();f.fail(Error('offline'));await failed;const retry=f.click();await flush();assert.equal(f.calls.length,2);f.finish({data:{message:'Checked successfully.'},error:null});await retry;assert.equal(f.note.textContent,'Checked successfully.');assert.equal(f.button.disabled,false);n++;
 f=fixture({loadError:Error('catalog reload failed')});await f.click();assert.match(f.note.textContent,/Starlight Pass is active/);assert.match(f.note.textContent,/Mart could not refresh/);assert.equal(f.button.disabled,false);assert.equal(f.calls.length,1);n++;
 console.log(n+' LOCAL actual-source Mart Pass loading/error cases passed;no Auth/provider/network call');
})().catch(e=>{console.error(e);process.exitCode=1});
