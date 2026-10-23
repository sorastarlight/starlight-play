(function(host,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else host.PLAY_ADMIN_ROSTER=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function project(raw,target){
  if(raw?.ok!==true||raw.userId!==target||!Array.isArray(raw.pokemon)||raw.pokemon.length>40||typeof raw.hasMore!=='boolean'||raw.pageSize!==40||raw.generation!==1)throw Error('Roster unavailable.');
  const ids=new Set();for(const row of raw.pokemon){if(!row||typeof row.id!=='string'||ids.has(row.id)||!Number.isInteger(row.dex)||row.dex<1||row.dex>151||typeof row.name!=='string')throw Error('Invalid roster record.');ids.add(row.id);}
  if(raw.hasMore&&(!raw.nextCursor||typeof raw.nextCursor.caughtAt!=='string'||typeof raw.nextCursor.id!=='string'||raw.pokemon.length!==40))throw Error('Invalid roster continuation.');
  return {rows:raw.pokemon.map(row=>Object.fromEntries(['id','dex','name','nickname','variant','gender','ball','level','caughtAt','battleData'].map(key=>[key,row[key]]))),more:raw.hasMore,cursor:raw.hasMore?{caughtAt:raw.nextCursor.caughtAt,id:raw.nextCursor.id}:null};
 }
 function adapter({session,identity,allowed,call}){return async args=>{
  if(!args||Object.keys(args).sort().join()!=='p_cursor,p_generation,p_query,p_user'||typeof args.p_user!=='string'||typeof args.p_query!=='string'||args.p_query.length>100||args.p_generation!==1)throw Error('Unsupported roster request.');
  const expected=identity(),before=await session();
  if(!expected||!allowed(args.p_user)||before.error||before.data?.session?.user?.id!==expected||identity()!==expected)throw Error('Staff session changed.');
  const result=await call('admin_trainer_pokemon',args),after=await session();
  if(!allowed(args.p_user)||identity()!==expected||after.error||after.data?.session?.user?.id!==expected)throw Error('Staff session changed.');return result;
 };}
 function controller(target,transport,notify=()=>{}){
  let epoch=0,active=true;const state={phase:'idle',query:'',rows:[],more:false,cursor:null,history:[null],page:0,message:''};
  async function load(query=state.query,index=0,cursor=null){
   if(!active||state.phase==='loading')return;
   if(typeof query!=='string'||query.length>100)throw Error('Search supports up to 100 characters.');
   const token=++epoch;Object.assign(state,{phase:'loading',query,page:index,rows:[],cursor:null,more:false,message:'Loading Pokémon…'});notify(state);
   try{const data=project(await transport({p_user:target,p_query:query,p_generation:1,p_cursor:cursor}),target);if(!active||token!==epoch)return;
    if(index===0)state.history=[null];else state.history=state.history.slice(0,index+1);
    Object.assign(state,{phase:'ready',query,rows:data.rows,more:data.more,cursor:data.cursor,page:index,message:data.rows.length?`Showing ${index*40+1}–${index*40+data.rows.length}${data.more?' · more available':''}`:'No matching Pokémon. Try another name or Pokédex number.'});
   }catch(_){if(!active||token!==epoch)return;Object.assign(state,{phase:'error',query:'',page:0,history:[null],rows:[],more:false,cursor:null,message:'Roster unavailable or access denied. Reload to try again.'});}notify(state);
  }
  return {state,load,next(){if(state.phase!=='ready'||!state.more)return;const cursor=state.cursor,index=state.page+1;state.history[index]=cursor;return load(state.query,index,cursor);},previous(){if(state.phase!=='ready'||!state.page)return;const index=state.page-1;return load(state.query,index,state.history[index]);},reset(){active=false;epoch++;Object.assign(state,{phase:'closed',rows:[],query:'',cursor:null,more:false,history:[null],page:0,message:''});notify(state);}};
 }
 function mount(root,target,transport,presenter){
  if(!root)return null;let dialog=null;const model=controller(target,transport,render);
  function render(){dialog?.close();const s=model.state;if(s.phase==='closed'){root.replaceChildren();return;}const focused=root.contains(root.ownerDocument.activeElement);
   root.innerHTML=`<h4>Trainer Pokémon roster</h4><form data-roster-search class="roster-filters"><label>Search Pokémon<input type="search" name="query" maxlength="100" ${s.phase==='loading'?'disabled':''} value="${esc(s.query)}" placeholder="Name, nickname or Pokédex number"></label><label>Generation<select name="generation" ${s.phase==='loading'?'disabled':''}><option value="1">Generation I · Kanto</option></select></label><button ${s.phase==='loading'?'disabled':''}>Search roster</button></form><p role="status" tabindex="-1" data-roster-status>${esc(s.message)}</p><div class="record-list">${s.rows.map(r=>`<button type="button" class="record-hit" aria-label="${esc(r.nickname||r.name)}, level ${esc(r.level??'unavailable')}${r.variant==='shiny'?', Shiny':''}" data-roster-mon="${esc(r.id)}">${presenter.monArt(r)}<span><strong>${esc(r.nickname||r.name)}</strong><span class="admin-next-trainer-handle">${r.nickname?esc(r.name)+' · ':''}Level ${esc(r.level??'Unavailable')}${r.variant==='shiny'?' · Shiny':''}</span></span><span aria-hidden="true">›</span></button>`).join('')}</div><div class="roster-pager"><button type="button" data-roster-prev ${s.phase!=='ready'||s.page===0?'disabled':''}>Previous</button><span>Page ${s.page+1}</span><button type="button" data-roster-next ${s.phase!=='ready'||!s.more?'disabled':''}>Next</button><button type="button" data-roster-reload ${s.phase==='loading'?'disabled':''}>Reload roster</button></div><p class="record-note">Read only · up to 40 Pokémon per page. Search covers all current holdings in the selected generation. Ownership can change while browsing; reload for a fresh view. Additional generations appear when supported.</p>`;
   if(focused)root.querySelector('[data-roster-status]')?.focus({preventScroll:true});
  }
  root.addEventListener('submit',e=>{if(!e.target.matches('[data-roster-search]'))return;e.preventDefault();model.load(e.target.elements.query.value);});
  root.addEventListener('click',e=>{if(e.target.closest('[data-roster-next]'))model.next();if(e.target.closest('[data-roster-prev]'))model.previous();if(e.target.closest('[data-roster-reload]'))model.load(model.state.query);const hit=e.target.closest('[data-roster-mon]');if(!hit)return;const mon=model.state.rows.find(r=>r.id===hit.dataset.rosterMon);if(!mon)return;
   dialog=root.ownerDocument.createElement('dialog');dialog.className='reward-dialog';dialog.setAttribute('aria-label','Pokémon record');dialog.innerHTML=`<header><div>${presenter.monArt(mon)}<h3>${esc(mon.nickname||mon.name)}</h3><p>${mon.nickname?esc(mon.name)+' · ':''}Level ${esc(mon.level??'Unavailable')}</p></div><button type="button" data-roster-close autofocus>Close details</button></header>${presenter.pokemonFacts(mon)}${presenter.statsPanel(mon)}<p class="record-note">Read-only stored record. Ownership may have changed since this page loaded.</p>`;root.append(dialog);dialog.querySelector('[data-roster-close]').onclick=()=>dialog.close();const opened=dialog;opened.onclose=()=>{opened.remove();if(dialog===opened)dialog=null;if(hit.isConnected)hit.focus({preventScroll:true});};opened.showModal();
  });
  model.load();return model;
 }
 return {project,adapter,controller,mount};
});
