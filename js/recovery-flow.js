/* Password-recovery routing and state machine. No game RPCs or persistent sessions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.PLAY_RECOVERY=api;if(root.document.documentElement.dataset.recoveryRoute==='signin')api.routeSignIn(root);if(root.document.documentElement.dataset.recoveryPage==='true'){root.PLAY_RECOVERY_INPUT=api.readInput(root.location.href);root.history.replaceState(null,'',root.location.pathname);}}})(typeof window!=='undefined'?window:globalThis,function(){
  function readInput(url){const parsed=new URL(url),hash=new URLSearchParams(parsed.hash.slice(1));return {code:parsed.searchParams.get('code'),type:hash.get('type')||parsed.searchParams.get('type'),accessToken:hash.get('access_token'),refreshToken:hash.get('refresh_token'),error:Boolean(hash.get('error')||parsed.searchParams.get('error'))};}
  function authKey(url){return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;}
  function recoveryVerifier(storage,key){try{const raw=storage.getItem(key+'-code-verifier');return typeof JSON.parse(raw)==='string'&&JSON.parse(raw).endsWith('/PASSWORD_RECOVERY');}catch(_){return false;}}
  function routeSignIn(win){
    const flow=readInput(win.location.href),key=authKey(win.PLAY_CONFIG.supabaseUrl);let raw,local;
    try{local=win.localStorage;raw=local.getItem(key+'-code-verifier');}catch(_){}
    if(flow.type!=='recovery'&&!(flow.code&&(!raw||recoveryVerifier(local,key)))&&!(flow.error&&recoveryVerifier(local,key)))return false;
    const target=new URL('./reset-password.html',win.location.href);target.search=new URL(win.location.href).search;target.hash=new URL(win.location.href).hash;
    win.PLAY_RECOVERY_REDIRECTING=true;win.history.replaceState(null,'',win.location.pathname);win.location.replace(target.href);return true;
  }
  function isolatedStorage(local,key){const memory=new Map();return {getItem(name){if(name.endsWith('-code-verifier')){try{return local.getItem(key+'-code-verifier');}catch(_){return null;}}return memory.get(name)||null;},setItem(name,value){memory.set(name,value);},removeItem(name){if(name.endsWith('-code-verifier')){try{local.removeItem(key+'-code-verifier');}catch(_){}}memory.delete(name);},clear(){memory.clear();}};}
  function appAccountChanged(event,key){
    if(event.key!==key||event.oldValue===event.newValue)return false;
    try{const before=JSON.parse(event.oldValue),after=JSON.parse(event.newValue);if(before?.user?.id&&before.user.id===after?.user?.id)return false;}catch(_){}
    return true;
  }
  function createController({auth,flow,hasVerifier,onState,now=()=>Date.now()}){
    let phase='checking',expected=null,expires=0,epoch=0;
    const emit=(next,message)=>{phase=next;onState({phase,message});};
    const invalid=()=>{if(phase==='done')return;epoch++;expected=null;emit('invalid','This recovery link cannot be used. Open it in the browser where you requested it, or request a new link.');};
    const subscription=auth.onAuthStateChange?.((event,session)=>{if(phase==='done')return;if(event==='SIGNED_OUT'||(expected&&session?.user?.id&&session.user.id!==expected))invalid();})?.data?.subscription;
    async function start(){
      const run=++epoch;emit('checking','Checking your recovery link…');
      try{
        if(flow.error)throw new Error('invalid');
        let result;
        if(flow.code&&hasVerifier)result=await auth.exchangeCodeForSession(flow.code);
        else throw new Error('invalid');
        if(run!==epoch)return;
        if(result.error||!result.data?.session?.user?.id)throw new Error('invalid');
        const verified=await auth.getUser();if(run!==epoch)return;
        if(verified.error||verified.data?.user?.id!==result.data.session.user.id)throw new Error('invalid');
        expires=Number(result.data.session.expires_at)*1000;if(!Number.isFinite(expires)||expires<=now())throw new Error('expired');
        expected=verified.data.user.id;emit('ready','Choose a new password for your Trainer Account.');
      }catch(_){if(run===epoch)invalid();}
      finally{flow.code=null;flow.accessToken=null;flow.refreshToken=null;}
    }
    async function submit(password,confirm){
      if(phase!=='ready')return;
      if(password.length<8){emit('ready','Use at least 8 characters.');return;}
      if(password!==confirm){emit('ready','Passwords do not match.');return;}
      if(now()>=expires){invalid();return;}
      const run=epoch;emit('saving','Updating your password…');
      try{
        const checked=await auth.getUser();if(run!==epoch)return;
        if(checked.error||checked.data?.user?.id!==expected||now()>=expires){invalid();return;}
        const result=await auth.updateUser({password});if(run!==epoch)return;
        if(result.error){if(['weak_password','same_password'].includes(result.error.code)){emit('ready',result.error.code==='same_password'?'Choose a different password.':'Choose a stronger password and try again.');return;}throw new Error('unconfirmed');}
        emit('done','Password updated. Sign in with your new password.');expected=null;subscription?.unsubscribe();
        try{await auth.signOut({scope:'local'});}catch(_){}
      }catch(_){if(run===epoch){epoch++;expected=null;emit('invalid','We could not confirm the password update. Try signing in with your new password, or request another reset link.');}}
    }
    return {start,submit,invalidate:invalid,dispose(){epoch++;expected=null;subscription?.unsubscribe();auth.stopAutoRefresh?.();}};
  }
  return {readInput,authKey,recoveryVerifier,routeSignIn,isolatedStorage,appAccountChanged,createController};
});
