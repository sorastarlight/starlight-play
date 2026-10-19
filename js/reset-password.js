(() => {
  const api=window.PLAY_RECOVERY,flow=window.PLAY_RECOVERY_INPUT;delete window.PLAY_RECOVERY_INPUT;
  const status=document.getElementById('recovery-status'),form=document.getElementById('recovery-form'),password=document.getElementById('new-password'),confirm=document.getElementById('confirm-password'),finish=document.getElementById('recovery-finish');
  let local;try{local=window.localStorage;}catch(_){}
  const key=api.authKey(window.PLAY_CONFIG.supabaseUrl),hasVerifier=api.recoveryVerifier(local,key);
  if(!flow||(!flow.code&&flow.type!=='recovery')||flow.error){history.replaceState(null,'',location.pathname);finish.hidden=false;status.textContent='Open the password-reset link from your email to choose a new password. If the link expired, request a new one.';return;}
  // A unique channel and memory-only session prevent recovery from signing another tab into Play.
  const storage=api.isolatedStorage(local,key);
  let client;try{client=window.supabase.createClient(window.PLAY_CONFIG.supabaseUrl,window.PLAY_CONFIG.supabaseKey,{auth:{storageKey:key+'-recovery-'+crypto.randomUUID(),storage,persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce'}});}catch(_){flow.code=flow.accessToken=flow.refreshToken=null;finish.hidden=false;status.textContent='Could not load password recovery. Please try again or request a new link.';return;}
  let controller,currentPhase;
  controller=api.createController({auth:client.auth,flow,hasVerifier,onState(state){currentPhase=state.phase;status.textContent=state.message;form.hidden=!['ready','saving'].includes(state.phase);form.querySelector('button').disabled=state.phase!=='ready';password.disabled=confirm.disabled=state.phase!=='ready';if(state.phase==='saving'||state.phase==='invalid'||state.phase==='done'){password.value='';confirm.value='';}finish.hidden=!['done','invalid'].includes(state.phase);if(state.phase==='invalid')storage.clear();}});
  form.addEventListener('submit',async event=>{event.preventDefault();await controller.submit(password.value,confirm.value);if(currentPhase==='done'||currentPhase==='invalid')storage.clear();});
  const storageChanged=event=>{if(api.appAccountChanged(event,key)){controller.invalidate();storage.clear();}};
  window.addEventListener('storage',storageChanged);
  window.addEventListener('pagehide',()=>{window.removeEventListener('storage',storageChanged);controller.dispose();storage.clear();});controller.start();
})();
