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

  const els = {
    userQ: document.getElementById("oakqa-user-q"),
    userList: document.getElementById("oakqa-user-list"),
    user: document.getElementById("oakqa-user"),
    userMeta: document.getElementById("oakqa-user-meta"),
    soraWrap: document.getElementById("oakqa-sora-wrap"),
    soraName: document.getElementById("oakqa-sora-name"),
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

  let usersById = new Map();
  let familyCatalog = [];
  let familiesLoaded = false;
  let usersLoaded = false;
  let itemsRendered = false;
  let searchTimer = null;
  let bound = false;
  let lastQuery = "";
  let selectedMonDex = 0;
  let selectedFamilyId = 0;

  function esc(value) {
    return window.playEscapeAttr
      ? window.playEscapeAttr(value)
      : String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
  }

  function setStatus(message, isError) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.classList.toggle("hub-warn", Boolean(isError));
    els.status.classList.toggle("hub-owner-warn", !isError && /OWNER|soraWarning|broadcaster/i.test(String(message || "")));
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

  function grantsAllowed() {
    if (!selectedUserId()) return false;
    if (isSoraTarget() && !soraConfirmed()) return false;
    return true;
  }

  function syncGrantButtons() {
    const ok = grantsAllowed();
    [
      els.presetOak,
      els.presetEvo,
      els.grantMon,
      els.grantCandy,
      els.grantItems,
      els.reset
    ].forEach((btn) => {
      if (btn) btn.disabled = !ok;
    });
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
    const id = String(userId || "").trim();
    if (els.user) els.user.value = id;
    if (fromClick && els.soraConfirm && id !== SORA_UUID) els.soraConfirm.checked = false;
    els.userList?.querySelectorAll(".staff-user-pick").forEach((node) => {
      node.classList.toggle("is-on", node.dataset.openUser === id);
    });
    syncSoraWarning();
  }

  function syncSoraWarning() {
    const sora = isSoraTarget();
    if (els.soraWrap) els.soraWrap.hidden = !sora;
    if (!sora && els.soraConfirm) els.soraConfirm.checked = false;
    const user = selectedUser();
    if (els.soraName && user) {
      els.soraName.textContent = user.displayName || user.login || "SoraStarlight";
    }
    if (els.userMeta) {
      if (!user) {
        els.userMeta.textContent = "Pick a Trainer from the list. Prefer QA / Play Tester.";
      } else {
        const label = user.displayName || user.login || "Trainer";
        const login = user.login ? `@${user.login}` : "";
        els.userMeta.textContent = `TARGET TRAINER · ${label}${login ? ` · ${login}` : ""} · ${user.id}`;
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
      const mark = row.id === PLAYTESTER_UUID ? " · QA" : (row.id === SORA_UUID ? " · OWNER" : "");
      const on = row.id === picked.targetId ? " is-on" : "";
      return `<button type="button" class="staff-user staff-user-pick${on}" data-open-user="${esc(row.id)}" role="option" aria-selected="${row.id === picked.targetId}">
        <div>
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
    setStatus("Loading trainers…");
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
      usersLoaded = true;
      setStatus(users.length ? `${users.length} trainer${users.length === 1 ? "" : "s"} loaded.` : "No trainers match.");
    } catch (error) {
      setStatus(window.playRpcError?.(error) || String(error?.message || error), true);
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
    if (familiesLoaded) return;
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
      // Client fallback: one candy line per Kanto species using dex as family id.
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
          setStatus(window.playRpcError?.(err) || String(err?.message || err), true);
        }
      }
    }
  }

  function resolveSpeciesHits(raw) {
    if (typeof window.playParseSpeciesQuery === "function") {
      return window.playParseSpeciesQuery(raw) || [];
    }
    const asNum = Number(String(raw || "").trim());
    if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 151) {
      return [{ dex: asNum, name: window.playSpeciesName?.(asNum) || `Dex ${asNum}` }];
    }
    return [];
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
    if (!hits.length) {
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

  async function callOakQa(action, payload) {
    const userId = selectedUserId();
    if (!userId) {
      setStatus("Pick a target Trainer first.", true);
      return null;
    }
    if (!usersById.has(userId)) {
      setStatus("Target must be a resolved Trainer from the list.", true);
      return null;
    }
    if (isSoraTarget(userId) && !soraConfirmed()) {
      setStatus("Confirm the OWNER / BROADCASTER warning before granting.", true);
      return null;
    }
    const args = buildOakQaArgs(action, userId, payload);
    setStatus(`${action} → ${userId}…`);
    try {
      const data = await window.playCall("admin_oak_qa", args);
      const user = selectedUser();
      const label = user?.displayName || user?.login || "Trainer";
      const warn = data?.soraWarning
        ? ` · TARGET ${label} (${userId}) · OWNER/BROADCASTER · soraWarning=true`
        : ` · target ${label} (${userId})`;
      const msg = data?.message || JSON.stringify(data);
      setStatus(`${msg}${warn}`, false);
      if (data?.soraWarning && els.status) els.status.classList.add("hub-owner-warn");
      return data;
    } catch (error) {
      setStatus(window.playRpcError?.(error) || String(error?.message || error), true);
      return null;
    }
  }

  function bind() {
    if (bound) return;
    bound = true;

    els.soraConfirm?.addEventListener("change", syncGrantButtons);

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
    els.candySuggest?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-oakqa-candy]");
      if (!btn) return;
      const id = Number(btn.dataset.oakqaCandy);
      const row = familyCatalog.find((entry) => entry.id === id);
      if (row) setCandyFamily(row);
    });

    els.presetOak?.addEventListener("click", () => callOakQa("PRESET_OAK", {}));
    els.presetEvo?.addEventListener("click", () => callOakQa("PRESET_EVO", {}));
    els.grantMon?.addEventListener("click", () => {
      let dex = selectedMonDex;
      if (!dex) {
        const hits = resolveSpeciesHits(els.monSpecies?.value);
        dex = Number(hits?.[0]?.dex || 0);
      }
      if (!(dex >= 1 && dex <= 151)) {
        setStatus("Pick a Kanto species (name or Dex 1–151).", true);
        return;
      }
      callOakQa("GRANT_MON", {
        dex,
        gender: els.monGender?.value || "Unknown",
        shiny: Boolean(els.monShiny?.checked),
        level: Number(els.monLevel?.value || 10),
        qty: Number(els.monQty?.value || 1),
        name: window.playSpeciesName?.(dex) || undefined
      });
    });
    els.grantCandy?.addEventListener("click", () => {
      let familyId = selectedFamilyId || Number(els.candyFamily?.value || 0);
      if (!familyId) {
        const hit = filterFamilies(els.candyQ?.value)[0];
        familyId = Number(hit?.id || 0);
      }
      if (!familyId) {
        setStatus("Pick an Evolution Line candy.", true);
        return;
      }
      callOakQa("GRANT_CANDY", {
        familyId,
        amount: Number(els.candyAmount?.value || 1)
      });
    });
    els.grantItems?.addEventListener("click", () => {
      const grants = itemGrants();
      if (!Object.keys(grants).length) {
        setStatus("Set at least one item quantity.", true);
        return;
      }
      callOakQa("GRANT_ITEMS", { grants });
    });
    els.reset?.addEventListener("click", () => {
      const user = selectedUser();
      const label = user?.displayName || user?.login || userIdLabel();
      if (!window.confirm(`Reset ADMIN_QA Oak / Evolution state for ${label}?`)) return;
      callOakQa("RESET_QA", {});
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

  function userIdLabel() {
    return selectedUserId() || "this Trainer";
  }

  async function init() {
    if (!document.querySelector("[data-content-panel='oakqa']")) return;
    bind();
    renderItemGrid();
    syncSoraWarning();
    await Promise.all([
      usersLoaded ? Promise.resolve() : loadUsers(els.userQ?.value || ""),
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
    isSoraTarget: (id) => String(id) === SORA_UUID
  };

  // Self-boot: admin.js may call showHubTab before this file loads.
  try {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") || "";
    const view = params.get("view") || "";
    if (section === "content" && view === "oakqa") {
      init();
    }
  } catch (_) { /* ignore */ }
})();
