const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const read=name=>fs.readFileSync('supabase/functions/refresh-pass/index.ts','utf8').replace(/^import .*;\r?\n/gm,'').replace('body: Record<string, unknown>','body').replace('active: boolean, source: string | null, message: string','active, source, message');
async function run(name,o={}){
 let handler,writes=[],calls=[];
 const user={id:'fictional-trainer',identities:[],user_metadata:{},...o.user};
 const connection=o.connection===undefined?{twitch_user_id:'222',twitch_login:'trainer'}:o.connection;
 const config={twitch_client_id:'client',twitch_broadcaster_id:'111',broadcaster_twitch_login:'channel',...o.config};
 const chain=table=>{const q={select(){return q},eq(){return q},order(){return q},limit(){return q},update(value){writes.push(value);return q},single:async()=>({data:o.saveFail?null:{starlight_pass:o.stored??writes.at(-1)?.starlight_pass},error:o.saveFail?{}:null}),maybeSingle:async()=>({data:table==='site_config'?config:table==='profiles'?{twitch_login:o.login??'trainer',starlight_pass:o.current||false}:connection,error:table===o.queryError?{}:null})};return q;};
 vm.runInNewContext(read(name),{Response,Date,Boolean,AbortSignal,Deno:{env:{get:()=>''},serve:f=>handler=f},createClient:(_u,_k,opts)=>opts?{auth:{getUser:async()=>({data:{user:o.noAuth?null:user},error:null})}}:{from:chain},fetch:async(url)=>{calls.push(url);if(o.network)throw Error('synthetic offline');if(url.includes('/validate'))return {ok:o.valid!==false,json:async()=>({client_id:o.tokenClient||'client',user_id:o.tokenUser||'222'})};if(url.includes('/users?'))return {ok:true,json:async()=>({data:[{id:'111'}]})};return {status:o.sub||200,ok:(o.sub||200)===200,json:async()=>({data:o.empty?[]:[{broadcaster_id:'111'}]})};}});
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({accessToken:o.token===undefined?'fictional-token':o.token})}));return {status:response.status,body:await response.json(),writes,calls};
}
(async()=>{let count=0;async function check(label,opts,verify){verify(await run('CANDIDATE.ts',opts));count++;console.log('PASS '+label);}
 const forged={login:'',connection:null,user:{user_metadata:{preferred_username:'channel',provider_id:'111'}},token:''};
 await check('metadata-only user denied',forged,r=>assert.equal(r.writes.length,0));
 await check('display login cannot grant broadcaster Pass',{login:'channel',token:''},r=>assert.equal(r.writes.length,0));
 await check('identity UUID alone cannot replace confirmed connection',{connection:null,user:{identities:[{provider:'twitch',id:'111'}]}},r=>assert.equal(r.writes.length,0));
 await check('trusted broadcaster ID preserves existing no-token benefit',{connection:{twitch_user_id:'111'},token:''},r=>{assert.equal(r.writes[0].pass_source,'broadcaster');assert.equal(r.calls.length,0)});
 await check('invalid connection numeric ID denied',{connection:{twitch_user_id:'not-numeric'}},r=>assert.equal(r.writes.length,0));
 await check('mismatched token user denied',{tokenUser:'333'},r=>assert.equal(r.writes.length,0));
 await check('mismatched token client denied',{tokenClient:'other'},r=>assert.equal(r.writes.length,0));
 await check('invalid token denied',{valid:false},r=>assert.equal(r.writes.length,0));
 await check('missing token leaves current Pass unchanged',{token:'',current:true},r=>{assert.equal(r.writes.length,0);assert.equal(r.body.active,true)});
 await check('valid subscription grants normally',{},r=>{assert.equal(r.writes[0].pass_source,'twitch-sub');assert.equal(r.body.active,true)});
 await check('confirmed non-subscriber clears normal state',{sub:404},r=>assert.equal(r.writes[0].starlight_pass,false));
 await check('staff forced-off reflected',{stored:false},r=>assert.equal(r.body.active,false));
 await check('staff forced-on reflected',{stored:true,sub:404},r=>assert.equal(r.body.active,true));
 await check('provider failure does not clear existing state',{sub:500,current:true},r=>{assert.equal(r.writes.length,0);assert.equal(r.body.active,true)});
 await check('empty provider response does not grant',{empty:true},r=>assert.equal(r.writes.length,0));
 await check('provider network error preserves Pass',{network:true,current:true},r=>{assert.equal(r.writes.length,0);assert.equal(r.body.active,true)});
 for(const queryError of ['site_config','profiles','twitch_connections'])await check('failed '+queryError+' read denies writes',{queryError},r=>assert.equal(r.writes.length,0));
 await check('missing channel ID resolved using validated token',{config:{twitch_broadcaster_id:''}},r=>assert.equal(r.writes[0].pass_source,'twitch-sub'));
 await check('failed save returns failure',{saveFail:true},r=>assert.equal(r.status,500));
 await check('unauthenticated denied',{noAuth:true},r=>{assert.equal(r.status,401);assert.equal(r.writes.length,0)});
 console.log(count+' LOCAL actual-handler identity checks pass;mocked network only');
})().catch(e=>{console.error(e);process.exitCode=1});