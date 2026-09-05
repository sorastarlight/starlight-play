(() => {
  const supabase = window.playSupabase;
  const els = {
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    encounter: document.getElementById("encounter"),
    actions: document.getElementById("actions"),
    actionStatus: document.getElementById("action-status"),
    bag: document.getElementById("bag-status")
  };
  let state = null;
  let profile = null;

  window.playBindAccountNav({
    onSignOut() {
      profile = null;
      refresh();
    }
  });

  function phaseBar(round) {
    if (!round?.deadlines || !round.phase || round.phase === "closed") return 0;
    const keys = ["join", "prepare", "throw", "reveal"];
    const index = keys.indexOf(round.phase);
    const startKey = keys[index - 1];
    const start = startKey ? new Date(round.deadlines[startKey]).getTime() : new Date(round.startedAt).getTime();
    const end = new Date(round.deadlines[round.phase]).getTime();
    const now = Date.now();
    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100));
  }

  function renderActions(data) {
    const round = data?.round;
    const me = data?.me;
    const signedIn = Boolean(data?.bag);
    if (!round || round.phase === "closed") {
      els.actions.innerHTML = "";
      els.actionStatus.textContent = round?.resolved && me?.result
        ? (me.caught ? `You caught it! (${Math.round((me.chance || 0) * 100)}%)` : `Your result: ${me.result}.`)
        : "Waiting for the next wild Pokémon.";
      return;
    }
    if (!signedIn) {
      els.actions.innerHTML = "";
      els.actionStatus.textContent = "Sign in with Twitch to join this encounter.";
      return;
    }
    const buttons = [];
    if (round.phase === "join" && !me) buttons.push(["join", "Join encounter", null]);
    if (round.phase === "prepare" && me && !me.prep) {
      buttons.push(["prepare", "Use Berry", "berry"]);
      buttons.push(["prepare", "Use Bait", "bait"]);
    }
    if (round.phase === "throw" && me && me.prep && !me.ball) {
      buttons.push(["throw", "Poké Ball", "pokeball"]);
      buttons.push(["throw", "Great Ball", "greatball"]);
      buttons.push(["throw", "Ultra Ball", "ultraball"]);
    }
    if (!buttons.length) {
      els.actions.innerHTML = "";
      if (round.phase === "join" && me) els.actionStatus.textContent = "You joined. Wait for preparation.";
      else if (round.phase === "prepare" && me?.prep) els.actionStatus.textContent = `Prepared with ${window.playItemLabel(me.prep)}. Wait for throws.`;
      else if (round.phase === "throw" && me?.ball) els.actionStatus.textContent = `${window.playItemLabel(me.ball)} locked in.`;
      else if (round.phase === "reveal") els.actionStatus.textContent = me?.result || "Results incoming.";
      else if (round.phase !== "join") els.actionStatus.textContent = "You needed to join during the join window.";
      else els.actionStatus.textContent = "";
      return;
    }
    els.actionStatus.textContent = "";
    els.actions.innerHTML = buttons.map(([kind, label, item]) => (
      `<button type="button" data-kind="${kind}" data-item="${item || ""}">${label}</button>`
    )).join("");
  }

  function render(data) {
    state = data;
    const round = data?.round;
    els.encounter.innerHTML = window.playRenderEncounter(round, { bar: phaseBar(round) });
    els.bag.innerHTML = window.playRenderBagStrip(data?.bag);
    renderActions(data);
    window.playSetAccountNav(
      window._playSession || null,
      profile,
      { isAdmin: Boolean(data?.isAdmin) }
    );
  }

  let lastChannel = "";
  function loadStream(login) {
    const channel = (login || "").trim();
    if (channel === lastChannel) return;
    lastChannel = channel;
    if (!channel) {
      els.stream.removeAttribute("src");
      els.streamNote.textContent = "The stream channel is not set yet.";
      return;
    }
    const parent = encodeURIComponent(window.playTwitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Watching ${channel}.`;
  }

  async function refresh() {
    try {
      const data = await window.playCall("play_sync");
      if (data?.channel !== undefined) loadStream(data.channel);
      render(data);
    } catch (error) {
      els.actionStatus.textContent = window.playRpcError(error, "Could not load the encounter.");
    }
  }

  async function act(kind, item) {
    try {
      const data = kind === "join"
        ? await window.playCall("play_join")
        : kind === "prepare"
          ? await window.playCall("play_prepare", { p_item: item })
          : await window.playCall("play_throw", { p_item: item });
      render(data);
      els.actionStatus.textContent = data.message || "";
    } catch (error) {
      els.actionStatus.textContent = window.playRpcError(error);
    }
  }

  els.actions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    act(button.dataset.kind, button.dataset.item);
  });

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    window._playSession = session;
    if (!session) {
      profile = null;
      window.playSetAccountNav(null);
      await refresh();
      return;
    }
    const { data } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    profile = data;
    window.playSetAccountNav(session, profile);
    await refresh();
  }

  supabase.auth.onAuthStateChange(() => { loadProfile(); });
  supabase.channel("play-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "stream_status" }, refresh)
    .subscribe();
  setInterval(refresh, 1000);
  loadProfile();
})();
