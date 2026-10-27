/* Render only server-recorded periods. Missing history never implies a missed reward. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_PASS_CALENDAR=api;})(globalThis,(root)=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSprite=v=>typeof v==='string'&&/^images\/[a-zA-Z0-9_./-]+\.(png|svg|webp)$/.test(v)&&!v.includes('..');
  function localTime(value,zone){const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...(zone?{timeZone:zone}:{})}):'';}
  function resets(wallet){const days=wallet?.passDays,today=days?.find(d=>d.today),first=days?.[0],plus=(v,n)=>{const d=new Date(v);return Number.isFinite(d.getTime())?new Date(d.getTime()+n*86400000).toISOString():null;};return {daily:localTime(plus(today?.start,1)),weekly:localTime(plus(first?.start,7))};}
  function item(reward){
    if(!reward||typeof reward.name!=='string')return '';
    const r=reward.secret===true?{name:'Secret Gift',sprite:'images/items/secret-gift.svg',description:'This gift is revealed when you collect it.'}:reward;
    const sprite=safeSprite(r.sprite)?r.sprite:'images/items/secret-gift.svg',qty=Number.isSafeInteger(r.quantity)&&r.quantity>0?r.quantity:null;
    return `<button type="button" class="calendar-item" data-calendar-reward="${esc(JSON.stringify({...r,sprite}))}" aria-label="View details: ${esc(r.name)}"><img src="${esc(sprite)}" alt=""><span>${qty?'×'+qty:''}</span><span class="calendar-item-name">${esc(r.name)}</span></button>`;
  }
  function detailsHtml(r){const name=typeof r?.name==='string'?r.name:'Item',key=typeof r?.itemKey==='string'&&/^[a-z][a-z0-9_]*$/.test(r.itemKey)?r.itemKey:null,description=r?.secret?'This gift is revealed when you collect it.':r?.description||(key?root.playItemPlayerText?.(key):null)||'Collect this supply to add it to your adventure.';return `<img class="calendar-detail-art" src="${esc(safeSprite(r?.sprite)?r.sprite:'images/items/secret-gift.svg')}" alt=""><h2>${esc(name)}</h2><p>${esc(description)}</p>${r?.quantity?`<p>Quantity: ${esc(r.quantity)}</p>`:''}<button type="button" data-calendar-close>Close</button>`;}
  function bind(doc){if(!doc||doc.__rewardCalendarBound)return;doc.__rewardCalendarBound=true;doc.addEventListener('click',event=>{const opener=event.target.closest?.('[data-calendar-reward]');if(!opener)return;let reward;try{reward=JSON.parse(opener.dataset.calendarReward);}catch(_){return;}const d=doc.createElement('dialog');d.className='calendar-item-dialog';d.setAttribute('aria-label','Item details');d.innerHTML=detailsHtml(reward);doc.body.append(d);d.querySelector('[data-calendar-close]').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});d.addEventListener('close',()=>{d.remove();if(opener.isConnected)opener.focus({preventScroll:true});});d.showModal();});}
  function html(wallet,active,options={}){
    const oak=options.scope==='oak',days=oak?wallet?.oakDays:wallet?.passDays;
    if(!Array.isArray(days)||days.length!==7||Array.from(days).some(day=>!day||typeof day!=='object'||Array.isArray(day)))return '<p class="pass-history-note">Your weekly claim history is unavailable. Today’s supply is shown below.</p>';
    return '<ol class="pass-week" aria-label="'+(oak?'Seven consecutive Oak check-ins':'Daily Pass supplies, Monday to Sunday')+'">'+days.map((d,i)=>{
      const state=['ready','claimed','missed','unverified','upcoming'].includes(d.state)?d.state:'unverified';
      const date=new Date(d.start);const label=Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'}):'';
      const status=oak?{ready:active?'Ready':'Not ready',claimed:'Collected',missed:'Missed',unverified:'Not collected',upcoming:'Upcoming'}[state]:{ready:active?'Ready':'Pass needed',claimed:'Claimed',missed:'Saved in My PC',unverified:d.today?'Check Pass':'Not verified',upcoming:'Upcoming'}[state];
      const action=!oak&&state==='missed'?'<button type="button" data-pass-missed>Claim saved drop</button>':!oak&&state==='ready'&&active?'<button id="claim-daily" class="pass-claim-btn" type="button">Claim</button>':'';
      const reward=d.reward;
      const icon=oak&&Array.isArray(d.rewards)?`<div class="calendar-supply-items">${d.rewards.map(item).join('')}</div><small class="calendar-coins">${Number(d.coins||0)} PokéCoins</small>${i===6?'<span class="calendar-streak-gift">+ Streak gift</span>':''}`:reward?item(reward):`<span class="pass-day-icon" aria-hidden="true">${state==='claimed'?'✓':oak&&i===6?'🎁':state==='missed'?'✦':state==='ready'?'★':'·'}</span>`;
      return `<li class="pass-day is-${state}${d.today?' is-today':''}"${d.today?' aria-current="date"':''}><span class="pass-day-name">${oak?'Day '+(i+1):['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span><small>${esc(label)}</small>${icon}<strong>${status}</strong>${action}</li>`;
    }).join('')+'</ol>';
  }
  bind(root.document);
  return {html,item,detailsHtml,localTime,resets,bind};
});
