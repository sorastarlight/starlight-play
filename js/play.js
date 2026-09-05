(() => {
  const supabase = window.playSupabase;
  const els = {
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    round: document.getElementById("round-status"),
    bag: document.getElementById("bag-status")
  };

  window.playBindAccountNav({
    onSignOut() {
      els.bag.textContent = "Your bag appears after you sign in.";
    }
  });

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.bag.textContent = "Your bag appears after you sign in.";
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    window.playSetAccountNav(session, profile);
    const { data: bag } = await supabase.from("inventories").select("berry, bait, pokeball, greatball, ultraball").eq("user_id", session.user.id).maybeSingle();
    if (bag) {
      els.bag.textContent = `Berry ${bag.berry} · Bait ${bag.bait} · Poké Ball ${bag.pokeball} · Great ${bag.greatball} · Ultra ${bag.ultraball}`;
    }
  }

  async function loadStream() {
    const { data: config } = await supabase.from("site_config").select("broadcaster_twitch_login").eq("id", 1).maybeSingle();
    const login = (config?.broadcaster_twitch_login || "").trim();
    if (!login) {
      els.streamNote.textContent = "The stream channel is not set yet.";
      els.stream.removeAttribute("src");
      return;
    }
    const parent = encodeURIComponent(window.playTwitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Watching ${login}.`;
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

  supabase.auth.onAuthStateChange(() => { loadProfile(); });
  supabase.channel("play-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "stream_status" }, loadStream)
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, loadRound)
    .subscribe();

  loadProfile();
  loadStream();
  loadRound();
})();
