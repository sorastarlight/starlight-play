/* Shared reward editor model. No transport or grants: server validation remains authoritative. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_REWARD_CATALOG=api;})(typeof globalThis==='undefined'?this:globalThis,()=>{
'use strict';
const kinds=new Set(['item','candy','pokemon','coins','space']);
const normalize=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function catalog(rows,context="pass"){
 if(!["pass","shop","staff"].includes(context))throw Error("Unknown reward use.");
 if(!Array.isArray(rows))throw Error('Reward catalog unavailable.');
 const seen=new Set();
 return rows.map(r=>{
  if(!r||!kinds.has(r.kind)||typeof r.id!=='string'||!r.id||seen.has(r.id)||typeof r.name!=='string'||!r.name.trim()||typeof r.category!=='string'||typeof r.enabled!=='boolean')throw Error('Reward catalog is incomplete.');
  if(!/^images\/[a-zA-Z0-9_./-]+\.(png|webp|svg)$/.test(r.sprite||'')||r.sprite.includes('..'))throw Error('Reward image unavailable.');
  if(!integer(r.maxQuantity,1,2147483647))throw Error('Reward limit unavailable.');
  seen.add(r.id);return Object.freeze({id:r.id,kind:r.kind,name:r.name,category:r.category,sprite:r.sprite,enabled:r.enabled&&!(context==='shop'&&r.id==='item:masterball'),maxQuantity:r.maxQuantity,unavailableReason:context==='shop'&&r.id==='item:masterball'?'Staff gifts and Pass rewards only':r.enabled?'':String(r.unavailableReason||'Not available yet')});
 });
}
function search(rows,query='',category=''){
 const words=normalize(query).split(/\s+/).filter(Boolean);
 return rows.filter(r=>(!category||r.category===category)&&words.every(w=>normalize(r.name+' '+r.category).includes(w)));
}
function reward(input,rows){
 if(!input||Object.keys(input).some(k=>!['catalogId','quantity','secret','level','shiny'].includes(k)))throw Error('Review the reward details.');
 const r=rows.find(r=>r.id===input.catalogId);
 if(!r?.enabled)throw Error('This reward is not available.');
 if(!integer(input.quantity,1,r.maxQuantity)||typeof input.secret!=='boolean')throw Error('Choose a valid quantity and Secret Gift setting.');
 const result={catalogId:r.id,quantity:input.quantity,secret:input.secret};
 if(r.kind==='pokemon'){
  if(!integer(input.level,1,100)||typeof input.shiny!=='boolean')throw Error('Choose a Pokémon level and appearance.');
  result.level=input.level;result.shiny=input.shiny;
 }else if(input.level!==undefined||input.shiny!==undefined)throw Error('Only Pokémon have level and appearance settings.');
 return result;
}
function bundle(entries,rows){
 if(!Array.isArray(entries)||!entries.length||entries.length>100)throw Error('Choose between 1 and 100 rewards.');
 const rewards=entries.map(e=>reward(e,rows)),totals=new Map();let pokemon=0;
 for(const entry of rewards){const row=rows.find(r=>r.id===entry.catalogId),total=(totals.get(row.id)||0)+entry.quantity;totals.set(row.id,total);if(total>row.maxQuantity)throw Error('Combined quantity exceeds this reward limit.');if(row.kind==='pokemon')pokemon+=entry.quantity;}
 if(pokemon>100)throw Error('A bundle can contain at most 100 Pokémon.');
 return {version:2,rewards};
}
// The server must produce the same concealed projection BEFORE sending player data.
// This helper is a preview, not a security boundary or delivery implementation.
function preview(entry,rows,player=false){
 const valid=reward(entry,rows),r=rows.find(r=>r.id===valid.catalogId);
 if(player&&valid.secret)return{name:'Secret Gift',sprite:'images/items/secret-gift.svg',secret:true};
 return {name:r.name,sprite:r.sprite,quantity:valid.quantity,secret:valid.secret,...(r.kind==='pokemon'?{level:valid.level,shiny:valid.shiny}:{})};
}
return {catalog,search,reward,bundle,preview};
});
