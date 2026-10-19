(function(root){
  'use strict';
  let generation=0;
  const esc=v=>String(v??'Unknown').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const yes=v=>v===true?'Yes':v===false?'No':'Unknown';
  function clear(){generation++;}
  function mount(container,user,pane,inspect){
    clear();
    const host=container.querySelector('[data-trainer-diagnostics]');
    if(pane!=='connections'||!host)return;
    const gen=generation;
    host.innerHTML='<h4>Account support · owner only</h4><p>Inspect masked sign-in details without changing this account.</p><button type="button">Inspect sign-in methods</button><div role="status" aria-live="polite"></div>';
    const button=host.querySelector('button'),status=host.querySelector('[role="status"]');
    button.onclick=async()=>{
      button.disabled=true;status.textContent='Inspecting…';
      try{
        const result=await inspect(user.id);
        if(gen!==generation||!host.isConnected)return;
        const data=result?.data;
        if(result?.error||!data||data.error||data.targetUuid!==user.id)throw Error();
        status.innerHTML=`<dl class="record-diagnostics"><dt>Email</dt><dd>${esc(data.maskedEmail||'Not recorded')}</dd><dt>Email verified</dt><dd>${yes(data.emailVerified)}</dd><dt>Password present</dt><dd>${yes(data.passwordPresent)}</dd><dt>Auth sign-in providers</dt><dd>${esc(Array.isArray(data.authProviders)?data.authProviders.join(', ')||'None recorded':'Unknown')}</dd><dt>Observed</dt><dd>${esc(data.observedAt)}</dd></dl><p>${esc(data.remainingRoutes)}</p><p>Twitch app connections shown above are separate from Auth sign-in identities. This inspection does not establish that an identity is safe to unlink.</p>`;
        button.textContent='Refresh inspection';
      }catch{
        if(gen!==generation||!host.isConnected)return;
        status.textContent='Inspection unavailable. Owner access is required; protected accounts cannot be inspected here.';
      }finally{if(gen===generation&&host.isConnected)button.disabled=false;}
    };
  }
  root.PLAY_ADMIN_DIAGNOSTICS={mount,clear};
})(window);
