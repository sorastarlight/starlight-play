(() => {
  const supabase = window.playSupabase;
  const view = window.playEvoView || {};
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("evo-app"),
    grid: document.getElementById("evo-grid"),
    candy: document.getElementById("candy-list"),
    rarePanel: document.getElementById("rare-candy-panel"),
    rareFamily: document.getElementById("rare-candy-family"),
    rareUse: document.getElementById("rare-candy-use"),
    rareStatus: document.getElementById("rare-candy-status"),
    rareOwned: document.getElementById("rare-candy-owned"),
    rarePreview: document.getElementById("rare-candy-preview"),
    rareArt: document.getElementById("rare-candy-art"),
    families: document.getElementById("family-list"),
    mastery: document.getElementById("mastery-list"),
    filter: document.getElementById("evo-filter"),
    filters: document.getElementById("evo-filters"),
    search: document.getElementById("evo-search"),
    note: document.getElementById("evo-ready-note"),
    strip: document.getElementById("evo-strip"),
    readyCount: document.getElementById("evo-ready-count"),
    candyCount: document.getElementById("evo-candy-count"),
    doneCount: document.getElementById("evo-done-count"),
    historyBlock: document.getElementById("evo-history-block"),
    history: document.getElementById("evo-history"),
    modal: document.getElementById("evo-modal"),
    title: document.getElementById("evo-title"),
    detail: document.getElementById("evo-detail"),
    go: document.getElementById("evo-go"),
    cancel: document.getElementById("evo-cancel"),
    status: document.getElementById("evo-status")
  };
  let data = null;
  let pick = null;
  const evolveGate = view.pendingGuard ? view.pendingGuard() : { begin() { return true; }, end() {}, busy: false };
  const rareGate = view.pendingGuard ? view.pendingGuard() : { begin() { return true; }, end() {}, busy: false };

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to evolve your Pokémon.");
    }
  });

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function cue(name) {
    try { window.playEvoCue?.(name); } catch (_) {}
  }

  function sprite(dex, variant, size) {
    const src = window.playSpriteUrl(dex, variant);
    const px = size || 96;
    return `<img src="${esc(src)}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">`;
  }

  function genderMark(gender) {
    const g = String(gender || "").toLowerCase();
    if (g === "female") return `<span class="evo-gender" title="Female">♀</span>`;
    if (g === "male") return `<span class="evo-gender" title="Male">♂</span>`;
    return "";
  }

  function itemLabel(key) {
    return view.itemLabel ? view.itemLabel(key) : (window.playItemLabel ? window.playItemLabel(key) : key);
  }

  function canEvolve(row) {
    return view.canEvolve ? view.canEvolve(row) : Boolean(row?.available);
  }

  function currentFilter() {
    return els.filter?.value || "ready";
  }

  function setFilter(value) {
    if (els.filter) els.filter.value = value;
    els.filters?.querySelectorAll("[data-filter]").forEach((chip) => {
      chip.setAttribute("aria-pressed", chip.dataset.filter === value ? "true" : "false");
    });
  }

  function meter(have, need) {
    const max = Math.max(1, Number(need) || 1);
    const pct = Math.max(0, Math.min(100, Math.round((Number(have) || 0) / max * 100)));
    return `<div class="evo-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
  }

  function stars(rank) {
    return "★".repeat(rank || 0) + "☆".repeat(Math.max(0, 5 - (rank || 0)));
  }

  function readyRows() {
    return data?.ready || [];
  }

  function counts() {
    const rows = readyRows();
    const owned = data?.owned || [];
    return {
      ready: rows.filter(canEvolve).length,
      all: rows.length + owned.filter((mon) => !mon.canEvolve).length,
      candy: rows.filter((row) => view.matchesFilter(row, "candy")).length,
      item: rows.filter((row) => view.matchesFilter(row, "item")).length,
      shiny: rows.filter((row) => view.matchesFilter(row, "shiny")).length,
      favorites: rows.filter((row) => view.matchesFilter(row, "favorites")).length
    };
  }

  function renderHero() {
    const tally = counts();
    if (els.readyCount) els.readyCount.textContent = String(tally.ready);
    if (els.candyCount) els.candyCount.textContent = String(data?.stats?.candyTotal || 0);
    if (els.doneCount) els.doneCount.textContent = String(data?.stats?.evolved || 0);
    if (els.strip) els.strip.hidden = false;
    els.filters?.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = String(tally[el.dataset.count] || 0);
    });
    if (els.note) {
      els.note.textContent = tally.ready
        ? `${tally.ready} Pokémon ready to evolve.`
        : "No Pokémon are ready to evolve yet.";
    }
  }

  function cardHtml(row, terminal) {
    const kind = view.cardKind ? view.cardKind(row) : (canEvolve(row) ? "ready" : "blocked");
    const shiny = view.isShiny?.(row);
    const ready = kind === "ready";
    const need = view.candyNeed ? view.candyNeed(row) : 0;
    const label = terminal
      ? `${row.name}. No evolution currently available.`
      : `${ready ? "Ready to evolve. " : ""}${shiny ? "Shiny " : ""}${row.name}${row.level ? ` level ${row.level}` : ""} into ${row.toName || ""}.`;
    const badge = ready
      ? `<span class="evo-badge">✨ Ready to evolve!</span>`
      : kind === "locked"
        ? `<span class="evo-badge is-warn">Locked</span>`
        : kind === "reserved"
          ? `<span class="evo-badge is-warn">Trade reserved</span>`
          : terminal
            ? `<span class="evo-badge is-muted">No evolution</span>`
            : `<span class="evo-badge is-wait">Not ready yet</span>`;
    const candy = terminal ? "" : `${Number(row.haveCandy || 0)} / ${Number(row.candyCost || 0)} Evolution Candy`;
    const item = row.item ? `${itemLabel(row.item)} ${row.haveItem || row.tradeReady ? "✓" : "✕"}` : "";
    return `
      <button type="button" class="evo-mon is-${kind}${ready ? " is-ready" : ""}" data-evo="${esc(row.catchId || row.id || "")}" data-rule="${esc(row.ruleId || "")}" data-kind="${kind}" data-dex="${row.dex || ""}" aria-label="${esc(label)}">
        <span class="evo-mon-art">${sprite(row.dex, row.variant || "normal", 96)}</span>
        <strong>${shiny ? "✨ " : ""}${esc(row.name)} ${genderMark(row.gender)}</strong>
        <span class="muted">${row.level ? `Lv. ${row.level}` : ""}${row.favorite ? " ★ Favorite" : ""}</span>
        ${row.toName ? `<span class="evo-arrow-lite" aria-hidden="true">↓</span><span class="evo-target">${esc(row.toName)}</span>` : ""}
        ${badge}
        ${candy ? `<span class="evo-cost">${esc(candy)}${item ? ` · ${esc(item)}` : ""}${!ready && need ? ` · ${need} more needed` : ""}</span>` : ""}
        ${ready ? `<span class="evo-cta">Click to evolve</span>` : ""}
      </button>`;
  }

  function renderReady() {
    const filter = currentFilter();
    const q = els.search?.value || "";
    const rows = readyRows().filter((row) => (view.matchesFilter ? view.matchesFilter(row, filter, q) : true));
    const cards = rows.map((row) => cardHtml(row, false));
    if (filter === "all") {
      const terminals = (data?.owned || []).filter((mon) => !mon.canEvolve).map((mon) => ({ ...mon, terminal: true, catchId: mon.id }));
      terminals.filter((mon) => view.matchesFilter ? view.matchesFilter(mon, "all", q) : true)
        .forEach((mon) => cards.push(cardHtml(mon, true)));
    }
    const empty = filter === "ready"
      ? `<p class="muted">No Pokémon are ready to evolve yet. Catch duplicates to earn Evolution Candy.</p>`
      : `<p class="muted">Nothing in this filter right now.</p>`;
    els.grid.innerHTML = cards.join("") || empty;
  }

  function nodeHtml(member) {
    const owned = Number(member.owned || 0) > 0;
    const seen = Boolean(member.pokedex);
    return `<button type="button" class="evo-node${owned ? " is-owned" : ""}" data-evo-dex="${member.dex}">
      ${sprite(member.dex, "normal", 56)}
      <strong>${esc(member.name)}</strong>
      <span>${owned ? "Owned" : seen ? "Pokédex" : "Unseen"} · ${member.owned || 0}</span>
    </button>`;
  }

  function renderFamilies() {
    if (!els.families) return;
    const families = data?.families || [];
    els.families.innerHTML = families.map((fam) => {
      const members = view.kantoOnlyMembers ? view.kantoOnlyMembers(fam.members || []) : (fam.members || []);
      const layout = view.lineLayout ? view.lineLayout(members, fam.next || []) : { kind: "linear", nodes: members };
      let graph = "";
      if (layout.kind === "branch" && layout.from) {
        graph = `<div class="evo-line-graph is-branch">
          ${nodeHtml(layout.from)}
          <span class="evo-arrow" aria-hidden="true">→</span>
          <div class="evo-branch-tos">${layout.targets.map(nodeHtml).join("")}</div>
        </div>`;
      } else {
        graph = `<div class="evo-line">${(layout.nodes || members).map((member, index, list) => `${nodeHtml(member)}${index < list.length - 1 ? `<span class="evo-arrow" aria-hidden="true">↓</span>` : ""}`).join("")}</div>`;
      }
      return `
        <article class="card body family-card" id="evo-line-${fam.familyId}">
          <h3>${esc(fam.name)} Evolution Line</h3>
          <p><strong>Evolution Candy:</strong> ${fam.candy || 0}</p>
          ${graph || "<p class=\"muted\">No stages to show.</p>"}
        </article>`;
    }).join("") || `<p class="muted">Catch a Pokémon with an enabled Evolution Line to see it here.</p>`;
  }

  function renderRareCandy() {
    const qty = Number(data?.items?.rarecandy || data?.bag?.rarecandy || 0);
    const families = (data?.families || []).filter((fam) => (fam.next || []).length);
    if (els.rarePanel) els.rarePanel.hidden = qty < 1 && families.length < 1;
    if (els.rareArt && window.playItemSprite) els.rareArt.src = window.playItemSprite("rarecandy");
    if (els.rareOwned) els.rareOwned.textContent = `Owned: ${qty}`;
    if (els.rareFamily) {
      els.rareFamily.innerHTML = families.map((fam) => `<option value="${fam.familyId}">${esc(fam.name)} · ${fam.candy || 0} Evolution Candy</option>`).join("");
    }
    updateRarePreview();
    if (els.rareUse) els.rareUse.disabled = qty < 1 || !families.length;
  }

  function updateRarePreview() {
    const fam = (data?.families || []).find((row) => String(row.familyId) === String(els.rareFamily?.value || ""));
    if (els.rarePreview) {
      els.rarePreview.textContent = fam
        ? `${fam.name} Evolution Candy: ${fam.candy || 0} → ${(fam.candy || 0) + 1}`
        : "";
    }
  }

  function renderCandy() {
    if (!els.candy) return;
    els.candy.innerHTML = (data?.candy || []).map((row) => `
      <button type="button" class="evo-candy" data-family="${row.familyId}">
        ${sprite(row.baseDex, "normal", 48)}
        <strong>${esc(row.name)} Line</strong>
        <span>${row.qty} Evolution Candy</span>
      </button>`).join("") || `<p class="muted">Catch Pokémon from an Evolution Line to earn Evolution Candy.</p>`;
  }

  function renderHistory() {
    const rows = data?.recentEvolutions || [];
    if (els.historyBlock) els.historyBlock.hidden = !rows.length;
    if (!els.history) return;
    els.history.innerHTML = rows.map((row) => {
      const when = row.at ? new Date(row.at) : null;
      const stamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString() : "";
      return `<li><span>${esc(row.fromName)} → ${esc(row.toName)}</span><span class="muted">${esc(stamp)}</span></li>`;
    }).join("");
  }

  function renderMastery() {
    if (!els.mastery) return;
    els.mastery.innerHTML = (data?.mastery || []).map((row) => `
      <article class="prog-pick">
        ${sprite(row.dex, "normal", 48)}
        <strong>${window.playSpeciesName ? window.playSpeciesName(row.dex) : row.dex}</strong>
        <span>${stars(row.rank)} · ${row.points} pts · ${row.lifetime || 0} caught</span>
      </article>`).join("") || `<p class="muted">Catch Pokémon to begin Species Mastery.</p>`;
  }

  function render() {
    renderHero();
    renderReady();
    renderFamilies();
    renderRareCandy();
    renderCandy();
    renderHistory();
    renderMastery();
  }

  function closeModal() {
    document.querySelectorAll(".evo-mon.is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (!els.modal) return;
    if (typeof els.modal.close === "function" && els.modal.open) els.modal.close();
    else els.modal.removeAttribute("open");
  }

  function requirementHtml(row) {
    const kind = view.cardKind(row);
    if (kind === "locked") {
      return `<p>🔒 Locked</p><p>Unlock this Pokémon before evolving it.</p><p><a class="button secondary" href="./storage.html">Go to My PC</a></p>`;
    }
    if (kind === "reserved") {
      return `<p>Trade reserved</p><p>This Pokémon cannot evolve while it is part of an active trade.</p><p><a class="button secondary" href="./trade.html">Open Global Trade System</a></p>`;
    }
    if (kind === "terminal") {
      return `<p>No evolution currently available for this Pokémon.</p>`;
    }
    const bits = [];
    if (row.tradeReady && Number(row.candyCost) === 0) {
      bits.push(`<p class="evo-ready-call">Trade Evolution Ready!</p><p>This Pokémon has been traded and can evolve now. No Linking Cord required.</p>`);
    } else {
      const have = Number(row.haveCandy || 0);
      const need = Number(row.candyCost || 0);
      bits.push(`<p>Evolution Candy<br><strong>${have} / ${need}</strong> ${have >= need ? "✓" : "✕"}</p>${meter(have, need)}`);
      if (need > have) bits.push(`<p>You need ${need - have} more Evolution Candy.</p>`);
      if (row.item === "linkingcord") {
        const qty = view.itemQty ? view.itemQty(row) : (row.haveItem ? 1 : 0);
        bits.push(`<p>Linking Cord<br>Allows this Pokémon to evolve without trading.<br>Owned: ${qty} ${qty ? "✓" : "✕"}</p>`);
        if (!qty) bits.push(`<p><a class="button secondary" href="${view.martHref()}">Get Linking Cord</a></p>`);
      } else if (row.item) {
        const qty = view.itemQty ? view.itemQty(row) : (row.haveItem ? 1 : 0);
        bits.push(`<p>${esc(itemLabel(row.item))}<br>1 / 1 ${qty ? "✓" : "✕"}</p>`);
        if (!qty) bits.push(`<p><a class="button secondary" href="${view.martHref(row.item)}">Get ${esc(itemLabel(row.item))}</a></p>`);
      }
      if (canEvolve(row) && row.item) {
        const afterCandy = Math.max(0, Number(row.haveCandy || 0) - Number(row.candyCost || 0));
        const afterItem = Math.max(0, (view.itemQty ? view.itemQty(row) : 1) - 1);
        bits.push(`<p class="muted">After Evolution: ${afterCandy} Evolution Candy${row.item ? ` · ${afterItem} ${itemLabel(row.item)}` : ""}</p>`);
      }
    }
    return bits.join("");
  }

  function openPreview(row) {
    pick = row;
    const shiny = view.isShiny?.(row);
    const kind = view.cardKind(row);
    const ready = canEvolve(row);
    if (els.title) els.title.textContent = kind === "terminal" ? row.name : "Evolution";
    const fromName = `${shiny ? "✨ Shiny " : ""}${row.name}`;
    const toName = row.toName ? `${shiny ? "✨ Shiny " : ""}${row.toName}` : "";
    els.detail.innerHTML = `
      <div class="evo-preview-stage${shiny ? " is-shiny" : ""}">
        ${shiny ? `<p class="evo-shiny-banner">✨ Shiny Pokémon ✨</p>` : ""}
        <p class="evo-preview-from"><strong>${esc(fromName)}</strong>${row.level ? ` · Lv. ${row.level}` : ""} ${genderMark(row.gender)}</p>
        ${sprite(row.dex, row.variant || "normal", 112)}
        ${toName ? `<p class="evo-arrow-lite" aria-hidden="true">↓</p>${sprite(row.toDex, row.variant || "normal", 112)}<p><strong>${esc(toName)}</strong></p>` : ""}
      </div>
      <div class="evo-reqs">
        <p class="eyebrow">Requirements</p>
        ${requirementHtml(row)}
      </div>
      ${row.ownedCopies != null ? `<p>Owned copies: ${Number(row.ownedCopies)}</p>` : ""}
      ${row.pokedex != null ? `<p>${row.pokedex ? "Registered in the Pokédex" : "Not registered yet"}</p>` : ""}
      ${row.mastery ? `<p>Species Mastery ${stars(row.mastery.rank)} · ${row.mastery.points} pts</p>` : ""}
      ${row.eligibleCount ? `<p><button type="button" class="secondary" data-view-eligible="${row.dex}">View eligible Pokémon</button></p>` : ""}
      ${shiny && ready ? `<p>Shiny status will be preserved.</p>` : ""}
      ${row.favorite ? `<p>★ Favorite Pokémon<br>You're evolving this exact Pokémon. It will remain the same Pokémon after evolution.</p>` : ""}
      ${ready ? `<p>${esc(row.name)} will evolve into ${esc(row.toName)}. This cannot be reversed.</p>` : ""}`;
    if (els.status) els.status.textContent = "";
    if (els.go) {
      els.go.hidden = !ready;
      els.go.disabled = !ready;
      els.go.textContent = view.evolveLabel ? view.evolveLabel(row) : `Evolve ${row.name}`;
    }
    if (els.cancel) els.cancel.textContent = ready ? "Not now" : "Close";
    document.querySelectorAll(".evo-mon.is-selected").forEach((el) => el.classList.remove("is-selected"));
    const selectedId = String(row.catchId || row.id || "");
    if (selectedId) {
      els.grid?.querySelector(`[data-evo="${selectedId}"]`)?.classList.add("is-selected");
    }
    window.playShowDialog(els.modal);
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function perfMode() {
    if (window.playPerfReduced?.()) return "reduced";
    return window.playPerfMode?.() || "high";
  }

  function showResultCard(overlay, model) {
    overlay.dataset.stage = "result";
    overlay.classList.add("is-result");
    const rewards = [];
    if (model.trainerXp) rewards.push(`+${model.trainerXp} Trainer XP`);
    if (model.masteryFrom) rewards.push(`Species Mastery +${model.masteryFrom} ${model.fromName}`);
    if (model.masteryTo) rewards.push(`Species Mastery +${model.masteryTo} ${model.toName}`);
    if (model.coins) rewards.push(`+${model.coins} PokéCoins`);
    overlay.querySelector("[data-evo-stage]").innerHTML = `
      <p>Congratulations!</p>
      ${sprite(model.toDex, model.variant, 128)}
      <p><strong>Your ${esc(model.fromName)} evolved into ${esc(model.toName)}!</strong></p>
      <p class="evo-result-kicker">Evolution Complete!</p>
      ${model.newDex ? `<p class="evo-dex-fanfare">NEW POKÉDEX ENTRY!<br>#${String(model.toDex).padStart(3, "0")} ${esc(model.toName)} REGISTERED!${model.newDexXp ? `<br>+${model.newDexXp} XP` : ""}</p>` : ""}
      ${rewards.length ? `<ul class="evo-rewards">${rewards.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : ""}
      <p><button type="button" data-evo-continue>Continue</button></p>`;
    overlay.querySelector("[data-evo-skip]")?.closest(".evo-seq-skip")?.remove();
    if (model.newDex) cue("pokedex");
  }

  function showEvoFanfare(result, row) {
    const model = view.resultModel ? view.resultModel(result, row) : { fromName: row.name, toName: row.toName, fromDex: row.dex, toDex: row.toDex, variant: row.variant };
    return new Promise((resolve) => {
      document.querySelector(".evo-fanfare")?.remove();
      const overlay = document.createElement("div");
      overlay.className = "evo-fanfare";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      const mode = perfMode();
      const particles = mode === "high" ? `<i></i><i></i><i></i><i></i><i></i><i></i>` : mode === "balanced" ? `<i></i><i></i>` : "";
      overlay.innerHTML = `
        <div class="evo-seq ${mode === "reduced" || mode === "low" ? "is-simple" : ""}" data-evo-root>
          <div class="evo-seq-stars" aria-hidden="true">${particles}</div>
          <div data-evo-stage></div>
          <p class="evo-seq-skip"><button type="button" class="secondary" data-evo-skip>Skip animation</button></p>
        </div>`;
      document.body.append(overlay);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        overlay.remove();
        resolve();
      };
      overlay.addEventListener("click", (event) => {
        if (event.target.closest("[data-evo-continue]")) finish();
        if (event.target.closest("[data-evo-skip]")) showResultCard(overlay, model);
      });
      const stage = overlay.querySelector("[data-evo-stage]");
      const run = async () => {
        cue("begin");
        if (mode === "low" || mode === "reduced") {
          stage.innerHTML = `${sprite(model.fromDex, model.variant, 120)}<p>${esc(model.fromName)} → ${esc(model.toName)}</p>`;
          await wait(mode === "reduced" ? 280 : 420);
          showResultCard(overlay, model);
          return;
        }
        overlay.dataset.stage = "intro";
        stage.innerHTML = `<p>What?</p>${sprite(model.fromDex, model.variant, 120)}`;
        await wait(mode === "high" ? 800 : 500);
        if (done || overlay.dataset.stage === "result") return;
        stage.innerHTML = `${sprite(model.fromDex, model.variant, 120)}<p><strong>${esc(model.fromName)} is evolving!</strong></p>`;
        overlay.dataset.stage = "build";
        cue("build");
        await wait(mode === "high" ? 1400 : 900);
        if (done || overlay.dataset.stage === "result") return;
        overlay.dataset.stage = "morph";
        stage.innerHTML = `<span class="evo-sil">${sprite(model.fromDex, model.variant, 120)}</span>`;
        await wait(500);
        if (done || overlay.dataset.stage === "result") return;
        stage.innerHTML = `<span class="evo-sil">${sprite(model.toDex, model.variant, 120)}</span>`;
        await wait(500);
        if (done || overlay.dataset.stage === "result") return;
        overlay.dataset.stage = "reveal";
        cue("reveal");
        stage.innerHTML = `<p>Congratulations!</p>${sprite(model.toDex, model.variant, 128)}<p><strong>Your ${esc(model.fromName)} evolved into ${esc(model.toName)}!</strong></p>`;
        await wait(mode === "high" ? 900 : 600);
        if (done || overlay.dataset.stage === "result") return;
        showResultCard(overlay, model);
      };
      run();
    });
  }

  async function evolveOnce() {
    if (!pick || !canEvolve(pick)) return;
    if (!evolveGate.begin()) return;
    if (els.go) els.go.disabled = true;
    if (els.status) els.status.textContent = "Evolving…";
    try {
      const result = await window.playCall("play_evolve", { p_catch: pick.catchId, p_rule: pick.ruleId });
      const model = view.resultModel ? view.resultModel(result, pick) : {};
      if (model.already) {
        if (els.status) els.status.textContent = result.message || "Already evolved.";
        closeModal();
        await load();
        return;
      }
      closeModal();
      await showEvoFanfare(result, pick);
      if (typeof window.playShowNotices === "function") window.playShowNotices();
      await load();
    } catch (error) {
      const raw = window.playHumanRpcError ? window.playHumanRpcError(error) : window.playRpcError(error);
      if (els.status) els.status.textContent = view.humanEvoError ? view.humanEvoError(raw, raw) : raw;
      if (els.go) els.go.disabled = false;
    } finally {
      evolveGate.end();
    }
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to evolve your Pokémon.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app);
    try {
      data = await window.playCall("play_collection");
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playHumanRpcError
        ? window.playHumanRpcError(error, "Evolution is not live yet.")
        : window.playRpcError(error, "Evolution is not live yet.");
    }
  }

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
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return session;
  }

  els.grid?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-evo]");
    if (!card) return;
    const kind = card.dataset.kind;
    if (kind === "terminal") {
      const mon = (data?.owned || []).find((item) => String(item.id) === String(card.dataset.evo));
      if (mon) openPreview({ ...mon, terminal: true, catchId: mon.id });
      return;
    }
    const row = readyRows().find((item) => item.catchId === card.dataset.evo && item.ruleId === card.dataset.rule);
    if (row) openPreview(row);
  });

  els.go?.addEventListener("click", (event) => {
    event.preventDefault();
    evolveOnce();
  });

  els.filters?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    setFilter(chip.dataset.filter);
    renderReady();
  });
  els.search?.addEventListener("input", renderReady);
  els.rareFamily?.addEventListener("change", updateRarePreview);
  els.rareUse?.addEventListener("click", async () => {
    const family = Number(els.rareFamily?.value || 0);
    if (!family || !rareGate.begin()) return;
    if (els.rareUse) els.rareUse.disabled = true;
    if (els.rareStatus) els.rareStatus.textContent = "Using Rare Candy…";
    try {
      const result = await window.playCall("play_use_rare_candy", { p_family: family });
      if (els.rareStatus) els.rareStatus.textContent = result.message || "Rare Candy used.";
      await load();
    } catch (error) {
      if (els.rareStatus) {
        els.rareStatus.textContent = window.playHumanRpcError
          ? window.playHumanRpcError(error, "Rare Candy could not be used.")
          : window.playRpcError(error);
      }
    } finally {
      rareGate.end();
      if (els.rareUse) els.rareUse.disabled = false;
    }
  });
  els.candy?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-family]");
    if (!card) return;
    document.getElementById(`evo-line-${card.dataset.family}`)?.scrollIntoView({ behavior: window.playPerfReduced?.() ? "auto" : "smooth", block: "start" });
  });
  function focusEligible(dex, name) {
    setFilter("all");
    if (els.search) els.search.value = name || "";
    renderReady();
    closeModal();
    els.grid?.scrollIntoView({ behavior: window.playPerfReduced?.() ? "auto" : "smooth", block: "start" });
    const card = els.grid?.querySelector(`.evo-mon[data-dex="${dex}"]`);
    card?.focus();
  }

  els.modal?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-view-eligible]");
    if (!btn) return;
    event.preventDefault();
    const dex = Number(btn.dataset.viewEligible);
    const row = readyRows().find((item) => Number(item.dex) === dex);
    focusEligible(dex, row?.name || pick?.name);
  });

  els.families?.addEventListener("click", (event) => {
    const node = event.target.closest("[data-evo-dex]");
    if (!node) return;
    const dex = Number(node.dataset.evoDex);
    const eligible = readyRows().filter((item) => Number(item.dex) === dex);
    const fam = (data?.families || []).find((item) => (item.members || []).some((member) => Number(member.dex) === dex));
    const member = (fam?.members || []).find((item) => Number(item.dex) === dex);
    const rule = (fam?.next || []).find((item) => Number(item.fromDex) === dex);
    const mastery = (data?.mastery || []).find((item) => Number(item.dex) === dex);
    if (!member) return;
    openPreview({
      terminal: !rule,
      available: false,
      name: member.name,
      dex: member.dex,
      toName: rule?.toName,
      toDex: rule?.toDex,
      haveCandy: fam?.candy || 0,
      candyCost: rule?.cost,
      item: rule?.item,
      familyName: fam?.name,
      ownedCopies: member.owned,
      pokedex: member.pokedex,
      mastery,
      eligibleCount: eligible.length
    });
  });
  window.playBindTips?.(document.body);
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
