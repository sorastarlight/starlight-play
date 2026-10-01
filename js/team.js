(() => {
  function ensureModals() {
    if (document.getElementById("play-picker")) return document.getElementById("play-picker");
    const dialog = document.createElement("dialog");
    dialog.id = "play-picker";
    dialog.className = "play-modal";
    dialog.innerHTML = `
      <form class="play-modal-card" method="dialog">
        <header class="play-modal-head">
          <h3 id="play-picker-title">Choose</h3>
          <button type="submit" value="close" class="secondary">Close</button>
        </header>
        <div id="play-picker-body"></div>
      </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function openPicker(title, html, extraClass) {
    const dialog = ensureModals();
    dialog.className = extraClass ? `play-modal ${extraClass}` : "play-modal";
    document.getElementById("play-picker-title").textContent = title;
    document.getElementById("play-picker-body").innerHTML = html;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return dialog;
  }

  function monMapFrom(mons) {
    const map = new Map();
    (mons || []).forEach((row) => {
      if (row?.id) map.set(String(row.id), row);
    });
    return map;
  }

  function normalizePcBoxes(layout, mons) {
    const known = monMapFrom(mons);
    const boxes = Array.isArray(layout?.boxes)
      ? layout.boxes.map((box, index) => ({
        name: String(box.name || `BOX ${index + 1}`).slice(0, 24) || `BOX ${index + 1}`,
        slots: Array.isArray(box.slots) ? box.slots.map((id) => (id && known.has(String(id)) ? String(id) : null)) : []
      }))
      : [];
    return boxes.length ? boxes : [{ name: "BOX 1", slots: [] }];
  }

  function monBoxNames(boxes) {
    const byId = new Map();
    boxes.forEach((box) => {
      const label = box.name || "BOX";
      (box.slots || []).forEach((id) => {
        if (!id) return;
        const key = String(id);
        if (!byId.has(key)) byId.set(key, []);
        byId.get(key).push(label);
      });
    });
    return byId;
  }

  function pcPickFormLabel(mon) {
    if (!mon) return "";
    const formId = mon.formId || mon.pokemonFormId;
    if (!formId || typeof window.playFormDisplayName !== "function") return "";
    const label = window.playFormDisplayName(mon.dex, formId);
    const base = mon.displayName || mon.name || "";
    if (!label || label === base) return "";
    return label;
  }

  function pcPickSearchHaystack(mon, boxNames) {
    const shiny = String(mon.variant || "").includes("shiny") || mon.shiny;
    return [
      mon.name,
      mon.nickname,
      mon.displayName,
      mon.gender,
      shiny ? "shiny" : "",
      pcPickFormLabel(mon),
      mon.formId,
      mon.pokemonFormId,
      ...(boxNames || [])
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function pcPickMatches(mon, query, boxNames) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return true;
    return pcPickSearchHaystack(mon, boxNames).includes(q);
  }

  function pcPickHasStats(mon) {
    const stats = mon?.stats;
    if (!stats || typeof stats !== "object") return false;
    return Object.values(stats).some((value) => Number(value) > 0);
  }

  function pcPickStatRows(mon) {
    const labels = [
      ["hp", "HP"], ["atk", "Attack"], ["def", "Defense"],
      ["spa", "Sp. Atk"], ["spd", "Sp. Def"], ["spe", "Speed"]
    ];
    return labels.map(([key, label]) => {
      const value = Number(mon.stats?.[key] || 0);
      const pct = Math.max(8, Math.min(100, Math.round((value / 250) * 100)));
      return `<div class="pc-pick-stat"><span>${label}</span><i style="--pct:${pct}%"></i><strong>${value}</strong></div>`;
    }).join("");
  }

  function pcPickInspectHtml(mon, options) {
    const slotNo = Number(options?.slotIndex);
    const slotLabel = Number.isFinite(slotNo) && slotNo >= 0 ? `TEAM SLOT ${slotNo + 1}` : "TEAM SLOT";
    if (!mon) {
      return `
        <div class="pc-pick-inspect-panel">
          <p class="pc-pick-slot-kicker">${slotLabel}</p>
          <div class="pc-pick-inspect-empty">
            <div class="pc-pick-inspect-platform" aria-hidden="true"></div>
            <p class="muted">Select a Pokémon from your PC to inspect it.</p>
          </div>
          <button type="button" class="pc-pick-add" disabled>Add to Team</button>
        </div>`;
    }
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const formLabel = pcPickFormLabel(mon);
    const display = window.playCaughtName(mon);
    const species = typeof window.playCaughtSpeciesName === "function"
      ? window.playCaughtSpeciesName(mon)
      : (mon.name || "");
    const nick = String(mon.nickname || "").trim();
    const ballName = (typeof window.playItemLabel === "function" ? window.playItemLabel(mon.ball) : null) || "Poké Ball";
    const ballImg = typeof window.playItemSprite === "function" ? window.playItemSprite(mon.ball) : "";
    const metPlace = mon.metLocation || "";
    const metLevel = mon.metLevel || mon.level || null;
    const caughtWhen = mon.caughtAt && typeof window.playCardDate === "function"
      ? window.playCardDate(mon.caughtAt)
      : (mon.caughtAt ? String(mon.caughtAt) : "");
    const chips = [
      mon.favorite ? `<span class="pc-pick-chip is-fav">★ Favorite</span>` : "",
      mon.locked ? `<span class="pc-pick-chip is-lock">Locked</span>` : ""
    ].filter(Boolean).join("");
    const captureBits = [
      metPlace ? esc(metPlace) : "",
      metLevel != null ? `Met at Lv. ${metLevel}` : "",
      caughtWhen ? esc(caughtWhen) : ""
    ].filter(Boolean);
    const badges = typeof window.playMonIdentityBadgesHtml === "function"
      ? window.playMonIdentityBadgesHtml(mon)
      : "";
    const metaLine = [
      mon.level != null ? `Lv. ${mon.level}` : "",
      formLabel && formLabel !== species ? esc(formLabel) : ""
    ].filter(Boolean).join(" · ");
    const identityRow = nick && species && nick !== species
      ? `<strong class="pc-pick-inspect-name">${display}<span class="pc-pick-name-sep" aria-hidden="true"> · </span><span class="pc-pick-species">${esc(species)}</span></strong>`
      : `<strong class="pc-pick-inspect-name">${display}</strong>`;
    const addLabel = Number.isFinite(slotNo) && slotNo >= 0
      ? `Add to Slot ${slotNo + 1}`
      : "Add to Team";
    return `
      <div class="pc-pick-inspect-panel">
        <p class="pc-pick-slot-kicker">${slotLabel}</p>
        <div class="pc-pick-inspect-inner">
          <div class="pc-pick-inspect-hero">
            <div class="pc-pick-inspect-stage">
              <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="" width="80" height="80" loading="lazy">
            </div>
            <div class="pc-pick-inspect-id">
              ${identityRow}
              ${metaLine ? `<p class="pc-pick-inspect-meta">${metaLine}</p>` : ""}
              ${chips ? `<div class="pc-pick-chips">${chips}</div>` : ""}
              ${badges}
            </div>
          </div>
          <section class="pc-pick-module" aria-label="Catch history">
            <h4>Catch History</h4>
            <div class="pc-pick-capture">
              ${ballImg ? `<img src="${ballImg}" alt="" width="28" height="28">` : ""}
              <div>
                <strong>${esc(ballName)}</strong>
                ${captureBits.length ? `<p class="muted">${captureBits.join(" · ")}</p>` : ""}
              </div>
            </div>
          </section>
          ${pcPickHasStats(mon) ? `
            <section class="pc-pick-module" aria-label="Stats">
              <h4>Stats</h4>
              <div class="pc-pick-stats">${pcPickStatRows(mon)}</div>
            </section>` : ""}
        </div>
        <button type="button" class="pc-pick-add" data-add-catch="${esc(mon.id)}">${esc(addLabel)}</button>
      </div>`;
  }

  function teamMonInspectHtml(mon, options) {
    const mode = options?.mode === "owner" ? "owner" : "public";
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    if (!mon) {
      return `<div class="pc-pick-inspect-panel team-mon-inspect">
        <p class="muted">No Pokémon selected.</p>
      </div>`;
    }
    const formLabel = pcPickFormLabel(mon);
    const display = window.playCaughtName(mon);
    const species = typeof window.playCaughtSpeciesName === "function"
      ? window.playCaughtSpeciesName(mon)
      : (mon.name || "");
    const nick = String(mon.nickname || "").trim();
    const badges = typeof window.playMonIdentityBadgesHtml === "function"
      ? window.playMonIdentityBadgesHtml(mon)
      : "";
    const metaLine = [
      mon.level != null ? `Lv. ${mon.level}` : "",
      formLabel && formLabel !== species ? esc(formLabel) : ""
    ].filter(Boolean).join(" · ");

    if (mode === "public") {
      const ballName = mon.ball
        ? ((typeof window.playItemLabel === "function" ? window.playItemLabel(mon.ball) : null) || "Poké Ball")
        : "";
      const ballImg = mon.ball && typeof window.playItemSprite === "function" ? window.playItemSprite(mon.ball) : "";
      const identityRow = nick && species && nick !== species
        ? `<strong class="pc-pick-inspect-name">${display}<span class="pc-pick-name-sep" aria-hidden="true"> · </span><span class="pc-pick-species">${esc(species)}</span></strong>`
        : `<strong class="pc-pick-inspect-name">${display}</strong>`;
      return `
        <div class="pc-pick-inspect-panel team-mon-inspect is-public">
          <div class="pc-pick-inspect-inner">
            <div class="pc-pick-inspect-hero">
              <div class="pc-pick-inspect-stage">
                <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="" width="96" height="96" loading="lazy">
              </div>
              <div class="pc-pick-inspect-id">
                ${identityRow}
                ${metaLine ? `<p class="pc-pick-inspect-meta">${metaLine}</p>` : ""}
                ${badges}
              </div>
            </div>
            ${ballName ? `
              <section class="pc-pick-module" aria-label="Poké Ball">
                <h4>Poké Ball</h4>
                <div class="pc-pick-capture">
                  ${ballImg ? `<img src="${ballImg}" alt="" width="28" height="28">` : ""}
                  <div><strong>${esc(ballName)}</strong></div>
                </div>
              </section>` : ""}
            <p class="muted pc-pick-public-note">Public Trainer ID summary — catch record details stay with the Trainer.</p>
          </div>
        </div>`;
    }

    // Owner: reuse PC picker inspection language (no Add CTA).
    const html = pcPickInspectHtml(mon, { slotIndex: options?.slotIndex });
    return html
      .replace(/<button[\s\S]*?class="pc-pick-add"[\s\S]*?<\/button>/, "")
      .replace(/TEAM SLOT(?: \d+)?/i, "TEAM POKÉMON")
      .replace('class="pc-pick-inspect-panel"', 'class="pc-pick-inspect-panel team-mon-inspect is-owner"');
  }

  window.playOpenTeamMonInspect = function playOpenTeamMonInspect(mon, options) {
    const resolved = typeof options?.resolve === "function" ? (options.resolve(mon) || mon) : mon;
    if (!resolved) return null;
    // Modal title stays generic — identity lives once in the inspector body.
    const html = teamMonInspectHtml(resolved, options);
    return openPicker("Team Pokémon", html, "play-modal-team-inspect");
  };

  window.playOpenPcTeamPicker = function playOpenPcTeamPicker(options) {
    const mons = options?.mons || [];
    const layout = options?.layout || { boxes: [] };
    const used = new Set((options?.usedIds || []).map(String));
    const onPick = typeof options?.onPick === "function" ? options.onPick : () => {};
    const slotIndex = Number.isFinite(Number(options?.slotIndex)) ? Number(options.slotIndex) : -1;
    const monById = monMapFrom(mons);
    const boxes = normalizePcBoxes(layout, mons);
    let boxIndex = 0;
    let selectedId = "";
    let searchQuery = "";
    let gridScrollTop = 0;

    function boxNameMap() {
      return monBoxNames(boxes);
    }

    function visibleMons() {
      const names = boxNameMap();
      const q = searchQuery.trim();
      if (q) {
        const placed = new Set(boxes.flatMap((box) => (box.slots || []).filter(Boolean).map(String)));
        return mons.filter((mon) => mon?.id
          && placed.has(String(mon.id))
          && !used.has(String(mon.id))
          && pcPickMatches(mon, q, names.get(String(mon.id)) || []));
      }
      const slots = boxes[boxIndex]?.slots || [];
      const seen = new Set();
      const rows = [];
      slots.forEach((id) => {
        if (!id || used.has(String(id)) || seen.has(String(id))) return;
        const mon = monById.get(String(id));
        if (!mon) return;
        seen.add(String(id));
        rows.push(mon);
      });
      return rows;
    }

    function gridHtml() {
      const searching = Boolean(searchQuery.trim());
      const rows = visibleMons();
      if (selectedId && !rows.some((row) => String(row.id) === selectedId) && !monById.has(selectedId)) {
        selectedId = "";
      }
      if (!rows.length) {
        return `<p class="muted pc-pick-empty">${searching
          ? "No Pokémon match your search."
          : "This box has no available Pokémon for your team."}</p>`;
      }
      return rows.map((mon) => {
        const on = String(mon.id) === selectedId;
        const shiny = window.playCaughtIsShiny?.(mon)
          || String(mon.variant || "").includes("shiny")
          || mon.shiny;
        return `<button type="button" class="pc-pick-mon${on ? " is-selected" : ""}${shiny ? " is-shiny" : ""}" data-id="${mon.id}" aria-pressed="${on}">
          <span class="pc-pick-mon-art">
            <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="" loading="lazy">
            ${shiny ? `<span class="pc-pick-shiny-mark" title="Shiny" aria-label="Shiny">★</span>` : ""}
          </span>
          <strong>${window.playCaughtName(mon)}</strong>
        </button>`;
      }).join("");
    }

    function shellHtml() {
      const searching = Boolean(searchQuery.trim());
      const selected = selectedId ? monById.get(selectedId) : null;
      const tabs = boxes.map((box, i) => (
        `<button type="button" class="pc-pick-tab${!searching && i === boxIndex ? " is-on" : ""}" data-box="${i}" role="tab" aria-selected="${!searching && i === boxIndex}">${window.playEscapeAttr(box.name)}</button>`
      )).join("");
      const boxNote = searching
        ? `Search · ${visibleMons().length} matches`
        : `${boxes[boxIndex]?.name || "BOX"} · ${visibleMons().length} ready`;
      return `
        <div class="pc-pick-shell">
          <div class="pc-pick-nav">
            <div class="pc-pick-tabs" role="tablist">${tabs}</div>
            <label class="pc-pick-search">
              <span class="pc-pick-search-label">Search</span>
              <input type="search" class="pc-pick-search-input" placeholder="Name, nickname, shiny, form…" value="${window.playEscapeAttr(searchQuery)}" autocomplete="off">
            </label>
            <p class="pc-pick-box-status" aria-live="polite">${window.playEscapeAttr(boxNote)}</p>
          </div>
          <div class="pc-pick-body">
            <section class="pc-pick-browser" aria-label="PC storage">
              <header class="pc-pick-pane-head">
                <span>PC Storage</span>
                <span class="pc-pick-pane-hint">Inspect · then Add</span>
              </header>
              <div class="pc-pick-grid-wrap">
                <div class="pc-pick-grid">${gridHtml()}</div>
              </div>
            </section>
            <aside class="pc-pick-inspect" aria-live="polite" aria-label="Inspection terminal">${pcPickInspectHtml(selected, { slotIndex })}</aside>
          </div>
        </div>`;
    }

    function rememberGridScroll() {
      const wrap = document.querySelector("#play-picker-body .pc-pick-grid-wrap");
      if (wrap) gridScrollTop = wrap.scrollTop;
    }

    function restoreGridScroll() {
      const wrap = document.querySelector("#play-picker-body .pc-pick-grid-wrap");
      if (wrap) wrap.scrollTop = gridScrollTop;
    }

    function paintInspectOnly() {
      const aside = document.querySelector("#play-picker-body .pc-pick-inspect");
      if (!aside) return;
      const selected = selectedId ? monById.get(selectedId) : null;
      aside.innerHTML = pcPickInspectHtml(selected, { slotIndex });
      document.querySelectorAll("#play-picker-body .pc-pick-mon").forEach((btn) => {
        const on = String(btn.dataset.id) === selectedId;
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function paint(focusSearch) {
      rememberGridScroll();
      const body = document.getElementById("play-picker-body");
      if (!body) return;
      body.innerHTML = shellHtml();
      restoreGridScroll();
      if (!focusSearch) return;
      const input = body.querySelector(".pc-pick-search-input");
      if (input) {
        input.focus({ preventScroll: true });
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    }

    const dialog = openPicker("Add to My Team", shellHtml(), "play-modal-wide play-modal-pc-pick");
    const body = dialog.querySelector("#play-picker-body");
    const form = dialog.querySelector(".play-modal-card");
    if (form) form.classList.add("pc-pick-card");

    body.addEventListener("click", (event) => {
      const tab = event.target.closest(".pc-pick-tab[data-box]");
      const monBtn = event.target.closest(".pc-pick-mon");
      const addBtn = event.target.closest(".pc-pick-add");
      if (tab) {
        boxIndex = Number(tab.dataset.box);
        if (Number.isNaN(boxIndex)) return;
        searchQuery = "";
        selectedId = "";
        gridScrollTop = 0;
        paint(false);
        return;
      }
      if (monBtn) {
        selectedId = String(monBtn.dataset.id || "");
        paintInspectOnly();
        return;
      }
      if (addBtn && !addBtn.disabled) {
        const id = addBtn.dataset.addCatch || selectedId;
        const mon = id ? monById.get(String(id)) : null;
        if (!mon) return;
        dialog.close();
        onPick(mon);
      }
    });

    body.addEventListener("input", (event) => {
      if (!event.target.matches(".pc-pick-search-input")) return;
      searchQuery = event.target.value;
      selectedId = "";
      gridScrollTop = 0;
      paint(true);
    });

    body.querySelector(".pc-pick-search-input")?.focus({ preventScroll: true });
    return dialog;
  };

  window.playOpenCatchPicker = function playOpenCatchPicker(caught, usedIds, onPick) {
    const used = new Set((usedIds || []).map(String));
    const rows = (caught || []).filter((row) => row?.id && !used.has(String(row.id)));
    const html = rows.length
      ? `<div class="picker-grid">${rows.map((row) => {
          const shiny = window.playCaughtIsShiny?.(row)
            || String(row.variant || "").includes("shiny")
            || row.shiny;
          return `
          <button type="button" class="picker-mon${shiny ? " is-shiny" : ""}" data-id="${row.id}">
            <span class="pc-pick-mon-art">
              <img src="${window.playSpriteUrl(row.dex, row.variant, row.formId)}" alt="">
              ${shiny ? `<span class="pc-pick-shiny-mark" title="Shiny" aria-label="Shiny">★</span>` : ""}
            </span>
            <strong>${window.playCaughtName(row)}</strong>
          </button>`;
        }).join("")}</div>`
      : `<p class="muted">Catch Pokémon on Play, then add them here. Ones already on the team won’t show again.</p>`;
    const dialog = openPicker("Add to My Team", html);
    dialog.querySelectorAll(".picker-mon").forEach((button) => {
      button.addEventListener("click", () => {
        const row = rows.find((item) => String(item.id) === button.dataset.id);
        dialog.close();
        if (row) onPick(row);
      });
    });
  };

  window.playOpenTrainerPicker = function playOpenTrainerPicker(current, onPick, options) {
    const owned = new Set(options?.ownedPacks || window._playOwnedAvatarPacks || []);
    const html = `<div class="trainer-pick-list">${window.PLAY_TRAINERS.map((row) => {
      const locked = Boolean(row.premium) && !owned.has(row.key);
      return `<section class="trainer-gen${locked ? " is-locked" : ""}">
        <h4>${row.label}</h4>
        <p class="muted">${row.games}${locked ? ` · Unlock in <a href="./store.html#premium-avatars">Premium Avatars</a>` : ""}</p>
        <div class="trainer-gen-row">
          ${window.playTrainerLooks(row).map((look) => {
            const pressed = look.id === current ? "true" : "false";
            const meta = [look.gender, look.outfit].filter(Boolean).join(" · ");
            const state = locked ? "locked" : (look.id === current ? "equipped" : "owned");
            return `<button type="button" class="trainer-opt is-${state}" data-id="${look.id}" data-locked="${locked ? "1" : "0"}" aria-pressed="${pressed}" aria-label="${look.name} ${state}">
              <img src="${window.playTrainerSpriteUrl(look.id)}" alt="" width="72" height="72" loading="lazy">
              <strong>${look.name}</strong>
              ${meta ? `<span>${meta}</span>` : ""}
              <span class="id-state">${state}</span>
            </button>`;
          }).join("")}
        </div>
      </section>`;
    }).join("")}</div>`;
    const dialog = openPicker("Choose a trainer look", html, "play-modal-wide");
    dialog.querySelectorAll(".trainer-opt").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.locked === "1") {
          const hint = dialog.querySelector(".trainer-gen.is-locked .muted");
          if (hint) hint.scrollIntoView({ block: "nearest" });
          return;
        }
        dialog.close();
        onPick(button.dataset.id);
      });
    });
  };

  window.playRenderTeamSlots = function playRenderTeamSlots(el, team, options) {
    if (!el) return;
    const mine = Boolean(options?.mine);
    const slots = Array.from({ length: 6 }, (_, i) => (team || [])[i] || null);
    el.innerHTML = slots.map((mon, index) => {
      if (!mon) {
        return `<button type="button" class="team-slot team-party-chip empty" data-add="${index}" ${mine ? "" : "disabled"}>
          <span class="team-slot-ball" aria-hidden="true">${index + 1}</span>
          <span class="team-slot-sprite team-slot-sprite-empty" aria-hidden="true">＋</span>
          <strong class="team-slot-name">Add</strong>
        </button>`;
      }
      const shiny = Boolean(window.playCaughtIsShiny?.(mon)
        || String(mon.variant || "").includes("shiny")
        || mon.shiny);
      const formId = mon.formId || mon.pokemonFormId || "";
      let formLine = "";
      if (formId && typeof window.playFormDisplayName === "function") {
        const formLabel = window.playFormDisplayName(mon.dex, formId);
        const baseName = mon.displayName || mon.name || "";
        if (formLabel && formLabel !== baseName) {
          const dash = String(formLabel).indexOf("—");
          formLine = dash >= 0 ? String(formLabel).slice(dash + 1).trim() : formLabel;
        }
      }
      // Gender exists on catch records for sprite/identity authority, but is not shown in Team editor UI.
      const display = window.playCaughtName(mon);
      return `<article class="team-slot team-party-chip filled${shiny ? " is-shiny" : ""}" data-catch-id="${mon.id || ""}">
        <button type="button" class="team-slot-hit" data-inspect-catch="${mon.id || ""}" aria-label="Inspect ${display}"></button>
        <span class="team-slot-ball" aria-hidden="true">${index + 1}</span>
        <span class="team-slot-sprite">
          <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="">
          ${shiny ? `<span class="team-slot-shiny" title="Shiny" aria-label="Shiny">★</span>` : ""}
        </span>
        <strong class="team-slot-name">${display}</strong>
        ${formLine ? `<span class="team-slot-meta">${formLine}</span>` : ""}
        ${mine ? `<div class="team-slot-actions" role="group" aria-label="Reorder ${display}">
          <button type="button" class="team-slot-icon" data-move="${index}" data-dir="-1" aria-label="Move left" ${index === 0 ? "disabled" : ""}>◀</button>
          <button type="button" class="team-slot-icon" data-move="${index}" data-dir="1" aria-label="Move right" ${index === 5 || !slots[index + 1] ? "disabled" : ""}>▶</button>
          <button type="button" class="team-slot-icon is-remove" data-remove="${index}" aria-label="Remove from party">×</button>
        </div>` : ""}
      </article>`;
    }).join("");
  };

  window.playBindTeamSlots = function playBindTeamSlots(el, getState, saveTeam, statusEl, bindOptions) {
    if (!el) return;
    el.addEventListener("click", async (event) => {
      const inspect = event.target.closest("[data-inspect-catch]");
      if (inspect && !event.target.closest("[data-move], [data-remove], [data-add]")) {
        const state = getState();
        const id = inspect.getAttribute("data-inspect-catch");
        const mon = (state.team || []).find((row) => String(row?.id) === String(id));
        if (!mon) return;
        const pc = bindOptions?.pcStorage || state.pcStorage;
        const richer = (pc?.mons || []).find((row) => String(row?.id) === String(id)) || mon;
        window.playOpenTeamMonInspect?.(richer, { mode: "owner" });
        return;
      }
      const add = event.target.closest("[data-add]");
      const remove = event.target.closest("[data-remove]");
      const move = event.target.closest("[data-move]");
      if (!add && !remove && !move) return;
      const state = getState();
      const team = (state.team || []).slice();
      const ids = () => team.map((row) => row.id).filter(Boolean);
      const pcStorage = bindOptions?.pcStorage || state.pcStorage;
      try {
        if (add) {
          if (team.length >= 6) {
            if (statusEl) statusEl.textContent = "Your team already has six Pokémon.";
            return;
          }
          const slotIndex = Number(add.dataset.add);
          const pickHandler = async (row) => {
            try {
              const at = Number.isFinite(slotIndex) ? Math.min(Math.max(slotIndex, 0), team.length) : team.length;
              team.splice(at, 0, row);
              if (team.length > 6) team.length = 6;
              await saveTeam(ids());
              if (statusEl) statusEl.textContent = "";
            } catch (error) {
              if (statusEl) statusEl.textContent = window.playRpcError(error);
              if (typeof window.playToast === "function") {
                window.playToast({
                  kind: "error",
                  title: "Team not updated",
                  body: window.playRpcError(error)
                });
              }
            }
          };
          if (pcStorage?.mons && pcStorage?.layout) {
            window.playOpenPcTeamPicker({
              mons: pcStorage.mons,
              layout: pcStorage.layout,
              usedIds: ids(),
              slotIndex: Number.isFinite(slotIndex) ? slotIndex : team.length,
              onPick: pickHandler
            });
            return;
          }
          window.playOpenCatchPicker(state.caught || [], ids(), pickHandler);
          return;
        }
        if (remove) {
          team.splice(Number(remove.dataset.remove), 1);
          await saveTeam(ids());
          if (statusEl) statusEl.textContent = "";
          return;
        }
        if (move) {
          const index = Number(move.dataset.move);
          const next = index + Number(move.dataset.dir);
          if (next < 0 || next >= team.length) return;
          const swap = team[index];
          team[index] = team[next];
          team[next] = swap;
          await saveTeam(ids());
          if (statusEl) statusEl.textContent = "";
        }
      } catch (error) {
        if (statusEl) statusEl.textContent = window.playRpcError(error);
        if (typeof window.playToast === "function") {
          window.playToast({
            kind: "error",
            title: "Team not updated",
            body: window.playRpcError(error)
          });
        }
      }
    });
  };

  const _playRenderTrainerPartyHtml = window.playRenderTrainerPartyHtml;
  if (typeof _playRenderTrainerPartyHtml === "function") {
    window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtmlPatched(card) {
      return _playRenderTrainerPartyHtml(card).replace(
        "Organize six Pokémon in Settings.",
        "Organize six Pokémon in My Account."
      );
    };
  }
})();
