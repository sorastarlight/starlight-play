const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
async function check(name,{user,staff,error=null}){
 const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/'+name+'/index.ts','utf8').replace(/^import .*;\r?\n/gm,''),{mode:'strip'});
 let handler,adminClients=0,networkCalls=0,permissionChecks=0;
 vm.runInNewContext(code,{Response,Headers,URLSearchParams,setTimeout,Deno:{env:{get:()=>''},serve:fn=>handler=fn},createClient:(_url,_key,options)=>{if(!options){adminClients++;throw Error('Privileged client reached');}return {auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name)=>{assert.equal(name,'is_play_admin');permissionChecks++;return {data:staff,error};}}},fetch:async()=>{networkCalls++;throw Error('Unexpected network');}});
 const response=await handler(new Request('https://fictional.invalid',{method:'POST',body:JSON.stringify({action:'connect',accessToken:'fictional-only'})}));
 assert.equal(response.status,user?403:401);assert.equal(adminClients,0);assert.equal(networkCalls,0);assert.equal(permissionChecks,user?1:0);
}
(async()=>{let count=0;for(const name of ['bits-connect','twitch-ads'])for(const entry of [
 {label:'no session',user:null,staff:true},
 {label:'ordinary trainer',user:{id:'fictional'},staff:false},
 {label:'nullable staff result',user:{id:'fictional'},staff:null},
 {label:'permission lookup error',user:{id:'fictional'},staff:null,error:{message:'fictional'}},
 {label:'editable metadata cannot replace staff authorization',user:{id:'fictional',user_metadata:{role:'owner',is_admin:true}},staff:false}
 ]){await check(name,entry);count++;console.log('PASS '+name+' rejects '+entry.label+' before privileged client/network');}console.log(count+' LOCAL actual Edge handler denial cases;no network,secret read or hosted invocation');})().catch(error=>{console.error(error);process.exitCode=1});
