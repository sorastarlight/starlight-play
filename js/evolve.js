(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("evo-app"),
    grid: document.getElementById("evo-grid"),
    candy: document.getElementById("candy-list"),
    mastery: document.getElementById("mastery-list"),
    filter: document.getElementById("evo-filter"),
    note: document.getElementById("evo-ready-note"),
    modal: document.getElementById("evo-modal"),
    detail: document.getElementById("evo-detail"),
    go: document.getElementById("evo-go"),
    status: document.getElementById("evo-status")
  };
  let data = null;
  let pick = null;

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      els.gate.hidden = false;
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

  function stars(rank) {
    return "★".repeat(rank || 0) + "☆".repeat(Math.max(0, 5 - (rank || 0)));
  }

  function canEvolve(row) {
    return row.haveCandy >= row.candyCost && row.haveItem && !row.locked;
  }

  function matches(row) {
    const filter = els.filter?.value || "ready";
    if (filter === "ready") return canEvolve(row);
    if (filter === "candy") return row.haveCandy < row.candyCost;
    if (filter === "item") return Boolean(row.item) && !row.haveItem;
    if (filter === "shiny") return String(row.variant || "").includes("shiny");
    return true;
  }

  function render() {
    const rows = (data?.ready || []).filter(matches);
    const readyCount = (data?.ready || []).filter(canEvolve).length;
    if (els.note) els.note.textContent = readyCount ? `${readyCount} evolution${readyCount === 1 ? "" : "s"} available.` : "Keep catching family members to earn Candy.";
    els.grid.innerHTML = rows.map((row) => `
      <article class="ach-card ${canEvolve(row) ? "is-done" : ""}">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="" width="72" height="72">
        <strong>${row.variant && String(row.variant).includes("shiny") ? "Shiny " : ""}${row.name}</strong>
        <p>→ ${row.toName}</p>
        <span>${row.haveCandy} / ${row.candyCost} Candy${row.item ? ` · ${window.playItemLabel ? window.playItemLabel(row.item) : row.item}` : ""}</span>
        <button type="button" data-evo="${row.catchId}" data-rule="${row.ruleId}" ${canEvolve(row) ? "" : "disabled"}>Evolve</button>
      </article>`).join("") || `<p class="muted">Nothing in this filter right now.</p>`;
    els.candy.innerHTML = (data?.candy || []).map((row) => `
      <article class="prog-pick">
        <img src="${window.playSpriteUrl(row.baseDex, "normal")}" alt="" width="48" height="48">
        <strong>${row.name}</strong>
        <span>${row.qty}</span>
      </article>`).join("") || `<p class="muted">Catch Pokémon to start earning family Candy.</p>`;
    els.mastery.innerHTML = (data?.mastery || []).map((row) => `
      <article class="prog-pick">
        <img src="${window.playSpriteUrl(row.dex, "normal")}" alt="" width="48" height="48">
        <strong>${window.playSpeciesName(row.dex)}</strong>
        <span>${stars(row.rank)} · ${row.points} pts · ${row.lifetime || 0} caught</span>
      </article>`).join("") || `<p class="muted">Catch Pokémon to begin Species Mastery.</p>`;
  }

  function openModal(row) {
    pick = row;
    els.detail.innerHTML = `
      <p><img src="${window.playSpriteUrl(row.dex, row.variant)}" alt=""> → <img src="${window.playSpriteUrl(row.toDex, row.variant)}" alt=""></p>
      <p>${row.name} becomes ${row.toName}.</p>
      <p>Candy: ${row.haveCandy} / ${row.candyCost}${row.item ? ` · ${row.item}: ${row.haveItem ? "yes" : "missing"}` : ""}</p>
      ${String(row.variant || "").includes("shiny") ? `<p><strong>This is a SHINY Pokémon.</strong> Shiny status is kept.</p>` : ""}`;
    els.status.textContent = "";
    els.modal.showModal();
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      els.gate.hidden = false;
      return;
    }
    try {
      data = await window.playCall("play_collection");
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Evolution is not live yet.");
    }
  }

  els.grid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-evo]");
    if (!button) return;
    const row = (data?.ready || []).find((item) => item.catchId === button.dataset.evo && item.ruleId === button.dataset.rule);
    if (row) openModal(row);
  });
  els.go?.addEventListener("click", async () => {
    if (!pick) return;
    els.status.textContent = "Evolving…";
    try {
      const result = await window.playCall("play_evolve", { p_catch: pick.catchId, p_rule: pick.ruleId });
      els.status.textContent = result.message || "Evolved!";
      if (typeof window.playShowNotices === "function") window.playShowNotices();
      await load();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });
  els.filter?.addEventListener("change", render);
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
