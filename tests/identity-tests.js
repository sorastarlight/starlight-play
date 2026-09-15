/* node tests/identity-tests.js */
globalThis.window = globalThis;
const store = {};
globalThis.sessionStorage = {
  setItem(key, value) { store[key] = String(value); },
  getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  removeItem(key) { delete store[key]; }
};
window.PLAY_CONFIG = { supabaseUrl: "https://example.supabase.co", supabaseKey: "anon" };
window.supabase = {
  createClient() {
    return {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => ({ error: null })
      },
      rpc: async () => ({ data: { ok: true }, error: null }),
      functions: { invoke: async () => ({ data: null, error: true }) }
    };
  }
};
require("../js/auth.js");

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

test("bot utility is not treated as primary", () => {
  assert(window.playTwitchConnectionKind({ type: "bot", primary: false }) === "bot");
  assert(window.playTwitchConnectionKindLabel({ type: "utility" }) === "Bot / Utility");
});
test("primary player stays primary", () => {
  assert(window.playTwitchConnectionKind({ type: "player", primary: true }) === "primary");
  assert(window.playTwitchConnectionKindLabel({ primary: true }).includes("Primary"));
});
test("secondary player is linked", () => {
  assert(window.playTwitchConnectionKind({ type: "player", primary: false }) === "linked");
});
test("oauth intent is stored separately from login", () => {
  window.playSetOAuthIntent("link", "1418634270");
  const read = window.playReadOAuthIntent();
  assert(read.intent === "link");
  assert(read.target === "1418634270");
  window.playClearOAuthIntent();
  assert(window.playReadOAuthIntent().intent === "");
});
test("sign out helper is available", () => {
  assert(typeof window.playSignOut === "function");
  assert(typeof window.playGuardTwitchLogin === "function");
});

require("../js/nav.js");
test("HTML escape encodes quotes and tags", () => {
  assert(window.playEscapeAttr('<img src="x">') === "&lt;img src=&quot;x&quot;>");
});
test("Twitch badge requires a confirmed linked identity", () => {
  assert(window.playTwitchLinked({ twitch_login: "legacy" }, {}) === false);
  assert(window.playTwitchLinked({ twitch_login: "legacy" }, { twitchLinked: false }) === false);
  assert(window.playTwitchLinked({}, { twitchLinked: true }) === true);
  assert(window.playTwitchFaceInner("https://img.example/a.png", "Sora", false).includes("twitch-badge") === false);
  assert(window.playTwitchFaceInner("https://img.example/a.png", "Sora", true).includes("twitch-badge"));
});
test("dialog helper falls back without showModal", () => {
  const dialog = { setAttribute(name, value) { this[name] = value; } };
  window.playShowDialog(dialog);
  assert(dialog.open === "");
});
test("loading gate remembers idle copy", () => {
  const gate = { hidden: true, textContent: "Sign in to continue.", dataset: {} };
  const app = { hidden: false };
  window.playSetLoadingGate(gate, app);
  assert(gate.textContent === "Loading…");
  assert(app.hidden === true);
  window.playRestoreGate(gate);
  assert(gate.textContent === "Sign in to continue.");
  assert(gate.hidden === false);
});

const failed = results.filter((row) => !row.passed);
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
console.log(`identity tests: ${results.length} passed`);
