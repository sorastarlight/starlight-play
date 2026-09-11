(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    encounter: document.getElementById("encounter"),
    trainers: document.getElementById("trainer-count"),
    commandStatus: document.getElementById("command-status"),
    settingsStatus: document.getElementById("settings-status"),
    dexPick: document.getElementById("dex-pick"),
    dexSuggest: document.getElementById("dex-suggest"),
    genderRow: document.getElementById("gender-row"),
    shinyRow: document.getElementById("shiny-row"),
    formPreview: document.getElementById("form-preview"),
    formCopy: document.getElementById("form-copy"),
    hide: document.getElementById("toggle-hidden"),
    pause: document.getElementById("pause-round"),
    resume: document.getElementById("sync-clock"),
    gift: document.getElementById("gift-item"),
    giftModal: document.getElementById("gift-modal"),
    giftGrid: document.getElementById("gift-grid"),
    giftFilter: document.getElementById("gift-filter"),
    giftStatus: document.getElementById("gift-status"),
    clearLog: document.getElementById("clear-log"),
    console: document.getElementById("admin-console"),
    bridgeStatus: document.getElementById("bridge-status"),
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
  let pickGender = "";
  let pickShiny = false;
  let overviewTimer = 0;
  let lastChannel = "";
  let giftItems = [];

  function setSignedOut() {
    els.staff.hidden = true;
    els.gate.hidden = false;
    els.gate.textContent = "Sign in with Twitch to open the Admin Hub.";
    window.playSetAccountNav(null);
  }

  window.playBindAccountNav({ onSignOut: setSignedOut });

  function renderSuggest() {
    if (!els.dexSuggest) return;
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    if (!els.dexPick.value.trim() || matches.length === 0) {
      els.dexSuggest.hidden = true;
      els.dexSuggest.innerHTML = "";
      return;
    }
    els.dexSuggest.hidden = false;
    els.dexSuggest.innerHTML = matches.slice(0, 12).map((row) => (
      `<li><button type="button" data-dex="${row.dex}">${window.playPadDex(row.dex)} ${row.name}</button></li>`
    )).join("");
  }

  function pickSpecies(dex) {
    if (!dex) return;
    els.dexPick.value = `${window.playPadDex(dex)} ${window.playSpeciesName(dex)}`;
    if (els.dexSuggest) {
      els.dexSuggest.hidden = true;
      els.dexSuggest.innerHTML = "";
    }
    renderAppearance(dex);
  }

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
    const matches = window.playParseSpeciesQuery(value);
    return matches.length ? matches[0].dex : null;
  }

  function renderRound(round) {
    const shown = round && !round.cancelled ? round : null;
    els.encounter.innerHTML = window.playRenderEncounter(shown, {
      emptyNote: "Start a random encounter. The stream PC should pick it up."
    });
    els.hide.textContent = "Hide overlay";
  }

  function applyOverview(data, fillForms) {
    if (fillForms) fillSettings(data.settings);
    loadStream(data.channel);
    const shown = data.round && typeof window.playApplyLocalRound === "function"
      ? window.playApplyLocalRound(data.round)
      : data.round;
    renderRound(shown || data.round);
    if (typeof window.playRenderLiveFeed === "function") {
      window.playRenderLiveFeed(data.console || data.round, "admin-console");
    }
    els.trainers.textContent = `${data.trainers} trainer${data.trainers === 1 ? "" : "s"} on Play.`;
    const live = Boolean(shown && shown.phase && shown.phase !== "closed" && !shown.cancelled);
    const paused = Boolean(shown?.paused);
    if (els.pause) els.pause.disabled = !live || paused;
    if (els.resume) els.resume.disabled = !paused;
    if (els.gift) els.gift.disabled = !live;
    const bridge = data.bridge || {};
    if (els.bridgeStatus) {
      if (!bridge.configured) {
        els.bridgeStatus.innerHTML = `<span class="status-bad">Stream bridge is not linked yet.</span> A token should already be on this stream PC. Only create a new one if Data/play-bridge.json is missing.`;
      } else if (bridge.online) {
        els.bridgeStatus.innerHTML = `<span class="status-ok">Stream bridge online.</span> ${bridge.pending ? `${bridge.pending} command${bridge.pending === 1 ? "" : "s"} in flight.` : "Ready for staff commands."}`;
      } else {
        els.bridgeStatus.innerHTML = `<span class="status-bad">Stream bridge offline.</span> Commands wait until the Play bridge is running.`;
      }
      if (bridge.lastError && !/must join this encounter/i.test(bridge.lastError)) {
        els.bridgeStatus.innerHTML += ` Last stream note: ${bridge.lastError}`;
      }
    }
  }

  async function refreshOverview(fillForms) {
    try {
      const data = await window.playCall("admin_overview");
      applyOverview(data, fillForms);
    } catch (error) {
      const message = window.playRpcError(error, "Could not load staff overview.");
      if (els.bridgeStatus && !/failed to fetch|networkerror|load failed/i.test(message)) {
        els.bridgeStatus.innerHTML = `<span class="status-bad">${message}</span>`;
      }
    }
  }

  function scheduleOverview() {
    clearTimeout(overviewTimer);
    overviewTimer = setTimeout(() => refreshOverview(false), 600);
  }

  async function loadHub(passedSession) {
    const session = passedSession || (await supabase.auth.getSession()).data.session;
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
      els.gate.textContent = "This hub is for moderators and admins. Viewer logins cannot open it.";
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
      target.textContent = String(data?.message || "Done.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      target.textContent = window.playRpcError(error);
    }
  }

  function selectedGender(dex) {
    const options = window.playGenderOptions(dex);
    if (options.length === 1) return options[0];
    if (pickGender && options.includes(pickGender)) return pickGender;
    return dex ? (options[0] || "") : pickGender;
  }

  function mixPayload(dex) {
    const payload = {};
    if (dex) payload.dex = dex;
    const gender = selectedGender(dex);
    const shiny = pickShiny;
    if (gender) payload.gender = gender;
    if (dex || shiny) payload.shiny = shiny;
    const variant = window.playSpriteVariant(dex, gender, shiny);
    if (dex || shiny) payload.variant = variant;
    return payload;
  }

  function renderAppearance(dex) {
    const genderEl = els.genderRow;
    const shinyEl = els.shinyRow;
    if (!genderEl || !shinyEl) return;
    const options = window.playGenderOptions(dex);
    if (!dex) {
      genderEl.innerHTML = ["Male", "Female"].map((name) => (
        `<button type="button" data-gender="${name}" aria-pressed="${pickGender === name}">${name}</button>`
      )).join("");
    } else if (options.length === 1) {
      pickGender = options[0];
      genderEl.innerHTML = `<span class="chip">${options[0]}</span>`;
    } else {
      if (!options.includes(pickGender)) pickGender = options[0];
      genderEl.innerHTML = options.map((name) => (
        `<button type="button" data-gender="${name}" aria-pressed="${pickGender === name}">${name}</button>`
      )).join("");
    }
    shinyEl.innerHTML = `<button type="button" data-shiny="1" aria-pressed="${pickShiny}">Shiny</button>`;
    const gender = selectedGender(dex);
    const variant = window.playSpriteVariant(dex, gender, pickShiny);
    if (!dex) {
      if (els.formCopy) els.formCopy.textContent = pickShiny || pickGender
        ? `${pickGender || "Any gender"}${pickShiny ? " · Shiny" : ""} · random species`
        : "Pick a species to preview, or start a random encounter.";
      if (els.formPreview) els.formPreview.removeAttribute("src");
      return;
    }
    if (els.formPreview) {
      els.formPreview.onerror = function onPreviewError() {
        window.playSpriteOnError(els.formPreview);
      };
      els.formPreview.src = window.playSpriteUrl(dex, variant);
      els.formPreview.alt = `${window.playSpeciesName(dex)} ${gender}${pickShiny ? " Shiny" : ""}`;
    }
    if (els.formCopy) {
      const place = window.playHabitat(dex);
      els.formCopy.textContent = `${window.playSpeciesName(dex)} · ${gender}${pickShiny ? " · Shiny" : ""} · ${place}`;
    }
  }

  async function queueMix(action, payload) {
    els.commandStatus.textContent = "Working…";
    try {
      const data = await window.playCall("admin_queue_stream_command", { p_action: action, p_payload: payload || {} });
      els.commandStatus.textContent = String(data?.message || "Queued for the stream.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      const message = window.playRpcError(error);
      if (!/could not find|schema cache|does not exist|admin_queue_stream_command/i.test(message)) {
        els.commandStatus.textContent = message;
        return;
      }
      if (action === "start") return run("admin_start_round", {
        p_dex: payload?.dex ?? null,
        p_gender: payload?.gender ?? null,
        p_shiny: payload?.shiny ?? null
      });
      if (action === "cancel") return run("admin_cancel_round");
      if (action === "hide") return run("admin_hide_round", { p_hidden: true });
      els.commandStatus.textContent = message;
    }
  }

  document.getElementById("start-random").addEventListener("click", () => queueMix("start", mixPayload(null)));
  document.getElementById("start-dex").addEventListener("click", () => {
    const dex = parseDex(els.dexPick.value);
    if (!dex) {
      els.commandStatus.textContent = "Pick a Pokédex number from 1 to 151.";
      return;
    }
    queueMix("start", mixPayload(dex));
  });
  els.dexPick.addEventListener("input", () => {
    renderSuggest();
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    renderAppearance(matches.length === 1 ? matches[0].dex : parseDex(els.dexPick.value));
  });
  els.dexSuggest?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-dex]");
    if (!button) return;
    pickSpecies(Number(button.dataset.dex));
  });
  els.dexPick.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    if (matches[0]) pickSpecies(matches[0].dex);
  });
  els.genderRow?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-gender]");
    if (!button) return;
    pickGender = pickGender === button.dataset.gender && !parseDex(els.dexPick.value)
      ? ""
      : button.dataset.gender;
    renderAppearance(parseDex(els.dexPick.value));
  });
  els.shinyRow?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-shiny]");
    if (!button) return;
    pickShiny = !pickShiny;
    renderAppearance(parseDex(els.dexPick.value));
  });
  document.getElementById("cancel-round").addEventListener("click", async () => {
    els.commandStatus.textContent = "Working…";
    try {
      const data = await window.playCall("admin_cancel_round");
      try {
        await window.playCall("admin_queue_stream_command", { p_action: "cancel", p_payload: {} });
      } catch (_) {}
      els.commandStatus.textContent = String(data?.message || "Encounter cancelled.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      els.commandStatus.textContent = window.playRpcError(error);
    }
  });
  document.getElementById("sync-clock").addEventListener("click", () => run("admin_resume_round"));
  els.pause?.addEventListener("click", () => run("admin_pause_round"));
  els.clearLog?.addEventListener("click", async () => {
    els.commandStatus.textContent = "Working…";
    if (els.console) {
      els.console.innerHTML = `<li class="muted">Clearing…</li>`;
    }
    try {
      const data = await window.playCall("admin_clear_console");
      els.commandStatus.textContent = data?.message || "Public encounter log cleared.";
      if (typeof window.playRenderLiveFeed === "function") {
        window.playRenderLiveFeed(data?.console || [], "admin-console");
      }
      await refreshOverview(false);
    } catch (error) {
      els.commandStatus.textContent = window.playRpcError(error);
    }
  });

  function esc(value) {
    return window.playEscapeAttr ? window.playEscapeAttr(value) : String(value || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function renderGiftGrid() {
    if (!els.giftGrid) return;
    const q = String(els.giftFilter?.value || "").toLowerCase();
    const rows = giftItems.filter((item) => {
      const hay = `${item.name || ""} ${item.key || ""} ${item.floor || ""}`.toLowerCase();
      return !q || hay.includes(q);
    });
    els.giftGrid.innerHTML = rows.length
      ? rows.map((item) => `
          <button class="gift-pick" type="button" data-gift="${esc(item.key)}">
            <img src="${esc(window.playItemSprite(item.sprite || item.key))}" alt="">
            <strong>${esc(item.name || item.key)}</strong>
            <span>${esc(item.floor || "")}</span>
          </button>`).join("")
      : `<p class="muted">No supplies or Poké Balls match.</p>`;
  }

  async function openGiftModal() {
    if (!els.giftModal) return;
    if (els.giftStatus) els.giftStatus.textContent = "Loading items…";
    try {
      const data = await window.playCall("admin_gift_catalog");
      giftItems = (data?.items || []).filter((item) => item.key);
      renderGiftGrid();
      if (els.giftStatus) els.giftStatus.textContent = "Tap an item to send +1 to every trainer who joined.";
    } catch (error) {
      giftItems = [];
      renderGiftGrid();
      if (els.giftStatus) els.giftStatus.textContent = window.playRpcError(error);
    }
    if (typeof els.giftModal.showModal === "function") els.giftModal.showModal();
    else els.giftModal.setAttribute("open", "");
  }

  els.gift?.addEventListener("click", () => openGiftModal());
  els.giftFilter?.addEventListener("input", renderGiftGrid);
  els.giftGrid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-gift]");
    if (!button) return;
    const key = button.dataset.gift;
    if (els.giftStatus) els.giftStatus.textContent = "Sending…";
    try {
      const data = await window.playCall("admin_gift_joined", { p_key: key });
      if (els.giftStatus) els.giftStatus.textContent = data?.message || "Sent.";
      els.commandStatus.textContent = data?.message || "Sent.";
      await refreshOverview(false);
    } catch (error) {
      const message = window.playRpcError(error);
      if (els.giftStatus) els.giftStatus.textContent = message;
      els.commandStatus.textContent = message;
    }
  });
  els.hide.addEventListener("click", () => queueMix("hide"));
  document.getElementById("save-settings").addEventListener("click", async () => {
    const settings = {
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
    };
    els.settingsStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_save_game_settings", { p_settings: settings });
      try {
        const queued = await window.playCall("admin_queue_stream_command", { p_action: "settings", p_payload: settings });
        els.settingsStatus.textContent = String(queued?.message || saved?.message || "Saved.").replace(/Mix It Up/gi, "the stream");
      } catch (_) {
        els.settingsStatus.textContent = saved?.message || "Saved on Play. The stream PC will follow once the bridge is linked.";
      }
      await refreshOverview(false);
    } catch (error) {
      els.settingsStatus.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise(event)) return;
    loadHub(session);
  });
  supabase.channel("play-staff")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, scheduleOverview)
    .on("postgres_changes", { event: "*", schema: "public", table: "play_console_log" }, scheduleOverview)
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_activity" }, scheduleOverview)
    .subscribe();
  setInterval(() => {
    if (!els.staff.hidden) refreshOverview(false);
  }, 4000);
  loadHub();
})();
