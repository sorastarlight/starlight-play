(() => {
  const SORA_UUID = "60ff5211-6ef8-40e6-8daa-095b5600bf4c";
  const PLAYTESTER_UUID = "a98cbf81-a6b2-4dbf-8448-8d62f6d5f523";
  const ITEM_KEYS = [
    "thunderstone",
    "firestone",
    "waterstone",
    "leafstone",
    "moonstone",
    "linkingcord",
    "rarecandy"
  ];
  const LOADING_COPY = {
    PRESET_OAK: "Preparing QA resources…",
    PRESET_EVO: "Preparing QA resources…",
    GRANT_MON: "Granting Pokémon…",
    GRANT_CANDY: "Granting candy…",
    GRANT_ITEMS: "Granting items…",
    RESET_QA: "Resetting QA…"
  };
  const SUCCESS_COPY = {
    PRESET_OAK: "Oak Transfer Test preset granted",
    PRESET_EVO: "Evolution Test preset granted",
    GRANT_MON: "Pokémon granted",
    GRANT_CANDY: "Evolution Candy granted",
    GRANT_ITEMS: "Items granted",
    RESET_QA: "QA state reset"
  };

  const els = {
    userQ: document.getElementById("oakqa-user-q"),
    userList: document.getElementById("oakqa-user-list"),
    user: document.getElementById("oakqa-user"),
    userMeta: document.getElementById("oakqa-user-meta"),
    soraWrap: document.getElementById("oakqa-sora-wrap"),
    soraName: document.getElementById("oakqa-sora-name"),
    soraLogin: document.getElementById("oakqa-sora-login"),
    soraId: document.getElementById("oakqa-sora-id"),
    soraConfirm: document.getElementById("oakqa-sora-confirm"),
    status: document.getElementById("oakqa-status"),
    candyQ: document.getElementById("oakqa-candy-q"),
    candySuggest: document.getElementById("oakqa-candy-suggest"),
    candyFamily: document.getElementById("oakqa-candy-family"),
    candyMeta: document.getElementById("oakqa-candy-meta"),
    candyAmount: document.getElementById("oakqa-candy-amount"),
    monSpecies: document.getElementById("oakqa-mon-species"),
    monSuggest: document.getElementById("oakqa-mon-suggest"),
    monPreviewImg: document.getElementById("oakqa-mon-preview-img"),
    monPreviewCopy: document.getElementById("oakqa-mon-preview-copy"),
    monGender: document.getElementById("oakqa-mon-gender"),
    monShiny: document.getElementById("oakqa-mon-shiny"),
    monLevel: document.getElementById("oakqa-mon-level"),
    monQty: document.getElementById("oakqa-mon-qty"),
    itemGrid: document.getElementById("oakqa-item-grid"),
    presetOak: document.getElementById("oakqa-preset-oak"),
    presetEvo: document.getElementById("oakqa-preset-evo"),
    grantMon: document.getElementById("oakqa-grant-mon"),
    grantCandy: document.getElementById("oakqa-grant-candy"),
    grantItems: document.getElementById("oakqa-grant-items"),
    reset: document.getElementById("oakqa-reset")
  };

  const actionButtons = [
    els.presetOak,
    els.presetEvo,
    els.grantMon,
    els.grantCandy,
    els.grantItems,
    els.reset
  ].filter(Boolean);

  let usersById = new Map();
  let familyCatalog = [];
  let familiesLoaded = false;
  let itemsRendered = false;
  let searchTimer = null;
  let bound = false;
  let lastQuery = "";
  let selectedMonDex = 0;
  let selectedFamilyId = 0;
  let inFlight = null;
  let successTimers = new WeakMap();

  function esc(value) {
    return window.playEscapeAttr
      ? window.playEscapeAttr(value)
      : String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
  }

  function setStatus(message, kind) {
    if (!els.status) return;
    const text = String(message || "");
    els.status.textContent = text;
    els.status.hidden = !text;
    els.status.classList.remove("is-error", "is-success", "is-loading", "hub-warn", "hub-owner-warn");
    if (!text) return;
    if (kind === "error") els.status.classList.add("is-error", "hub-warn");
    else if (kind === "success") els.status.classList.add("is-success");
    else if (kind === "loading") els.status.classList.add("is-loading");
    else if (/OWNER|soraWarning|broadcaster/i.test(text)) els.status.classList.add("hub-owner-warn");
  }

  function selectedUserId() {
    return String(els.user?.value || "").trim();
  }

  function selectedUser() {
    return usersById.get(selectedUserId()) || null;
  }

  function isSoraTarget(id) {
    return String(id || selectedUserId()) === SORA_UUID;
  }

  function soraConfirmed() {
    return Boolean(els.soraConfirm?.checked);
  }

  function targetLabel(user) {
    const row = user || selectedUser();
    return row?.displayName || row?.login || "Trainer";
  }

  function grantsAllowed() {
    if (!selectedUserId()) return false;
    if (isSoraTarget() && !soraConfirmed()) return false;
    return true;
  }

  function buttonLabel(btn) {
    return btn?.dataset?.oakqaLabel || btn?.textContent || "Action";
  }

  function clearButtonState(btn) {
    if (!btn) return;
    const timer = successTimers.get(btn);
    if (timer) clearTimeout(timer);
    successTimers.delete(btn);
    btn.classList.remove("is-loading", "is-success", "is-error", "is-pressed");
    btn.removeAttribute("aria-busy");
    const label = buttonLabel(btn);
    if (btn.dataset.oakqaBusy !== "1") btn.textContent = label;
  }

  function syncGrantButtons() {
    const soraBlocked = isSoraTarget() && !soraConfirmed();
    const busy = Boolean(inFlight);
    actionButtons.forEach((btn) => {
      if (!btn) return;
      const thisBusy = inFlight === btn;
      if (btn.dataset.oakqaBusy === "1" && thisBusy) {
        btn.disabled = true;
        return;
      }
      if (btn.dataset.oakqaBusy === "1" && !thisBusy) {
        clearButtonState(btn);
        delete btn.dataset.oakqaBusy;
      }
      btn.disabled = busy || soraBlocked;
      btn.title = soraBlocked
        ? "Confirm the owner warning before granting to this live account."
        : "";
      if (!busy && !btn.classList.contains("is-success")) {
        btn.textContent = buttonLabel(btn);
        btn.classList.remove("is-loading", "is-error");
        btn.removeAttribute("aria-busy");
      }
    });
  }

  function markPressed(btn) {
    if (!btn) return;
    btn.classList.add("is-pressed");
    window.setTimeout(() => btn.classList.remove("is-pressed"), 140);
  }

  function markLoading(btn, action) {
    if (!btn) return;
    clearButtonState(btn);
    inFlight = btn;
    btn.dataset.oakqaBusy = "1";
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    btn.textContent = LOADING_COPY[action] || "Working…";
    syncGrantButtons();
  }

  function markSuccess(btn, message) {
    if (!btn) return;
    btn.dataset.oakqaBusy = "1";
    btn.classList.remove("is-loading", "is-error");
    btn.classList.add("is-success");
    btn.textContent = "✓ Granted!";
    btn.setAttribute("aria-busy", "false");
    const timer = window.setTimeout(() => {
      delete btn.dataset.oakqaBusy;
      clearButtonState(btn);
      inFlight = null;
      syncGrantButtons();
    }, 1600);
    successTimers.set(btn, timer);
    setStatus(message, "success");
  }

  function markError(btn, message) {
    if (btn) {
      btn.classList.remove("is-loading", "is-success");
      btn.classList.add("is-error");
      btn.textContent = buttonLabel(btn);
      delete btn.dataset.oakqaBusy;
      btn.removeAttribute("aria-busy");
      window.setTimeout(() => btn.classList.remove("is-error"), 1200);
    }
    inFlight = null;
    syncGrantButtons();
    setStatus(message, "error");
  }

  /**
   * Pure target picker. UUID from the selected Trainer is the RPC authority.
   * Empty query never defaults to Sora. Explicit search may keep/select Sora.
   */
  function pickTrainerTarget(users, { currentId, query, playtesterId, soraId } = {}) {
    const rows = Array.isArray(users) ? users.slice() : [];
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    const qaId = String(playtesterId || PLAYTESTER_UUID);
    const ownerId = String(soraId || SORA_UUID);
    const current = String(currentId || "").trim();
    const q = String(query || "").trim().toLowerCase();

    if (current && byId.has(current)) {
      return { targetId: current, reason: "preserve-selection", silentFallback: false };
    }

    if (!q) {
      if (byId.has(qaId)) {
        return { targetId: qaId, reason: "default-playtester", silentFallback: false };
      }
      const qa = rows.find((row) => {
        const id = String(row.id);
        if (id === ownerId) return false;
        return /qa|play.?test/i.test(`${row.displayName || ""} ${row.login || ""} ${row.username || ""}`);
      });
      if (qa) return { targetId: String(qa.id), reason: "default-qa-name", silentFallback: false };
      const firstSafe = rows.find((row) => String(row.id) !== ownerId);
      return {
        targetId: firstSafe ? String(firstSafe.id) : "",
        reason: firstSafe ? "default-first-safe" : "empty",
        silentFallback: false
      };
    }

    const exactUuid = rows.find((row) => String(row.id).toLowerCase() === q);
    if (exactUuid) {
      return { targetId: String(exactUuid.id), reason: "query-uuid", silentFallback: false };
    }
    const exactLogin = rows.find((row) => {
      const login = String(row.login || row.username || "").toLowerCase();
      const name = String(row.displayName || "").toLowerCase();
      return login === q || name === q || login === q.replace(/^@/, "");
    });
    if (exactLogin) {
      return { targetId: String(exactLogin.id), reason: "query-exact-name", silentFallback: false };
    }
    if (rows.length === 1) {
      return { targetId: String(rows[0].id), reason: "query-single", silentFallback: false };
    }
    if (rows.length > 0) {
      return { targetId: String(rows[0].id), reason: "query-first", silentFallback: false };
    }
    return { targetId: "", reason: "empty", silentFallback: false };
  }

  function buildOakQaArgs(action, userId, payload) {
    return {
      p_action: String(action || ""),
      p_user: String(userId || ""),
      p_payload: payload || {}
    };
  }

  function selectTrainer(userId, { fromClick } = {}) {
    const prev = selectedUserId();
    const id = String(userId || "").trim();
    if (els.user) els.user.value = id;
    if (id !== prev || fromClick) {
      if (els.soraConfirm && id !== SORA_UUID) els.soraConfirm.checked = false;
      if (id !== prev && els.soraConfirm) els.soraConfirm.checked = false;
    }
    els.userList?.querySelectorAll(".staff-user-pick").forEach((node) => {
      const on = node.dataset.openUser === id;
      node.classList.toggle("is-on", on);
      node.setAttribute("aria-selected", on ? "true" : "false");
    });
    syncSoraWarning();
  }

  function syncSoraWarning() {
    const sora = isSoraTarget();
    const user = selectedUser();
    if (els.soraWrap) {
      els.soraWrap.hidden = !sora;
      els.soraWrap.classList.toggle("is-acked", Boolean(sora && soraConfirmed()));
    }
    if (!sora && els.soraConfirm) els.soraConfirm.checked = false;
    if (els.soraName) {
      els.soraName.textContent = user?.displayName || user?.login || "Sora Starlight";
    }
    if (els.soraLogin) {
      els.soraLogin.textContent = user?.login ? `@${user.login}` : "";
    }
    if (els.soraId) {
      els.soraId.textContent = user?.id ? `Trainer ID: ${user.id}` : "";
    }
    if (els.userMeta) {
      if (!user) {
        els.userMeta.textContent = "Pick a Trainer from the list. Prefer QA / Play Tester.";
      } else {
        const login = user.login ? `@${user.login}` : "";
        const mark = user.id === PLAYTESTER_UUID ? " · QA" : (user.id === SORA_UUID ? " · OWNER" : "");
        els.userMeta.innerHTML = `<span class="oakqa-meta-name">${esc(user.displayName || user.login || "Trainer")}${esc(mark)}</span>${login ? ` <span class="muted">${esc(login)}</span>` : ""} <span class="oakqa-meta-id muted">ID ${esc(user.id)}</span>`;
      }
    }
    syncGrantButtons();
  }

  function sortTrainers(rows) {
    return rows.slice().sort((a, b) => {
      const aQa = a.id === PLAYTESTER_UUID || /qa|play.?test/i.test(`${a.displayName || ""} ${a.login || ""} ${a.username || ""}`);
      const bQa = b.id === PLAYTESTER_UUID || /qa|play.?test/i.test(`${b.displayName || ""} ${b.login || ""} ${b.username || ""}`);
      if (aQa !== bQa) return aQa ? -1 : 1;
      if (a.id === PLAYTESTER_UUID) return -1;
      if (b.id === PLAYTESTER_UUID) return 1;
      return String(a.displayName || a.login || "").localeCompare(String(b.displayName || b.login || ""));
    });
  }

  function trainerFace(row) {
    const avatar = row.avatarUrl || row.avatar_url || "";
    if (avatar) {
      return `<img class="oakqa-user-avatar" src="${esc(avatar)}" alt="" width="40" height="40" loading="lazy" decoding="async">`;
    }
    const seed = String(row.displayName || row.login || "?").trim().slice(0, 1).toUpperCase() || "?";
    return `<span class="oakqa-user-avatar oakqa-user-fallback" aria-hidden="true">${esc(seed)}</span>`;
  }

  function renderUserList(users, preferId, query) {
    if (!els.userList) return;
    const rows = sortTrainers(Array.isArray(users) ? users : []);
    usersById = new Map(rows.map((row) => [String(row.id), row]));
    const picked = pickTrainerTarget(rows, {
      currentId: preferId || selectedUserId(),
      query: query != null ? query : lastQuery,
      playtesterId: PLAYTESTER_UUID,
      soraId: SORA_UUID
    });
    if (!rows.length) {
      els.userList.innerHTML = `<p class="muted">No trainers match.</p>`;
      if (els.user) els.user.value = "";
      syncSoraWarning();
      return;
    }
    els.userList.innerHTML = rows.map((row) => {
      const name = esc(row.displayName || row.login || "Trainer");
      const login = esc(row.login || "");
      const mark = row.id === PLAYTESTER_UUID ? `<span class="oakqa-chip is-qa">QA</span>` : (row.id === SORA_UUID ? `<span class="oakqa-chip is-owner">OWNER</span>` : "");
      const on = row.id === picked.targetId ? " is-on" : "";
      return `<button type="button" class="staff-user staff-user-pick oakqa-user-pick${on}" data-open-user="${esc(row.id)}" role="option" aria-selected="${row.id === picked.targetId}">
        ${trainerFace(row)}
        <div class="oakqa-user-copy">
          <strong>${name}${mark}</strong>
          <p class="muted">@${login} · ${esc(row.role || "player")}${row.pass ? " · Pass" : ""} · ${Number(row.coins || 0)} coins · ${Number(row.caught || 0)} Pokémon</p>
        </div>
      </button>`;
    }).join("");
    selectTrainer(picked.targetId || "");
  }

  async function loadUsers(query) {
    if (!els.userList || typeof window.playCall !== "function") return;
    lastQuery = String(query || "").trim();
    setStatus("Loading trainers…", "loading");
    try {
      const data = await window.playCall("admin_list_users", {
        p_query: lastQuery,
        p_offset: 0
      });
      const users = data?.users || [];
      if (!lastQuery && !users.some((row) => row.id === PLAYTESTER_UUID)) {
        try {
          const qa = await window.playCall("admin_list_users", {
            p_query: "playtester",
            p_offset: 0
          });
          const hit = (qa?.users || []).find((row) => row.id === PLAYTESTER_UUID);
          if (hit) users.unshift(hit);
        } catch (_) { /* ignore */ }
      }
      renderUserList(users, selectedUserId(), lastQuery);
      setStatus(users.length ? `${users.length} trainer${users.length === 1 ? "" : "s"} ready.` : "No trainers match.", "success");
      window.setTimeout(() => {
        if (els.status?.classList.contains("is-success") && /trainer/i.test(els.status.textContent || "")) {
          setStatus("");
        }
      }, 1800);
    } catch (error) {
      setStatus(window.playRpcError?.(error) || String(error?.message || error), "error");
    }
  }

  function familyBareName(row) {
    return String(row?.name || window.playSpeciesName?.(row?.baseDex || row?.id) || `Family ${row?.id || ""}`)
      .replace(/\s+Candy$/i, "")
      .replace(/\s+Evolution$/i, "")
      .trim();
  }

  function familyLabel(row) {
    return `${familyBareName(row)} Evolution Candy`;
  }

  function familyArt(row) {
    const dex = Number(row?.baseDex || row?.id || 0);
    if (dex && typeof window.playSpriteUrl === "function") return window.playSpriteUrl(dex, "normal");
    if (dex) return `images/pokemon/${dex}.gif`;
    return "images/items/rare-candy.png";
  }

  function setCandyFamily(row) {
    selectedFamilyId = Number(row?.id || 0) || 0;
    if (els.candyFamily) els.candyFamily.value = selectedFamilyId ? String(selectedFamilyId) : "";
    if (els.candyQ && row) els.candyQ.value = familyBareName(row);
    if (els.candyMeta) {
      els.candyMeta.textContent = selectedFamilyId
        ? `${familyLabel(row)} · family ${selectedFamilyId}`
        : "Pick an Evolution Line.";
    }
    if (els.candySuggest) {
      els.candySuggest.hidden = true;
      els.candySuggest.innerHTML = "";
    }
  }

  function filterFamilies(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return familyCatalog.slice(0, 12);
    const exact = [];
    const prefix = [];
    const contains = [];
    familyCatalog.forEach((row) => {
      const bare = familyBareName(row).toLowerCase();
      const label = familyLabel(row).toLowerCase();
      const idStr = String(row.id);
      if (idStr === q || bare === q) exact.push(row);
      else if (bare.startsWith(q) || label.startsWith(q)) prefix.push(row);
      else if (bare.includes(q) || label.includes(q) || idStr.includes(q)) contains.push(row);
    });
    return exact.concat(prefix, contains).slice(0, 12);
  }

  function renderCandySuggest(query) {
    if (!els.candySuggest) return;
    if (!familiesLoaded) {
      els.candySuggest.hidden = false;
      els.candySuggest.innerHTML = `<li><span class="muted" style="display:block;padding:8px 12px">Loading Evolution Lines…</span></li>`;
      return;
    }
    const rows = filterFamilies(query);
    if (!rows.length) {
      els.candySuggest.hidden = true;
      els.candySuggest.innerHTML = "";
      return;
    }
    els.candySuggest.hidden = false;
    els.candySuggest.innerHTML = rows.map((row) => (
      `<li><button type="button" data-oakqa-candy="${Number(row.id)}">
        <img src="${esc(familyArt(row))}" alt="">
        <span>${esc(familyLabel(row))}</span>
      </button></li>`
    )).join("");
  }

  async function loadFamilies() {
    if (familiesLoaded && familyCatalog.length) return;
    const supabase = window.playSupabase;
    const applyRows = (rows) => {
      familyCatalog = (rows || []).map((row) => ({
        id: Number(row.id || row.family_id || row.dex || 0),
        name: row.name || "",
        baseDex: Number(row.base_dex || row.baseDex || row.dex || row.id || 0)
      })).filter((row) => row.id >= 1 && row.id <= 151);
      familyCatalog.sort((a, b) => familyBareName(a).localeCompare(familyBareName(b)));
      familiesLoaded = true;
      if (els.candyMeta && !selectedFamilyId) {
        els.candyMeta.textContent = `${familyCatalog.length} Evolution Lines ready — type to search.`;
      }
    };

    if (!supabase) {
      const names = window.PLAY_SPECIES || [];
      applyRows(names.slice(0, 151).map((name, index) => ({
        id: index + 1,
        name,
        base_dex: index + 1
      })));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("evolution_families")
        .select("id,name,base_dex")
        .gte("id", 1)
        .lte("id", 151)
        .order("name");
      if (error) throw error;
      applyRows(data || []);
    } catch (_) {
      try {
        const { data } = await supabase
          .from("species")
          .select("dex,name,family_id")
          .gte("dex", 1)
          .lte("dex", 151)
          .order("dex");
        const seen = new Set();
        const rows = [];
        (data || []).forEach((row) => {
          const fam = Number(row.family_id || row.dex);
          if (!fam || seen.has(fam)) return;
          if (Number(row.dex) !== fam) return;
          seen.add(fam);
          rows.push({ id: fam, name: row.name, base_dex: fam });
        });
        applyRows(rows);
      } catch (err) {
        const names = window.PLAY_SPECIES || [];
        applyRows(names.slice(0, 151).map((name, index) => ({
          id: index + 1,
          name,
          base_dex: index + 1
        })));
        if (!familyCatalog.length) {
          setStatus(window.playRpcError?.(err) || String(err?.message || err), "error");
        }
      }
    }
  }

  function resolveSpeciesHits(raw) {
    const text = String(raw || "").trim();
    if (!text) return [];
    if (typeof window.playParseSpeciesQuery === "function") {
      const hits = window.playParseSpeciesQuery(text) || [];
      if (hits.length) return hits;
    }
    const q = text.toLowerCase();
    const names = window.PLAY_SPECIES || [];
    const asNum = Number(q);
    if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 151) {
      return [{ dex: asNum, name: names[asNum - 1] || `Dex ${asNum}` }];
    }
    const exact = [];
    const prefix = [];
    const contains = [];
    names.forEach((name, index) => {
      const dex = index + 1;
      if (typeof window.playDexExists === "function" && !window.playDexExists(dex)) return;
      const lower = String(name || "").toLowerCase();
      if (lower === q) exact.push({ dex, name });
      else if (lower.startsWith(q)) prefix.push({ dex, name });
      else if (lower.includes(q)) contains.push({ dex, name });
    });
    return exact.concat(prefix, contains);
  }

  function setMonSpecies(dex) {
    selectedMonDex = Number(dex) || 0;
    if (els.monSpecies && selectedMonDex) {
      const pad = window.playPadDex?.(selectedMonDex) || String(selectedMonDex).padStart(3, "0");
      const name = window.playSpeciesName?.(selectedMonDex) || `Dex ${selectedMonDex}`;
      els.monSpecies.value = `${pad} ${name}`;
    }
    if (els.monSuggest) {
      els.monSuggest.hidden = true;
      els.monSuggest.innerHTML = "";
    }
    renderMonPreview();
  }

  function renderMonPreview() {
    const dex = selectedMonDex;
    if (!dex) {
      if (els.monPreviewImg) {
        els.monPreviewImg.removeAttribute("src");
        els.monPreviewImg.alt = "";
      }
      if (els.monPreviewCopy) els.monPreviewCopy.textContent = "Pick a species to preview.";
      return;
    }
    const name = window.playSpeciesName?.(dex) || `Dex ${dex}`;
    const gender = els.monGender?.value || "Unknown";
    const shiny = Boolean(els.monShiny?.checked);
    const variant = typeof window.playSpriteVariant === "function"
      ? window.playSpriteVariant(dex, gender === "Unknown" ? "Male" : gender, shiny)
      : (shiny ? "shiny" : "normal");
    if (els.monPreviewImg && typeof window.playSpriteUrl === "function") {
      delete els.monPreviewImg.dataset.playSpriteDone;
      delete els.monPreviewImg.dataset.playSpriteLock;
      els.monPreviewImg.src = window.playSpriteUrl(dex, variant);
      els.monPreviewImg.alt = `${name}${shiny ? " Shiny" : ""}`;
    }
    if (els.monPreviewCopy) {
      els.monPreviewCopy.textContent = `#${String(dex).padStart(3, "0")} ${name} · ${gender}${shiny ? " · Shiny" : ""}`;
    }
  }

  function renderMonSuggest(query) {
    if (!els.monSuggest) return;
    const hits = resolveSpeciesHits(query).slice(0, 12);
    if (!hits.length || !String(query || "").trim()) {
      els.monSuggest.hidden = true;
      els.monSuggest.innerHTML = "";
      return;
    }
    els.monSuggest.hidden = false;
    els.monSuggest.innerHTML = hits.map((row) => {
      const art = typeof window.playSpriteUrl === "function"
        ? window.playSpriteUrl(row.dex, "normal")
        : `images/pokemon/${row.dex}.gif`;
      const pad = window.playPadDex?.(row.dex) || String(row.dex).padStart(3, "0");
      return `<li><button type="button" data-oakqa-dex="${Number(row.dex)}">
        <img src="${esc(art)}" alt="">
        <span>${esc(pad)} ${esc(row.name)}</span>
      </button></li>`;
    }).join("");
  }

  function renderItemGrid() {
    if (!els.itemGrid || itemsRendered) return;
    els.itemGrid.innerHTML = ITEM_KEYS.map((key) => {
      const label = window.playItemLabel?.(key) || key;
      const art = window.playItemSprite?.(key) || `images/items/${key}.png`;
      return `<label class="user-item oakqa-item" for="oakqa-item-${esc(key)}">
        <img src="${esc(art)}" alt="">
        <span>${esc(label)}</span>
        <input id="oakqa-item-${esc(key)}" type="number" min="0" max="99" value="0" data-oakqa-item="${esc(key)}" inputmode="numeric">
      </label>`;
    }).join("");
    itemsRendered = true;
  }

  function itemGrants() {
    const grants = {};
    ITEM_KEYS.forEach((key) => {
      const input = document.querySelector(`[data-oakqa-item="${key}"]`);
      const qty = Math.max(0, Math.min(99, Number(input?.value || 0)));
      if (qty > 0) grants[key] = qty;
    });
    return grants;
  }

  function summarizeResponse(action, data) {
    const bits = [];
    const payload = data || {};
    if (payload.granted && typeof payload.granted === "object") {
      Object.entries(payload.granted).forEach(([key, qty]) => {
        const n = Number(qty);
        if (!n) return;
        const label = window.playItemLabel?.(key) || key;
        bits.push(`+${n} ${label}`);
      });
    }
    if (Array.isArray(payload.grants)) {
      payload.grants.forEach((row) => {
        const n = Number(row?.qty || row?.amount || 0);
        if (!n) return;
        const label = row?.name || window.playItemLabel?.(row?.key) || row?.key || "item";
        bits.push(`+${n} ${label}`);
      });
    }
    if (payload.candyAmount || payload.amount) {
      const n = Number(payload.candyAmount || payload.amount);
      if (n) bits.push(`+${n} Evolution Candy`);
    }
    if (payload.mons || payload.pokemon || payload.count) {
      const n = Number(payload.mons || payload.pokemon || payload.count);
      if (n) bits.push(`+${n} Pokémon`);
    }
    return bits;
  }

  /** Non-mutating target resolution for live/owner proofs. Never grants. */
  async function resolveTargetReadOnly(userId) {
    const id = String(userId || selectedUserId() || "").trim();
    if (!id) return { ok: false, error: "Pick a target Trainer first." };
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return { ok: false, error: "Target must be a profile UUID.", targetId: id };
    }
    const listed = usersById.get(id) || null;
    let account = null;
    try {
      if (typeof window.playCall === "function") {
        account = await window.playCall("admin_user_account", { p_user: id });
      }
    } catch (error) {
      return {
        ok: false,
        error: window.playRpcError?.(error) || String(error?.message || error),
        targetId: id,
        listed
      };
    }
    const user = account?.user || listed || null;
    return {
      ok: Boolean(user || account),
      targetId: id,
      displayName: user?.displayName || listed?.displayName || "",
      login: user?.login || listed?.login || "",
      isSora: id === SORA_UUID,
      isPlayTester: id === PLAYTESTER_UUID,
      silentFallback: false,
      mutated: false
    };
  }

  async function callOakQa(action, payload, btn) {
    if (inFlight) return null;
    const userId = selectedUserId();
    if (!userId) {
      markError(btn, "Pick a target Trainer first.");
      return null;
    }
    if (!usersById.has(userId)) {
      markError(btn, "Target must be a resolved Trainer from the list.");
      return null;
    }
    if (isSoraTarget(userId) && !soraConfirmed()) {
      markError(btn, "Confirm the OWNER / BROADCASTER warning before granting.");
      return null;
    }
    markPressed(btn);
    markLoading(btn, action);
    setStatus(`${LOADING_COPY[action] || action} → ${targetLabel()}…`, "loading");
    const args = buildOakQaArgs(action, userId, payload);
    try {
      const data = await window.playCall("admin_oak_qa", args);
      const user = selectedUser();
      const label = targetLabel(user);
      const summary = summarizeResponse(action, data);
      const base = data?.message || SUCCESS_COPY[action] || "QA action completed";
      const bits = summary.length ? ` · ${summary.join(" · ")}` : "";
      const owner = data?.soraWarning ? " · OWNER/BROADCASTER" : "";
      const msg = `✓ ${base} to ${label}${bits}${owner}`;
      markSuccess(btn, msg);
      if (data?.soraWarning && els.status) els.status.classList.add("hub-owner-warn");
      return data;
    } catch (error) {
      markError(btn, window.playRpcError?.(error) || String(error?.message || error));
      return null;
    }
  }

  function bind() {
    if (bound) return;
    bound = true;

    els.soraConfirm?.addEventListener("change", syncSoraWarning);

    els.userQ?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadUsers(els.userQ.value), 280);
    });

    els.userList?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-open-user]");
      if (!btn) return;
      selectTrainer(btn.dataset.openUser, { fromClick: true });
    });

    els.monSpecies?.addEventListener("input", () => {
      selectedMonDex = 0;
      renderMonSuggest(els.monSpecies.value);
      const hits = resolveSpeciesHits(els.monSpecies.value);
      if (hits.length === 1 && String(els.monSpecies.value || "").trim().toLowerCase() === String(hits[0].name || "").toLowerCase()) {
        setMonSpecies(hits[0].dex);
      } else {
        renderMonPreview();
      }
    });
    els.monSpecies?.addEventListener("focus", () => {
      if (String(els.monSpecies.value || "").trim()) renderMonSuggest(els.monSpecies.value);
    });
    els.monSpecies?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const hits = resolveSpeciesHits(els.monSpecies.value);
      if (hits[0]) setMonSpecies(hits[0].dex);
    });
    els.monSuggest?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-oakqa-dex]");
      if (!btn) return;
      setMonSpecies(Number(btn.dataset.oakqaDex));
    });
    els.monGender?.addEventListener("change", renderMonPreview);
    els.monShiny?.addEventListener("change", renderMonPreview);

    els.candyQ?.addEventListener("input", () => {
      selectedFamilyId = 0;
      if (els.candyFamily) els.candyFamily.value = "";
      if (els.candyMeta) els.candyMeta.textContent = "Pick an Evolution Line.";
      renderCandySuggest(els.candyQ.value);
    });
    els.candyQ?.addEventListener("focus", () => {
      renderCandySuggest(els.candyQ.value);
    });
    els.candyQ?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const hit = filterFamilies(els.candyQ.value)[0];
      if (hit) setCandyFamily(hit);
    });
    els.candySuggest?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-oakqa-candy]");
      if (!btn) return;
      const id = Number(btn.dataset.oakqaCandy);
      const row = familyCatalog.find((entry) => entry.id === id);
      if (row) setCandyFamily(row);
    });

    els.presetOak?.addEventListener("click", () => callOakQa("PRESET_OAK", {}, els.presetOak));
    els.presetEvo?.addEventListener("click", () => callOakQa("PRESET_EVO", {}, els.presetEvo));
    els.grantMon?.addEventListener("click", () => {
      let dex = selectedMonDex;
      if (!dex) {
        const hits = resolveSpeciesHits(els.monSpecies?.value);
        dex = Number(hits?.[0]?.dex || 0);
      }
      if (!(dex >= 1 && dex <= 151)) {
        markError(els.grantMon, "Pick a Kanto species (name or Dex 1–151).");
        return;
      }
      callOakQa("GRANT_MON", {
        dex,
        gender: els.monGender?.value || "Unknown",
        shiny: Boolean(els.monShiny?.checked),
        level: Number(els.monLevel?.value || 10),
        qty: Number(els.monQty?.value || 1),
        name: window.playSpeciesName?.(dex) || undefined
      }, els.grantMon);
    });
    els.grantCandy?.addEventListener("click", () => {
      let familyId = selectedFamilyId || Number(els.candyFamily?.value || 0);
      if (!familyId) {
        const hit = filterFamilies(els.candyQ?.value)[0];
        familyId = Number(hit?.id || 0);
      }
      if (!familyId) {
        markError(els.grantCandy, "Pick an Evolution Line candy.");
        return;
      }
      callOakQa("GRANT_CANDY", {
        familyId,
        amount: Number(els.candyAmount?.value || 1)
      }, els.grantCandy);
    });
    els.grantItems?.addEventListener("click", () => {
      const grants = itemGrants();
      if (!Object.keys(grants).length) {
        markError(els.grantItems, "Set at least one item quantity.");
        return;
      }
      callOakQa("GRANT_ITEMS", { grants }, els.grantItems);
    });
    els.reset?.addEventListener("click", () => {
      const user = selectedUser();
      const label = user?.displayName || user?.login || selectedUserId() || "this Trainer";
      if (!window.confirm(`Reset ADMIN_QA Oak / Evolution state for ${label}?`)) return;
      callOakQa("RESET_QA", {}, els.reset);
    });

    document.addEventListener("click", (event) => {
      if (els.monSuggest && !event.target.closest("#oakqa-mon-species") && !event.target.closest("#oakqa-mon-suggest")) {
        els.monSuggest.hidden = true;
      }
      if (els.candySuggest && !event.target.closest("#oakqa-candy-q") && !event.target.closest("#oakqa-candy-suggest")) {
        els.candySuggest.hidden = true;
      }
    });
  }

  async function init() {
    if (!document.querySelector("[data-content-panel='oakqa']")) return;
    bind();
    renderItemGrid();
    syncSoraWarning();
    await Promise.all([
      loadUsers(els.userQ?.value || ""),
      loadFamilies()
    ]);
  }

  window.playOakQaInit = init;
  window.playOakQaTargeting = {
    SORA_UUID,
    PLAYTESTER_UUID,
    pickTrainerTarget,
    buildOakQaArgs,
    resolveTargetReadOnly,
    isSoraTarget: (id) => String(id) === SORA_UUID,
    grantsAllowed
  };

  try {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") || "";
    const view = params.get("view") || "";
    if (section === "content" && view === "oakqa") init();
  } catch (_) { /* ignore */ }
})();
