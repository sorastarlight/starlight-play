const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync("js/admin-next.js", "utf8"), html = fs.readFileSync("admin-next.html", "utf8");
const keys = ["operations", "trainers", "support", "mart", "config", "analytics", "system"];
const tabs = keys.map(key => ({ dataset: { nextTab: key }, tabIndex: -1, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, focus(options) { focused = this; assert.equal(options.preventScroll, true); } }));
const panels = keys.map(key => ({ dataset: { nextPanel: key }, hidden: true }));
let focused = tabs[3], pushes = [], calls = [], handler;
const document = {
  querySelectorAll(selector) { return selector === "[data-next-tab]" ? tabs : panels; },
  querySelector() { return { addEventListener(name, callback) { assert.equal(name, "keydown"); handler = callback; } }; }
};
const start = source.indexOf('document.querySelector(".hub-nav-list")?.addEventListener("keydown"'), end = source.indexOf('\n  els.trainerSearch', start);
vm.runInNewContext(source.slice(start, end), { document });
function press(key, index, modifiers = {}) {
  let prevented = false;
  handler({ key, target: { closest: () => index < 0 ? null : tabs[index] }, preventDefault() { prevented = true; }, ...modifiers });
  return prevented;
}
assert(press("ArrowDown", 3)); assert.equal(focused, tabs[4]); assert.equal(tabs.filter(t => t.tabIndex === 0).length, 1);
assert(press("ArrowUp", 0)); assert.equal(focused, tabs[6]);
assert(press("ArrowDown", 6)); assert.equal(focused, tabs[0]);
assert(press("Home", 5)); assert.equal(focused, tabs[0]);
assert(press("End", 1)); assert.equal(focused, tabs[6]);
for (const key of ["Enter", " ", "Tab", "ArrowRight", "Escape"]) assert.equal(press(key, 2), false);
assert.equal(press("ArrowDown", 2, { ctrlKey: true }), false); assert.equal(press("Home", -1), false);
// Execute the unchanged section activation path with its actual new roving-index assignment.
const show = source.slice(source.indexOf("  function showTab("), source.indexOf("  async function loadHealth("));
const context = { coinLedger:{cleared:0,reset(){this.cleared++;}}, systemConnections: {cleared:0,hideSensitive(){this.cleared++;}}, document, URL, window: { location: { href: "https://example.test/admin-next.html?section=mart" } }, history: { pushState(a,b,path) { pushes.push(path); }, replaceState() {} }, resolveTab: key => keys.includes(key) ? key : "operations", staffOpen: false, sessionControls: null, loadHealth: () => calls.push("health"), startOpsPoll: () => calls.push("ops"), stopOpsPoll: () => calls.push("stop"), trainerDirLoaded: false, mart: null };
vm.runInNewContext(show + '\nshowTab("mart", true);', context);
assert.equal(tabs[3].tabIndex, 0); assert.equal(tabs[3].attrs["aria-selected"], "true");
assert.equal(tabs.filter(t => t.tabIndex === 0).length, 1); assert.equal(panels.filter(p => !p.hidden).length, 1); assert.equal(panels[3].hidden, false);
assert.equal(context.systemConnections.cleared,1);assert.equal(context.coinLedger.cleared,1);assert.equal(pushes[0], "/admin-next.html?section=mart"); assert.deepEqual(calls, ["stop"]);
for (const key of keys) {
  assert(html.includes(`id="next-tab-${key}" aria-controls="next-panel-${key}"`));
  assert(html.includes(`id="next-panel-${key}" role="tabpanel" aria-labelledby="next-tab-${key}"`));
}
assert(html.includes('aria-orientation="vertical"')); assert(html.includes('aria-controls="next-hub-tabs"'));
console.log("Admin tabs: manual activation, wrap/Home/End, modified/unhandled keys, one tab stop and seven panel associations pass.");
