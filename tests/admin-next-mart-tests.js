const assert = require("node:assert/strict");
const fs = require("node:fs");
const api = require("../js/admin-next-mart.js");
const categories = [{ id: "kit", name: "Field Kit", kind: "coins" }];
const row = { sku: "berry-five", categoryId: "kit", name: "Berry Bundle", blurb: "Five berries", detail: "Details", cost: 80, bits: 0, grants: { berry: 5 }, status: "published", visible: true, featured: false, sprite: "oran-berry.png", thumb: "", sort: 21, productKind: "item", extra: { status: "published", detail: "Details", productKind: "item", future: { retained: true } }, unknown: { untouched: [1, 2] } };
const catalog = () => structuredClone({ categories, items: [row] });
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
(async () => {
  assert(api.eligible(row, categories));
  for (const change of [{ productKind: "avatar" }, { cost: -1 }, { visible: null }, { extra: { status: "draft" } }, { grants: { berry: 1.5 } }, { extra: [] }, { extra: { looks: {} } }]) assert.equal(api.eligible({ ...row, ...change }, categories), false);
  assert.equal(api.eligible(row, [{ ...categories[0], kind: "bits" }]), true);
  const edited = { ...api.draft(row), name: " Fresh Berries ", cost: "100", quantity: "7", detail: "New details", status: "draft", visible: true, featured: true };
  const payload = api.payload(row, edited, categories).p_row;
  assert.equal(payload.name, "Fresh Berries"); assert.equal(payload.cost, 100); assert.deepEqual(payload.grants, { berry: 7 });
  assert.equal(payload.status, "draft"); assert.equal(payload.visible, true); assert.equal(payload.extra.status, "draft"); assert.equal(payload.extra.detail, "New details");
  for (const key of ["sku", "categoryId", "sort", "sprite", "thumb", "bits", "productKind", "unknown"]) assert.deepEqual(payload[key], row[key]);
  assert.deepEqual(payload.extra.future, row.extra.future); assert.equal(row.grants.berry, 5);
  for (const value of ["", "-1", "1.2", "NaN", "Infinity", "9007199254740992", "1e3", " 5 "]) assert.throws(() => api.payload(row, { ...edited, cost: value }, categories));
  assert.throws(() => api.payload(row, { ...edited, quantity: "0" }, categories));
  assert.throws(() => api.payload(row, { ...edited, name: " " }, categories));
  assert.throws(() => api.payload(row, { ...edited, status: "removed" }, categories));
  const bundle={...row,grants:{berry:5,bait:2}};const bd=api.draft(bundle);bd.quantities.bait='4';assert.deepEqual(api.payload(bundle,bd,categories).p_row.grants,{berry:5,bait:4});
  assert.throws(()=>api.payload(bundle,{...bd,quantities:{berry:'5'}},categories));
  assert.equal(api.eligible({...row,grants:{masterball:1}},categories),false);
  const bits={...row,bits:100,extra:{...row.extra,bitsTitles:['Cheer reward']}};const bitDraft=api.draft(bits);bitDraft.bits='200';assert.equal(api.payload(bits,bitDraft,categories).p_row.bits,200);
  assert.throws(()=>api.payload(bits,{...bitDraft,bitsTitles:''},categories));
  const avatar={...row,productKind:'avatar',grants:{},extra:{...row.extra,productKind:'avatar',pack:'test',looks:['trainer-a']}};
  const ac=[{...categories[0],kind:'avatars'}];assert(api.eligible(avatar,ac));assert.deepEqual(api.payload(avatar,api.draft(avatar),ac).p_row.extra.looks,['trainer-a']);
  let calls = [], receipt = { sku: row.sku };
  const c = api.createController(async (name, args) => { calls.push([name, args]); if (name === "admin_store_get") return catalog(); if (receipt instanceof Error) throw receipt; return receipt; });
  await c.load(); assert.equal(calls.length, 0); await c.open(); c.select(row.sku); assert(!c.dirty());
  c.state.draft.cost = "100"; await c.save(); assert(c.state.uncertain); assert.equal(c.state.draft.cost, "100");
  await c.save(); assert.equal(calls.filter(x => x[0] === "admin_store_save_item").length, 1);
  assert.equal(c.select(row.sku), false); await c.load(); c.select(row.sku); assert.equal(c.state.draft.cost, "80");
  receipt = Error("connection lost"); c.state.draft.quantity = "6"; await c.save(); assert(c.state.uncertain); assert.equal(c.state.draft.quantity, "6"); await c.save();
  assert.equal(calls.filter(x => x[0] === "admin_store_save_item").length, 2);
  await c.load(); c.select(row.sku); receipt = Object.assign(Error("denied"), { code: "42501" }); c.state.draft.cost = "90"; await c.save(); assert.equal(c.state.catalog, null); assert.equal(c.state.draft, null);
  const pending = defer(); const stale = api.createController(() => pending.promise); const opening = stale.open(); stale.reset(); pending.resolve(catalog()); await opening; assert.equal(stale.state.phase, "closed"); assert.equal(stale.state.catalog, null);
  const first = defer(), second = defer(); let reads = 0; const race = api.createController(() => (++reads === 1 ? first.promise : second.promise)); const a = race.open(), b = race.load(); second.resolve({ categories, items: [] }); await b; first.resolve(catalog()); await a; assert.equal(race.state.catalog.items.length, 0);
  const saving = defer(); const switcher = api.createController(name => name === "admin_store_get" ? Promise.resolve(catalog()) : saving.promise); await switcher.open(); switcher.select(row.sku); switcher.state.draft.cost = "90"; const save = switcher.save(); switcher.reset(); saving.resolve({ sku: row.sku }); await save; assert.equal(switcher.state.catalog, null); assert.equal(switcher.state.phase, "closed");
  const invalid = api.createController(async () => ({ categories, items: [row, row] })); await invalid.open(); assert.equal(invalid.state.phase, "error"); assert.equal(invalid.state.catalog, null);
  const pendingSave = defer(); let writes = 0; const single = api.createController(name => name === "admin_store_get" ? Promise.resolve(catalog()) : (++writes, pendingSave.promise)); await single.open(); single.select(row.sku); single.state.draft.cost = "85"; const firstSave = single.save(); await single.save(); assert.equal(writes, 1); pendingSave.resolve({ sku: row.sku }); await firstSave;
  // A matching SKU cannot override an explicit failed response. Preserve the
  // historical minimal receipt and do not retry an uncertain write.
  for (const result of [{ok:false,sku:row.sku},{error:'rejected',sku:row.sku},null,{sku:'other'}]) {
    let attempts=0;
    const rejected=api.createController(async name=>name==='admin_store_get'?catalog():(attempts++,result));
    await rejected.open();rejected.select(row.sku);rejected.state.draft.cost='90';
    await rejected.save();assert.match(rejected.state.message,/could not be confirmed/);
    assert(rejected.state.uncertain);assert.equal(rejected.state.draft.cost,'90');
    await rejected.save();assert.equal(attempts,1);
  }
  const denied = api.createController(async () => { throw Object.assign(Error("denied"), { code: "42501" }); }); await denied.open(); assert.equal(denied.state.catalog, null);
  const hub = fs.readFileSync("js/admin-next.js", "utf8");
  const readList = hub.match(/const READ_RPCS = Object.freeze\(\[([\s\S]*?)\]\)/)[1]; assert(!readList.includes("admin_store"));
  assert(hub.includes('["admin_store_get", "admin_store_draft_options", "admin_store_save_item"].includes(name)')); assert(hub.includes('data?.session?.user?.id !== identity')); assert(hub.includes('generation !== hubGeneration'));
  // Execute the actual dedicated adapter, not a replacement implementation.
  const vm = require("node:vm"), adapterStart = hub.indexOf("async (name, args) => {"), adapterEnd = hub.indexOf("\n  }, { onCopy: openProductCopy });", adapterStart);
  const adapterCode = "(" + hub.slice(adapterStart, adapterEnd + 4) + ")";
  let identity = "staff-A", gate = true, actualCalls = [];
  const context = { supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: identity } } } }) } }, window: { playCall: async (...args) => { actualCalls.push(args); return { ok: true }; } } };
  Object.defineProperty(context, "staffOpen", { get: () => gate }); Object.defineProperty(context, "martIdentity", { get: () => "staff-A" });
  const adapter = vm.runInNewContext(adapterCode, context);
  await assert.rejects(adapter("admin_grant_bag")); gate = false; await assert.rejects(adapter("admin_store_get")); gate = true; identity = "staff-B"; await assert.rejects(adapter("admin_store_save_item", { p_row: row })); assert.equal(actualCalls.length, 0);
  identity = "staff-A"; await adapter("admin_store_get"); await adapter("admin_store_save_item", { p_row: row }); assert.deepEqual(actualCalls.map(x => x[0]), ["admin_store_get", "admin_store_save_item"]); assert.deepEqual(actualCalls[1][1], { p_row: row });
  console.log("Mart local model/controller: payload preservation, validation, denial, stale reads, account reset, uncertain writes and no automatic retry pass.");
})().catch(error => { console.error(error); process.exitCode = 1; });

