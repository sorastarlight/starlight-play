/* node tests/build-hygiene-tests.js */
globalThis.window = globalThis;
const store = {};
globalThis.sessionStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem(key, value) { store[key] = String(value); },
  removeItem(key) { delete store[key]; }
};
globalThis.location = {
  href: "https://play.example/index.html?playDebug=1",
  pathname: "/index.html",
  search: "?playDebug=1",
  replace(url) { this.replaced = String(url); this.href = String(url); }
};
require("../js/build.js");
require("../js/build-client.js");
require("../js/play-encounter-state.js");

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, detail: error.message });
  }
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

test("PLAY_BUILD matches generated build.js", () => {
  assert(Boolean(window.PLAY_BUILD), "missing PLAY_BUILD");
  assert(window.PLAY_BUILD === "20260916-rc9b", window.PLAY_BUILD);
  assert(window.PLAY_SPRITE_BUILD === "20260916-sp1", window.PLAY_SPRITE_BUILD);
});

test("mismatch is detected without auto-reload", () => {
  assert(window.playBuildMismatch("20260916-rc10") === true);
  assert(window.playBuildMismatch(window.PLAY_BUILD) === false);
  assert(window.playBuildMismatch("") === false);
  assert(!location.replaced, "location was replaced automatically");
});

test("idle mismatch shows update now and does not reload until clicked", () => {
  const el = {
    hidden: true,
    classList: { items: new Set(), toggle(name, on) { if (on) this.items.add(name); else this.items.delete(name); }, remove(...names) { names.forEach((n) => this.items.delete(n)); } },
    querySelector(sel) {
      if (sel === "#play-update-msg") return this.msg;
      if (sel === "#play-update-btn") return this.btn;
      return null;
    },
    msg: { textContent: "" },
    btn: { hidden: true, textContent: "", onclick: null }
  };
  const view = window.playRenderBuildNotice({ el, required: "20260916-rc10", round: null, busy: false });
  assert(view.idle === true, JSON.stringify(view));
  assert(el.hidden === false);
  assert(el.msg.textContent.includes("update is ready"));
  assert(typeof el.btn.onclick === "function");
  assert(!location.replaced);
});

test("encounter mismatch defers reload", () => {
  const el = {
    hidden: true,
    classList: { items: new Set(), toggle(name, on) { if (on) this.items.add(name); else this.items.delete(name); }, remove(...names) { names.forEach((n) => this.items.delete(n)); } },
    querySelector(sel) {
      if (sel === "#play-update-msg") return this.msg;
      if (sel === "#play-update-btn") return this.btn;
      return null;
    },
    msg: { textContent: "" },
    btn: { hidden: false, textContent: "Update now", onclick: null }
  };
  const round = { phase: "throw", resolved: false, cancelled: false };
  const view = window.playRenderBuildNotice({ el, required: "20260916-rc10", round, busy: false });
  assert(view.deferred === true, JSON.stringify(view));
  assert(el.msg.textContent.includes("keep your current encounter safe"));
  assert(el.btn.hidden === true);
  assert(!location.replaced);
});

test("result hold also defers reload", () => {
  const round = {
    phase: "closed",
    resolved: true,
    cancelled: false,
    updatedAt: new Date().toISOString(),
    deadlines: { reveal: new Date().toISOString() }
  };
  assert(window.playEncounterProtectsReload(round, { busy: false }) === true);
  const expired = {
    ...round,
    updatedAt: new Date(Date.now() - 60000).toISOString(),
    deadlines: { reveal: new Date(Date.now() - 60000).toISOString() }
  };
  assert(window.playEncounterProtectsReload(expired, { busy: false }) === false);
});

test("reload-loop protection blocks a second navigate", () => {
  Object.keys(store).forEach((key) => delete store[key]);
  location.replaced = "";
  const first = window.playApplyClientUpdate("20260916-rc10");
  assert(first.action === "navigate", JSON.stringify(first));
  assert(String(location.replaced).includes("app=20260916-rc10"));
  const second = window.playApplyClientUpdate("20260916-rc10");
  assert(second.action === "blocked", JSON.stringify(second));
  assert(second.reason === "reload-loop");
});

test("build info does not expose secrets", () => {
  const info = window.__starlightBuildInfo();
  const blob = JSON.stringify(info);
  assert(info.appBuild === window.PLAY_BUILD);
  assert(!/service_role|anon|eyJ/.test(blob), blob.slice(0, 200));
  assert(!/twitch.*secret/i.test(blob));
});

test("stale-client health view", () => {
  const healthy = window.playBuildHealthView({ clientBuild: window.PLAY_BUILD, dbMigration: "20260916140000" });
  assert(healthy.status === "HEALTHY", JSON.stringify(healthy));
  const stale = window.playBuildHealthView({ clientBuild: "20260914-rc2", dbMigration: "20260916140000" });
  assert(stale.status === "STALE CLIENT", JSON.stringify(stale));
  assert(stale.mismatch === true);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
