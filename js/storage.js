(() => {
  const supabase = window.playSupabase;
  // Older cached HTML may not include the new reader yet. Keep storage usable.
  const familiarityApi = window.PlaySpeciesFamiliarity;
  const familiarity = familiarityApi?.create(supabase) || {
    reset() {},
    get() { return { status: "unavailable" }; },
    load() { return Promise.resolve({ status: "unavailable" }); }
  };
  const familiarityPresentation = (state) => familiarityApi?.presentation(state) || {
    label: "Unavailable", note: "Refresh to try loading your Familiarity progress again."
  };
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("box-app"),
    head: document.getElementById("box-head"),
    grid: document.getElementById("box-grid"),
    count: document.getElementById("box-count"),
    usage: document.getElementById("box-usage-bar"),
    detail: document.getElementById("box-detail"),
    search: document.getElementById("box-search"),
    status: document.getElementById("box-status"),
    tabs: document.getElementById("box-tabs"),
    oakModal: document.getElementById("oak-modal"),
    oakSprite: document.getElementById("oak-sprite"),
    oakCopy: document.getElementById("oak-copy"),
    autoArrange: document.getElementById("pc-auto-arrange"),
    deleteBox: document.getElementById("pc-delete-box")
  };
  let data = null;
  let pcActor = null, pcEpoch = 0, pcLoadSerial = 0, pcStorageSerial = 0, oakNeedsInspection = false, oakPresentation = null;
  let trainerCard = null;
  let selectedId = "";
  let lastDetailId = "";
  let filtered = [];
  let boxIndex = 0;
  const BOX_SLOTS = 30;
  let saveTimer = 0, layoutRevision = 0, layoutConfirmedRevision = 0, layoutSavePending = null, layoutSaving = false, layoutNeedsInspection = false;
  let pendingOakId = "";
  let oakBusy = false;
  let renamingBox = -1;
  let dropTargetEl = null;
  let acquireTimer = 0;
  let boxOpBusy = false;
  let releaseBusy = false, releaseNeedsInspection = false, metadataBusy = false, metadataNeedsInspection = false;
  const pcDialogCancels = new Set();
  let emptyInspectOnce = false;

  window.playBindAccountNav({
    onSignOut() {
      pcLoadSerial++; setPcActor(null);
      familiarity.reset(null);
      data = null;
      trainerCard = null;
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to open your PC boxes.");
    }
  });

  function displayName(mon) {
    return mon.nickname || mon.name || "Pokémon";
  }

  function identityTitle(mon) {
    if (typeof window.playMonDisplayTitle === "function") {
      return window.playMonDisplayTitle(mon);
    }
    return mon.nickname || mon.name || "Pokémon";
  }

  function monSpriteUrl(mon) {
    if (typeof window.playPcSpriteUrl === "function") return window.playPcSpriteUrl(mon);
    return window.playSpriteUrl(mon.dex, mon.variant, mon.formId);
  }

  function pcStyle(mon, mode) {
    const pres = typeof window.resolvePcPresentation === "function"
      ? window.resolvePcPresentation(mon, mode)
      : { cssVars: { "--pc-sprite-scale": mode === "inspect" ? "0.72" : "0.64" }, url: monSpriteUrl(mon) };
    return {
      url: pres.url || monSpriteUrl(mon),
      style: Object.entries(pres.cssVars || {}).map(([k, v]) => `${k}:${v}`).join(";")
    };
  }

  function monAriaLabel(mon) {
    const bits = [displayName(mon), `Level ${mon.level || 1}`];
    if (mon.gender) bits.push(String(mon.gender).toLowerCase());
    if (String(mon.variant || "").includes("shiny") || mon.shiny) bits.push("shiny");
    if (mon.favorite) bits.push("favorite");
    if (mon.locked) bits.push("locked");
    if (mon.listed) bits.push("listed for trade");
    return bits.join(", ");
  }

  function teamSlot(mon) {
    const ids = data?.teamIds || [];
    const index = ids.findIndex((id) => String(id) === String(mon.id));
    return index >= 0 ? index + 1 : 0;
  }

  function monById(id) {
    return (data?.mons || []).find((row) => String(row.id) === String(id)) || null;
  }

  function reducedMotion() {
    if (window.playPerfReduced?.()) return true;
    const mode = window.playPerfMode?.();
    if (mode === "low" || mode === "reduced") return true;
    try {
      return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    } catch (_) {
      return false;
    }
  }

  function pulseAcquisition() {
    if (reducedMotion()) return;
    els.detail?.classList.remove("is-acquiring");
    els.grid?.querySelector(".pc-slot.is-selected")?.classList.remove("is-acquiring");
    void els.detail?.offsetWidth;
    els.detail?.classList.add("is-acquiring");
    els.grid?.querySelector(".pc-slot.is-selected")?.classList.add("is-acquiring");
    window.clearTimeout(acquireTimer);
    acquireTimer = window.setTimeout(() => {
      els.detail?.classList.remove("is-acquiring");
      els.grid?.querySelectorAll(".pc-slot.is-acquiring").forEach((el) => el.classList.remove("is-acquiring"));
    }, 180);
  }

  function pickAdjacentAfter(removedId) {
    const boxes = normalizeBoxes();
    const slots = boxes[boxIndex]?.slots || [];
    const idx = slots.findIndex((id) => id && String(id) === String(removedId));
    const isOther = (id) => id && String(id) !== String(removedId);
    if (idx >= 0) {
      for (let i = idx + 1; i < slots.length; i += 1) {
        if (isOther(slots[i]) && monById(slots[i])) return String(slots[i]);
      }
      for (let i = idx - 1; i >= 0; i -= 1) {
        if (isOther(slots[i]) && monById(slots[i])) return String(slots[i]);
      }
    }
    const fallback = (data?.mons || []).find((row) => String(row.id) !== String(removedId));
    return fallback ? String(fallback.id) : "";
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

  function layoutEditAllowed() {
    if (!pcActor || !data) return false;
    if (layoutNeedsInspection || boxOpBusy || metadataBusy || releaseBusy || oakBusy) {
      try { window.playToast?.({ kind: "warning", title: "Check your PC arrangement", body: layoutNeedsInspection ? "Reopen My PC to inspect the previous save before arranging more Pokémon." : "Wait for the current box action to finish." }); } catch (_) {}
      return false;
    }
    return true;
  }

  function layoutActionReady() {
    if (!pcActor || !data) return false;
    if (layoutNeedsInspection || boxOpBusy || layoutSaving || layoutSavePending || renamingBox >= 0) {
      try { window.playToast?.({ kind: "warning", title: "Finish your arrangement first", body: layoutNeedsInspection ? "Reopen My PC to inspect the previous save." : "Finish naming your box and wait for the arrangement to save before using this box action." }); } catch (_) {}
      return false;
    }
    return true;
  }

  function boxMutationReady() {
    return !boxOpBusy && !metadataBusy && !releaseBusy && !oakBusy && !metadataNeedsInspection && !releaseNeedsInspection && !oakNeedsInspection && layoutActionReady();
  }

  function validPcBoxSnapshot(value) {
    return validPcSnapshot(value) && Array.isArray(value.layout.boxes) && value.layout.boxes.length >= 1 && value.layout.boxes.length <= 20 && value.layout.boxes.every(box => box && typeof box.name === "string" && Array.isArray(box.slots) && box.slots.length === BOX_SLOTS && box.slots.every(id => id === null || typeof id === "string"));
  }

  function applyPcSnapshot(next, inspectLayout = false) {
    if (inspectLayout && layoutNeedsInspection && !layoutSaving) {
      clearTimeout(saveTimer); layoutSavePending = null; layoutNeedsInspection = false; layoutConfirmedRevision = layoutRevision;
    }
    const keepDraft = data?.layout && (layoutNeedsInspection || ((layoutSaving || layoutSavePending) && layoutRevision > layoutConfirmedRevision));
    data = keepDraft ? { ...next, layout: data.layout } : next;
  }

  function saveLayout(message = "") {
    if (!pcActor || !data?.layout || layoutNeedsInspection || boxOpBusy) return false;
    const layout = JSON.parse(JSON.stringify(data.layout));
    layoutSavePending = { actor: pcActor, epoch: pcEpoch, revision: ++layoutRevision, layout, message };
    pcStorageSerial++;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = 0; return drainLayout(); }, 350);
    return true;
  }

  async function drainLayout() {
    if (boxOpBusy || layoutSaving || layoutNeedsInspection || !layoutSavePending) return;
    const job = layoutSavePending; layoutSavePending = null; layoutSaving = true;
    const current = () => job.actor === pcActor && job.epoch === pcEpoch;
    let sent = false, confirmed = false;
    try {
      if (!current() || !await verifyPc(job.actor, job.epoch) || !current()) return;
      sent = true;
      const next = await window.playCall("play_save_pc", { p_layout: job.layout });
      if (!current() || !await verifyPc(job.actor, job.epoch) || !current()) return;
      if (!validPcSnapshot(next) || !Array.isArray(next.layout.boxes) || next.layout.boxes.length < 1 || next.layout.boxes.length > 20 || !next.layout.boxes.every(box => box && typeof box.name === "string" && Array.isArray(box.slots) && box.slots.length === BOX_SLOTS && box.slots.every(id => id === null || typeof id === "string"))) throw Error("Arrangement receipt could not be confirmed.");
      confirmed = true; layoutConfirmedRevision = job.revision;
      if (layoutRevision === job.revision && !layoutSavePending) {
        data.layout = next.layout;
        if (job.message) { try { window.playToast?.({ kind: "success", title: "Your PC updated", body: job.message }); } catch (_) {} }
      }
    } catch (error) {
      if (!current() || !await verifyPc(job.actor, job.epoch) || !current()) return;
      layoutNeedsInspection = true; clearTimeout(saveTimer);
      const rejected = !sent || ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code));
      const message = confirmed ? "Your arrangement was saved, but the display could not finish. Reopen My PC to inspect it before moving more Pokémon." : rejected ? "Your arrangement was not saved. Reopen My PC to inspect it before moving more Pokémon." : "Arrangement outcome is unconfirmed. Reopen My PC to inspect it before moving more Pokémon.";
      if (els.status) els.status.textContent = message;
      try { window.playToast?.({ kind: "warning", title: confirmed ? "Arrangement saved" : "Check your PC arrangement", body: message }); } catch (_) {}
    } finally {
      if (current()) {
        layoutSaving = false;
        if (layoutSavePending && !layoutNeedsInspection) { clearTimeout(saveTimer); saveTimer = 0; void drainLayout(); }
      }
    }
  }

  function matches(mon) {
    const q = (els.search?.value || "").trim().toLowerCase();
    if (!q) return true;
    const types = typeof window.playSpeciesTypes === "function"
      ? (window.playSpeciesTypes(mon.dex, mon.types) || [])
      : (mon.types || []);
    const typeText = Array.isArray(types) ? types.join(" ") : String(types || "");
    const shiny = String(mon.variant || "").includes("shiny") || mon.shiny;
    const gender = String(mon.gender || "").toLowerCase();
    const dex = String(mon.dex || "");
    const dexPad = dex.padStart(3, "0");
    const hay = [
      mon.name,
      mon.nickname,
      gender,
      mon.variant,
      mon.otName,
      mon.metLocation,
      dex,
      dexPad,
      "#" + dex,
      "#" + dexPad,
      typeText,
      shiny ? "shiny" : "",
      gender === "f" || gender === "female" ? "female" : "",
      gender === "m" || gender === "male" ? "male" : "",
      gender === "n" || gender === "unknown" || gender === "genderless" ? "genderless" : ""
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function updateStorageStatus(filled, capacity, boxName, searchingMode, matchCount) {
    const boxes = normalizeBoxes();
    const name = boxName || boxes[boxIndex]?.name || `BOX ${boxIndex + 1}`;
    if (els.head) els.head.textContent = name;
    if (els.count) {
      els.count.textContent = searchingMode
        ? `${matchCount} match${matchCount === 1 ? "" : "es"}`
        : `${filled} / ${capacity}`;
    }
    if (els.usage) {
      const pct = searchingMode ? 0 : Math.round((filled / Math.max(1, capacity)) * 100);
      els.usage.style.setProperty("--pc-fill", `${pct}%`);
      els.usage.parentElement?.classList.toggle("is-near-full", !searchingMode && pct >= 90);
    }
  }

  function renderTabs() {
    if (!els.tabs || renamingBox >= 0) return;
    const boxes = normalizeBoxes();
    els.tabs.innerHTML = boxes.map((box, i) => {
      const filled = (box.slots || []).filter(Boolean).length;
      return `<button type="button" class="pc-tab${i === boxIndex ? " is-on" : ""}" data-box="${i}" role="tab" aria-selected="${i === boxIndex}" data-capacity="${filled}/${BOX_SLOTS}" title="${window.playEscapeAttr(`${box.name} · ${filled} / ${BOX_SLOTS}`)}">${window.playEscapeAttr(box.name)}</button>`;
    }).join("") + `<button type="button" class="pc-tab pc-tab-add" data-add-box="1" aria-label="Add box">+</button>`;
  }

  function slotIndicators(mon) {
    const bits = [];
    if (mon.favorite) bits.push(`<span class="pc-pip is-fav" title="Favorite" aria-hidden="true">★</span>`);
    if (mon.locked) bits.push(`<span class="pc-pip is-lock" title="Locked" aria-hidden="true">🔒</span>`);
    if (String(mon.variant || "").includes("shiny") || mon.shiny) {
      bits.push(`<span class="pc-pip is-shiny" title="Shiny" aria-label="Shiny"><span aria-hidden="true">★</span></span>`);
    }
    if (mon.listed) {
      bits.push(`<span class="pc-pip is-trade" title="Listed on GTS" aria-label="Listed on GTS"><span aria-hidden="true">⇄</span></span>`);
    }
    if (teamSlot(mon) === 1) bits.push(`<span class="pc-pip is-team" title="On team" aria-hidden="true">♥</span>`);
    if (mon.isAlpha) bits.push(`<span class="pc-pip is-alpha" title="Alpha" aria-hidden="true">α</span>`);
    return bits.join("");
  }

  function renderGrid() {
    const clearInspect = emptyInspectOnce;
    emptyInspectOnce = false;
    const boxes = normalizeBoxes();
    const searchingMode = Boolean((els.search?.value || "").trim());
    const ids = searchingMode ? monsMatching().map((row) => String(row.id)) : (boxes[boxIndex]?.slots || []);
    const slots = searchingMode ? ids : Array.from({ length: BOX_SLOTS }, (_, i) => ids[i] || null);
    filtered = slots.map(monById).filter(Boolean);

    if (!searchingMode && !(data?.mons || []).length) {
      els.grid.innerHTML = `<div class="pc-empty-state">
        <div class="pc-empty-mark" aria-hidden="true"></div>
        <p class="pc-empty-title">No Pokémon yet</p>
        <p class="muted">Join a wild encounter on Play to catch your first Pokémon.</p>
        <p><a class="button" href="./">Play</a></p>
      </div>`;
      updateStorageStatus(0, BOX_SLOTS, boxes[boxIndex]?.name, false, 0);
      renderDetail(null);
      renderTabs();
      return;
    }

    if (!searchingMode && filtered.length === 0) {
      els.grid.innerHTML = Array.from({ length: BOX_SLOTS }, (_, slot) => (
        `<div class="pc-slot is-empty" data-slot="${slot}" aria-hidden="true"></div>`
      )).join("") + `<div class="pc-empty-overlay">
        <div class="pc-empty-mark" aria-hidden="true"></div>
        <p class="pc-empty-title">This Box is Empty</p>
        <p class="muted">Caught Pokémon can be moved here from your other Boxes.</p>
      </div>`;
      updateStorageStatus(0, BOX_SLOTS, boxes[boxIndex]?.name, false, 0);
      selectedId = "";
      renderDetail(null);
      renderTabs();
      if (data?._layoutDirty && !boxOpBusy) {
        data._layoutDirty = false;
        saveLayout();
      }
      return;
    }

    if (clearInspect) {
      selectedId = "";
    } else if (selectedId && !slots.some((id) => String(id) === selectedId)) {
      selectedId = String(filtered[0]?.id || "");
    }

    els.grid.innerHTML = slots.map((id, slot) => {
      const mon = monById(id);
      if (!mon) {
        return `<div class="pc-slot is-empty" data-slot="${slot}" aria-hidden="true"></div>`;
      }
      const selected = String(mon.id) === selectedId;
      const art = pcStyle(mon, "slot");
      const isShiny = String(mon.variant || "").includes("shiny") || mon.shiny;
      const tip = `${displayName(mon)} · Lv. ${mon.level || 1}${isShiny ? " · Shiny" : ""}${mon.listed ? " · Listed on GTS" : ""}`;
      return `<button type="button" class="pc-slot${selected ? " is-selected" : ""}${isShiny ? " is-shiny" : ""}${mon.listed ? " is-listed" : ""}" draggable="true" data-id="${mon.id}" data-slot="${slot}" role="option" aria-selected="${selected}" aria-label="${window.playEscapeAttr(monAriaLabel(mon))}" title="${window.playEscapeAttr(tip)}">
        <span class="pc-slot-pips">${slotIndicators(mon)}</span>
        <span class="pc-slot-art" style="${art.style}"><img src="${art.url}" alt="" decoding="async" draggable="false"></span>
      </button>`;
    }).join("");

    const index = filtered.findIndex((row) => String(row.id) === selectedId);
    const active = clearInspect ? null : (filtered[index] || filtered[0] || null);
    updateStorageStatus(
      searchingMode ? filtered.length : filtered.length,
      BOX_SLOTS,
      boxes[boxIndex]?.name,
      searchingMode,
      filtered.length
    );
    renderDetail(active);
    renderTabs();
    if (data?._layoutDirty && !boxOpBusy) {
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
      const raw = mon.stats?.[key];
      const value = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
      if (!Number.isFinite(value)) return `<div class="pc-stat"><span>${label}</span><i style="--pct:0%"></i><strong title="Stat unavailable" aria-label="${label} unavailable">—</strong></div>`;
      const pct = Math.max(8, Math.min(100, Math.round((value / 250) * 100)));
      return `<div class="pc-stat"><span>${label}</span><i style="--pct:${pct}%"></i><strong>${value}</strong></div>`;
    }).join("");
  }

  function renderDetail(mon) {
    if (!mon) {
      lastDetailId = "";
      els.detail.innerHTML = `
        <div class="pc-inspect-empty">
          <div class="pc-empty-mark is-soft" aria-hidden="true"></div>
          <p class="muted">Select a Pokémon in the box to inspect it.</p>
        </div>`;
      return;
    }
    const changed = String(mon.id) !== String(lastDetailId);
    lastDetailId = String(mon.id);
    const ballName = window.playItemLabel(mon.ball) || "Poké Ball";
    const metLevel = mon.metLevel || mon.level || 1;
    const metPlace = mon.metLocation || "the wild";
    const otName = mon.otName || "Unknown Trainer";
    const otNo = mon.otNumber ? String(mon.otNumber).padStart(5, "0") : "-----";
    const art = pcStyle(mon, "inspect");
    const familiarityCopy = familiarityPresentation(familiarity.get(Number(mon.dex)));
    const tradeDisabled = mon.listed || mon.locked || mon.favorite || mon.tradable === false;
    const oakDisabled = mon.onTeam || mon.listed || mon.locked || mon.favorite || oakBusy || oakNeedsInspection || releaseNeedsInspection || metadataBusy || metadataNeedsInspection;
    const releaseDisabled = mon.onTeam || mon.listed || mon.locked || mon.favorite || releaseBusy || releaseNeedsInspection || metadataBusy || metadataNeedsInspection;
    const badges = typeof window.playMonIdentityBadgesHtml === "function"
      ? window.playMonIdentityBadgesHtml(mon)
      : `<div class="type-row">${window.playTypeChipHtml(window.playSpeciesTypes(mon.dex, mon.types))}</div>`;

    els.detail.innerHTML = `
      <div class="pc-inspect-inner">
        <header class="pc-inspect-hero">
          <div class="pc-inspect-art" style="${art.style}">
            <span class="pc-scan-corner is-tl" aria-hidden="true"></span>
            <span class="pc-scan-corner is-tr" aria-hidden="true"></span>
            <span class="pc-scan-corner is-bl" aria-hidden="true"></span>
            <span class="pc-scan-corner is-br" aria-hidden="true"></span>
            <span class="pc-inspect-platform" aria-hidden="true"></span>
            <img src="${art.url}" alt="" decoding="async">
          </div>
          <div class="pc-inspect-id">
            <p class="pc-inspect-kicker">Selected Pokémon</p>
            ${String(mon.nickname || "").trim() && mon.name && String(mon.nickname).trim() !== mon.name
              ? `<h2 class="pc-inspect-title">${window.playEscapeAttr(identityTitle(mon))}<span class="pc-pick-name-sep" aria-hidden="true"> · </span><span class="pc-inspect-species">${window.playEscapeAttr(mon.name)}</span></h2>`
              : `<h2 class="pc-inspect-title">${window.playEscapeAttr(identityTitle(mon))}</h2>`}
            <p class="pc-inspect-level">Lv. ${mon.level || 1}</p>
            ${badges}
          </div>
        </header>

        <section class="pc-module pc-capture" aria-label="Catch history">
          <h3 class="pc-module-label">Catch History</h3>
          <div class="pc-capture-row">
            <img src="${window.playItemSprite(mon.ball)}" alt="">
            <div>
              <strong>${window.playEscapeAttr(ballName)}</strong>
              <p>${window.playEscapeAttr(metPlace)} · Met at Lv. ${metLevel}</p>
            </div>
          </div>
          <p class="pc-ot"><span>OT</span> <strong>${window.playEscapeAttr(otName)}</strong> <em>No. ${otNo}</em></p>
          ${mon.tradeEvoReady ? `<p class="pc-trade-evo"><a href="./evolve.html">Evolve ${window.playEscapeAttr(displayName(mon))} now</a> — or wait. No Candy or Linking Cord required.</p>` : ""}
        </section>

        <section class="pc-module pc-stats-mod" aria-label="Stats">
          <h3 class="pc-module-label">Stats</h3>
          <div class="pc-stats">${statRows(mon)}</div>
        </section>

        <section class="pc-module pc-familiarity" aria-label="Species Familiarity">
          <h3 class="pc-module-label">Species Familiarity</h3>
          <p class="pc-familiarity-value" role="status" aria-live="polite">${window.playEscapeAttr(familiarityCopy.label)}</p>
          <p class="muted pc-familiarity-note">${window.playEscapeAttr(familiarityCopy.note)}</p>
        </section>

        <section class="pc-module pc-manage" aria-label="Management">
          <h3 class="pc-module-label">Nickname</h3>
          <div class="pc-nick-row">
            <input id="nick-input" type="text" maxlength="12" value="${window.playEscapeAttr(mon.nickname || "")}" placeholder="${window.playEscapeAttr(mon.name)}" aria-label="Nickname">
            <button id="save-nick" type="button" ${metadataBusy || metadataNeedsInspection ? "disabled" : ""}>Save</button>
          </div>

          <div class="pc-action-group" aria-label="Common management">
            <button id="toggle-fav" ${metadataBusy || metadataNeedsInspection ? "disabled" : ""} class="pc-action${mon.favorite ? " is-on" : ""}" type="button">${mon.favorite ? "★ Favorited" : "☆ Favorite"}</button>
            <button id="toggle-lock" ${metadataBusy || metadataNeedsInspection ? "disabled" : ""} class="pc-action${mon.locked ? " is-on" : ""}" type="button">${mon.locked ? "🔒 Locked" : "🔒 Lock"}</button>
            <button id="move-mon" class="pc-action pc-action-move" type="button">Move</button>
          </div>

          <div class="pc-action-group" aria-label="Trade">
            <button id="list-trade" class="pc-action pc-action-trade" type="button" ${tradeDisabled ? "disabled" : ""}>${mon.listed ? "Already listed" : "Put up for trade"}</button>
          </div>

          <div class="pc-action-group" aria-label="Professor Oak">
            <button id="send-oak" class="pc-action pc-action-oak" type="button" ${oakDisabled ? "disabled" : ""}>Transfer to Oak</button>
          </div>

          <div class="pc-action-group is-danger" aria-label="Destructive">
            <button id="release-mon" class="pc-action pc-action-danger" type="button" ${releaseDisabled ? "disabled" : ""}>Release Pokémon</button>
          </div>
        </section>
      </div>`;

    familiarity.load(Number(mon.dex)).then((state) => {
      if (state.status === "stale" || String(lastDetailId) !== String(mon.id) || !data) return;
      const copy = familiarityPresentation(state);
      const value = els.detail.querySelector(".pc-familiarity-value");
      const note = els.detail.querySelector(".pc-familiarity-note");
      if (value) value.textContent = copy.label;
      if (note) note.textContent = copy.note;
    });

    document.getElementById("save-nick")?.addEventListener("click", () => act("play_set_nickname", {
      p_catch_id: mon.id,
      p_name: document.getElementById("nick-input")?.value || ""
    }));
    document.getElementById("toggle-fav")?.addEventListener("click", () => act("play_set_mon_flags", { p_catch: mon.id, p_favorite: !mon.favorite }));
    document.getElementById("toggle-lock")?.addEventListener("click", () => act("play_set_mon_flags", { p_catch: mon.id, p_locked: !mon.locked }));
    document.getElementById("move-mon")?.addEventListener("click", () => openMoveDialog(mon));
    document.getElementById("send-oak")?.addEventListener("click", () => openOakModal(mon));
    document.getElementById("list-trade")?.addEventListener("click", () => {
      window.location.href = `./trade.html?list=${encodeURIComponent(mon.id)}`;
    });
    document.getElementById("release-mon")?.addEventListener("click", () => releaseMon(mon));

    if (changed) pulseAcquisition();

    if (window.matchMedia("(max-width: 900px)").matches) {
      els.detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function syncReleaseButton() {
    const button = document.getElementById("release-mon"), mon = monById(selectedId);
    if (button) button.disabled = releaseBusy || releaseNeedsInspection || metadataBusy || metadataNeedsInspection || !mon || Boolean(mon.onTeam || mon.listed || mon.locked || mon.favorite);
  }

  async function releaseMon(source) {
    if (!pcActor || releaseBusy || releaseNeedsInspection || metadataBusy || metadataNeedsInspection || !layoutActionReady()) return;
    const live = monById(source?.id);
    if (!live) return;
    const mon = { ...live }, actor = pcActor, epoch = pcEpoch, adjacent = pickAdjacentAfter(live.id);
    const current = () => actor === pcActor && epoch === pcEpoch;
    let confirmed = false, sent = false;
    releaseBusy = true; syncReleaseButton();
    try {
      if (!await verifyPc(actor, epoch) || !current()) return;
      const isShiny = String(mon.variant || "").includes("shiny") || mon.shiny;
      const choice = await confirmRelease(mon);
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (choice === "oak") {
        openOakModal(mon);
        return;
      }
      if (choice !== "release") return;
      let confirmKey = "";
      if (isShiny) {
        const typed = await openPcDialog({
          title: "Release Shiny?",
          danger: true,
          body: "This is a SHINY Pokémon. Type SHINY to permanently release it.",
          extraHtml: `<input class="pc-confirm-input" id="pc-shiny-yes" type="text" autocomplete="off" spellcheck="false" aria-label="Type SHINY to confirm">`,
          actionsHtml: `
            <button class="pc-btn-keep" value="cancel" type="submit">Keep Pokémon</button>
            <button class="pc-btn-release" value="confirm" type="submit" disabled id="pc-shiny-confirm">Release Pokémon</button>`,
          focusSelector: "#pc-shiny-yes",
          onMount(dialog) {
            const input = dialog.querySelector("#pc-shiny-yes");
            const btn = dialog.querySelector("#pc-shiny-confirm");
            const sync = () => {
              const ok = String(input?.value || "").trim().toUpperCase() === "SHINY";
              if (btn) btn.disabled = !ok;
            };
            input?.addEventListener("input", sync);
            sync();
          },
          validate(value, dialog) {
            if (value !== "confirm") return true;
            return String(dialog.querySelector("#pc-shiny-yes")?.value || "").trim().toUpperCase() === "SHINY";
          }
        });
        if (typed !== "confirm") return;
        confirmKey = "SHINY";
      }
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (!layoutActionReady()) return;
      sent = true; releaseNeedsInspection = true; pcStorageSerial++;
      const result = await window.playCall("play_release", { p_catch: mon.id, p_confirm: confirmKey });
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (result?.ok !== true) throw Error("Release result could not be confirmed.");
      confirmed = true; pcStorageSerial++;
      try { window.playToast?.({ kind: "success", title: "Released", body: typeof result.message === "string" ? result.message : "Pokémon released." }); } catch (_) {}
      const read = ++pcStorageSerial;
      const next = await window.playCall("play_storage");
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (read !== pcStorageSerial || !validPcSnapshot(next) || next.mons.some(row => String(row.id) === String(mon.id))) throw Error("Released Pokémon display could not refresh.");
      applyPcSnapshot(next);
      if (selectedId === String(mon.id)) selectedId = adjacent && monById(adjacent) ? adjacent : "";
      else if (!monById(selectedId)) selectedId = "";
      lastDetailId = ""; render(); releaseNeedsInspection = false;
      if (els.status) els.status.textContent = "";
    } catch (error) {
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (confirmed) {
        if (els.status) els.status.textContent = "Pokémon released, but the display could not refresh. Reopen My PC to inspect your collection.";
      } else if (!sent || ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code))) {
        releaseNeedsInspection = false;
        if (typeof window.playPresentError === "function") window.playPresentError(error, "Could not release that Pokémon.");
        else if (els.status) els.status.textContent = window.playRpcError(error);
      } else if (els.status) els.status.textContent = "Release outcome is unconfirmed. Reopen My PC to inspect this Pokémon before releasing anything else.";
    } finally { if (current()) { releaseBusy = false; syncReleaseButton(); } }
  }

  function openOakModal(mon) {
    if (!els.oakModal || !mon || oakBusy || oakNeedsInspection || releaseNeedsInspection || metadataBusy || metadataNeedsInspection || !layoutActionReady()) return;
    pendingOakId = String(mon.id);
    const model = window.playOakTransfer?.confirmModel
      ? window.playOakTransfer.confirmModel([mon], data?.mons || [])
      : {
        rewardHint: "You'll get Evolution Candy for this Evolution Line.",
        leaveHint: "It leaves your collection. This can't be undone."
      };
    if (els.oakSprite) {
      const src = window.playOakTransfer?.spriteUrl
        ? window.playOakTransfer.spriteUrl(mon)
        : monSpriteUrl(mon);
      els.oakSprite.src = src;
      els.oakSprite.alt = displayName(mon);
    }
    if (els.oakCopy) {
      const shiny = String(mon.variant || "").includes("shiny") || mon.shiny;
      els.oakCopy.innerHTML = `
        <p><strong>${shiny ? "✨ " : ""}${window.playEscapeAttr(identityTitle(mon))}</strong> · Lv. ${mon.level || 1}</p>
        <p>${window.playEscapeAttr(model.rewardHint)}</p>
        <p class="muted">${window.playEscapeAttr(model.leaveHint)}</p>
        ${model.lastCopyWarning ? `<p class="pc-dialog-warn">${window.playEscapeAttr(model.lastCopyWarning)}</p>` : ""}`;
    }
    if (typeof els.oakModal.showModal === "function") els.oakModal.showModal();
    else els.oakModal.setAttribute("open", "");
  }

  async function transferToOak(id) {
    if (!pcActor || !id || oakBusy || oakNeedsInspection || releaseNeedsInspection || metadataBusy || metadataNeedsInspection || !layoutActionReady()) return;
    const source = monById(id);
    if (!source) { els.status.textContent = "That Pokémon is no longer in your PC."; return; }
    const mon = { ...source }, actor = pcActor, epoch = pcEpoch;
    const current = () => actor === pcActor && epoch === pcEpoch;
    const trainer = trainerCard ? { ...trainerCard } : null;
    const families = (data?.families || []).map(family => ({ ...family }));
    const sprite = trainer?.trainerSprite || window._playTrainerSprite || "";
    const nextSelect = pickAdjacentAfter(id);
    let confirmed = false, sent = false, animationFailed = false;
    oakBusy = true;
    els.status.textContent = "Sending to Professor Oak…";
    try {
      if (!await verifyPc(actor, epoch) || !current()) return;
      sent = true; oakNeedsInspection = true; pcStorageSerial++;
      const result = await window.playCall("play_transfer_oak", { p_catch_id: id });
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (!validPcSnapshot(result) || result.mons.some(row => String(row.id) === String(id)) || !Number.isSafeInteger(result.candyGranted) || result.candyGranted < 0 || !Number.isSafeInteger(result.familyId) || result.familyId < 1 || !Number.isSafeInteger(result.candyBaseDex) || result.candyBaseDex < 1) throw Error("Transfer result could not be confirmed.");
      confirmed = true; pcStorageSerial++; applyPcSnapshot(result);
      if (selectedId === String(id)) selectedId = nextSelect && monById(nextSelect) ? nextSelect : "";
      else if (!monById(selectedId)) selectedId = "";
      lastDetailId = "";
      const success = { ok: true, id, mon, candyGranted: result.candyGranted, familyId: result.familyId, candyBaseDex: result.candyBaseDex, candyName: result.candyName || "", message: result.message || "" };
      if (window.playOakTransfer?.runSequence) {
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        oakPresentation = controller;
        try { await window.playOakTransfer.runSequence({ results: [success], families, trainerSprite: sprite, trainer, signal: controller?.signal }); }
        catch (_) { animationFailed = true; }
        finally { if (oakPresentation === controller) oakPresentation = null; }
        if (!current() || !await verifyPc(actor, epoch)) return;
      }
      render(); oakNeedsInspection = false;
      if (els.status) els.status.textContent = animationFailed ? "Pokémon transferred. The animation could not finish; your collection is updated." : "";
      if (animationFailed) { try { window.playToast?.({ kind: "warning", title: "Pokémon transferred", body: "The animation could not finish; your transfer is complete." }); } catch (_) {} }
    } catch (error) {
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (confirmed) {
        if (els.status) els.status.textContent = "Pokémon transferred, but the display could not finish. Reopen My PC to refresh your collection.";
      } else if (!sent || ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code))) {
        oakNeedsInspection = false;
        if (els.status) els.status.textContent = window.playHumanRpcError ? window.playHumanRpcError(error, "This Pokémon could not be sent.") : window.playRpcError(error);
      } else if (els.status) els.status.textContent = "Transfer outcome is unconfirmed. Reopen My PC to inspect your collection before sending more Pokémon.";
    } finally { if (current()) oakBusy = false; }
  }



  function monArtUrl(mon) {
    try {
      return pcStyle(mon, "inspect").url || monSpriteUrl(mon);
    } catch (_) {
      return monSpriteUrl(mon);
    }
  }

  function oakEligible(mon) {
    if (!mon) return false;
    return !(mon.onTeam || mon.listed || mon.locked || mon.favorite || oakBusy || oakNeedsInspection || releaseNeedsInspection || metadataBusy || metadataNeedsInspection);
  }

  function openPcDialog(opts) {
    const d = document;
    return new Promise((resolve) => {
      const dialog = d.createElement("dialog");
      const danger = Boolean(opts?.danger);
      dialog.setAttribute("aria-label", opts?.title || "Confirm");
      dialog.className = `play-modal play-modal-confirm pc-dialog${danger ? " is-danger" : ""}`;
      dialog.innerHTML = `<form class="play-modal-card" method="dialog">
        <header class="play-modal-head">
          <h3>${window.playEscapeAttr(opts?.title || "Confirm")}</h3>
        </header>
        ${opts?.monHtml || ""}
        ${opts?.bodyHtml || (opts?.body ? `<p class="pc-dialog-body">${window.playEscapeAttr(opts.body)}</p>` : "")}
        ${opts?.warnHtml || ""}
        ${opts?.extraHtml || ""}
        <div class="pc-dialog-actions">${opts?.actionsHtml || ""}</div>
      </form>`;
      d.body.append(dialog);
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        pcDialogCancels.delete(cancel);
        try { dialog.close?.(); } catch (_) {}
        dialog.remove();
        resolve(value);
      };
      const cancel = () => finish("cancel");
      pcDialogCancels.add(cancel);
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish("cancel");
      });
      dialog.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = event.submitter?.value || "cancel";
        if (opts?.validate && !opts.validate(value, dialog)) return;
        finish(value);
      });
      if (opts?.onMount) opts.onMount(dialog);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      const focus = dialog.querySelector(opts?.focusSelector || "button[value='cancel'], button.pc-btn-keep, input");
      focus?.focus?.();
    });
  }

  async function confirmRelease(mon) {
    const releaseName = displayName(mon);
    const canOak = oakEligible(mon);
    const art = monArtUrl(mon);
    const model = window.playOakTransfer?.confirmModel
      ? window.playOakTransfer.confirmModel([mon], data?.mons || [])
      : { rewardHint: "You'll get Evolution Candy for this Evolution Line if eligible." };
    const monHtml = `<div class="pc-dialog-mon">
      <img src="${window.playEscapeAttr(art)}" alt="">
      <div>
        <strong>${window.playEscapeAttr(identityTitle(mon))}</strong>
        <p class="muted">Lv. ${mon.level || 1}</p>
      </div>
    </div>`;
    const warn = `<div class="pc-dialog-warn">Releasing permanently removes this Pokémon from your PC.${model.lastCopyWarning ? `<p>${window.playEscapeAttr(model.lastCopyWarning)}</p>` : ""}</div>`;
    const oakNote = canOak
      ? `<p class="pc-dialog-body">Before releasing it, you may instead transfer it to Professor Oak for Evolution Candy if it is eligible.<br><span class="muted">${window.playEscapeAttr(model.rewardHint || "")}</span></p>`
      : `<p class="pc-dialog-body muted">Transfer to Oak is unavailable for this Pokémon (favorite, lock, team, or trade listing).</p>`;
    const actions = `
      <button class="pc-btn-keep" value="keep" type="submit">Keep Pokémon</button>
      <button class="pc-btn-oak" value="oak" type="submit" ${canOak ? "" : "disabled"}>${canOak ? "Transfer to Oak" : "Oak unavailable"}</button>
      <button class="pc-btn-release" value="release" type="submit">Release Pokémon</button>`;
    return openPcDialog({
      title: `Release ${releaseName}?`,
      danger: true,
      monHtml,
      bodyHtml: oakNote,
      warnHtml: warn,
      actionsHtml: actions,
      focusSelector: "button.pc-btn-keep"
    });
  }

  function presentBoxError(error, fallback) {
    if (typeof window.playPresentError === "function") {
      window.playPresentError(error, fallback);
      return;
    }
    if (els.status) els.status.textContent = window.playRpcError?.(error, fallback) || fallback;
  }

  async function runAutoArrange() {
    if (!boxMutationReady()) return;
    if (searching()) {
      window.playToast?.({ kind: "warning", title: "Clear search first", body: "Auto-arrange works on the current box view." });
      return;
    }
    normalizeBoxes();
    if (data._layoutDirty) { data._layoutDirty = false; saveLayout(); return; }
    const actor = pcActor, epoch = pcEpoch, targetBox = boxIndex, reviewedLayout = JSON.stringify(data.layout);
    const current = () => actor === pcActor && epoch === pcEpoch;
    let sent = false, confirmed = false;
    boxOpBusy = true;
    try {
      if (!await verifyPc(actor, epoch) || !current()) return;
      if (JSON.stringify(data?.layout) !== reviewedLayout) throw Error("Your arrangement changed. Try auto-arrange again.");
      sent = true; pcStorageSerial++;
      const result = await window.playCall("play_pc_auto_arrange", { p_box: targetBox });
      if (!current() || !await verifyPc(actor, epoch) || !current()) return;
      if (!validPcBoxSnapshot(result) || result.arranged !== true || result.box !== targetBox || !Number.isSafeInteger(result.count) || result.count !== result.layout.boxes[targetBox]?.slots.filter(Boolean).length) throw Error("Box arrangement could not be confirmed.");
      confirmed = true; pcStorageSerial++; applyPcSnapshot(result);
      if (els.status) els.status.textContent = "";
      render();
      window.playToast?.({ kind: "success", title: "Box arranged", body: result.message || "Pokémon packed to the top-left." });
    } catch (error) {
      if (!current() || !await verifyPc(actor, epoch) || !current()) return;
      if (sent && !confirmed) layoutNeedsInspection = true;
      const message = confirmed ? "Box arranged, but the display could not refresh. Reopen My PC." : sent ? "Arrangement could not be confirmed. Reopen My PC before another box action." : "Could not arrange this box. Review it again.";
      try { presentBoxError(new Error(message), message); } catch (_) { if (els.status) els.status.textContent = message; }
    } finally {
      if (current()) {
        boxOpBusy = false;
        if (!layoutNeedsInspection && data?._layoutDirty) { data._layoutDirty = false; saveLayout(); }
      }
    }
  }

  async function runDeleteBox() {
    if (!boxMutationReady()) return;
    const actor = pcActor, epoch = pcEpoch, targetBox = boxIndex;
    const current = () => actor === pcActor && epoch === pcEpoch;
    const boxes = normalizeBoxes();
    if (data._layoutDirty) { data._layoutDirty = false; saveLayout(); return; }
    const reviewedLayout = JSON.stringify(data.layout);
    const box = boxes[targetBox];
    if (!box) return;
    if (boxes.length <= 1) {
      if (typeof window.playToast === "function") {
        window.playToast({ kind: "warning", title: "Keep one box", body: "You must keep at least one PC box." });
      }
      return;
    }
    boxOpBusy = true;
    let sent = false, confirmed = false;
    try {
      const ready = async () => {
        if (!current() || !await verifyPc(actor, epoch) || !current()) return false;
        if (JSON.stringify(data?.layout) !== reviewedLayout) throw new Error("Your PC arrangement changed. Review the box again.");
        return true;
      };
      if (!await ready()) return;
      let preflight;
      try {
        preflight = await window.playCall("play_pc_delete_box_preflight", { p_box: targetBox });
      } catch (error) {
        throw error;
      }
      if (!await ready()) return;
      if (preflight?.ok !== true) throw new Error("The box check could not be confirmed.");
      if (preflight.canDelete && (preflight.boxIndex !== targetBox || preflight.boxCount !== boxes.length || !Number.isSafeInteger(preflight.releaseCount) || preflight.releaseCount < 0)) throw new Error("The box check changed. Review it again.");
      if (!preflight?.canDelete) {
        if (typeof window.playToast === "function") {
          window.playToast({ kind: "warning", title: "Cannot delete", body: preflight?.message || "You must keep at least one PC box." });
        }
        return;
      }
      const occupants = Number(preflight.occupants || 0);
      const free = Number(preflight.freeElsewhere || 0);
      const releaseCount = Number(preflight.releaseCount || 0);
      const name = preflight.boxName || box.name || `BOX ${targetBox + 1}`;

      if (releaseCount <= 0) {
        const ok = await openPcDialog({
          title: "Delete this Box?",
          body: occupants
            ? `All Pokémon in this box will be moved to available spaces in your other PC storage boxes.`
            : "This box is empty and will be removed.",
          warnHtml: occupants
            ? `<div class="pc-dialog-warn">${occupants} Pokémon will be relocated. None will be released.</div>`
            : "",
          actionsHtml: `
            <button class="pc-btn-keep" value="cancel" type="submit">Cancel</button>
            <button class="pc-btn-destroy" value="delete" type="submit">Delete box</button>`,
          focusSelector: "button.pc-btn-keep"
        });
        if (ok !== "delete") return;
        try {
          if (!await ready()) return;
          sent = true; pcStorageSerial++;
          const result = await window.playCall("play_pc_delete_box", {
            p_box: targetBox,
            p_confirm_release: false,
            p_confirm_text: "",
            p_expected_release: 0
          });
          if (!current() || !await verifyPc(actor, epoch) || !current()) return;
          if (!validPcSnapshot(result) || result.deletedBox !== targetBox || !Number.isSafeInteger(result.released) || result.released < 0 || result.released > releaseCount || result.layout?.boxes?.length !== boxes.length - 1) throw new Error("Box deletion could not be confirmed. Reopen My PC before continuing.");
          confirmed = true; pcStorageSerial++;
          applyPcSnapshot(result);
          if (boxIndex > targetBox) boxIndex--;
          boxIndex = Math.min(boxIndex, Math.max(0, result.layout.boxes.length - 1));
          if (typeof window.playToast === "function") {
            window.playToast({ kind: "success", title: "Box deleted", body: result?.message || "Box deleted." });
          }
          render();
        } catch (error) {
          throw error;
        }
        return;
      }

      const first = await openPcDialog({
        title: "Not Enough PC Storage",
        danger: true,
        bodyHtml: `<p class="pc-dialog-body">This box contains <strong>${occupants}</strong> Pokémon, but your other Boxes only have <strong>${free}</strong> available spaces.</p>
          <p class="pc-dialog-body"><strong>${releaseCount}</strong> Pokémon cannot be moved.</p>`,
        warnHtml: `<div class="pc-dialog-warn">If you continue, Pokémon that cannot be moved will be PERMANENTLY RELEASED. This cannot be undone.</div>`,
        actionsHtml: `
          <button class="pc-btn-keep" value="cancel" type="submit">Cancel</button>
          <button class="pc-btn-destroy" value="continue" type="submit">Continue Anyway</button>`,
        focusSelector: "button.pc-btn-keep"
      });
      if (first !== "continue") return;

      const second = await openPcDialog({
        title: "Permanent release warning",
        danger: true,
        bodyHtml: `<p class="pc-dialog-body">Deleting <strong>${window.playEscapeAttr(name)}</strong> will permanently release <strong>${releaseCount}</strong> Pokémon.</p>
          <p class="pc-dialog-body">To continue, type: <strong>YES</strong></p>`,
        extraHtml: `<input class="pc-confirm-input" id="pc-delete-yes" type="text" autocomplete="off" spellcheck="false" aria-label="Type YES to confirm">`,
        actionsHtml: `
          <button class="pc-btn-keep" value="cancel" type="submit">Cancel</button>
          <button class="pc-btn-destroy" value="confirm" type="submit" disabled id="pc-delete-confirm">Confirm deletion</button>`,
        focusSelector: "#pc-delete-yes",
        onMount(dialog) {
          const input = dialog.querySelector("#pc-delete-yes");
          const btn = dialog.querySelector("#pc-delete-confirm");
          const sync = () => {
            const ok = String(input?.value || "").trim().toUpperCase() === "YES";
            if (btn) btn.disabled = !ok;
          };
          input?.addEventListener("input", sync);
          sync();
        },
        validate(value, dialog) {
          if (value !== "confirm") return true;
          const typed = String(dialog.querySelector("#pc-delete-yes")?.value || "").trim().toUpperCase();
          return typed === "YES";
        }
      });
      if (second !== "confirm") return;

      try {
        if (!await ready()) return;
        sent = true; pcStorageSerial++;
        const result = await window.playCall("play_pc_delete_box", {
          p_box: targetBox,
          p_confirm_release: true,
          p_confirm_text: "YES",
          p_expected_release: releaseCount
        });
        if (!current() || !await verifyPc(actor, epoch) || !current()) return;
        if (!validPcSnapshot(result) || result.deletedBox !== targetBox || !Number.isSafeInteger(result.released) || result.released < 0 || result.released > releaseCount || result.layout?.boxes?.length !== boxes.length - 1) throw new Error("Box deletion could not be confirmed. Reopen My PC before continuing.");
        confirmed = true; pcStorageSerial++;
        applyPcSnapshot(result);
        if (boxIndex > targetBox) boxIndex--;
        boxIndex = Math.min(boxIndex, Math.max(0, result.layout.boxes.length - 1));
        if (typeof window.playToast === "function") {
          window.playToast({ kind: "success", title: "Box deleted", body: result?.message || "Box deleted." });
        }
        render();
      } catch (error) {
        throw error;
      }
    } catch (error) {
      if (!current()) return;
      if (sent && !confirmed) layoutNeedsInspection = true;
      const message = confirmed ? "Box deleted, but the display could not refresh. Reopen My PC." : sent ? "Deletion could not be confirmed. Reopen My PC before another box action." : "Could not check this box.";
      try { presentBoxError(new Error(message), message); } catch (_) { if (els.status) els.status.textContent = message; }
    } finally {
      if (current()) {
        boxOpBusy = false;
        if (!layoutNeedsInspection && data?._layoutDirty) { data._layoutDirty = false; saveLayout(); }
      }
    }
  }


  function render() {
    renderGrid();
  }

  function syncMetadataButtons() {
    for (const id of ["save-nick", "toggle-fav", "toggle-lock"]) { const button = document.getElementById(id); if (button) button.disabled = metadataBusy || metadataNeedsInspection; }
    syncReleaseButton();
    const oak = document.getElementById("send-oak"); if (oak) oak.disabled = !oakEligible(monById(selectedId));
  }

  async function act(name, args) {
    if (!pcActor || boxOpBusy || layoutNeedsInspection || metadataBusy || metadataNeedsInspection) return;
    const nickSave = name === "play_set_nickname";
    if (!nickSave && name !== "play_set_mon_flags") return;
    const request = { ...args }, id = String(nickSave ? request.p_catch_id : request.p_catch);
    if (!monById(id) || id !== String(selectedId)) { if (els.status) els.status.textContent = "Select this Pokémon again before editing it."; return; }
    const flags = ["p_favorite", "p_locked"].filter(key => Object.prototype.hasOwnProperty.call(request, key));
    if (nickSave ? typeof request.p_name !== "string" : flags.length !== 1 || typeof request[flags[0]] !== "boolean") return;
    const actor = pcActor, epoch = pcEpoch;
    const current = () => actor === pcActor && epoch === pcEpoch;
    const title = nickSave ? "Nickname saved" : typeof request.p_favorite === "boolean" ? "Favorite updated" : "Lock updated";
    let confirmed = false, sent = false;
    metadataBusy = true; syncMetadataButtons();
    if (!nickSave && els.status) els.status.textContent = "Updating Pokémon…";
    try {
      if (!await verifyPc(actor, epoch) || !current()) return;
      sent = true; metadataNeedsInspection = true; pcStorageSerial++;
      const result = await window.playCall(name, request);
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (result?.ok !== true || (nickSave && !validPcSnapshot(result))) throw Error("Pokémon update could not be confirmed.");
      confirmed = true;
      const read = ++pcStorageSerial;
      const next = nickSave ? result : await window.playCall("play_storage");
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (read !== pcStorageSerial || !validPcSnapshot(next) || !next.mons.some(mon => String(mon.id) === id)) throw Error("Updated Pokémon display could not refresh.");
      const editingId = selectedId, input = document.getElementById("nick-input"), draft = input?.value;
      const preserveDraft = draft !== undefined && (!nickSave || editingId !== id || draft !== request.p_name);
      applyPcSnapshot(next); render();
      if (preserveDraft && selectedId === editingId) { const field = document.getElementById("nick-input"); if (field) field.value = draft; }
      if (nickSave && selectedId === id && !preserveDraft) {
        const row = document.querySelector(".pc-nick-row"); row?.classList.add("is-saved");
        setTimeout(() => { if (current()) row?.classList.remove("is-saved"); }, 1600);
      }
      metadataNeedsInspection = false;
      if (els.status) els.status.textContent = "";
      try { window.playToast?.({ kind: "success", title, body: nickSave && preserveDraft && editingId === id ? "Your earlier name was saved. Your newer edit is still unsaved." : typeof result.message === "string" ? result.message : "Pokémon updated." }); } catch (_) {}
    } catch (error) {
      if (!current() || !await verifyPc(actor, epoch)) return;
      if (confirmed) {
        if (els.status) els.status.textContent = "Pokémon updated, but the display could not refresh. Reopen My PC to inspect it.";
      } else if (!sent || ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code))) {
        metadataNeedsInspection = false;
        if (els.status) els.status.textContent = window.playRpcError(error);
        if (nickSave && window.playPresentError) window.playPresentError(error, "Could not save that nickname.");
      } else if (els.status) els.status.textContent = "Pokémon update outcome is unconfirmed. Reopen My PC to inspect it before editing or removing Pokémon.";
    } finally { if (current()) { metadataBusy = false; syncMetadataButtons(); } }
  }

  function setPcActor(actor) {
    if (actor === pcActor) return;
    pcActor = actor; pcEpoch++; pcStorageSerial++;
    for (const cancel of [...pcDialogCancels]) cancel();
    boxOpBusy = false; releaseBusy = false; releaseNeedsInspection = false; metadataBusy = false; metadataNeedsInspection = false;
    clearTimeout(saveTimer); clearTimeout(acquireTimer);
    layoutRevision = 0; layoutConfirmedRevision = 0; layoutSavePending = null; layoutSaving = false; layoutNeedsInspection = false;
    oakPresentation?.abort(); oakPresentation = null; oakNeedsInspection = false; oakBusy = false;
    data = null; trainerCard = null; selectedId = ""; lastDetailId = ""; filtered = []; pendingOakId = ""; boxIndex = 0; renamingBox = -1;
    familiarity.reset(actor);
    window._playTrainerSprite = "";
    if (els.grid) els.grid.innerHTML = "";
    if (els.detail) els.detail.innerHTML = "";
    if (els.status) els.status.textContent = "";
    if (els.app) els.app.hidden = true;
    if (els.oakModal?.open) els.oakModal.close?.();
  }

  function validPcSnapshot(value) {
    return value?.ok === true && Array.isArray(value.mons) && value.mons.every(mon => mon && typeof mon.id === "string" && mon.id) && value.layout && typeof value.layout === "object" && !Array.isArray(value.layout);
  }

  async function verifyPc(actor, epoch) {
    let result; try { result = await supabase.auth.getSession(); } catch (_) { result = null; }
    if (actor !== pcActor || epoch !== pcEpoch) return false;
    if (!result || result.error || (result.data?.session?.user?.id || null) !== actor) {
      setPcActor(null); window.playRestoreGate(els.gate, "Your account changed. Reopen My PC."); return false;
    }
    return true;
  }

  async function load() {
    const serial = ++pcLoadSerial;
    let current = () => serial === pcLoadSerial;
    try {
      const auth = await supabase.auth.getSession();
      if (!current()) return false;
      if (auth.error) throw auth.error;
      const session = auth.data?.session;
      setPcActor(session?.user?.id || null);
      const actor = pcActor, epoch = pcEpoch;
      current = () => serial === pcLoadSerial && actor === pcActor && epoch === pcEpoch;
      if (!session) { window.playRestoreGate(els.gate, "Sign in to open your PC boxes."); window.playSetAccountNav(null); return false; }
      if (!await verifyPc(actor, epoch) || !current()) return false;
      window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
      const { data: profile, error } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", actor).maybeSingle();
      if (!current()) return false;
      if (error) throw error;
      let snapshot = null;
      try { snapshot = await window.playCall("play_state"); } catch (_) {}
      if (!current() || !await verifyPc(actor, epoch)) return false;
      const read = ++pcStorageSerial;
      const next = await window.playCall("play_storage");
      if (!current() || read !== pcStorageSerial || !await verifyPc(actor, epoch)) return false;
      if (boxOpBusy) return false;
      if (!validPcSnapshot(next)) throw Error("Your PC storage could not be verified.");
      applyPcSnapshot(next, true); trainerCard = snapshot?.trainer || null;
      window._playTrainerSprite = trainerCard?.trainerSprite || "";
      window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: trainerCard });
      if (!oakBusy) oakNeedsInspection = false;
      if (!releaseBusy) releaseNeedsInspection = false;
      if (!metadataBusy) metadataNeedsInspection = false;
      els.gate.hidden = true; els.app.hidden = false; render(); return true;
    } catch (error) {
      if (!current()) return false;
      data = null; trainerCard = null;
      els.gate.hidden = false; els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Could not open storage."); return false;
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
    els.grid.querySelector(".is-selected")?.focus({ preventScroll: true });
    els.grid.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
  }

  function searching() {
    return Boolean((els.search?.value || "").trim());
  }

  function validPcDrag(payload) {
    if (!layoutEditAllowed()) return false;
    const boxes = normalizeBoxes();
    const valid = payload?.actor === pcActor && payload.epoch === pcEpoch && typeof payload.id === "string" && Boolean(monById(payload.id)) && Number.isSafeInteger(payload.box) && Number.isSafeInteger(payload.slot) && payload.slot >= 0 && payload.slot < BOX_SLOTS && String(boxes[payload.box]?.slots[payload.slot] || "") === payload.id;
    if (!valid) { try { window.playToast?.({ kind: "warning", title: "Your PC changed", body: "Pick up the Pokémon again before moving it." }); } catch (_) {} }
    return valid;
  }

  function swapSlots(fromBox, fromSlot, toBox, toSlot) {
    if (!layoutEditAllowed() || ![fromBox, fromSlot, toBox, toSlot].every(Number.isSafeInteger) || fromSlot < 0 || fromSlot >= BOX_SLOTS || toSlot < 0 || toSlot >= BOX_SLOTS) return;
    const boxes = normalizeBoxes();
    if (!boxes[fromBox] || !boxes[toBox]) return;
    const a = boxes[fromBox].slots[fromSlot];
    const b = boxes[toBox].slots[toSlot];
    boxes[fromBox].slots[fromSlot] = b;
    boxes[toBox].slots[toSlot] = a;
    data.layout = { boxes };
    saveLayout("Pokémon arrangement saved.");
    renderGrid();
  }

  function boxFillCount(box) {
    return (box?.slots || []).filter(Boolean).length;
  }

  function boxToastName(box, index) {
    const raw = String(box?.name || `Box ${index + 1}`).trim();
    const numbered = raw.match(/^BOX\s+(\d+)$/i);
    return numbered ? `Box ${numbered[1]}` : raw;
  }

  async function moveMonToBox(catchId, toBoxIndex, opts = {}) {
    if (!boxMutationReady()) return null;
    const sourceBox = boxIndex;
    const boxes = normalizeBoxes();
    if (data._layoutDirty) { data._layoutDirty = false; saveLayout(); return null; }
    const mon = monById(catchId);
    if (!mon || !Number.isSafeInteger(toBoxIndex) || !boxes[toBoxIndex] || !boxes.some(box => box.slots.includes(catchId))) throw new Error("Choose that Pokémon and its destination again.");
    if (boxFillCount(boxes[toBoxIndex]) >= BOX_SLOTS && !boxes[toBoxIndex].slots.includes(catchId)) throw new Error("That storage slot is no longer available.");
    const actor = pcActor, epoch = pcEpoch, reviewedLayout = JSON.stringify(data.layout), keepId = selectedId, who = displayName(mon), destName = boxToastName(boxes[toBoxIndex], toBoxIndex);
    const current = () => actor === pcActor && epoch === pcEpoch;
    let sent = false, confirmed = false;
    boxOpBusy = true;
    try {
      if (!await verifyPc(actor, epoch) || !current()) return null;
      if (JSON.stringify(data?.layout) !== reviewedLayout) throw Error("Your arrangement changed. Choose the destination again.");
      sent = true; pcStorageSerial++;
      const next = await window.playCall("play_move_pc_mon", { p_catch_id: catchId, p_to_box: toBoxIndex });
      if (!current() || !await verifyPc(actor, epoch) || !current()) return null;
      if (!validPcBoxSnapshot(next) || typeof next.moved !== "boolean" || !next.mons.some(row => row.id === catchId) || !next.layout.boxes[toBoxIndex]?.slots.includes(catchId)) throw Error("Pokémon move could not be confirmed.");
      confirmed = true; pcStorageSerial++; applyPcSnapshot(next);
      // Preserve a tab or specimen selected while the request was pending.
      if (boxIndex === sourceBox && next.moved && selectedId === keepId && selectedId === catchId) {
        selectedId = ""; lastDetailId = ""; emptyInspectOnce = true;
      }
      render();
      if (els.status) els.status.textContent = "";
      if (next.moved) window.playToast?.({ kind: "success", title: "Moved", body: `${who} moved to ${destName}.` });
      return next;
    } catch (error) {
      if (!current() || !await verifyPc(actor, epoch) || !current()) return null;
      if (sent && !confirmed) layoutNeedsInspection = true;
      throw new Error(confirmed ? "Pokémon moved, but the display could not refresh. Reopen My PC." : sent ? "Move could not be confirmed. Reopen My PC before moving more Pokémon." : "Your arrangement changed. Choose the destination again.");
    } finally {
      if (current()) {
        boxOpBusy = false;
        if (!layoutNeedsInspection && data?._layoutDirty) { data._layoutDirty = false; saveLayout(); }
      }
    }
  }

  function openMoveDialog(mon) {
    if (!mon?.id || !boxMutationReady()) return;
    const boxes = normalizeBoxes();
    const actor = pcActor, epoch = pcEpoch, reviewedLayout = JSON.stringify(data.layout), catchId = String(mon.id);
    const current = () => actor === pcActor && epoch === pcEpoch;
    const name = displayName(mon);
    let currentBox = -1;
    boxes.forEach((box, i) => {
      if ((box.slots || []).some((id) => id && String(id) === String(mon.id))) currentBox = i;
    });
    const existing = document.getElementById("pc-move-dialog");
    if (existing?.open) existing.close();
    existing?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "pc-move-dialog";
    dialog.setAttribute("aria-labelledby", "pc-move-title");
    dialog.className = "modal pc-move-modal";
    dialog.innerHTML = `
      <form method="dialog" class="modal-card pc-move-card">
        <button type="submit" class="pc-move-close" value="cancel" aria-label="Close">×</button>
        <h3 id="pc-move-title">Move ${window.playEscapeAttr(name)}</h3>
        <p class="muted">Choose a destination box.</p>
        <div class="pc-move-list" role="listbox" aria-label="Destination boxes">
          ${boxes.map((box, i) => {
            const filled = boxFillCount(box);
            const full = filled >= BOX_SLOTS && i !== currentBox;
            const current = i === currentBox;
            return `<button type="button" class="pc-move-option${current ? " is-current" : ""}${full ? " is-full" : ""}" data-box="${i}" ${full || current ? "disabled" : ""} role="option" aria-selected="${current}">
              <strong>${window.playEscapeAttr(box.name)}</strong>
              <span>${filled} / ${BOX_SLOTS}${current ? " · current" : full ? " · full" : ""}</span>
            </button>`;
          }).join("")}
        </div>
        <div class="links">
          <button class="secondary" value="cancel">Cancel</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    const close = () => {
      pcDialogCancels.delete(close);
      if (dialog.open) dialog.close();
      dialog.remove();
    };
    pcDialogCancels.add(close);
    dialog.addEventListener("close", close, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    dialog.querySelectorAll(".pc-move-option:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!current()) { close(); return; }
        if (JSON.stringify(data?.layout) !== reviewedLayout || !monById(catchId)) {
          close(); presentBoxError(new Error("Your arrangement changed. Choose the Pokémon and destination again."), "Choose the destination again."); return;
        }
        const dest = Number(btn.dataset.box);
        btn.disabled = true;
        try {
          const result = await moveMonToBox(catchId, dest);
          if (result || !current()) close();
          else btn.disabled = false;
        } catch (error) {
          if (!current()) return;
          btn.disabled = false;
          presentBoxError(error, "That Pokémon could not be moved.");
        }
      });
    });
    dialog.showModal();
    dialog.querySelector(".pc-move-option:not([disabled])")?.focus();
  }

  function clearDropTarget() {
    dropTargetEl?.classList.remove("is-drop-target", "is-drop-ok", "is-drop-bad");
    dropTargetEl = null;
  }

  function startRename(index) {
    if (!layoutEditAllowed()) return;
    const actor = pcActor, epoch = pcEpoch;
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
      if (actor !== pcActor || epoch !== pcEpoch || renamingBox < 0) return;
      renamingBox = -1;
      if (save && layoutEditAllowed()) {
        const latest = normalizeBoxes(), target = latest[index];
        if (!target) return;
        target.name = String(input.value).trim().slice(0, 12) || target.name;
        data.layout = { boxes: latest };
        saveLayout("Box name saved.");
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

  els.tabs?.addEventListener("dragover", (event) => {
    if (searching()) return;
    const tab = event.target.closest("[data-box]");
    if (!tab) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const dest = Number(tab.dataset.box);
    const boxes = normalizeBoxes();
    const filled = boxFillCount(boxes[dest]);
    const full = filled >= BOX_SLOTS;
    tab.classList.toggle("is-drop-ok", !full);
    tab.classList.toggle("is-drop-bad", full);
    if (dropTargetEl !== tab) {
      clearDropTarget();
      dropTargetEl = tab;
    }
  });
  els.tabs?.addEventListener("dragleave", (event) => {
    const tab = event.target.closest("[data-box]");
    if (tab && tab === dropTargetEl && !tab.contains(event.relatedTarget)) {
      tab.classList.remove("is-drop-ok", "is-drop-bad");
      clearDropTarget();
    }
  });
  els.tabs?.addEventListener("drop", async (event) => {
    const tab = event.target.closest("[data-box]");
    if (!tab || searching()) return;
    event.preventDefault();
    tab.classList.remove("is-drop-ok", "is-drop-bad");
    clearDropTarget();
    let payload = null;
    try { payload = JSON.parse(event.dataTransfer.getData("text/plain") || ""); } catch (_) {}
    if (!validPcDrag(payload)) return;
    const catchId = payload.id;
    const dest = Number(tab.dataset.box);
    if (!catchId || !Number.isFinite(dest)) return;
    try {
      await moveMonToBox(catchId, dest, { stayOnBox: boxIndex });
    } catch (error) {
      presentBoxError(error, "That Pokémon could not be moved.");
    }
  });
  els.tabs?.addEventListener("click", (event) => {
    if (event.detail > 1 || event.target.closest("input")) return;
    if (event.target.closest("[data-add-box]")) {
      if (!layoutEditAllowed()) return;
      const boxes = normalizeBoxes();
      if (boxes.length >= 20) return;
      boxes.push({ name: `BOX ${boxes.length + 1}`, slots: Array(BOX_SLOTS).fill(null) });
      boxIndex = boxes.length - 1;
      data.layout = { boxes };
      saveLayout("New Pokémon box added.");
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
    if (!button || searching() || !layoutEditAllowed()) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", JSON.stringify({
      id: button.dataset.id,
      actor: pcActor, epoch: pcEpoch,
      box: boxIndex,
      slot: Number(button.dataset.slot)
    }));
    event.dataTransfer.effectAllowed = "move";
    button.classList.add("is-dragging");
  });
  els.grid.addEventListener("dragend", (event) => {
    event.target.closest(".pc-slot")?.classList.remove("is-dragging");
    clearDropTarget();
  });
  els.grid.addEventListener("dragover", (event) => {
    if (searching()) return;
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropTargetEl !== slot) {
      clearDropTarget();
      dropTargetEl = slot;
      slot.classList.add("is-drop-target");
    }
  });
  els.grid.addEventListener("dragleave", (event) => {
    const slot = event.target.closest("[data-slot]");
    if (slot && slot === dropTargetEl && !slot.contains(event.relatedTarget)) {
      clearDropTarget();
    }
  });
  els.grid.addEventListener("drop", (event) => {
    if (searching()) return;
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    event.preventDefault();
    clearDropTarget();
    let payload = null;
    try { payload = JSON.parse(event.dataTransfer.getData("text/plain") || ""); } catch (_) {}
    if (!validPcDrag(payload)) return;
    swapSlots(Number(payload.box), Number(payload.slot), boxIndex, Number(slot.dataset.slot));
  });
  els.grid.addEventListener("keydown", (event) => {
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    moveSelection(move[0], move[1]);
  });
  els.autoArrange?.addEventListener("click", () => runAutoArrange());
  els.deleteBox?.addEventListener("click", () => runDeleteBox());
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
    transferToOak(id);
  });
  supabase.auth.onAuthStateChange((event, session) => { if (window.playAuthNoise(event, session)) return; load(); });
  load();
})();
