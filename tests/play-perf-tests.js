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
console.log("play-perf tests: 7 passed");
