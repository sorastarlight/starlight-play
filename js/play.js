(() => {
  const { supabaseUrl, supabaseKey } = window.PLAY_CONFIG;
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  });

  const els = {
    status: document.getElementById("auth-status"),
    signIn: document.getElementById("sign-in"),
    signOut: document.getElementById("sign-out"),
    setup: document.getElementById("twitch-setup"),
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    round: document.getElementById("round-status"),
    bag: document.getElementById("bag-status")
  };

  function redirectTo() {
    return new URL(".", window.location.href).href;
  }

  function twitchParent() {
    return window.location.hostname;
  }

  function setAuthUi(session, profile) {
    const signedIn = Boolean(session);
    els.signIn.hidden = signedIn;
    els.signOut.hidden = !signedIn;
    if (!signedIn) {
      els.status.textContent = "Sign in with Twitch to join encounters from this page.";
      els.bag.textContent = "Your bag appears after you sign in.";
      return;
    }
    const name = profile?.display_name || session.user.user_metadata?.preferred_username || "Trainer";
    els.status.textContent = `Signed in as ${name}.`;
  }

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setAuthUi(null);
      return null;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    setAuthUi(session, profile);
    const { data: bag } = await supabase.from("inventories").select("berry, bait, pokeball, greatball, ultraball").eq("user_id", session.user.id).maybeSingle();
    if (bag) {
      els.bag.textContent = `Berry ${bag.berry} · Bait ${bag.bait} · Poké Ball ${bag.pokeball} · Great ${bag.greatball} · Ultra ${bag.ultraball}`;
    }
    return { session, profile };
  }

  async function loadStream() {
    const { data: config } = await supabase.from("site_config").select("broadcaster_twitch_login").eq("id", 1).maybeSingle();
    const login = (config?.broadcaster_twitch_login || "").trim();
    if (!login) {
      els.streamNote.textContent = "Set the stream channel in Play site config to show the live player.";
      els.stream.removeAttribute("src");
      return;
    }
    const parent = encodeURIComponent(twitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Watching ${login} · this player follows the live Twitch channel.`;
  }

  function describeRound(round) {
    if (!round) return "No community encounter is visible yet. When a stream round starts, it will appear here.";
    const name = round.pokemon?.name || "a wild Pokémon";
    const phase = round.phase || "closed";
    if (phase === "closed") return "The last encounter has closed. Wait for the next stream round.";
    return `${name} is in the ${phase} phase.`;
  }

  async function loadRound() {
    const { data } = await supabase.from("encounter_rounds").select("phase, pokemon, hidden, ends_at, updated_at").eq("hidden", false).order("updated_at", { ascending: false }).limit(1);
    els.round.textContent = describeRound(data && data[0]);
  }

  async function signIn() {
    els.setup.hidden = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitch",
      options: {
        redirectTo: redirectTo(),
        scopes: "user:read:email"
      }
    });
    if (error) {
      els.setup.hidden = false;
      els.status.textContent = error.message || "Twitch sign-in is not enabled yet.";
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthUi(null);
  }

  els.signIn.addEventListener("click", signIn);
  els.signOut.addEventListener("click", signOut);
  supabase.auth.onAuthStateChange(() => { loadProfile(); });

  supabase.channel("play-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "stream_status" }, loadStream)
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, loadRound)
    .subscribe();

  loadProfile();
  loadStream();
  loadRound();
})();
