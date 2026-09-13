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
    clearRound: document.getElementById("clear-round"),
    advancePhase: document.getElementById("advance-phase"),
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
    capMin: document.getElementById("cap-min"),
    capMax: document.getElementById("cap-max"),
    capShiny: document.getElementById("cap-shiny"),
    capEvent: document.getElementById("cap-event"),
    capHoneyBonus: document.getElementById("cap-honey-bonus"),
    capReward: document.getElementById("cap-reward"),
    capTiers: document.getElementById("cap-tiers"),
    capHoney: document.getElementById("cap-honey"),
    balanceStatus: document.getElementById("balance-status"),
    simBall: document.getElementById("sim-ball"),
    simBerry: document.getElementById("sim-berry"),
    simOut: document.getElementById("sim-out"),
    reportDays: document.getElementById("report-days"),
    reportOut: document.getElementById("report-out"),
    ecoOverview: document.getElementById("eco-overview"),
    ecoJoin: document.getElementById("eco-join"),
    ecoCatch: document.getElementById("eco-catch"),
    ecoDex: document.getElementById("eco-dex"),
    ecoShiny: document.getElementById("eco-shiny"),
    ecoLegend: document.getElementById("eco-legend"),
    ecoStream: document.getElementById("eco-stream"),
    ecoStatus: document.getElementById("economy-status"),
    ecoSimOut: document.getElementById("eco-sim-out"),
    ecoLedger: document.getElementById("eco-ledger"),
    progOverview: document.getElementById("prog-overview"),
    progXpBase: document.getElementById("prog-xp-base"),
    progXpExp: document.getElementById("prog-xp-exp"),
    progJoinXp: document.getElementById("prog-join-xp"),
    progCatchXp: document.getElementById("prog-catch-xp"),
    progStatus: document.getElementById("progression-status"),
    collectionOverview: document.getElementById("collection-overview"),
    collectionStatus: document.getElementById("collection-status"),
    candySimOut: document.getElementById("candy-sim-out")
  };
  let pickGender = "";
  let pickShiny = false;
  let overviewTimer = 0;
  let lastChannel = "";
  let giftItems = [];
  let lastOverview = null;
  let lastHubKey = "";

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
    els.prepare.value = settings.prepareSeconds ?? 30;
    els.throw.value = settings.throwSeconds ?? 30;
    els.reveal.value = settings.revealSeconds ?? 15;
  }

  function parseDex(value) {
    const matches = window.playParseSpeciesQuery(value);
    return matches.length ? matches[0].dex : null;
  }

  function hubRound(round) {
    if (!round || round.cancelled) return null;
    if (typeof window.playApplyLocalRound === "function") return window.playApplyLocalRound(round);
    return round;
  }

  function renderRound(round) {
    const shown = hubRound(round);
    const bar = typeof window.playPhaseBarPercent === "function" ? window.playPhaseBarPercent(shown) : 0;
    const key = shown
      ? `${shown.id}:${shown.phase}:${shown.resolved || false}:${shown.paused || false}:${shown.hidden || false}`
      : "idle";
    const live = Boolean(shown && shown.phase && shown.phase !== "closed" && !shown.cancelled && !shown.resolved);
    if (els.clearRound) els.clearRound.disabled = !shown || live;
    if (els.advancePhase) {
      els.advancePhase.disabled = !shown || shown.phase === "closed" || shown.cancelled;
    }
    if (typeof window.playRenderLiveFeed === "function" && lastOverview) {
      window.playRenderLiveFeed(lastOverview.console || [], "admin-console", shown);
    }
    if (shown && String(lastHubKey).startsWith(`${shown.id}:`)
      && window.playPatchEncounter(els.encounter, shown, bar, { staff: true })) {
      lastHubKey = key;
      return;
    }
    if (key === lastHubKey && els.encounter.querySelector(".dex-stage, .dex-idle")) return;
    lastHubKey = key;
    els.encounter.innerHTML = window.playRenderEncounter(shown, {
      staff: true,
      bar,
      emptyNote: "Start a random encounter. The stream PC should pick it up."
    });
    els.hide.textContent = "Hide overlay";
  }

  function applyOverview(data, fillForms) {
    if (fillForms) fillSettings(data.settings);
    loadStream(data.channel);
    lastOverview = data;
    const shown = hubRound(data.round);
    renderRound(data.round);
    if (typeof window.playRenderLiveFeed === "function") {
    window.playRenderLiveFeed(data.console || [], "admin-console", shown);
    }
    els.trainers.textContent = `${data.trainers} trainer${data.trainers === 1 ? "" : "s"} on Play.`;
    const live = Boolean(shown && shown.phase && shown.phase !== "closed" && !shown.cancelled);
    const paused = Boolean(shown?.paused);
    if (els.pause) els.pause.disabled = !live || paused;
    if (els.resume) els.resume.disabled = !paused;
    if (els.gift) els.gift.disabled = !live;
    if (els.advancePhase) {
      els.advancePhase.disabled = !shown || shown.phase === "closed" || shown.cancelled;
    }
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
    await loadCapture();
    await loadEconomy();
    await loadProgression();
    await loadCollection();
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
  els.clearRound?.addEventListener("click", async () => {
    els.commandStatus.textContent = "Working…";
    try {
      const data = await window.playCall("admin_clear_round");
      els.commandStatus.textContent = data?.message || "Encounter cleared.";
      applyOverview(data, false);
    } catch (error) {
      els.commandStatus.textContent = window.playRpcError(error);
    }
  });
  els.advancePhase?.addEventListener("click", () => run("admin_advance_phase"));
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
      revealSeconds: Number(els.reveal.value)
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

  let captureBalance = null;

  function pct(value) {
    return `${Math.round(Number(value || 0) * 1000) / 10}%`;
  }

  function tierRows(box, rows, valueKey, labelFor) {
    box.innerHTML = (rows || []).map((row, index) => `
      <label class="field" for="${box.id}-${index}">${labelFor(row)}
        <input id="${box.id}-${index}" data-tier="${index}" type="number" min="0" max="3" step="0.01" value="${row[valueKey]}">
      </label>`).join("");
  }

  function renderBalance(balance) {
    captureBalance = balance || {};
    els.capMin.value = captureBalance.minChance ?? 0.02;
    els.capMax.value = captureBalance.maxChance ?? 0.85;
    els.capShiny.value = captureBalance.shinyMultiplier ?? 1;
    els.capEvent.value = captureBalance.eventMultiplier ?? 1;
    els.capHoneyBonus.value = captureBalance.honeyContributorBonus ?? 1.03;
    els.capReward.value = captureBalance.rewardBonusCoins ?? 10;
    tierRows(els.capTiers, captureBalance.baseChanceTiers, "chance", (row) => `Catch rate ${row.minCatchRate}+`);
    tierRows(els.capHoney, captureBalance.honeyTiers, "multiplier", (row) => `${Math.round(Number(row.minRate) * 100)}% took part`);
  }

  function fillSimPickers(balls, berries) {
    if (els.simBall && !els.simBall.options.length) {
      els.simBall.innerHTML = (balls || []).map((row) => (
        `<option value="${row.key}"${row.key === "pokeball" ? " selected" : ""}>${row.name}</option>`
      )).join("");
    }
    if (els.simBerry && !els.simBerry.options.length) {
      const usable = (berries || []).filter((row) => row.enabled && row.capture_enabled);
      els.simBerry.innerHTML = `<option value="">No Berry</option>${usable.map((row) => (
        `<option value="${row.key}">${row.name}</option>`
      )).join("")}`;
    }
  }

  async function loadCapture() {
    if (!els.capTiers) return;
    try {
      const data = await window.playCall("admin_capture_overview", {});
      renderBalance(data?.balance);
      fillSimPickers(data?.balls, data?.berries);
    } catch (error) {
      els.balanceStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("save-balance")?.addEventListener("click", async () => {
    const tiers = (captureBalance?.baseChanceTiers || []).map((row, index) => ({
      ...row,
      chance: Number(els.capTiers.querySelector(`[data-tier="${index}"]`)?.value ?? row.chance)
    }));
    const honey = (captureBalance?.honeyTiers || []).map((row, index) => ({
      ...row,
      multiplier: Number(els.capHoney.querySelector(`[data-tier="${index}"]`)?.value ?? row.multiplier)
    }));
    els.balanceStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_capture_save_balance", {
        p_balance: {
          minChance: Number(els.capMin.value),
          maxChance: Number(els.capMax.value),
          shinyMultiplier: Number(els.capShiny.value),
          eventMultiplier: Number(els.capEvent.value),
          honeyContributorBonus: Number(els.capHoneyBonus.value),
          rewardBonusCoins: Number(els.capReward.value),
          baseChanceTiers: tiers,
          honeyTiers: honey
        }
      });
      renderBalance(saved?.balance);
      els.balanceStatus.textContent = saved?.message || "Saved.";
    } catch (error) {
      els.balanceStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("run-sim")?.addEventListener("click", async () => {
    els.simOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_capture_simulate", {
        p_dex: Number(document.getElementById("sim-dex").value),
        p_ball: els.simBall.value,
        p_berry: els.simBerry.value || null,
        p_joined: Number(document.getElementById("sim-joined").value),
        p_honey: Number(document.getElementById("sim-honey").value),
        p_contributed: document.getElementById("sim-contrib").checked,
        p_owns: document.getElementById("sim-owns").checked,
        p_shiny: document.getElementById("sim-shiny").checked,
        p_trials: Number(document.getElementById("sim-trials").value)
      });
      const calc = data?.calc || {};
      const ball = calc.ball || {};
      const berry = calc.berry || {};
      const honey = calc.honey || {};
      els.simOut.innerHTML = `<dl class="sim-grid">
        <div><dt>Species</dt><dd>${calc.species} · catch rate ${calc.catchRate}</dd></div>
        <div><dt>Base</dt><dd>${pct(calc.baseChance)}</dd></div>
        <div><dt>Ball</dt><dd>${ball.name} ×${ball.multiplier}${ball.condition === "NONE" ? "" : ball.conditionMet ? " (met)" : " (not met)"}</dd></div>
        <div><dt>Berry</dt><dd>${berry.key ? `${berry.name} ×${berry.multiplier}` : "None"}</dd></div>
        <div><dt>Honey</dt><dd>×${honey.multiplier} · ${honey.contributors}/${honey.participants}</dd></div>
        <div><dt>Contributor</dt><dd>×${calc.honeyContributorMultiplier}</dd></div>
        <div><dt>Shiny / event</dt><dd>×${calc.shinyMultiplier} / ×${calc.eventMultiplier}</dd></div>
        <div><dt>Raw</dt><dd>${pct(calc.rawChance)}</dd></div>
        <div><dt>Final</dt><dd><strong>${calc.guaranteed ? "Guaranteed" : pct(calc.finalChance)}</strong></dd></div>
        <div><dt>Trials</dt><dd>${data.trials}</dd></div>
        <div><dt>Observed</dt><dd>${data.observedRate === null || data.observedRate === undefined ? "—" : pct(data.observedRate)}</dd></div>
      </dl>`;
    } catch (error) {
      els.simOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  function reportTable(title, rows, labelKey) {
    if (!rows || !rows.length) return "";
    return `<h3>${title}</h3>
      <table class="report-table"><thead><tr><th>${title}</th><th>Throws</th><th>Caught</th><th>Rate</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td>${row[labelKey] ?? "—"}</td><td>${row.throws}</td><td>${row.caught}</td><td>${pct(row.rate)}</td>
      </tr>`).join("")}</tbody></table>`;
  }

  async function loadReport() {
    if (!els.reportOut) return;
    els.reportOut.innerHTML = `<p class="muted">Loading…</p>`;
    try {
      const data = await window.playCall("admin_capture_report", { p_days: Number(els.reportDays.value) });
      const o = data?.overall || {};
      const honey = data?.honey || {};
      const col = data?.collections || {};
      els.reportOut.innerHTML = `
        <dl class="sim-grid">
          <div><dt>Throws</dt><dd>${o.throws || 0}</dd></div>
          <div><dt>Caught</dt><dd>${o.caught || 0}</dd></div>
          <div><dt>Catch rate</dt><dd><strong>${pct(o.rate)}</strong></dd></div>
          <div><dt>Avg final chance</dt><dd>${pct(o.averageFinalChance)}</dd></div>
          <div><dt>Avg Honey turnout</dt><dd>${pct(honey.averageParticipation)}</dd></div>
          <div><dt>With Honey</dt><dd>${pct(honey.withHoney?.rate)} vs ${pct(honey.withoutHoney?.rate)}</dd></div>
          <div><dt>Species owned</dt><dd>${col.averageSpecies ?? 0} avg · ${col.trainers ?? 0} trainers</dd></div>
        </dl>
        ${reportTable("Catch rate tier", data?.byCatchRateTier, "tier")}
        ${reportTable("Ball", data?.byBall, "name")}
        ${reportTable("Berry", data?.byBerry, "name")}
        ${reportTable("Pokémon", data?.bySpecies, "name")}`;
    } catch (error) {
      els.reportOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  }

  document.getElementById("run-report")?.addEventListener("click", loadReport);

  let economyConfig = null;

  function money(value) {
    return Number(value || 0).toLocaleString();
  }

  function fillEconomy(data) {
    const cfg = data?.config || {};
    economyConfig = cfg;
    if (els.ecoJoin) els.ecoJoin.value = cfg.participationReward ?? 25;
    if (els.ecoCatch) els.ecoCatch.value = cfg.captureReward ?? 25;
    if (els.ecoDex) els.ecoDex.value = cfg.newDexReward ?? 100;
    if (els.ecoShiny) els.ecoShiny.value = cfg.shinyReward ?? 250;
    if (els.ecoLegend) els.ecoLegend.value = cfg.legendaryReward ?? 350;
    if (els.ecoStream) els.ecoStream.value = cfg.streamAttendanceReward ?? 50;
    const dist = data?.distribution || {};
    const inflation = data?.inflation || {};
    if (els.ecoOverview) {
      els.ecoOverview.innerHTML = `<dl class="sim-grid">
        <div><dt>In circulation</dt><dd>${money(data.circulation)}</dd></div>
        <div><dt>Created today</dt><dd>${money(data.createdToday)}</dd></div>
        <div><dt>Spent today</dt><dd>${money(data.spentToday)}</dd></div>
        <div><dt>Store revenue today</dt><dd>${money(data.storeRevenueToday)}</dd></div>
        <div><dt>Average / median</dt><dd>${money(data.averageBalance)} / ${money(data.medianBalance)}</dd></div>
        <div><dt>Created vs spent</dt><dd>${money(inflation.created)} / ${money(inflation.destroyed)}</dd></div>
        <div><dt>Ultra Ball usage</dt><dd>${pct(data.ultraShare)}</dd></div>
        <div><dt>Golden Razz usage</dt><dd>${pct(data.goldenRazzShare)}</dd></div>
        <div><dt>Honey turnout</dt><dd>${pct(data.honeyParticipation)}</dd></div>
        <div><dt>Master Balls owned</dt><dd>${money(data.masterBallsOwned)}</dd></div>
        <div><dt>0–499</dt><dd>${dist["0-499"] || 0}</dd></div>
        <div><dt>500–999</dt><dd>${dist["500-999"] || 0}</dd></div>
        <div><dt>1,000–2,499</dt><dd>${dist["1000-2499"] || 0}</dd></div>
        <div><dt>2,500–4,999</dt><dd>${dist["2500-4999"] || 0}</dd></div>
        <div><dt>5,000–9,999</dt><dd>${dist["5000-9999"] || 0}</dd></div>
        <div><dt>10,000+</dt><dd>${dist["10000+"] || 0}</dd></div>
      </dl>`;
    }
  }

  async function loadEconomy() {
    if (!els.ecoOverview) return;
    try {
      fillEconomy(await window.playCall("admin_economy_overview", {}));
    } catch (error) {
      if (els.ecoStatus) els.ecoStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("save-economy")?.addEventListener("click", async () => {
    if (els.ecoStatus) els.ecoStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_economy_save", {
        p_balance: {
          ...(economyConfig || {}),
          participationReward: Number(els.ecoJoin.value),
          captureReward: Number(els.ecoCatch.value),
          newDexReward: Number(els.ecoDex.value),
          shinyReward: Number(els.ecoShiny.value),
          legendaryReward: Number(els.ecoLegend.value),
          streamAttendanceReward: Number(els.ecoStream.value)
        }
      });
      economyConfig = saved?.config || economyConfig;
      if (els.ecoStatus) els.ecoStatus.textContent = saved?.message || "Saved.";
    } catch (error) {
      if (els.ecoStatus) els.ecoStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("run-economy-sim")?.addEventListener("click", async () => {
    if (els.ecoSimOut) els.ecoSimOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_economy_simulate", {
        p_encounters: Number(document.getElementById("eco-encounters").value),
        p_streams: Number(document.getElementById("eco-streams").value),
        p_join_rate: Number(document.getElementById("eco-join-rate").value),
        p_catch_rate: Number(document.getElementById("eco-catch-rate").value),
        p_strategy: "regular"
      });
      const stream = data.perStream || {};
      const week = data.weekly || {};
      els.ecoSimOut.innerHTML = `<dl class="sim-grid">
        <div><dt>Per stream</dt><dd>${money(stream.coinsEarned)} PokéCoins</dd></div>
        <div><dt>Poké Balls</dt><dd>${stream.pokeBallsAffordable}</dd></div>
        <div><dt>Great Balls</dt><dd>${stream.greatBallsAffordable}</dd></div>
        <div><dt>Ultra Balls</dt><dd>${stream.ultraBallsAffordable}</dd></div>
        <div><dt>Weekly</dt><dd>${money(week.coinsEarned)} PokéCoins</dd></div>
        <div><dt>Weekly Ultra Balls</dt><dd>${week.ultraBallsAffordable}</dd></div>
      </dl><p class="muted">${week.note || "Dry run only."}</p>`;
    } catch (error) {
      els.ecoSimOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  document.getElementById("load-ledger")?.addEventListener("click", async () => {
    if (els.ecoLedger) els.ecoLedger.innerHTML = `<p class="muted">Loading…</p>`;
    try {
      const data = await window.playCall("admin_coin_ledger", { p_limit: 40 });
      const rows = data.rows || [];
      els.ecoLedger.innerHTML = rows.length
        ? `<table class="report-table"><thead><tr><th>When</th><th>Trainer</th><th>Type</th><th>Amount</th><th>After</th></tr></thead>
           <tbody>${rows.map((row) => `<tr>
             <td>${escTime(row.at)}</td><td>${row.trainer || "—"}</td><td>${row.type}</td>
             <td>${row.amount > 0 ? "+" : ""}${money(row.amount)}</td><td>${money(row.after)}</td>
           </tr>`).join("")}</tbody></table>`
        : `<p class="muted">No ledger rows yet.</p>`;
    } catch (error) {
      els.ecoLedger.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  function fillProgression(data) {
    const cfg = data?.config || {};
    if (els.progXpBase) els.progXpBase.value = cfg.xpBase ?? 100;
    if (els.progXpExp) els.progXpExp.value = cfg.xpExponent ?? 1.35;
    if (els.progJoinXp) els.progJoinXp.value = cfg.joinXp ?? 5;
    if (els.progCatchXp) els.progCatchXp.value = cfg.catchXp ?? 10;
    const dex = data?.dexDistribution || {};
    const levels = data?.levelBuckets || {};
    if (els.progOverview) {
      els.progOverview.innerHTML = `<dl class="sim-grid">
        <div><dt>Average / median level</dt><dd>${data.averageLevel || 0} / ${data.medianLevel || 0}</dd></div>
        <div><dt>Lv 1–10</dt><dd>${levels["1-10"] || 0}</dd></div>
        <div><dt>Lv 11–25</dt><dd>${levels["11-25"] || 0}</dd></div>
        <div><dt>Average species</dt><dd>${data.averageSpecies || 0}</dd></div>
        <div><dt>Dex 0–25</dt><dd>${dex["0-25"] || 0}</dd></div>
        <div><dt>Dex 26–50</dt><dd>${dex["26-50"] || 0}</dd></div>
        <div><dt>Dex 51–75</dt><dd>${dex["51-75"] || 0}</dd></div>
        <div><dt>Dex 76–100</dt><dd>${dex["76-100"] || 0}</dd></div>
        <div><dt>Dex 101–125</dt><dd>${dex["101-125"] || 0}</dd></div>
        <div><dt>Dex 126–140</dt><dd>${dex["126-140"] || 0}</dd></div>
        <div><dt>Dex 141–150</dt><dd>${dex["141-150"] || 0}</dd></div>
        <div><dt>Dex 151</dt><dd>${dex["151"] || 0}</dd></div>
      </dl>`;
    }
  }

  async function loadProgression() {
    if (!els.progOverview) return;
    try {
      fillProgression(await window.playCall("admin_progression_overview", {}));
    } catch (error) {
      if (els.progStatus) els.progStatus.textContent = window.playRpcError(error);
    }
  }

  async function loadCollection() {
    if (!els.collectionOverview) return;
    try {
      const data = await window.playCall("admin_collection_overview", {});
      const eevee = data.eevee || {};
      const starters = data.starters || {};
      const dratini = data.dratini || {};
      const trade = data.tradeVsCord || {};
      els.collectionOverview.innerHTML = `<dl class="sim-grid">
        <div><dt>Balance version</dt><dd>${data.balanceVersion || 1}</dd></div>
        <div><dt>Family Candy held</dt><dd>${data.candyTotal || 0}</dd></div>
        <div><dt>Trainers with Candy</dt><dd>${data.candyTrainers || 0}</dd></div>
        <div><dt>Evolutions logged</dt><dd>${data.evolutions || 0}</dd></div>
        <div><dt>Players ready to evolve</dt><dd>${data.readyPlayers || 0}</dd></div>
        <div><dt>Open GTS listings</dt><dd>${data.openGts || 0}</dd></div>
        <div><dt>Direct trades</dt><dd>${data.directTrades || 0}</dd></div>
        <div><dt>Species mastered</dt><dd>${data.mastered || 0}</dd></div>
        <div><dt>Eevee branches</dt><dd>Vaporeon ${eevee.vaporeon || 0} · Jolteon ${eevee.jolteon || 0} · Flareon ${eevee.flareon || 0}</dd></div>
        <div><dt>Starters</dt><dd>Charizard ${starters.charizard || 0} · Venusaur ${starters.venusaur || 0} · Blastoise ${starters.blastoise || 0}</dd></div>
        <div><dt>Dratini line</dt><dd>Dragonair ${dratini.dragonair || 0} · Dragonite ${dratini.dragonite || 0}</dd></div>
        <div><dt>Gyarados</dt><dd>${data.magikarp || 0}</dd></div>
        <div><dt>Trade vs Linking Cord</dt><dd>${trade.trade || 0} / ${trade.cord || 0}</dd></div>
      </dl>
      <h3>Recent evolutions</h3>
      ${(data.recentEvo || []).map((row) => `<p>${window.playEscapeAttr(row.player || "Trainer")} · ${row.fromDex} → ${row.toDex} · ${row.candy} Candy</p>`).join("") || "<p class=\"muted\">None yet.</p>"}
      <h3>Most evolved</h3>
      ${(data.mostEvolved || []).map((row) => `<p>#${row.dex} · ${row.count}</p>`).join("") || "<p class=\"muted\">None yet.</p>"}`;
    } catch (error) {
      if (els.collectionStatus) els.collectionStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("run-candy-sim")?.addEventListener("click", async () => {
    if (els.candySimOut) els.candySimOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_candy_simulate", {
        p_family: Number(document.getElementById("candy-family").value),
        p_catches: Number(document.getElementById("candy-catches").value)
      });
      const first = data.firstEvolution;
      const last = data.finalEvolution;
      els.candySimOut.innerHTML = `<dl class="sim-grid">
        <div><dt>${window.playEscapeAttr(data.family)} Candy / catch</dt><dd>${data.candyPerCatch}</dd></div>
        <div><dt>Expected Candy</dt><dd>${data.expectedCandy}</dd></div>
        ${first ? `<div><dt>First evo</dt><dd>${first.catchesNeeded} catches · ${first.cost} Candy</dd></div>` : ""}
        ${last ? `<div><dt>Final evo</dt><dd>${last.catchesNeeded} first-stage equivalent · ${last.cost} Candy</dd></div>` : ""}
      </dl>
      <p class="muted">${window.playEscapeAttr(data.note || "")}</p>
      ${first?.range ? `<p class="muted">${window.playEscapeAttr(first.range)}</p>` : ""}
      ${last?.range ? `<p class="muted">${window.playEscapeAttr(last.range)}</p>` : ""}`;
    } catch (error) {
      if (els.candySimOut) els.candySimOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  document.getElementById("unlock-catch-btn")?.addEventListener("click", async () => {
    if (els.collectionStatus) els.collectionStatus.textContent = "Working…";
    try {
      const result = await window.playCall("admin_unlock_catch", {
        p_catch: document.getElementById("unlock-catch").value,
        p_reason: "admin unlock"
      });
      if (els.collectionStatus) els.collectionStatus.textContent = result.message || "Unlocked.";
    } catch (error) {
      if (els.collectionStatus) els.collectionStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("save-progression")?.addEventListener("click", async () => {
    if (els.progStatus) els.progStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_progression_save", {
        p_balance: {
          xpBase: Number(els.progXpBase.value),
          xpExponent: Number(els.progXpExp.value),
          joinXp: Number(els.progJoinXp.value),
          catchXp: Number(els.progCatchXp.value),
          levelCatchBonus: false
        }
      });
      if (els.progStatus) els.progStatus.textContent = saved?.message || "Saved.";
    } catch (error) {
      if (els.progStatus) els.progStatus.textContent = window.playRpcError(error);
    }
  });

  function escTime(value) {
    try {
      return new Date(value).toLocaleString();
    } catch (_) {
      return value || "—";
    }
  }

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
  setInterval(() => {
    if (els.staff.hidden || !lastOverview) return;
    renderRound(lastOverview.round);
  }, 250);
  loadHub();
})();
