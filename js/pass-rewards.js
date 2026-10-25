/* Render only the server-provided public projection or a completed claim receipt. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_PASS_REWARDS=api;})(globalThis,()=>{
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rows(input){if(!Array.isArray(input)||input.length>100)return [];return input.map(r=>{if(r?.secret===true)return{name:'Secret Gift',sprite:'images/items/secret-gift.svg',secret:true};if(!r||typeof r.name!=='string'||!Number.isSafeInteger(r.quantity)||r.quantity<1)return null;const sprite=/^images\/[a-zA-Z0-9_./-]+\.(png|svg|webp)$/.test(r.sprite||'')&&!r.sprite.includes('..')?r.sprite:'images/items/secret-gift.svg';return{name:r.name,sprite,quantity:r.quantity,secret:false,...(Number.isSafeInteger(r.level)?{level:r.level}:{}),...(r.shiny===true?{shiny:true}:{})};}).filter(Boolean);}
const text=r=>r.secret?'Secret Gift':`${r.shiny?'Shiny ':''}${r.name} ×${r.quantity}${r.level?' · Level '+r.level:''}`;
function html(input){return '<ul class="pass-reward-contents" tabindex="0" aria-label="Rewards">'+rows(input).map(r=>`<li><img src="${esc(r.sprite)}" alt="" width="40" height="40"><span>${esc(text(r))}</span></li>`).join('')+'</ul>';}
return{rows,text,html};
});
