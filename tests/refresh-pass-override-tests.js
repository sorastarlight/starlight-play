const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('supabase/functions/refresh-pass/index.ts','utf8').replace(/^import .*;\r?\n/gm,'').replace('body: Record<string, unknown>','body').replace('active: boolean, source: string | null, message: string','active, source, message');
async function check({sub=200,stored=false,current=false,owner=false,token='token',fail=false,unauthorized=false}){
 let handler,writes=0;
 const chain=(table)=>{let update=false;const q={select(){return q},eq(){return q},order(){return q},limit(){return q},update(){update=true;writes++;return q},async single(){return {data:fail?null:{starlight_pass:stored},error:fail?{}:null}},async maybeSingle(){return {data:table==='site_config'?{twitch_client_id:'client',twitch_broadcaster_id:'channel',broadcaster_twitch_login:'owner'}:table==='profiles'?{twitch_login:owner?'owner':'trainer',starlight_pass:current}:{twitch_user_id:'trainer'}}}};return q};
 vm.runInNewContext(source,{Response,Date,Boolean,Deno:{env:{get:()=>''},serve:fn=>handler=fn},createClient:(_u,_k,opts)=>opts?{auth:{getUser:async()=>({data:{user:unauthorized?null:{id:'synthetic',identities:[]}},error:null})}}:{from:chain},fetch:async()=>({status:sub,ok:sub===200})});
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({accessToken:token})}));return {body:await response.json(),status:response.status,writes};
}
(async()=>{
 assert.equal((await check({stored:false})).body.active,false);
 assert.equal((await check({sub:404,stored:true})).body.active,true);
 assert.equal((await check({owner:true,stored:false})).body.active,false);
 const noToken=await check({token:'',current:true});assert.equal(noToken.body.active,true);assert.equal(noToken.writes,0);
 assert.equal((await check({sub:500,current:true})).body.active,true);
 assert.equal((await check({fail:true,current:true})).status,500);
 const denied=await check({unauthorized:true});assert.equal(denied.status,401);assert.equal(denied.writes,0);
 assert.equal((await check({stored:true})).body.active,true);
 console.log('8 refresh-pass mocked handler checks passed; no network or hosted writes');
})().catch(e=>{console.error(e);process.exitCode=1});