const searchApi=require('../js/admin-next-mart.js');
const searchRows=[{sku:'ball-kit-1',name:'Poké Ball Bundle',blurb:'Five balls',categoryId:'balls',detail:'Adventure supplies'},{sku:'berry-kit',name:'Berry Bundle',categoryId:'kit',extra:{detail:'Supply for adventure'}}];
assert.deepEqual(searchApi.searchProducts(searchRows,'bundle poke').map(r=>r.sku),['ball-kit-1']);
assert.deepEqual(searchApi.searchProducts(searchRows,'POKÉ   ball').map(r=>r.sku),['ball-kit-1']);
assert.deepEqual(searchApi.searchProducts(searchRows,'kit-1').map(r=>r.sku),['ball-kit-1']);
assert.equal(searchApi.searchProducts(searchRows,'adventure','balls').length,1);
assert.equal(searchApi.searchProducts(searchRows,'poke','kit').length,0);
assert.equal(searchApi.searchProducts(searchRows,'missing').length,0);
assert.equal(searchApi.searchProducts(searchRows,'  ').length,2);
assert.equal(searchRows[0].name,'Poké Ball Bundle');
console.log('Mart multiword/accent/SKU/detail search and floor isolation pass.');

const international=[{sku:"jp",name:"東京セット",categoryId:"kit"},{sku:"plain",name:"Berry",categoryId:"kit"}];assert.deepEqual(searchApi.searchProducts(international,"東京").map(r=>r.sku),["jp"]);assert.equal(searchApi.searchProducts(international,"不存在").length,0);console.log("Non-Latin Mart searches no longer collapse to an empty filter.");
