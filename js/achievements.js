(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("prog-app"),
    overview: document.getElementById("ach-overview"),
    states: document.getElementById("ach-states"),
    cats: document.getElementById("ach-cats"),
    search: document.getElementById("ach-search"),
    sort: document.getElementById("ach-sort"),
    grid: document.getElementById("ach-grid"),
    next: document.getElementById("ach-next"),
    nextPanel: document.getElementById("ach-next-panel"),
    empty: document.getElementById("ach-empty"),
    equipHint: document.getElementById("ach-equip-hint")
  };
  let data = null;
  let stateFilter = "all";
  let catFilter = "all";
  let query = "";
  let sortMode = "closest";

  const CAT_LABELS = {
    pokedex: "Pokédex",
    catching: "Catching",
    capture: "Catching",
    evolution: "Evolution",
    mastery: "Mastery",
    encounters: "Encounters",
    rare: "Encounters",
    shiny: "Shiny",
    trading: "Trading",
    trade: "Trading",
    community: "Community",
    items: "Items",
    trainer: "Adventure",
    special: "Special"
  };

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to open your trainer progress.");
    }
  });

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return session;
  }

  function achCategory(row) {
    const raw = String(row.category || "").toLowerCase();
    if (raw && CAT_LABELS[raw]) return raw === "capture" ? "catching" : (raw === "rare" ? "encounters" : (raw === "trade" ? "trading" : raw));
    const blob = `${row.id || ""} ${row.name || ""} ${row.description || ""}`.toLowerCase();
    if (/pokedex|pokédex|dex|species|register/.test(blob)) return "pokedex";
    if (/evolv/.test(blob)) return "evolution";
    if (/mastery|mastered/.test(blob)) return "mastery";
    if (/shiny/.test(blob)) return "shiny";
    if (/trade|link|gts/.test(blob)) return "trading";
    if (/honey|community|stream|oak|research/.test(blob)) return "community";
    if (/encounter|legendary|mythical|rare/.test(blob)) return "encounters";
    if (/catch|capture|ball/.test(blob)) return "catching";
    if (/item|candy|coin|mart/.test(blob)) return "items";
    if (/special|event|secret/.test(blob)) return "special";
    return "trainer";
  }

  function catLabel(id) {
    return CAT_LABELS[id] || (id === "trainer" ? "Adventure" : id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  function progressPct(row) {
    return Math.max(0, Math.min(100, Math.round((Number(row.progress || 0) / Math.max(1, Number(row.target || 1))) * 100)));
  }

  function titleReward(row) {
    const rewards = row.rewards || {};
    const id = rewards.title || rewards.trainerTitle || rewards.trainer_title || "";
    if (!id) return null;
    const fromList = (data?.titles || []).find((t) => t.id === id);
    return { id, name: fromList?.name || rewards.titleName || id };
  }

  function ribbonReward(row) {
    const ribbon = window.playRibbonForAchievement?.(row);
    const map = window.playRibbonMapping?.(row.id);
    if (!ribbon && !map) {
      const badgeId = row.rewards?.badge || row.rewards?.ribbon;
      if (!badgeId) return null;
      const fromBadge = window.playRibbonForBadge?.({ id: badgeId }) || null;
      if (!fromBadge) return { id: badgeId, name: badgeId };
      return fromBadge;
    }
    return ribbon || { id: map.ribbonId, name: map.ribbonName, origin: map.ribbonOrigin };
  }

  function overviewStats() {
    const rows = data?.achievements || [];
    const completed = rows.filter((r) => r.unlocked).length;
    const inProgress = rows.filter((r) => !r.unlocked && Number(r.progress || 0) > 0).length;
    const ribbons = (data?.badges || []).filter((b) => b.unlocked).length;
    const titles = (data?.titles || []).filter((t) => t.unlocked).length;
    return { completed, inProgress, ribbons, titles, total: rows.length };
  }

  function renderOverview() {
    if (!els.overview) return;
    const s = overviewStats();
    els.overview.innerHTML = `
      <div class="ach-hub-stat"><span>Completed</span><strong>${s.completed}</strong></div>
      <div class="ach-hub-stat"><span>In Progress</span><strong>${s.inProgress}</strong></div>
      <div class="ach-hub-stat"><span>Ribbons Earned</span><strong>${s.ribbons}</strong></div>
      <div class="ach-hub-stat"><span>Titles Earned</span><strong>${s.titles}</strong></div>`;
  }

  function availableCategories() {
    const counts = new Map();
    (data?.achievements || []).forEach((row) => {
      const cat = achCategory(row);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => catLabel(a[0]).localeCompare(catLabel(b[0])))
      .map(([id, count]) => ({ id, count }));
  }

  function renderFilters() {
    if (els.states) {
      const states = [
        ["all", "All"],
        ["progress", "In Progress"],
        ["completed", "Completed"]
      ];
      els.states.innerHTML = states.map(([id, label]) =>
        `<button type="button" class="ach-hub-chip${stateFilter === id ? " is-on" : ""}" data-ach-state="${id}" aria-pressed="${stateFilter === id}">${label}</button>`
      ).join("");
    }
    if (els.cats) {
      const cats = availableCategories();
      els.cats.innerHTML = [
        `<button type="button" class="ach-hub-chip${catFilter === "all" ? " is-on" : ""}" data-ach-cat="all" aria-pressed="${catFilter === "all"}">All Categories</button>`,
        ...cats.map(({ id, count }) =>
          `<button type="button" class="ach-hub-chip${catFilter === id ? " is-on" : ""}" data-ach-cat="${window.playEscapeAttr(id)}" aria-pressed="${catFilter === id}">${window.playEscapeAttr(catLabel(id))} <span class="muted">(${count})</span></button>`
        )
      ].join("");
    }
  }

  function filteredRows() {
    let rows = (data?.achievements || []).slice();
    rows = rows.filter((row) => {
      if (stateFilter === "completed") return Boolean(row.unlocked);
      if (stateFilter === "progress") return !row.unlocked;
      return true;
    });
    if (catFilter !== "all") rows = rows.filter((row) => achCategory(row) === catFilter);
    const q = String(query || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const ribbon = ribbonReward(row);
        const title = titleReward(row);
        const blob = `${row.name || ""} ${row.description || ""} ${ribbon?.name || ""} ${title?.name || ""} ${catLabel(achCategory(row))}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (sortMode === "recent") {
      rows.sort((a, b) => {
        const ta = a.unlockedAt || a.completedAt || "";
        const tb = b.unlockedAt || b.completedAt || "";
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return String(tb).localeCompare(String(ta)) || String(a.name || "").localeCompare(String(b.name || ""));
      });
    } else if (sortMode === "category") {
      rows.sort((a, b) => catLabel(achCategory(a)).localeCompare(catLabel(achCategory(b))) || String(a.name || "").localeCompare(String(b.name || "")));
    } else if (sortMode === "progress") {
      rows.sort((a, b) => progressPct(b) - progressPct(a) || String(a.name || "").localeCompare(String(b.name || "")));
    } else {
      // closest to completion (incomplete first, then by remaining)
      rows.sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1;
        const ra = Math.max(0, Number(a.target || 1) - Number(a.progress || 0));
        const rb = Math.max(0, Number(b.target || 1) - Number(b.progress || 0));
        return ra - rb || progressPct(b) - progressPct(a) || String(a.name || "").localeCompare(String(b.name || ""));
      });
    }
    return rows;
  }

  function rewardHtml(row) {
    const parts = [];
    const title = titleReward(row);
    const ribbon = ribbonReward(row);
    if (title) {
      parts.push(`<span class="ach-hub-reward is-title"><span class="ach-hub-reward-tag">Title</span><strong>${window.playEscapeAttr(title.name)}</strong></span>`);
    }
    if (ribbon) {
      const name = ribbon.name || "Ribbon";
      parts.push(`<button type="button" class="ach-hub-reward is-ribbon" data-ach-ribbon="${window.playEscapeAttr(row.id)}" aria-label="Ribbon reward: ${window.playEscapeAttr(name)}">${window.playRibbonIconHtml?.(ribbon, { name, locked: !row.unlocked, size: 28 }) || ""}<strong>${window.playEscapeAttr(name)}</strong></button>`);
    }
    Object.entries(row.rewards || {}).forEach(([key, qty]) => {
      if (["badge", "title", "cosmetic"].includes(key) || !(Number(qty) > 0)) return;
      const label = window.playItemLabel?.(key) || key;
      const sprite = window.playItemSprite?.(key) || "images/items/poke-ball.png";
      parts.push(`<span class="ach-hub-reward is-item"><img src="${window.playEscapeAttr(sprite)}" alt="" width="24" height="24" decoding="async"><strong>${window.playEscapeAttr(label)}${Number(qty) > 1 ? ` ×${Number(qty)}` : ""}</strong></span>`);
    });
    if (!parts.length) return "";
    return `<div class="ach-hub-rewards"><span class="ach-hub-rewards-label">Rewards</span>${parts.join("")}</div>`;
  }

  function stateOf(row) {
    if (row.unlocked) return { cls: "is-done", label: "Completed" };
    if (Number(row.progress || 0) > 0) return { cls: "is-progress", label: "In Progress" };
    return { cls: "is-locked", label: "Not Started" };
  }

  function nextGoals() {
    const open = (data?.achievements || []).filter((row) => !row.unlocked && !row.hidden);
    const byClosest = (a, b) => progressPct(b) - progressPct(a)
      || (Number(a.target || 1) - Number(a.progress || 0)) - (Number(b.target || 1) - Number(b.progress || 0))
      || String(a.name || "").localeCompare(String(b.name || ""));
    const started = open.filter((row) => Number(row.progress || 0) > 0).sort(byClosest);
    const fresh = open.filter((row) => !(Number(row.progress || 0) > 0)).sort(byClosest);
    return started.concat(fresh).slice(0, 4);
  }

  function renderNext() {
    if (!els.next) return;
    const rows = nextGoals();
    if (els.nextPanel) els.nextPanel.hidden = rows.length === 0;
    els.next.innerHTML = rows.map((row) => {
      const pct = progressPct(row);
      return `<article class="ach-next-card">
        <p class="ach-hub-cat">${window.playEscapeAttr(catLabel(achCategory(row)))}</p>
        <strong class="ach-hub-name">${window.playEscapeAttr(row.name)}</strong>
        <p class="ach-hub-desc">${window.playEscapeAttr(row.description || "")}</p>
        <div class="xp-bar ach-hub-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <span class="ach-hub-progress">${window.playEscapeAttr(`${row.progress || 0} / ${row.target || 0}`)} · ${pct}%</span>
        ${rewardHtml(row)}
      </article>`;
    }).join("");
  }

  function renderAchievements() {
    if (!els.grid) return;
    const rows = filteredRows();
    if (els.empty) {
      els.empty.hidden = rows.length > 0;
      if (!rows.length) {
        const msg = query
          ? "No achievements match your search."
          : stateFilter === "completed"
            ? "No completed achievements in this view yet."
            : stateFilter === "progress"
              ? "Nothing in progress for this filter."
              : "No achievements in this category yet.";
        els.empty.textContent = msg;
      }
    }
    els.grid.innerHTML = rows.map((row) => {
      const pct = progressPct(row);
      const ribbon = ribbonReward(row);
      const done = Boolean(row.unlocked);
      const state = stateOf(row);
      const progressLabel = row.hidden && !done
        ? "???"
        : `${row.progress || 0} / ${row.target || 0}`;
      const icon = window.playRibbonIconHtml?.(ribbon, { name: ribbon?.name || row.name, locked: !done, size: 44 })
        || `<span class="ach-hub-fallback" aria-hidden="true">★</span>`;
      return `<article class="ach-hub-card ${state.cls}${row.hidden ? " is-hidden" : ""}" data-ach-id="${window.playEscapeAttr(row.id)}">
        <div class="ach-hub-icon">${icon}</div>
        <div class="ach-hub-copy">
          <div class="ach-hub-meta">
            <p class="ach-hub-cat">${window.playEscapeAttr(catLabel(achCategory(row)))}</p>
            <span class="ach-hub-state ${state.cls}">${state.label}</span>
          </div>
          <strong class="ach-hub-name">${window.playEscapeAttr(row.name)}</strong>
          <p class="ach-hub-desc">${window.playEscapeAttr(row.description || "")}</p>
          <div class="xp-bar ach-hub-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
          <span class="ach-hub-progress">${window.playEscapeAttr(progressLabel)}</span>
        </div>
        ${rewardHtml(row)}
      </article>`;
    }).join("");
  }

  function render() {
    if (!data) return;
    renderOverview();
    renderNext();
    renderFilters();
    renderAchievements();
    if (els.equipHint) {
      els.equipHint.hidden = false;
    }
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to open your trainer progress.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
    try {
      data = await window.playCall("play_progression");
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Progress is not live yet.");
    }
  }

  els.app?.addEventListener("click", (event) => {
    const stateBtn = event.target.closest("[data-ach-state]");
    if (stateBtn) {
      stateFilter = stateBtn.dataset.achState || "all";
      render();
      return;
    }
    const catBtn = event.target.closest("[data-ach-cat]");
    if (catBtn) {
      catFilter = catBtn.dataset.achCat || "all";
      render();
      return;
    }
    const ribbonBtn = event.target.closest("[data-ach-ribbon]");
    if (ribbonBtn) {
      const row = (data?.achievements || []).find((item) => item.id === ribbonBtn.dataset.achRibbon);
      if (row) {
        const ribbon = ribbonReward(row);
        const map = window.playRibbonMapping?.(row.id);
        window.playOpenRibbonDetail?.({
          ribbon,
          ribbonId: ribbon?.id || map?.ribbonId,
          name: ribbon?.name || map?.ribbonName,
          achievementId: row.id,
          achievementName: row.name,
          requirement: row.description || "",
          locked: !row.unlocked
        });
      }
    }
  });

  els.search?.addEventListener("input", () => {
    query = els.search.value || "";
    renderAchievements();
  });

  els.sort?.addEventListener("change", () => {
    sortMode = els.sort.value || "closest";
    renderAchievements();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise(event, session)) return;
    load();
  });
  load();
})();
