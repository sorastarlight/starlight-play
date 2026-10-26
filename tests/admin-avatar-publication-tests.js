const assert=require('node:assert/strict'),api=require('../js/admin-next-mart');
const category={id:'avatars',kind:'avatars'},row={sku:'fictional-empty',categoryId:'avatars',name:'Avatar collection',blurb:'',cost:500,bits:0,grants:{},visible:false,featured:false,status:'draft',productKind:'avatar',extra:{pack:'fixture',productKind:'avatar',status:'draft',looks:[]}};
const d=api.draft(row);assert(api.eligible(row,[category]));assert.deepEqual(api.payload(row,d,[category]).p_row.extra.looks,[]);
for(const visible of [false,true])assert.throws(()=>api.payload(row,{...d,status:'published',visible},[category]),/at least one Trainer appearance/);
for(const visible of [false,true])assert.deepEqual(api.payload(row,{...d,status:'published',visible,looks:['fixture-style']},[category]).p_row.extra.looks,['fixture-style']);
assert.deepEqual(api.payload(row,{...d,status:'draft',looks:[]},[category]).p_row.extra.looks,[]);
console.log('Avatar publication: empty drafts remain editable; published collections require an appearance whether visible or hidden.');
