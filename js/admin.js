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
    clientSecret: document.getElementById("twitch-secret"),
    broadcaster: document.getElementById("twitch-broadcaster"),
    save: document.getElementById("save-channel"),
    saveStatus: document.getElementById("save-status"),
    commandStatus: document.getElementById("command-status"),
    settingsStatus: document.getElementById("settings-status"),
    dexPick: document.getElementById("dex-pick"),
    dexSuggest: document.getElementById("dex-suggest"),
    variantRow: document.getElementById("variant-row"),
    formPreview: document.getElementById("form-preview"),
    formCopy: document.getElementById("form-copy"),
    packLogin: document.getElementById("pack-login"),
    packSku: document.getElementById("pack-sku"),
    packStatus: document.getElementById("pack-status"),
    bitsAutoStatus: document.getElementById("bits-auto-status"),
    bitsConnect: document.getElementById("bits-connect"),
    passLogin: document.getElementById("pass-login"),
    passCount: document.getElementById("pass-count"),
    passStatus: document.getElementById("pass-admin-status"),
    hide: document.getElementById("toggle-hidden"),
    bridgeStatus: document.getElementById("bridge-status"),
    issueToken: document.getElementById("issue-token"),
    bridgeToken: document.getElementById("bridge-token"),
    bridgeTokenStatus: document.getElementById("bridge-token-status"),
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

  function selectedDex() {
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    return matches.length === 1 ? matches[0].dex : (matches[0]?.dex || null);
  }

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
    renderVariants(dex);
  }

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
    const matches = window.playParseSpeciesQuery(value);
    return matches.length ? matches[0].dex : null;
  }

  function renderRound(round) {
    els.encounter.innerHTML = window.playRenderEncounter(round, {
          emptyNote: "Start a random encounter. The stream PC should pick it up."
    });
    els.hide.textContent = "Hide overlay";
  }

  function applyOverview(data, fillForms) {
    overview = data;
    if (fillForms) {
      els.channel.value = data.channel || "";
      els.client.value = data.twitchClientId || "";
      els.broadcaster.value = data.twitchBroadcasterId || "";
      if (els.clientSecret && !els.clientSecret.value) {
        els.clientSecret.placeholder = data.twitchClientSecretSaved
          ? "Saved on Play. Paste again only to replace it."
          : "Paste once. Play will not show it again.";
      }
      fillSettings(data.settings);
    }
    loadStream(data.channel);
    renderRound(data.round);
    els.trainers.textContent = `${data.trainers} trainer${data.trainers === 1 ? "" : "s"} on Play.`;
    els.passCount.textContent = `${data.passes || 0} Starlight Pass${data.passes === 1 ? "" : "es"} active.`;
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
    renderBitsStatus(data.bitsAuto || {});
  }

  let overviewTimer = 0;
  let bitsSticky = "";

  function renderBitsStatus(bits) {
    if (!els.bitsAutoStatus) return;
    if (bitsSticky) {
      els.bitsAutoStatus.innerHTML = bitsSticky;
      return;
    }
    const info = bits || {};
    if (info.connected) {
      els.bitsAutoStatus.innerHTML = `<span class="status-ok">Auto-credit is on.</span> Power-Ups used while live credit Play bags.`;
    } else if (info.needsAppSecret) {
      els.bitsAutoStatus.innerHTML = `<span class="status-bad">Save the Play Twitch Client Secret under Stream channel first.</span> It is the same secret already used for Play login.`;
    } else if (info.status) {
      els.bitsAutoStatus.innerHTML = `<span class="status-bad">Twitch status: ${info.status}.</span> Click the button to connect again.`;
    } else {
      els.bitsAutoStatus.innerHTML = `<span class="status-bad">Auto-credit is off.</span> Connect once after the Power-Ups exist on Twitch.`;
    }
    if (info.lastDetail) {
      els.bitsAutoStatus.innerHTML += ` Last grant: ${info.lastDetail}`;
    }
    if (info.pending) {
      els.bitsAutoStatus.innerHTML += ` ${info.pending} pack${info.pending === 1 ? "" : "s"} waiting for a Play sign-in.`;
    }
  }

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return { message: body.message, needsScope: Boolean(body.needsScope), ok: Boolean(body.ok) };
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) return { message: fallback, needsScope: false, ok: false };
    return { message: error?.message || fallback, needsScope: false, ok: false };
  }

  async function finishBitsConnect(accessToken) {
    if (!accessToken) return { ok: false, needsScope: true, message: "Twitch did not keep a Bits token." };
    if (finishBitsConnect.busy) return { ok: false, needsScope: false, message: "Connecting Bits auto-credit…" };
    finishBitsConnect.busy = true;
    bitsSticky = `<span class="status-ok">Connecting Bits auto-credit…</span>`;
    renderBitsStatus({});
    try {
      const { data, error } = await supabase.functions.invoke("bits-connect", {
        body: { accessToken }
      });
      if (error) {
        const info = await functionMessage(error, "Twitch would not enable Bits auto-credit.");
        bitsSticky = `<span class="status-bad">${info.message}</span>`;
        renderBitsStatus({});
        return info;
      }
      const ok = Boolean(data?.ok);
      bitsSticky = ok
        ? `<span class="status-ok">${data.message || "Bits auto-credit is on."}</span>`
        : `<span class="status-bad">${data?.message || "Twitch would not enable Bits auto-credit."}</span>`;
      renderBitsStatus({});
      if (ok) {
        sessionStorage.removeItem("playBitsConnect");
        bitsSticky = "";
        await refreshOverview(false);
      }
      return { ok, needsScope: Boolean(data?.needsScope), message: data?.message || "" };
    } catch (error) {
      bitsSticky = `<span class="status-bad">${error?.message || "Could not connect Bits auto-credit."}</span>`;
      renderBitsStatus({});
      return { ok: false, needsScope: false, message: error?.message || "Could not connect Bits auto-credit." };
    } finally {
      finishBitsConnect.busy = false;
    }
  }

  async function maybeFinishBits(session) {
    if (sessionStorage.getItem("playBitsConnect") !== "1") return false;
    const token = session?.provider_token;
    if (!token) return false;
    sessionStorage.removeItem("playBitsConnect");
    await finishBitsConnect(token);
    return true;
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
      els.gate.textContent = "This hub is limited to the stream Twitch account. Viewer logins cannot open staff tools.";
      return;
    }
    els.gate.hidden = true;
    els.staff.hidden = false;
    await refreshOverview(true);
    await maybeFinishBits(session);
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

  function mixPayload(dex) {
    const payload = {};
    if (dex) payload.dex = dex;
    const variant = els.variantRow?.querySelector("button[aria-pressed='true']")?.dataset.variant;
    if (variant && ["normal", "female", "shiny"].includes(variant)) payload.variant = variant;
    return payload;
  }

  function selectedVariant() {
    return els.variantRow?.querySelector("button[aria-pressed='true']")?.dataset.variant || "normal";
  }

  function renderVariants(dex) {
    if (!els.variantRow) return;
    if (!dex) {
      els.variantRow.innerHTML = "";
      if (els.formCopy) els.formCopy.textContent = "Pick a species to preview.";
      if (els.formPreview) els.formPreview.removeAttribute("src");
      return;
    }
    const options = window.playAllowedVariants(dex);
    const current = options.includes(selectedVariant()) ? selectedVariant() : options[0];
    els.variantRow.innerHTML = options.map((name) => (
      `<button type="button" data-variant="${name}" aria-pressed="${name === current}">${window.playVariantLabel(name)}</button>`
    )).join("");
    if (els.formPreview) {
      els.formPreview.src = window.playSpriteUrl(dex, current);
      els.formPreview.alt = `${window.playSpeciesName(dex)} ${current}`;
    }
    if (els.formCopy) {
      els.formCopy.textContent = `${window.playSpeciesName(dex)} · ${window.playVariantLabel(current)}`;
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
      if (action === "start") return run("admin_start_round", { p_dex: payload?.dex ?? null });
      if (action === "cancel") return run("admin_cancel_round");
      if (action === "hide") return run("admin_hide_round", { p_hidden: true });
      if (action === "resume") return run("play_sync");
      if (action === "refill") return run("admin_refill_test");
      els.commandStatus.textContent = message;
    }
  }

  document.getElementById("start-random").addEventListener("click", () => queueMix("start", mixPayload(null)));
  document.getElementById("start-pikachu").addEventListener("click", () => queueMix("start", mixPayload(25)));
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
    renderVariants(matches.length === 1 ? matches[0].dex : parseDex(els.dexPick.value));
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
  els.variantRow?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-variant]");
    if (!button) return;
    els.variantRow.querySelectorAll("button").forEach((node) => node.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
    renderVariants(parseDex(els.dexPick.value));
  });
  document.getElementById("cancel-round").addEventListener("click", () => queueMix("cancel"));
  document.getElementById("sync-clock").addEventListener("click", () => queueMix("resume"));
  document.getElementById("refill").addEventListener("click", () => queueMix("refill"));
  els.hide.addEventListener("click", () => queueMix("hide"));
  els.save.addEventListener("click", async () => {
    const secret = (els.clientSecret?.value || "").trim();
    await run("admin_save_channel", {
      p_login: els.channel.value.trim().replace(/^@/, ""),
      p_client_id: els.client.value.trim(),
      p_broadcaster_id: els.broadcaster.value.trim()
    }, els.saveStatus);
    if (!secret) return;
    try {
      const saved = await window.playCall("admin_save_twitch_client_secret", { p_secret: secret });
      els.clientSecret.value = "";
      els.saveStatus.textContent = saved?.message || "Play Twitch Client Secret saved.";
      await refreshOverview(false);
    } catch (error) {
      els.saveStatus.textContent = window.playRpcError(error);
    }
  });
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
  document.getElementById("grant-pack")?.addEventListener("click", () => run("admin_grant_bits_pack", {
    p_login: els.packLogin.value,
    p_sku: els.packSku.value
  }, els.packStatus));
  els.bitsConnect?.addEventListener("click", async () => {
    bitsSticky = `<span class="status-ok">Connecting Bits auto-credit…</span>`;
    renderBitsStatus({});
    const { data: sessionData } = await supabase.auth.getSession();
    const existing = sessionData.session?.provider_token;
    if (existing) {
      const result = await finishBitsConnect(existing);
      if (result?.ok) return;
      if (!result?.needsScope) return;
    }
    sessionStorage.setItem("playBitsConnect", "1");
    bitsSticky = `<span class="status-ok">Opening Twitch for Bits permission…</span>`;
    renderBitsStatus({});
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitch",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        scopes: "user:read:email user:read:subscriptions bits:read",
        queryParams: { force_verify: "true" }
      }
    });
    if (error) {
      sessionStorage.removeItem("playBitsConnect");
      bitsSticky = `<span class="status-bad">${error.message || "Twitch sign-in is not enabled yet."}</span>`;
      renderBitsStatus({});
    }
  });
  document.getElementById("grant-pass").addEventListener("click", () => run("admin_set_pass", {
    p_login: els.passLogin.value,
    p_active: true
  }, els.passStatus));
  document.getElementById("revoke-pass").addEventListener("click", () => run("admin_set_pass", {
    p_login: els.passLogin.value,
    p_active: false
  }, els.passStatus));
  els.issueToken.addEventListener("click", async () => {
    els.bridgeTokenStatus.textContent = "Creating token…";
    try {
      const data = await window.playCall("admin_issue_bridge_token");
      els.bridgeToken.value = data.token || "";
      els.bridgeTokenStatus.textContent = data.message || "Copy this token into Data/play-bridge.json.";
      els.bridgeToken.select();
      await refreshOverview(false);
    } catch (error) {
      els.bridgeTokenStatus.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (sessionStorage.getItem("playBitsConnect") === "1") {
      if (session?.provider_token) {
        maybeFinishBits(session);
      } else if (event === "SIGNED_IN") {
        bitsSticky = `<span class="status-bad">Twitch signed you back in, but did not keep a Bits token. Click Turn on Bits auto-credit once more and approve Bits permission.</span>`;
        renderBitsStatus({});
      }
    }
    if (window.playAuthNoise(event)) return;
    loadHub(session);
  });
  supabase.channel("play-staff")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, scheduleOverview)
    .subscribe();
  setInterval(() => {
    if (!els.staff.hidden) refreshOverview(false);
  }, 4000);
  loadHub();
})();
