(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    round: document.getElementById("round-status"),
    trainers: document.getElementById("trainer-count"),
    channel: document.getElementById("channel"),
    save: document.getElementById("save-channel"),
    saveStatus: document.getElementById("save-status")
  };

  function setSignedOut() {
    els.staff.hidden = true;
    els.gate.hidden = false;
    els.gate.textContent = "Sign in with the stream Twitch account to open staff tools.";
    window.playSetAccountNav(null);
  }

  window.playBindAccountNav({ onSignOut: setSignedOut });

  function describeRound(round) {
    if (!round) return "No encounter has been published yet.";
    const name = round.pokemon?.name || "a wild Pokémon";
    const visibility = round.hidden ? "hidden from viewers" : "visible to viewers";
    return `${name} · ${round.phase || "closed"} · ${visibility}.`;
  }

  function loadStream(login) {
    const channel = (login || "").trim();
    if (!channel) {
      els.stream.removeAttribute("src");
      els.streamNote.textContent = "Set a Twitch login to preview the stream.";
      return;
    }
    const parent = encodeURIComponent(window.playTwitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Previewing ${channel}.`;
  }

  async function refreshOverview() {
    const { data, error } = await supabase.rpc("admin_overview");
    if (error) {
      els.round.textContent = "Could not load staff overview.";
      els.trainers.textContent = error.message;
      return;
    }
    els.channel.value = data.channel || "";
    loadStream(data.channel);
    els.round.textContent = describeRound(data.round);
    els.trainers.textContent = `${data.trainers} trainer account${data.trainers === 1 ? "" : "s"} on Play.`;
  }

  async function loadHub() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    window.playSetAccountNav(session, profile);
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    if (error || !isAdmin) {
      els.staff.hidden = true;
      els.gate.hidden = false;
      els.gate.textContent = "This hub is limited to the stream Twitch account. Viewer logins cannot open staff tools.";
      return;
    }
    els.gate.hidden = true;
    els.staff.hidden = false;
    await refreshOverview();
  }

  async function saveChannel() {
    els.saveStatus.textContent = "Saving…";
    const login = els.channel.value.trim().replace(/^@/, "");
    const { error } = await supabase.from("site_config").update({ broadcaster_twitch_login: login }).eq("id", 1);
    if (error) {
      els.saveStatus.textContent = error.message;
      return;
    }
    els.saveStatus.textContent = "Channel saved.";
    loadStream(login);
  }

  els.save.addEventListener("click", saveChannel);
  supabase.auth.onAuthStateChange(() => { loadHub(); });
  loadHub();
})();
