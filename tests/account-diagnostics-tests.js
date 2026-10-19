const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const {createHandler,maskEmail}=await import(pathToFileURL(path.resolve('supabase/functions/owner-account-diagnostics/handler.mjs')));
 const target='aaaaaaaa-0000-4000-8000-000000000001';let reads=0,role='owner',signedIn=true;
 const handler=createHandler({revision:()=> 'synthetic-snapshot',caller:()=>({auth:{getUser:async()=>({data:{user:signedIn?{id:'owner'}:null}})},
 rpc:async(name,args)=>{assert.equal(name,'owner_account_diagnostics_context');assert.equal(args.p_user,target);
 return role==='owner'?{data:{targetUuid:target,passwordPresent:true,appConnections:[]}}:{error:{message:'private detail'}};}}),
 adminUser:async id=>{reads++;return {data:{user:{id,email:'private@example.invalid',email_confirmed_at:'2026-01-01',
 identities:[{provider:'twitch',identity_data:{email:'private@example.invalid'},access_token:'secret'}],
 encrypted_password:'never-return',user_metadata:{private:'secret'}}}};}});
 const request=(body={targetUuid:target},token=true,origin='https://play.sorastarlight.net',method='POST')=>new Request('https://fixture.invalid',{method,headers:{origin,...token?{authorization:'Bearer synthetic'}:{}},...method==='POST'?{body:JSON.stringify(body)}:{}});
 let count=0;
 for(const denied of ['', 'player','moderator','admin']){role=denied;assert.equal((await handler(request())).status,403);count++;}
 assert.equal(reads,0);signedIn=false;assert.equal((await handler(request())).status,401);signedIn=true;count++;
 assert.equal((await handler(request({},false))).status,401);assert.equal((await handler(request({targetUuid:'bad'}))).status,400);count++;
 assert.equal((await handler(request(undefined,true,'https://evil.invalid'))).status,403);assert.equal((await handler(request(undefined,true,undefined,'GET'))).status,405);assert.equal(reads,0);count++;
 role='owner';const response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const text=await response.text(),data=JSON.parse(text);assert.equal(data.maskedEmail,'p•••@•••');assert.equal(data.emailVerified,true);assert.deepEqual(data.authProviders,['twitch']);
 for(const secret of ['private@example','never-return','access_token','identity_data','user_metadata'])assert(!text.includes(secret));count++;
 assert.equal(maskEmail('not-email'),null);assert.equal(maskEmail(null),null);count++;
 const mismatch=createHandler({caller:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},rpc:async()=>({data:{targetUuid:'other'}})}),adminUser:()=>{throw Error('must not reach');}});
 assert.equal((await mismatch(request())).status,403);count++;
 // A pending response must not repopulate another trainer, or survive sign-out.
 const vm=require('node:vm'),fs=require('node:fs');const window={};
 vm.runInNewContext(fs.readFileSync('js/admin-next-diagnostics.js','utf8'),{window});
 function fixture(){const button={},status={};const host={isConnected:true,querySelector:s=>s==='button'?button:status};return {host,button,status,root:{querySelector:()=>host}};}
 let resolve;const first=fixture();window.PLAY_ADMIN_DIAGNOSTICS.mount(first.root,{id:target},'connections',()=>new Promise(r=>resolve=r));
 const pending=first.button.onclick();window.PLAY_ADMIN_DIAGNOSTICS.clear();resolve({data});await pending;
 assert.equal(first.status.textContent,'Inspecting…');count++;
 const second=fixture();window.PLAY_ADMIN_DIAGNOSTICS.mount(second.root,{id:target},'connections',async()=>({data:{...data,maskedEmail:'<script>bad</script>'}}));
 await second.button.onclick();assert(!second.status.innerHTML.includes('<script>'));assert(second.status.innerHTML.includes('&lt;script&gt;'));count++;
 console.log(`${count} synthetic account diagnostics checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1;});
