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

  function confirm(title, body, goLabel, fn) {
    confirmFn = fn;
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

  function renderBar() {
    if (!els.bar) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const ad = state?.adState || {};
    const live = s.twitchLive ? "LIVE" : (s.liveKnown ? "OFFLINE" : "UNKNOWN");
    els.bar.innerHTML = [
      `<div><em>Stream</em><strong>${live}</strong></div>`,
      `<div><em>RPG Session</em><strong>${s.rpgSession ? "ACTIVE" : "INACTIVE"}</strong></div>`,
      `<div><em>Director</em><strong>${esc(directorLabel(d, s))}</strong></div>`,
      `<div><em>Auto Encounters</em><strong>${d.autoEnabled && !d.manualHold ? "ON" : "OFF"}</strong></div>`,
      `<div><em>Stream Mode</em><strong>${esc(s.mode || "NORMAL")}</strong></div>`,
      `<div><em>Twitch Ads</em><strong>${esc(ad.status || "UNKNOWN")}</strong></div>`,
      `<div><em>Active Encounter</em><strong>${state?.activeEncounter ? esc(state.activeEncounter.name) : "NONE"}</strong></div>`
    ].join("");
  }

  function renderErrors() {
    if (!els.errors) return;
    const ad = state?.adState || {};
    const s = state?.stream || {};
    const notes = [];
    if (disconnected) notes.push("LIVE DATA DISCONNECTED");
    if (!s.liveKnown) notes.push("TWITCH LIVE STATUS HAS NOT BEEN CHECKED RECENTLY. Refresh live status or start an RPG session.");
    if (s.liveError) notes.push(s.liveError);
    if (ad.authorizationNeeded) notes.push("TWITCH AD AUTHORIZATION STILL NEEDS TO BE CONNECTED. Fallback ad controls are available.");
    if (ad.stale && ad.dataAvailable) notes.push("AD DATA MAY BE STALE");
    els.errors.hidden = !notes.length;
    els.errors.textContent = notes.join(" · ");
  }

  function renderEncounter() {
    if (!els.encounter) return;
    const round = state?.activeEncounter;
    const busy = Boolean(round);
    if (!round) {
      els.encounter.innerHTML = `<p class="eyebrow">Current encounter</p>
        <h2>None</h2>
        <p>Waiting for the next encounter.</p>`;
      return;
    }
    const shiny = String(round.variant || "").includes("shiny");
    const left = until(round.endsAt);
    const sprite = window.playSpriteUrl ? window.playSpriteUrl(round.dex, round.variant) : "";
    els.encounter.innerHTML = `
      <p class="eyebrow">Current encounter</p>
      <div class="live-enc-head">
        ${sprite ? `<img class="live-enc-sprite" src="${sprite}" alt="" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
        <div>
          <h2>${shiny ? "✨ SHINY " : ""}${esc(round.name)}${shiny ? " ✨" : ""}</h2>
          <p>${chip(round.rarity || "—")} ${chip(round.phase || "")} ${round.paused ? chip(round.pausedForBreak ? "Paused for ad" : "Paused", "pause") : ""}</p>
        </div>
      </div>
      <p>Time remaining: ${round.paused ? "PAUSED" : clock(left)}</p>
      <p>Joined: ${round.participants || 0} · Ready: ${round.prepared || 0} / ${round.participants || 0} · Honey: ${round.honeyContributors || 0} / ${round.honeyParticipants || 0}${round.baitBonusPercent != null ? ` · +${round.baitBonusPercent}%` : ""}</p>
      <p>Trigger: ${esc(round.triggerSource || "—")}</p>
      <div class="links">
        <button type="button" class="secondary" data-act="pause_encounter"${round.paused ? " disabled" : ""}>Pause</button>
        <button type="button" class="secondary" data-act="resume_encounter"${round.paused ? "" : " disabled"}>Resume</button>
        ${embedded ? `<button type="button" class="secondary" data-act="open_details">Open details</button>` : ""}
        <button type="button" class="danger" data-act="cancel_encounter">Cancel</button>
      </div>`;
    els.encounter.dataset.busy = busy ? "1" : "0";
  }

  function renderSafe() {
    if (!els.safe) return;
    const w = state?.safeWindow || {};
    els.safe.innerHTML = `
      <p class="eyebrow">Safe to start encounter?</p>
      <h2>${esc(w.state || "UNKNOWN")}</h2>
      <p>${esc(w.reason || "Loading…")}</p>
      <p>Available: ${w.availableSeconds == null ? "—" : clock(w.availableSeconds)} · Required: ${clock(w.requiredSeconds || 180)}</p>
      <p class="muted">Time available before the next scheduled Twitch ad after encounter duration and safety buffer.</p>`;
  }

  function renderAds() {
    if (!els.ads) return;
    const ad = state?.adState || {};
    const cfg = state?.config || {};
    const left = ad.adActive ? until(ad.activeExpectedEndAt) : until(ad.nextAdAt);
    els.ads.innerHTML = `
      <p class="eyebrow">Twitch Ads</p>
      <h2>${esc(ad.status || "UNKNOWN")}</h2>
      <p>Connected: ${ad.connected || !ad.authorizationNeeded ? "Yes" : "No"}</p>
      ${ad.adActive ? `<p><strong>ACTIVE</strong> · Remaining ${clock(left)} · Expected end ${when(ad.activeExpectedEndAt)}</p>` : `<p>Next ad: ${when(ad.nextAdAt)} · Starts in ${left == null ? "—" : clock(left)} · Duration ${clock(ad.nextAdDurationSec || 0)}</p>`}
      <p>Snoozes: ${ad.snoozeCount ?? 0} · Preroll-free: ${ad.prerollFreeSec == null ? "—" : clock(ad.prerollFreeSec)}</p>
      <p class="muted">Source: ${esc(ad.source || "unknown")} · Last updated: ${when(ad.lastRefreshAt)}</p>
      <div class="links">
        <button type="button" class="secondary" data-act="connect_ads">Connect Twitch Ads</button>
        <button type="button" class="secondary" data-act="refresh_ads">Refresh ads</button>
        ${ad.manageAvailable && ad.snoozeCount > 0 && !ad.adActive ? `<button type="button" class="secondary" data-act="snooze_ad">Snooze next ad</button>` : ""}
        <button type="button" class="secondary" data-act="mark_ad_started">Mark ad started</button>
        <button type="button" class="secondary" data-act="mark_ad_ended">Mark ad ended</button>
      </div>
      <label class="field">Set next estimated ad
        <input id="next-ad-at" type="datetime-local">
      </label>
      <button type="button" class="secondary" data-act="set_next_ad">Save fallback ad time</button>
      <p class="muted">Post-ad cooldown ${cfg.postAdCooldownSeconds || 30}s · Auto snooze ${cfg.autoSnooze ? "On" : "Off"}</p>`;
  }

  function renderNext() {
    if (!els.next) return;
    const d = state?.director || {};
    const left = until(d.nextEncounterAt);
    const delayed = Boolean(d.delayReason || d.delayText);
    els.next.innerHTML = `
      <p class="eyebrow">Next auto encounter</p>
      <h2>${d.manualHold || !d.autoEnabled ? "Paused" : (delayed && d.nextEncounterAt ? "Delayed" : (d.nextEncounterAt ? `~${clock(left)}` : "Waiting"))}</h2>
      <p>Auto: ${d.autoEnabled && !d.manualHold ? "ON" : "OFF"} · Target: ${when(d.nextEncounterAt)}</p>
      <p>${esc(d.delayText || "Waiting.")}</p>
      ${d.overdueFrom || (d.nextEncounterAt && Date.parse(d.nextEncounterAt) < Date.now() - 60000)
        ? `<p>Overdue. Reason: ${esc(d.delayText || "")}</p>` : ""}`;
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
    els.queue.innerHTML = `
      <p class="eyebrow">Queued special</p>
      ${q
        ? `<h2>${q.kind === "RANDOM" ? "Weighted random (not rolled yet)" : esc(q.name || "Special")}</h2>
           <p>${q.kind === "SPECIAL" ? `Variant: ${q.shiny === true || q.shiny === "true" ? "Shiny" : (q.gender || "natural")} · ` : ""}Waiting for: ${esc(state?.director?.delayText || "a safe window.")}</p>
           <p>Queued at ${when(q.queuedAt)} · Safe window: ${esc(w.state || "UNKNOWN")}</p>
           <div class="links">
             <button type="button" data-act="start_queued">Start now</button>
             <button type="button" class="secondary" data-act="snooze_start_queued">Snooze + start</button>
             <button type="button" class="secondary" disabled>Wait</button>
             <button type="button" class="secondary" data-act="cancel_queue">Cancel</button>
           </div>`
        : `<h2>None</h2><p>Queue a specific Pokémon or a random launch for the next safe window.</p>`}`;
  }

  function renderMode() {
    if (!els.mode) return;
    const s = state?.stream || {};
    const modes = ["NORMAL", "HIGH_ACTION", "STORY", "REACTION", "COLLAB", "BRB", "SPECIAL_EVENT"];
    els.mode.innerHTML = `
      <p class="eyebrow">Stream mode</p>
      <label class="field">Mode
        <select id="stream-mode">${modes.map((m) => `<option value="${m}"${s.mode === m ? " selected" : ""}>${m.replace("_", " ")}</option>`).join("")}</select>
      </label>
      <p>${esc(s.modeLabel || "")}</p>
      <p>Auto interval: ${s.intervalMin || "—"}–${s.intervalMax || "—"} min</p>
      <div class="links">
        <button type="button" data-act="set_mode">Apply mode</button>
        <button type="button" class="secondary" data-mode="REACTION">Pause for reaction</button>
        <button type="button" class="secondary" data-mode="BRB">BRB mode</button>
        <button type="button" class="secondary" data-act="return_normal">Return to Normal</button>
      </div>`;
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
  }

  function renderControls() {
    if (!els.controls) return;
    const busy = Boolean(state?.activeEncounter);
    const w = state?.safeWindow || {};
    const active = document.activeElement;
    if (els.controls.contains(active) && (active.id === "live-dex" || active.id === "live-shiny" || active.id === "live-gender")) {
      rememberSpecific();
      els.controls.querySelectorAll("[data-act]").forEach((btn) => {
        if (["start_random", "queue_random", "start_specific", "queue_special"].includes(btn.dataset.act)) {
          btn.disabled = busy;
        }
      });
      const startRandom = els.controls.querySelector("[data-act='start_random']");
      if (startRandom) startRandom.textContent = busy ? "An encounter is already active." : "Start random";
      return;
    }
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
    const autoOn = state?.director?.autoEnabled && !state?.director?.manualHold;
    els.controls.innerHTML = `
      <p class="eyebrow">Quick controls</p>
      <div class="command-grid">
        <button type="button" class="gold" data-act="start_random" ${busy ? "disabled" : ""}>${busy ? "An encounter is already active." : "Start random"}</button>
        <button type="button" data-act="queue_random" ${busy ? "disabled" : ""}>Queue random until safe</button>
        <button type="button" class="secondary" data-act="${autoOn ? "pause_auto" : "resume_auto"}">${autoOn ? "Pause auto" : "Resume auto"}</button>
      </div>
      <label class="field">Specific Pokémon
        <input id="live-dex" type="search" placeholder="Eevee or 133" value="${esc(dexValue)}" autocomplete="off">
      </label>
      <div id="live-dex-opts" class="dex-suggest" hidden></div>
      <label class="field">Shiny
        <select id="live-shiny">${shinyOpts}</select>
      </label>
      <label class="field">Gender
        <select id="live-gender">${genderOpts}</select>
      </label>
      <div class="links">
        <button type="button" data-act="start_specific" ${busy ? "disabled" : ""}>Start now</button>
        <button type="button" class="secondary" data-act="queue_special" ${busy ? "disabled" : ""}>Queue until safe</button>
        <button type="button" class="secondary" data-act="start_test">Start test encounter</button>
      </div>
      <p class="muted">${w.state === "UNSAFE" ? "Unsafe window — prefer Queue until safe." : "Safe window uses Director rules, not this page."}</p>`;
    if (pickQuery) {
      const matches = window.playParseSpeciesQuery ? window.playParseSpeciesQuery(pickQuery) : [];
      renderDexOpts(matches);
    }
  }

  function renderSession() {
    if (!els.session) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const h = state?.health || {};
    const dur = s.startedAt ? clock(Math.floor((Date.now() - Date.parse(s.startedAt)) / 1000)) : "—";
    els.session.innerHTML = `
      <p class="eyebrow">Stream session</p>
      <p>Twitch: ${s.twitchLive ? "LIVE" : (s.liveKnown ? "OFFLINE" : "UNKNOWN")} · RPG session: ${s.rpgSession ? "ACTIVE" : "IDLE"}</p>
      <p>Started: ${when(s.startedAt)} · Duration: ${dur}${s.viewers != null ? ` · Viewers ${s.viewers}` : ""}</p>
      <p>Encounters: ${(d.encountersAuto || 0) + (d.encountersManual || 0) + (d.encountersEvent || 0)} · Auto ${d.encountersAuto || 0} · Manual ${d.encountersManual || 0} · Event ${d.encountersEvent || 0}</p>
      <p>Ad delays: ${d.encountersDelayedAds || 0} · Ad pauses: ${d.encountersPausedAds || 0}</p>
      <p class="muted">Live check: ${when(s.liveCheckedAt)} · Source: ${esc(s.liveSource || "none")} · ${s.eventSubLive ? "Live EventSub ready" : "Live EventSub not subscribed"}</p>
      <p class="muted">Director ${esc(h.director)} · Ads ${esc(h.twitchAds)} · Live ${esc(h.twitchLive)} · ${esc(h.eventSub)}</p>
      <div class="links">
        <button type="button" class="secondary" data-act="refresh_live">Refresh live status</button>
        <button type="button" data-act="start_session">Start RPG session</button>
        <button type="button" class="secondary" data-act="end_session">End RPG session</button>
        <button type="button" class="secondary" data-act="copy">Copy session status</button>
      </div>`;
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

  function startUnsafeConfirm(action, payload) {
    const unsafe = ["UNSAFE", "SHORT"].includes(state?.safeWindow?.state);
    cmd(action, unsafe ? { ...payload, anyway: true } : payload, unsafe
      ? {
        confirmTitle: "Start anyway?",
        confirmBody: `${state.safeWindow.reason || "The safe window is short."} A full encounter needs about 3 minutes.`,
        go: "Start anyway"
      }
      : undefined);
  }

  root.addEventListener("input", (event) => {
    if (event.target.id === "live-dex") rememberSpecific();
  });
  root.addEventListener("change", (event) => {
    if (event.target.id === "live-shiny" || event.target.id === "live-gender") rememberSpecific();
  });
  root.addEventListener("click", (event) => {
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
        cmd(act, payload);
        return;
      }
      startUnsafeConfirm(act, payload);
      return;
    }
    if (act === "start_queued") {
      const spec = queuedStartSpec();
      if (!spec) return;
      startUnsafeConfirm(spec.action, spec.payload);
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
          startUnsafeConfirm(spec.action, spec.payload);
        }
      );
      return;
    }
    if (act === "start_random") {
      startUnsafeConfirm("start_random", {});
      return;
    }
    if (act === "end_session") {
      cmd("end_session", {}, {
        confirmTitle: "End RPG session?",
        confirmBody: state?.activeEncounter
          ? "An encounter is still active. The Director will not end the session until it finishes or is cancelled."
          : "This stops new automatic encounters.",
        go: "End session"
      });
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
