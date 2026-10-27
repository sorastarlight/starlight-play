(function(root){
 'use strict';
 function create({client,call,storage,uuid=()=>crypto.randomUUID(),notify=()=>{},refresh=async()=>{},generation=()=>0}){
  let busy=false;
  const key=id=>'pass-crate-open:'+id;
  function pending(id){try{return storage.getItem(key(id));}catch(_){return null;}}
  async function open(){
   if(busy)return;busy=true;const epoch=generation();let id,request,sent=false;
   try{
    const auth=await client.auth.getUser();id=auth.data?.user?.id;
    if(auth.error||!id)throw Error('Sign in before opening a supply crate.');
    if(epoch!==generation())return;
    request=pending(id)||uuid();
    // Save before sending: an uncertain response must retry the same delivery.
    storage.setItem(key(id),request);
    sent=true;
    const result=await call('play_open_pass_crate',{p_request:request});
    const current=await client.auth.getUser();
    if(epoch!==generation()||current.error||current.data?.user?.id!==id)return;
    if(result?.ok!==true)throw Error('Opening could not be confirmed.');
    storage.removeItem(key(id));
    notify({kind:'success',title:'Supply crate opened',body:result.message||'Your saved Starlight Pass supplies have arrived.'});
    try{await refresh(result);}catch(_){notify({kind:'warning',title:'Supplies delivered',body:'Refresh your bag to see the updated items.'});}
   }catch(error){
    if(epoch!==generation())return;
    const confirmed=/^[0-9A-Z]{5}$/.test(error?.code||'');
    if(confirmed&&id)storage.removeItem(key(id));
    notify({kind:confirmed||!sent?'error':'warning',title:confirmed||!sent?'Crate not opened':'Check crate opening',body:confirmed?error.message:!sent?'Could not start the opening. Sign in and allow local storage, then try again.':'Opening is not confirmed. Use Check crate opening to retry safely.'});
   }finally{busy=false;}
  }
  return {open,pending};
 }
 root.PLAY_PASS_CRATES={create};
 if(typeof module==='object')module.exports={create};
})(typeof window==='undefined'?globalThis:window);
