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

  function autoLabel(d, s) {
    if (!s.rpgSession) return d.autoEnabled ? "WAITING" : "OFF";
    if (d.manualHold || !d.autoEnabled) return "OFF";
    return "ON";
  }

  function renderBar() {
    if (!els.bar) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const ad = state?.adState || {};
    const live = s.twitchLive ? "LIVE" : (s.liveKnown ? "OFFLINE" : "UNKNOWN");
    const auto = autoLabel(d, s);
    els.bar.innerHTML = [
      `<div><em>● Stream</em><strong>${live}</strong></div>`,
      `<div><em>◆ RPG Session</em><strong>${s.rpgSession ? "ACTIVE" : "INACTIVE"}</strong></div>`,
      `<div><em>▶ Director</em><strong>${esc(directorLabel(d, s))}</strong></div>`,
      `<div><em>↻ Auto</em><strong>${auto}${auto === "WAITING" ? " · needs session" : ""}</strong></div>`,
      `<div><em>◎ Mode</em><strong>${esc((s.mode || "NORMAL").replace("_", " "))}</strong></div>`,
      `<div><em>■ Ads</em><strong>${esc(ad.status || "UNKNOWN")}</strong></div>`,
      `<div><em>★ Encounter</em><strong>${state?.activeEncounter ? esc(state.activeEncounter.name) : "NONE"}</strong></div>`
    ].join("");
    const idle = !s.twitchLive && !s.rpgSession;
    els.app?.classList.toggle("is-offline-idle", idle);
    const adsEl = document.getElementById("card-timing");
    adsEl?.classList.toggle("is-alert", Boolean(ad.adActive));
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
    if (ad.authorizationNeeded) notes.push(`Twitch Ads not connected. <button type="button" class="secondary" data-act="connect_ads">Connect Twitch Ads</button>`);
    if (ad.stale && ad.dataAvailable) notes.push(`Ad data may be stale. <button type="button" class="secondary" data-act="refresh_ads">Refresh ads</button>`);
    if (/not subscribed/i.test(h.eventSub || "") && (s.rpgSession || ad.connected)) notes.push("EventSub disconnected.");
    if (h.director && h.director !== "Healthy") notes.push(`Director: ${esc(h.director)}`);
    els.errors.hidden = !notes.length;
    els.errors.innerHTML = notes.join(" · ");
  }

  function renderEncounter() {
    if (!els.encounter) return;
    const round = state?.activeEncounter;
    const wrap = document.getElementById("dash-encounter");
    if (!round) {
      els.encounter.innerHTML = "";
      els.encounter.hidden = true;
      wrap?.classList.add("is-compact");
      return;
    }
    wrap?.classList.remove("is-compact");
    els.encounter.hidden = false;
    els.encounter.innerHTML = `
      <div class="links">
        <button type="button" class="secondary" data-act="pause_encounter"${round.paused ? " disabled" : ""}>Pause</button>
        <button type="button" class="secondary" data-act="resume_encounter"${round.paused ? "" : " disabled"}>Resume</button>
        ${embedded ? `<button type="button" class="secondary" data-act="open_details">Details</button>` : ""}
        <button type="button" class="danger" data-act="cancel_encounter">Cancel</button>
      </div>`;
    els.encounter.dataset.busy = "1";
  }

  function renderSafe() {
    if (!els.safe) return;
    const w = state?.safeWindow || {};
    els.safe.innerHTML = `
      <p class="eyebrow">Stream timing</p>
      <h2>Safe to start: ${esc(w.state || "UNKNOWN")}</h2>
      <p>${esc(w.reason || "Loading…")}</p>
      <div class="hub-kv">
        <div><span>Available window</span><strong>${w.availableSeconds == null ? "—" : clock(w.availableSeconds)}</strong></div>
        <div><span>Required window</span><strong>${clock(w.requiredSeconds || 180)}</strong></div>
      </div>`;
  }

  function renderAds() {
    if (!els.ads) return;
    const ad = state?.adState || {};
    const cfg = state?.config || {};
    const left = ad.adActive ? until(ad.activeExpectedEndAt) : until(ad.nextAdAt);
    els.ads.innerHTML = `
      ${ad.adActive ? `<p><strong>AD ACTIVE</strong> · Remaining ${clock(left)} · ${state?.activeEncounter ? "Encounter paused" : "No encounter"}</p>` : `<div class="hub-kv">
        <div><span>Next Twitch ad</span><strong>${when(ad.nextAdAt)}</strong></div>
        <div><span>Starts in</span><strong>${left == null ? "—" : clock(left)}</strong></div>
        <div><span>Duration</span><strong>${clock(ad.nextAdDurationSec || 0)}</strong></div>
        <div><span>Snoozes</span><strong>${ad.snoozeCount ?? 0}</strong></div>
      </div>`}
      <p>Connected: ${ad.connected || !ad.authorizationNeeded ? "Yes" : "No"} · Updated ${when(ad.lastRefreshAt)}</p>
      <div class="links">
        ${ad.authorizationNeeded ? `<button type="button" class="secondary" data-act="connect_ads">Connect Twitch Ads</button>` : ""}
        <button type="button" class="secondary" data-act="refresh_ads">Refresh ads</button>
        ${ad.manageAvailable && ad.snoozeCount > 0 && !ad.adActive ? `<button type="button" class="secondary" data-act="snooze_ad">Snooze next ad</button>` : ""}
        <button type="button" class="secondary" data-act="mark_ad_started">Mark ad started</button>
        <button type="button" class="secondary" data-act="mark_ad_ended">Mark ad ended</button>
      </div>
      <label class="field">Set next estimated ad
        <input id="next-ad-at" type="datetime-local">
      </label>
      <button type="button" class="secondary" data-act="set_next_ad">Save fallback ad time</button>
      <p class="muted">Post-ad cooldown ${cfg.postAdCooldownSeconds || 30}s</p>`;
  }

  function renderNext() {
    if (!els.next) return;
    const s = state?.stream || {};
    const d = state?.director || {};
    const left = until(d.nextEncounterAt);
    const delayed = Boolean(d.delayReason || d.delayText);
    const auto = autoLabel(d, s);
    els.next.innerHTML = `
      <p class="eyebrow">Encounter Director</p>
      <h2>${d.manualHold || !d.autoEnabled ? "Paused" : (delayed && d.nextEncounterAt ? "Delayed" : (d.nextEncounterAt ? `~${clock(left)}` : "Waiting"))}</h2>
      <div class="hub-kv">
        <div><span>Auto</span><strong>${auto}${auto === "WAITING" ? " · waiting for RPG session" : ""}</strong></div>
        <div><span>Next encounter</span><strong>${when(d.nextEncounterAt)}</strong></div>
      </div>
      <p>${esc(d.delayText || "Waiting.")}</p>
      ${d.overdueFrom || (d.nextEncounterAt && Date.parse(d.nextEncounterAt) < Date.now() - 60000)
        ? `<p>Overdue. Reason: ${esc(d.delayText || "")}</p>` : ""}
      <div class="links">
        <button type="button" class="secondary" data-act="${auto === "ON" ? "pause_auto" : "resume_auto"}">${auto === "ON" ? "Pause auto" : "Resume auto"}</button>
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
      let variant = "normal";
      if (pickShiny === "shiny" && pickGender === "Female") variant = "shiny-female";
      else if (pickShiny === "shiny") variant = "shiny";
      else if (pickGender === "Female") variant = "female";
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
    const sessionOn = Boolean(state?.stream?.rpgSession);
    els.controls.innerHTML = `
      <p class="eyebrow">Quick controls</p>
      <div class="command-grid">
        <button type="button" class="gold" data-act="start_random" ${busy ? "disabled" : ""}>${busy ? "Encounter active" : "Start random"}</button>
        <button type="button" data-act="open_specific" ${busy ? "disabled" : ""}>Start specific</button>
        <button type="button" class="secondary" data-act="open_specific">Queue special</button>
      </div>
      <div class="links">
        <button type="button" class="secondary" data-act="queue_random" ${busy ? "disabled" : ""}>Queue random</button>
        <button type="button" class="secondary" data-act="${autoOn ? "pause_auto" : "resume_auto"}">${autoOn ? "Pause auto" : "Resume auto"}</button>
        ${sessionOn
          ? `<button type="button" class="secondary" data-act="end_session">End RPG session</button>`
          : `<button type="button" data-act="start_session">Start RPG session</button>`}
        <button type="button" class="secondary" data-act="start_test">Start test</button>
      </div>
      <p class="muted">${w.state === "UNSAFE" ? "Unsafe window — prefer Queue until safe." : ""}</p>`;
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
    const auto = autoLabel(d, s);
    els.session.innerHTML = `
      <p class="eyebrow">RPG session</p>
      <h2>${s.rpgSession ? "Active" : "Inactive"}</h2>
      <p>${s.rpgSession ? `Duration ${dur}${s.viewers != null ? ` · Viewers ${s.viewers}` : ""}` : "Start a session when the stream is live."}</p>
      <p>Auto: ${auto}${auto === "WAITING" ? " · waiting for active RPG session" : ""}</p>
      <div class="links">
        <button type="button" class="secondary" data-act="refresh_live">Refresh live status</button>
        ${s.rpgSession
          ? `<button type="button" class="secondary" data-act="end_session">End session</button>`
          : `<button type="button" data-act="start_session">Start RPG session</button>`}
        <button type="button" class="secondary" data-act="copy">Copy status</button>
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
    return Boolean(node?.closest?.("#live-app, #live-specific, #live-confirm"));
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
