(() => {
  const supabase = window.playSupabase;
  const view = window.playEvoView || {};
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("evo-app"),
    tabs: document.getElementById("evo-stations") || document.querySelector(".evo-lab-stations"),
    tabSend: document.getElementById("evo-tab-send"),
    tabEvolve: document.getElementById("evo-tab-evolve"),
    tabResearch: document.getElementById("evo-tab-research"),
    researchBoard: document.getElementById("oak-research-board"),
    researchTracklist: document.getElementById("oak-research-tracklist"),
    researchSummary: document.getElementById("oak-research-summary"),
    researchClaimable: document.getElementById("evo-research-claimable"),
    researchClaimableBadge: document.getElementById("evo-research-claimable-badge"),
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
    evolvedCount: document.getElementById("evo-evolved-count"),
    doneCount: document.getElementById("evo-done-count"),
    readyDisplay: document.getElementById("evo-ready-display"),
    kantoDone: document.getElementById("evo-kanto-done"),
    kantoTotal: document.getElementById("evo-kanto-total"),
    kantoFill: document.getElementById("evo-kanto-fill"),
    kantoMeter: document.getElementById("evo-kanto-meter"),
    kantoPct: document.getElementById("evo-kanto-pct"),
    viewReady: document.getElementById("evo-view-ready"),
    historyBlock: document.getElementById("evo-history-block"),
    history: document.getElementById("evo-history"),
    modal: document.getElementById("evo-modal"),
    title: document.getElementById("evo-title"),
    detail: document.getElementById("evo-detail"),
    go: document.getElementById("evo-go"),
    cancel: document.getElementById("evo-cancel"),
    status: document.getElementById("evo-status"),
    oakModal: document.getElementById("oak-lab-modal"),
    oakTitle: document.getElementById("oak-lab-title"),
    oakSprites: document.getElementById("oak-lab-sprites"),
    oakCopy: document.getElementById("oak-lab-copy"),
    oakBubble: document.getElementById("evo-oak-bubble"),
    inspectModal: document.getElementById("oak-inspect-modal"),
    inspectTitle: document.getElementById("oak-inspect-title"),
    inspectBody: document.getElementById("oak-inspect-body")
  };
  let data = null;
  let storage = null;
  let pick = null;
  let rareIdem = "";
  let activeTab = "send";
  const selectedOak = new Set();
  let pendingOakIds = [];
  let inspectReturnFocus = null;
  let evoReturnFocus = null;
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

  function sprite(dex, variant, size, gender, formId) {
    const resolved = view.displayVariant
      ? view.displayVariant({ variant, gender }, dex)
      : (variant || "normal");
    const src = window.playSpriteUrl(dex, resolved, formId);
    const px = size || 96;
    return `<img class="oak-sprite" src="${esc(src)}" alt="" width="${px}" height="${px}" style="width:${px}px;height:${px}px" loading="lazy" decoding="async" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">`;
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
    return (data?.ready || []).filter((row) => (
      view.hasEligibleEvolution ? view.hasEligibleEvolution(row) : Boolean(row && !row.terminal && Number(row.toDex) >= 1 && Number(row.toDex) <= 151)
    ));
  }

  function storageMons() {
    return Array.isArray(storage?.mons) ? storage.mons : [];
  }

  function allOwnedMons() {
    return storageMons().length ? storageMons() : (data?.owned || []);
  }

  function oakBlockReason(mon, owned) {
    if (window.playOakTransfer?.transferBlockReason) {
      return window.playOakTransfer.transferBlockReason(mon, owned || allOwnedMons());
    }
    if (mon.onTeam) return "On team";
    if (mon.listed) return "Listed for trade";
    if (mon.locked) return "Locked";
    if (mon.favorite) return "Favorite";
    const copies = (owned || allOwnedMons()).filter((row) => Number(row.dex) === Number(mon.dex)).length;
    if (copies <= 1) return "Keep for Living Dex";
    return "";
  }

  function sendableMons() {
    const source = allOwnedMons();
    if (window.playOakTransfer?.eligibleTransferMons) {
      return window.playOakTransfer.eligibleTransferMons(source).map((mon) => ({
        ...mon,
        oakBlocked: false,
        oakReason: ""
      }));
    }
    return source.filter((mon) => !oakBlockReason(mon, source)).map((mon) => ({
      ...mon,
      oakBlocked: false,
      oakReason: ""
    }));
  }

  function setOakBubble(text) {
    if (!els.oakBubble || !text) return;
    els.oakBubble.textContent = text;
  }

  const RESEARCH_TRACK_IDS = ["field", "evolution", "line", "transfer"];
  const RESEARCH_TRACK_ALIAS = {
    field: "field",
    evolution: "evolution",
    evolutions: "evolution",
    line: "line",
    lines: "line",
    transfer: "transfer",
    transfers: "transfer"
  };
  const RESEARCH_TRACK_MSG = {
    field: "There's still so much to learn about Pokémon in Kanto!",
    evolution: "Evolution can reveal remarkable changes in Pokémon!",
    line: "Related Pokémon can teach us a great deal about evolution!",
    transfer: "Even duplicate Pokémon can contribute to valuable research!"
  };
  const RESEARCH_TRACK_META = {
    field: { short: "Field", unit: "species", motif: "field", progressUnit: "registered" },
    evolution: { short: "Evolutions", unit: "evolutions", motif: "evolution", progressUnit: "evolutions" },
    line: { short: "Lines", unit: "lines", motif: "line", progressUnit: "lines" },
    transfer: { short: "Transfers", unit: "sent", motif: "transfer", progressUnit: "sent" }
  };
  const RESEARCH_SESSION_KEY = "oakLabResearchTrack";

  function refreshOakBubble() {
    const tally = counts();
    if (activeTab === "send") {
      if (selectedOak.size > 0) {
        setOakBubble("Excellent! These Pokémon are ready for transfer.");
        return;
      }
      setOakBubble("Send me duplicate Pokémon and I'll study their Evolution Line!");
      return;
    }
    if (activeTab === "research") {
      setOakBubble(RESEARCH_TRACK_MSG[activeResearchTrack] || "Every discovery helps with my Pokémon research!");
      return;
    }
    if (tally.ready > 0) {
      setOakBubble("Ah! One of your Pokémon is ready to evolve!");
      return;
    }
    setOakBubble("Let's see what your Pokémon can become!");
  }

  let research = null;
  let researchBusy = false;
  let martEduShown = false;
  let activeResearchTrack = "field";

  function normalizeResearchTrack(id) {
    const key = String(id || "").toLowerCase().trim();
    return RESEARCH_TRACK_ALIAS[key] || (RESEARCH_TRACK_IDS.includes(key) ? key : "field");
  }

  function rememberResearchTrack(id) {
    activeResearchTrack = normalizeResearchTrack(id);
    try { sessionStorage.setItem(RESEARCH_SESSION_KEY, activeResearchTrack); } catch (_) {}
  }

  function restoreResearchTrack() {
    try {
      const saved = sessionStorage.getItem(RESEARCH_SESSION_KEY);
      if (saved) activeResearchTrack = normalizeResearchTrack(saved);
    } catch (_) {}
  }

  function parseLabHash(raw) {
    const hash = String(raw || "").replace(/^#/, "").trim().toLowerCase();
    if (!hash) return { tab: "send", track: null };
    if (hash === "transfer" || hash === "send") return { tab: "send", track: null };
    if (hash === "evolution" || hash === "evolve") return { tab: "evolve", track: null };
    if (hash === "research") return { tab: "research", track: null };
    const researchMatch = hash.match(/^research\/([a-z]+)$/);
    if (researchMatch) return { tab: "research", track: normalizeResearchTrack(researchMatch[1]) };
    if (hash === "research/field" || hash.startsWith("research/")) {
      const part = hash.split("/")[1];
      return { tab: "research", track: normalizeResearchTrack(part) };
    }
    return { tab: "send", track: null };
  }

  function writeLabHash() {
    try {
      const url = new URL(window.location.href);
      if (activeTab === "send") url.hash = "transfer";
      else if (activeTab === "evolve") url.hash = "evolution";
      else url.hash = `research/${activeResearchTrack}`;
      window.history.replaceState(null, "", url);
    } catch (_) {}
  }

  function preserveLabScroll(run) {
    const x = window.scrollX || window.pageXOffset || 0;
    const y = window.scrollY || window.pageYOffset || 0;
    const restore = () => {
      try { window.scrollTo(x, y); } catch (_) {}
    };
    run();
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }

  function setTab(tab, opts = {}) {
    const next = tab === "evolve" ? "evolve" : (tab === "research" ? "research" : "send");
    preserveLabScroll(() => {
      activeTab = next;
      if (opts.track) rememberResearchTrack(opts.track);
      els.tabs?.querySelectorAll("[data-tab]").forEach((btn) => {
        const on = btn.dataset.tab === activeTab;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
        btn.classList.toggle("is-active", on);
      });
      if (els.tabSend) els.tabSend.hidden = activeTab !== "send";
      if (els.tabEvolve) els.tabEvolve.hidden = activeTab !== "evolve";
      if (els.tabResearch) els.tabResearch.hidden = activeTab !== "research";
      if (els.app) {
        els.app.dataset.labStation = activeTab;
        els.app.dataset.labResearchTrack = activeTab === "research" ? activeResearchTrack : "";
      }
      delete document.body.dataset.labStation;
      delete document.body.dataset.labResearchTrack;
      refreshOakBubble();
      if (activeTab === "research") loadResearch();
      if (!opts.skipHash) writeLabHash();
    });
  }

  function setResearchTrack(trackId, opts = {}) {
    if (activeTab !== "research") {
      setTab("research", { track: trackId, skipHash: opts.skipHash });
      return;
    }
    preserveLabScroll(() => {
      rememberResearchTrack(trackId);
      if (els.app) els.app.dataset.labResearchTrack = activeResearchTrack;
      delete document.body.dataset.labResearchTrack;
      renderResearch();
      refreshOakBubble();
      if (!opts.skipHash) writeLabHash();
    });
  }

  function rewardLines(rewards) {
    const rows = [];
    Object.entries(rewards || {}).forEach(([key, n]) => {
      const qty = Number(n || 0);
      if (!qty && key !== "title" && key !== "badge") return;
      rows.push({ key, qty, label: window.playItemLabel?.(key) || key });
    });
    return rows;
  }

  function trackGoal(track) {
    const milestones = track?.milestones || [];
    if (track?.id === "line" && Number(track.lineTotal || 0) > 0) return Number(track.lineTotal);
    const last = milestones[milestones.length - 1];
    return Number(last?.threshold || 0) || 1;
  }

  function trackProgressLabel(track) {
    const progress = Number(track?.progress || 0);
    const id = track?.id;
    if (id === "field") return `${progress.toLocaleString()} / ${trackGoal(track).toLocaleString()}`;
    if (id === "evolution") return `${progress.toLocaleString()} evolutions`;
    if (id === "line") return `${progress.toLocaleString()} / ${trackGoal(track).toLocaleString()} lines`;
    if (id === "transfer") return `${progress.toLocaleString()} sent`;
    return progress.toLocaleString();
  }

  function trackClaimableCount(track) {
    return (track?.milestones || []).filter((m) => m.complete && !m.claimed).length;
  }

  function updateResearchClaimable(claimable) {
    if (els.researchClaimable) els.researchClaimable.textContent = String(claimable);
    if (els.researchClaimableBadge) {
      // Keep the badge slot in layout so Research station width stays stable.
      els.researchClaimableBadge.hidden = false;
      if (claimable > 0) {
        els.researchClaimableBadge.textContent = `${claimable} claimable`;
        els.researchClaimableBadge.classList.remove("is-empty");
        els.researchClaimableBadge.removeAttribute("aria-hidden");
      } else {
        els.researchClaimableBadge.textContent = "0 claimable";
        els.researchClaimableBadge.classList.add("is-empty");
        els.researchClaimableBadge.setAttribute("aria-hidden", "true");
      }
    }
    if (els.researchSummary) {
      if (claimable > 0) {
        els.researchSummary.hidden = false;
        els.researchSummary.textContent = `Oak Research · 4 tracks · ${claimable} reward${claimable === 1 ? "" : "s"} available`;
      } else {
        els.researchSummary.hidden = false;
        els.researchSummary.textContent = "Oak Research · 4 tracks";
      }
    }
  }

  function renderResearchRail(tracks, claimableTotal) {
    if (!els.researchTracklist) return;
    const html = tracks.map((track) => {
      const id = track.id;
      const on = id === activeResearchTrack;
      const claimable = trackClaimableCount(track);
      const meta = RESEARCH_TRACK_META[id] || { short: track.name, motif: id };
      return `<button type="button" class="oak-research-track-btn motif-${esc(meta.motif)}${on ? " is-active" : ""}${claimable ? " has-claimable" : ""}"
        role="tab" id="oak-track-${esc(id)}" data-research-track="${esc(id)}"
        aria-selected="${on ? "true" : "false"}" tabindex="${on ? 0 : -1}"
        aria-controls="oak-research-board">
        <span class="oak-research-track-dot" aria-hidden="true"></span>
        <span class="oak-research-track-copy">
          <strong>${esc(track.name)}</strong>
          <span>${esc(trackProgressLabel(track))}</span>
        </span>
        ${claimable ? `<span class="oak-research-track-badge" title="${claimable} claimable">★ ${claimable}</span>` : ""}
        <span class="visually-hidden">${esc(meta.short)}</span>
      </button>`;
    }).join("");
    els.researchTracklist.innerHTML = html || `<p class="muted">No tracks</p>`;
    updateResearchClaimable(claimableTotal);
  }

  function renderResearch() {
    if (!els.researchBoard) return;
    const tracks = research?.tracks || [];
    if (!tracks.length) {
      els.researchBoard.innerHTML = `<p class="muted">Research tracks are not available yet.</p>`;
      renderResearchRail([], 0);
      return;
    }
    if (!tracks.some((t) => t.id === activeResearchTrack)) {
      rememberResearchTrack(tracks[0].id);
    }
    let claimableTotal = 0;
    tracks.forEach((t) => { claimableTotal += trackClaimableCount(t); });
    renderResearchRail(tracks, claimableTotal);

    const track = tracks.find((t) => t.id === activeResearchTrack) || tracks[0];
    const progress = Number(track.progress || 0);
    const milestones = track.milestones || [];
    const goal = trackGoal(track);
    const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(1, goal)) * 100)));
    const nextOpen = milestones.find((m) => !m.claimed && !m.complete);
    const nextClaim = milestones.find((m) => m.complete && !m.claimed);
    const nextFocus = nextClaim || nextOpen || milestones[milestones.length - 1];
    const nextRewards = rewardLines(nextFocus?.rewards).map((row) => {
      const art = window.playItemSprite?.(row.key) || "images/items/poke-ball.png";
      return `<span class="oak-research-reward"><img src="${esc(art)}" alt="" width="24" height="24">${esc(row.label)} ×${row.qty}</span>`;
    }).join("") || `<span class="muted">—</span>`;

    let sawOpen = false;
    const cards = milestones.map((m) => {
      const complete = Boolean(m.complete);
      const claimed = Boolean(m.claimed);
      const claimable = complete && !claimed;
      let state = "locked";
      let status = "LOCKED";
      if (claimed) {
        state = "claimed";
        status = "CLAIMED";
      } else if (claimable) {
        state = "claimable";
        status = "CLAIMABLE";
      } else if (!sawOpen) {
        state = "progress";
        status = "IN PROGRESS";
        sawOpen = true;
      } else {
        state = "locked";
        status = "LOCKED";
      }
      const rewards = rewardLines(m.rewards).map((row) => {
        const art = window.playItemSprite?.(row.key) || "images/items/poke-ball.png";
        return `<span class="oak-research-reward"><img src="${esc(art)}" alt="" width="26" height="26"><span>${esc(row.label)} ×${row.qty}</span></span>`;
      }).join("") || `<span class="muted">Reward</span>`;
      const req = String(m.description || "").replace(/\.$/, "");
      return `<article class="oak-research-card is-${state}" data-milestone="${esc(m.id)}">
        <p class="oak-research-status" data-state="${state}">${esc(status)}</p>
        <h4 class="oak-research-card-title">${esc(m.title)}</h4>
        <p class="oak-research-req">${esc(req)}</p>
        <p class="oak-research-progress-line" aria-label="Progress">${progress.toLocaleString()} / ${Number(m.threshold || 0).toLocaleString()}</p>
        <div class="oak-research-rewards"><span class="oak-research-reward-kicker">Reward</span>${rewards}</div>
        <span class="oak-research-card-grow" aria-hidden="true"></span>
        ${claimable
          ? `<button type="button" class="gold oak-research-claim" data-claim-research="${esc(m.id)}">Claim Reward</button>`
          : `<span class="oak-research-claim-slot" aria-hidden="true"></span>`}
      </article>`;
    }).join("");

    const progressTitle = track.id === "field"
      ? "Kanto Pokédex Progress"
      : track.id === "line"
        ? "Evolution Lines Complete"
        : track.id === "evolution"
          ? "Evolutions Completed"
          : "Pokémon Sent to Oak";

    const nextThreshold = Number((nextClaim || nextOpen || nextFocus)?.threshold || 0);
    const towardNext = nextOpen && !nextClaim
      ? Math.max(0, nextThreshold - progress)
      : 0;
    const nextReq = String(nextFocus?.description || "").replace(/\.$/, "");
    const unit = RESEARCH_TRACK_META[track.id]?.progressUnit || "complete";
    els.researchBoard.innerHTML = `<section class="oak-research-active motif-${esc(track.id)}" aria-labelledby="oak-active-track-title">
      <header class="oak-research-summary">
        <div class="oak-research-summary-identity">
          <p class="oak-research-kicker">TRACK</p>
          <h3 id="oak-active-track-title">${esc(track.name)}</h3>
          <p>${esc(track.description || "")}</p>
          <div class="oak-research-track-progress" role="group" aria-label="${esc(progressTitle)} overall">
            <p class="oak-research-progress-count"><strong>${progress.toLocaleString()}</strong><span> / ${goal.toLocaleString()} ${esc(unit)}</span></p>
            <div class="oak-research-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
            <p class="oak-research-complete-pct">${pct}% complete</p>
            <p class="oak-research-progress-caption muted">Overall track progress</p>
          </div>
        </div>
        <div class="oak-research-next-milestone${nextClaim ? " is-ready" : ""}">
          <p class="oak-research-next-label">${nextClaim ? "Ready to Claim" : "Next Milestone"}</p>
          <p class="oak-research-next-req">${esc(nextFocus?.title || "—")}</p>
          <p class="oak-research-next-desc">${esc(nextReq || "")}</p>
          ${nextOpen && !nextClaim
            ? `<p class="oak-research-next-toward">${progress.toLocaleString()} / ${nextThreshold.toLocaleString()} · ${towardNext.toLocaleString()} remaining</p>`
            : ""}
          <div class="oak-research-rewards">${nextRewards}</div>
        </div>
      </header>
      <div class="oak-research-cards oak-research-journey" role="list">${cards}</div>
    </section>`;
  }

  async function loadResearch() {
    if (!els.researchBoard) return;
    try {
      research = await window.playCall("play_oak_research");
      renderResearch();
      refreshOakBubble();
    } catch (error) {
      els.researchBoard.innerHTML = `<p class="muted">${esc(window.playHumanRpcError?.(error, "Research is unavailable.") || window.playRpcError?.(error, "Research is unavailable.") || "Research is unavailable.")}</p>`;
      if (els.researchTracklist) els.researchTracklist.innerHTML = "";
    }
  }

  async function claimResearch(milestoneId) {
    if (researchBusy || !milestoneId) return;
    researchBusy = true;
    try {
      const data = await window.playCall("play_claim_oak_research", { p_milestone_id: milestoneId });
      const rewards = rewardLines(data.rewards);
      const valuable = rewards.some((row) => ["stardust", "pearl", "starpiece", "nugget", "bigpearl", "bignugget"].includes(row.key));
      if (typeof window.playPresentEnqueue === "function") {
        const events = [{
          id: `oak-research:${data.milestoneId || milestoneId}`,
          type: "item",
          kind: "oak-research",
          rare: true,
          title: "PROFESSOR OAK'S RESEARCH",
          subtitle: "Research Complete!",
          item: rewards[0]?.key || "",
          qty: rewards[0]?.qty || 0,
          payload: {
            milestoneTitle: data.title || "",
            description: data.description || "",
            oakLine: data.oakLine || "Excellent work! We're learning more about Pokémon every day!"
          },
          rewards: rewards.map((row) => ({ type: row.key, amount: row.qty }))
        }];
        if (valuable && !martEduShown && !window.playTipDone?.("oak-valuable-mart")) {
          martEduShown = true;
          window.playMarkTip?.("oak-valuable-mart");
          events.push({
            id: `oak-research-mart:${data.milestoneId || milestoneId}`,
            type: "item",
            kind: "loot",
            title: "Mart tip",
            subtitle: "Sell valuables at the Mart",
            body: "Open Mart → Sell when you are ready.",
            rewards: []
          });
        }
        window.playPresentEnqueue(events);
      }
      await loadResearch();
    } catch (error) {
      if (els.researchBoard) {
        const note = document.createElement("p");
        note.className = "notice";
        note.textContent = window.playHumanRpcError?.(error, "Could not claim that research reward.")
          || window.playRpcError?.(error, "Could not claim that research reward.")
          || "Could not claim that research reward.";
        els.researchBoard.prepend(note);
      }
    } finally {
      researchBusy = false;
    }
  }

  function familyForDex(dex) {
    const id = Number(dex);
    if (!id) return null;
    return (data?.families || []).find((fam) =>
      Number(fam.baseDex) === id
      || Number(fam.familyId) === id
      || (fam.members || []).some((member) => Number(member.dex) === id)
    ) || null;
  }

  function candyBareName(raw) {
    return String(raw || "")
      .replace(/\s+Evolution\s+Candy$/i, "")
      .replace(/\s+Candy$/i, "")
      .replace(/\s+Evolution\s+Line$/i, "")
      .trim();
  }

  /** Authoritative line candy identity: one local candy ITEM PNG + "{Species} Evolution Candy". */
  function candyIdentity(row = {}) {
    const famId = Number(row.familyId || 0);
    let fam = famId
      ? (data?.families || []).find((item) => Number(item.familyId) === famId)
      : null;
    if (!fam && row.dex) fam = familyForDex(row.dex);
    const hint = Number(
      row.candyBaseDex
      || row.baseDex
      || fam?.baseDex
      || famId
      || row.dex
      || 0
    );
    const baseDex = window.playEvolutionCandyLineDex?.(hint) || hint;
    const label = window.playEvolutionCandyLabel
      ? window.playEvolutionCandyLabel(baseDex, row.candyName || row.familyName || fam?.name || "")
      : `${window.playSpeciesName?.(baseDex) || "Evolution"} Candy`;
    const bare = candyBareName(label);
    const art = window.playEvolutionCandyItemUrl?.(baseDex)
      || window.playOakTransfer?.candyItemArt?.({ candyBaseDex: baseDex, familyId: famId || Number(fam?.familyId || 0) }, data?.families || [])
      || "images/items/lgpe-candy.png";
    return { baseDex, bare, label, art, artFallback: "images/items/lgpe-candy.png", familyId: famId || Number(fam?.familyId || 0) };
  }

  function candyArtHtml(id, size = 40) {
    const item = id?.art || "images/items/lgpe-candy.png";
    const fallback = id?.artFallback || "images/items/lgpe-candy.png";
    const onerr = `data-fallback="${esc(fallback)}" onerror="if(this.dataset.fallback){const f=this.dataset.fallback;this.removeAttribute('data-fallback');this.src=f;}else{this.onerror=null;this.src='images/items/lgpe-candy.png'}"`;
    return `<span class="oak-candy-art" style="--oak-candy-size:${size}px">
      <img class="oak-candy-item" src="${esc(item)}" alt="" width="${size}" height="${size}" decoding="async" loading="lazy" ${onerr}>
    </span>`;
  }

  function candyNeedCopy(have, need) {
    const haveN = Number(have || 0);
    const needN = Number(need || 0);
    const shortfall = Math.max(0, needN - haveN);
    if (needN > 0 && haveN >= needN) return `${needN} required · ${haveN} owned ✓`;
    if (shortfall) return `${needN} required · ${haveN} owned · ${shortfall} more needed`;
    return `${needN} required · ${haveN} owned`;
  }

  function candyChipHtml(row, { have, need, size = 36, compact = false } = {}) {
    const id = candyIdentity(row);
    const haveN = Number(have ?? row.haveCandy ?? 0);
    const needN = Number(need ?? row.candyCost ?? 0);
    const shortfall = Math.max(0, needN - haveN);
    const ready = needN > 0 && haveN >= needN;
    if (compact) {
      return `<span class="evo-cost-candy oak-candy-chip is-compact">
        ${candyArtHtml(id, size)}
        <span class="evo-cost-candy-copy">
          <strong>${needN} required</strong>
          <span>${ready ? `${haveN} owned ✓` : `${haveN} owned${shortfall ? ` · ${shortfall} more needed` : ""}`}</span>
        </span>
      </span>`;
    }
    return `<span class="evo-cost-candy oak-candy-chip">
      ${candyArtHtml(id, size)}
      <span class="evo-cost-candy-copy">
        <strong>${esc(id.label)}</strong>
        <span>${candyNeedCopy(haveN, needN)}</span>
      </span>
    </span>`;
  }

  function counts() {
    const rows = readyRows();
    return {
      ready: rows.filter(canEvolve).length,
      all: rows.length,
      candy: rows.filter((row) => view.matchesFilter(row, "candy")).length,
      item: rows.filter((row) => view.matchesFilter(row, "item")).length,
      trade: rows.filter((row) => view.matchesFilter(row, "trade")).length
    };
  }

  function renderHero() {
    const tally = counts();
    const candyTotal = Number(data?.stats?.candyTotal || 0);
    const evolved = Number(data?.stats?.evolved || 0);
    const kanto = data?.stats?.kantoEvolutions || {};
    const kantoDone = Number(kanto.completed || 0);
    const kantoTotal = Number(kanto.total || 0);
    const kantoPct = kantoTotal > 0 ? Math.max(0, Math.min(100, Math.round((kantoDone / kantoTotal) * 100))) : 0;
    if (els.readyCount) els.readyCount.textContent = String(tally.ready);
    if (els.readyDisplay) els.readyDisplay.textContent = String(tally.ready);
    if (els.candyCount) els.candyCount.textContent = String(candyTotal);
    if (els.evolvedCount) els.evolvedCount.textContent = String(evolved);
    if (els.doneCount) els.doneCount.textContent = String(evolved);
    if (els.kantoDone) els.kantoDone.textContent = String(kantoDone);
    if (els.kantoTotal) els.kantoTotal.textContent = String(kantoTotal);
    if (els.kantoFill) els.kantoFill.style.width = `${kantoPct}%`;
    if (els.kantoPct) els.kantoPct.textContent = `${kantoPct}%`;
    if (els.kantoMeter) {
      els.kantoMeter.setAttribute("aria-valuenow", String(kantoPct));
      els.kantoMeter.setAttribute("aria-valuetext", `${kantoDone} of ${kantoTotal} Kanto evolutions complete, ${kantoPct} percent`);
    }
    if (els.viewReady) els.viewReady.disabled = tally.ready < 1;
    if (els.strip) els.strip.hidden = true;
    const eligible = sendableMons().length;
    if (els.xferAvailable) els.xferAvailable.textContent = String(eligible);
    els.filters?.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = String(tally[el.dataset.count] || 0);
    });
    if (els.note) {
      els.note.textContent = tally.ready
        ? `${tally.ready} ready · ${candyTotal} candy collected across lines`
        : `0 ready · ${candyTotal} candy collected across lines`;
    }
    refreshOakBubble();
  }

  function statusFooter(row, terminal) {
    if (terminal) return `<span class="evo-foot is-done">Fully Evolved</span>`;
    const kind = view.cardKind ? view.cardKind(row) : (canEvolve(row) ? "ready" : "blocked");
    if (kind === "ready") {
      return `<button type="button" class="evo-foot is-ready" data-evo-act="evolve">Ready to Evolve <i aria-hidden="true">→</i></button>`;
    }
    if (kind === "locked") return `<span class="evo-foot is-warn">Locked</span>`;
    if (kind === "reserved") return `<span class="evo-foot is-warn">Trade reserved</span>`;
    if (view.matchesFilter?.(row, "candy")) {
      return `<span class="evo-foot is-candy">Needs Candy</span>`;
    }
    if (view.matchesFilter?.(row, "item")) {
      return `<span class="evo-foot is-item">Needs Item</span>`;
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
    const catchId = row.catchId || row.id || "";
    const inspectLabel = `Inspect ${row.name || "Pokémon"}`;
    const item = !terminal && row.item
      ? `${itemLabel(row.item)}${row.haveItem || row.tradeReady ? " ✓" : ""}`
      : "";
    const formId = row.formId || row.pokemonFormId || null;
    return `
      <article class="evo-mon oak-mon-card oak-evo-card is-${kind}${ready ? " is-ready" : ""}${terminal ? " is-terminal" : ""}" data-evo="${esc(catchId)}" data-rule="${esc(row.ruleId || "")}" data-kind="${kind}" data-dex="${row.dex || ""}">
        <button type="button" class="oak-mon-inspect" data-evo-inspect="${esc(catchId)}" aria-label="${esc(inspectLabel)}">
          <span class="evo-mon-art">${sprite(row.dex, row.variant || "normal", 96, row.gender, formId)}</span>
          <strong class="evo-mon-name oak-mon-name">${dexLabel(row.dex)} ${shiny ? "✨ " : ""}${esc(row.name)}</strong>
        </button>
        <div class="oak-card-context">
          ${row.toName ? `<span class="oak-evo-target">
            <span class="evo-arrow-lite" aria-hidden="true">↓</span>
            <span class="oak-evo-target-art">${sprite(row.toDex, row.variant || "normal", 64, row.gender, formId)}</span>
            <span class="oak-evo-target-name">${esc(row.toName)}</span>
          </span>` : ""}
          ${terminal ? "" : candyChipHtml(row, { size: 36, compact: true })}
          ${item ? `<span class="evo-cost oak-evo-item">${esc(item)}</span>` : ""}
        </div>
        ${statusFooter(row, terminal)}
      </article>`;
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
    const eligibleTotal = readyRows().length;
    const empty = eligibleTotal
      ? `<div class="evo-empty evo-empty-lab evo-empty-filter">
      <img class="evo-empty-oak" src="images/trainers/portraits/oak-portrait.png" alt="" width="88" height="88" decoding="async" aria-hidden="true">
      <p><strong>No Pokémon match this filter.</strong></p>
      <p class="muted">Try another Evolution Research filter or check back after catching more Pokémon.</p>
      <p><button type="button" class="button secondary" data-evo-show-all>Show All Pokémon</button></p>
    </div>`
      : `<div class="evo-empty evo-empty-lab evo-empty-collection">
      <img class="evo-empty-oak" src="images/trainers/portraits/oak-portrait.png" alt="" width="88" height="88" decoding="async" aria-hidden="true">
      <p><strong>Professor Oak is ready when you are!</strong></p>
      <p class="muted">Catch Pokémon that can evolve, then return to continue your research.</p>
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
    const shiny = String(mon.variant || "").includes("shiny");
    const candy = candyIdentity(mon);
    const name = mon.name || mon.nickname || "Pokémon";
    const formId = mon.formId || mon.pokemonFormId || null;
    return `
      <article class="evo-mon evo-send-card oak-mon-card${selected ? " is-selected" : ""}" data-oak-id="${esc(id)}" data-dex="${mon.dex || ""}">
        <button type="button" class="oak-mon-inspect" data-oak-inspect="${esc(id)}" aria-label="${esc(`Inspect ${name}`)}">
          <span class="evo-mon-art">${sprite(mon.dex, mon.variant || "normal", 96, mon.gender, formId)}</span>
          <strong class="evo-mon-name oak-mon-name">${dexLabel(mon.dex)} ${shiny ? "✨ " : ""}${esc(name)}</strong>
        </button>
        <div class="oak-card-context">
          <span class="oak-candy-block">
            ${candyArtHtml(candy, 40)}
            <strong class="oak-candy-label">${esc(candy.label)}</strong>
          </span>
        </div>
        <button type="button" class="evo-foot ${selected ? "is-ready" : "is-select"}" data-oak-select="${esc(id)}" aria-pressed="${selected ? "true" : "false"}">
          ${selected ? "Selected ✓" : "Select Pokémon"}
        </button>
      </article>`;
  }

  function renderSend() {
    if (!els.sendGrid) return;
    const q = String(els.sendSearch?.value || "").trim().toLowerCase();
    let rows = sendableMons();
    if (q) {
      rows = rows.filter((mon) => [mon.name, mon.nickname, mon.variant, String(mon.dex)]
        .join(" ")
        .toLowerCase()
        .includes(q));
    }
    rows = sortRows(rows, els.sendSort?.value || "dex-asc");
    const selectedStillLive = new Set(sendableMons().map((mon) => String(mon.id)));
    for (const id of [...selectedOak]) {
      if (!selectedStillLive.has(id)) selectedOak.delete(id);
    }
    const shown = rows.length;
    if (els.xferAvailable) els.xferAvailable.textContent = String(shown);
    if (els.sendNote) {
      els.sendNote.textContent = shown
        ? `${shown} available · ${selectedOak.size} selected`
        : (q ? "0 available · no matches in transferable Pokémon" : "0 available · catch duplicates to research");
    }
    if (els.sendGo) {
      els.sendGo.disabled = selectedOak.size < 1;
      els.sendGo.textContent = selectedOak.size
        ? `Send ${selectedOak.size} to Oak`
        : "Send 0 to Oak";
      els.sendGo.classList.toggle("is-armed", selectedOak.size > 0);
    }
    const empty = q
      ? `<div class="evo-empty evo-empty-lab">
      <img class="evo-empty-oak" src="images/trainers/portraits/oak-portrait.png" alt="" width="88" height="88" decoding="async" aria-hidden="true">
      <p><strong>No transferable Pokémon match that search.</strong></p>
      <p class="muted">Search and Sort only look at Pokémon Professor Oak can actually receive.</p>
    </div>`
      : `<div class="evo-empty evo-empty-lab">
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
          <h3>${esc(candyBareName(fam.name) || fam.name)} Evolution Line</h3>
          <p class="evo-line-candy">${candyArtHtml(candyIdentity(fam), 28)}<span><strong>${esc(candyIdentity(fam).label)}:</strong> ${fam.candy || 0}</span></p>
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
      els.rareFamily.innerHTML = families.map((fam) => {
        const id = candyIdentity(fam);
        return `<option value="${fam.familyId}">${esc(id.label)} · ${fam.candy || 0}</option>`;
      }).join("");
    }
    updateRarePreview();
    if (els.rareUse) els.rareUse.disabled = qty < 1 || !families.length;
  }

  function updateRarePreview() {
    const fam = (data?.families || []).find((row) => String(row.familyId) === String(els.rareFamily?.value || ""));
    if (els.rarePreview) {
      const id = fam ? candyIdentity(fam) : null;
      els.rarePreview.textContent = id
        ? `${id.label}: ${fam.candy || 0} → ${(fam.candy || 0) + 1}`
        : "";
    }
  }

  function renderCandy() {
    if (!els.candy) return;
    els.candy.innerHTML = (data?.candy || []).map((row) => {
      const id = candyIdentity(row);
      return `
      <button type="button" class="evo-candy" data-family="${row.familyId}">
        ${candyArtHtml(id, 48)}
        <strong>${esc(id.bare)} Line</strong>
        <span>${row.qty} ${esc(id.label)}</span>
      </button>`;
    }).join("") || `<p class="muted">Send Pokémon to Professor Oak to earn Evolution Candy for each Evolution Line.</p>`;
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
    els.modal?.classList.remove("is-ready-confirm");
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
      const candy = candyIdentity(row);
      bits.push(`<div class="evo-req-candy">${candyArtHtml(candy, 32)}<span><strong>${esc(candy.label)}</strong><br>${esc(candyNeedCopy(have, need))}</span></div>`);
      if (row.item === "linkingcord") {
        const qty = view.itemQty ? view.itemQty(row) : (row.haveItem ? 1 : 0);
        bits.push(`<p>Linking Cord<br>Allows this Pokémon to evolve without trading.<br>Owned: ${qty} ${qty ? "✓" : "✕"}</p>`);
        if (!qty) bits.push(`<p><a class="button secondary" href="${view.martHref("linkingcord")}">Find in Mart</a></p>`);
      } else if (row.item) {
        const qty = view.itemQty ? view.itemQty(row) : (row.haveItem ? 1 : 0);
        bits.push(`<p>${esc(itemLabel(row.item))}<br>1 / 1 ${qty ? "✓" : "✕"}</p>`);
        if (!qty) bits.push(`<p>You need a ${esc(itemLabel(row.item))}.</p><p><a class="button secondary" href="${view.martHref(row.item)}">Find in Mart</a></p>`);
      }
      if (canEvolve(row) && row.item) {
        const afterCandy = Math.max(0, Number(row.haveCandy || 0) - Number(row.candyCost || 0));
        const afterItem = Math.max(0, (view.itemQty ? view.itemQty(row) : 1) - 1);
        bits.push(`<p class="muted">After Evolution: ${afterCandy} ${esc(candy.label)}${row.item ? ` · ${afterItem} ${itemLabel(row.item)}` : ""}</p>`);
      }
    }
    return bits.join("");
  }

  function inspectStatRows(mon) {
    const labels = [
      ["hp", "HP"], ["atk", "Attack"], ["def", "Defense"],
      ["spa", "Sp. Atk"], ["spd", "Sp. Def"], ["spe", "Speed"]
    ];
    return labels.map(([key, label]) => {
      const value = Number(mon?.stats?.[key] || 0);
      const pct = Math.max(8, Math.min(100, Math.round((value / 250) * 100)));
      return `<div class="pc-stat"><span>${label}</span><i style="--pct:${pct}%"></i><strong>${value}</strong></div>`;
    }).join("");
  }

  function inspectSpriteUrl(mon) {
    if (window.playOakTransfer?.spriteUrl) return window.playOakTransfer.spriteUrl(mon);
    return window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
  }

  function monForInspect(id) {
    const sid = String(id || "");
    if (!sid) return null;
    return allOwnedMons().find((row) => String(row.id) === sid)
      || (data?.owned || []).find((row) => String(row.id) === sid)
      || readyRows().find((row) => String(row.catchId || row.id) === sid)
      || null;
  }

  function inspectHtml(mon) {
    const shiny = String(mon.variant || "").includes("shiny") || Boolean(mon.shiny);
    const title = window.playMonDisplayTitle?.(mon) || mon.nickname || mon.name || "Pokémon";
    const species = mon.name && title !== mon.name ? mon.name : "";
    const badges = typeof window.playMonIdentityBadgesHtml === "function"
      ? window.playMonIdentityBadgesHtml(mon)
      : "";
    const ballName = window.playItemLabel?.(mon.ball) || mon.ball || "";
    const metLevel = mon.metLevel || mon.level || 1;
    const metPlace = mon.metLocation || "the wild";
    const otName = mon.otName || "Unknown Trainer";
    const otNo = mon.otNumber ? String(mon.otNumber).padStart(5, "0") : "-----";
    const form = mon.formLabel && mon.formLabel !== "Base" ? mon.formLabel : "";
    return `
      <div class="pc-inspect-inner oak-inspect-inner">
        <header class="pc-inspect-hero">
          <div class="pc-inspect-art">
            <span class="pc-inspect-platform" aria-hidden="true"></span>
            <img src="${esc(inspectSpriteUrl(mon))}" alt="" decoding="async">
          </div>
          <div class="pc-inspect-id">
            <p class="pc-inspect-kicker">Pokémon Overview</p>
            <h2 class="pc-inspect-title">${esc(title)}${species ? `<span class="pc-pick-name-sep"> · </span><span class="pc-inspect-species">${esc(species)}</span>` : ""}</h2>
            <p class="pc-inspect-level">Lv. ${mon.level || 1}${dexLabel(mon.dex) ? ` · ${dexLabel(mon.dex)}` : ""}${form ? ` · ${esc(form)}` : ""}${shiny ? " · Shiny" : ""}</p>
            ${badges}
            ${mon.favorite ? `<p class="muted">★ Favorite</p>` : ""}
            ${mon.locked ? `<p class="muted">Locked</p>` : ""}
          </div>
        </header>
        <section class="pc-module pc-capture" aria-label="Catch history">
          <h3 class="pc-module-label">Catch History</h3>
          <div class="pc-capture-row">
            ${mon.ball ? `<img src="${esc(window.playItemSprite?.(mon.ball) || "images/items/poke-ball.png")}" alt="">` : ""}
            <div>
              <strong>${esc(ballName || "Poké Ball")}</strong>
              <p>${esc(metPlace)} · Met at Lv. ${metLevel}</p>
            </div>
          </div>
          <p class="pc-ot"><span>OT</span> <strong>${esc(otName)}</strong> <em>No. ${otNo}</em></p>
        </section>
        <section class="pc-module pc-stats-mod" aria-label="Stats">
          <h3 class="pc-module-label">Stats</h3>
          <div class="pc-stats">${inspectStatRows(mon)}</div>
        </section>
      </div>`;
  }

  function openOakInspect(id, trigger) {
    const mon = monForInspect(id);
    if (!mon || !els.inspectModal || !els.inspectBody) return;
    inspectReturnFocus = trigger || document.activeElement;
    const name = window.playMonDisplayTitle?.(mon) || mon.name || "Pokémon";
    if (els.inspectTitle) els.inspectTitle.textContent = name;
    els.inspectBody.innerHTML = inspectHtml(mon);
    window.playShowDialog(els.inspectModal);
  }

  function confirmRequirementHtml(row) {
    const candy = candyIdentity(row);
    const have = Number(row.haveCandy || 0);
    const need = Number(row.candyCost || 0);
    const bits = [`<div class="evo-confirm-req">
      ${candyArtHtml(candy, 36)}
      <span>${esc(candy.label)}</span>
      <strong>${esc(candyNeedCopy(have, need))}</strong>
    </div>`];
    if (row.item) {
      const qty = view.itemQty ? view.itemQty(row) : (row.haveItem ? 1 : 0);
      const art = window.playItemSprite?.(row.item) || "images/items/poke-ball.png";
      bits.push(`<div class="evo-confirm-req">
        <img src="${esc(art)}" alt="" width="28" height="28" decoding="async">
        <span>${esc(itemLabel(row.item))}</span>
        <strong>${qty ? "Owned ✓" : "Missing"}</strong>
      </div>`);
    }
    return `<div class="evo-confirm-reqs"><p class="eyebrow">Requirements</p>${bits.join("")}</div>`;
  }

  function openPreview(row) {
    pick = row;
    evoReturnFocus = document.activeElement;
    const shiny = view.isShiny?.(row);
    const kind = view.cardKind(row);
    const ready = canEvolve(row);
    if (els.title) els.title.textContent = ready ? "Evolution Ready" : (kind === "terminal" ? row.name : "Evolution");
    els.modal?.classList.toggle("is-ready-confirm", ready);
    const fromName = `${shiny ? "✨ " : ""}${row.name}`;
    const toName = row.toName ? `${shiny ? "✨ " : ""}${row.toName}` : "";
    const fromMeta = [row.dex != null ? dexLabel(row.dex) : "", row.level ? `Lv. ${row.level}` : ""]
      .filter(Boolean).join(" · ");
    const toMeta = row.toDex != null ? dexLabel(row.toDex) : "";
    if (ready && row.toName) {
      els.detail.innerHTML = `
        <div class="evo-confirm-pair${shiny ? " is-shiny" : ""}">
          <div class="evo-confirm-mon">
            ${sprite(row.dex, row.variant || "normal", 96, row.gender)}
            <strong>${esc(fromName)}</strong>
            <span>${esc(fromMeta)}</span>
          </div>
          <span class="evo-confirm-arrow" aria-hidden="true">→</span>
          <div class="evo-confirm-mon">
            ${sprite(row.toDex, row.variant || "normal", 96, row.gender)}
            <strong>${esc(toName)}</strong>
            <span>${esc(toMeta)}</span>
          </div>
        </div>
        ${confirmRequirementHtml(row)}
        <p class="evo-confirm-call">${esc(row.name)} is ready to evolve into ${esc(row.toName)}!</p>
        ${shiny ? `<p class="evo-confirm-note">Shiny status will be preserved.</p>` : ""}
        ${row.favorite ? `<p class="evo-confirm-note">★ This exact Pokémon remains yours after Evolution.</p>` : ""}`;
    } else {
      els.detail.innerHTML = `
        <div class="evo-preview-stage${shiny ? " is-shiny" : ""}">
          ${shiny ? `<p class="evo-shiny-banner">✨ Shiny Pokémon ✨</p>` : ""}
          <p class="evo-preview-from"><strong>${esc(fromName)}</strong>${fromMeta ? ` · ${esc(fromMeta)}` : ""}</p>
          ${sprite(row.dex, row.variant || "normal", 96, row.gender)}
          ${toName ? `<p class="evo-arrow-lite" aria-hidden="true">↓</p>${sprite(row.toDex, row.variant || "normal", 96, row.gender)}<p><strong>${esc(toName)}</strong>${toMeta ? ` · ${esc(toMeta)}` : ""}</p>` : ""}
        </div>
        <div class="evo-reqs">
          <p class="eyebrow">Requirements</p>
          ${requirementHtml(row)}
        </div>
        ${row.eligibleCount ? `<p><button type="button" class="secondary" data-view-eligible="${row.dex}">View eligible Pokémon</button></p>` : ""}`;
    }
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
    const multi = mons.length > 1;
    if (els.oakTitle) {
      els.oakTitle.textContent = "Transfer Pokémon?";
    }
    if (els.oakSprites) {
      if (!multi) {
        const mon = mons[0];
        const src = window.playOakTransfer?.spriteUrl
          ? window.playOakTransfer.spriteUrl(mon)
          : window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
        const shiny = String(mon.variant || "").includes("shiny") ? "✨ " : "";
        const formBit = mon.formName ? ` · ${mon.formName}` : "";
        const meta = [dexLabel(mon.dex), mon.level ? `Lv. ${mon.level}` : ""].filter(Boolean).join(" · ");
        els.oakSprites.innerHTML = `<div class="oak-confirm-hero">
          <img src="${esc(src)}" alt="" width="112" height="112">
          <strong>${shiny}${esc(mon.name || mon.nickname || "Pokémon")}</strong>
          <span>${esc(meta)}${esc(formBit)}</span>
        </div>`;
      } else {
        els.oakSprites.innerHTML = `<p class="oak-confirm-count">${mons.length} Pokémon selected</p>
          <div class="oak-confirm-row">${mons.slice(0, 8).map((mon) => {
            const src = window.playOakTransfer?.spriteUrl
              ? window.playOakTransfer.spriteUrl(mon)
              : window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
            return `<img src="${esc(src)}" alt="${esc(mon.name || "")}" width="56" height="56">`;
          }).join("")}${mons.length > 8 ? `<span class="oak-confirm-more">+${mons.length - 8}</span>` : ""}</div>`;
      }
    }
    if (els.oakCopy) {
      const candyRows = [];
      const seen = new Set();
      for (const mon of mons) {
        const id = candyIdentity(mon);
        const key = id.familyId || id.baseDex || id.label;
        if (seen.has(key)) continue;
        seen.add(key);
        candyRows.push(id);
      }
      const candyHtml = candyRows.length
        ? `<div class="oak-confirm-result">
            <p class="oak-confirm-result-label">Transfer result</p>
            ${candyRows.map((row) => `<span class="oak-confirm-candy-row">${candyArtHtml(row, 40)}<span>${esc(row.label)}</span></span>`).join("")}
            ${multi ? `<p class="oak-confirm-amount-note">Reward amounts are confirmed when Professor Oak receives each Pokémon.</p>` : ""}
          </div>`
        : "";
      const warn = multi
        ? `Sending these Pokémon to Professor Oak permanently removes them from your collection. Professor Oak will provide Evolution Candy for each Evolution Line after receiving them. This cannot be undone.`
        : `Sending this Pokémon to Professor Oak permanently removes it from your collection. Professor Oak will provide Evolution Candy for its Evolution Line after receiving it. This cannot be undone.`;
      els.oakCopy.innerHTML = `${candyHtml}<div class="oak-confirm-warn"><p>${esc(warn)}</p></div>`;
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

      const summary = window.playOakTransfer?.rewardSummary
        ? window.playOakTransfer.rewardSummary(successes, data?.families || [])
        : [];
      const title = "Transferred to Professor Oak";
      let body = "";
      if (successes.length === 1) {
        const mon = successes[0].mon;
        const name = mon?.name || mon?.nickname || "Pokémon";
        body = `${name} was sent to Professor Oak.`;
        if (summary[0]?.qty) body += `\nReceived ${summary[0].label} ×${summary[0].qty}.`;
      } else {
        body = `${successes.length} Pokémon were sent to Professor Oak.`;
        if (summary.length) {
          body += `\nReceived: ${summary.map((row) => `${row.label} ×${row.qty}`).join(" · ")}`;
        }
      }
      if (typeof window.playToast === "function") {
        window.playToast({ kind: "success", title, body });
      }
      if (els.sendStatus) {
        els.sendStatus.textContent = failures.length
          ? `${failures.length} could not be sent: ${failures[0].error}`
          : "";
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
      oakLine: "Professor Oak: Remarkable research, Trainer!",
      extras: [],
      newDex: model.newDex,
      dexLabel: model.toDex != null ? `#${String(model.toDex).padStart(3, "0")}` : "",
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
    const rewardItems = (panel.extras || []).map((line) => `<li>${esc(line)}</li>`).join("");
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
        <div class="evo-stage-shell" data-evo-shell>
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
          </div>
          <article class="evo-result-card evo-result-lab" data-evo-result aria-hidden="true">
            <p class="evo-oak-flavor">${esc(panel.oakLine || "Professor Oak: Remarkable research, Trainer!")}</p>
            <img src="${esc(toUrl)}" alt="${esc(model.toName || "")}" width="128" height="128" decoding="async">
            <h2>${esc(panel.title || "EVOLUTION COMPLETE!")}</h2>
            <p>${esc(lines.done)}</p>
            ${panel.newDex ? `<p class="evo-newdex">New Pokédex ${esc(panel.dexLabel || "")} ${esc(model.toName || "")}</p>` : ""}
            ${rewardItems ? `<ul class="evo-rewards">${rewardItems}</ul>` : ""}
            <button type="button" class="evo-continue" data-evo-continue>Continue</button>
          </article>
        </div>`;
      document.body.classList.add("evo-playing");
      document.body.append(overlay);
      const root = overlay.querySelector("[data-evo-root]");
      const resultCard = overlay.querySelector("[data-evo-result]");
      const continueBtn = overlay.querySelector("[data-evo-continue]");
      root?.focus();
      let done = false;
      let phase = "anim"; // anim | typing | wait | result | closing
      let pageIndex = 0;
      let typeToken = 0;
      let pageToken = 0;
      let skipAnim = false;
      let finishTyping = false;
      let ending = false;
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
        continueBtn?.removeEventListener("click", onContinue);
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
        if (!full) return;
        finishTyping = false;
        const delay = reduced ? 16 : 32;
        for (let i = 0; i < full.length; i += 1) {
          if (done || token !== typeToken) return;
          if (finishTyping) {
            el.textContent = full;
            return;
          }
          el.textContent = full.slice(0, i + 1);
          await wait(delay);
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

      const typeIntro = async () => {
        setWaiting(false);
        setLines("", "");
        await typeText(line1, lines.what);
        if (done || skipAnim || ending) return;
        await typeText(line2, lines.evolving);
      };

      const showResultCard = async () => {
        if (done || phase === "result" || phase === "closing") return;
        phase = "result";
        setWaiting(false);
        overlay.dataset.stage = "result";
        overlay.classList.add("is-result");
        overlay.setAttribute("aria-label", "Evolution complete");
        resultCard?.setAttribute("aria-hidden", "false");
        if (reduced) {
          continueBtn?.focus();
          return;
        }
        await wait(520);
        if (!done) continueBtn?.focus();
      };

      const beginDialogueFlow = async () => {
        if (done || ending || phase === "closing" || phase === "result") return;
        ending = true;
        skipAnim = true;
        finishTyping = true;
        typeToken += 1;
        pageToken += 1;
        actor?.classList.remove("is-bright", "is-sil");
        overlay.dataset.stage = "reveal";
        overlay.classList.add("is-finale");
        overlay.setAttribute("aria-label", "Evolution complete");
        showWhich("to", false);
        cue("reveal");
        if (model.newDex) cue("pokedex");
        pageIndex = 0;
        finishTyping = false;
        await typePage(pages[0] || { line1: lines.congrats, line2: lines.done });
      };

      const advanceDialogue = async () => {
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
          await showResultCard();
          return;
        }
        await typePage(pages[pageIndex]);
      };

      const onContinue = (event) => {
        event.preventDefault();
        event.stopPropagation();
        finish();
      };

      const onClick = (event) => {
        if (event.button != null && event.button !== 0) return;
        if (event.target?.closest?.("[data-evo-continue]")) return;
        event.preventDefault();
        if (done) return;
        if (phase === "anim") {
          beginDialogueFlow();
          return;
        }
        if (phase === "result") {
          finish();
          return;
        }
        advanceDialogue();
      };

      const onKey = (event) => {
        if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (done) return;
          if (phase === "anim") {
            beginDialogueFlow();
            return;
          }
          if (phase === "result") {
            finish();
            return;
          }
          advanceDialogue();
        }
      };

      document.addEventListener("keydown", onKey);
      overlay.addEventListener("click", onClick);
      continueBtn?.addEventListener("click", onContinue);

      const stopped = () => done || skipAnim || ending;
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
        await typeIntro();
        if (stopped()) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }
        await wait(reduced ? 180 : 420);
        if (stopped()) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }

        if (reduced) {
          overlay.dataset.stage = "build";
          showWhich("from", true);
          await wait(320);
          if (stopped()) {
            if (!done && !ending) await beginDialogueFlow();
            return;
          }
          overlay.dataset.stage = "morph";
          showWhich("to", true);
          await wait(320);
          if (stopped()) {
            if (!done && !ending) await beginDialogueFlow();
            return;
          }
          overlay.dataset.stage = "reveal";
          showWhich("to", false);
          await wait(420);
          if (!done && !ending) await beginDialogueFlow();
          return;
        }

        overlay.dataset.stage = "build";
        cue("build");
        showWhich("from", true);
        await wait(mode === "high" ? 1000 : 750);
        if (stopped()) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }

        overlay.dataset.stage = "morph";
        overlay.classList.add("is-sparking");
        const slowHold = mode === "high" ? 420 : 340;
        const midHold = mode === "high" ? 210 : 170;
        const fastHold = mode === "high" ? 105 : 90;
        if (!(await pulsePairs(mode === "high" ? 3 : 2, slowHold))) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }
        if (!(await pulsePairs(mode === "high" ? 4 : 3, midHold))) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }
        if (!(await pulsePairs(mode === "high" ? 6 : 5, fastHold))) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }

        overlay.dataset.stage = "climax";
        showWhich("to", true);
        await softFlash(mode === "high" ? 220 : 160);
        if (stopped()) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }
        await wait(mode === "high" ? 380 : 280);
        if (stopped()) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }
        await softFlash(mode === "high" ? 180 : 120);
        if (stopped()) {
          if (!done && !ending) await beginDialogueFlow();
          return;
        }

        overlay.dataset.stage = "reveal";
        overlay.classList.add("is-finale");
        showWhich("to", false);
        await wait(mode === "high" ? 900 : 650);
        if (!done && !ending) await beginDialogueFlow();
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
      // Ack reward notices without a second result card — the GBA dialogue already covered the beat.
      try { await window.playCall("play_notices"); } catch (_) {}
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

  restoreResearchTrack();
  const bootHash = parseLabHash(window.location.hash);
  if (bootHash.track) rememberResearchTrack(bootHash.track);
  setTab(bootHash.tab, { track: bootHash.track || undefined, skipHash: false });

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
    tabs[next].focus({ preventScroll: true });
  });

  els.app?.addEventListener("click", (event) => {
    const trackBtn = event.target.closest("[data-research-track]");
    if (trackBtn) {
      event.preventDefault();
      setResearchTrack(trackBtn.dataset.researchTrack);
      return;
    }
    const claim = event.target.closest("[data-claim-research]");
    if (claim) {
      event.preventDefault();
      claimResearch(claim.dataset.claimResearch);
      return;
    }
    const switcher = event.target.closest("[data-switch-tab]");
    if (!switcher) return;
    event.preventDefault();
    setTab(switcher.dataset.switchTab);
  });

  els.researchTracklist?.addEventListener("keydown", (event) => {
    const tabs = [...(els.researchTracklist?.querySelectorAll("[data-research-track]") || [])];
    if (!tabs.length) return;
    const current = tabs.findIndex((btn) => btn.getAttribute("aria-selected") === "true");
    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const focused = document.activeElement?.closest?.("[data-research-track]");
      if (focused) setResearchTrack(focused.dataset.researchTrack);
      return;
    } else return;
    event.preventDefault();
    setResearchTrack(tabs[next].dataset.researchTrack);
    tabs[next].focus();
  });

  window.addEventListener("hashchange", () => {
    const parsed = parseLabHash(window.location.hash);
    if (parsed.track) rememberResearchTrack(parsed.track);
    if (parsed.tab !== activeTab || (parsed.tab === "research" && parsed.track && parsed.track !== activeResearchTrack)) {
      setTab(parsed.tab, { track: parsed.track || undefined, skipHash: true });
    }
  });

  els.sendGrid?.addEventListener("click", (event) => {
    const inspectBtn = event.target.closest("[data-oak-inspect]");
    if (inspectBtn) {
      event.preventDefault();
      event.stopPropagation(); // inspect must not toggle transfer selection
      openOakInspect(inspectBtn.dataset.oakInspect, inspectBtn);
      return;
    }
    const selectBtn = event.target.closest("[data-oak-select]");
    if (!selectBtn) return;
    event.preventDefault();
    event.stopPropagation(); // select must not open inspect
    const id = selectBtn.dataset.oakSelect;
    if (!id) return;
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

  els.inspectModal?.addEventListener("click", (event) => {
    if (event.target === els.inspectModal) els.inspectModal.close();
  });
  els.inspectModal?.addEventListener("close", () => {
    const back = inspectReturnFocus;
    inspectReturnFocus = null;
    if (back && typeof back.focus === "function") {
      try { back.focus({ preventScroll: true }); } catch (_) { back.focus(); }
    }
  });

  els.grid?.addEventListener("click", (event) => {
    const showAll = event.target.closest("[data-evo-show-all]");
    if (showAll) {
      event.preventDefault();
      event.stopPropagation();
      setFilter("all");
      renderReady();
      return;
    }
    const inspectBtn = event.target.closest("[data-evo-inspect]");
    if (inspectBtn) {
      event.preventDefault();
      event.stopPropagation(); // inspect must not start evolution
      openOakInspect(inspectBtn.dataset.evoInspect, inspectBtn);
      return;
    }
    const actBtn = event.target.closest("[data-evo-act]");
    if (!actBtn) return;
    event.preventDefault();
    event.stopPropagation(); // evolve footer must not open inspect
    const card = actBtn.closest("[data-evo]");
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
  els.viewReady?.addEventListener("click", () => {
    setFilter("ready");
    renderReady();
    const reduce = window.playPerfReduced?.() || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    els.grid?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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
    if (event.target === els.modal) {
      closeModal();
      return;
    }
    const btn = event.target.closest("[data-view-eligible]");
    if (!btn) return;
    event.preventDefault();
    const dex = Number(btn.dataset.viewEligible);
    const row = readyRows().find((item) => Number(item.dex) === dex);
    focusEligible(dex, row?.name || pick?.name);
  });
  els.modal?.addEventListener("close", () => {
    els.modal?.classList.remove("is-ready-confirm");
    const back = evoReturnFocus;
    evoReturnFocus = null;
    if (back && typeof back.focus === "function") {
      try { back.focus({ preventScroll: true }); } catch (_) { back.focus(); }
    }
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
  supabase.auth.onAuthStateChange((event, session) => { if (window.playAuthNoise(event, session)) return; load(); });
  load();
})();
