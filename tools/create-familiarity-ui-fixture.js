// Local-only DOM fixture: real Pokédex markup/modules, fictional controllers.
// No Supabase SDK/config/Auth script is loaded; CSP blocks network connections.
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const cache=path.join(__dirname,'.cache');
const markup=fs.readFileSync(path.join(root,'pokedex.html'),'utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace('<html lang="en">','<html lang="en"><base href="/"><meta http-equiv="Content-Security-Policy" content="connect-src \'none\'">');
const bootstrap=`
const A='aaaaaaaa-0033-4033-8033-000000000033',B='bbbbbbbb-0033-4033-8033-000000000033';
let owner=A,authCallback=null;const params=new URLSearchParams(location.search);const mode=params.get('case')||'ready';const delay=Number(params.get('delay')||0);
window.fixtureCalls=[];window.fixtureErrors=[];
function log(){document.getElementById('qa-log').textContent=JSON.stringify({owner,calls:window.fixtureCalls,errors:window.fixtureErrors});}
window.addEventListener('error',e=>{window.fixtureErrors.push(e.message);log();});
window.playSupabase={auth:{getSession:async()=>({data:{session:owner?{user:{id:owner}}:null}}),onAuthStateChange:fn=>{authCallback=fn;}},from(table){const filters={};return {select(){return this;},eq(k,v){filters[k]=v;return this;},async maybeSingle(){if(table==='profiles')return {data:{display_name:'Fictional QA',twitch_login:'fixture'}};if(table!=='species_mastery_progress')throw Error('Unapproved fixture table '+table);window.fixtureCalls.push({table,filters});log();const response=mode==='empty'?{data:null}:mode==='error'?{error:Error('fixture diagnostic')}:{data:{dex:filters.dex,eligible_captures:filters.trainer_id===A?(filters.dex===25?3:6):20,tier_level:filters.trainer_id===A?(filters.dex===25?2:3):5,tier_name:filters.trainer_id===A?(filters.dex===25?'Acquainted':'Experienced'):'Expert'}};if(delay)await new Promise(r=>setTimeout(r,delay));return response;}};}};
window.playBindAccountNav=()=>{};window.playSetAccountNav=()=>{};window.playBindTeamSlots=()=>{};window.playAuthNoise=()=>false;
window.playSetLoadingGate=(gate,app)=>{gate.hidden=true;app.hidden=false;};window.playRestoreGate=(gate,message)=>{gate.hidden=false;gate.textContent=message;};
const catches=[{id:'fixture-mon',dex:1,formId:1,gender:'Male',variant:'normal',level:5},{id:'fixture-pika',dex:25,formId:25,gender:'Male',variant:'normal',level:5}];
window.playCall=async(name,args)=>{if(name==='play_state')return {};if(name==='play_collection')return {families:[{baseDex:1,candy:8}],mastery:[{dex:1,rank:2,points:250}]};if(name==='play_pokedex')return {seen:[1,25],caught:catches,team:[],seenCount:2,caughtCount:2};if(name==='play_pokedex_entry'){const dex=Number(args.p_dex);if(![1,25].includes(dex))return {unlocked:false};return {dex,name:dex===1?'Bulbasaur':'Pikachu',unlocked:true,caught:true,catches:catches.filter(c=>c.dex===dex),forms:[{formId:dex,isBase:true,formKey:'base',assetStatus:'ready'}],formSeen:[dex],types:dex===1?['Grass','Poison']:['Electric']};}throw Error('Blocked fixture RPC '+name);};
document.getElementById('qa-switch').onclick=()=>{owner=owner===A?B:A;log();authCallback?.('SIGNED_IN',{user:{id:owner}});};
document.getElementById('qa-signout').onclick=()=>{owner=null;log();authCallback?.('SIGNED_OUT',null);};log();
`;
const sources=['species','variants','forms','pokedex-reference','pokedex-presentation','pokedex-presentation-resolve','evolution-candy-png','game','nav'];
let html=markup.replace('</body>',`<aside style="position:fixed;z-index:999999;top:0;left:0;background:white;font:12px sans-serif;max-width:95vw"><b>LOCAL FICTIONAL QA</b> <button id="qa-switch">Switch fictional account</button><button id="qa-signout">Fictional sign out</button><details><summary>Fixture request log</summary><pre id="qa-log" style="max-width:90vw;white-space:pre-wrap"></pre></details></aside>${sources.map(s=>'<script charset="utf-8" src="/js/'+s+'.js"></script>').join('')}<script>${bootstrap}</script><script charset="utf-8" src="/js/species-familiarity.js"></script><script charset="utf-8" src="/js/pokedex.js"></script></body>`);
fs.mkdirSync(cache,{recursive:true});
fs.writeFileSync(path.join(cache,'familiarity-pokedex-qa.html'),html);
fs.writeFileSync(path.join(cache,'familiarity-pokedex-mobile-qa.html'),'<!doctype html><meta charset="utf-8"><title>390px Pokédex Familiarity QA</title><style>body{margin:0;background:#eee}iframe{display:block;width:390px;height:900px;border:0;margin:25px auto}</style><iframe title="390px Pokédex" src="/tools/.cache/familiarity-pokedex-qa.html?dex=1&tab=research"></iframe>');
console.log('Created isolated fixtures under tools/.cache; no hosted connection/config.');
