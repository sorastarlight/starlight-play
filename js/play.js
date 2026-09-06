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
  let lastChannel = "";
  let lastEncounterKey = "";
  let lastActionKey = "";
  let lureJoinRound = "";
  let acting = false;

  window.playBindAccountNav({
    onSignOut() {
      profile = null;
      lastActionKey = "";
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

  function actionPlan(data) {
    const round = data?.round;
    const me = data?.me;
    const bag = data?.bag || {};
    const signedIn = Boolean(data?.bag);
    if (!round || round.phase === "closed") {
      return {
        key: `idle:${round?.id || ""}:${me?.result || ""}`,
        buttons: [],
        status: round?.resolved && me?.result
          ? (me.caught ? `You caught it! (${Math.round((me.chance || 0) * 100)}%)` : `Your result: ${me.result}.`)
          : "Waiting for the next wild Pokémon."
      };
    }
    if (!signedIn) {
      return { key: "signin", buttons: [], status: "Sign in with Twitch to join this encounter." };
    }
    const buttons = [];
    if (round.phase === "join" && !me) {
      if (bag.lureArmed && lureJoinRound !== round.id) {
        lureJoinRound = round.id;
        act("join", "");
      }
      buttons.push({
        kind: "join",
        item: "",
        label: "Join encounter",
        hint: bag.lureArmed ? "Lure joining…" : "Take this turn"
      });
    }
    if (round.phase === "prepare" && me && !me.prep) {
      buttons.push({ kind: "prepare", item: "berry", label: "Berry", hint: `${bag.berry ?? 0} left · +catch` });
      buttons.push({ kind: "prepare", item: "bait", label: "Bait", hint: `${bag.bait ?? 0} left · team bonus` });
    }
    if (round.phase === "throw" && me && me.prep && !me.ball) {
      buttons.push({ kind: "throw", item: "pokeball", label: "Poké Ball", hint: `${bag.pokeball ?? 0} left` });
      buttons.push({ kind: "throw", item: "greatball", label: "Great Ball", hint: `${bag.greatball ?? 0} left` });
      buttons.push({ kind: "throw", item: "ultraball", label: "Ultra Ball", hint: `${bag.ultraball ?? 0} left` });
    }
    if (!buttons.length) {
      let status = "";
      if (round.phase === "join" && me) status = "You joined. Wait for preparation.";
      else if (round.phase === "prepare" && me?.prep) status = `Prepared with ${window.playItemLabel(me.prep)}. Wait for throws.`;
      else if (round.phase === "throw" && me?.ball) status = `${window.playItemLabel(me.ball)} locked in.`;
      else if (round.phase === "reveal") status = me?.result || "Results incoming.";
      else if (round.phase !== "join") status = "You needed to join during the join window.";
      return { key: `wait:${round.phase}:${me?.prep || ""}:${me?.ball || ""}`, buttons, status };
    }
    return { key: buttons.map((row) => `${row.kind}:${row.item}:${row.hint}`).join("|"), buttons, status: "" };
  }

  function renderActions(data) {
    const plan = actionPlan(data);
    if (plan.key === lastActionKey && els.actions.children.length === plan.buttons.length) {
      if (plan.status) els.actionStatus.textContent = plan.status;
      return;
    }
    lastActionKey = plan.key;
    els.actionStatus.textContent = plan.status;
    els.actions.classList.toggle("single", plan.buttons.length === 1);
    els.actions.innerHTML = plan.buttons.map((row) => (
      `<button type="button" class="item-btn" data-kind="${row.kind}" data-item="${row.item}">
        <span class="item-icon" aria-hidden="true"></span>
        <span class="item-copy"><strong>${row.label}</strong><em>${row.hint}</em></span>
      </button>`
    )).join("");
  }

  function render(data) {
    state = data;
    const round = data?.round;
    const key = `${round?.id || "none"}:${round?.phase || "idle"}:${round?.variant || ""}:${round?.hidden || false}`;
    const bar = phaseBar(round);
    if (key !== lastEncounterKey) {
      lastEncounterKey = key;
      els.encounter.innerHTML = window.playRenderEncounter(round, { bar });
    } else {
      window.playPatchEncounter(els.encounter, round, bar);
    }
    els.bag.innerHTML = window.playRenderBagStrip(data?.bag);
    renderActions(data);
    window.playSetAccountNav(window._playSession || null, profile, {
      isAdmin: Boolean(data?.isAdmin),
      trainer: data?.trainer
    });
  }

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
    if (acting) return;
    acting = true;
    try {
      const data = kind === "join"
        ? await window.playCall("play_join")
        : kind === "prepare"
          ? await window.playCall("play_prepare", { p_item: item })
          : await window.playCall("play_throw", { p_item: item });
      lastActionKey = "";
      render(data);
      els.actionStatus.textContent = data.message || "";
    } catch (error) {
      els.actionStatus.textContent = window.playRpcError(error);
    } finally {
      acting = false;
    }
  }

  els.actions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button || button.disabled) return;
    button.disabled = true;
    act(button.dataset.kind, button.dataset.item || "").finally(() => {
      if (button.isConnected) button.disabled = false;
    });
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

  async function heartbeat() {
    if (document.visibilityState !== "visible") return;
    if (!window._playSession) return;
    try {
      const data = await window.playCall("play_heartbeat", { p_seconds: 20 });
      if (data) render(data);
    } catch (_) {
      // Rankings still work if the heartbeat RPC is not live yet.
    }
  }

  supabase.auth.onAuthStateChange(() => { loadProfile(); });
  supabase.channel("play-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "stream_status" }, refresh)
    .subscribe();
  setInterval(refresh, 1000);
  setInterval(heartbeat, 20000);
  loadProfile();
})();
