window.playBindLiveOps = function playBindLiveOps(options) {
  const opts = options || {};
  const embedded = Boolean(opts.embedded);
  const root = opts.root || document.getElementById("live-app") || document;
  const byId = (id) => document.getElementById(id);
  const supabase = window.playSupabase;
  const els = {
    gate: byId("gate"),
    app: byId("live-app"),
    bar: byId("live-bar"),
    errors: byId("live-errors"),
    status: byId("live-status"),
    encounter: byId("card-encounter"),
    safe: byId("card-safe"),
    ads: byId("card-ads"),
    next: byId("card-next"),
    queue: byId("card-queue"),
    mode: byId("card-mode"),
    controls: byId("card-controls"),
    session: byId("card-session"),
    history: byId("live-history"),
    log: byId("live-log"),
    modal: byId("live-confirm"),
    modalTitle: byId("live-confirm-title"),
    modalBody: byId("live-confirm-body"),
    modalGo: byId("live-confirm-go")
  };
  if (!els.app || els.app.dataset.liveOpsBound === "1") return;
  els.app.dataset.liveOpsBound = "1";
  document.documentElement.classList.toggle("is-hub-test", sessionStorage.getItem("playHubTestMode") === "1");
  const consoleEl = document.querySelector("#hub-panel-live .live-ops-console");
  if (consoleEl && consoleEl.dataset.resizeBound !== "1") {
    consoleEl.dataset.resizeBound = "1";
    const saved = localStorage.getItem("playHubConsoleHeight");
    if (saved) consoleEl.style.height = saved;
    const persist = () => {
      const height = consoleEl.style.height || getComputedStyle(consoleEl).height;
      if (height) localStorage.setItem("playHubConsoleHeight", height);
    };
    new ResizeObserver(persist).observe(consoleEl);
  }

  let forceAdvancedOpen = false;
  let lastGuideHtml = "";
  let state = null;
  let pending = false;
  let confirmFn = null;
  let pickDex = null;
  let pickQuery = "";
  let pickGender = "";
  let pickShiny = "random";
  let disconnected = false;
  let lastLivePoll = 0;

  if (!embedded) {
    window.playBindAccountNav({
      onSignOut() {
        els.app.hidden = true;
        if (els.gate) els.gate.hidden = false;
      }
    });
  }

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function clock(seconds) {
    const s = Math.max(0, Number(seconds || 0));
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
  }

  function when(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function until(iso) {
    if (!iso) return null;
    return Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));
  }

  function chip(label, kind) {
    return `<span class="chip ${kind || ""}">${esc(label)}</span>`;
  }

  function directorLabel(d, s) {
    if (d.manualHold || /pause/i.test(d.status || "")) return "PAUSED";
    if (s.rpgSession) return d.status && d.status !== "IDLE" ? d.status : "RUNNING";
    return d.status || "IDLE";
  }

  function confirm(title, body, goLabel, fn, extra) {
    confirmFn = fn;
    const queueBtn = byId("live-confirm-queue");
    if (queueBtn) {
      queueBtn.hidden = !extra?.queueAction;
      queueBtn.dataset.queueAction = extra?.queueAction || "";
    }
    if (els.modalTitle) els.modalTitle.textContent = title;
    if (els.modalBody) els.modalBody.textContent = body;
    if (els.modalGo) els.modalGo.textContent = goLabel;
    if (els.modal && typeof els.modal.showModal === "function") els.modal.showModal();
    else if (els.modal) els.modal.setAttribute("open", "");
  }

  async function cmd(action, payload, { confirmTitle, confirmBody, go } = {}) {
    if (pending) return;
    const run = async () => {
      pending = true;
      if (els.status) els.status.textContent = "Working…";
      try {
        const data = await window.playCall("admin_director_command", { p_action: action, p_payload: payload || {} });
        state = data;
        disconnected = false;
        render();
        if (els.status) els.status.textContent = data?.message || "Updated.";
      } catch (error) {
        if (els.status) {
          els.status.textContent = window.playHumanRpcError
            ? window.playHumanRpcError(error)
            : window.playRpcError(error);
        }
      } finally {
        pending = false;
      }
    };
    if (confirmTitle) confirm(confirmTitle, confirmBody, go || "Confirm", run);
    else await run();
  }

  async function stopTest() {
    if (pending) return;
    pending = true;
    if (els.status) els.status.textContent = "Stopping test encounter…";
    try {
      try {
        const data = await window.playCall("admin_director_command", {
          p_action: "cancel_encounter",
          p_payload: { confirm: true }
        });
        state = data;
        disconnected = false;
        render();
        if (els.status) els.status.textContent = data?.message || "Test encounter stopped.";
        return;
      } catch (error) {
        const data = await window.playCall("admin_cancel_round");
        await load(true);
        if (els.status) els.status.textContent = data?.message || "Test encounter stopped.";
      }
    } catch (error) {
      if (els.status) {
        els.status.textContent = window.playHumanRpcError
          ? window.playHumanRpcError(error)
          : window.playRpcError(error, "Could not stop the test encounter.");
      }
    } finally {
      pending = false;
    }
  }

  function testMode() {
    return sessionStorage.getItem("playHubTestMode") === "1";
  }

  function setTestMode(on) {
    if (on) sessionStorage.setItem("playHubTestMode", "1");
    else sessionStorage.removeItem("playHubTestMode");
    document.documentElement.classList.toggle("is-hub-test", on);
  }

  function autoInfo(d, s) {
    if (testMode()) return { label: "OFF", reason: "Test Mode does not run automatic cadence" };
    if (!s.twitchLive && !s.rpgSession) return { label: "WAITING", reason: "Stream is offline" };
    if (s.twitchLive && !s.rpgSession) return { label: "WAITING", reason: "Live RPG is starting" };
    if (d.manualHold || !d.autoEnabled) {
      const mode = (s.mode || "").toUpperCase();
      if (["REACTION", "STORY", "BRB"].includes(mode)) return { label: "PAUSED", reason: MODE_LABELS[mode] || mode };
      return { label: "PAUSED", reason: d.holdReason || "Automatic encounters paused" };
    }
    const left = until(d.nextEncounterAt);
    return { label: "ON", reason: left != null ? `Next in ~${clock(left)}` : "Scheduling" };
  }

  function autoLabel(d, s) {
    return autoInfo(d, s).label;
  }

  function rpgFace(s) {
    if (testMode()) return "TEST";
    if (s.twitchLive && s.rpgSession) return "LIVE";
    if (s.twitchLive && !s.rpgSession) return "STARTING";
    if (s.rpgSession) return "FORCED";
    return "INACTIVE";
  }

  function adsFace(ad, w) {
    if (ad.adActive) return "AD ACTIVE";
    if (ad.authorizationNeeded) return "NOT CONNECTED";
    if (["UNSAFE", "SHORT"].includes(w.state)) return "AD SOON";
    if (ad.connected || !ad.authorizationNeeded) return "PROTECTED";
    return "UNKNOWN";
  }

  function directorFace(d, s) {
    if (testMode()) return "TESTING";
    if (d.status === "WAITING_FOR_NEXT_ENCOUNTER") return "Waiting for next encounter";
    if (d.status === "AD_PENDING" || d.delayReason === "AD_PENDING") return "Waiting until after upcoming ad";
    if (d.status === "POST_AD_COOLDOWN") return "Giving viewers time to return after the ad";
    if (d.status === "MANUAL_HOLD") return "Automatic encounters paused";
    if (d.status === "AD_ACTIVE") return "Ad in progress";
    return directorLabel(d, s);
  }

  function renderBar() {
    if (!els.bar) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const ad = state?.adState || {};
    const w = state?.safeWindow || {};
    const live = s.twitchLive ? "LIVE" : (s.liveKnown ? "OFFLINE" : "UNKNOWN");
    const auto = autoInfo(d, s);
    const enc = state?.activeEncounter;
    const encLabel = enc ? `${enc.name}${enc.phase ? ` · ${String(enc.phase).replace(/_/g, " ")}` : ""}` : "None";
    els.bar.innerHTML = [
      `<button type="button" data-jump="system" data-jump-view="twitch"><em>● Stream</em><strong>${live}</strong></button>`,
      `<button type="button" data-jump="dashboard"><em>◆ RPG</em><strong>${rpgFace(s)}</strong></button>`,
      `<button type="button" data-jump="dashboard"><em>↻ Auto encounters</em><strong>${auto.label}</strong><span>${esc(auto.reason)}</span></button>`,
      `<button type="button" data-jump="dashboard"><em>◎ Mode</em><strong>${esc((s.mode || "NORMAL").replace("_", " "))}</strong></button>`,
      `<button type="button" data-jump="system" data-jump-view="ads"><em>■ Ad protection</em><strong>${adsFace(ad, w)}</strong></button>`,
      `<button type="button" data-jump="encounter"><em>★ Encounter</em><strong>${esc(encLabel)}</strong></button>`
    ].join("");
    const idle = !s.twitchLive && !s.rpgSession && !testMode();
    els.app?.classList.toggle("is-offline-idle", idle);
    els.app?.classList.toggle("is-hub-test", testMode());
    const adsEl = document.getElementById("card-timing");
    adsEl?.classList.toggle("is-alert", Boolean(ad.adActive));
    renderGuide();
  }

  function renderErrors() {
    if (!els.errors) return;
    const ad = state?.adState || {};
    const s = state?.stream || {};
    const h = state?.health || {};
    const notes = [];
    if (disconnected) notes.push("Live data disconnected.");
    if (!s.liveKnown) notes.push(`Twitch live status has not been checked recently. <button type="button" class="secondary" data-act="refresh_live">Refresh live status</button>`);
    if (s.liveError) notes.push(esc(s.liveError));
    if (ad.authorizationNeeded) notes.push(`Ad Protection is not connected. Automatic encounters can still run. <button type="button" class="secondary" data-act="connect_ads">Connect Ad Protection</button>`);
    if (ad.stale && ad.dataAvailable) notes.push(`Ad data may be stale. <button type="button" class="secondary" data-act="refresh_ads">Refresh ads</button>`);
    if (/not subscribed/i.test(h.eventSub || "") && (s.rpgSession || ad.connected)) notes.push("EventSub disconnected.");
    if (h.director && h.director !== "Healthy") notes.push(`Director: ${esc(h.director)}`);
    els.errors.hidden = !notes.length;
    els.errors.innerHTML = notes.join(" · ");
  }

  function renderGuide() {
    const box = byId("dash-offline");
    if (!box) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const ad = state?.adState || {};
    const w = state?.safeWindow || {};
    const auto = autoInfo(d, s);
    const left = until(d.nextEncounterAt);
    const adLeft = ad.adActive ? until(ad.activeExpectedEndAt) : until(ad.nextAdAt);
    box.hidden = false;
    const openDetails = box.querySelector(".hub-advanced");
    if (openDetails) forceAdvancedOpen = openDetails.open;
    let html = "";
    if (testMode()) {
      html = `
        <p class="eyebrow">Test Mode</p>
        <h2>Offline testing</h2>
        <p>Twitch does not need to be live. Test encounters use the existing test protection and do not run automatic stream cadence.</p>
        <div class="links">
          <button type="button" class="gold" data-act="start_test" ${state?.activeEncounter ? "disabled" : ""}>Start test encounter</button>
          <button type="button" class="danger" data-act="stop_test">Stop test encounter</button>
          <button type="button" class="secondary" data-act="exit_test">Exit Test Mode</button>
        </div>`;
    } else if (!s.twitchLive && !s.rpgSession) {
      html = `
        <p class="eyebrow">Stream offline</p>
        <h2>Live encounters are not running</h2>
        <p>Want to test the RPG? Enter Test Mode. Going live? Twitch will activate the Live RPG when the stream is detected.</p>
        <div class="links">
          <button type="button" class="secondary" data-act="refresh_live">Refresh Twitch Status</button>
          <button type="button" class="gold" data-act="enter_test">Enter Test Mode</button>
        </div>
        <details class="hub-advanced"${forceAdvancedOpen ? " open" : ""}>
          <summary>Advanced / Force Live Session</summary>
          <p class="muted">Starts the live RPG Director even if Twitch live detection is unavailable or delayed. Not the normal way to test.</p>
          <button type="button" class="secondary" data-act="start_session">Force Start Live RPG Session</button>
        </details>`;
    } else if (s.twitchLive && !s.rpgSession) {
      html = `
        <p class="eyebrow">Live RPG</p>
        <h2>Live detected — initializing RPG session</h2>
        <p>Twitch is live. The Director starts the Live RPG automatically. No Start button is required.</p>
        <div class="links">
          <button type="button" class="secondary" data-act="refresh_live">Refresh Twitch Status</button>
        </div>`;
    } else if (ad.adActive) {
      html = `
        <p class="eyebrow">Ad Protection</p>
        <h2>Twitch ad in progress</h2>
        <p>Active encounters are automatically paused. Expected resume ${adLeft == null ? "soon" : `in ${clock(adLeft)}`}.</p>
        <p class="muted">No action required.</p>`;
    } else if (auto.label === "PAUSED") {
      html = `
        <p class="eyebrow">Live RPG running</p>
        <h2>Automatic encounters are paused</h2>
        <p>${esc(auto.reason)}</p>
        <div class="links">
          <button type="button" data-act="return_normal">Return to Normal</button>
          <button type="button" class="secondary" data-act="resume_auto">Resume auto</button>
        </div>`;
    } else if (["UNSAFE", "SHORT"].includes(w.state)) {
      html = `
        <p class="eyebrow">Ad Protection</p>
        <h2>Upcoming Twitch ad${adLeft == null ? "" : ` in ${clock(adLeft)}`}</h2>
        <p>The next automatic encounter will wait until after the ad. No action required.</p>`;
    } else {
      html = `
      <p class="eyebrow">Live RPG running</p>
      <h2>No action required</h2>
      <p>Next encounter ${left == null ? "is scheduling" : `~${clock(left)}`}. Ad Protection: ${adsFace(ad, w)}.</p>`;
    }
    if (html === lastGuideHtml) return;
    lastGuideHtml = html;
    box.innerHTML = html;
    const details = box.querySelector(".hub-advanced");
    if (details) {
      details.open = forceAdvancedOpen;
      details.addEventListener("toggle", () => { forceAdvancedOpen = details.open; });
    }
  }

  function renderEncounter() {
    if (!els.encounter) return;
    const round = state?.activeEncounter;
    const wrap = document.getElementById("dash-encounter");
    if (!round && !testMode()) {
      els.encounter.innerHTML = "";
      els.encounter.hidden = true;
      wrap?.classList.add("is-compact");
      return;
    }
    wrap?.classList.remove("is-compact");
    els.encounter.hidden = false;
    els.encounter.innerHTML = `
      <div class="links">
        ${round ? `<button type="button" class="secondary" data-act="pause_encounter"${round.paused ? " disabled" : ""}>Pause</button>
        <button type="button" class="secondary" data-act="resume_encounter"${round.paused ? "" : " disabled"}>Resume</button>` : ""}
        ${embedded ? `<button type="button" class="secondary" data-act="open_details">Details</button>` : ""}
        <button type="button" class="danger" data-act="${testMode() ? "stop_test" : "cancel_encounter"}">${testMode() ? "Stop test encounter" : "Cancel"}</button>
      </div>`;
    els.encounter.dataset.busy = "1";
  }

  function renderSafe() {
    if (!els.safe) return;
    const w = state?.safeWindow || {};
    const ad = state?.adState || {};
    const headline = ad.adActive
      ? "Twitch ad in progress"
      : (["UNSAFE", "SHORT"].includes(w.state) ? "Wait until after the upcoming ad." : "Encounter can safely start now.");
    els.safe.innerHTML = `
      <p class="eyebrow">Ad Protection</p>
      <h2>${esc(headline)}</h2>
      <p class="muted">Prevents encounters from starting too close to Twitch ads and pauses an active encounter if an ad begins.</p>
      <p>${esc(w.reason || "Loading…")}</p>
      <div class="hub-kv">
        <div><span>Encounter window</span><strong>${["UNSAFE", "SHORT"].includes(w.state) ? "Wait" : "Safe"}</strong></div>
        <div><span>Available</span><strong>${w.availableSeconds == null ? "—" : clock(w.availableSeconds)}</strong></div>
      </div>`;
  }

  function renderAds() {
    if (!els.ads) return;
    const ad = state?.adState || {};
    const cfg = state?.config || {};
    const left = ad.adActive ? until(ad.activeExpectedEndAt) : until(ad.nextAdAt);
    const connected = ad.connected || !ad.authorizationNeeded;
    const sys = byId("sys-ads-status");
    if (sys) {
      sys.innerHTML = connected
        ? `<p><strong>Connected.</strong> Next ad ${ad.nextAdAt ? when(ad.nextAdAt) : "none scheduled"}.</p>`
        : `<p><strong>Not connected.</strong> Automatic encounters can still run, but Twitch's real ad schedule cannot be checked. Fallback Mark Ad tools are under Dashboard → Advanced.</p>`;
    }
    const liveNote = byId("sys-live-status");
    if (liveNote) {
      const s = state?.stream || {};
      liveNote.textContent = s.twitchLive ? "Twitch reports LIVE." : (s.liveKnown ? "Twitch reports OFFLINE." : "Live status has not been checked recently.");
    }
    els.ads.innerHTML = `
      <p>${connected ? "Connected ✓" : "Not connected"} · ${ad.adActive ? `Ad remaining ${clock(left)}` : `Next ad ${ad.nextAdAt ? clock(left) : "none scheduled"}`}</p>
      ${ad.authorizationNeeded ? `<div class="links"><button type="button" data-act="connect_ads">Connect Ad Protection</button></div>
        <p class="muted">Automatic encounters can still run. Play just cannot read Twitch's real ad schedule until this is connected.</p>` : `<p class="muted">No action required when Connected and Safe.</p>`}
      <details class="hub-advanced">
        <summary>Advanced / manual ad override</summary>
        <p class="muted">Manual fallback for testing or if Twitch Ads cannot be read.</p>
        <div class="links">
          <button type="button" class="secondary" data-act="refresh_ads">Refresh ads</button>
          ${ad.manageAvailable && ad.snoozeCount > 0 && !ad.adActive ? `<button type="button" class="secondary" data-act="snooze_ad">Snooze next ad</button>` : ""}
          <button type="button" class="secondary" data-act="mark_ad_started">Mark ad started</button>
          <button type="button" class="secondary" data-act="mark_ad_ended">Mark ad ended</button>
        </div>
        <label class="field">Set next estimated ad
          <input id="next-ad-at" type="datetime-local">
        </label>
        <button type="button" class="secondary" data-act="set_next_ad">Save fallback ad time</button>
        <p class="muted">Post-ad cooldown ${cfg.postAdCooldownSeconds || 30}s · EventSub ${esc((state?.health || {}).eventSub || "unknown")}</p>
      </details>`;
  }

  function renderNext() {
    if (!els.next) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const left = until(d.nextEncounterAt);
    const delayed = Boolean(d.delayReason || d.delayText);
    const auto = autoInfo(d, s);
    els.next.innerHTML = `
      <p class="eyebrow">Auto encounters</p>
      <h2>${testMode() ? "Test Mode" : (auto.label === "PAUSED" ? "Paused" : (delayed && d.nextEncounterAt ? "Waiting until after upcoming ad" : (d.nextEncounterAt ? `~${clock(left)}` : "Waiting")))}</h2>
      <p class="muted">Automatically schedules wild encounters while the Live RPG is active.</p>
      <div class="hub-kv">
        <div><span>Auto</span><strong>${auto.label}</strong></div>
        <div><span>Next encounter</span><strong>${when(d.nextEncounterAt)}</strong></div>
      </div>
      <p>${esc(auto.reason)}</p>
      <p>${esc(d.delayText || directorFace(d, s))}</p>
      <div class="links">
        ${testMode() ? "" : `<button type="button" class="secondary" data-act="${auto.label === "ON" ? "pause_auto" : "resume_auto"}">${auto.label === "ON" ? "Pause auto" : "Resume auto"}</button>`}
      </div>`;
  }

  function queuedStartSpec() {
    const q = state?.queuedSpecial;
    if (!q) return null;
    if (q.kind === "RANDOM") return { action: "start_random", payload: {} };
    const dex = Number(q.dex);
    if (!dex) return null;
    let shiny = null;
    if (q.shiny === true || q.shiny === "true") shiny = true;
    else if (q.shiny === false || q.shiny === "false") shiny = false;
    return {
      action: "start_specific",
      payload: { dex, gender: q.gender || null, shiny }
    };
  }

  function renderQueue() {
    if (!els.queue) return;
    const q = state?.queuedSpecial;
    const w = state?.safeWindow || {};
    els.queue.classList.toggle("is-compact", !q);
    els.queue.innerHTML = q
      ? `<p class="eyebrow">Queued special</p>
         <h2>${q.kind === "RANDOM" ? "Weighted random (not rolled yet)" : esc(q.name || "Special")}</h2>
         <p>${q.kind === "SPECIAL" ? `Variant: ${q.shiny === true || q.shiny === "true" ? "Shiny" : (q.gender || "natural")} · ` : ""}Waiting for: ${esc(state?.director?.delayText || "a safe window.")}</p>
         <p>Queued at ${when(q.queuedAt)} · Safe: ${esc(w.state || "UNKNOWN")}</p>
         <div class="links">
           <button type="button" data-act="start_queued">Start now</button>
           <button type="button" class="secondary" data-act="snooze_start_queued">Snooze + start</button>
           <button type="button" class="secondary" disabled>Wait</button>
           <button type="button" class="secondary" data-act="cancel_queue">Cancel queue</button>
         </div>`
      : `<p class="eyebrow">Queued special</p><p><strong>None</strong></p>`;
  }

  const MODE_LABELS = {
    NORMAL: "Normal",
    HIGH_ACTION: "High-Action Gameplay",
    STORY: "Story / Cutscene",
    REACTION: "Reaction / Direct",
    COLLAB: "Collab",
    BRB: "BRB",
    SPECIAL_EVENT: "Special Event"
  };

  function renderMode() {
    if (!els.mode) return;
    const s = state?.stream || {};
    const modes = Object.keys(MODE_LABELS);
    if (document.activeElement?.id === "stream-mode") return;
    els.mode.innerHTML = `
      <label class="field">Stream mode
        <select id="stream-mode">${modes.map((m) => `<option value="${m}"${s.mode === m ? " selected" : ""}>${MODE_LABELS[m]}</option>`).join("")}</select>
      </label>
      <p class="muted">Changes when automatic encounters are allowed; it does not change catch odds.</p>
      <p>${esc(s.modeLabel || "")}</p>`;
  }

  function renderDexOpts(matches) {
    const box = byId("live-dex-opts");
    if (!box) return;
    if (!pickQuery.trim() || !matches.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = matches.slice(0, 12).map((row) => (
      `<button type="button" data-pick-dex="${row.dex}">${window.playPadDex(row.dex)} ${esc(row.name)}</button>`
    )).join("");
  }

  function rememberSpecific() {
    const dexEl = byId("live-dex");
    const shinyEl = byId("live-shiny");
    const genderEl = byId("live-gender");
    if (dexEl) {
      pickQuery = dexEl.value || "";
      const matches = window.playParseSpeciesQuery ? window.playParseSpeciesQuery(pickQuery) : [];
      pickDex = matches.length === 1 ? matches[0].dex : null;
      renderDexOpts(matches);
    }
    if (shinyEl) pickShiny = shinyEl.value || "random";
    if (genderEl) pickGender = genderEl.value || "";
    const preview = byId("live-preview");
    const previewCopy = byId("live-preview-copy");
    if (preview && pickDex && typeof window.playSpriteUrl === "function") {
      const variant = typeof window.playSpriteVariant === "function"
        ? window.playSpriteVariant(pickDex, pickGender, pickShiny === "shiny")
        : (pickShiny === "shiny" ? "shiny" : "normal");
      preview.src = window.playSpriteUrl(pickDex, variant);
      preview.hidden = false;
      if (previewCopy) previewCopy.textContent = `${window.playPadDex(pickDex)} ${window.playSpeciesName(pickDex)}`;
    } else if (preview) {
      preview.removeAttribute("src");
      preview.hidden = true;
      if (previewCopy) previewCopy.textContent = "Pick a species to preview.";
    }
  }

  function renderControls() {
    if (!els.controls) return;
    const busy = Boolean(state?.activeEncounter);
    const w = state?.safeWindow || {};
    const shinyOpts = [
      ["random", "Random"],
      ["normal", "Force normal"],
      ["shiny", "Force shiny"]
    ].map(([value, label]) => `<option value="${value}"${pickShiny === value ? " selected" : ""}>${label}</option>`).join("");
    const genderOpts = [
      ["", "Random / valid"],
      ["Male", "Male"],
      ["Female", "Female"],
      ["Genderless", "Genderless"]
    ].map(([value, label]) => `<option value="${value}"${pickGender === value ? " selected" : ""}>${label}</option>`).join("");
    const dexValue = pickQuery || (pickDex ? `${window.playPadDex(pickDex)} ${window.playSpeciesName(pickDex)}` : "");
    const autoOn = autoLabel(state?.director || {}, state?.stream || {}) === "ON";
    els.controls.innerHTML = `
      <p class="eyebrow">Quick controls</p>
      <div class="command-grid">
        <button type="button" class="gold" data-act="start_random" ${busy ? "disabled" : ""}>${busy ? "Encounter active" : (testMode() ? "Start test random" : "Start random")}</button>
        <button type="button" data-act="open_specific" ${busy ? "disabled" : ""}>${testMode() ? "Start test specific" : "Start specific"}</button>
        ${testMode() ? `<button type="button" class="danger" data-act="stop_test">Stop test encounter</button>` : `<button type="button" class="secondary" data-act="open_specific">Queue special</button>`}
      </div>
      ${testMode() ? `<p class="muted">Use Stop test encounter to end the current test without waiting for the phase timer.</p>` : `<div class="links">
        <button type="button" class="secondary" data-act="queue_random" ${busy ? "disabled" : ""}>Queue random</button>
        <button type="button" class="secondary" data-act="${autoOn ? "pause_auto" : "resume_auto"}">${autoOn ? "Pause auto" : "Resume auto"}</button>
      </div>
      <p class="muted">${w.state === "UNSAFE" ? "Wait until after the upcoming ad, or queue until safe." : ""}</p>`}`;
    const dexEl = byId("live-dex");
    if (dexEl && !document.activeElement?.closest("#live-specific") && dexValue && dexEl.value !== dexValue) {
      dexEl.value = dexValue;
    }
    const shinyEl = byId("live-shiny");
    const genderEl = byId("live-gender");
    if (shinyEl && document.activeElement !== shinyEl) shinyEl.innerHTML = shinyOpts;
    if (genderEl && document.activeElement !== genderEl) genderEl.innerHTML = genderOpts;
  }

  function renderSession() {
    if (!els.session) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const dur = s.startedAt ? clock(Math.floor((Date.now() - Date.parse(s.startedAt)) / 1000)) : "—";
    const auto = autoInfo(d, s);
    els.session.innerHTML = `
      <p class="eyebrow">Live RPG</p>
      <h2>${rpgFace(s)}</h2>
      <p class="muted">Runs automatically when Twitch is live. Stream Mode changes when automatic encounters are allowed; it does not change catch odds.</p>
      <p>${s.rpgSession && !testMode() ? `Active ${dur}${s.viewers != null ? ` · Viewers ${s.viewers}` : ""}` : (testMode() ? "Test Mode is a UI testing state. It is not a live stream session." : "Inactive until Twitch goes live.")}</p>
      <p>Auto: ${auto.label} · ${esc(auto.reason)}</p>
      <details class="hub-advanced">
        <summary>Advanced</summary>
        <div class="links">
          <button type="button" class="secondary" data-act="refresh_live">Refresh Twitch Status</button>
          ${s.rpgSession ? `<button type="button" class="secondary" data-act="end_session">End live RPG session</button>` : `<button type="button" class="secondary" data-act="start_session">Force Start Live RPG Session</button>`}
          <button type="button" class="secondary" data-act="copy">Copy status</button>
        </div>
      </details>`;
  }

  function renderHistory() {
    if (!els.history) return;
    const rows = state?.recentEncounters || [];
    els.history.innerHTML = rows.length
      ? `<table class="report-table"><thead><tr><th>Time</th><th>Pokémon</th><th>Rarity</th><th>Trigger</th><th>Joined</th><th>Caught</th><th>Status</th></tr></thead><tbody>${
        rows.map((row) => `<tr>
          <td>${when(row.at)}</td>
          <td>${String(row.variant || "").includes("shiny") ? "✨ " : ""}${esc(row.name)}</td>
          <td>${esc(row.rarity || "")}</td>
          <td>${esc(row.trigger || "")}</td>
          <td>${row.joined || 0}</td>
          <td>${row.caught || 0}</td>
          <td>${esc(row.status || "")}</td>
        </tr>`).join("")
      }</tbody></table>`
      : `<p class="muted">No encounters yet this stream.</p>`;
  }

  function renderLog() {
    if (!els.log) return;
    const rows = state?.recentDirectorEvents || [];
    els.log.innerHTML = rows.length
      ? `<ol class="live-dir-log">${rows.map((row) => `<li><time>${when(row.at)}</time> <strong>${esc(row.action)}</strong> ${esc(row.reason || "")}</li>`).join("")}</ol>`
      : `<p class="muted">No Director events yet.</p>`;
  }

  function render() {
    if (!state) {
      renderErrors();
      return;
    }
    renderBar();
    renderErrors();
    renderEncounter();
    renderSafe();
    renderAds();
    renderNext();
    renderQueue();
    renderMode();
    renderControls();
    renderSession();
    renderHistory();
    renderLog();
    if (typeof opts.onState === "function") opts.onState(state);
  }

  function specificPayload() {
    rememberSpecific();
    const raw = pickQuery || byId("live-dex")?.value || "";
    const matches = window.playParseSpeciesQuery ? window.playParseSpeciesQuery(raw) : [];
    const dex = pickDex || matches[0]?.dex;
    if (!dex) return null;
    const genders = window.playGenderOptions?.(dex) || ["Male", "Female", "Genderless"];
    const shinySel = byId("live-shiny")?.value || pickShiny;
    const genderSel = byId("live-gender")?.value || pickGender;
    if (genderSel && genders.length && !genders.includes(genderSel)) {
      if (els.status) els.status.textContent = "That gender is not valid for this Pokémon.";
      return null;
    }
    return {
      dex,
      gender: genderSel || null,
      shiny: shinySel === "random" ? null : shinySel === "shiny"
    };
  }

  function startUnsafeConfirm(action, payload, extra) {
    const unsafe = ["UNSAFE", "SHORT"].includes(state?.safeWindow?.state);
    if (!unsafe) {
      cmd(action, payload);
      return;
    }
    const queueAction = extra?.queue === false
      ? ""
      : (action === "start_random" ? "queue_random" : "queue_special");
    confirm(
      "Start anyway?",
      `${state.safeWindow.reason || "The safe window is short."} A full encounter needs about 3 minutes.`,
      "Start anyway",
      () => cmd(action, { ...payload, anyway: true }),
      { queueAction }
    );
  }

  function openSpecific() {
    const modal = byId("live-specific");
    if (modal && typeof modal.showModal === "function") modal.showModal();
    else if (modal) modal.setAttribute("open", "");
  }

  function inLiveSurface(node) {
    return Boolean(node?.closest?.("#live-app, #live-specific, #live-confirm, [data-hub-panel='system']"));
  }

  document.addEventListener("input", (event) => {
    if (event.target.id === "live-dex") rememberSpecific();
  });
  document.addEventListener("change", (event) => {
    if (!inLiveSurface(event.target)) return;
    if (event.target.id === "live-shiny" || event.target.id === "live-gender") rememberSpecific();
    if (event.target.id === "stream-mode") cmd("set_mode", { mode: event.target.value || "NORMAL" });
  });
  document.addEventListener("click", (event) => {
    if (!inLiveSurface(event.target)) return;
    const jump = event.target.closest("[data-jump]");
    if (jump && typeof window.playShowHubTab === "function") {
      if (jump.dataset.jump === "encounter") {
        byId("dash-encounter")?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (jump.dataset.jump === "dashboard") {
        window.playShowHubTab("dashboard", "", { push: true });
        return;
      }
      window.playShowHubTab(jump.dataset.jump, jump.dataset.jumpView || "", { push: true });
      return;
    }
    const pickBtn = event.target.closest("[data-pick-dex]");
    if (pickBtn) {
      pickDex = Number(pickBtn.dataset.pickDex);
      pickQuery = `${window.playPadDex(pickDex)} ${window.playSpeciesName(pickDex)}`;
      const dexEl = byId("live-dex");
      if (dexEl) dexEl.value = pickQuery;
      renderDexOpts([]);
      return;
    }
    const modeBtn = event.target.closest("[data-mode]");
    if (modeBtn) {
      cmd("set_mode", { mode: modeBtn.dataset.mode });
      return;
    }
    const btn = event.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === "open_details") {
      if (typeof opts.onOpenDetails === "function") opts.onOpenDetails();
      return;
    }
    if (act === "open_specific") {
      openSpecific();
      return;
    }
    if (act === "enter_test") {
      setTestMode(true);
      render();
      if (els.status) els.status.textContent = "Test Mode on. Start a test encounter when you are ready.";
      return;
    }
    if (act === "exit_test") {
      setTestMode(false);
      render();
      if (els.status) els.status.textContent = "Test Mode off.";
      return;
    }
    if (act === "return_normal") {
      cmd("return_normal", {});
      return;
    }
    if (act === "copy") {
      const d = state?.director || {};
      const ad = state?.adState || {};
      const liveLabel = state?.stream?.twitchLive ? "Live" : (state?.stream?.liveKnown ? "Offline" : "Unknown");
      const text = `Stream: ${liveLabel}\nMode: ${state?.stream?.mode}\nAuto: ${d.autoEnabled ? "On" : "Off"}\nActive: ${state?.activeEncounter?.name || "None"}\nNext: ${d.nextEncounterAt || "—"}\nNext Ad: ${ad.nextAdAt || "—"}\nQueued: ${state?.queuedSpecial?.name || "None"}`;
      navigator.clipboard?.writeText(text);
      if (els.status) els.status.textContent = "Session status copied.";
      return;
    }
    if (act === "set_mode") {
      cmd("set_mode", { mode: byId("stream-mode")?.value || "NORMAL" });
      return;
    }
    if (act === "set_next_ad") {
      const raw = byId("next-ad-at")?.value;
      if (!raw) {
        if (els.status) els.status.textContent = "Pick a fallback ad time.";
        return;
      }
      cmd("set_next_ad", { nextAdAt: new Date(raw).toISOString() });
      return;
    }
    if (act === "start_specific" || act === "queue_special") {
      const payload = specificPayload();
      if (!payload) {
        if (els.status) els.status.textContent = "Pick an enabled Kanto Pokémon.";
        return;
      }
      if (act === "queue_special") {
        try { byId("live-specific")?.close(); } catch (_) {}
        cmd(act, payload);
        return;
      }
      try { byId("live-specific")?.close(); } catch (_) {}
      if (testMode()) {
        cmd("start_test", payload);
        return;
      }
      startUnsafeConfirm(act, payload);
      return;
    }
    if (act === "start_queued") {
      const spec = queuedStartSpec();
      if (!spec) return;
      startUnsafeConfirm(spec.action, spec.payload, { queue: false });
      return;
    }
    if (act === "snooze_start_queued") {
      const spec = queuedStartSpec();
      if (!spec) return;
      confirm(
        "Snooze the next ad, then start the queued encounter?",
        `${state?.safeWindow?.reason || "This uses the existing snooze and start commands."}`,
        "Snooze + start",
        async () => {
          await adsFn("snooze");
          startUnsafeConfirm(spec.action, spec.payload, { queue: false });
        }
      );
      return;
    }
    if (act === "start_random") {
      if (testMode()) {
        cmd("start_test", {});
        return;
      }
      startUnsafeConfirm("start_random", {});
      return;
    }
    if (act === "start_test") {
      cmd("start_test", {});
      return;
    }
    if (act === "end_session") {
      cmd("end_session", {}, {
        confirmTitle: "End the live RPG session?",
        confirmBody: state?.activeEncounter
          ? "An encounter is still active. The Director will not end the session until it finishes or is cancelled."
          : "This stops new automatic encounters. Normal streams do not need this.",
        go: "End session"
      });
      return;
    }
    if (act === "start_session") {
      cmd("start_session", {}, {
        confirmTitle: "Force start the Live RPG session?",
        confirmBody: "Starts the live RPG Director even if Twitch live detection is unavailable or delayed. This is not the normal way to test while offline.",
        go: "Force start"
      });
      return;
    }
    if (act === "stop_test") {
      stopTest();
      return;
    }
    if (act === "cancel_encounter") {
      const name = state?.activeEncounter?.name || "this";
      const phase4 = /reveal|throw/i.test(state?.activeEncounter?.phase || "");
      cmd("cancel_encounter", { confirm: true }, {
        confirmTitle: `Cancel the active ${name} encounter?`,
        confirmBody: phase4
          ? "Capture attempts may already be committed. Completing the encounter is recommended."
          : "Joined Trainers will lose this encounter. Committed items are refunded by the existing cancel logic.",
        go: phase4 ? "Cancel anyway" : "Cancel encounter"
      });
      return;
    }
    if (act === "connect_ads") {
      connectAds();
      return;
    }
    if (act === "refresh_ads") {
      adsFn("refresh");
      return;
    }
    if (act === "refresh_live") {
      refreshLive(true);
      return;
    }
    if (act === "snooze_ad") {
      confirm("Snooze the next Twitch ad by 5 minutes?", `Current: ${when(state?.adState?.nextAdAt)}. Snoozes remaining after: ${Math.max(0, (state?.adState?.snoozeCount || 1) - 1)}.`, "Snooze", () => adsFn("snooze"));
      return;
    }
    if (act === "mark_ad_started") {
      cmd("mark_ad_started", { durationSec: 180 }, { confirmTitle: "Mark ad started?", confirmBody: "This pauses an active encounter for everyone.", go: "Mark ad started" });
      return;
    }
    cmd(act, {});
  });

  els.modalGo?.addEventListener("click", () => {
    const fn = confirmFn;
    confirmFn = null;
    try { els.modal.close(); } catch (_) {}
    fn?.();
  });
  byId("live-confirm-queue")?.addEventListener("click", () => {
    const queueBtn = byId("live-confirm-queue");
    const action = queueBtn?.dataset.queueAction;
    const fn = confirmFn;
    confirmFn = null;
    try { els.modal.close(); } catch (_) {}
    if (action === "queue_random") cmd("queue_random", {});
    else if (action === "queue_special") {
      const payload = specificPayload();
      if (payload) cmd("queue_special", payload);
    } else {
      fn?.();
    }
  });

  async function refreshLive(force) {
    const now = Date.now();
    if (!force && now - lastLivePoll < 60000) return;
    lastLivePoll = now;
    try {
      const { data, error } = await supabase.functions.invoke("twitch-live", { body: {} });
      if (error) throw error;
      if (force && els.status) els.status.textContent = data?.message || "Twitch live status updated.";
      await load(true);
    } catch (error) {
      if (force && els.status) {
        els.status.textContent = error?.message || "Twitch live status unavailable. Start an RPG session to run encounters.";
      }
    }
  }

  async function adsFn(action) {
    pending = true;
    if (els.status) els.status.textContent = action === "snooze" ? "Snoozing…" : "Refreshing ads…";
    try {
      const { data, error } = await supabase.functions.invoke("twitch-ads", { body: { action } });
      if (error) throw error;
      if (els.status) els.status.textContent = data?.message || "Twitch ad schedule updated.";
      await load(true);
    } catch (error) {
      if (els.status) els.status.textContent = error?.message || "Twitch ad schedule unavailable. Using fallback encounter timing.";
    } finally {
      pending = false;
    }
  }

  async function connectAds() {
    const { data: sessionData } = await supabase.auth.getSession();
    const existing = sessionData.session?.provider_token;
    if (existing) {
      pending = true;
      try {
        const { data, error } = await supabase.functions.invoke("twitch-ads", {
          body: { action: "connect", accessToken: existing }
        });
        if (error) throw error;
        if (els.status) els.status.textContent = data?.message || "Twitch ad schedule updated.";
        await load(true);
        return;
      } catch (_) {
        /* fall through to OAuth so channel:read:ads can be granted */
      } finally {
        pending = false;
      }
    }
    sessionStorage.setItem("playAdsConnect", "1");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitch",
      options: {
        redirectTo: window.location.href.split("#")[0],
        scopes: "user:read:email user:read:subscriptions channel:read:ads channel:manage:ads",
        queryParams: { force_verify: "true" }
      }
    });
    if (error && els.status) els.status.textContent = error.message || "Twitch ad authorization still needs to be connected.";
  }

  function staffHidden() {
    const staff = byId("staff");
    return Boolean(embedded && staff?.hidden);
  }

  async function load(keepApp) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!embedded) {
      if (!session) {
        els.app.hidden = true;
        if (els.gate) els.gate.hidden = false;
        window.playSetAccountNav(null);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
      window.playSetAccountNav(session, profile, { isAdmin: true });
    } else if (!session) {
      return;
    }
    try {
      if (sessionStorage.getItem("playAdsConnect") === "1" && session.provider_token) {
        sessionStorage.removeItem("playAdsConnect");
        await supabase.functions.invoke("twitch-ads", {
          body: { action: "connect", accessToken: session.provider_token }
        });
      }
      state = await window.playCall("admin_live_dashboard");
      disconnected = false;
      if (!embedded) {
        if (els.gate) els.gate.hidden = true;
        els.app.hidden = false;
      }
      render();
      if (!keepApp) refreshLive(false);
    } catch (error) {
      disconnected = true;
      if (embedded || (keepApp && !els.app.hidden)) {
        renderErrors();
        if (els.status) els.status.textContent = window.playRpcError(error, "Live data disconnected.");
        return;
      }
      if (els.gate) {
        els.gate.hidden = false;
        els.gate.textContent = window.playRpcError(error, "Stream Session is not available yet.");
      }
      els.app.hidden = true;
    }
  }

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  setInterval(() => {
    if (document.visibilityState !== "visible" || pending || staffHidden()) return;
    if (!embedded && els.app.hidden) return;
    load(true);
    refreshLive(false);
  }, 4000);
  load();
};

if (document.body?.dataset?.page === "admin-live") {
  window.playBindLiveOps({ embedded: false });
}
