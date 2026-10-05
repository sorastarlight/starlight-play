(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("prog-app"),
    header: document.getElementById("prog-header"),
    titles: document.getElementById("title-grid"),
    titleStatus: document.getElementById("title-status"),
    badges: document.getElementById("badge-grid"),
    badgeStatus: document.getElementById("badge-status"),
    ach: document.getElementById("ach-grid"),
    cat: document.getElementById("ach-cat")
  };
  let data = null;

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

  function rewardBits(rewards) {
    if (typeof window.playRewardCopy === "function") return window.playRewardCopy(rewards);
    if (!rewards || typeof rewards !== "object") return "";
    return Object.entries(rewards)
      .filter(([key, value]) => value && !["idempotency", "key", "label"].includes(key))
      .map(([key, value]) => {
        if (key === "coins") return `${value} PokéCoins`;
        if (key === "xp") return `${value} XP`;
        if (key === "candy" || key === "evolutioncandy") return `${value} Evolution Candy`;
        return `${value} ${typeof window.playItemLabel === "function" ? window.playItemLabel(key) : key}`;
      })
      .join(" · ");
  }

  function renderHeader() {
    const trainer = data?.trainer || {};
    const stats = data?.stats || {};
    const kanto = trainer.kanto || {};
    const next = trainer.nextReward;
    const kantoCaught = kanto.caught || 0;
    els.header.innerHTML = `
      <div class="ach-progress-hero">
        <div class="ach-progress-identity">
          <p class="ach-kicker">TRAINER PROGRESS</p>
          <h2 class="ach-trainer-name">${window.playEscapeAttr(trainer.displayName || "Trainer")}</h2>
          <p class="ach-trainer-title">${window.playEscapeAttr(trainer.title || "No title yet")}</p>
          <p class="ach-trainer-level">Lv. ${trainer.level || 1}</p>
        </div>
        <div class="ach-progress-stats" role="group" aria-label="Kanto progress">
          <div class="ach-stat"><span>Kanto Pokédex</span><strong>${kantoCaught}/151</strong></div>
          <div class="ach-stat"><span>Catches</span><strong>${trainer.caught || stats.captures || 0}</strong></div>
          <div class="ach-stat"><span>Shinies</span><strong>${trainer.variants?.shinySpecies || 0}</strong></div>
          <div class="ach-stat"><span>Honey</span><strong>${stats.honey || 0}</strong></div>
        </div>
      </div>
      ${window.playXpProgressHtml ? window.playXpProgressHtml(trainer, { compact: true }) : `<div class="xp-bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, Math.round((trainer.xpInto / Math.max(1, trainer.xpNeed)) * 100)))}%"></i></div>
      <p class="muted">${trainer.xpInto || 0} / ${trainer.xpNeed || 0} XP${next ? ` · Next reward: Level ${next.level} ${window.playEscapeAttr(next.label || "")}` : ""}</p>`}`;
  }

  function titleCategory(row) {
    const blob = `${row.id || ""} ${row.name || ""} ${row.description || ""} ${row.howTo || ""} ${row.category || ""}`.toLowerCase();
    if (/pokedex|pokédex|dex|species/.test(blob)) return "pokedex";
    if (/shiny/.test(blob)) return "shiny";
    if (/evolv/.test(blob)) return "evolution";
    if (/trade|link/.test(blob)) return "trading";
    if (/honey|community|stream|oak|research/.test(blob)) return "community";
    if (/catch|capture|ball/.test(blob)) return "catching";
    return "trainer";
  }

  let titleFilter = "all";

  function renderTitles() {
    const active = data?.trainer?.activeTitleId || "";
    const filters = [
      ["all", "All"],
      ["owned", "Owned"],
      ["locked", "Locked"],
      ["trainer", "Trainer"],
      ["pokedex", "Pokédex"],
      ["catching", "Catching"],
      ["shiny", "Shiny"],
      ["community", "Community"],
      ["evolution", "Evolution"],
      ["trading", "Trading"]
    ];
    const rows = (data?.titles || []).filter((row) => {
      if (titleFilter === "owned") return row.unlocked;
      if (titleFilter === "locked") return !row.unlocked;
      if (titleFilter === "all") return true;
      return titleCategory(row) === titleFilter;
    });
    const filterHtml = `<div class="ach-title-filters" role="toolbar" aria-label="Title filters">${filters.map(([id, label]) =>
      `<button type="button" class="ach-filter-chip${titleFilter === id ? " is-on" : ""}" data-title-filter="${id}" aria-pressed="${titleFilter === id}">${label}</button>`
    ).join("")}</div>`;
    els.titles.innerHTML = filterHtml + (rows.map((row) => {
      const state = row.unlocked ? (row.id === active ? "equipped" : "owned") : "locked";
      return `<button type="button" class="prog-pick ach-title-card is-${state} ${row.isNew ? "is-new" : ""}" data-title="${window.playEscapeAttr(row.id)}" aria-pressed="${row.id === active ? "true" : "false"}" aria-label="${window.playEscapeAttr(row.name)} ${state}">
        <strong class="ach-title-name">${window.playEscapeAttr(row.name)}</strong>
        <span class="ach-title-req">${window.playEscapeAttr(row.unlocked ? row.description : (row.howTo || row.description || "Locked"))}</span>
        <span class="ach-title-state">${state}</span>
      </button>`;
    }).join("") || `<p class="muted">No titles in this filter.</p>`);
  }

  function renderBadges() {
    els.badges.innerHTML = (data?.badges || []).map((row) => {
      const state = row.unlocked ? (row.featured ? "equipped" : "owned") : "locked";
      return `<button type="button" class="prog-pick ach-badge-card is-${state} ${row.isNew ? "is-new" : ""}" data-badge="${window.playEscapeAttr(row.id)}" aria-pressed="${row.featured ? "true" : "false"}" aria-label="${window.playEscapeAttr(row.name)} ${state}">
        <strong class="ach-title-name">${window.playEscapeAttr(row.name)}</strong>
        <span class="ach-title-req">${window.playEscapeAttr(row.unlocked ? row.description : (row.howTo || row.description || "Locked"))}</span>
        <span class="ach-title-state">${state}</span>
      </button>`;
    }).join("");
  }

  function renderAchievements() {
    const cat = els.cat?.value || "all";
    const rows = (data?.achievements || []).filter((row) => cat === "all" || row.category === cat);
    els.ach.innerHTML = rows.map((row) => {
      const pct = Math.max(0, Math.min(100, Math.round((row.progress / Math.max(1, row.target)) * 100)));
      const when = row.unlockedAt ? new Date(row.unlockedAt) : null;
      const stamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString() : "";
      return `<article class="ach-card ${row.unlocked ? "is-done" : "is-locked"} ${row.hidden ? "is-hidden" : ""}">
        <strong>${window.playEscapeAttr(row.name)}</strong>
        <p>${window.playEscapeAttr(row.description)}</p>
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <span class="ach-card-progress">${row.hidden ? "???" : `${row.progress} / ${row.target}`}${row.unlocked ? " · Complete" : ""}</span>
        ${stamp ? `<span class="muted">${window.playEscapeAttr(stamp)}</span>` : ""}
        ${rewardBits(row.rewards) ? `<span class="muted">${rewardBits(row.rewards)}</span>` : ""}
      </article>`;
    }).join("") || `<p class="muted">No achievements in this category yet.</p>`;
  }

  function render() {
    if (!data) return;
    renderHeader();
    renderTitles();
    renderBadges();
    renderAchievements();
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

  els.titles?.addEventListener("click", async (event) => {
    const filterBtn = event.target.closest("[data-title-filter]");
    if (filterBtn) {
      titleFilter = filterBtn.dataset.titleFilter || "all";
      renderTitles();
      return;
    }
    const button = event.target.closest("[data-title]");
    if (!button) return;
    const row = (data?.titles || []).find((item) => item.id === button.dataset.title);
    if (!row?.unlocked) {
      els.titleStatus.textContent = `${row?.name || "This title"} is locked. ${row?.howTo || row?.description || ""}`.trim();
      return;
    }
    els.titleStatus.textContent = "Saving…";
    try {
      const next = button.dataset.title === data?.trainer?.activeTitleId ? "" : button.dataset.title;
      const saved = await window.playCall("play_set_title", { p_title: next });
      if (data) data.trainer = saved.trainer;
      render();
      els.titleStatus.textContent = saved.message || "Title saved.";
    } catch (error) {
      els.titleStatus.textContent = window.playRpcError(error);
    }
  });

  els.badges?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-badge]");
    if (!button) return;
    const id = button.dataset.badge;
    const row = (data?.badges || []).find((item) => item.id === id);
    if (!row?.unlocked) {
      els.badgeStatus.textContent = `${row?.name || "This badge"} is locked. ${row?.howTo || row?.description || ""}`.trim();
      return;
    }
    const featured = (data?.badges || []).filter((item) => item.featured).map((item) => item.id);
    const next = featured.includes(id) ? featured.filter((item) => item !== id) : featured.concat(id).slice(0, 3);
    els.badgeStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("play_set_badges", { p_ids: next });
      data = await window.playCall("play_progression");
      render();
      els.badgeStatus.textContent = saved.message || "Badges saved.";
    } catch (error) {
      els.badgeStatus.textContent = window.playRpcError(error);
    }
  });

  els.cat?.addEventListener("change", renderAchievements);
  supabase.auth.onAuthStateChange((event, session) => { if (window.playAuthNoise(event, session)) return; load(); });
  load();
})();
