(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("live-app"),
    bar: document.getElementById("live-bar"),
    errors: document.getElementById("live-errors"),
    status: document.getElementById("live-status"),
    encounter: document.getElementById("card-encounter"),
    safe: document.getElementById("card-safe"),
    ads: document.getElementById("card-ads"),
    next: document.getElementById("card-next"),
    queue: document.getElementById("card-queue"),
    mode: document.getElementById("card-mode"),
    controls: document.getElementById("card-controls"),
    session: document.getElementById("card-session"),
    history: document.getElementById("live-history"),
    log: document.getElementById("live-log"),
    modal: document.getElementById("live-confirm"),
    modalTitle: document.getElementById("live-confirm-title"),
    modalBody: document.getElementById("live-confirm-body"),
    modalGo: document.getElementById("live-confirm-go")
  };
  let state = null;
  let pending = false;
  let confirmFn = null;
  let pickDex = null;
  let pickGender = "";
  let pickShiny = "random";
  let disconnected = false;
  let lastLivePoll = 0;

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      els.gate.hidden = false;
    }
  });

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

  function confirm(title, body, goLabel, fn) {
    confirmFn = fn;
    els.modalTitle.textContent = title;
    els.modalBody.textContent = body;
    els.modalGo.textContent = goLabel;
    if (typeof els.modal.showModal === "function") els.modal.showModal();
    else els.modal.setAttribute("open", "");
  }

  async function cmd(action, payload, { confirmTitle, confirmBody, go } = {}) {
    if (pending) return;
    const run = async () => {
      pending = true;
      els.status.textContent = "Working…";
      try {
        const data = await window.playCall("admin_director_command", { p_action: action, p_payload: payload || {} });
        state = data;
        disconnected = false;
        render();
        els.status.textContent = data?.message || "Updated.";
      } catch (error) {
        els.status.textContent = window.playHumanRpcError
          ? window.playHumanRpcError(error)
          : window.playRpcError(error);
      } finally {
        pending = false;
      }
    };
    if (confirmTitle) confirm(confirmTitle, confirmBody, go || "Confirm", run);
    else await run();
  }

  function renderBar() {
    const s = state?.stream || {};
    const d = state?.director || {};
    const ad = state?.adState || {};
    const live = s.twitchLive ? "LIVE" : (s.liveKnown ? "OFFLINE" : "UNKNOWN");
    els.bar.innerHTML = [
      `<div><em>Stream</em><strong>${live}</strong></div>`,
      `<div><em>RPG Director</em><strong>${esc(d.status || "—")}</strong></div>`,
      `<div><em>Auto</em><strong>${d.autoEnabled && !d.manualHold ? "ON" : "PAUSED"}</strong></div>`,
      `<div><em>Mode</em><strong>${esc(s.mode || "NORMAL")}</strong></div>`,
      `<div><em>Twitch Ads</em><strong>${esc(ad.status || "UNKNOWN")}</strong></div>`,
      `<div><em>Encounter</em><strong>${state?.activeEncounter ? esc(state.activeEncounter.name) : "NONE"}</strong></div>`
    ].join("");
  }

  function renderErrors() {
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
    els.encounter.innerHTML = `
      <p class="eyebrow">Current encounter</p>
      <h2>${shiny ? "✨ SHINY " : ""}${esc(round.name)}${shiny ? " ✨" : ""}</h2>
      <p>${chip(round.rarity || "—")} ${chip(round.phase || "")} ${round.paused ? chip(round.pausedForBreak ? "Paused for ad" : "Paused", "pause") : ""}</p>
      <p>Time remaining: ${round.paused ? "PAUSED" : clock(left)}</p>
      <p>Joined: ${round.participants || 0} · Ready: ${round.prepared || 0} / ${round.participants || 0} · Honey: ${round.honeyContributors || 0} / ${round.honeyParticipants || 0}${round.baitBonusPercent != null ? ` · +${round.baitBonusPercent}%` : ""}</p>
      <p>Trigger: ${esc(round.triggerSource || "—")}</p>
      <div class="links">
        <button type="button" class="secondary" data-act="pause_encounter"${round.paused ? " disabled" : ""}>Pause encounter</button>
        <button type="button" class="secondary" data-act="resume_encounter"${round.paused ? "" : " disabled"}>Resume encounter</button>
        <button type="button" class="danger" data-act="cancel_encounter">Cancel encounter</button>
      </div>`;
    els.encounter.dataset.busy = busy ? "1" : "0";
  }

  function renderSafe() {
    const w = state?.safeWindow || {};
    els.safe.innerHTML = `
      <p class="eyebrow">Safe to start encounter?</p>
      <h2>${esc(w.state || "UNKNOWN")}</h2>
      <p>${esc(w.reason || "Loading…")}</p>
      <p>Available: ${w.availableSeconds == null ? "—" : clock(w.availableSeconds)} · Required: ${clock(w.requiredSeconds || 180)}</p>
      <p class="muted">Time available before the next scheduled Twitch ad after encounter duration and safety buffer.</p>`;
  }

  function renderAds() {
    const ad = state?.adState || {};
    const cfg = state?.config || {};
    const left = ad.adActive ? until(ad.activeExpectedEndAt) : until(ad.nextAdAt);
    els.ads.innerHTML = `
      <p class="eyebrow">Twitch Ads</p>
      <h2>${esc(ad.status || "UNKNOWN")}</h2>
      ${ad.adActive ? `<p><strong>ACTIVE</strong> · Remaining ${clock(left)} · Expected end ${when(ad.activeExpectedEndAt)}</p>` : `<p>Next ad: ${when(ad.nextAdAt)} · Starts in ${left == null ? "—" : clock(left)} · Duration ${clock(ad.nextAdDurationSec || 0)}</p>`}
      <p>Snoozes: ${ad.snoozeCount ?? 0} · Preroll-free: ${ad.prerollFreeSec == null ? "—" : clock(ad.prerollFreeSec)}</p>
      <p class="muted">Source: ${esc(ad.source || "unknown")} · Last updated: ${when(ad.lastRefreshAt)}</p>
      <div class="links">
        <button type="button" class="secondary" data-act="connect_ads">Connect Twitch Ads</button>
        <button type="button" class="secondary" data-act="refresh_ads">Refresh ad status</button>
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
    const d = state?.director || {};
    const left = until(d.nextEncounterAt);
    els.next.innerHTML = `
      <p class="eyebrow">Next auto encounter</p>
      <h2>${d.nextEncounterAt ? `~${clock(left)}` : "Not scheduled"}</h2>
      <p>Target: ${when(d.nextEncounterAt)} · ${esc(d.delayText || "Waiting.")}</p>
      <p>Next encounter: Weighted random (rolled when the window is safe)</p>
      ${d.overdueFrom || (d.nextEncounterAt && Date.parse(d.nextEncounterAt) < Date.now() - 60000)
        ? `<p>Overdue. Reason: ${esc(d.delayText || "")}</p>` : ""}`;
  }

  function renderQueue() {
    const q = state?.queuedSpecial;
    els.queue.innerHTML = `
      <p class="eyebrow">Queued special</p>
      ${q
        ? `<h2>${q.kind === "RANDOM" ? "Weighted random (not rolled yet)" : esc(q.name || "Special")}</h2>
           <p>Waiting for: ${esc(state?.director?.delayText || "a safe window.")}</p>
           <p>Queued at ${when(q.queuedAt)}</p>
           <div class="links">
             <button type="button" class="secondary" data-act="cancel_queue">Cancel queue</button>
           </div>`
        : `<h2>None</h2><p>Queue a specific Pokémon or a random launch for the next safe window.</p>`}`;
  }

  function renderMode() {
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

  function renderControls() {
    const busy = Boolean(state?.activeEncounter);
    const w = state?.safeWindow || {};
    els.controls.innerHTML = `
      <p class="eyebrow">Quick controls</p>
      <div class="command-grid">
        <button type="button" class="gold" data-act="start_random" ${busy ? "disabled" : ""}>${busy ? "An encounter is already active." : "Start random"}</button>
        <button type="button" data-act="queue_random" ${busy ? "disabled" : ""}>Queue random until safe</button>
        <button type="button" class="secondary" data-act="${state?.director?.autoEnabled && !state?.director?.manualHold ? "pause_auto" : "resume_auto"}">${state?.director?.manualHold || !state?.director?.autoEnabled ? "Resume auto" : "Pause auto"}</button>
      </div>
      <label class="field">Specific Pokémon
        <input id="live-dex" type="search" placeholder="Eevee or 133">
      </label>
      <div id="live-dex-opts" class="dex-suggest" hidden></div>
      <label class="field">Shiny
        <select id="live-shiny">
          <option value="random">Random</option>
          <option value="normal">Force normal</option>
          <option value="shiny">Force shiny</option>
        </select>
      </label>
      <label class="field">Gender
        <select id="live-gender">
          <option value="">Random / valid</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Genderless">Genderless</option>
        </select>
      </label>
      <div class="links">
        <button type="button" data-act="start_specific" ${busy ? "disabled" : ""}>Start specific</button>
        <button type="button" class="secondary" data-act="queue_special" ${busy ? "disabled" : ""}>Queue special</button>
        <button type="button" class="secondary" data-act="start_test">Start test encounter</button>
      </div>
      <p class="muted">${w.state === "UNSAFE" ? "Unsafe window — prefer Queue until safe." : "Safe window uses Director rules, not this page."}</p>`;
  }

  function renderSession() {
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
  }

  function specificPayload() {
    const raw = document.getElementById("live-dex")?.value || "";
    const matches = window.playParseSpeciesQuery ? window.playParseSpeciesQuery(raw) : [];
    const dex = pickDex || matches[0]?.dex;
    if (!dex) return null;
    const genders = window.playGenderOptions?.(dex) || ["Male", "Female", "Genderless"];
    const shinySel = document.getElementById("live-shiny")?.value || pickShiny;
    const genderSel = document.getElementById("live-gender")?.value || pickGender;
    if (genderSel && genders.length && !genders.includes(genderSel)) {
      els.status.textContent = "That gender is not valid for this Pokémon.";
      return null;
    }
    return {
      dex,
      gender: genderSel || null,
      shiny: shinySel === "random" ? null : shinySel === "shiny"
    };
  }

  document.body.addEventListener("click", (event) => {
    const modeBtn = event.target.closest("[data-mode]");
    if (modeBtn) {
      cmd("set_mode", { mode: modeBtn.dataset.mode });
      return;
    }
    const btn = event.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === "copy") {
      const d = state?.director || {};
      const ad = state?.adState || {};
      const liveLabel = state?.stream?.twitchLive ? "Live" : (state?.stream?.liveKnown ? "Offline" : "Unknown");
      const text = `Stream: ${liveLabel}\nMode: ${state?.stream?.mode}\nAuto: ${d.autoEnabled ? "On" : "Off"}\nActive: ${state?.activeEncounter?.name || "None"}\nNext: ${d.nextEncounterAt || "—"}\nNext Ad: ${ad.nextAdAt || "—"}\nQueued: ${state?.queuedSpecial?.name || "None"}`;
      navigator.clipboard?.writeText(text);
      els.status.textContent = "Session status copied.";
      return;
    }
    if (act === "set_mode") {
      cmd("set_mode", { mode: document.getElementById("stream-mode")?.value || "NORMAL" });
      return;
    }
    if (act === "set_next_ad") {
      const raw = document.getElementById("next-ad-at")?.value;
      if (!raw) {
        els.status.textContent = "Pick a fallback ad time.";
        return;
      }
      cmd("set_next_ad", { nextAdAt: new Date(raw).toISOString() });
      return;
    }
    if (act === "start_specific" || act === "queue_special") {
      const payload = specificPayload();
      if (!payload) {
        els.status.textContent = "Pick an enabled Kanto Pokémon.";
        return;
      }
      const unsafe = ["UNSAFE", "SHORT"].includes(state?.safeWindow?.state) && act === "start_specific";
      cmd(act, unsafe ? { ...payload, anyway: true } : payload, unsafe
        ? {
          confirmTitle: "Start anyway?",
          confirmBody: `${state.safeWindow.reason} A full encounter needs about 3 minutes.`,
          go: "Start anyway"
        }
        : undefined);
      return;
    }
    if (act === "start_random") {
      const unsafe = ["UNSAFE", "SHORT"].includes(state?.safeWindow?.state);
      cmd("start_random", unsafe ? { anyway: true } : {}, unsafe
        ? { confirmTitle: "Start random encounter?", confirmBody: `${state.safeWindow.reason} Recommended: queue until safe.`, go: "Start anyway" }
        : undefined);
      return;
    }
    if (act === "end_session") {
      cmd("end_session", {}, { confirmTitle: "End RPG session?", confirmBody: "This stops new automatic encounters. An active encounter must finish first.", go: "End session" });
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
      if (force) els.status.textContent = data?.message || "Twitch live status updated.";
      await load(true);
    } catch (error) {
      if (force) {
        els.status.textContent = error?.message || "Twitch live status unavailable. Start an RPG session to run encounters.";
      }
    }
  }

  async function adsFn(action) {
    pending = true;
    els.status.textContent = action === "snooze" ? "Snoozing…" : "Refreshing ads…";
    try {
      const { data, error } = await supabase.functions.invoke("twitch-ads", { body: { action } });
      if (error) throw error;
      els.status.textContent = data?.message || "Twitch ad schedule updated.";
      await load(true);
    } catch (error) {
      els.status.textContent = error?.message || "Twitch ad schedule unavailable. Using fallback encounter timing.";
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
        els.status.textContent = data?.message || "Twitch ad schedule updated.";
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
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        scopes: "user:read:email user:read:subscriptions channel:read:ads channel:manage:ads",
        queryParams: { force_verify: "true" }
      }
    });
    if (error) els.status.textContent = error.message || "Twitch ad authorization still needs to be connected.";
  }

  async function load(keepApp) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.app.hidden = true;
      els.gate.hidden = false;
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    window.playSetAccountNav(session, profile, { isAdmin: true });
    try {
      if (sessionStorage.getItem("playAdsConnect") === "1" && session.provider_token) {
        sessionStorage.removeItem("playAdsConnect");
        await supabase.functions.invoke("twitch-ads", {
          body: { action: "connect", accessToken: session.provider_token }
        });
      }
      state = await window.playCall("admin_live_dashboard");
      disconnected = false;
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
      if (!keepApp) refreshLive(false);
    } catch (error) {
      disconnected = true;
      if (keepApp && !els.app.hidden) {
        renderErrors();
        els.status.textContent = window.playRpcError(error, "Live data disconnected.");
        return;
      }
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Stream Session is not available yet.");
    }
  }

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  setInterval(() => {
    if (document.visibilityState !== "visible" || pending || els.app.hidden) return;
    load(true);
    refreshLive(false);
  }, 4000);
  load();
})();
