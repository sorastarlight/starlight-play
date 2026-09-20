(() => {
  const supabase = window.playSupabase;
  const view = window.playEvoView || {};
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("evo-app"),
    tabs: document.getElementById("evo-stations") || document.querySelector(".evo-lab-stations"),
    tabSend: document.getElementById("evo-tab-send"),
    tabEvolve: document.getElementById("evo-tab-evolve"),
    grid: document.getElementById("evo-grid"),
    sendGrid: document.getElementById("evo-send-grid"),
    sendSearch: document.getElementById("evo-send-search"),
    sendSort: document.getElementById("evo-send-sort"),
    sendGo: document.getElementById("evo-send-go"),
    sendNote: document.getElementById("evo-send-note"),
    sendStatus: document.getElementById("evo-send-status"),
    xferAvailable: document.getElementById("evo-xfer-available"),
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
    sort: document.getElementById("evo-sort"),
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
    status: document.getElementById("evo-status"),
    oakModal: document.getElementById("oak-lab-modal"),
    oakSprites: document.getElementById("oak-lab-sprites"),
    oakCopy: document.getElementById("oak-lab-copy"),
    oakBubble: document.getElementById("evo-oak-bubble")
  };
  let data = null;
  let storage = null;
  let pick = null;
  let rareIdem = "";
  let activeTab = "send";
  const selectedOak = new Set();
  let pendingOakIds = [];
  let trainerCard = null;
  const evolveGate = view.pendingGuard ? view.pendingGuard() : { begin() { return true; }, end() {}, busy: false };
  const rareGate = view.pendingGuard ? view.pendingGuard() : { begin() { return true; }, end() {}, busy: false };
  const oakGate = view.pendingGuard ? view.pendingGuard() : { begin() { return true; }, end() {}, busy: false };

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to visit Prof. Oak's Lab.");
    }
  });

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function cue(name) {
    try { window.playEvoCue?.(name); } catch (_) {}
  }

  function sprite(dex, variant, size, gender) {
    const resolved = view.displayVariant
      ? view.displayVariant({ variant, gender }, dex)
      : (variant || "normal");
    const src = window.playSpriteUrl(dex, resolved);
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
    return els.filter?.value || "all";
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

  function dexLabel(dex) {
    return dex != null ? `#${String(dex).padStart(3, "0")}` : "";
  }

  function readyRows() {
    return data?.ready || [];
  }

  function storageMons() {
    return Array.isArray(storage?.mons) ? storage.mons : [];
  }

  function ownedCounts() {
    const counts = new Map();
    for (const mon of storageMons()) {
      const dex = Number(mon.dex);
      counts.set(dex, (counts.get(dex) || 0) + 1);
    }
    if (!counts.size) {
      for (const mon of data?.owned || []) {
        const dex = Number(mon.dex);
        counts.set(dex, (counts.get(dex) || 0) + 1);
      }
    }
    return counts;
  }

  function oakBlockReason(mon, counts) {
    if (mon.onTeam) return "On team";
    if (mon.listed) return "Listed for trade";
    if (mon.locked) return "Locked";
    if (mon.favorite) return "Favorite";
    if ((counts.get(Number(mon.dex)) || 0) <= 1) return "Keep for Living Dex";
    return "";
  }

  function sendableMons() {
    const counts = ownedCounts();
    const source = storageMons().length ? storageMons() : (data?.owned || []);
    return source.map((mon) => {
      const reason = oakBlockReason(mon, counts);
      return { ...mon, oakBlocked: Boolean(reason), oakReason: reason };
    });
  }

  function setOakBubble(text) {
    if (!els.oakBubble || !text) return;
    els.oakBubble.textContent = text;
  }

  function refreshOakBubble() {
    const tally = counts();
    if (activeTab === "send") {
      if (selectedOak.size > 0) {
        setOakBubble("Excellent! These Pokémon are ready for transfer.");
        return;
      }
      setOakBubble("Have any duplicate Pokémon? Send them my way for research!");
      return;
    }
    if (tally.ready > 0) {
      setOakBubble("Ah! One of your Pokémon is ready to evolve!");
      return;
    }
    setOakBubble("Let's see which Pokémon are ready to evolve!");
  }

  function setTab(tab) {
    activeTab = tab === "evolve" ? "evolve" : "send";
    const sendOn = activeTab === "send";
    els.tabs?.querySelectorAll("[data-tab]").forEach((btn) => {
      const on = btn.dataset.tab === activeTab;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
      btn.classList.toggle("is-active", on);
      const state = btn.querySelector(".evo-station-state");
      if (state) state.textContent = on ? "ONLINE" : "STANDBY";
    });
    if (els.tabSend) els.tabSend.hidden = !sendOn;
    if (els.tabEvolve) els.tabEvolve.hidden = sendOn;
    document.body.dataset.labStation = activeTab;
    refreshOakBubble();
    try {
      const url = new URL(window.location.href);
      url.hash = activeTab;
      window.history.replaceState(null, "", url);
    } catch (_) {}
  }

  function counts() {
    const rows = readyRows();
    const owned = data?.owned || [];
    return {
      ready: rows.filter(canEvolve).length,
      all: rows.length + owned.filter((mon) => !mon.canEvolve).length,
      candy: rows.filter((row) => view.matchesFilter(row, "candy")).length,
      item: rows.filter((row) => view.matchesFilter(row, "item")).length,
      trade: rows.filter((row) => view.matchesFilter(row, "trade")).length
    };
  }

  function renderHero() {
    const tally = counts();
    const candyTotal = Number(data?.stats?.candyTotal || 0);
    if (els.readyCount) els.readyCount.textContent = String(tally.ready);
    if (els.candyCount) els.candyCount.textContent = String(candyTotal);
    if (els.doneCount) els.doneCount.textContent = String(data?.stats?.evolved || 0);
    if (els.strip) els.strip.hidden = true;
    const eligible = sendableMons().filter((mon) => !mon.oakBlocked).length;
    if (els.xferAvailable) els.xferAvailable.textContent = String(eligible);
    els.filters?.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = String(tally[el.dataset.count] || 0);
    });
    if (els.note) {
      els.note.textContent = tally.ready
        ? `${tally.ready} ready · ${candyTotal} Evolution Candy`
        : `0 ready · ${candyTotal} Evolution Candy`;
    }
    refreshOakBubble();
  }

  function statusFooter(row, terminal) {
    if (terminal) return `<span class="evo-foot is-done">Fully Evolved</span>`;
    const kind = view.cardKind ? view.cardKind(row) : (canEvolve(row) ? "ready" : "blocked");
    if (kind === "ready") return `<span class="evo-foot is-ready">Ready to Evolve <i aria-hidden="true">→</i></span>`;
    if (kind === "locked") return `<span class="evo-foot is-warn">Locked</span>`;
    if (kind === "reserved") return `<span class="evo-foot is-warn">Trade reserved</span>`;
    if (view.matchesFilter?.(row, "candy")) {
      const need = Number(row.candyCost || 0);
      return `<span class="evo-foot is-candy">Needs Candy <strong>x ${need}</strong></span>`;
    }
    if (view.matchesFilter?.(row, "item")) {
      return `<span class="evo-foot is-item">Needs ${esc(itemLabel(row.item) || "Item")}</span>`;
    }
    if (view.matchesFilter?.(row, "trade")) {
      return `<span class="evo-foot is-trade">Trade Evolution</span>`;
    }
    return `<span class="evo-foot is-wait">Not ready yet</span>`;
  }

  function cardHtml(row, terminal) {
    const kind = view.cardKind ? view.cardKind(row) : (canEvolve(row) ? "ready" : "blocked");
    const shiny = view.isShiny?.(row);
    const ready = kind === "ready";
    const need = view.candyNeed ? view.candyNeed(row) : 0;
    const label = terminal
      ? `${row.name}. No evolution currently available.`
      : `${ready ? "Ready to evolve. " : ""}${shiny ? "Shiny " : ""}${row.name}${row.level ? ` level ${row.level}` : ""} into ${row.toName || ""}.`;
    const candy = terminal ? "" : `${Number(row.haveCandy || 0)} / ${Number(row.candyCost || 0)} Evolution Candy`;
    const item = row.item ? `${itemLabel(row.item)} ${row.haveItem || row.tradeReady ? "✓" : "✕"}` : "";
    return `
      <button type="button" class="evo-mon is-${kind}${ready ? " is-ready" : ""}${terminal ? " is-terminal" : ""}" data-evo="${esc(row.catchId || row.id || "")}" data-rule="${esc(row.ruleId || "")}" data-kind="${kind}" data-dex="${row.dex || ""}" aria-label="${esc(label)}">
        <span class="evo-mon-ball" aria-hidden="true"></span>
        <span class="evo-mon-art">${sprite(row.dex, row.variant || "normal", 96, row.gender)}</span>
        <strong class="evo-mon-name">${dexLabel(row.dex)} ${shiny ? "✨ " : ""}${esc(row.name)} ${genderMark(row.gender)}</strong>
        <span class="muted">${row.level ? `Lv. ${row.level}` : ""}${row.favorite ? " ★ Favorite" : ""}</span>
        ${row.toName ? `<span class="evo-arrow-lite" aria-hidden="true">↓</span><span class="evo-target">${esc(row.toName)}</span>` : ""}
        ${candy ? `<span class="evo-cost">${esc(candy)}${item ? ` · ${esc(item)}` : ""}${!ready && need ? ` · ${need} more needed` : ""}</span>` : ""}
        ${statusFooter(row, terminal)}
      </button>`;
  }

  function sortRows(rows, mode) {
    const list = rows.slice();
    if (mode === "name") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")) || (a.dex || 0) - (b.dex || 0));
    } else if (mode === "dex-desc") {
      list.sort((a, b) => (b.dex || 0) - (a.dex || 0));
    } else if (mode === "ready") {
      list.sort((a, b) => Number(canEvolve(b)) - Number(canEvolve(a)) || (a.dex || 0) - (b.dex || 0));
    } else {
      list.sort((a, b) => (a.dex || 0) - (b.dex || 0));
    }
    return list;
  }

  function renderReady() {
    const filter = currentFilter();
    const q = els.search?.value || "";
    const rows = sortRows(
      readyRows().filter((row) => (view.matchesFilter ? view.matchesFilter(row, filter, q) : true)),
      els.sort?.value || "dex-asc"
    );
    const cards = rows.map((row) => cardHtml(row, false));
    if (filter === "all") {
      const terminals = (data?.owned || []).filter((mon) => !mon.canEvolve).map((mon) => ({ ...mon, terminal: true, catchId: mon.id }));
      sortRows(
        terminals.filter((mon) => (view.matchesFilter ? view.matchesFilter(mon, "all", q) : true)),
        els.sort?.value || "dex-asc"
      ).forEach((mon) => cards.push(cardHtml(mon, true)));
    }
    const empty = `<div class="evo-empty evo-empty-lab">
      <img class="evo-empty-oak" src="images/trainers/portraits/oak-portrait.png" alt="" width="88" height="88" decoding="async" aria-hidden="true">
      <p><strong>Professor Oak</strong> is ready when you are.</p>
      <p class="muted">Catch duplicate Pokémon from the same Evolution Line, then send them to Professor Oak for Evolution Candy.</p>
      <p class="muted">Use Candy—and Stones or Linking Cords from the <a href="./store.html#evolution">Starlight Mart</a>—to evolve Pokémon you already own.</p>
      <p><button type="button" class="button secondary" data-switch-tab="send">Send to Oak</button></p>
    </div>`;
    els.grid.innerHTML = cards.join("") || empty;
    let fanfare = 0;
    els.grid.querySelectorAll(".evo-mon.is-ready").forEach((card) => {
      if (fanfare < 4) card.classList.add("is-fanfare");
      fanfare += 1;
    });
  }

  function sendCardHtml(mon) {
    const id = String(mon.id);
    const selected = selectedOak.has(id);
    const blocked = Boolean(mon.oakBlocked);
    const shiny = String(mon.variant || "").includes("shiny");
    const label = blocked
      ? `${mon.name}. ${mon.oakReason}.`
      : `${selected ? "Selected. " : ""}${shiny ? "Shiny " : ""}${mon.name}. Send to Professor Oak for Evolution Candy.`;
    return `
      <button type="button" class="evo-mon evo-send-card${selected ? " is-selected" : ""}${blocked ? " is-blocked" : ""}" data-oak-id="${esc(id)}" data-dex="${mon.dex || ""}" ${blocked ? "disabled" : ""} aria-pressed="${selected ? "true" : "false"}" aria-label="${esc(label)}">
        <span class="evo-mon-ball" aria-hidden="true"></span>
        <span class="evo-mon-art">${sprite(mon.dex, mon.variant || "normal", 96, mon.gender)}</span>
        <strong class="evo-mon-name">${dexLabel(mon.dex)} ${shiny ? "✨ " : ""}${esc(mon.name || mon.nickname || "Pokémon")} ${genderMark(mon.gender)}</strong>
        <span class="muted">${mon.level ? `Lv. ${mon.level}` : ""}${mon.favorite ? " ★" : ""}</span>
        <span class="evo-foot ${blocked ? "is-warn" : selected ? "is-ready" : "is-candy"}">${blocked ? esc(mon.oakReason) : selected ? "Selected for Oak" : "Tap to select"}</span>
      </button>`;
  }

  function renderSend() {
    if (!els.sendGrid) return;
    const q = String(els.sendSearch?.value || "").trim().toLowerCase();
    let rows = sendableMons();
    if (q) {
      rows = rows.filter((mon) => [mon.name, mon.nickname, mon.gender, mon.variant, String(mon.dex)]
        .join(" ")
        .toLowerCase()
        .includes(q));
    }
    rows = sortRows(rows, els.sendSort?.value || "dex-asc");
    const live = new Set(rows.map((mon) => String(mon.id)));
    for (const id of [...selectedOak]) {
      if (!live.has(id) || rows.find((mon) => String(mon.id) === id)?.oakBlocked) selectedOak.delete(id);
    }
    const eligible = rows.filter((mon) => !mon.oakBlocked).length;
    if (els.xferAvailable) els.xferAvailable.textContent = String(eligible);
    if (els.sendNote) {
      els.sendNote.textContent = eligible
        ? `${eligible} available · ${selectedOak.size} selected`
        : "0 available · catch duplicates to research";
    }
    if (els.sendGo) {
      els.sendGo.disabled = selectedOak.size < 1;
      els.sendGo.textContent = selectedOak.size
        ? `Send ${selectedOak.size} to Oak`
        : "Send 0 to Oak";
      els.sendGo.classList.toggle("is-armed", selectedOak.size > 0);
    }
    const empty = `<div class="evo-empty evo-empty-lab">
      <img class="evo-empty-oak" src="images/trainers/portraits/oak-portrait.png" alt="" width="88" height="88" decoding="async" aria-hidden="true">
      <p><strong>No duplicates to send yet.</strong></p>
      <p class="muted">Catch extra Pokémon from an Evolution Line, keep one for your Living Dex, then send the rest to Oak for Evolution Candy.</p>
      <p><a class="button secondary" href="./">Play</a></p>
    </div>`;
    els.sendGrid.innerHTML = rows.map(sendCardHtml).join("") || empty;
    refreshOakBubble();
  }

  function nodeHtml(member) {
    const owned = Number(member.owned || 0) > 0;
    const seen = Boolean(member.pokedex);
    const locked = Boolean(member.locked || member.unavailable || member.futureLocked);
    return `<button type="button" class="evo-node${owned ? " is-owned" : ""}${locked ? " is-locked" : ""}" data-evo-dex="${member.dex}"${locked ? ' aria-label="' + esc((member.name || "Pokémon") + " locked") + '"' : ""}>
      ${sprite(member.dex, "normal", 56)}
      <strong>${esc(member.name)}</strong>
      <span>${locked ? "LOCKED" : owned ? "Owned" : seen ? "Pokédex" : "Unseen"} · ${member.owned || 0}</span>
    </button>`;
  }

  function lockedRelativeNote(fam) {
    const list = fam?.lockedRelatives || fam?.lockedFuture || fam?.futureLocked || fam?.lockedMembers;
    if (Array.isArray(list) && list.length) {
      return `<p class="evo-locked-note muted">LOCKED · Later generations</p>`;
    }
    if (fam?.lockedHint || fam?.hasLockedRelatives) {
      return `<p class="evo-locked-note muted">LOCKED</p>`;
    }
    return "";
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
        graph = `<div class="evo-line">${(layout.nodes || members).map((member, index, list) => `${nodeHtml(member)}${index < list.length - 1 ? `<span class="evo-arrow" aria-hidden="true">→</span>` : ""}`).join("")}</div>`;
      }
      return `
        <article class="card body family-card" id="evo-line-${fam.familyId}">
          <h3>${esc(fam.name)} Evolution Line</h3>
          <p><strong>Evolution Candy:</strong> ${fam.candy || 0}</p>
          ${graph || "<p class=\"muted\">No stages to show.</p>"}
          ${lockedRelativeNote(fam)}
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
      </button>`).join("") || `<p class="muted">Send Pokémon to Professor Oak to earn Evolution Candy.</p>`;
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
    renderSend();
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
        if (!qty) bits.push(`<p><a class="button secondary" href="${view.martHref("linkingcord")}">Find in Starlight Mart</a></p>`);
      } else if (row.item) {
        const qty = view.itemQty ? view.itemQty(row) : (row.haveItem ? 1 : 0);
        bits.push(`<p>${esc(itemLabel(row.item))}<br>1 / 1 ${qty ? "✓" : "✕"}</p>`);
        if (!qty) bits.push(`<p>You need a ${esc(itemLabel(row.item))}.</p><p><a class="button secondary" href="${view.martHref(row.item)}">Find in Starlight Mart</a></p>`);
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
    const fromDex = row.dex != null ? dexLabel(row.dex) : "";
    const toDex = row.toDex != null ? dexLabel(row.toDex) : "";
    els.detail.innerHTML = `
      <div class="evo-preview-stage${shiny ? " is-shiny" : ""}">
        ${shiny ? `<p class="evo-shiny-banner">✨ Shiny Pokémon ✨</p>` : ""}
        <p class="evo-preview-from"><strong>${esc(fromName)}</strong>${fromDex ? ` · ${fromDex}` : ""}${row.level ? ` · Lv. ${row.level}` : ""} ${genderMark(row.gender)}</p>
        ${sprite(row.dex, row.variant || "normal", 112, row.gender)}
        ${toName ? `<p class="evo-arrow-lite" aria-hidden="true">↓</p>${sprite(row.toDex, row.variant || "normal", 112, row.gender)}<p><strong>${esc(toName)}</strong>${toDex ? ` · ${toDex}` : ""}</p>` : ""}
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
      ${row.favorite ? `<p>★ Favorite Pokémon<br>This exact Pokémon will remain your Pokémon after Evolution.</p>` : ""}
      ${ready ? `<p>${esc(row.name)} will evolve into ${esc(row.toName)}. This cannot be reversed.</p>` : ""}`;
    if (els.status) els.status.textContent = "";
    if (els.go) {
      els.go.hidden = !ready;
      els.go.disabled = !ready;
      els.go.textContent = view.evolveLabel ? view.evolveLabel(row) : `Evolve ${row.name}`;
    }
    if (els.cancel) els.cancel.textContent = ready ? "Not now" : "Close";
    document.querySelectorAll("#evo-grid .evo-mon.is-selected").forEach((el) => el.classList.remove("is-selected"));
    const selectedId = String(row.catchId || row.id || "");
    if (selectedId) {
      els.grid?.querySelector(`[data-evo="${selectedId}"]`)?.classList.add("is-selected");
    }
    window.playShowDialog(els.modal);
  }

  function openOakConfirm(ids) {
    const mons = sendableMons().filter((mon) => ids.includes(String(mon.id)) && !mon.oakBlocked);
    if (!mons.length || !els.oakModal) return;
    pendingOakIds = mons.map((mon) => String(mon.id));
    const model = window.playOakTransfer?.confirmModel
      ? window.playOakTransfer.confirmModel(mons)
      : { count: mons.length, names: mons.map((m) => m.name), rewardHint: "You'll receive Evolution Candy.", leaveHint: "This Pokémon will leave your collection." };
    if (els.oakSprites) {
      els.oakSprites.innerHTML = mons.slice(0, 8).map((mon) => {
        const src = window.playOakTransfer?.spriteUrl
          ? window.playOakTransfer.spriteUrl(mon)
          : window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
        return `<img src="${esc(src)}" alt="${esc(mon.name || "")}" width="64" height="64">`;
      }).join("");
    }
    if (els.oakCopy) {
      const lines = mons.slice(0, 4).map((mon) => {
        const shiny = String(mon.variant || "").includes("shiny") ? "✨ " : "";
        return `${shiny}${mon.name}${mon.level ? ` Lv. ${mon.level}` : ""}`;
      });
      const extra = mons.length > 4 ? `<li>…and ${mons.length - 4} more</li>` : "";
      els.oakCopy.innerHTML = `
        <ul class="oak-confirm-list">${lines.map((line) => `<li>${esc(line)}</li>`).join("")}${extra}</ul>
        <p>${esc(model.rewardHint)}</p>
        <p class="muted">${esc(model.leaveHint)}</p>`;
    }
    if (typeof els.oakModal.showModal === "function") els.oakModal.showModal();
    else els.oakModal.setAttribute("open", "");
  }

  async function transferSelected() {
    if (!pendingOakIds.length || !oakGate.begin()) return;
    if (els.sendStatus) els.sendStatus.textContent = "Sending to Professor Oak…";
    if (els.sendGo) els.sendGo.disabled = true;
    const wanted = pendingOakIds.slice();
    const byId = new Map(sendableMons().map((mon) => [String(mon.id), mon]));
    const successes = [];
    const failures = [];
    try {
      for (const id of wanted) {
        const mon = byId.get(id);
        try {
          const result = await window.playCall("play_transfer_oak", { p_catch_id: id });
          successes.push({
            ok: true,
            id,
            mon,
            candyGranted: Number(result.candyGranted || 0),
            familyId: Number(result.familyId || 0),
            candyBaseDex: Number(result.candyBaseDex || 0),
            candyName: result.candyName || "",
            message: result.message || ""
          });
          selectedOak.delete(id);
        } catch (error) {
          failures.push({
            id,
            mon,
            error: window.playHumanRpcError
              ? window.playHumanRpcError(error, "Could not send that Pokémon to Oak.")
              : window.playRpcError(error)
          });
        }
      }
      pendingOakIds = [];

      if (!successes.length) {
        if (els.sendStatus) {
          els.sendStatus.textContent = failures[0]?.error || "Transfer failed.";
        }
        await load();
        return;
      }

      // Animation only after authoritative success — never invents candy or deletes.
      if (window.playOakTransfer?.runSequence) {
        const sprite = trainerCard?.trainerSprite || window._playTrainerSprite || "";
        if (sprite) window._playTrainerSprite = sprite;
        await window.playOakTransfer.runSequence({
          results: successes,
          families: data?.families || [],
          trainerSprite: sprite,
          trainer: trainerCard
        });
      }
      setOakBubble("Excellent! This research should help us understand its Evolution Line.");

      if (els.sendStatus) {
        if (failures.length) {
          els.sendStatus.textContent = `Sent ${successes.length}. ${failures.length} could not be sent: ${failures[0].error}`;
        } else {
          const last = successes[successes.length - 1];
          els.sendStatus.textContent = successes.length > 1
            ? `Sent ${successes.length} Pokémon to Oak.`
            : (last.message || "Sent to Professor Oak.");
        }
      }
      setTab("send");
      await load();
    } catch (error) {
      if (els.sendStatus) {
        els.sendStatus.textContent = window.playHumanRpcError
          ? window.playHumanRpcError(error, "Could not send that Pokémon to Oak.")
          : window.playRpcError(error);
      }
      await load();
    } finally {
      oakGate.end();
      if (els.sendGo) els.sendGo.disabled = selectedOak.size < 1;
    }
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function perfMode() {
    if (window.playPerfReduced?.()) return "reduced";
    return window.playPerfMode?.() || "high";
  }

  function showEvoFanfare(result, row) {
    const model = view.resultModel ? view.resultModel(result, row) : {
      fromName: row.name, toName: row.toName, fromDex: row.dex, toDex: row.toDex,
      variant: row.variant, gender: row.gender, fromFormId: row.formId, toFormId: row.toFormId
    };
    const lines = view.dialogueLines ? view.dialogueLines(model) : {
      what: "What?",
      evolving: `${model.fromName} is evolving!`,
      congrats: "Congratulations!",
      done: `Your ${model.fromName} evolved into ${model.toName}!`
    };
    const panel = view.resultPanel ? view.resultPanel(model) : {
      title: "EVOLUTION COMPLETE!",
      extras: [],
      newDex: model.newDex,
      dexLabel: "",
      pages: [{ line1: lines.congrats, line2: lines.done }]
    };
    const pages = Array.isArray(panel.pages) && panel.pages.length
      ? panel.pages
      : (view.resultPages ? view.resultPages(model) : [{ line1: lines.congrats, line2: lines.done }]);
    const shiny = view.isShiny?.(model) || String(model.variant || "").includes("shiny");
    const fromArt = view.displayVariant ? view.displayVariant(model, model.fromDex) : model.variant;
    const toArt = view.displayVariant ? view.displayVariant(model, model.toDex) : model.variant;
    const fromUrl = window.playSpriteUrl(model.fromDex, fromArt, model.fromFormId);
    const toUrl = window.playSpriteUrl(model.toDex, toArt, model.toFormId);
    return new Promise((resolve) => {
      document.querySelector(".evo-fanfare")?.remove();
      const overlay = document.createElement("div");
      overlay.className = `evo-fanfare is-lab is-classic-gba${shiny ? " is-shiny-seq" : ""}`;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Evolution");
      const mode = perfMode();
      const reduced = mode === "reduced" || mode === "low";
      const sparkCount = mode === "high" ? 10 : mode === "balanced" ? 5 : 0;
      const sparks = Array.from({ length: sparkCount }, () => "<i></i>").join("");
      overlay.innerHTML = `
        <div class="evo-gba evo-gba-lab evo-gba-classic ${reduced ? "is-simple" : ""}" data-evo-root tabindex="0">
          <div class="evo-field evo-field-black" data-evo-stage>
            <div class="evo-sparks" aria-hidden="true">${sparks}</div>
            <div class="evo-actor" data-evo-actor>
              <img class="evo-sprite evo-from is-on" src="${esc(fromUrl)}" alt="${esc(model.fromName || "")}" width="112" height="112" decoding="async" data-evo-from>
              <img class="evo-sprite evo-to" src="${esc(toUrl)}" alt="${esc(model.toName || "")}" width="112" height="112" decoding="async" data-evo-to aria-hidden="true">
            </div>
            <div class="evo-actor-flash" aria-hidden="true"></div>
          </div>
          <div class="evo-dialogue evo-dialogue-gba" aria-live="polite" data-evo-dialogue>
            <p data-evo-line1></p>
            <p data-evo-line2></p>
          </div>
        </div>`;
      document.body.classList.add("evo-playing");
      document.body.append(overlay);
      const root = overlay.querySelector("[data-evo-root]");
      root?.focus();
      let done = false;
      let phase = "anim"; // anim | typing | wait | closing
      let pageIndex = 0;
      let typeToken = 0;
      let pageToken = 0;
      let skipAnim = false;
      let finishTyping = false;
      let resultStarted = false;
      const dialogue = overlay.querySelector("[data-evo-dialogue]");
      const line1 = overlay.querySelector("[data-evo-line1]");
      const line2 = overlay.querySelector("[data-evo-line2]");
      const actor = overlay.querySelector("[data-evo-actor]");
      const fromImg = overlay.querySelector("[data-evo-from]");
      const toImg = overlay.querySelector("[data-evo-to]");

      const finish = () => {
        if (done) return;
        done = true;
        phase = "closing";
        document.removeEventListener("keydown", onKey);
        overlay.removeEventListener("click", onClick);
        document.body.classList.remove("evo-playing");
        overlay.remove();
        resolve();
      };

      const setWaiting = (on) => {
        dialogue?.classList.toggle("is-waiting", Boolean(on));
      };

      const setLines = (first, second) => {
        if (line1) line1.textContent = first || "";
        if (line2) line2.textContent = second || "";
      };

      const showWhich = (which, sil) => {
        const showTo = which === "to";
        fromImg?.classList.toggle("is-on", !showTo);
        toImg?.classList.toggle("is-on", showTo);
        fromImg?.setAttribute("aria-hidden", showTo ? "true" : "false");
        toImg?.setAttribute("aria-hidden", showTo ? "false" : "true");
        actor?.classList.toggle("is-sil", Boolean(sil));
        actor?.classList.toggle("is-reveal", !sil && showTo);
      };

      const softFlash = async (ms) => {
        if (reduced) return;
        actor?.classList.add("is-bright");
        await wait(ms || 160);
        actor?.classList.remove("is-bright");
      };

      const typeText = async (el, text) => {
        const token = ++typeToken;
        const full = String(text || "");
        if (!el) return;
        el.textContent = "";
        if (reduced || !full) {
          el.textContent = full;
          return;
        }
        finishTyping = false;
        for (let i = 0; i < full.length; i += 1) {
          if (done || token !== typeToken) return;
          if (finishTyping || skipAnim) {
            el.textContent = full;
            return;
          }
          el.textContent = full.slice(0, i + 1);
          await wait(28);
        }
      };

      const typePage = async (page) => {
        const token = ++pageToken;
        phase = "typing";
        setWaiting(false);
        finishTyping = false;
        setLines("", "");
        await typeText(line1, page?.line1 || "");
        if (done || token !== pageToken) return;
        if (finishTyping) {
          setLines(page?.line1 || "", page?.line2 || "");
          phase = "wait";
          setWaiting(true);
          return;
        }
        await typeText(line2, page?.line2 || "");
        if (done || token !== pageToken) return;
        phase = "wait";
        setWaiting(true);
      };

      const beginResultFlow = async () => {
        if (done || resultStarted || phase === "closing") return;
        resultStarted = true;
        skipAnim = true;
        actor?.classList.remove("is-bright", "is-sil");
        overlay.dataset.stage = "result";
        overlay.classList.add("is-finale");
        overlay.setAttribute("aria-label", "Evolution complete");
        showWhich("to", false);
        cue("reveal");
        if (model.newDex) cue("pokedex");
        pageIndex = 0;
        await typePage(pages[0] || { line1: lines.congrats, line2: lines.done });
      };

      const advanceResult = async () => {
        if (done) return;
        if (phase === "typing") {
          finishTyping = true;
          typeToken += 1;
          pageToken += 1;
          const page = pages[pageIndex] || {};
          setLines(page.line1 || "", page.line2 || "");
          phase = "wait";
          setWaiting(true);
          return;
        }
        if (phase !== "wait") return;
        pageIndex += 1;
        if (pageIndex >= pages.length) {
          finish();
          return;
        }
        await typePage(pages[pageIndex]);
      };

      const onClick = (event) => {
        if (event.button != null && event.button !== 0) return;
        event.preventDefault();
        if (done) return;
        if (phase === "anim") {
          beginResultFlow();
          return;
        }
        advanceResult();
      };

      const onKey = (event) => {
        if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (done) return;
          if (phase === "anim") {
            beginResultFlow();
            return;
          }
          advanceResult();
        }
      };

      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", onClick);

      const stopped = () => done || skipAnim || overlay.dataset.stage === "result";
      const pulsePairs = async (pairs, holdMs) => {
        for (let i = 0; i < pairs; i += 1) {
          showWhich("from", true);
          await wait(holdMs);
          if (stopped()) return false;
          showWhich("to", true);
          await wait(holdMs);
          if (stopped()) return false;
        }
        return true;
      };

      const run = async () => {
        cue("begin");
        overlay.dataset.stage = "intro";
        phase = "anim";
        showWhich("from", false);
        setLines(lines.what, "");
        await wait(reduced ? 220 : 700);
        if (stopped()) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }
        setLines(lines.what, lines.evolving);
        await wait(reduced ? 280 : 800);
        if (stopped()) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }

        if (reduced) {
          overlay.dataset.stage = "build";
          showWhich("from", true);
          await wait(320);
          if (stopped()) {
            if (!done && phase === "anim") await beginResultFlow();
            return;
          }
          overlay.dataset.stage = "morph";
          showWhich("to", true);
          await wait(320);
          if (stopped()) {
            if (!done && phase === "anim") await beginResultFlow();
            return;
          }
          overlay.dataset.stage = "reveal";
          showWhich("to", false);
          await wait(420);
          if (!done) await beginResultFlow();
          return;
        }

        overlay.dataset.stage = "build";
        cue("build");
        showWhich("from", true);
        await wait(mode === "high" ? 1000 : 750);
        if (stopped()) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }

        overlay.dataset.stage = "morph";
        overlay.classList.add("is-sparking");
        const slowHold = mode === "high" ? 420 : 340;
        const midHold = mode === "high" ? 210 : 170;
        const fastHold = mode === "high" ? 105 : 90;
        if (!(await pulsePairs(mode === "high" ? 3 : 2, slowHold))) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }
        if (!(await pulsePairs(mode === "high" ? 4 : 3, midHold))) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }
        if (!(await pulsePairs(mode === "high" ? 6 : 5, fastHold))) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }

        overlay.dataset.stage = "climax";
        showWhich("to", true);
        await softFlash(mode === "high" ? 220 : 160);
        if (stopped()) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }
        await wait(mode === "high" ? 380 : 280);
        if (stopped()) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }
        await softFlash(mode === "high" ? 180 : 120);
        if (stopped()) {
          if (!done && phase === "anim") await beginResultFlow();
          return;
        }

        overlay.dataset.stage = "reveal";
        overlay.classList.add("is-finale");
        showWhich("to", false);
        await wait(mode === "high" ? 1700 : 1200);
        if (!done) await beginResultFlow();
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
      setOakBubble("Wonderful! Another successful evolution!");
      if (typeof window.playShowNotices === "function") {
        window.playShowNotices({
          source: "evolution",
          suppressKinds: ["evolution"],
          suppressTypes: model.newDex ? ["pokedex"] : [],
          species: model.toDex,
          variant: model.variant,
          gender: model.gender,
          noSummary: true
        });
      }
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
      window.playRestoreGate(els.gate, "Sign in to visit Prof. Oak's Lab.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
    try {
      const [collection, boxes] = await Promise.all([
        window.playCall("play_collection"),
        window.playCall("play_storage").catch(() => null)
      ]);
      data = collection;
      storage = boxes;
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playHumanRpcError
        ? window.playHumanRpcError(error, "Prof. Oak's Lab is not live yet.")
        : window.playRpcError(error, "Prof. Oak's Lab is not live yet.");
    }
  }

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, username").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      trainerCard = snapshot?.trainer || null;
      if (trainerCard?.trainerSprite) window._playTrainerSprite = trainerCard.trainerSprite;
      window._playTrainerName = trainerCard?.displayName || profile?.display_name || "";
      window._playTrainerLogin = trainerCard?.twitchLogin || trainerCard?.login || profile?.twitch_login || profile?.username || "";
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return session;
  }

  const hashTab = String(window.location.hash || "").replace(/^#/, "");
  setTab(hashTab === "evolve" ? "evolve" : "send");

  els.tabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (!tab) return;
    setTab(tab.dataset.tab);
  });

  els.tabs?.addEventListener("keydown", (event) => {
    const tabs = [...(els.tabs?.querySelectorAll("[data-tab]") || [])];
    if (!tabs.length) return;
    const current = tabs.findIndex((btn) => btn.getAttribute("aria-selected") === "true");
    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].dataset.tab);
    tabs[next].focus();
  });

  els.app?.addEventListener("click", (event) => {
    const switcher = event.target.closest("[data-switch-tab]");
    if (!switcher) return;
    event.preventDefault();
    setTab(switcher.dataset.switchTab);
  });

  els.sendGrid?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-oak-id]");
    if (!card || card.disabled) return;
    const id = card.dataset.oakId;
    if (selectedOak.has(id)) selectedOak.delete(id);
    else selectedOak.add(id);
    renderSend();
  });

  els.sendGo?.addEventListener("click", () => {
    openOakConfirm([...selectedOak]);
  });

  els.sendSearch?.addEventListener("input", renderSend);
  els.sendSort?.addEventListener("change", renderSend);

  els.oakModal?.addEventListener("click", (event) => {
    if (event.target === els.oakModal) els.oakModal.close("cancel");
  });
  els.oakModal?.addEventListener("close", () => {
    if (els.oakModal.returnValue !== "transfer" || !pendingOakIds.length) {
      pendingOakIds = [];
      return;
    }
    transferSelected();
  });

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
  els.sort?.addEventListener("change", renderReady);
  els.rareFamily?.addEventListener("change", updateRarePreview);
  els.rareUse?.addEventListener("click", async () => {
    const family = Number(els.rareFamily?.value || 0);
    if (!family || !rareGate.begin()) return;
    if (!rareIdem) rareIdem = view.newIdempotency ? view.newIdempotency() : `${Date.now()}`;
    if (els.rareUse) els.rareUse.disabled = true;
    if (els.rareStatus) els.rareStatus.textContent = "Using Rare Candy…";
    try {
      const result = await window.playCall("play_use_rare_candy", { p_family: family, p_idem: rareIdem });
      rareIdem = "";
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
