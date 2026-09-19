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
    user: document.getElementById("oakqa-user"),
    userMeta: document.getElementById("oakqa-user-meta"),
    soraWrap: document.getElementById("oakqa-sora-wrap"),
    soraConfirm: document.getElementById("oakqa-sora-confirm"),
    status: document.getElementById("oakqa-status"),
    candyFamily: document.getElementById("oakqa-candy-family"),
    monSpecies: document.getElementById("oakqa-mon-species"),
    monGender: document.getElementById("oakqa-mon-gender"),
    monShiny: document.getElementById("oakqa-mon-shiny"),
    monLevel: document.getElementById("oakqa-mon-level"),
    monQty: document.getElementById("oakqa-mon-qty"),
    candyAmount: document.getElementById("oakqa-candy-amount"),
    presetOak: document.getElementById("oakqa-preset-oak"),
    presetEvo: document.getElementById("oakqa-preset-evo"),
    grantMon: document.getElementById("oakqa-grant-mon"),
    grantCandy: document.getElementById("oakqa-grant-candy"),
    grantItems: document.getElementById("oakqa-grant-items"),
    reset: document.getElementById("oakqa-reset")
  };

  let usersById = new Map();
  let familiesLoaded = false;
  let usersLoaded = false;
  let searchTimer = null;
  let bound = false;
  let lastQuery = "";

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
   * Pure target picker. UUID from the select is the RPC authority.
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

    // Explicit search: honor the listed match, including Sora when searched.
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

  function syncSoraWarning() {
    const sora = isSoraTarget();
    if (els.soraWrap) els.soraWrap.hidden = !sora;
    if (!sora && els.soraConfirm) els.soraConfirm.checked = false;
    const user = selectedUser();
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

  function renderUserOptions(users, preferId, query) {
    if (!els.user) return;
    const rows = Array.isArray(users) ? users.slice() : [];
    rows.sort((a, b) => {
      const aQa = a.id === PLAYTESTER_UUID || /qa|play.?test/i.test(`${a.displayName || ""} ${a.login || ""} ${a.username || ""}`);
      const bQa = b.id === PLAYTESTER_UUID || /qa|play.?test/i.test(`${b.displayName || ""} ${b.login || ""} ${b.username || ""}`);
      if (aQa !== bQa) return aQa ? -1 : 1;
      if (a.id === PLAYTESTER_UUID) return -1;
      if (b.id === PLAYTESTER_UUID) return 1;
      return String(a.displayName || a.login || "").localeCompare(String(b.displayName || b.login || ""));
    });
    usersById = new Map(rows.map((row) => [String(row.id), row]));
    const options = [`<option value="">Select a Trainer…</option>`].concat(rows.map((row) => {
      const name = row.displayName || row.login || "Trainer";
      const login = row.login ? `@${row.login}` : "";
      const mark = row.id === PLAYTESTER_UUID ? " · QA" : (row.id === SORA_UUID ? " · OWNER" : "");
      return `<option value="${esc(row.id)}">${esc(name)}${login ? ` (${esc(login)})` : ""}${mark}</option>`;
    }));
    els.user.innerHTML = options.join("");
    const picked = pickTrainerTarget(rows, {
      currentId: preferId || selectedUserId(),
      query: query != null ? query : lastQuery,
      playtesterId: PLAYTESTER_UUID,
      soraId: SORA_UUID
    });
    els.user.value = picked.targetId || "";
    syncSoraWarning();
  }

  async function loadUsers(query) {
    if (!els.user || typeof window.playCall !== "function") return;
    lastQuery = String(query || "").trim();
    setStatus("Loading trainers…");
    try {
      const data = await window.playCall("admin_list_users", {
        p_query: lastQuery,
        p_offset: 0
      });
      const users = data?.users || [];
      // Prefer including Play Tester even when the current query is empty / unrelated.
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
      renderUserOptions(users, selectedUserId(), lastQuery);
      usersLoaded = true;
      setStatus(users.length ? `${users.length} trainer${users.length === 1 ? "" : "s"} loaded.` : "No trainers match.");
    } catch (error) {
      setStatus(window.playRpcError?.(error) || String(error?.message || error), true);
    }
  }

  async function loadFamilies() {
    if (!els.candyFamily || familiesLoaded) return;
    const supabase = window.playSupabase;
    if (!supabase) {
      els.candyFamily.innerHTML = `<option value="">Species list unavailable</option>`;
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
      const rows = data || [];
      els.candyFamily.innerHTML = [`<option value="">Pick an Evolution Line…</option>`]
        .concat(rows.map((row) => {
          const bare = String(row.name || window.playSpeciesName?.(row.base_dex || row.id) || `Family ${row.id}`)
            .replace(/\s+Candy$/i, "")
            .replace(/\s+Evolution$/i, "")
            .trim();
          return `<option value="${Number(row.id)}">${esc(bare)} Evolution Candy</option>`;
        }))
        .join("");
      familiesLoaded = true;
    } catch (_) {
      // Fallback: unique family lines from species (dex = family_id when possible).
      try {
        const { data } = await supabase
          .from("species")
          .select("dex,name,family_id")
          .gte("dex", 1)
          .lte("dex", 151)
          .order("dex");
        const seen = new Set();
        const opts = [`<option value="">Pick an Evolution Line…</option>`];
        (data || []).forEach((row) => {
          const fam = Number(row.family_id || row.dex);
          if (!fam || seen.has(fam)) return;
          if (Number(row.dex) !== fam && Number(row.family_id) !== fam) return;
          // Prefer the row whose dex equals family_id (line base).
          if (Number(row.dex) !== fam) return;
          seen.add(fam);
          const bare = String(row.name || window.playSpeciesName?.(fam) || `Family ${fam}`);
          opts.push(`<option value="${fam}">${esc(bare)} Evolution Candy</option>`);
        });
        els.candyFamily.innerHTML = opts.join("");
        familiesLoaded = true;
      } catch (err) {
        els.candyFamily.innerHTML = `<option value="">Could not load Evolution Lines</option>`;
        setStatus(window.playRpcError?.(err) || String(err?.message || err), true);
      }
    }
  }

  function resolveSpeciesDex() {
    const raw = String(els.monSpecies?.value || "").trim();
    if (!raw) return null;
    if (typeof window.playParseSpeciesQuery === "function") {
      const hits = window.playParseSpeciesQuery(raw);
      const first = hits?.[0];
      const dex = Number(first?.dex || first || 0);
      if (dex >= 1 && dex <= 151) return dex;
    }
    const asNum = Number(raw);
    if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 151) return asNum;
    return null;
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
    // UUID authority: display name / Twitch login never replace p_user.
    setStatus(`${action} → ${userId}…`);
    try {
      const data = await window.playCall("admin_oak_qa", args);
      const user = selectedUser();
      const label = user?.displayName || user?.login || "Trainer";
      const warn = data?.soraWarning
        ? ` · TARGET ${label} (${userId}) · OWNER/BROADCASTER · soraWarning=true`
        : ` · target ${label} (${userId})`;
      const msg = data?.message || JSON.stringify(data);
      // Success with soraWarning is intentional owner targeting — not an RPC failure.
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
    els.user?.addEventListener("change", syncSoraWarning);
    els.soraConfirm?.addEventListener("change", syncGrantButtons);
    els.userQ?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadUsers(els.userQ.value), 280);
    });
    els.presetOak?.addEventListener("click", () => callOakQa("PRESET_OAK", {}));
    els.presetEvo?.addEventListener("click", () => callOakQa("PRESET_EVO", {}));
    els.grantMon?.addEventListener("click", () => {
      const dex = resolveSpeciesDex();
      if (!dex) {
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
      const familyId = Number(els.candyFamily?.value || 0);
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
  }

  function userIdLabel() {
    return selectedUserId() || "this Trainer";
  }

  async function init() {
    if (!document.querySelector("[data-content-panel='oakqa']")) return;
    bind();
    syncSoraWarning();
    await Promise.all([
      usersLoaded ? Promise.resolve() : loadUsers(""),
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
})();
