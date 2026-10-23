const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const source = fs.readFileSync("js/auth.js", "utf8");
const actual = source.slice(source.indexOf("  async function twitchOAuthUrl("), source.indexOf("  window.playSignInWithPassword"));
async function check(link, sdkError, intentError) {
  const calls = [], navigations = []; let fetches = 0;
  const auth = {};
  for (const method of ["linkIdentity", "signInWithOAuth"]) auth[method] = async args => {
    calls.push({ method, args });
    return sdkError ? { error: { message: "Fictional provider unavailable" } } : { data: { url: "https://example.invalid/oauth" } };
  };
  const window = {
    playSupabase: { auth }, playSetOAuthIntent() {}, playRedirectTo: () => "https://example.invalid/signin.html",
    location: { origin: "https://example.invalid", pathname: "/settings.html", assign: url => navigations.push(url) },
    playCall: async () => { if (intentError) throw Error("Fictional intent failure"); }
  };
  const context = { window, TWITCH_SCOPES: "user:read:email user:read:subscriptions", fetch() { fetches++; return new Promise(() => {}); } };
  vm.createContext(context); vm.runInContext(actual, context);
  const result = link ? await window.playLinkTwitch({ intent: "reauthorize", target: "fictional-id" }) : await window.playSignInWithTwitch({ intent: "login" });
  assert.equal(fetches, 0, "OAuth navigation must not depend on a second fetch");
  assert.equal(result.ok, !sdkError); assert.equal(navigations.length, sdkError ? 0 : 1);
  assert.equal(calls[0].method, link ? "linkIdentity" : "signInWithOAuth");
  assert.equal(calls[0].args.provider, "twitch");
  assert.equal(calls[0].args.options.skipBrowserRedirect, true);
  assert.equal(calls[0].args.options.scopes, context.TWITCH_SCOPES);
  assert.equal(calls[0].args.options.redirectTo, link ? "https://example.invalid/settings.html#connections" : "https://example.invalid/signin.html");
}
(async () => {
  for (const link of [true, false]) for (const sdkError of [true, false]) for (const intentError of [true, false]) await check(link, sdkError, intentError);
  assert(!actual.includes("window.open"));
  console.log("Actual OAuth workflow: 8 link/login/error cases pass; unchanged scopes/targets, same-tab navigation, no extra URL probe.");
})().catch(error => { console.error(error); process.exitCode = 1; });
