// rc116 LOCAL HARNESS stub: real page scripts + real DOM, RPC answered from a read-only fixture.
// Any mutating RPC is refused and recorded in window.__qaBlocked (no server call is made).
(() => {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "/docs/audits/rc116/_fixture.json", false);
  xhr.send();
  const FIX = JSON.parse(xhr.responseText);
  window.__qaFixture = FIX;
  window.__qaBlocked = [];
  window.__qaCalls = [];
  const uid = FIX.trainer?.id || "qa-user";
  const session = { user: { id: uid, email: "" }, access_token: "qa" };
  const READ = {
    play_state: () => ({ ok: true, trainer: FIX.trainer, isAdmin: false, twitchLinked: true }),
    play_progression: () => ({ ok: true, trainer: FIX.trainer, cosmetics: FIX.cosmetics, titles: FIX.titles, badges: FIX.badges, achievements: FIX.achievements, ownedAvatarPacks: [] }),
    play_trainer: () => ({ ok: true, trainer: FIX.trainer, mine: true, catches: FIX.trainer?.team || [], recent: [] }),
    play_storage: () => ({ ok: true, mons: FIX.trainer?.team || [] }),
    play_notices: () => ({ notices: [] })
  };
  function stubCall(name, args) {
    window.__qaCalls.push(name);
    if (READ[name]) return Promise.resolve(JSON.parse(JSON.stringify(READ[name](args))));
    if (/^play_(save|set|equip|ack|buy|sell|claim|release|use|join|throw|grant)/.test(name) || /admin_/.test(name)) {
      window.__qaBlocked.push({ name, args });
      return Promise.reject(new Error(`QA harness: ${name} blocked (no mutation).`));
    }
    return Promise.resolve({ ok: true });
  }
  function chain() {
    const c = {
      select() { return c; }, eq() { return c; }, order() { return c; }, limit() { return c; }, in() { return c; },
      maybeSingle() { return Promise.resolve({ data: { display_name: FIX.trainer?.displayName, twitch_login: "qa", avatar_url: "", username: "qa" }, error: null }); },
      single() { return c.maybeSingle(); },
      then(res) { return Promise.resolve({ data: [], error: null }).then(res); }
    };
    return c;
  }
  function patchClient(client) {
    if (!client || client.__qa) return client;
    client.__qa = true;
    client.auth.getSession = () => Promise.resolve({ data: { session }, error: null });
    client.auth.getUser = () => Promise.resolve({ data: { user: session.user }, error: null });
    client.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
    client.from = () => chain();
    client.rpc = (name, args) => stubCall(name, args).then((data) => ({ data, error: null }), (error) => ({ data: null, error }));
    client.channel = () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} });
    client.removeChannel = () => {};
    return client;
  }
  let sb;
  Object.defineProperty(window, "playSupabase", { configurable: true, get() { return sb; }, set(v) { sb = patchClient(v); } });
  Object.defineProperty(window, "playCall", { configurable: true, get() { return stubCall; }, set() {} });
})();
