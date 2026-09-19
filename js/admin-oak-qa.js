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
  }

  function selectedUserId() {
    return String(els.user?.value || "").trim();
  }

  function selectedUser() {
    return usersById.get(selectedUserId()) || null;
  }

  function isSoraTarget() {
    return selectedUserId() === SORA_UUID;
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
        els.userMeta.textContent = `${label}${login ? ` · ${login}` : ""} · ${user.id}`;
      }
    }
    syncGrantButtons();
  }

  function renderUserOptions(users, preferId) {
    if (!els.user) return;
    const current = preferId || selectedUserId();
    const rows = Array.isArray(users) ? users.slice() : [];
    rows.sort((a, b) => {
      const aQa = a.id === PLAYTESTER_UUID || /qa|play.?test/i.test(`${a.displayName || ""} ${a.login || ""} ${a.username || ""}`);
      const bQa = b.id === PLAYTESTER_UUID || /qa|play.?test/i.test(`${b.displayName || ""} ${b.login || ""} ${b.username || ""}`);
      if (aQa !== bQa) return aQa ? -1 : 1;
      if (a.id === PLAYTESTER_UUID) return -1;
      if (b.id === PLAYTESTER_UUID) return 1;
      return String(a.displayName || a.login || "").localeCompare(String(b.displayName || b.login || ""));
    });
    usersById = new Map(rows.map((row) => [row.id, row]));
    const options = [`<option value="">Select a Trainer…</option>`].concat(rows.map((row) => {
      const name = row.displayName || row.login || "Trainer";
      const login = row.login ? `@${row.login}` : "";
      const mark = row.id === PLAYTESTER_UUID ? " · QA" : "";
      return `<option value="${esc(row.id)}">${esc(name)}${login ? ` (${esc(login)})` : ""}${mark}</option>`;
    }));
    els.user.innerHTML = options.join("");
    let pick = "";
    const hadExplicit = Boolean(current && usersById.has(current));
    if (hadExplicit) {
      pick = current; // honor explicit selection (including Sora after confirm flow)
    } else if (usersById.has(PLAYTESTER_UUID)) {
      pick = PLAYTESTER_UUID;
    } else {
      const qa = rows.find((row) => row.id !== SORA_UUID && /qa|play.?test/i.test(`${row.displayName || ""} ${row.login || ""} ${row.username || ""}`));
      if (qa) pick = qa.id;
      else {
        const firstSafe = rows.find((row) => row.id !== SORA_UUID);
        pick = firstSafe ? firstSafe.id : "";
      }
    }
    // Never default to Sora.
    if (!hadExplicit && pick === SORA_UUID) pick = "";
    els.user.value = pick;
    syncSoraWarning();
  }

  async function loadUsers(query) {
    if (!els.user || typeof window.playCall !== "function") return;
    setStatus("Loading trainers…");
    try {
      const data = await window.playCall("admin_list_users", {
        p_query: String(query || "").trim(),
        p_offset: 0
      });
      const users = data?.users || [];
      // Prefer including Play Tester even when the current query is empty / unrelated.
      if (!String(query || "").trim() && !users.some((row) => row.id === PLAYTESTER_UUID)) {
        try {
          const qa = await window.playCall("admin_list_users", {
            p_query: "playtester",
            p_offset: 0
          });
          const hit = (qa?.users || []).find((row) => row.id === PLAYTESTER_UUID);
          if (hit) users.unshift(hit);
        } catch (_) { /* ignore */ }
      }
      renderUserOptions(users);
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
    if (isSoraTarget() && !soraConfirmed()) {
      setStatus("Confirm the live Trainer warning before granting.", true);
      return null;
    }
    setStatus(`${action}…`);
    try {
      const data = await window.playCall("admin_oak_qa", {
        p_action: action,
        p_user: userId,
        p_payload: payload || {}
      });
      const warn = data?.soraWarning ? " · soraWarning=true" : "";
      const msg = data?.message || JSON.stringify(data);
      setStatus(`${msg}${warn}`, Boolean(data?.soraWarning));
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
})();
