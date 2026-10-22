/* node tests/play-perf-tests.js */
globalThis.window = globalThis;
globalThis.localStorage = {
  store: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem(key, value) { this.store[key] = String(value); }
};
globalThis.navigator = { hardwareConcurrency: 8 };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = {
  documentElement: { dataset: {} },
  body: { classList: { toggle() {} } },
  readyState: "complete",
  addEventListener() {}
};
require("../js/play-perf.js");

function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

window.playSetPerfPref("auto");
assert(window.playPerfPref() === "auto");
assert(window.playPerfMode() === "balanced", "AUTO defaults to BALANCED without deviceMemory");
assert(window.playPerfReduced() === false, "LOW is not reduced-motion");
window.playSetPerfPref("low");
assert(window.playPerfMode() === "low");
assert(window.playPerfReduced() === false, "manual LOW must keep capture wobble");
window.playSetPerfPref("high");
assert(window.playPerfMode() === "high");
window.playSetPerfPref("balanced");
assert(window.playPerfMode() === "balanced");
const src = require("fs").readFileSync(require("path").join(__dirname, "../js/play-perf.js"), "utf8");
assert(/memKnown && mem >= 8 && cores >= 6/.test(src), "HIGH requires known memory and cores");
const vm = require('node:vm');
function motionFixture(legacy = false, unavailable = false) {
  const media = { matches: false };
  const tokens = {};
  media[legacy ? 'addListener' : 'addEventListener'] = (...args) => { media.listener = args.at(-1); };
  const storage = { value: 'auto', getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  const doc = { readyState: 'complete', documentElement: { dataset: {} }, body: { classList: { toggle(key, value) { tokens[key] = value; } } } };
  const win = { matchMedia() { if (unavailable) throw Error('Unavailable'); return media; } };
  vm.runInNewContext(src, { window: win, document: doc, navigator: { hardwareConcurrency: 8 }, localStorage: storage });
  return { win, doc, tokens, change(reduced) { media.matches = reduced; media.listener?.({ matches: reduced }); } };
}
let f = motionFixture(); f.change(true);
assert(f.doc.documentElement.dataset.reducedMotion === '1' && f.doc.documentElement.dataset.perf === 'low', 'Live reduced-motion change updates AUTO attributes');
assert(f.tokens['is-perf-low'] === true, 'Live change updates body performance classes');
f.change(false); assert(f.doc.documentElement.dataset.reducedMotion === '0' && f.doc.documentElement.dataset.perf === 'balanced', 'AUTO recovers when reduced motion is cleared');
f.win.playSetPerfPref('high'); f.change(true); assert(f.doc.documentElement.dataset.perf === 'high' && f.doc.documentElement.dataset.reducedMotion === '1', 'Explicit HIGH preference preserved while reduced-motion flag updates');
f = motionFixture(true); f.change(true); assert(f.doc.documentElement.dataset.reducedMotion === '1', 'Legacy media listener supported');
f = motionFixture(false, true); assert(f.doc.documentElement.dataset.perf === 'balanced', 'Unavailable media API preserves safe initial rendering');
console.log("play-perf tests: 13 passed; mocked preference changes, not OS/device acceptance");
