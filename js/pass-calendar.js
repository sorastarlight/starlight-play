/* Render only server-recorded periods. Missing history never implies a missed reward. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_PASS_CALENDAR=api;})(globalThis,()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function html(wallet,active){
    const days=wallet?.passDays;
    if(!Array.isArray(days)||days.length!==7||Array.from(days).some(day=>!day||typeof day!=='object'||Array.isArray(day)))return '<p class="pass-history-note">Your weekly claim history is unavailable. Today’s supply is shown below.</p>';
    return '<ol class="pass-week" aria-label="Daily Pass supplies, Monday to Sunday">'+days.map((d,i)=>{
      const state=['ready','claimed','missed','unverified','upcoming'].includes(d.state)?d.state:'unverified';
      const date=new Date(d.start);const label=Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'}):'';
      const status={ready:active?'Ready':'Pass needed',claimed:'Claimed',missed:'Saved in My PC',unverified:d.today?'Check Pass':'Not verified',upcoming:'Upcoming'}[state];
      const action=state==='missed'?'<button type="button" data-pass-missed>Claim saved drop</button>':state==='ready'&&active?'<button id="claim-daily" class="pass-claim-btn" type="button">Claim</button>':'';
      return `<li class="pass-day is-${state}${d.today?' is-today':''}"${d.today?' aria-current="date"':''}><span class="pass-day-name">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span><small>${esc(label)}</small><span class="pass-day-icon" aria-hidden="true">${state==='claimed'?'✓':state==='missed'?'✦':state==='ready'?'★':'·'}</span><strong>${status}</strong>${action}</li>`;
    }).join('')+'</ol>';
  }
  return {html};
});
