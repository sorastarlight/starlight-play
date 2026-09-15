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

const failed = results.filter((row) => !row.passed);
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
console.log(`identity tests: ${results.length} passed`);
