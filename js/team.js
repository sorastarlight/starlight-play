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

  function pcPickInspectHtml(mon) {
    if (!mon) {
      return `<div class="pc-pick-inspect-empty"><p class="muted">Select a Pokémon from your PC to inspect it.</p></div>`;
    }
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const shiny = String(mon.variant || "").includes("shiny") || mon.shiny;
    const formLabel = pcPickFormLabel(mon);
    const ballName = (typeof window.playItemLabel === "function" ? window.playItemLabel(mon.ball) : null) || "Poké Ball";
    const ballImg = typeof window.playItemSprite === "function" ? window.playItemSprite(mon.ball) : "";
    const metPlace = mon.metLocation || "";
    const metLevel = mon.metLevel || mon.level || null;
    const caughtWhen = mon.caughtAt && typeof window.playCardDate === "function"
      ? window.playCardDate(mon.caughtAt)
      : (mon.caughtAt ? String(mon.caughtAt) : "");
    const chips = [
      mon.favorite ? `<span class="pc-pick-chip is-fav">★ Favorite</span>` : "",
      mon.locked ? `<span class="pc-pick-chip is-lock">🔒 Locked</span>` : "",
      shiny ? `<span class="pc-pick-chip is-shiny">✦ Shiny</span>` : ""
    ].filter(Boolean).join("");
    const captureBits = [
      metPlace ? esc(metPlace) : "",
      metLevel != null ? `Met at Lv. ${metLevel}` : "",
      caughtWhen ? esc(caughtWhen) : ""
    ].filter(Boolean);
    const badges = typeof window.playMonIdentityBadgesHtml === "function"
      ? window.playMonIdentityBadgesHtml(mon)
      : "";
    return `
      <div class="pc-pick-inspect-inner">
        <div class="pc-pick-inspect-hero">
          <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="" width="96" height="96" loading="lazy">
          <div>
            <strong class="pc-pick-inspect-name">${window.playCaughtName(mon)}</strong>
            ${mon.nickname && mon.name && mon.nickname !== mon.name
              ? `<span class="muted pc-pick-species">${esc(mon.name)}</span>` : ""}
            <p class="pc-pick-inspect-meta">${[
              mon.level != null ? `Lv. ${mon.level}` : "",
              mon.gender || "",
              formLabel ? esc(formLabel) : ""
            ].filter(Boolean).join(" · ")}</p>
            ${chips ? `<div class="pc-pick-chips">${chips}</div>` : ""}
            ${badges}
          </div>
        </div>
        <section class="pc-pick-module" aria-label="Capture">
          <h4>Capture</h4>
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
      </div>`;
  }

  window.playOpenPcTeamPicker = function playOpenPcTeamPicker(options) {
    const mons = options?.mons || [];
    const layout = options?.layout || { boxes: [] };
    const used = new Set((options?.usedIds || []).map(String));
    const onPick = typeof options?.onPick === "function" ? options.onPick : () => {};
    const monById = monMapFrom(mons);
    let boxes = normalizePcBoxes(layout, mons);
    let boxIndex = 0;
    let selectedId = "";
    let searchQuery = "";

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

    function shellHtml() {
      const searching = Boolean(searchQuery.trim());
      const rows = visibleMons();
      if (selectedId && !rows.some((row) => String(row.id) === selectedId)) {
        selectedId = rows[0] ? String(rows[0].id) : "";
      }
      const selected = selectedId ? monById.get(selectedId) : null;
      const tabs = boxes.map((box, i) => (
        `<button type="button" class="pc-pick-tab${!searching && i === boxIndex ? " is-on" : ""}" data-box="${i}" role="tab" aria-selected="${!searching && i === boxIndex}">${window.playEscapeAttr(box.name)}</button>`
      )).join("");
      const grid = rows.length
        ? rows.map((mon) => {
          const on = String(mon.id) === selectedId;
          return `<button type="button" class="pc-pick-mon${on ? " is-selected" : ""}" data-id="${mon.id}" aria-pressed="${on}">
            <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="">
            <strong>${window.playCaughtName(mon)}</strong>
            <span>${window.playCaughtBlurb(mon)}</span>
          </button>`;
        }).join("")
        : `<p class="muted pc-pick-empty">${searching
          ? "No Pokémon match your search."
          : "This box has no available Pokémon for your team."}</p>`;
      return `
        <div class="pc-pick-shell">
          <div class="pc-pick-nav">
            <div class="pc-pick-tabs" role="tablist">${tabs}</div>
            <label class="pc-pick-search">
              <span class="pc-pick-search-label">Search</span>
              <input type="search" class="pc-pick-search-input" placeholder="Name, box, shiny, form…" value="${window.playEscapeAttr(searchQuery)}" autocomplete="off">
            </label>
          </div>
          <div class="pc-pick-body">
            <div class="pc-pick-grid-wrap">
              <div class="pc-pick-grid">${grid}</div>
            </div>
            <aside class="pc-pick-inspect" aria-live="polite">${pcPickInspectHtml(selected)}</aside>
          </div>
          <footer class="pc-pick-foot">
            <button type="button" class="pc-pick-add primary" ${selected ? "" : "disabled"}>Add to Team</button>
          </footer>
        </div>`;
    }

    function paint(focusSearch) {
      const body = document.getElementById("play-picker-body");
      if (!body) return;
      body.innerHTML = shellHtml();
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

    body.addEventListener("click", (event) => {
      const tab = event.target.closest(".pc-pick-tab[data-box]");
      const monBtn = event.target.closest(".pc-pick-mon");
      const addBtn = event.target.closest(".pc-pick-add");
      if (tab) {
        boxIndex = Number(tab.dataset.box);
        if (Number.isNaN(boxIndex)) return;
        searchQuery = "";
        paint(true);
        return;
      }
      if (monBtn) {
        selectedId = String(monBtn.dataset.id || "");
        paint(false);
        return;
      }
      if (addBtn && !addBtn.disabled) {
        const mon = selectedId ? monById.get(selectedId) : null;
        dialog.close();
        if (mon) onPick(mon);
      }
    });

    body.addEventListener("input", (event) => {
      if (!event.target.matches(".pc-pick-search-input")) return;
      searchQuery = event.target.value;
      paint(false);
    });

    body.querySelector(".pc-pick-search-input")?.focus({ preventScroll: true });
    return dialog;
  };

  window.playOpenCatchPicker = function playOpenCatchPicker(caught, usedIds, onPick) {
    const used = new Set((usedIds || []).map(String));
    const rows = (caught || []).filter((row) => row?.id && !used.has(String(row.id)));
    const html = rows.length
      ? `<div class="picker-grid">${rows.map((row) => `
          <button type="button" class="picker-mon" data-id="${row.id}">
            <img src="${window.playSpriteUrl(row.dex, row.variant, row.formId)}" alt="">
            <strong>${window.playCaughtName(row)}</strong>
            <span>${window.playCaughtBlurb(row)}</span>
          </button>`).join("")}</div>`
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
        return `<button type="button" class="team-slot empty" data-add="${index}" ${mine ? "" : "disabled"}>
          <span class="team-slot-no">${index + 1}</span>
          <strong>${mine ? "Add" : "Empty"}</strong>
        </button>`;
      }
      return `<article class="team-slot filled">
        <span class="team-slot-no">${index + 1}</span>
        <img src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="">
        <strong>${window.playCaughtName(mon)}</strong>
        <span>${window.playCaughtBlurb(mon)}</span>
        ${mine ? `<div class="team-slot-actions">
          <button type="button" data-move="${index}" data-dir="-1" ${index === 0 ? "disabled" : ""}>◀</button>
          <button type="button" data-move="${index}" data-dir="1" ${index === 5 || !slots[index + 1] ? "disabled" : ""}>▶</button>
          <button type="button" data-remove="${index}">Remove</button>
        </div>` : ""}
      </article>`;
    }).join("");
  };

  window.playBindTeamSlots = function playBindTeamSlots(el, getState, saveTeam, statusEl, bindOptions) {
    if (!el) return;
    el.addEventListener("click", async (event) => {
      const add = event.target.closest("[data-add]");
      const remove = event.target.closest("[data-remove]");
      const move = event.target.closest("[data-move]");
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
          const pickHandler = async (row) => {
            try {
              team.push(row);
              if (statusEl) statusEl.textContent = "Saving team…";
              const data = await saveTeam(ids());
              if (statusEl) statusEl.textContent = data?.message || "Team updated.";
            } catch (error) {
              if (statusEl) statusEl.textContent = window.playRpcError(error);
            }
          };
          if (pcStorage?.mons && pcStorage?.layout) {
            window.playOpenPcTeamPicker({
              mons: pcStorage.mons,
              layout: pcStorage.layout,
              usedIds: ids(),
              onPick: pickHandler
            });
            return;
          }
          window.playOpenCatchPicker(state.caught || [], ids(), pickHandler);
          return;
        }
        if (remove) {
          team.splice(Number(remove.dataset.remove), 1);
          if (statusEl) statusEl.textContent = "Saving team…";
          const data = await saveTeam(ids());
          if (statusEl) statusEl.textContent = data?.message || "Team updated.";
          return;
        }
        if (move) {
          const index = Number(move.dataset.move);
          const next = index + Number(move.dataset.dir);
          if (next < 0 || next >= team.length) return;
          const swap = team[index];
          team[index] = team[next];
          team[next] = swap;
          if (statusEl) statusEl.textContent = "Saving team…";
          const data = await saveTeam(ids());
          if (statusEl) statusEl.textContent = data?.message || "Team updated.";
        }
      } catch (error) {
        if (statusEl) statusEl.textContent = window.playRpcError(error);
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
