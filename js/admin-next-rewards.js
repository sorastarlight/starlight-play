/* Audited staff reward UI. Transport is supplied by the gated controller. */
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.PLAY_ADMIN_REWARDS=factory();
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  const esc=(v)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const date=(v)=>v&&Number.isFinite(new Date(v).getTime())?new Date(v).toLocaleString(undefined,{timeZoneName:"short"}):"Not recorded";
  const source=(v)=>({admin:"Staff gift","twitch-sub":"Twitch subscription",broadcaster:"Broadcaster entitlement"}[v]||v||"Not recorded");
  const fallbackItemName=(row)=>({coins:"PokéCoins",bag_bonus:"Inventory Space",berry:"Berries",bait:"Bait",lure:"Lure",pokeball:"Poké Ball",greatball:"Great Ball",ultraball:"Ultra Ball"}[row.id]||row.name||row.id);
  const itemName=(row)=>({coins:"PokéCoins",bag_bonus:"Inventory Space"}[row.id]||globalThis.playItemLabel?.(row.id)||fallbackItemName(row));
  const kindName=(kind)=>({background:"Trainer ID background",team_background:"Pokémon team background",avatar:"Trainer avatar"}[kind]||"Appearance unlock");
  const speciesName=(dex)=>globalThis.PLAY_SPECIES?.[Number(dex)-1]||`Pokémon #${dex}`;
  const normalize=(value)=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/♀/g," female ").replace(/♂/g," male ").replace(/[^\p{L}\p{N}]+/gu," ").trim();
  // Explicit release list: adding reference species alone must never enable grants.
  const generations=()=>globalThis.PLAY_ADMIN_GIFT_GENERATIONS||[{id:"kanto",name:"Generation I · Kanto",min:1,max:151}];
  function searchSpecies(query,generation){
    const words=normalize(query).split(/\s+/).filter(Boolean);
    const names=globalThis.PLAY_SPECIES||[];
    return Array.from({length:Math.max(0,generation.max-generation.min+1)},(_,i)=>generation.min+i).filter(dex=>names[dex-1]).filter(dex=>words.every(word=>/^\d+$/.test(word)?dex===Number(word):normalize(`${speciesName(dex)} ${generation.name}`).includes(word)));
  }
  const candyLine=(dex)=>Number(globalThis.PLAY_EVO_CANDY_PNG?.[dex]||dex);
  const candyName=(dex)=>`${speciesName(candyLine(dex))} Evolution Candy`;
  const candyArt=(dex)=>globalThis.playEvolutionCandyItemUrl?.(candyLine(dex))||`images/items/evolution-candy/${candyLine(dex)}.png`;
  const appearanceKinds={background:"background",team_background:"team_background"};
  function ribbonArt(id){
    const mapped=globalThis.playRibbonForBadge?.({id});
    const entry=globalThis.PLAY_ACHIEVEMENT_RIBBON_MAP?.mappings?.find(row=>row.badgeId===id);
    return mapped?.icon||mapped?.localIcon||entry?.localIcon||null;
  }
  function reviewArt(intent){
    const p=intent.p_payload;
    const url=intent.p_action==="candy"?candyArt(p.dex):["pokemon","pokemon_batch"].includes(intent.p_action)?speciesArt(p.dex,p.shiny):intent.p_action==="badge"?ribbonArt(p.id):intent.p_action==="item"?globalThis.playItemSprite?.(p.key):null;
    return url?`<img src="${esc(url)}" width="96" height="96" alt="">`:'<span class="reward-star" aria-hidden="true">✦</span>';
  }
  const speciesArt=(dex,shiny=false)=>`images/pokemon/home/${shiny?"shiny/":""}${Number(dex)}.png`;
  const speciesChoice=(dex,candy=false)=>`<img src="${candy?candyArt(dex):speciesArt(dex)}" width="64" height="64" loading="lazy" alt=""><span><strong>${esc(candy?candyName(dex):speciesName(dex))}</strong><small>#${String(dex).padStart(3,"0")}</small></span>`;
  let openDialog=null;
  function modal(content,label,opener){
    openDialog?.close();
    const dialog=document.createElement("dialog");dialog.className="reward-dialog";dialog.setAttribute("aria-label",label);dialog.innerHTML=content;
    document.body.append(dialog);openDialog=dialog;
    dialog.addEventListener("close",()=>{dialog.remove();if(openDialog===dialog)openDialog=null;if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
    dialog.addEventListener("click",event=>{if(event.target.closest('[data-modal-cancel]'))dialog.close();});
    dialog.showModal();return dialog;
  }
  function chooseSpecies(form,current){
    const candy=form.elements.namedItem("gift_kind")?.value==="candy";
    const opener=form.querySelector('[data-species-picker]');
    const dialog=modal(`<header><div><p class="eyebrow">${candy?"Choose a candy family":"Choose a Pokémon"}</p><h3>Find your gift</h3></div><button type="button" data-modal-cancel>Cancel</button></header><div class="reward-picker-filters"><label>Generation<select data-generation>${generations().map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("")}</select></label><label>Search Pokémon<input type="search" data-species-search placeholder="Name or Pokédex number" autocomplete="off"></label></div><p class="record-note">${candy?"Evolution Candy is shared by the whole family. Searching an evolved Pokémon finds its family candy. ":""}Only released generations are available. More generations will appear here when enabled for gifts.</p><p role="status" data-picker-count></p><div class="reward-species-grid" data-species-grid></div>`,candy?"Choose a candy family":"Choose a Pokémon",opener);
    const draw=()=>{const generation=generations().find(g=>g.id===dialog.querySelector('[data-generation]').value);const found=searchSpecies(dialog.querySelector('[data-species-search]').value,generation);const matches=candy?[...new Set(found.map(candyLine))]:found;dialog.querySelector('[data-picker-count]').textContent=`${matches.length} ${candy?(matches.length===1?"candy family":"candy families"):"Pokémon"}`;dialog.querySelector('[data-species-grid]').innerHTML=matches.length?matches.map(dex=>`<button type="button" data-pick-dex="${dex}" aria-label="${esc(candy?candyName(dex):speciesName(dex))}, number ${dex}">${speciesChoice(dex,candy)}</button>`).join(""):"<p>No Pokémon match. Try a name or dex number.</p>";};
    dialog.addEventListener('input',event=>{if(event.target.matches('[data-species-search]'))draw();});
    dialog.addEventListener('change',event=>{if(event.target.matches('[data-generation]'))draw();});
    dialog.addEventListener('click',event=>{const choice=event.target.closest('[data-pick-dex]');if(!choice)return;if(!current()){dialog.close();return;}form.elements.namedItem('dex').value=choice.dataset.pickDex;opener.innerHTML=speciesChoice(choice.dataset.pickDex,candy)+`<span>${candy?"Change candy family":"Change Pokémon"}</span>`;dialog.close();});
    draw();dialog.querySelector('[data-species-search]').focus();
  }
  function reviewSummary(intent,data){
    const p=intent.p_payload||{};
    if(["pokemon","pokemon_batch"].includes(intent.p_action))return '<strong>'+esc(speciesName(p.dex))+'</strong><span class="reward-review-meta"><span>Quantity '+esc(p.qty||1)+'</span><span>Level '+esc(p.level)+'</span>'+(p.shiny?'<span>Shiny ✦</span>':'')+'</span>';
    return '<strong>'+esc(intentSummary(intent,data))+'</strong>';
  }
  function reviewIntent(intent,data,user,previewOnly=false){
    const opener=document.activeElement;
    const art=reviewArt(intent);
    const dialog=modal(`<form class="reward-review-form"><header><div><p class="eyebrow">${intent.p_action.startsWith('pass_')?'Starlight Pass':'Special delivery'}</p><h3>${esc(actionNames[intent.p_action]||"Review staff action")}</h3></div><button type="button" data-modal-cancel>Cancel</button></header><div class="reward-review-hero">${art}${reviewSummary(intent,data)}<span class="reward-review-recipient">For ${esc(user.displayName||user.login||"Trainer")}</span></div><label>Staff reason<textarea name="reason" rows="2" required minlength="3" maxlength="500" placeholder="Why are you making this change?"></textarea></label><p class="record-note">This action and reason will be saved in staff history.</p><button class="reward-deliver" type="submit" ${previewOnly?'disabled':''}>${previewOnly?'Preview only — no gifts sent':intent.p_action.startsWith('pass_')?'Confirm Pass action':'Send gift ✦'}</button></form>`,"Review staff action",opener);
    return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(null),{once:true});dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(previewOnly)return;const reason=dialog.querySelector('textarea').value.trim();if(reason.length<3){dialog.querySelector('textarea').setCustomValidity('Enter at least 3 characters.');dialog.querySelector('textarea').reportValidity();return;}resolve(reason);dialog.close();});dialog.querySelector('textarea').addEventListener('input',event=>event.target.setCustomValidity(''));});
  }
  const actionNames={pass_on:"Turn Pass on",pass_off:"Turn Pass off",pass_sync:"Clear staff override",pass_daily:"Give daily rewards again",pass_weekly:"Give weekly rewards again",item:"Give items",pokemon:"Give a Pokémon",pokemon_batch:"Give Pokémon",candy:"Give Evolution Candy",title:"Give a title",cosmetic:"Give a cosmetic",badge:"Give a ribbon"};
  const bundleText=(items)=>Object.entries(items||{}).map(([id,qty])=>`${qty} ${itemName({id,name:id})}`).join(", ")||"None recorded";
  function intentSummary(intent,data){
    const p=intent.p_payload;
    if(intent.p_action==="item")return `${p.qty} ${itemName((data.catalog?.items||[]).find(row=>row.id===p.key)||{id:p.key})}`;
    if(["pokemon","pokemon_batch"].includes(intent.p_action))return `${intent.p_action==="pokemon_batch"?p.qty+" × ":""}${speciesName(p.dex)} · #${p.dex}, level ${p.level}${p.shiny?", Shiny":""}`;
    if(intent.p_action==="candy")return `${p.qty} ${candyName(p.dex)}`;
    if(intent.p_action==="pass_daily"||intent.p_action==="pass_weekly")return bundleText(data.bundles?.[intent.p_action==="pass_daily"?"daily":"weekly"]);
    if(intent.p_action==="pass_sync")return "Resume subscription syncing using the last recorded result.";
    if(p.id){const row=(data.catalog?.[intent.p_action==="title"?"titles":intent.p_action==="badge"?"badges":"cosmetics"]||[]).find(row=>row.id===p.id);return intent.p_action==="cosmetic"?`${kindName(row?.kind)} · ${row?.name||p.id}`:row?.name||p.id;}
    return "Staff override remains until explicitly cleared.";
  }
  function delivery(claim){
    const requested=claim.requested||{};
    const entries=Object.entries(requested);
    if(!entries.length||entries.some(([key,qty])=>!Number.isInteger(Number(qty))||Number(qty)<0||key.startsWith("_")))return "Delivery not verified";
    return entries.every(([key,qty])=>Number(key==="coins"?claim.coins:claim.items?.[key]||0)===Number(qty))?"Delivery verified":"Delivery not verified";
  }
  function claimHtml(data){
    const claims=data.claims||[];
    return `<h4>Player reward claims</h4><p class="record-note">Most recent ${data.historyLimit||50} recorded claims. Earlier failed attempts may not have been recorded. Delivery is verified against item and coin ledger entries, not the claim timestamp.</p>${claims.length?`<div class="reward-history">${claims.map(row=>`<article><strong>${esc(row.kind==="pass-daily"?"Daily reward":"Weekly reward")}</strong><span>${esc(date(row.at))}</span><strong>${esc(delivery(row))}</strong><small>Requested: ${esc(bundleText(row.requested))}<br>Recorded items: ${esc(bundleText(row.items))} · PokéCoins: ${esc(row.coins)}</small></article>`).join("")}</div>`:`<p class="record-note">No recorded claims returned.</p>`}`;
  }
  function auditHtml(data){return `<h4>Staff reward history</h4>${(data.actions||[]).length?`<div class="reward-history">${data.actions.map(row=>`<article><strong>${esc(actionNames[row.action]||row.action)} · ${esc(row.status)}</strong><span>${esc(date(row.created_at))}</span><span>${esc(row.result?.requested?bundleText(row.result.requested):intentSummary({p_action:row.action,p_payload:row.payload||{}},data))}</span><span>${esc(row.reason)}</span><small>Request ${esc(row.request_id)} · Staff ${esc(row.actor_id)}</small></article>`).join("")}</div>`:`<p class="record-note">No staff reward actions recorded.</p>`}`;}
  function passHtml(data){
    const pass=data.pass||{};
    const override=pass.override===true?"Staff override: on":pass.override===false?"Staff override: off":"Following subscription status";
    return `<h4>Starlight Pass</h4><dl class="record-facts"><div><dt>Current status</dt><dd>${pass.active?"Active":"Off"}</dd></div><div><dt>Origin</dt><dd>${esc(source(pass.source))}</dd></div><div><dt>Staff control</dt><dd>${override}</dd></div><div><dt>Origin before override</dt><dd>${esc(source(pass.sourceBeforeOverride))}</dd></div><div><dt>Last daily claim</dt><dd>${esc(date(pass.dailyAt))}</dd></div><div><dt>Last weekly claim</dt><dd>${esc(date(pass.weeklyAt))}</dd></div><div><dt>Underlying subscription</dt><dd>${pass.subscriptionActive==null?"Not recorded":pass.subscriptionActive?"Active":"Inactive"}</dd></div><div><dt>Last subscription check</dt><dd>${esc(date(pass.subscriptionCheckedAt||pass.checkedAt))}</dd></div></dl>
      <form data-reward-form="pass" class="reward-form"><div class="reward-actions"><button type="submit" data-pass-action="pass_on">Turn Pass on</button><button type="submit" data-pass-action="pass_off">Turn Pass off</button><button type="submit" data-pass-action="pass_sync" ${pass.override==null?"disabled":""}>Clear staff override</button><button type="submit" data-pass-action="pass_daily">Give daily rewards again</button><button type="submit" data-pass-action="pass_weekly">Give weekly rewards again</button></div></form>
      <p class="record-note">Staff overrides remain until cleared. Re-grants bypass Pass eligibility and claim cooldowns without changing the player's next claim time. Normal inventory limits and server validation still apply.</p>${claimHtml(data)}${auditHtml(data)}`;
  }
  function giftChoices(data,kind,query=""){
    const rows=kind==="item"?(data.catalog?.items||[]).filter(row=>!["coins","bag_bonus"].includes(row.id)):(data.catalog?.[kind==="title"?"titles":kind==="badge"?"badges":"cosmetics"]||[]).filter(row=>row.kind!=="frame"&&(!appearanceKinds[kind]||row.kind===appearanceKinds[kind]));
    const words=normalize(query).split(/\s+/).filter(Boolean);
    return rows.map(row=>({...row,label:kind==="item"?itemName(row):row.name||row.id})).filter(row=>words.every(word=>normalize(`${row.label} ${row.id}`).includes(word))).sort((a,b)=>a.label.localeCompare(b.label));
  }
  function choiceOptions(rows,selected=""){
    return `<option value="" ${selected?"":"selected"} disabled>${rows.length?"Choose a reward":"No matching rewards"}</option>`+rows.map(row=>`<option value="${esc(row.id)}" ${row.id===selected?"selected":""}>${esc(row.label)}</option>`).join("");
  }
  function searchableChoice(data,kind,label,name){
    const rows=giftChoices(data,kind);
    return `<label>Search ${esc(label.toLowerCase())}<input type="search" name="gift_search" data-gift-search placeholder="Search by name" autocomplete="off"></label><label>${esc(label)}<select name="${name}" data-gift-choice required>${choiceOptions(rows)}</select></label><small role="status" data-choice-count>${rows.length} available</small>`;
  }
  function giftFields(data,kind){
    if(kind==="coins"||kind==="space")return `<label>${kind==="coins"?"PokéCoins":"Inventory Space slots"}<input name="qty" type="number" min="1" max="10000" value="1" required></label>`;
    if(kind==="item")return `${searchableChoice(data,kind,"Items","key")}<label>Quantity<input name="qty" type="number" min="1" max="10000" value="1" required></label>`;
    if(kind==="pokemon"||kind==="candy")return `<input name="dex" type="hidden" value=""><button type="button" class="reward-species-choice" data-species-picker>${kind==="candy"?"Choose candy family":"Choose Pokémon"}</button>${kind==="pokemon"?`<label>Pokémon quantity<input name="qty" type="number" min="1" max="${pokemonMax(data)}" step="1" value="1" required ${pokemonMax(data)===1?"disabled":""}></label>${pokemonMax(data)===1?`<p class="record-note">Multiple Pokémon gifts are awaiting server setup. Single gifts remain available.</p>`:`<p class="record-note">Give 1–${pokemonMax(data)} Pokémon in one audited batch. Each receives separately generated stats; if any gift fails, none from this batch are granted.</p>`}<label>Level<input name="level" type="number" min="1" max="100" value="5" required></label><label class="reward-check"><input name="shiny" type="checkbox"> Shiny</label><p class="record-note">Base form, ordinary ability and server-generated individual stats. No hidden abilities or invented specimen data.</p>`:`<label>Evolution Candy quantity<input name="qty" type="number" min="1" max="10000" value="1" required></label>`}`;
    return searchableChoice(data,kind,appearanceKinds[kind]?kindName(kind):kind==="title"?"Titles":kind==="badge"?"Ribbons":"Appearance unlocks","id");
  }
  function giftHtml(data,kind="item"){return `<h4>Special gifts</h4><form data-reward-form="gift" class="reward-form"><label>Gift type<select name="gift_kind"><option value="item">Items</option><option value="coins">PokéCoins</option><option value="space">Inventory Space</option><option value="pokemon">Pokémon</option><option value="candy">Evolution Candy</option><option value="title">Title</option><option value="background">Trainer ID Backgrounds</option><option value="team_background">Pokémon Team Backgrounds</option><option value="badge">Ribbon</option></select></label><div data-gift-fields>${giftFields(data,kind)}</div><button type="submit">Review gift</button></form><p class="record-note">Gym Badges are earned by defeating Gym Leaders. Gym Badge grants are not available yet. Ribbons are separate achievement awards.</p>${auditHtml(data)}`;}
  function pokemonMax(data){return Number.isInteger(data?.pokemonGiftMaxQty)&&data.pokemonGiftMaxQty>=2?Math.min(data.pokemonGiftMaxQty,100):1;}
  function pokemonQuantity(value,max=100){if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1||Number(value)>max)throw Error(`Choose 1–${max} Pokémon.`);return Number(value);}
  function makeIntent(form,submitter,userId,requestId){
    const fields=form.elements;
    const get=(name)=>fields.namedItem(name)?.value;
    const kind=get("gift_kind");
    const qty=kind==="pokemon"?pokemonQuantity(get("qty")??1,Number(fields.namedItem("qty")?.max)||100):1;
    const action=kind==="pokemon"&&qty>1?"pokemon_batch":form.dataset.rewardForm==="pass"?submitter?.dataset.passAction:["coins","space"].includes(kind)?"item":appearanceKinds[kind]?"cosmetic":kind;
    const payload=action==="item"?{key:kind==="coins"?"coins":kind==="space"?"bag_bonus":get("key"),qty:Number(get("qty"))}:(["pokemon","pokemon_batch"].includes(action))?{dex:Number(get("dex")),level:Number(get("level")),shiny:fields.namedItem("shiny").checked,...(qty>1?{qty}:{})}:action==="candy"?{dex:Number(get("dex")),qty:Number(get("qty"))}:action?.startsWith("pass_")?{}:{id:get("id")};
    return {p_user:userId,p_request:requestId,p_action:action,p_payload:payload,p_reason:get("reason")?.trim()};
  }
  let contexts=new WeakMap();
  async function mount(root,user,pane,transport){
    const slot=root.querySelector("[data-trainer-rewards]");
    if(!slot||!user?.id)return;
    const ctx={userId:user.id,pane,slot,busy:false,pending:null};contexts.set(root,ctx);
    const current=()=>contexts.get(root)===ctx&&root.contains(slot);
    function status(text){if(current())slot.querySelector('[data-reward-status]').textContent=text;}
    function draw(data){
      if(!current())return;
      ctx.data=data;
      slot.innerHTML=`<p role="status" data-reward-status></p>${pane==="pass"?passHtml(data):giftHtml(data)}<button type="button" class="secondary" data-reward-retry hidden>Retry the same request</button>`;
      if(data.canWrite===false){slot.querySelectorAll('form').forEach(form=>form.remove());status("Protected trainer: account changes require separately scoped authorization.");}
    }
    async function send(intent){
      if(!current()||ctx.busy)return;
      ctx.busy=true;slot.querySelectorAll('button,input,select,textarea').forEach(control=>control.disabled=true);
      status("Sending staff action… Wait for its delivery result before continuing.");
      try{
        const result=await transport.write(intent);
        if(!current())return;
        ctx.pending=null;
        const refreshed=await transport.read(user.id);
        if(!current())return;
        draw(refreshed);status(result.message|| (result.ok?"Action completed.":"Action failed; nothing was granted."));
        if(result.ok) await transport.changed?.(user.id);
      }catch(error){
        if(!current())return;
        ctx.pending=intent;
        slot.querySelectorAll('button,input,select,textarea').forEach(control=>control.disabled=true);
        status("The result is uncertain. Retry this same request to retrieve its receipt without granting twice. Do not start a new grant for this result.");
        const retry=slot.querySelector('[data-reward-retry]');retry.hidden=false;retry.disabled=false;
      }finally{ctx.busy=false;}
    }
    try{draw(await transport.read(user.id));}catch(error){
      if(current())slot.innerHTML=`<h4>${pane==="pass"?"Starlight Pass":"Gifts"}</h4><p class="record-note">${error?.code==="42501"?"These tools require owner or admin permission.":"Reward history and audited controls are awaiting server setup. No account changes are available here yet."}</p>`;
      return;
    }
    slot.addEventListener('input',event=>{
      if(!event.target.matches('[data-gift-search]')||ctx.busy||ctx.pending||!current())return;
      const form=event.target.form,select=form.querySelector('[data-gift-choice]');
      const rows=giftChoices(ctx.data,form.elements.namedItem('gift_kind').value,event.target.value);
      const selected=rows.some(row=>row.id===select.value)?select.value:"";
      select.innerHTML=choiceOptions(rows,selected);
      form.querySelector('[data-choice-count]').textContent=rows.length?`Matches: ${rows.length}`:"No matching rewards. Try another name.";
    });
    slot.addEventListener('change',(event)=>{
      if(event.target.name!=="gift_kind"||ctx.busy)return;
      slot.querySelector('[data-gift-fields]').innerHTML=giftFields(ctx.data,event.target.value);
      if(event.target.value==='pokemon'||event.target.value==='candy')chooseSpecies(event.target.form,current);
    });
    slot.addEventListener('click',(event)=>{if(event.target.closest('[data-species-picker]')&&!ctx.busy)chooseSpecies(event.target.closest('form'),current);if(event.target.closest('[data-reward-retry]')&&ctx.pending)send(ctx.pending);});
    slot.addEventListener('submit',async(event)=>{
      const form=event.target.closest('[data-reward-form]');if(!form)return;event.preventDefault();
      if(ctx.busy||ctx.pending||!current())return;
      if(["pokemon","candy"].includes(form.elements.namedItem("gift_kind")?.value)&&!form.elements.namedItem("dex")?.value){chooseSpecies(form,current);return;}
      let intent;
      try{intent=makeIntent(form,event.submitter,user.id,crypto.randomUUID());}catch(error){status(error.message);return;}
      ctx.busy=true;
      try{
        const reason=await reviewIntent(intent,ctx.data,user,transport.previewOnly);
        if(!reason||!current())return;
        intent.p_reason=reason;
      }finally{ctx.busy=false;}
      await send(intent);
    });
  }
  return {mount,clear(){contexts=new WeakMap();openDialog?.close();},delivery,passHtml,giftHtml,giftFields,makeIntent,intentSummary,searchSpecies,kindName,itemName,reviewArt,candyLine,candyName,giftChoices,pokemonMax,pokemonQuantity,reviewSummary};
}));
