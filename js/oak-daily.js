/* Oak hosts the existing free daily supply. The server still controls eligibility and rewards. */
(function(root){
  function create({host,client,call,present=()=>{},toast=()=>{},label=k=>k,sprite=k=>k}){
    let epoch=0,user=null,busy=false,wallet=null,notice='',cooldownTimer=null;
    const readyNow=()=>wallet?.ownerRepeat===true
      ? (!wallet.ownerOakNextAt || Date.parse(wallet.ownerOakNextAt)<=Date.now())
      : wallet?.dailySupplyReady===true&&!wallet?.dailyClaimed;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function render(message){
      if(!host)return;
      if(message!==undefined)notice=message;
      const ready=readyNow(),p=wallet?.dailyPreview;
      const status=wallet?.dailyClaimed?'You’ve collected today’s gift.':wallet?'Your next gift is not ready yet.':'Checking your daily gift…';
      host.innerHTML=`<div><p class="oak-daily-eyebrow">A gift from Professor Oak</p><h2>Daily check-in</h2><p role="status">${esc(notice || (ready?'Good to see you! Take these supplies on your next adventure.':status))}</p>
        ${ready&&p?`<p class="oak-daily-rewards">${esc(label('pokeball'))} ×${Number(p.pokeball??3)} · ${esc(label(p.berry||'berry'))} ×${Number(p.berryQty??p.berryCount??1)} · ${Number(p.coins??40)} PokéCoins${['greatball','bait','razz','ultraball'].filter(k=>Number(p[k])>0).map(k=>' · '+esc(label(k))+' ×'+Number(p[k])).join('')}</p>`:''}
        <small>${wallet?.ownerRepeat?'Owner testing: you can collect again 30 seconds after each check-in.':'Free for every Trainer. Resets at midnight Eastern, with a cooldown between gifts.'}</small></div>
        <button type="button" data-oak-daily${!ready||busy?' disabled':''}>${busy?'Collecting…':ready?'Collect daily gift':wallet?.dailyClaimed?'Collected':'Not ready'}</button>`;
    }
    async function load(session){
      clearTimeout(cooldownTimer);
      const n=++epoch;user=session?.user?.id||null;wallet=null;notice='';if(host)host.hidden=!user;if(!user)return;render();
      try{const data=await call('play_store');if(n!==epoch)return;wallet=data.wallet;render();schedule();}catch(_){if(n===epoch)render('Your gift status could not load. Reopen the Lab to try again.');}
    }
    function schedule(){
      clearTimeout(cooldownTimer);
      const wait=Date.parse(wallet?.ownerOakNextAt)-Date.now(),n=epoch;
      if(wallet?.ownerRepeat&&Number.isFinite(wait)&&wait>0){cooldownTimer=setTimeout(()=>{if(n===epoch)render('Your next test gift is ready.');},Math.min(wait+100,2147483647));cooldownTimer?.unref?.();}
    }
    async function claim(){
      if(busy||!user||!readyNow())return;
      busy=true;const n=epoch,who=user;render();
      try{
        const auth=await client.auth.getUser();if(n!==epoch||auth.error||auth.data?.user?.id!==who)return;
        const result=await call('play_claim_daily_supply',{});
        const after=await client.auth.getUser();if(n!==epoch||after.error||after.data?.user?.id!==who)return;
        wallet={...wallet,dailySupplyReady:false,dailyClaimed:true,...(result.ownerRepeat?{ownerRepeat:true,ownerOakNextAt:result.nextClaimAt}: {})};render(result.ownerRepeat?'Gift collected! You can collect again in 30 seconds.':'Here you go! Come back for your next daily gift.');schedule();
        const rewards=Object.entries(result?.grants||{}).filter(([,v])=>Number(v)>0).map(([type,amount])=>({type,amount:Number(amount)}));
        try{present([{id:'oak-daily:'+who+':'+Date.now(),type:'item',kind:'supply-claim',tier:'card',title:'A gift from Professor Oak!',body:'Supplies for your next adventure. Anything that does not fit in your bag is saved in My PC.',rewards,source:'oak'}],{source:'oak',noSummary:true});}catch(_){}
        try{toast({kind:'success',title:'Daily gift collected',body:'Professor Oak’s supplies have arrived.'});}catch(_){}
      }catch(error){if(n===epoch){render('Could not collect your gift. Check your connection and try again.');toast({kind:'error',title:'Gift not collected',body:root.playRpcError?.(error,'Please try again.')||'Please try again.'});}}
      finally{busy=false;render();}
    }
    host?.addEventListener('click',e=>{if(e.target.closest('[data-oak-daily]'))claim();});
    return {load,claim};
  }
  root.PLAY_OAK_DAILY={create};if(typeof module==='object')module.exports={create};
  const host=root.document?.getElementById('oak-daily-gift'),client=root.playSupabase;
  if(host&&client){
    const controller=create({host,client,call:(...a)=>root.playCall(...a),present:(...a)=>root.playPresentEnqueue?.(...a),toast:o=>root.playToast?.(o),label:k=>root.playItemLabel?.(k)||k});
    let changed=false,lastId;
    // Keep this module's deduplication local; the Lab owns its page-level Auth listener.
    const accept=session=>{const id=session?.user?.id||null;if(id===lastId)return;lastId=id;controller.load(session);};
    client.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED'||event==='USER_UPDATED')return;changed=true;setTimeout(()=>accept(session),0);});
    client.auth.getSession().then(r=>{if(!changed)accept(r.data?.session);}).catch(()=>{host.hidden=true;});
  }
})(typeof window==='undefined'?globalThis:window);
