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
    els.header.innerHTML = `
      <h2>${window.playEscapeAttr(trainer.displayName || "Trainer")} · Lv. ${trainer.level || 1}</h2>
      <p class="muted">${window.playEscapeAttr(trainer.title || "No title yet")} · ${kanto.caught || 0}/151 Kanto · ${trainer.species || 0}/${window.playNationalTotal?.() || "?"} National · ${trainer.caught || 0} caught</p>
      ${window.playXpProgressHtml ? window.playXpProgressHtml(trainer, { compact: true }) : `<div class="xp-bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, Math.round((trainer.xpInto / Math.max(1, trainer.xpNeed)) * 100)))}%"></i></div>
      <p class="muted">${trainer.xpInto || 0} / ${trainer.xpNeed || 0} XP${next ? ` · Next reward: Level ${next.level} ${window.playEscapeAttr(next.label || "")}` : ""}</p>`}
      <dl class="sim-grid">
        <div><dt>Encounters</dt><dd>${stats.encounters || 0}</dd></div>
        <div><dt>Catches</dt><dd>${stats.captures || 0}</dd></div>
        <div><dt>Escapes</dt><dd>${stats.fails || 0}</dd></div>
        <div><dt>Honey</dt><dd>${stats.honey || 0}</dd></div>
        <div><dt>Shinies</dt><dd>${trainer.variants?.shinySpecies || 0}</dd></div>
        <div><dt>Female variants</dt><dd>${trainer.variants?.femaleVariants || 0}</dd></div>
      </dl>`;
  }

  function renderTitles() {
    const active = data?.trainer?.activeTitleId || "";
    els.titles.innerHTML = (data?.titles || []).map((row) => `
      <button type="button" class="prog-pick ${row.unlocked ? "" : "is-locked"} ${row.isNew ? "is-new" : ""}" data-title="${window.playEscapeAttr(row.id)}" aria-pressed="${row.id === active ? "true" : "false"}" aria-label="${window.playEscapeAttr(row.name)} ${row.unlocked ? (row.id === active ? "equipped" : "owned") : "locked"}">
        <strong>${window.playEscapeAttr(row.name)}</strong>
        <span class="id-state">${row.unlocked ? (row.id === active ? "equipped" : (row.isNew ? "new" : "owned")) : "locked"}</span>
        <span>${window.playEscapeAttr(row.unlocked ? row.description : (row.howTo || row.description || "Locked"))}</span>
      </button>`).join("");
  }

  function renderBadges() {
    els.badges.innerHTML = (data?.badges || []).map((row) => `
      <button type="button" class="prog-pick ${row.unlocked ? "" : "is-locked"} ${row.isNew ? "is-new" : ""}" data-badge="${window.playEscapeAttr(row.id)}" aria-pressed="${row.featured ? "true" : "false"}" aria-label="${window.playEscapeAttr(row.name)} ${row.unlocked ? (row.featured ? "equipped" : "owned") : "locked"}">
        <strong>${window.playEscapeAttr(row.name)}</strong>
        <span class="id-state">${row.unlocked ? (row.featured ? "equipped" : (row.isNew ? "new" : "owned")) : "locked"}</span>
        <span>${window.playEscapeAttr(row.unlocked ? row.description : (row.howTo || row.description || "Locked"))}</span>
      </button>`).join("");
  }

  function renderAchievements() {
    const cat = els.cat?.value || "all";
    const rows = (data?.achievements || []).filter((row) => cat === "all" || row.category === cat);
    els.ach.innerHTML = rows.map((row) => {
      const pct = Math.max(0, Math.min(100, Math.round((row.progress / Math.max(1, row.target)) * 100)));
      const when = row.unlockedAt ? new Date(row.unlockedAt) : null;
      const stamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString() : "";
      return `<article class="ach-card ${row.unlocked ? "is-done" : ""} ${row.hidden ? "is-hidden" : ""}">
        <strong>${window.playEscapeAttr(row.name)}</strong>
        <p>${window.playEscapeAttr(row.description)}</p>
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <span>${row.hidden ? "???" : `${row.progress} / ${row.target}`}${row.unlocked ? " · Complete" : " · Locked"}</span>
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
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
