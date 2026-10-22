// Offline contract: runtime pages use the reviewed external SDK artifact, with one explicit protected-file exception.
const fs=require('fs'),assert=require('node:assert/strict');
const lock=JSON.parse(fs.readFileSync('vendor-lock.json','utf8')),expected=new Map(lock.sdk.pages.map(page=>[page,{url:lock.sdk.url,integrity:lock.sdk.integrity}]));
for(const row of lock.exceptions)expected.set(row.page,{url:row.url});
assert.equal(new Set(lock.sdk.pages).size,lock.sdk.pages.length,'Duplicate locked pages');assert(!lock.sdk.pages.includes('admin.html'));
assert.match(lock.sdk.url,/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.\d+\.\d+$/);
assert.equal(Buffer.from(lock.sdk.integrity.replace(/^sha384-/,''),'base64').length,48);
let pages=0;
for(const file of fs.readdirSync('.').filter(name=>name.endsWith('.html'))){const tags=[...fs.readFileSync(file,'utf8').matchAll(/<script\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes('supabase-js'));if(!tags.length){assert(!expected.has(file),'Locked page missing SDK '+file);continue}assert.equal(tags.length,1,'Exactly one SDK script: '+file);const want=expected.get(file);assert(want,'Unreviewed SDK page '+file);const attrs=Object.fromEntries([...tags[0].matchAll(/\b(src|integrity|crossorigin)=["']([^"']*)["']/g)].map(m=>[m[1],m[2]]));assert.equal(attrs.src,want.url,file+' SDK artifact');if(want.integrity){assert.equal(attrs.integrity,want.integrity,file+' integrity');assert.equal(attrs.crossorigin,'anonymous',file+' CORS mode')}pages++;}
assert.equal(pages,expected.size);console.log(pages+' runtime SDK tags verified; '+lock.sdk.pages.length+' exact/integrity pins and '+lock.exceptions.length+' documented unchanged exceptions; offline/no client or RPC');
