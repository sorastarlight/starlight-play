(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_ADMIN_PROVIDERS=api;})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
const KEY='playHubProviderConsent',SCOPES='user:read:email user:read:subscriptions channel:read:ads channel:manage:ads';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
function intent(actor,nonce,channelRevision,now=Date.now()){if(!uuid(actor)||!uuid(nonce)||!/^[a-f0-9]{32}$/.test(channelRevision||''))throw Error('The owner session could not be verified.');return{kind:'ads',actor,nonce,channelRevision,expiresAt:now+600000};}
function consume(storage,actor,nonce,now=Date.now()){
 let value,i;
 try{value=storage.getItem(KEY);if(!value)return null;i=JSON.parse(value);}catch{try{storage.removeItem(KEY);}catch{}return null;}
 const valid=i&&Object.keys(i).sort().join(',')==='actor,channelRevision,expiresAt,kind,nonce'&&i.kind==='ads'&&i.actor===actor&&uuid(i.actor)&&uuid(i.nonce)&&/^[a-f0-9]{32}$/.test(i.channelRevision||'')&&Number.isFinite(i.expiresAt)&&i.expiresAt>=now&&i.expiresAt<=now+600000;
 if(!valid){try{storage.removeItem(KEY);}catch{}return null;}
 if(i.nonce!==nonce)return null;
 try{storage.removeItem(KEY);}catch{return null;}
 return i;
}
function project(config,operations){if(config?.ok!==true||typeof config.canManageConnections!=='boolean'||typeof config.channel?.login!=='string'||!/^[a-f0-9]{32}$/.test(config.channelRevision||'')||operations?.ok!==true||!operations.controls?.ads)throw Error('Ad connection status is unavailable.');const a=operations.controls.ads;return{owner:config.canManageConnections,channel:config.channel.login,channelRevision:config.channelRevision,ads:{active:a.active===true,available:a.dataAvailable===true,stale:a.stale===true,nextAt:typeof a.nextAt==='string'?a.nextAt:null,source:String(a.source||''),lastRefreshAt:typeof a.lastRefreshAt==='string'?a.lastRefreshAt:null},checkedAt:operations.asOf};}
function snoozable(s,now=Date.now()){return !!s?.owner&&s.ads.available&&!s.ads.stale&&!s.ads.active&&s.ads.source==='twitch'&&Date.parse(s.ads.nextAt)>now&&Number.isFinite(Date.parse(s.ads.lastRefreshAt))&&now-Date.parse(s.ads.lastRefreshAt)>=-30000&&now-Date.parse(s.ads.lastRefreshAt)<=300000;}
function adapter({session,identity,allowed,call,invoke,oauth,origin}){
 const check=async()=>{const actor=identity(),r=await session();if(!actor||!allowed()||identity()!==actor||r.error||r.data?.session?.user?.id!==actor)throw Error('Staff access changed.');return{actor,session:r.data.session};};
 const observe=async()=>{const before=await check();const [config,operations]=await Promise.all([call('admin_system_connections_read'),call('admin_hub_operations_read')]);if((await check()).actor!==before.actor)throw Error('Staff access changed.');return project(config,operations);};
 return{actor:identity,observe,async begin(nonce,expectedRevision){const expected=await check(),s=await observe();if(!s.owner||s.channelRevision!==expectedRevision)throw Error('Owner connection settings changed.');if((await check()).actor!==expected.actor)throw Error('Staff access changed.');const result=await oauth({provider:'twitch',options:{redirectTo:origin+'/admin-next.html?section=system&provider=ads&providerIntent='+encodeURIComponent(nonce),scopes:SCOPES,queryParams:{force_verify:'true'}}});if(result?.error)throw Error('Twitch authorization could not be opened.');return true;},async action(action,expectedRevision,expectedNextAt){let sent=false;try{
 if(!['connect','refresh','snooze'].includes(action))throw Error('Unsupported ad action.');const expected=await check(),s=await observe();
 if(!s.owner||s.channelRevision!==expectedRevision)throw Error('Owner connection settings changed.');
 if(action==='snooze'&&(!snoozable(s)||s.ads.nextAt!==expectedNextAt))throw Error('The reviewed ad schedule changed.');
 const before=await check();if(before.actor!==expected.actor)throw Error('Staff access changed.');const body={action};
 if(action==='connect'){const token=before.session.provider_token;if(typeof token!=='string'||!token)throw Error('Twitch did not return a permission token.');body.accessToken=token;}
 let result;try{sent=true;result=await invoke('twitch-ads',{body});}finally{delete body.accessToken;}
 if((await check()).actor!==before.actor)throw Error('Staff access changed.');if(result?.error||result?.data?.ok!==true){let detail=result?.data;if(!detail&&typeof result?.error?.context?.json==='function'){try{detail=await result.error.context.json();}catch{}}if(detail?.needsScope===true||detail?.needsManage===true)throw Object.assign(Error('Twitch permission must be reconnected.'),{code:'PROVIDER_RECONNECT'});throw Error('Twitch did not confirm this request.');}return{ok:true};
 }catch(error){if(error?.code==='PROVIDER_RECONNECT')throw error;if(!sent)throw Object.assign(Error('Access or the reviewed ad schedule changed.'),{code:'PROVIDER_NOT_SENT'});throw Error('Provider outcome unconfirmed.');}}};
}
function controller(transport,storage,notify=()=>{},clock=Date.now){
 let epoch=0;
 const state={current:null,pending:false,locked:false,needsReconnect:false,message:'Load the saved channel and current ad timing.'};
 function reset(){
  epoch++;Object.assign(state,{current:null,pending:false,locked:false,needsReconnect:false,message:'Load the saved channel and current ad timing.'});notify();
 }
 async function load(){
  if(state.pending)return;
  const e=epoch;state.pending=true;state.message='Loading saved ad timing…';notify();
  try{
   const current=await transport.observe();if(e!==epoch)return;
   state.current=current;state.locked=false;
   state.message=state.needsReconnect?'Reconnect Twitch Ads to grant the missing ad permissions.':'Saved ad timing loaded. Twitch was not contacted.';
  }catch{
   if(e!==epoch)return;state.current=null;state.message='Ad timing could not be loaded, or staff access changed.';
  }finally{if(e===epoch){state.pending=false;notify();}}
 }
 async function begin(nonce){
  if(state.pending||state.locked||!state.current?.owner)return;
  const e=epoch;let stored=false;state.pending=true;notify();
  try{
   const record=intent(transport.actor(),nonce,state.current.channelRevision,clock());
   storage.setItem(KEY,JSON.stringify(record));stored=true;
   state.locked=true;state.message='Opening Twitch authorization…';notify();
   await transport.begin(nonce,state.current.channelRevision);if(e!==epoch)return;
   state.message='Continue in Twitch to approve the connection.';
  }catch{
   try{if(JSON.parse(storage.getItem(KEY)||'null')?.nonce===nonce)storage.removeItem(KEY);}catch{}
   if(e!==epoch)return;state.locked=false;
   state.message=stored?'Twitch authorization could not be opened. No ad command was requested.':'Your browser could not save the sign-in request. Allow site storage, then try again.';
  }finally{if(e===epoch){state.pending=false;notify();}}
 }
 async function action(kind){
  if(state.pending||state.locked||!state.current?.owner||!['connect','refresh','snooze'].includes(kind))return;
  const e=epoch;state.pending=true;state.locked=true;state.message='Sending the reviewed Twitch request once…';notify();
  try{
   await transport.action(kind,state.current.channelRevision,state.current.ads.nextAt);if(e!==epoch)return;
   state.needsReconnect=false;
   state.message=kind==='snooze'?'Twitch acknowledged the snooze. Reload saved timing to check the result.':kind==='connect'?'Twitch acknowledged the ad connection. Reload saved timing to inspect it.':'Twitch acknowledged the refresh. Reload saved timing to check the result.';
  }catch(error){
   if(e!==epoch)return;
   state.needsReconnect=error?.code==='PROVIDER_RECONNECT';
   state.message=state.needsReconnect?'Twitch needs ad permissions. Reload saved timing, then use Connect Twitch Ads.':error?.code==='PROVIDER_NOT_SENT'?'Access or the reviewed ad schedule changed. No Twitch request was sent. Reload before another review.':'The result is unconfirmed. Do not repeat the request; reload saved timing and check Twitch first.';
  }finally{if(e===epoch){state.pending=false;notify();}}
 }
 async function resume(nonce){
  if(!nonce||state.pending)return;
  const e=epoch;await load();if(e!==epoch)return;
  if(!state.current?.owner){try{storage.removeItem(KEY);}catch{}return;}
  const record=consume(storage,transport.actor(),nonce,clock());
  if(!record){state.message='This Twitch return is expired, already used or belongs to another account. Reconnect from the owner account.';notify();return;}
  if(record.channelRevision!==state.current.channelRevision){state.message='The channel settings changed during Twitch approval. Start a new connection review.';notify();return;}
  await action('connect');
 }
 return{state,reset,load,begin,action,resume};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(host,transport,storage,locationApi){if(!host)return null;const model=controller(transport,storage,render),stamp=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString():'Not recorded';
 function render(){const focus=host.contains(document.activeElement),s=model.state,c=s.current;host.querySelectorAll('dialog').forEach(d=>d.close());host.innerHTML=`<h3>Twitch ad protection</h3><p>Connect the broadcaster’s Twitch account to read ad timing and request available snoozes. Manual encounter protection stays in Operations.</p><p role="status" tabindex="-1">${esc(s.message)}</p><button type="button" data-provider-load ${s.pending?'disabled':''}>${c?'Reload saved timing':'Load ad timing'}</button>${c?`<div class="system-summary"><article><h4>Channel</h4><p>${esc(c.channel)}</p></article><article><h4>Timing source</h4><p>${c.ads.source==='twitch'?'Twitch':c.ads.source==='fallback'?'Manual fallback':'Not connected'}</p></article><article><h4>Next ad</h4><p>${esc(stamp(c.ads.nextAt))}</p></article><article><h4>Current timing</h4><p>${c.ads.active?'Ad break active':c.ads.stale?'Out of date':c.ads.available?(Date.now()-Date.parse(c.ads.lastRefreshAt)<=300000?'Available':'Refresh needed'):'Unavailable'}</p></article></div><p>Last Twitch schedule refresh: ${esc(stamp(c.ads.lastRefreshAt))}. A snooze needs Twitch timing checked within five minutes.</p>${c.owner?`<div class="config-actions provider-actions"><button type="button" data-provider-action="connect" ${s.pending||s.locked?'disabled':''}>Connect Twitch Ads</button><button type="button" data-provider-action="refresh" ${s.pending||s.locked||s.needsReconnect?'disabled':''}>Review Twitch timing refresh</button><button type="button" data-provider-action="snooze" ${s.pending||s.locked||s.needsReconnect||!snoozable(c)?'disabled':''}>Review five-minute ad snooze</button></div><p>Connecting requests the existing Twitch ad permissions. A snooze changes the real Twitch schedule if Twitch allows it. Each Twitch change requires your confirmation.</p>`:'<p>Connection and real ad-schedule controls are shown to the owner.</p>'}`:''}`;if(focus)host.querySelector('[role=status]')?.focus({preventScroll:true});}
 function review(kind,opener){const d=document.createElement('dialog');d.className='config-dialog';d.setAttribute('aria-labelledby','provider-review-title');const copy={connect:['Connect Twitch ad protection?','Twitch will open in this tab. Sign in to the broadcaster’s account and approve reading ad schedules and managing ads. The return is accepted only for this owner account. This does not start an ad.','Continue to Twitch'],refresh:['Refresh ad timing from Twitch?','This contacts Twitch and updates the cached ad schedule used by encounter protection. It does not start an ad or an encounter.','Refresh from Twitch'],snooze:['Snooze the next Twitch ad?','This asks Twitch for a five-minute delay to the next scheduled ad. Twitch decides whether a snooze is available. It does not end an ad that is already running.','Request ad snooze']}[kind];d.innerHTML=`<h3 id="provider-review-title">${copy[0]}</h3><p>${copy[1]}</p><p>Channel: <strong>${esc(model.state.current.channel)}</strong></p>${kind==='snooze'?`<p>Reviewed ad time: ${esc(stamp(model.state.current.ads.nextAt))}</p>`:''}<div class="config-actions"><button type="button" data-back autofocus>Back</button><button type="button" data-confirm>${copy[2]}</button></div>`;host.append(d);d.querySelector('[data-back]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=()=>{d.close();if(kind==='connect')model.begin(crypto.randomUUID());else model.action(kind);};d.onclose=()=>{d.remove();if(opener.isConnected)opener.focus();};d.showModal();}
 host.addEventListener('click',e=>{if(e.target.closest('[data-provider-load]'))return model.load();const b=e.target.closest('[data-provider-action]');if(b&&!b.disabled)review(b.dataset.providerAction,b);});render();return{...model,async resume(){const url=new URL(locationApi.href);if(url.searchParams.get('provider')!=='ads'||!url.searchParams.get('providerIntent'))return;const nonce=url.searchParams.get('providerIntent');url.searchParams.delete('provider');url.searchParams.delete('providerIntent');locationApi.replace(url.pathname+url.search+url.hash);const panel=host.closest('[data-workspace]');if(panel?.getAttribute('aria-labelledby'))host.ownerDocument.getElementById(panel.getAttribute('aria-labelledby'))?.click();await model.resume(nonce);host.querySelector('[role=status]')?.focus({preventScroll:true});}};
}
return{KEY,SCOPES,intent,consume,project,snoozable,adapter,controller,mount};
});
