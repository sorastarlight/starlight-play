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
assert(["high", "balanced", "low"].includes(window.playPerfMode()));
window.playSetPerfPref("low");
assert(window.playPerfMode() === "low");
window.playSetPerfPref("high");
assert(window.playPerfMode() === "high");
console.log("play-perf tests: 3 passed");
