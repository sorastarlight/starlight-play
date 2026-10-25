(function(root){
 'use strict';
 let generation=0,dialog=null;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function clear(){generation++;if(dialog){dialog.close();dialog.remove();dialog=null;}}
 function message(state){return ({accepted:'Supabase accepted the recovery-email request. Delivery has not been confirmed.',
  failed:'The email service rejected the request. No delivery is confirmed.',
  uncertain:'The outcome is uncertain. Do not send again until the request has been investigated.',
  limited:'Recovery requests are limited. Try again later.',
  disabled:'Recovery email is awaiting email-template and delivery configuration verification.'})[state]||'Recovery unavailable. Refresh the account before trying again.';}
 function mount(host,user,transport){
  clear();const gen=generation;
  if(!host||!transport)return;
  host.innerHTML='<h4>Recovery email</h4><p>Owner access and a sign-in within five minutes are required. Email goes only to the account’s existing verified address.</p><button type="button">Review recovery email</button><p role="status" aria-live="polite"></p>';
  const button=host.querySelector('button'),status=host.querySelector('[role="status"]');
  button.onclick=async()=>{
   button.disabled=true;status.textContent='Preparing a secure confirmation…';
   try{
    const result=await transport({action:'prepare',targetUuid:user.id});
    if(gen!==generation||!host.isConnected)return;
    if(result.error||result.data?.error)throw Error();
    const data=result.data;
    if(data?.state!=='prepared'){status.textContent=message(data?.state);return;}
    if(data.targetUuid!==user.id||!data.challengeId||!data.snapshotRevision)throw Error();
    const requestUuid=crypto.randomUUID();
    dialog=document.createElement('dialog');const modal=dialog;modal.className='reward-dialog';modal.setAttribute('aria-label','Confirm recovery email');
    modal.innerHTML=`<form class="reward-review-form"><header><div><p class="eyebrow">Account support</p><h3>Request a recovery email</h3></div><button type="button" data-cancel>Cancel</button></header><div class="reward-review-hero"><strong>${esc(user.displayName||user.login||'Trainer')}</strong><span>${esc(data.maskedDestination)}</span></div><p>This sends a password-reset email. It does not change the password or sign staff in as this trainer. Acceptance does not confirm delivery.</p><label>Staff reason<textarea name="reason" rows="2" required minlength="3" maxlength="1000" placeholder="Why is this recovery email needed?"></textarea></label><label>Case reference (optional)<input name="caseRef" maxlength="100"></label><p class="record-note">The reason and outcome are kept for 90 days after completion. Unresolved sends stay until investigated. Do not enter passwords or private identity evidence.</p><p role="status" data-send-status></p><button class="reward-deliver" type="submit">Confirm and request email</button></form>`;
    document.body.append(modal);modal.showModal();
    let sending=false;
    modal.querySelector('[data-cancel]').onclick=()=>modal.close();
    modal.addEventListener('close',()=>{modal.remove();if(dialog===modal)dialog=null;if(button.isConnected)button.focus({preventScroll:true});},{once:true});
    modal.querySelector('form').onsubmit=async event=>{
     event.preventDefault();if(sending||gen!==generation)return;
     const form=event.target;if(!form.reportValidity())return;
     sending=true;form.querySelector('[type="submit"]').disabled=true;
     const body={action:'send',targetUuid:user.id,requestUuid,challengeId:data.challengeId,snapshotRevision:data.snapshotRevision,
      reason:form.elements.reason.value,caseRef:form.elements.caseRef.value};
     const outcome=modal.querySelector('[data-send-status]');outcome.textContent='Requesting email…';
     try{
      const sent=await transport(body);if(gen!==generation||!modal.isConnected)return;
      outcome.textContent=sent.error||sent.data?.error?'The outcome could not be confirmed. Refresh and investigate before sending again.':message(sent.data?.state);
     }catch{if(gen===generation&&modal.isConnected)outcome.textContent='The outcome could not be confirmed. Investigate before sending again.';}
     // A network timeout or uncertain result must never automatically resubmit.
    };
    status.textContent='Review the trainer and masked destination before confirming.';
   }catch{if(gen===generation&&host.isConnected)status.textContent='Owner access and a recent sign-in are required. Protected accounts cannot receive staff recovery emails.';}
   finally{if(gen===generation&&host.isConnected)button.disabled=false;}
  };
 }
 root.PLAY_ADMIN_RECOVERY_EMAIL={mount,clear,message};
})(window);
