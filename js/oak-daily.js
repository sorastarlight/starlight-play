/* Oak hosts the existing free daily supply. The server still controls eligibility and rewards. */
(function(root){
  function create({host,client,call,present=()=>{},toast=()=>{},label=k=>k,sprite=k=>k}){
    let epoch=0,user=null,busy=false,wallet=null,notice='',cooldownTimer=null,giftDialog=null,giftRequest=null;
    const readyNow=()=>wallet?.ownerRepeat===true
      ? (!wallet.ownerOakNextAt || Date.parse(wallet.ownerOakNextAt)<=Date.now())
      : wallet?.dailySupplyReady===true&&!wallet?.dailyClaimed;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function render(message){
      if(!host)return;
      if(message!==undefined)notice=message;
      if(giftDialog?.open)return;
      const ready=readyNow(),p=wallet?.dailyPreview;
      const status=wallet?.dailyClaimed?'Today’s gift collected.':wallet?'Your next gift is not ready yet.':'Checking your daily gift…';
      const reset=root.PLAY_PASS_CALENDAR?.localTime?.(wallet?.oakResetAt,wallet?.rewardTimezone||wallet?.rewardOakTimezone);
      const todayLabel=root.PLAY_REWARD_TIMEZONE?.dayLabel(wallet)||new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
      const beforeStreak=wallet?.oakNotStarted&&!(Array.isArray(wallet?.oakDays)&&wallet.oakDays.some(d=>d.today));
      const currentGift=beforeStreak?`<p class="oak-current-gift"><strong>Today · ${esc(todayLabel)}</strong> — Seven-day streak rewards start ${esc(wallet.oakStartsOn)}.</p>`:'';
      host.innerHTML=`<div class="oak-pass-card"><header class="oak-pass-heading"><div><p class="oak-daily-eyebrow">Professor Oak’s Lab</p><h2>Daily check-in</h2></div><strong class="oak-streak-count">${Math.min(7,Math.max(0,Number(wallet?.oakStreak)||0))} / 7 days</strong></header>
        ${currentGift}${Array.isArray(wallet?.oakDays)?`<div class="oak-checkin-calendar">${root.PLAY_PASS_CALENDAR?.html(wallet,ready,{scope:'oak'})||''}</div>`:''}
        <div class="oak-today"><div><h3>Today’s supplies <small>${esc(todayLabel)}</small></h3>${p?`<div class="oak-daily-rewards"><span><img src="${esc(sprite('pokeball'))}" alt="">${esc(label('pokeball'))} ×${Number(p.pokeball??3)}</span><span><img src="${esc(sprite(p.berry||'berry'))}" alt="">${esc(p.randomBerry?'Random common Berry':label(p.berry||'berry'))} ×${Number(p.berryQty??p.berryCount??1)}</span><span>${Number(p.coins??40)} PokéCoins</span>${['greatball','bait','razz','ultraball'].filter(k=>Number(p[k])>0).map(k=>'<span>'+esc(label(k))+' ×'+Number(p[k])+'</span>').join('')}</div>`:''}<p class="oak-claim-status" role="status">${esc(notice||(ready?'Ready for your next adventure.':status))}</p></div><button type="button" data-oak-daily${!ready||busy?' disabled':''}>${busy?'Collecting…':ready?'Collect daily gift':wallet?.dailyClaimed?'Collected':'Not ready'}</button></div>
        <div class="oak-streak-prize"><span>${wallet?.oakRewardsPaused?'New streak gifts are paused. Earned gifts remain available.':'Complete all seven days to earn an Evolution Candy Gift Box for a Pokémon of your choice, 150 PokéCoins, an Evolution Stone, and a rare Poké Ball!'}</span>${wallet?.oakGift?'<button type="button" data-oak-completion>Choose your Candy gift</button>':''}</div>
        ${root.PLAY_REWARD_TIMEZONE?.note(wallet)||''}${root.PLAY_REWARD_TIMEZONE?.timer(wallet?.oakResetAt,wallet)||''}<small class="oak-reset-note">${reset?'Next daily reset: '+esc(reset)+'. Times '+(wallet?.rewardTimezone?'follow your saved reward time zone.':'are local to your device.'):'Daily reset: midnight Eastern.'} A missed day restarts your streak.${wallet?.oakNotStarted?' Streak rewards begin '+esc(wallet.oakStartsOn)+'.':''}${wallet?.ownerRepeat?' Owner testing: collect every 30 seconds; repeats count once per day.':''}</small></div>`;
    }
    async function load(session){
      clearTimeout(cooldownTimer);
      giftDialog?.close?.();giftDialog?.remove?.();giftDialog=null;giftRequest=null;
      const n=++epoch;user=session?.user?.id||null;wallet=null;notice='';busy=false;if(host)host.hidden=!user;if(!user)return;render();
      try{await root.PLAY_REWARD_TIMEZONE?.ensure(user);if(n!==epoch)return;const data=await call('play_oak_checkin_state');if(n!==epoch)return;wallet=data.wallet;render();schedule();}catch(_){if(n===epoch)render('Your gift status could not load. Reopen the Lab to try again.');}
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
        wallet={...wallet,dailySupplyReady:false,dailyClaimed:true,...result.oakCheckin,...(result.ownerRepeat?{ownerRepeat:true,ownerOakNextAt:result.nextClaimAt}: {})};render(result.ownerRepeat?'Gift collected! You can collect again in 30 seconds.':'Here you go! Come back for your next daily gift.');schedule();
        const rewards=Object.entries(result?.grants||{}).filter(([,v])=>Number(v)>0).map(([type,amount])=>({type,amount:Number(amount)}));
        const stored=Object.values(result.delivery?.stored||{}).some(v=>Number(v)>0);
        try{present([{id:result.receiptId||'oak-daily:'+who+':'+Date.now(),type:'item',kind:'supply-claim',tier:'card',title:'A gift from Professor Oak!',body:stored?'Your item supplies are saved in My PC. Transfer them to Your Bag when you have room.':'Your item supplies have arrived in Your Bag.',rewards,source:'oak'}],{source:'oak',noSummary:true});}catch(_){}
        try{toast({kind:'success',title:'Daily gift collected',body:'Professor Oak’s supplies have arrived.'});}catch(_){}
      }catch(error){if(n===epoch){render('Could not collect your gift. Check your connection and try again.');toast({kind:'error',title:'Gift not collected',body:root.playRpcError?.(error,'Please try again.')||'Please try again.'});}}
      finally{if(n===epoch){busy=false;render();}}
    }
    function chooseGift(){
      const gift=wallet?.oakGift;
      if(!gift||busy||giftDialog||!root.document)return;
      const who=user,n=epoch,choices=Array.isArray(gift.choices)?gift.choices:[],d=root.document.createElement('dialog');giftDialog=d;
      d.className='oak-candy-dialog';d.setAttribute('aria-label','Choose your Evolution Candy');
      d.innerHTML=`<h2>Seven days with Professor Oak!</h2><p>Choose one Pokémon’s Evolution Candy. You’ll receive ${Number(gift.candyQuantity)} Candy for its evolution family.</p><label>Evolution Candy<select data-oak-family><option value="">Choose your Candy</option>${choices.filter(c=>Number.isSafeInteger(c.familyId)).map(c=>`<option value="${c.familyId}">${esc(c.name)}</option>`).join('')}</select></label><p>You also receive ${Object.entries(gift.items||{}).map(([k,v])=>esc(k==='coins'?'PokéCoins':label(k))+' ×'+Number(v)).join(', ')}.</p><p role="status" data-oak-gift-status></p><div class="mart-actions"><button type="button" data-oak-gift-close>Choose later</button><button type="button" data-oak-gift-claim disabled>Collect seven-day gift</button></div>`;
      const select=d.querySelector('[data-oak-family]'),confirm=d.querySelector('[data-oak-gift-claim]'),status=d.querySelector('[data-oak-gift-status]'),close=d.querySelector('[data-oak-gift-close]');
      if(giftRequest){select.value=String(giftRequest.p_family);select.disabled=true;confirm.disabled=false;}
      select.onchange=()=>{confirm.disabled=!choices.some(c=>c.familyId===Number(select.value));};
      close.onclick=()=>{if(!busy)d.close();};d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
      d.addEventListener('close',()=>{d.remove();if(giftDialog===d)giftDialog=null;if(n===epoch){render();const target=host.querySelector('[data-oak-completion]')||host.querySelector('h2');if(target){if(target.tagName==='H2')target.tabIndex=-1;target.focus?.();}}});
      d.addEventListener('click',e=>{if(e.target!==d||busy)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
      confirm.onclick=async()=>{
        const family=Number(select.value);if(busy||n!==epoch||who!==user||!choices.some(c=>c.familyId===family))return;
        busy=true;select.disabled=true;confirm.disabled=true;close.disabled=true;status.textContent='Collecting your seven-day gift…';
        if(!giftRequest)giftRequest={p_request:root.crypto.randomUUID(),p_completed:gift.completedOn,p_family:family};
        try{
          const auth=await client.auth.getUser();if(n!==epoch||auth.error||auth.data?.user?.id!==who)return;
          const result=await call('play_claim_oak_completion',giftRequest);
          if(result?.ok!==true||result.candyFamily!==family||result.candyQuantity!==Number(gift.candyQuantity)||typeof result.receiptId!=='string'||!result.receiptId)throw Error('Your gift receipt could not be confirmed. Retry the same choice.');
          const after=await client.auth.getUser();if(n!==epoch||after.error||after.data?.user?.id!==who)return;
          wallet={...wallet,...result.oakCheckin};giftRequest=null;d.close();render('Your seven-day gift is ready for your next adventure!');
          const rewards=Object.entries(result.grants||{}).filter(([,v])=>Number(v)>0).map(([type,amount])=>({type,amount:Number(amount)}));rewards.push({type:'candy',name:choices.find(c=>c.familyId===family)?.name||'Evolution Candy',sprite:choices.find(c=>c.familyId===family)?.sprite,label:'+'+Number(result.candyQuantity)+' '+(choices.find(c=>c.familyId===family)?.name||'Evolution Candy'),amount:Number(result.candyQuantity)});
          const stored=Object.values(result.delivery?.stored||{}).some(v=>Number(v)>0);
          try{present([{id:result.receiptId,type:'item',kind:'supply-claim',tier:'card',title:'Professor Oak’s special gift!',body:stored?'Your Candy and PokéCoins have arrived. Your item supplies are saved in My PC.':'Your Candy and PokéCoins have arrived. Your item supplies are in Your Bag.',rewards,source:'oak'}],{source:'oak',noSummary:true});}catch(_){}
          toast({kind:'success',title:'Seven-day gift collected',body:'Your Candy and supplies have arrived.'});
        }catch(error){if(n===epoch){status.textContent=root.playRpcError?.(error,'Could not confirm your gift. Retry this same choice or reopen the Lab to check it.')||'Could not confirm your gift. Retry this same choice or reopen the Lab to check it.';confirm.disabled=false;close.disabled=false;}}
        finally{if(n===epoch)busy=false;}
      };
      host.append(d);d.showModal();select.focus();
    }
    host?.addEventListener('click',e=>{if(e.target.closest('[data-oak-daily]'))claim();if(e.target.closest('[data-oak-completion]'))chooseGift();});
    return {load,claim};
  }
  root.PLAY_OAK_DAILY={create};if(typeof module==='object')module.exports={create};
  const host=root.document?.getElementById('oak-daily-gift'),client=root.playSupabase;
  if(host&&client){
    const controller=create({host,client,call:(...a)=>root.playCall(...a),present:(...a)=>root.playPresentEnqueue?.(...a),toast:o=>root.playToast?.(o),label:k=>root.playItemLabel?.(k)||k,sprite:k=>root.playItemSprite?.(k)||'images/items/secret-gift.svg'});
    let changed=false,lastId;
    // Keep this module's deduplication local; the Lab owns its page-level Auth listener.
    const accept=session=>{const id=session?.user?.id||null;if(id===lastId)return;lastId=id;controller.load(session);};
    client.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED'||event==='USER_UPDATED')return;changed=true;setTimeout(()=>accept(session),0);});
    client.auth.getSession().then(r=>{if(!changed)accept(r.data?.session);}).catch(()=>{host.hidden=true;});
  }
})(typeof window==='undefined'?globalThis:window);
