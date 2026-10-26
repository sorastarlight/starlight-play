(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_ADMIN_CREATE=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const items=Object.freeze([
 {key:'berry',name:'Berry',sprite:'oran-berry.png'}, {key:'bait',name:'Honey',sprite:'honey.png'},
 {key:'pokeball',name:'Poké Ball',sprite:'poke-ball.png'}, {key:'greatball',name:'Great Ball',sprite:'great-ball.png'},
 {key:'ultraball',name:'Ultra Ball',sprite:'ultra-ball.png'}, {key:'lure',name:'Poké Radar',sprite:'poke-radar.png'}
].map(Object.freeze));
const object=x=>x&&typeof x==='object'&&!Array.isArray(x),copy=x=>JSON.parse(JSON.stringify(x));
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const keys='blurb,categoryId,cost,name,quantity,reward,sku',max=2147483647;
const normalize=x=>String(x??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const matches=(text,q)=>normalize(q).split(/\s+/).filter(Boolean).every(w=>normalize(text).includes(w));
function floor(r){return object(r)&&uuid(r.id)&&r.kind==='coins'&&r.system===false&&typeof r.name==='string'&&r.name.trim().length>0;}
function empty(){return{sku:'',categoryId:'',name:'',blurb:'',reward:'pokeball',quantity:1,cost:0};}
function payload(d,options=items){
 if(!object(d)||Object.keys(d).sort().join(',')!==keys||!uuid(d.categoryId)||typeof d.sku!=='string'||d.sku.length>40||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.sku)||typeof d.name!=='string'||!d.name.trim()||d.name.trim().length>120||typeof d.blurb!=='string'||d.blurb.length>500||!(options===null?typeof d.reward==='string'&&/^[a-z0-9_]{1,64}$/.test(d.reward)&&d.reward!=='masterball':options.some(i=>i.key===d.reward))||!Number.isInteger(d.quantity)||d.quantity<1||d.quantity>max||!Number.isInteger(d.cost)||d.cost<0||d.cost>max)throw Error('Complete the draft with a valid code, category, item, quantity and whole PokéCoin price.');
 return{p_row:{...d,name:d.name.trim()}};
}
function options(rows){
 if(!Array.isArray(rows)||rows.length>500)throw Error('Shop item list unavailable.');const seen=new Set();
 return rows.map(r=>{if(!object(r)||!Object.keys(r).every(k=>['key','name','sprite','category'].includes(k))||typeof r.key!=='string'||!/^[a-z0-9_]{1,64}$/.test(r.key)||r.key==='masterball'||seen.has(r.key)||typeof r.name!=='string'||!r.name.trim()||typeof r.category!=='string'||!r.category.trim()||typeof r.sprite!=='string'||!/^[a-zA-Z0-9_./-]+\.(png|webp|svg)$/.test(r.sprite)||r.sprite.includes('..')||r.sprite.startsWith('/'))throw Error('Shop item list incomplete.');seen.add(r.key);return {...r};});
}
function adapter({session,identity,allowed,call}){return async(name,args)=>{
 if(name==='admin_store_draft_options'){if(args!==undefined)throw Error('Unexpected read arguments.');}
 else if(name==='admin_store_create_draft'){if(!object(args)||Object.keys(args).join(',')!=='p_row')throw Error('Invalid create arguments.');payload(args.p_row,null);}
 else throw Error('Unsupported draft operation.');
 const expected=identity(),before=await session();
 const valid=r=>expected&&allowed()&&identity()===expected&&!r.error&&r.data?.session?.user?.id===expected;
 if(!valid(before))throw Object.assign(Error('Staff session changed.'),{code:'42501'});
 const result=await call(name,args),after=await session();
 if(!valid(after))throw Object.assign(Error('Staff session changed.'),{code:'42501'});
 return result;
};}
function controller(transport,notify=()=>{}){
 let epoch=0,active=false;const state={phase:'closed',floors:null,codes:null,options:[],draft:empty(),uncertain:false,message:'Load the catalog to prepare a hidden draft.'};
 const emit=()=>notify(state);
 function reset(){epoch++;active=false;Object.assign(state,{phase:'closed',floors:null,codes:null,options:[],draft:empty(),uncertain:false,message:'Load the catalog to prepare a hidden draft.'});emit();}
 function dirty(){return Object.keys(empty()).some(k=>state.draft[k]!==empty()[k]);}
 async function load(){if(!active||state.phase==='saving')return;const token=++epoch;Object.assign(state,{phase:'loading',floors:null,codes:null,options:[],draft:empty(),uncertain:false,message:'Loading draft options…'});emit();
  try{const r=await transport('admin_store_draft_options');if(!active||epoch!==token)return;
   if(r?.ok!==true||!Array.isArray(r.categories)||!Array.isArray(r.items)||r.categories.some(x=>!object(x)||!uuid(x.id))||new Set(r.categories.map(x=>x.id.toLowerCase())).size!==r.categories.length||r.items.some(x=>!object(x)||typeof x.sku!=='string'||!x.sku)||new Set(r.items.map(x=>x.sku)).size!==r.items.length)throw Error('Ambiguous catalog.');
   state.options=options(r.rewards);if(!state.options.length)throw Error('No shop items available.');if(!state.options.some(i=>i.key===state.draft.reward))state.draft.reward=state.options[0].key;state.floors=r.categories.filter(floor).map(x=>({id:x.id,name:x.name,visible:x.visible===true}));state.codes=r.items.map(x=>x.sku);state.phase='ready';state.message=state.floors.length?'New products begin as hidden drafts. Creating a draft does not publish it.':'No enabled PokéCoin shop category is available. Open Categories to update a shop category first.';emit();
  }catch(_){if(active&&epoch===token){Object.assign(state,{phase:'error',floors:null,codes:null,options:[],message:'Draft options unavailable or access denied. Reload after checking staff access.'});emit();}}
 }
 function validate(){const args=payload(state.draft,state.options);if(!state.floors?.some(x=>x.id===args.p_row.categoryId))throw Error('Choose an available PokéCoin category.');if(state.codes?.includes(args.p_row.sku))throw Error('That catalog code already exists. Choose a different code.');return args;}
 async function save(){if(!active||state.phase!=='ready'||state.uncertain)return;const args=validate(),token=epoch;state.phase='saving';state.message='Creating one hidden draft…';emit();
  try{const r=await transport('admin_store_create_draft',args);if(!active||epoch!==token)return;
   const expected={...args.p_row,status:'draft',visible:false,featured:false,bits:0,productKind:'item',sort:100,sprite:state.options.find(i=>i.key===args.p_row.reward).sprite};
   if(r?.ok!==true||!object(r.item)||Object.keys(r.item).sort().join(',')!==Object.keys(expected).sort().join(',')||Object.keys(expected).some(k=>r.item[k]!==expected[k]))throw Error('Unconfirmed receipt.');
   state.phase='ready';state.uncertain=true;state.message='Hidden draft created. Reload the catalog to verify it before creating another.';emit();
  }catch(error){if(!active||epoch!==token)return;
   if(['42501','401','403'].includes(String(error?.code||error?.status))){Object.assign(state,{phase:'error',floors:null,codes:null,options:[],draft:empty(),uncertain:false,message:'Staff access changed or creation was denied. Draft data cleared; check access and reload.'});}
   else{state.phase='ready';state.uncertain=true;state.message=String(error?.code)==='23505'?'That catalog code is already in use. Reload the catalog before preparing another draft.':'Creation outcome uncertain. Do not retry. Reload the catalog and check the code in the product editor.';}emit();
  }
 }
 return{state,reset,dirty,validate,save,load,open(){active=true;return load();}};
}
function mount(root,transport){
 if(!root)return null;const doc=root.ownerDocument,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let query='',category='',dialog=null;const model=controller(transport,render);
 const art=i=>'<img src="images/items/'+i.sprite+'" alt="" width="64" height="64">';
 function render(){const s=model.state,focused=root.contains(doc.activeElement);dialog?.close();if(s.phase==='closed'){query='';category='';}
  root.innerHTML='<p class="create-status" role="status" tabindex="-1">'+esc(s.message)+'</p><button type="button" data-create-load '+(['loading','saving'].includes(s.phase)?'disabled':'')+'>'+(s.phase==='closed'?'Load draft options':'Reload draft options')+'</button><div data-create-body></div>';
  if(s.floors?.length){root.querySelector('[data-create-body]').innerHTML='<form data-create-form class="create-layout"><fieldset '+(s.phase==='saving'||s.uncertain?'disabled':'')+'><legend>New inventory product</legend><label>Public name<input name="name" required maxlength="120" value="'+esc(s.draft.name)+'"></label><label>Catalog code<input name="sku" required maxlength="40" pattern="[a-z0-9]+(-[a-z0-9]+)*" aria-describedby="create-code-help" value="'+esc(s.draft.sku)+'"></label><p id="create-code-help" class="muted">Internal reference: lower-case words separated by hyphens. This code cannot be changed after creation.</p><label>PokéCoin category<select name="categoryId" required><option value="">Choose an existing category</option>'+s.floors.map(f=>'<option value="'+esc(f.id)+'" '+(f.id===s.draft.categoryId?'selected':'')+'>'+esc(f.name)+(f.visible?'':' (hidden category)')+'</option>').join('')+'</select></label><label>Find an inventory item<input data-create-search type="search" placeholder="Search by name" value="'+esc(query)+'"></label><label>Item category<select data-create-category><option value="">All items</option>'+[...new Set(s.options.map(i=>i.category))].map(c=>'<option value="'+esc(c)+'" '+(c===category?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><p class="muted">Master Balls are available through staff gifts and Pass rewards only.</p><div class="create-items" data-create-items></div><div class="create-numbers"><label>Quantity<input name="quantity" type="number" required min="1" max="2147483647" step="1" value="'+s.draft.quantity+'"></label><label>PokéCoin price<input name="cost" type="number" required min="0" max="2147483647" step="1" value="'+s.draft.cost+'"></label></div><label>Short description<textarea name="blurb" rows="3" maxlength="500">'+esc(s.draft.blurb)+'</textarea></label><p data-create-error role="alert"></p><button type="submit">Review hidden draft</button></fieldset><aside class="create-preview" aria-label="Draft preview"><p class="eyebrow">Hidden draft</p><div data-create-preview></div><p class="muted">Not published · Not featured</p></aside></form>';list();preview();}
  if(focused)root.querySelector('.create-status').focus({preventScroll:true});
 }
 function list(){const h=root.querySelector('[data-create-items]');if(!h)return;const rows=model.state.options.filter(i=>(!category||i.category===category)&&matches(i.name,query));h.innerHTML=rows.map(i=>'<button type="button" data-create-item="'+i.key+'" aria-pressed="'+(model.state.draft.reward===i.key)+'">'+art(i)+'<span>'+esc(i.name)+'</span></button>').join('')||'<p>No items match this search.</p>';}
 function preview(){const h=root.querySelector('[data-create-preview]');if(!h)return;const d=model.state.draft,i=model.state.options.find(x=>x.key===d.reward);h.innerHTML=art(i)+'<h4>'+esc(d.name.trim()||'Your product name')+'</h4><p>'+esc(d.quantity)+' × '+esc(i.name)+'</p><p>'+(d.cost===0?'Free · 0 PokéCoins':esc(d.cost)+' PokéCoins')+'</p><p>'+esc(d.blurb)+'</p>';}
 function review(title,body,action,label){if(dialog)return;const opener=doc.activeElement,dlg=doc.createElement('dialog');dialog=dlg;dlg.className='create-dialog';dlg.setAttribute('aria-labelledby','create-dialog-title');dlg.innerHTML='<h3 id="create-dialog-title">'+esc(title)+'</h3>'+body+'<div class="create-actions"><button type="button" data-create-cancel autofocus>Back</button><button type="button" data-create-confirm>'+esc(label)+'</button></div>';root.append(dlg);dlg.querySelector('[data-create-cancel]').onclick=()=>dlg.close();dlg.querySelector('[data-create-confirm]').onclick=()=>{dlg.close();action();};dlg.onclose=()=>{dlg.remove();if(dialog===dlg)dialog=null;if(opener?.isConnected)opener.focus({preventScroll:true});};dlg.showModal();if(dlg.scrollHeight>dlg.clientHeight){const heading=dlg.querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});dlg.scrollTop=0;}}
 root.addEventListener('change',e=>{if(e.target.matches('[data-create-category]')){category=e.target.value;list();}});
 root.addEventListener('input',e=>{if(e.target.matches('[data-create-search]')){query=e.target.value;list();return;}const f=e.target.closest('[data-create-form]');if(!f||model.state.phase!=='ready'||model.state.uncertain)return;root.querySelector('[data-create-error]').textContent='';for(const k of ['name','sku','blurb','categoryId'])model.state.draft[k]=f.elements[k].value;for(const k of ['quantity','cost'])model.state.draft[k]=f.elements[k].value===''?NaN:Number(f.elements[k].value);preview();});
 root.addEventListener('click',e=>{const load=e.target.closest('[data-create-load]'),item=e.target.closest('[data-create-item]');if(load){if(model.state.phase==='saving')return;if(model.dirty()||model.state.uncertain)review('Reload draft options?','<p>This clears the local draft and reads the catalog. It never repeats a create request.</p>',()=>model.open(),'Reload options');else model.open();}else if(item&&model.state.phase==='ready'&&!model.state.uncertain){model.state.draft.reward=item.dataset.createItem;list();root.querySelector('[data-create-item="'+model.state.draft.reward+'"]').focus();preview();}});
 root.addEventListener('submit',e=>{if(!e.target.matches('[data-create-form]'))return;e.preventDefault();if(model.state.phase!=='ready'||model.state.uncertain)return;try{const d=copy(model.validate().p_row),i=model.state.options.find(x=>x.key===d.reward),f=model.state.floors.find(x=>x.id===d.categoryId);review('Create this hidden draft?','<div class="create-review-art">'+art(i)+'<h4>'+esc(d.name)+'</h4><p>'+d.quantity+' × '+esc(i.name)+'</p></div><dl><div><dt>Category</dt><dd>'+esc(f.name)+'</dd></div><div><dt>Price</dt><dd>'+(d.cost===0?'Free · 0 PokéCoins':d.cost+' PokéCoins')+'</dd></div><div><dt>Catalog code</dt><dd>'+esc(d.sku)+'</dd></div><div><dt>Description</dt><dd>'+esc(d.blurb||'No description')+'</dd></div></dl><p>Draft · Hidden · Not featured. Creating this draft does not publish it or give items to trainers.</p>',()=>model.save(),'Create hidden draft');}catch(error){root.querySelector('[data-create-error]').textContent=error.message;}});
 doc.defaultView.addEventListener('beforeunload',e=>{if(model.dirty()&&!model.state.uncertain){e.preventDefault();e.returnValue='';}});render();return model;
}
return{items,options,floor,payload,adapter,controller,mount,matches};
});
