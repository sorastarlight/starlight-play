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
    status: document.getElementById("box-status"),
    tabs: document.getElementById("box-tabs"),
    oakModal: document.getElementById("oak-modal"),
    oakSprite: document.getElementById("oak-sprite"),
    oakCopy: document.getElementById("oak-copy")
  };
  let data = null;
  let selectedId = "";
  let filtered = [];
  let boxIndex = 0;
  const BOX_SLOTS = 30;
  let saveTimer = 0;
  let pendingOakId = "";
  let renamingBox = -1;

  window.playBindAccountNav({
    onSignOut() {
      data = null;
      els.app.hidden = true;
      els.gate.hidden = false;
    }
  });

  function genderChip(gender) {
    const key = String(gender || "");
    if (key === "Male") return `<span class="type-chip gender-chip is-male">Male ♂</span>`;
    if (key === "Female") return `<span class="type-chip gender-chip is-female">Female ♀</span>`;
    return `<span class="type-chip gender-chip is-none">Genderless</span>`;
  }

  function displayName(mon) {
    return mon.nickname ? `${mon.nickname}` : `${mon.name}`;
  }

  function teamSlot(mon) {
    const ids = data?.teamIds || [];
    const index = ids.findIndex((id) => String(id) === String(mon.id));
    return index >= 0 ? index + 1 : 0;
  }

  function monById(id) {
    return (data?.mons || []).find((row) => String(row.id) === String(id)) || null;
  }

  function normalizeBoxes() {
    const allMons = data?.mons || [];
    const known = new Set(allMons.map((row) => String(row.id)));
    let dirty = false;
    let boxes = Array.isArray(data?.layout?.boxes) ? data.layout.boxes.map((box) => ({
      name: String(box.name || "BOX").slice(0, 12) || "BOX",
      slots: Array.from({ length: BOX_SLOTS }, (_, i) => {
        const id = box.slots?.[i];
        return id && known.has(String(id)) ? String(id) : null;
      })
    })) : [];
    if (!boxes.length) {
      boxes = [{ name: "BOX 1", slots: Array(BOX_SLOTS).fill(null) }];
      dirty = true;
    }
    const placed = new Set(boxes.flatMap((box) => box.slots.filter(Boolean)));
    allMons.forEach((mon) => {
      const id = String(mon.id);
      if (placed.has(id)) return;
      let target = boxes.find((box) => box.slots.includes(null));
      if (!target) {
        boxes.push({ name: `BOX ${boxes.length + 1}`, slots: Array(BOX_SLOTS).fill(null) });
        target = boxes[boxes.length - 1];
      }
      target.slots[target.slots.indexOf(null)] = id;
      placed.add(id);
      dirty = true;
    });
    if (boxIndex >= boxes.length) boxIndex = boxes.length - 1;
    if (dirty) data._layoutDirty = true;
    data.layout = { boxes };
    return boxes;
  }

  function monsMatching() {
    return (data?.mons || []).filter(matches);
  }

  function saveLayout() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const next = await window.playCall("play_save_pc", { p_layout: data.layout });
        if (next?.layout) data.layout = next.layout;
      } catch (error) {
        if (els.status) els.status.textContent = window.playRpcError(error);
      }
    }, 350);
  }

  function matches(mon) {
    const q = (els.search?.value || "").trim().toLowerCase();
    if (!q) return true;
    return [mon.name, mon.nickname, mon.gender, mon.variant, mon.otName, mon.metLocation, String(mon.dex)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  }

  function renderHead(mon, index) {
    if (!mon) {
      els.head.textContent = filtered.length ? "Select a Pokémon" : "No Pokémon in this box yet";
      return;
    }
    els.head.innerHTML = `${window.playEscapeAttr(displayName(mon))} <span>Lv. ${mon.level || 1}</span>`;
  }

  function renderTabs() {
    if (!els.tabs || renamingBox >= 0) return;
    const boxes = normalizeBoxes();
    els.tabs.innerHTML = boxes.map((box, i) => (
      `<button type="button" class="pc-tab${i === boxIndex ? " is-on" : ""}" data-box="${i}">${window.playEscapeAttr(box.name)}</button>`
    )).join("") + `<button type="button" class="pc-tab pc-tab-add" data-add-box="1">+</button>`;
  }

  function renderGrid() {
    const boxes = normalizeBoxes();
    const searching = Boolean((els.search?.value || "").trim());
    const ids = searching ? monsMatching().map((row) => String(row.id)) : (boxes[boxIndex]?.slots || []);
    const slots = searching ? ids : Array.from({ length: BOX_SLOTS }, (_, i) => ids[i] || null);
    filtered = slots.map(monById).filter(Boolean);
    if (!searching && !(data?.mons || []).length) {
      els.grid.innerHTML = `<p class="lgpe-empty">Catch Pokémon on Play to fill this box.</p>`;
      els.count.textContent = "0 / 30";
      renderHead(null, 0);
      renderDetail(null);
      renderTabs();
      return;
    }
    if (selectedId && !slots.some((id) => String(id) === selectedId)) {
      selectedId = String(filtered[0]?.id || "");
    }
    els.grid.innerHTML = slots.map((id, slot) => {
      const mon = monById(id);
      if (!mon) {
        return `<div class="lgpe-mon is-empty" data-slot="${slot}"></div>`;
      }
      const selected = String(mon.id) === selectedId;
      return `<button type="button" class="lgpe-mon${selected ? " is-selected" : ""}" draggable="true" data-id="${mon.id}" data-slot="${slot}" role="option" aria-selected="${selected}">
        ${teamSlot(mon) === 1 ? `<span class="lgpe-heart" aria-hidden="true">♥</span>` : ""}
        ${String(mon.variant || "").includes("shiny") ? `<span class="lgpe-spark">✦</span>` : ""}
        ${mon.isAlpha ? `<span class="lgpe-alpha-pip">α</span>` : ""}
        <span class="lgpe-sprite"><img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt=""></span>
      </button>`;
    }).join("");
    const index = filtered.findIndex((row) => String(row.id) === selectedId);
    renderHead(filtered[index] || filtered[0], Math.max(0, index));
    renderDetail(filtered[index] || filtered[0] || null);
    renderTabs();
    els.count.textContent = searching
      ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
      : `${filtered.length} / ${BOX_SLOTS}`;
    if (data?._layoutDirty) {
      data._layoutDirty = false;
      saveLayout();
    }
  }

  function statRows(mon) {
    const labels = [
      ["hp", "HP"], ["atk", "Attack"], ["def", "Defense"],
      ["spa", "Sp. Atk"], ["spd", "Sp. Def"], ["spe", "Speed"]
    ];
    return labels.map(([key, label]) => {
      const value = Number(mon.stats?.[key] || 0);
      const pct = Math.max(8, Math.min(100, Math.round((value / 250) * 100)));
      return `<div class="lgpe-stat"><span>${label}</span><i style="--pct:${pct}%"></i><strong>${value}</strong></div>`;
    }).join("");
  }

  function renderDetail(mon) {
    if (!mon) {
      els.detail.innerHTML = `
        <div class="lgpe-detail-inner is-empty">
          <p class="muted">Tap a Pokémon in the box to see its Let’s Go stats, OT, and nickname.</p>
        </div>`;
      return;
    }
    const shiny = String(mon.variant || "").includes("shiny");
    const types = window.playSpeciesTypes(mon.dex, mon.types);
    const ballName = window.playItemLabel(mon.ball) || "Poké Ball";
    const metLevel = mon.metLevel || mon.level || 1;
    const metPlace = mon.metLocation || "the wild";
    const otName = mon.otName || "Unknown Trainer";
    const otNo = mon.otNumber ? String(mon.otNumber).padStart(5, "0") : "-----";
    els.detail.innerHTML = `
      <div class="lgpe-detail-inner">
        <div class="lgpe-detail-hero">
          <img class="lgpe-hero-sprite" src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="">
          <div>
            <h2>${window.playEscapeAttr(displayName(mon))}</h2>
            <p class="lgpe-species">Lv. ${mon.level || 1}</p>
            <div class="type-row">
              ${window.playTypeChipHtml(types)}
              ${genderChip(mon.gender)}
              ${shiny ? `<span class="type-chip gender-chip is-shiny">Shiny</span>` : ""}
              ${mon.isAlpha ? `<span class="type-chip gender-chip is-alpha">Alpha</span>` : ""}
            </div>
          </div>
        </div>
        <div class="lgpe-caught">
          <img src="${window.playItemSprite(mon.ball)}" alt="">
          <div>
            <strong>Caught in ${window.playEscapeAttr(ballName)}</strong>
            <p>Met at Lv. ${metLevel} in ${window.playEscapeAttr(metPlace)}.</p>
          </div>
        </div>
        <p class="lgpe-ot"><span>OT</span> <strong>${window.playEscapeAttr(otName)}</strong> <em>No. ${otNo}</em></p>
        <div class="lgpe-stats">${statRows(mon)}</div>
        <div class="lgpe-detail-actions">
          <label class="field" for="nick-input">Nickname
            <input id="nick-input" type="text" maxlength="12" value="${window.playEscapeAttr(mon.nickname || "")}" placeholder="${window.playEscapeAttr(mon.name)}">
          </label>
          <div class="links">
            <button id="save-nick" type="button">Save nickname</button>
            <button id="list-trade" class="secondary" type="button">${mon.listed ? "Already listed" : "Put up for trade"}</button>
            <button id="send-oak" class="danger" type="button" ${mon.onTeam || mon.listed ? "disabled" : ""}>Transfer to Oak</button>
          </div>
        </div>
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

  function searching() {
    return Boolean((els.search?.value || "").trim());
  }

  function swapSlots(fromBox, fromSlot, toBox, toSlot) {
    const boxes = normalizeBoxes();
    if (!boxes[fromBox] || !boxes[toBox]) return;
    const a = boxes[fromBox].slots[fromSlot];
    const b = boxes[toBox].slots[toSlot];
    boxes[fromBox].slots[fromSlot] = b;
    boxes[toBox].slots[toSlot] = a;
    data.layout = { boxes };
    saveLayout();
    renderGrid();
  }

  function startRename(index) {
    const boxes = normalizeBoxes();
    const box = boxes[index];
    const tab = els.tabs?.querySelector(`[data-box="${index}"]`);
    if (!box || !tab || tab.querySelector("input")) return;
    renamingBox = index;
    boxIndex = index;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 12;
    input.value = box.name;
    input.setAttribute("aria-label", "Box name");
    tab.replaceChildren(input);
    input.focus();
    input.select();
    const finish = (save) => {
      if (renamingBox < 0) return;
      renamingBox = -1;
      if (save) {
        box.name = String(input.value).trim().slice(0, 12) || box.name;
        data.layout = { boxes };
        saveLayout();
      }
      renderGrid();
    };
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("dblclick", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  els.tabs?.addEventListener("click", (event) => {
    if (event.detail > 1 || event.target.closest("input")) return;
    if (event.target.closest("[data-add-box]")) {
      const boxes = normalizeBoxes();
      if (boxes.length >= 20) return;
      boxes.push({ name: `BOX ${boxes.length + 1}`, slots: Array(BOX_SLOTS).fill(null) });
      boxIndex = boxes.length - 1;
      data.layout = { boxes };
      saveLayout();
      renderGrid();
      return;
    }
    const tab = event.target.closest("[data-box]");
    if (!tab) return;
    const next = Number(tab.dataset.box) || 0;
    if (next === boxIndex) return;
    boxIndex = next;
    renderGrid();
  });
  els.tabs?.addEventListener("dblclick", (event) => {
    const tab = event.target.closest("[data-box]");
    if (!tab || event.target.closest("input")) return;
    event.preventDefault();
    startRename(Number(tab.dataset.box) || 0);
  });
  els.grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    selectedId = button.dataset.id;
    renderGrid();
  });
  els.grid.addEventListener("dragstart", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button || searching()) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", JSON.stringify({
      id: button.dataset.id,
      box: boxIndex,
      slot: Number(button.dataset.slot)
    }));
    event.dataTransfer.effectAllowed = "move";
    button.classList.add("is-dragging");
  });
  els.grid.addEventListener("dragend", (event) => {
    event.target.closest(".lgpe-mon")?.classList.remove("is-dragging");
  });
  els.grid.addEventListener("dragover", (event) => {
    if (searching()) return;
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  els.grid.addEventListener("drop", (event) => {
    if (searching()) return;
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    event.preventDefault();
    let payload = null;
    try { payload = JSON.parse(event.dataTransfer.getData("text/plain") || ""); } catch (_) {}
    if (!payload || payload.slot == null) return;
    swapSlots(Number(payload.box), Number(payload.slot), boxIndex, Number(slot.dataset.slot));
  });
  els.grid.addEventListener("keydown", (event) => {
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    moveSelection(move[0], move[1]);
  });
  els.search?.addEventListener("input", renderGrid);
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
