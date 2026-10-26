(function(root){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function html(data,sprite=()=> ''){
  const chance=Number(data?.dropChance),items=Array.isArray(data?.items)?data.items:[];
  return `<header class="catch-rewards-head"><div><h2>Catch rewards</h2><p>${Number.isFinite(chance)?`${Math.round(chance*100)}% item-drop chance after a successful catch with a berry.`:'Berry bonuses are awarded after successful catches.'}</p></div><button type="button" class="secondary" data-rewards-refresh>Refresh</button></header><p data-rewards-status role="status" tabindex="-1">${items.length?'These items are saved for you. Make room in your bag to collect them.':'No rewards waiting to be collected.'}</p><div class="catch-rewards-list">${items.map(item=>`<article><img src="${esc(sprite(item.item))}" alt="" width="40" height="40"><div><strong>${esc(item.label)} ×1</strong><small>${esc(item.pokemon)} · ${item.outcome==='miss'?'Missed-throw reward':'Berry bonus'}</small></div><button type="button" data-reward-claim="${esc(item.id)}">Collect</button></article>`).join('')}</div>`;
 }
 function create(element,{client,call,onClaim}){
  if(!element)return{reset(){},load(){}};
  let epoch=0,uid=null,busy=false;
  function reset(){epoch++;uid=null;busy=false;element.hidden=true;element.innerHTML='';}
  async function request(name,args,g,id){
   const before=await client.auth.getSession();if(g!==epoch||before.data?.session?.user?.id!==id)throw Error('Account changed');
   const result=await call(name,args);
   const after=await client.auth.getSession();if(g!==epoch||after.data?.session?.user?.id!==id)throw Error('Account changed');
   if(!result?.ok)throw Error('Unavailable');return result;
  }
  async function load(id){
   const g=++epoch;uid=id;busy=false;element.hidden=false;element.innerHTML='<p role="status">Loading catch rewards…</p>';
   try{const data=await request('play_pending_catch_rewards',{},g,id);if(g!==epoch)return;element.innerHTML=html(data,root.playItemSprite);}
   catch(_){if(g===epoch)element.innerHTML='<p role="status">Catch rewards could not load.</p><button type="button" data-rewards-refresh>Try again</button>';}
  }
  element.addEventListener('click',async event=>{
   if(busy||!uid)return;
   if(event.target.closest('[data-rewards-refresh]')){await load(uid);return;}
   const button=event.target.closest('[data-reward-claim]');if(!button)return;
   busy=true;const g=epoch,id=uid;for(const b of element.querySelectorAll('button'))b.disabled=true;
   try{const result=await request('play_claim_catch_reward',{p_id:button.dataset.rewardClaim},g,id);if(g!==epoch)return;
    if(result.status==='delivered'){root.dispatchEvent?.(new Event('play-notifications-changed'));await onClaim();}
    else{element.querySelector('[data-rewards-status]').textContent='Your bag is full. Use or sell an item, then collect this reward.';}
   }catch(_){if(g===epoch)element.querySelector('[data-rewards-status]').textContent='The result could not be confirmed. Refresh rewards to check before trying again.';}
   finally{if(g===epoch){busy=false;for(const b of element.querySelectorAll('button'))b.disabled=false;}}
  });
  return{reset,load};
 }
 const api={html,create};if(typeof module!=='undefined')module.exports=api;else root.PLAY_CATCH_REWARDS=api;
})(typeof window==='undefined'?{}:window);
