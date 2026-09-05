(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    encounter: document.getElementById("encounter"),
    trainers: document.getElementById("trainer-count"),
    channel: document.getElementById("channel"),
    client: document.getElementById("twitch-client"),
    broadcaster: document.getElementById("twitch-broadcaster"),
    save: document.getElementById("save-channel"),
    saveStatus: document.getElementById("save-status"),
    commandStatus: document.getElementById("command-status"),
    settingsStatus: document.getElementById("settings-status"),
    dexPick: document.getElementById("dex-pick"),
    dexList: document.getElementById("dex-list"),
    passLogin: document.getElementById("pass-login"),
    passCount: document.getElementById("pass-count"),
    passStatus: document.getElementById("pass-admin-status"),
    hide: document.getElementById("toggle-hidden"),
    join: document.getElementById("join-seconds"),
    prepare: document.getElementById("prepare-seconds"),
    throw: document.getElementById("throw-seconds"),
    reveal: document.getElementById("reveal-seconds"),
    poke: document.getElementById("poke-chance"),
    great: document.getElementById("great-chance"),
    ultra: document.getElementById("ultra-chance"),
    berry: document.getElementById("berry-bonus"),
    bait: document.getElementById("bait-bonus"),
    maxChance: document.getElementById("max-chance")
  };
  let overview = null;

  function setSignedOut() {
    els.staff.hidden = true;
    els.gate.hidden = false;
    els.gate.textContent = "Sign in with the stream Twitch account to open staff tools.";
    window.playSetAccountNav(null);
  }

  window.playBindAccountNav({ onSignOut: setSignedOut });

  (window.PLAY_SPECIES || []).forEach((name, index) => {
    const option = document.createElement("option");
    option.value = `${index + 1} ${name}`;
    els.dexList.append(option);
  });

  let lastChannel = "";
  function loadStream(login) {
    const channel = (login || "").trim();
    if (channel === lastChannel) return;
    lastChannel = channel;
    if (!channel) {
      els.stream.removeAttribute("src");
      els.streamNote.textContent = "Set a Twitch login to preview the stream.";
      return;
    }
    const parent = encodeURIComponent(window.playTwitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Previewing ${channel}.`;
  }

  function fillSettings(settings) {
    if (!settings) return;
    els.join.value = settings.joinSeconds ?? 30;
    els.prepare.value = settings.prepareSeconds ?? 20;
    els.throw.value = settings.throwSeconds ?? 15;
    els.reveal.value = settings.revealSeconds ?? 12;
    els.poke.value = settings.ballChances?.pokeball ?? 0.45;
    els.great.value = settings.ballChances?.greatball ?? 0.6;
    els.ultra.value = settings.ballChances?.ultraball ?? 0.75;
    els.berry.value = settings.berryBonus ?? 0.1;
    els.bait.value = settings.maxBaitBonus ?? 0.15;
    els.maxChance.value = settings.maxCatchChance ?? 0.9;
  }

  function parseDex(value) {
    const text = (value || "").trim();
    if (!text) return null;
    const numbered = text.match(/^(\d{1,3})\b/);
    if (numbered) return Number(numbered[1]);
    const names = window.PLAY_SPECIES || [];
    const index = names.findIndex((name) => name.toLowerCase() === text.toLowerCase());
    return index >= 0 ? index + 1 : null;
  }

  function renderRound(round) {
    els.encounter.innerHTML = window.playRenderEncounter(round, {
      emptyNote: "Start a random encounter or Test Pikachu."
    });
    els.hide.textContent = round?.hidden ? "Show to viewers" : "Hide from viewers";
  }

  function applyOverview(data, fillForms) {
    overview = data;
    if (fillForms) {
      els.channel.value = data.channel || "";
      els.client.value = data.twitchClientId || "";
      els.broadcaster.value = data.twitchBroadcasterId || "";
      fillSettings(data.settings);
    }
    loadStream(data.channel);
    renderRound(data.round);
    els.trainers.textContent = `${data.trainers} trainer${data.trainers === 1 ? "" : "s"} on Play.`;
    els.passCount.textContent = `${data.passes || 0} Starlight Pass${data.passes === 1 ? "" : "es"} active.`;
  }

  async function refreshOverview(fillForms) {
    const { data, error } = await supabase.rpc("admin_overview");
    if (error) {
      els.commandStatus.textContent = window.playRpcError(error, "Could not load staff overview.");
      return;
    }
    applyOverview(data, fillForms);
  }

  async function loadHub() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(isAdmin) });
    if (error || !isAdmin) {
      els.staff.hidden = true;
      els.gate.hidden = false;
      els.gate.textContent = "This hub is limited to the stream Twitch account. Viewer logins cannot open staff tools.";
      return;
    }
    els.gate.hidden = true;
    els.staff.hidden = false;
    await refreshOverview(true);
  }

  async function run(name, args, statusEl) {
    const target = statusEl || els.commandStatus;
    target.textContent = "Working…";
    try {
      const data = await window.playCall(name, args);
      target.textContent = data?.message || "Done.";
      await refreshOverview(false);
    } catch (error) {
      target.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("start-random").addEventListener("click", () => run("admin_start_round", { p_dex: null }));
  document.getElementById("start-pikachu").addEventListener("click", () => run("admin_start_round", { p_dex: 25 }));
  document.getElementById("start-dex").addEventListener("click", () => {
    const dex = parseDex(els.dexPick.value);
    if (!dex) {
      els.commandStatus.textContent = "Pick a Pokédex number from 1 to 151.";
      return;
    }
    run("admin_start_round", { p_dex: dex });
  });
  document.getElementById("cancel-round").addEventListener("click", () => run("admin_cancel_round"));
  document.getElementById("sync-clock").addEventListener("click", () => run("play_sync"));
  document.getElementById("refill").addEventListener("click", () => run("admin_refill_test"));
  els.hide.addEventListener("click", () => run("admin_hide_round", { p_hidden: !overview?.round?.hidden }));
  els.save.addEventListener("click", () => run("admin_save_channel", {
    p_login: els.channel.value.trim().replace(/^@/, ""),
    p_client_id: els.client.value.trim(),
    p_broadcaster_id: els.broadcaster.value.trim()
  }, els.saveStatus));
  document.getElementById("save-settings").addEventListener("click", () => run("admin_save_game_settings", {
    p_settings: {
      joinSeconds: Number(els.join.value),
      prepareSeconds: Number(els.prepare.value),
      throwSeconds: Number(els.throw.value),
      revealSeconds: Number(els.reveal.value),
      ballChances: {
        pokeball: Number(els.poke.value),
        greatball: Number(els.great.value),
        ultraball: Number(els.ultra.value)
      },
      berryBonus: Number(els.berry.value),
      maxBaitBonus: Number(els.bait.value),
      maxCatchChance: Number(els.maxChance.value)
    }
  }, els.settingsStatus));
  document.getElementById("grant-pass").addEventListener("click", () => run("admin_set_pass", {
    p_login: els.passLogin.value,
    p_active: true
  }, els.passStatus));
  document.getElementById("revoke-pass").addEventListener("click", () => run("admin_set_pass", {
    p_login: els.passLogin.value,
    p_active: false
  }, els.passStatus));

  supabase.auth.onAuthStateChange(() => { loadHub(); });
  supabase.channel("play-staff")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, () => refreshOverview(false))
    .subscribe();
  setInterval(() => {
    if (!els.staff.hidden) refreshOverview(false);
  }, 2000);
  loadHub();
})();
