(() => {
  const supabase = window.playSupabase;
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
    oakCopy: document.getElementById("oak-copy")
  };
  let data = null;
  let trainerCard = null;
  let selectedId = "";
  let lastDetailId = "";
  let filtered = [];
  let boxIndex = 0;
  const BOX_SLOTS = 30;
  let saveTimer = 0;
  let pendingOakId = "";
  let oakBusy = false;
  let renamingBox = -1;
  let dropTargetEl = null;
  let acquireTimer = 0;

  window.playBindAccountNav({
    onSignOut() {
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
      return window.playMonDisplayTitle({
        ...mon,
        nickname: mon.nickname || mon.name || "Pokémon"
      });
    }
    const base = mon.nickname || mon.name || "Pokémon";
    const g = String(mon.gender || "");
    if (g === "Male") return `${base} ♂`;
    if (g === "Female") return `${base} ♀`;
    return base;
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
    els.tabs.innerHTML = boxes.map((box, i) => (
      `<button type="button" class="pc-tab${i === boxIndex ? " is-on" : ""}" data-box="${i}" role="tab" aria-selected="${i === boxIndex}">${window.playEscapeAttr(box.name)}</button>`
    )).join("") + `<button type="button" class="pc-tab pc-tab-add" data-add-box="1" aria-label="Add box">+</button>`;
  }

  function slotIndicators(mon) {
    const bits = [];
    if (mon.favorite) bits.push(`<span class="pc-pip is-fav" title="Favorite" aria-hidden="true">★</span>`);
    if (mon.locked) bits.push(`<span class="pc-pip is-lock" title="Locked" aria-hidden="true">🔒</span>`);
    if (String(mon.variant || "").includes("shiny") || mon.shiny) {
      bits.push(`<span class="pc-pip is-shiny" title="Shiny" aria-hidden="true">✦</span>`);
    }
    if (mon.listed) bits.push(`<span class="pc-pip is-trade" title="Listed for trade" aria-hidden="true">⇄</span>`);
    if (teamSlot(mon) === 1) bits.push(`<span class="pc-pip is-team" title="On team" aria-hidden="true">♥</span>`);
    if (mon.isAlpha) bits.push(`<span class="pc-pip is-alpha" title="Alpha" aria-hidden="true">α</span>`);
    return bits.join("");
  }

  function renderGrid() {
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
      if (data?._layoutDirty) {
        data._layoutDirty = false;
        saveLayout();
      }
      return;
    }

    if (selectedId && !slots.some((id) => String(id) === selectedId)) {
      selectedId = String(filtered[0]?.id || "");
    }

    els.grid.innerHTML = slots.map((id, slot) => {
      const mon = monById(id);
      if (!mon) {
        return `<div class="pc-slot is-empty" data-slot="${slot}" aria-hidden="true"></div>`;
      }
      const selected = String(mon.id) === selectedId;
      const art = pcStyle(mon, "slot");
      const tip = `${displayName(mon)} · Lv. ${mon.level || 1}${mon.gender === "Female" ? " · ♀" : mon.gender === "Male" ? " · ♂" : ""}${String(mon.variant || "").includes("shiny") || mon.shiny ? " · Shiny" : ""}`;
      return `<button type="button" class="pc-slot${selected ? " is-selected" : ""}" draggable="true" data-id="${mon.id}" data-slot="${slot}" role="option" aria-selected="${selected}" aria-label="${window.playEscapeAttr(monAriaLabel(mon))}" title="${window.playEscapeAttr(tip)}">
        <span class="pc-slot-pips">${slotIndicators(mon)}</span>
        <span class="pc-slot-art" style="${art.style}"><img src="${art.url}" alt="" decoding="async" draggable="false"></span>
      </button>`;
    }).join("");

    const index = filtered.findIndex((row) => String(row.id) === selectedId);
    const active = filtered[index] || filtered[0] || null;
    updateStorageStatus(
      searchingMode ? filtered.length : filtered.length,
      BOX_SLOTS,
      boxes[boxIndex]?.name,
      searchingMode,
      filtered.length
    );
    renderDetail(active);
    renderTabs();
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
    const tradeDisabled = mon.listed || mon.locked || mon.favorite || mon.tradable === false;
    const oakDisabled = mon.onTeam || mon.listed || mon.locked || mon.favorite || oakBusy;
    const releaseDisabled = mon.onTeam || mon.listed || mon.locked || mon.favorite;
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
            <h2>${window.playEscapeAttr(identityTitle(mon))}</h2>
            <p class="pc-inspect-level">Lv. ${mon.level || 1}</p>
            ${badges}
          </div>
        </header>

        <section class="pc-module pc-capture" aria-label="Capture record">
          <h3 class="pc-module-label">Capture Record</h3>
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

        <section class="pc-module pc-manage" aria-label="Management">
          <h3 class="pc-module-label">Nickname</h3>
          <div class="pc-nick-row">
            <input id="nick-input" type="text" maxlength="12" value="${window.playEscapeAttr(mon.nickname || "")}" placeholder="${window.playEscapeAttr(mon.name)}" aria-label="Nickname">
            <button id="save-nick" type="button">Save</button>
          </div>

          <div class="pc-action-group" aria-label="Common management">
            <button id="toggle-fav" class="pc-action${mon.favorite ? " is-on" : ""}" type="button">${mon.favorite ? "★ Favorited" : "☆ Favorite"}</button>
            <button id="toggle-lock" class="pc-action${mon.locked ? " is-on" : ""}" type="button">${mon.locked ? "🔒 Locked" : "🔒 Lock"}</button>
          </div>

          <div class="pc-action-group" aria-label="Trade">
            <button id="list-trade" class="pc-action pc-action-trade" type="button" ${tradeDisabled ? "disabled" : ""}>${mon.listed ? "Already listed" : "Put Up for Trade"}</button>
          </div>

          <div class="pc-action-group" aria-label="Professor Oak">
            <button id="send-oak" class="pc-action pc-action-oak" type="button" ${oakDisabled ? "disabled" : ""}>Transfer to Oak</button>
          </div>

          <div class="pc-action-group is-danger" aria-label="Destructive">
            <button id="release-mon" class="pc-action pc-action-danger" type="button" ${releaseDisabled ? "disabled" : ""}>Release Duplicate</button>
          </div>
        </section>
      </div>`;

    document.getElementById("save-nick")?.addEventListener("click", () => act("play_set_nickname", {
      p_catch_id: mon.id,
      p_name: document.getElementById("nick-input")?.value || ""
    }));
    document.getElementById("toggle-fav")?.addEventListener("click", async () => {
      try {
        await window.playCall("play_set_mon_flags", { p_catch: mon.id, p_favorite: !mon.favorite });
        data = await window.playCall("play_storage");
        render();
      } catch (error) {
        els.status.textContent = window.playRpcError(error);
      }
    });
    document.getElementById("toggle-lock")?.addEventListener("click", async () => {
      try {
        await window.playCall("play_set_mon_flags", { p_catch: mon.id, p_locked: !mon.locked });
        data = await window.playCall("play_storage");
        render();
      } catch (error) {
        els.status.textContent = window.playRpcError(error);
      }
    });
    document.getElementById("send-oak")?.addEventListener("click", () => openOakModal(mon));
    document.getElementById("list-trade")?.addEventListener("click", () => {
      window.location.href = `./trade.html?list=${encodeURIComponent(mon.id)}`;
    });
    document.getElementById("release-mon")?.addEventListener("click", async () => {
      const isShiny = String(mon.variant || "").includes("shiny") || mon.shiny;
      const copies = (data?.mons || []).filter((row) => Number(row.dex) === Number(mon.dex)).length;
      if (copies <= 1) {
        els.status.textContent = `This is your only currently owned ${mon.name}. Keep it for your Living Dex.`;
        return;
      }
      const releaseName = displayName(mon);
      const ok = typeof window.playPresentConfirm === "function"
        ? await window.playPresentConfirm({
          title: "Release this Pokémon?",
          body: `You are about to permanently release ${releaseName}. This cannot be undone. The Pokémon leaves your PC.`,
          confirmLabel: "Release",
          cancelLabel: "Keep",
          danger: true
        })
        : window.confirm(`You are about to release ${releaseName}. This cannot be undone.`);
      if (!ok) return;
      let confirmKey = "";
      if (isShiny) {
        const typed = window.prompt("This is a SHINY Pokémon. Type SHINY to release it.");
        if (typed !== "SHINY") return;
        confirmKey = "SHINY";
      }
      try {
        const result = await window.playCall("play_release", { p_catch: mon.id, p_confirm: confirmKey });
        els.status.textContent = result.message || "Released.";
        data = await window.playCall("play_storage");
        selectedId = pickAdjacentAfter(mon.id);
        lastDetailId = "";
        render();
      } catch (error) {
        els.status.textContent = window.playRpcError(error);
      }
    });

    if (changed) pulseAcquisition();

    if (window.matchMedia("(max-width: 900px)").matches) {
      els.detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function openOakModal(mon) {
    if (!els.oakModal || !mon || oakBusy) return;
    pendingOakId = String(mon.id);
    const model = window.playOakTransfer?.confirmModel
      ? window.playOakTransfer.confirmModel([mon])
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
        <p class="muted">${window.playEscapeAttr(model.leaveHint)}</p>`;
    }
    if (typeof els.oakModal.showModal === "function") els.oakModal.showModal();
    else els.oakModal.setAttribute("open", "");
  }

  async function transferToOak(id) {
    if (!id || oakBusy) return;
    const mon = monById(id);
    if (!mon) {
      els.status.textContent = "That Pokémon is no longer in your PC.";
      return;
    }
    oakBusy = true;
    els.status.textContent = "Sending to Professor Oak…";
    const nextSelect = pickAdjacentAfter(id);
    try {
      const result = await window.playCall("play_transfer_oak", { p_catch_id: id });
      const success = {
        ok: true,
        id,
        mon,
        candyGranted: Number(result?.candyGranted || 0),
        familyId: Number(result?.familyId || 0),
        candyBaseDex: Number(result?.candyBaseDex || 0),
        candyName: result?.candyName || "",
        message: result?.message || ""
      };
      if (els.status) els.status.textContent = "";
      // Animation only after authoritative success — never invents candy or deletes.
      if (window.playOakTransfer?.runSequence) {
        const sprite = trainerCard?.trainerSprite || window._playTrainerSprite || "";
        if (sprite) window._playTrainerSprite = sprite;
        await window.playOakTransfer.runSequence({
          results: [success],
          families: result?.families || data?.families || [],
          trainerSprite: sprite,
          trainer: trainerCard || result?.trainer || null
        });
      }
      data = result;
      selectedId = nextSelect && monById(nextSelect) ? nextSelect : "";
      lastDetailId = "";
      // Payoff lives in the Oak Game Moment — do not echo candy text under the PC.
      if (els.status) els.status.textContent = "";
      render();
    } catch (error) {
      els.status.textContent = window.playHumanRpcError
        ? window.playHumanRpcError(error, "Could not send that Pokémon to Oak.")
        : window.playRpcError(error);
      // No success animation / no fake removal on failure.
    } finally {
      oakBusy = false;
    }
  }

  function render() {
    renderGrid();
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
      trainerCard = null;
      window.playRestoreGate(els.gate, "Sign in to open your PC boxes.");
      window.playSetAccountNav(null);
      return;
    }
    window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let snapshot = null;
    try {
      snapshot = await window.playCall("play_state");
    } catch (_) {}
    trainerCard = snapshot?.trainer || null;
    if (trainerCard?.trainerSprite) window._playTrainerSprite = trainerCard.trainerSprite;
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: trainerCard });
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
    els.grid.querySelector(".is-selected")?.focus({ preventScroll: true });
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

  function clearDropTarget() {
    dropTargetEl?.classList.remove("is-drop-target");
    dropTargetEl = null;
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
    transferToOak(id);
  });
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
