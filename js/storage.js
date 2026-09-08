(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("box-app"),
    head: document.getElementById("box-head"),
    grid: document.getElementById("box-grid"),
    count: document.getElementById("box-count"),
    detail: document.getElementById("box-detail"),
    candy: document.getElementById("candy-grid"),
    search: document.getElementById("box-search"),
    focusSearch: document.getElementById("focus-search"),
    status: document.getElementById("box-status"),
    oakModal: document.getElementById("oak-modal"),
    oakSprite: document.getElementById("oak-sprite"),
    oakCopy: document.getElementById("oak-copy")
  };
  let data = null;
  let selectedId = "";
  let filtered = [];
  let pendingOakId = "";

  window.playBindAccountNav({
    onSignOut() {
      data = null;
      els.app.hidden = true;
      els.gate.hidden = false;
    }
  });

  function genderMark(gender) {
    if (gender === "Male") return `<span class="lgpe-sex-m">♂</span>`;
    if (gender === "Female") return `<span class="lgpe-sex-f">♀</span>`;
    return "–";
  }

  function displayName(mon) {
    const shiny = String(mon.variant || "").includes("shiny") ? "Shiny " : "";
    return mon.nickname ? `${mon.nickname}` : `${shiny}${mon.name}`;
  }

  function cpOf(mon) {
    return Number(mon.cp) || window.playMonCp?.(mon) || 10;
  }

  function teamSlot(mon) {
    const ids = data?.teamIds || [];
    const index = ids.findIndex((id) => String(id) === String(mon.id));
    return index >= 0 ? index + 1 : 0;
  }

  function matches(mon) {
    const q = (els.search?.value || "").trim().toLowerCase();
    if (!q) return true;
    return [mon.name, mon.nickname, mon.publicId, mon.gender, mon.variant, String(mon.dex)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  }

  function renderHead(mon, index) {
    if (!mon) {
      els.head.textContent = filtered.length ? "Select a Pokémon" : "No Pokémon in this box yet";
      return;
    }
    els.head.innerHTML = `${window.playEscapeAttr(displayName(mon))} (Lv. ${mon.level || 1} / ${genderMark(mon.gender)})`;
    els.count.textContent = `${index + 1} of ${filtered.length}`;
  }

  function renderGrid() {
    const mons = (data?.mons || []).filter(matches);
    filtered = mons;
    if (!mons.length) {
      els.grid.innerHTML = `<p class="lgpe-empty">Catch Pokémon on Play to fill this box.</p>`;
      renderHead(null, 0);
      return;
    }
    if (!mons.some((row) => String(row.id) === selectedId)) selectedId = String(mons[0].id);
    els.grid.innerHTML = mons.map((mon) => {
      const slot = teamSlot(mon);
      const selected = String(mon.id) === selectedId;
      return `<button type="button" class="lgpe-mon${selected ? " is-selected" : ""}" data-id="${mon.id}" role="option" aria-selected="${selected}">
        ${slot ? `<span class="lgpe-party">${slot}</span>` : ""}
        ${slot === 1 ? `<span class="lgpe-heart" aria-hidden="true">♥</span>` : ""}
        ${String(mon.variant || "").includes("shiny") ? `<span class="lgpe-spark">✦</span>` : ""}
        <span class="lgpe-sprite"><img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt=""></span>
        <strong class="lgpe-cp">${cpOf(mon)}</strong>
      </button>`;
    }).join("");
    const index = mons.findIndex((row) => String(row.id) === selectedId);
    renderHead(mons[index], index);
    renderDetail(mons[index]);
  }

  function statRows(mon) {
    const labels = [
      ["hp", "HP"], ["atk", "Attack"], ["def", "Defense"],
      ["spa", "Sp. Atk"], ["spd", "Sp. Def"], ["spe", "Speed"]
    ];
    return labels.map(([key, label]) => {
      const value = Number(mon.stats?.[key] || 0);
      const iv = Number(mon.ivs?.[key] || 0);
      const av = Number(mon.avs?.[key] || 0);
      const pct = Math.max(8, Math.min(100, Math.round((value / 250) * 100)));
      return `<div class="lgpe-stat"><span>${label}</span><i style="--pct:${pct}%"></i><strong>${value}</strong><em>IV ${iv} · AV ${av}</em></div>`;
    }).join("");
  }

  function renderDetail(mon) {
    if (!mon) {
      els.detail.innerHTML = `<p class="muted">Tap a Pokémon in the box to see its Let’s Go stats, moves, and nickname.</p>`;
      return;
    }
    const shiny = String(mon.variant || "").includes("shiny");
    const caught = mon.caughtAt ? new Date(mon.caughtAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
    els.detail.innerHTML = `
      <div class="lgpe-detail-hero">
        <img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="">
        <div>
          <p class="eyebrow">${mon.publicId || "LG--------"}</p>
          <h2>${displayName(mon)}</h2>
          <p>${window.playSpeciesName(mon.dex)} · Lv. ${mon.level || 1} · ${mon.gender || "Unknown"}${shiny ? " · Shiny" : ""} · ${mon.size || "M"}</p>
          <p class="muted">Caught ${caught} · ${window.playItemLabel(mon.ball) || "Ball"}</p>
        </div>
      </div>
      <p class="lgpe-cp-line">CP <strong>${cpOf(mon)}</strong></p>
      <div class="lgpe-stats">${statRows(mon)}</div>
      <h3>Moves</h3>
      <ul class="lgpe-moves">${(mon.moves || []).map((move) => `<li>${move}</li>`).join("") || "<li>Tackle</li>"}</ul>
      <label class="field" for="nick-input">Nickname
        <input id="nick-input" type="text" maxlength="12" value="${mon.nickname || ""}" placeholder="${mon.name}">
      </label>
      <div class="links">
        <button id="save-nick" type="button">Save nickname</button>
        <button id="list-trade" class="secondary" type="button">${mon.listed ? "Already listed" : "Put up for trade"}</button>
        <button id="send-oak" class="danger" type="button" ${mon.onTeam || mon.listed ? "disabled" : ""}>Transfer to Oak</button>
      </div>`;
    document.getElementById("save-nick")?.addEventListener("click", () => act("play_set_nickname", {
      p_catch_id: mon.id,
      p_name: document.getElementById("nick-input")?.value || ""
    }));
    document.getElementById("send-oak")?.addEventListener("click", () => openOakModal(mon));
    document.getElementById("list-trade")?.addEventListener("click", () => {
      window.location.href = `./trade.html?list=${encodeURIComponent(mon.id)}`;
    });
  }

  function openOakModal(mon) {
    if (!els.oakModal || !mon) return;
    pendingOakId = String(mon.id);
    if (els.oakSprite) {
      els.oakSprite.src = window.playSpriteUrl(mon.dex, mon.variant);
      els.oakSprite.alt = displayName(mon);
    }
    if (els.oakCopy) {
      els.oakCopy.textContent = `Send ${displayName(mon)} to Professor Oak for Candy?`;
    }
    if (typeof els.oakModal.showModal === "function") els.oakModal.showModal();
    else els.oakModal.setAttribute("open", "");
  }

  function renderCandy() {
    const rows = data?.candies || [];
    if (!rows.length) {
      els.candy.innerHTML = `<p class="muted">No Candy yet. Transfer Pokémon from this box to Professor Oak.</p>`;
      return;
    }
    els.candy.innerHTML = rows.map((row) => `
      <article class="candy-chip">
        <img src="${window.playItemSprite(row.key)}" alt="">
        <strong>${window.playCandyLabel(row.key)}</strong>
        <span>×${row.qty}</span>
      </article>`).join("");
  }

  function render() {
    renderGrid();
    renderCandy();
  }

  async function act(name, args) {
    els.status.textContent = "Working…";
    try {
      data = await window.playCall(name, args);
      els.status.textContent = data.message || "";
      render();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.app.hidden = true;
      els.gate.hidden = false;
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let snapshot = null;
    try {
      snapshot = await window.playCall("play_state");
    } catch (_) {}
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer });
    try {
      data = await window.playCall("play_storage");
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Could not open storage.");
    }
  }

  function gridColumns() {
    if (window.matchMedia("(max-width: 640px)").matches) return 3;
    if (window.matchMedia("(max-width: 1040px)").matches) return 4;
    return 6;
  }

  function moveSelection(dx, dy) {
    if (!filtered.length) return;
    const index = filtered.findIndex((row) => String(row.id) === selectedId);
    const cols = gridColumns();
    const next = Math.max(0, Math.min(filtered.length - 1, (index < 0 ? 0 : index) + dx + dy * cols));
    selectedId = String(filtered[next].id);
    renderGrid();
    els.grid.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
  }

  els.grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    selectedId = button.dataset.id;
    renderGrid();
  });
  els.grid.addEventListener("keydown", (event) => {
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    moveSelection(move[0], move[1]);
  });
  els.search?.addEventListener("input", renderGrid);
  els.focusSearch?.addEventListener("click", () => {
    els.search?.focus();
    els.search?.select?.();
  });
  els.oakModal?.addEventListener("click", (event) => {
    if (event.target === els.oakModal) els.oakModal.close("cancel");
  });
  els.oakModal?.addEventListener("close", () => {
    if (els.oakModal.returnValue !== "transfer" || !pendingOakId) {
      pendingOakId = "";
      return;
    }
    const id = pendingOakId;
    pendingOakId = "";
    act("play_transfer_oak", { p_catch_id: id });
  });
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
