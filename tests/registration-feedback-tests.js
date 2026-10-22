// Actual Auth helper and registration UI with SDK/DOM mocks only. No real signup/email.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function helper(outcome,availability={available:true}){
 const calls=[];const auth={getSession:async()=>({data:{session:null}}),signUp:async args=>{calls.push(args);if(outcome instanceof Error)throw outcome;return outcome;}};
 const root={PLAY_CONFIG:{supabaseUrl:'https://auth-fixture.invalid',supabaseKey:'fictional-public-key'},supabase:{createClient:()=>({auth})},location:{origin:'https://game-fixture.invalid',pathname:'/register.html'},playCall:async rpc=>{if(rpc==='play_username_available'){if(availability instanceof Error)throw availability;return availability;}return{};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/auth.js'),'utf8'),{window:root,URL});return{calls,register:()=>root.playRegisterTrainer({username:'fictional',email:'trainer@example.invalid',password:'fictional-password',confirm:'fictional-password'})};
}
function ui(){
 const calls=[],status={textContent:''},buttons=[{disabled:false},{disabled:true}],attrs={};let submit;
 const form={isConnected:true,querySelectorAll:()=>buttons,setAttribute:(k,v)=>attrs[k]=v,addEventListener:(event,fn)=>submit=fn,closest:()=>null};
 const nodes={'register-form':form,'register-status':status,'reg-username':{value:'fictional'},'reg-email':{value:'trainer@example.invalid'},'reg-password':{value:'fictional-password'},'reg-confirm':{value:'fictional-password'}};
 const root={playBindAccountNav(){},playSetAccountNav(){},playAuthNoise:()=>true,playSupabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}},playRegisterTrainer:args=>new Promise((resolve,reject)=>calls.push({args,resolve,reject}))};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/register.js'),'utf8'),{window:root,document:{getElementById:id=>nodes[id]}});
 return{calls,buttons,attrs,status,submit:()=>submit({preventDefault(){}})};
}
async function main(){let passed=0;const pass=s=>{passed++;console.log('PASS '+s);};
 for(const error of [{code:'over_email_send_rate_limit'},{code:'over_request_rate_limit'},{status:429}]){const f=helper({error});const r=await f.register();assert.equal(r.ok,false);assert.match(r.message,/wait/i);assert(!/different email/i.test(r.message));assert.equal(f.calls.length,1);pass('Throttle feedback asks user to wait without changing address or retrying');}
 let f=helper({error:{code:'weak_password'}}),r=await f.register();assert.match(r.message,/stronger password/);pass('Weak-password feedback remains actionable');
 f=helper({error:{status:500,message:'Fictional internal detail'}});r=await f.register();assert.match(r.message,/try again later/i);assert(!r.message.includes('internal detail'));pass('Unknown failure does not blame email address or expose SDK detail');
 f=helper(Error('fictional offline'));r=await f.register();assert.equal(r.ok,false);assert.match(r.message,/try again later/i);pass('Thrown SDK failure resolves to safe retry feedback');
 f=helper({data:{user:{id:'fictional'},session:null}},Error('offline'));r=await f.register();assert.equal(f.calls.length,0);assert.match(r.message,/check that username/);pass('Username lookup failure does not claim the name is taken');
 f=helper({data:{user:{id:'fictional'},session:null}},{available:false});r=await f.register();assert.equal(f.calls.length,0);assert.match(r.message,/not available/);pass('Confirmed unavailable username remains unchanged');
 f=helper({data:{user:{id:'fictional'},session:null}});r=await f.register();assert.equal(r.ok,true);assert.equal(r.verify,true);assert.equal(f.calls[0].options.emailRedirectTo,'https://game-fixture.invalid/signin.html');assert.equal(f.calls[0].options.data.username,'fictional');pass('Successful verification flow and signup payload/redirect are unchanged');
 let view=ui();const first=view.submit();await view.submit();assert.equal(view.calls.length,1);assert(view.buttons.every(b=>b.disabled));assert.equal(view.attrs['aria-busy'],'true');view.calls[0].resolve({ok:false,message:'Wait before trying again.'});await first;assert.equal(view.buttons[0].disabled,false);assert.equal(view.buttons[1].disabled,true);assert.equal(view.attrs['aria-busy'],'false');assert.match(view.status.textContent,/Wait/);pass('Duplicate submit is suppressed;failure restores previous control states');
 view=ui();const pending=view.submit();view.calls[0].reject(Error('Fictional raw failure'));await pending;assert.match(view.status.textContent,/try again later/i);assert(!view.status.textContent.includes('raw failure'));const retry=view.submit();assert.equal(view.calls.length,2);view.calls[1].resolve({ok:false,message:'retry result'});await retry;pass('Thrown UI action leaves form usable for an explicit manual retry');
 console.log(passed+' LOCAL actual-source mocked signup-feedback checks;no network,Auth user,email or credential mutation');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
