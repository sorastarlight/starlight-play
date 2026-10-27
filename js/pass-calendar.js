/* Render only server-recorded periods. Missing history never implies a missed reward. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_PASS_CALENDAR=api;})(globalThis,()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function html(wallet,active,options={}){
    const oak=options.scope==='oak',days=oak?wallet?.oakDays:wallet?.passDays;
    if(!Array.isArray(days)||days.length!==7||Array.from(days).some(day=>!day||typeof day!=='object'||Array.isArray(day)))return '<p class="pass-history-note">Your weekly claim history is unavailable. Today’s supply is shown below.</p>';
    return '<ol class="pass-week" aria-label="'+(oak?'Seven consecutive Oak check-ins':'Daily Pass supplies, Monday to Sunday')+'">'+days.map((d,i)=>{
      const state=['ready','claimed','missed','unverified','upcoming'].includes(d.state)?d.state:'unverified';
      const date=new Date(d.start);const label=Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'}):'';
      const status=oak?{ready:active?'Ready':'Not ready',claimed:'Collected',missed:'Missed',unverified:'Not collected',upcoming:'Upcoming'}[state]:{ready:active?'Ready':'Pass needed',claimed:'Claimed',missed:'Saved in My PC',unverified:d.today?'Check Pass':'Not verified',upcoming:'Upcoming'}[state];
      const action=!oak&&state==='missed'?'<button type="button" data-pass-missed>Claim saved drop</button>':!oak&&state==='ready'&&active?'<button id="claim-daily" class="pass-claim-btn" type="button">Claim</button>':'';
      const reward=d.reward,safeSprite=typeof reward?.sprite==='string'&&/^images\/[a-zA-Z0-9_./-]+\.(png|svg|webp)$/.test(reward.sprite)&&!reward.sprite.includes('..');
      const icon=reward?.secret===true?'<img class="pass-day-reward" src="images/items/secret-gift.svg" alt=""><span class="pass-day-reward-name">Secret Gift</span>':safeSprite&&typeof reward.name==='string'?`<img class="pass-day-reward" src="${esc(reward.sprite)}" alt=""><span class="pass-day-reward-name">${esc(reward.name)}</span>`:`<span class="pass-day-icon" aria-hidden="true">${state==='claimed'?'✓':oak&&i===6?'🎁':state==='missed'?'✦':state==='ready'?'★':'·'}</span>`;
      return `<li class="pass-day is-${state}${d.today?' is-today':''}"${d.today?' aria-current="date"':''}><span class="pass-day-name">${oak?'Day '+(i+1):['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span><small>${esc(label)}</small>${icon}<strong>${status}</strong>${action}</li>`;
    }).join('')+'</ol>';
  }
  return {html};
});
