(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("trade-app"),
    q: document.getElementById("trade-q"),
    want: document.getElementById("trade-want"),
    filter: document.getElementById("trade-filter"),
    board: document.getElementById("trade-board"),
    myBoard: document.getElementById("my-board"),
    myTrades: document.getElementById("my-trades"),
    status: document.getElementById("trade-status"),
    count: document.getElementById("trade-count"),
    ticker: document.getElementById("gts-ticker"),
    listOpen: document.getElementById("list-open"),
    listModal: document.getElementById("list-modal"),
    listTitle: document.getElementById("list-title"),
    listStepNote: document.getElementById("list-step-note"),
    listStepPc: document.getElementById("list-step-pc"),
    listStepWant: document.getElementById("list-step-want"),
    listPcSearch: document.getElementById("list-pc-search"),
    listPcGrid: document.getElementById("list-pc-grid"),
    listPicked: document.getElementById("list-picked"),
    listWant: document.getElementById("list-want"),
    wantOpen: document.getElementById("want-open"),
    wantPreview: document.getElementById("want-pick-preview"),
    wantModal: document.getElementById("want-modal"),
    wantSearch: document.getElementById("want-search"),
    wantGrid: document.getElementById("want-grid"),
    wantCount: document.getElementById("want-count"),
    wantAny: document.getElementById("want-any"),
    listWantTraits: document.getElementById("list-want-traits"),
    listWantMale: document.getElementById("list-want-male"),
    listWantFemale: document.getElementById("list-want-female"),
    listWantMaleWrap: document.getElementById("list-want-male-wrap"),
    listWantFemaleWrap: document.getElementById("list-want-female-wrap"),
    listWantShiny: document.getElementById("list-want-shiny"),
    listWantShinyWrap: document.getElementById("list-want-shiny-wrap"),
    listAccept: document.getElementById("list-accept"),
    listNote: document.getElementById("list-note"),
    listBack: document.getElementById("list-back"),
    listNext: document.getElementById("list-next"),
    listStatus: document.getElementById("list-status"),
    detailModal: document.getElementById("detail-modal"),
    detailTitle: document.getElementById("detail-title"),
    detail: document.getElementById("listing-detail"),
    species: document.getElementById("gts-species")
  };

  let session = null;
  let storage = { mons: [] };
  let listings = [];
  let listingMon = null;
  let listStep = 1;
  let offerPick = null;
  let gtsChannel = null;
  let pollTimer = 0;
  let filterTimer = 0;

  window.playBindAccountNav({
    onSignOut() {
      session = null;
      storage = { mons: [] };
      listingMon = null;
      if (els.gate) els.gate.hidden = false;
      if (els.myTrades) els.myTrades.hidden = true;
      renderBoard();
    }
  });

  function wantDex(value) {
    const matches = window.playParseSpeciesQuery(value);
    return matches[0]?.dex || null;
  }

  function monName(mon) {
    if (!mon) return "Pokémon";
    const shiny = String(mon.variant || "").includes("shiny") ? "Shiny " : "";
    return mon.nickname || `${shiny}${mon.name}`;
  }

  function trainerSprite(trainer) {
    const id = trainer?.sprite;
    if (typeof window.playTrainerSpriteUrl === "function") return window.playTrainerSpriteUrl(id);
    return trainer?.avatar || "";
  }

  function wantArt(listingOrDex, shiny) {
    const dex = listingOrDex && typeof listingOrDex === "object" ? listingOrDex.wantDex : listingOrDex;
    const isShiny = listingOrDex && typeof listingOrDex === "object" ? listingOrDex.wantShiny : shiny;
    return dex ? window.playSpriteUrl(dex, isShiny ? "shiny" : "normal") : "images/items/poke-ball.png";
  }

  function timeAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "just now";
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function wantCopy(listing) {
    if (!listing.wantDex) return "Open to any offer";
    const bits = [];
    if (listing.wantGender === "Male" || listing.wantGender === "Female") bits.push(listing.wantGender);
    if (listing.wantShiny) bits.push("Shiny");
    bits.push(window.playSpeciesName(listing.wantDex));
    const name = bits.join(" ");
    return listing.acceptAny === false ? `Looking for ${name}` : `Looking for ${name}, or other offers`;
  }

  function fillSpeciesList() {
    if (!els.species) return;
    const names = window.PLAY_SPECIES || [];
    els.species.innerHTML = names.map((name, index) =>
      `<option value="${window.playEscapeAttr(name)}">No. ${String(index + 1).padStart(3, "0")}</option>`
    ).join("");
  }

  function availableMons() {
    return (storage?.mons || []).filter((row) => !row.listed);
  }

  function card(listing, index) {
    const mon = listing.mon || {};
    const trainer = listing.trainer || {};
    const shiny = String(mon.variant || "").includes("shiny");
    const delay = ((index % 8) * 0.18).toFixed(2);
    const offers = Number(listing.offers) || 0;
    return `<article class="gts-card${listing.mine ? " is-mine" : ""}${shiny ? " is-shiny" : ""}" data-listing="${listing.id}" role="button" tabindex="0" style="--gts-delay:${delay}s">
      <header class="gts-card-trainer">
        <img src="${window.playEscapeAttr(trainerSprite(trainer))}" alt="">
        <div>
          <strong>${window.playEscapeAttr(trainer.displayName || "Trainer")}</strong>
          <span>${timeAgo(listing.createdAt)}${listing.mine ? " · Your Open Trades" : ""}</span>
        </div>
      </header>
      <div class="gts-swap">
        <div class="gts-slot">
          <div class="gts-sprite">
            <img src="${window.playEscapeAttr(window.playSpriteUrl(mon.dex, mon.variant))}" alt="">
            ${shiny ? `<span class="lgpe-spark">✦</span>` : ""}
            ${mon.isAlpha ? `<span class="lgpe-alpha-pip">α</span>` : ""}
          </div>
          <strong>${window.playEscapeAttr(monName(mon))}</strong>
          <span class="gts-meta">Lv. ${mon.level || 1}</span>
        </div>
        <span class="gts-arrow" aria-hidden="true">⇄</span>
        <div class="gts-slot is-want">
          <div class="gts-sprite">
            <img src="${window.playEscapeAttr(wantArt(listing))}" alt="">
          </div>
          <strong>${listing.wantDex ? window.playEscapeAttr(window.playSpeciesName(listing.wantDex)) : "Any Pokémon"}</strong>
          <span class="gts-meta">${listing.acceptAny === false ? "That species only" : "Takes offers"}</span>
        </div>
      </div>
      <p class="gts-want">${window.playEscapeAttr(wantCopy(listing))}</p>
      ${listing.note ? `<p class="gts-note">“${window.playEscapeAttr(listing.note)}”</p>` : ""}
      <footer class="gts-card-foot">
        <span>${offers} offer${offers === 1 ? "" : "s"}</span>
        <span>View trade</span>
      </footer>
    </article>`;
  }

  function filteredListings() {
    const q = String(els.q?.value || "").trim().toLowerCase();
    const want = wantDex(els.want?.value);
    const mode = els.filter?.value || "all";
    return listings.filter((listing) => {
      const mon = listing.mon || {};
      const trainer = listing.trainer || {};
      const shiny = String(mon.variant || "").includes("shiny");
      const hay = [
        mon.name,
        mon.nickname,
        trainer.displayName,
        trainer.login
      ].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (want && listing.wantDex !== want) return false;
      if (mode === "seeking" && !listing.wantDex) return false;
      if (mode === "open" && listing.acceptAny === false) return false;
      if (mode === "shiny" && !shiny) return false;
      if (mode === "mine" && !listing.mine) return false;
      return true;
    });
  }

  function renderTicker() {
    if (!els.ticker) return;
    const recent = listings.slice(0, 8);
    if (!recent.length) {
      els.ticker.hidden = true;
      els.ticker.innerHTML = "";
      return;
    }
    const bits = recent.map((listing) => {
      const mon = listing.mon || {};
      const trainer = listing.trainer?.displayName || "A trainer";
      const want = listing.wantDex ? window.playSpeciesName(listing.wantDex) : "any Pokémon";
      return `<span>${window.playEscapeAttr(trainer)} deposited ${window.playEscapeAttr(monName(mon))} · seeking ${window.playEscapeAttr(want)}</span>`;
    });
    els.ticker.hidden = false;
    els.ticker.innerHTML = `<div class="gts-ticker-track">${bits.join("")}${bits.join("")}</div>`;
  }

  function renderBoard() {
    const rows = filteredListings();
    const mine = listings.filter((row) => row.mine);
    if (els.count) {
      els.count.textContent = listings.length
        ? `${listings.length} open trade${listings.length === 1 ? "" : "s"} on the GTS`
        : "The GTS is quiet. Be the first to list a Pokémon.";
    }
    if (els.board) {
      els.board.innerHTML = rows.length
        ? rows.map(card).join("")
        : `<p class="gts-empty">No open trades match that. Try a different search, or list one of yours.</p>`;
    }
    if (els.myTrades) els.myTrades.hidden = !session || !mine.length;
    if (els.myBoard && session) {
      els.myBoard.innerHTML = mine.map((row, index) => card(row, index)).join("");
    }
    renderTicker();
  }

  async function loadBoard(options) {
    const quiet = Boolean(options?.quiet);
    if (!quiet && els.status) els.status.textContent = "Scanning the GTS…";
    try {
      const data = await window.playCall("play_trade_board", {
        p_query: "",
        p_dex: null,
        p_login: null
      });
      listings = data.listings || [];
      renderBoard();
      if (els.status) els.status.textContent = "";
    } catch (error) {
      if (els.status) els.status.textContent = window.playRpcError(error);
    }
  }

  function pcTile(mon, selectedId) {
    const shiny = String(mon.variant || "").includes("shiny");
    const selected = String(mon.id) === String(selectedId);
    return `<button class="gts-pc-tile${selected ? " is-selected" : ""}" type="button" role="option" aria-selected="${selected ? "true" : "false"}" data-catch="${mon.id}">
      <img src="${window.playEscapeAttr(window.playSpriteUrl(mon.dex, mon.variant))}" alt="">
      ${shiny ? `<span class="lgpe-spark">✦</span>` : ""}
      ${mon.isAlpha ? `<span class="lgpe-alpha-pip">α</span>` : ""}
      <strong>${window.playEscapeAttr(monName(mon))}</strong>
      <span>Lv. ${mon.level || 1}</span>
    </button>`;
  }

  function renderListPc() {
    const q = String(els.listPcSearch?.value || "").trim().toLowerCase();
    const rows = availableMons().filter((mon) => {
      if (!q) return true;
      const hay = [mon.name, mon.nickname, mon.gender, shinyLabel(mon)].join(" ").toLowerCase();
      return hay.includes(q);
    });
    if (!els.listPcGrid) return;
    if (!rows.length) {
      els.listPcGrid.innerHTML = `<p class="muted">No Pokémon in your PC match that. Catch more on Play, or take one down from the GTS first.</p>`;
      return;
    }
    els.listPcGrid.innerHTML = rows.map((mon) => pcTile(mon, listingMon?.id)).join("");
  }

  function shinyLabel(mon) {
    return String(mon?.variant || "").includes("shiny") ? "shiny" : "";
  }

  function pickedHtml(mon) {
    if (!mon) return "";
    const shiny = String(mon.variant || "").includes("shiny");
    return `<div class="gts-picked-card">
      <div class="gts-sprite">
        <img src="${window.playEscapeAttr(window.playSpriteUrl(mon.dex, mon.variant))}" alt="">
        ${shiny ? `<span class="lgpe-spark">✦</span>` : ""}
      </div>
      <div>
        <strong>${window.playEscapeAttr(monName(mon))}</strong>
        <p>Lv. ${mon.level || 1}</p>
      </div>
    </div>`;
  }

  function setListStep(step) {
    listStep = step;
    const onPc = step === 1;
    if (els.listStepPc) els.listStepPc.hidden = !onPc;
    if (els.listStepWant) els.listStepWant.hidden = onPc;
    if (els.listBack) els.listBack.hidden = onPc;
    if (els.listTitle) els.listTitle.textContent = onPc ? "List a Pokémon for trade" : "What are you looking for?";
    if (els.listStepNote) {
      els.listStepNote.textContent = onPc
        ? "Choose a Pokémon from your PC, then tap Trade."
        : "Ask for a species, take other offers, and add a comment if you want.";
    }
    if (els.listNext) els.listNext.textContent = onPc ? "Trade" : "List on the GTS";
    if (els.listPicked) els.listPicked.innerHTML = pickedHtml(listingMon);
    if (els.listStatus) els.listStatus.textContent = "";
  }

  function chosenWantGender() {
    const options = window.playGenderOptions(wantDex(els.listWant?.value));
    const showGender = options.length === 2 && options.includes("Male") && options.includes("Female");
    if (!showGender) return null;
    const male = Boolean(els.listWantMale?.checked);
    const female = Boolean(els.listWantFemale?.checked);
    if (male && !female) return "Male";
    if (female && !male) return "Female";
    return null;
  }

  function updateWantTraits() {
    const dex = wantDex(els.listWant?.value);
    if (!dex) {
      if (els.listWantMale) els.listWantMale.checked = false;
      if (els.listWantFemale) els.listWantFemale.checked = false;
      if (els.listWantShiny) els.listWantShiny.checked = false;
      if (els.listWantMaleWrap) els.listWantMaleWrap.hidden = true;
      if (els.listWantFemaleWrap) els.listWantFemaleWrap.hidden = true;
      if (els.listWantShinyWrap) els.listWantShinyWrap.hidden = true;
      return;
    }
    const options = window.playGenderOptions(dex);
    const showGender = options.length === 2 && options.includes("Male") && options.includes("Female");
    if (els.listWantMaleWrap) els.listWantMaleWrap.hidden = !showGender;
    if (els.listWantFemaleWrap) els.listWantFemaleWrap.hidden = !showGender;
    if (els.listWantShinyWrap) els.listWantShinyWrap.hidden = false;
    if (!showGender) {
      if (els.listWantMale) els.listWantMale.checked = false;
      if (els.listWantFemale) els.listWantFemale.checked = false;
    }
  }

  function renderWantPreview() {
    const dex = wantDex(els.listWant?.value);
    if (!els.wantPreview) return;
    if (!dex) {
      els.wantPreview.innerHTML = `<img src="images/items/poke-ball.png" alt=""><strong>Any Pokémon</strong>`;
      return;
    }
    els.wantPreview.innerHTML = `<img src="${window.playEscapeAttr(window.playSpriteUrl(dex))}" alt=""><strong>${window.playEscapeAttr(window.playSpeciesName(dex))}</strong>`;
  }

  function speciesRows(query) {
    const q = String(query || "").trim().toLowerCase();
    const names = window.PLAY_SPECIES || [];
    return names.map((name, index) => ({ dex: index + 1, name })).filter((row) => {
      if (!q) return true;
      const num = String(row.dex).padStart(3, "0");
      return row.name.toLowerCase().includes(q) || num.includes(q) || String(row.dex) === q;
    });
  }

  function renderWantGrid() {
    if (!els.wantGrid) return;
    const rows = speciesRows(els.wantSearch?.value);
    if (els.wantCount) {
      els.wantCount.textContent = rows.length
        ? `${rows.length} Pokémon`
        : "No Pokémon match that search.";
    }
    els.wantGrid.innerHTML = rows.map((row) =>
      `<button class="gts-dex-tile" type="button" role="option" data-name="${window.playEscapeAttr(row.name)}">
        <img src="${window.playEscapeAttr(window.playSpriteUrl(row.dex))}" alt="">
        <strong>${window.playEscapeAttr(row.name)}</strong>
        <span>No. ${String(row.dex).padStart(3, "0")}</span>
      </button>`
    ).join("");
  }

  function pickWantSpecies(name) {
    if (els.listWant) els.listWant.value = name || "";
    if (!name && els.listAccept) els.listAccept.checked = true;
    renderWantPreview();
    updateWantTraits();
    els.wantModal?.close();
  }

  function openWantBrowser() {
    if (els.wantSearch) els.wantSearch.value = "";
    renderWantGrid();
    els.wantModal?.showModal();
    els.wantSearch?.focus();
  }

  async function openListWizard(preselectId) {
    if (!session) {
      if (els.gate) els.gate.hidden = false;
      els.gate?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try { storage = await window.playCall("play_storage"); } catch (_) { storage = { mons: [] }; }
    listingMon = preselectId
      ? availableMons().find((row) => String(row.id) === String(preselectId)) || null
      : null;
    if (els.listWant) els.listWant.value = "";
    if (els.listNote) els.listNote.value = "";
    if (els.listAccept) els.listAccept.checked = true;
    if (els.listPcSearch) els.listPcSearch.value = "";
    if (els.listWantMale) els.listWantMale.checked = false;
    if (els.listWantFemale) els.listWantFemale.checked = false;
    if (els.listWantShiny) els.listWantShiny.checked = false;
    renderWantPreview();
    updateWantTraits();
    renderListPc();
    setListStep(listingMon ? 2 : 1);
    els.listModal?.showModal();
  }

  async function submitListing() {
    if (!listingMon) {
      if (els.listStatus) els.listStatus.textContent = "Pick a Pokémon first.";
      return;
    }
    const dex = wantDex(els.listWant?.value);
    const acceptAny = Boolean(els.listAccept?.checked);
    if (!dex && !acceptAny) {
      if (els.listStatus) els.listStatus.textContent = "Choose a Pokémon you want, or take other offers.";
      return;
    }
    if (els.listWant?.value.trim() && !dex) {
      if (els.listStatus) els.listStatus.textContent = "Type a Kanto Pokédex name for what you want.";
      return;
    }
    if (els.listStatus) els.listStatus.textContent = "Listing…";
    try {
      const result = await window.playCall("play_trade_create", {
        p_catch_id: listingMon.id,
        p_want_dex: dex,
        p_note: els.listNote?.value || "",
        p_accept_any: dex ? acceptAny : true,
        p_want_gender: dex ? chosenWantGender() : null,
        p_want_shiny: Boolean(dex && els.listWantShiny?.checked)
      });
      if (els.listStatus) els.listStatus.textContent = result.message || "Listed.";
      els.listModal?.close();
      history.replaceState(null, "", "./trade.html");
      await loadBoard();
    } catch (error) {
      if (els.listStatus) els.listStatus.textContent = window.playRpcError(error);
    }
  }

  function offerPool(listing) {
    let rows = availableMons();
    if (listing?.wantDex && listing.acceptAny === false) {
      rows = rows.filter((row) => Number(row.dex) === Number(listing.wantDex));
      if (listing.wantGender === "Male" || listing.wantGender === "Female") {
        rows = rows.filter((row) => row.gender === listing.wantGender);
      }
      if (listing.wantShiny) {
        rows = rows.filter((row) => String(row.variant || "").includes("shiny"));
      }
    }
    return rows;
  }

  async function openListing(id) {
    try {
      const data = await window.playCall("play_trade_listing", { p_id: id });
      const listing = data.listing;
      const mon = listing.mon || {};
      const offers = listing.offerRows || [];
      const mine = listing.mine;
      offerPick = null;
      if (els.detailTitle) els.detailTitle.textContent = mine ? "Your Open Trades" : "Trade details";
      const offeredShiny = String(mon.variant || "").includes("shiny");
      const hero = `
        <div class="gts-detail-hero">
          <div class="gts-card-trainer">
            <img src="${window.playEscapeAttr(trainerSprite(listing.trainer))}" alt="">
            <div>
              <strong>${window.playEscapeAttr(listing.trainer?.displayName || "Trainer")}</strong>
              <span>Deposited ${timeAgo(listing.createdAt)}</span>
            </div>
          </div>
          <div class="gts-swap">
            <div class="gts-slot">
              <div class="gts-sprite">
                <img src="${window.playEscapeAttr(window.playSpriteUrl(mon.dex, mon.variant))}" alt="">
                ${offeredShiny ? `<span class="lgpe-spark">✦</span>` : ""}
              </div>
              <strong>${window.playEscapeAttr(monName(mon))}</strong>
              <span class="gts-meta">Lv. ${mon.level || 1}</span>
            </div>
            <span class="gts-arrow" aria-hidden="true">⇄</span>
            <div class="gts-slot is-want">
              <div class="gts-sprite">
                <img src="${window.playEscapeAttr(wantArt(listing))}" alt="">
                ${listing.wantShiny ? `<span class="lgpe-spark">✦</span>` : ""}
              </div>
              <strong>${listing.wantDex ? window.playEscapeAttr(window.playSpeciesName(listing.wantDex)) : "Any Pokémon"}</strong>
              <span class="gts-meta">${listing.acceptAny === false ? "That species only" : "Takes offers"}</span>
            </div>
          </div>
          ${listing.note ? `<p class="gts-note">“${window.playEscapeAttr(listing.note)}”</p>` : ""}
        </div>`;
      if (mine) {
        els.detail.innerHTML = `${hero}
          <div class="links"><button id="cancel-listing" class="secondary" type="button">Cancel Trade</button></div>
          <h3>Offers</h3>
          <div id="offer-list" class="gts-offer-list">${offers.length ? offers.map((row) => `
            <article class="gts-offer">
              <img src="${window.playEscapeAttr(window.playSpriteUrl(row.mon.dex, row.mon.variant))}" alt="">
              <div>
                <strong>${window.playEscapeAttr(monName(row.mon))}</strong>
                <span>Lv. ${row.mon.level || 1} · ${window.playEscapeAttr(row.trainer?.displayName || "Trainer")}</span>
              </div>
              <div class="links">
                <button type="button" data-accept="${row.id}">Accept</button>
                <button type="button" class="secondary" data-decline="${row.id}">Decline</button>
              </div>
            </article>`).join("") : "<p class=\"muted\">No offers yet. Leave this deposit up and wait for a trainer.</p>"}</div>`;
      } else if (!session) {
        els.detail.innerHTML = `${hero}<p class="notice">Sign in with Twitch to send an offer.</p>`;
      } else {
        const pool = offerPool(listing);
        const hint = listing.wantDex && listing.acceptAny === false
          ? `This trainer only wants ${window.playSpeciesName(listing.wantDex)}.`
          : listing.wantDex
            ? `They asked for ${window.playSpeciesName(listing.wantDex)}, but other offers are OK.`
            : "This trainer will look at any offer.";
        els.detail.innerHTML = `${hero}
          <p class="muted">${window.playEscapeAttr(hint)}</p>
          <h3>Offer one of yours</h3>
          <div id="offer-pc" class="gts-pc-grid">${pool.length
            ? pool.map((row) => pcTile(row, null)).join("")
            : "<p class=\"muted\">You do not have a matching Pokémon to offer.</p>"}</div>
          <div class="links"><button id="send-offer" type="button" disabled>Send offer</button></div>
          <p id="offer-status" class="muted" role="status"></p>`;
      }
      els.detailModal?.showModal();

      document.getElementById("cancel-listing")?.addEventListener("click", async () => {
        await window.playCall("play_trade_cancel", { p_listing_id: listing.id });
        els.detailModal?.close();
        loadBoard();
      });
      document.getElementById("offer-pc")?.addEventListener("click", (event) => {
        const tile = event.target.closest("[data-catch]");
        if (!tile) return;
        offerPick = tile.dataset.catch;
        document.getElementById("offer-pc")?.querySelectorAll(".gts-pc-tile").forEach((el) => {
          el.classList.toggle("is-selected", el.dataset.catch === offerPick);
        });
        const send = document.getElementById("send-offer");
        if (send) send.disabled = !offerPick;
      });
      document.getElementById("send-offer")?.addEventListener("click", async () => {
        if (!offerPick) return;
        const status = document.getElementById("offer-status");
        if (status) status.textContent = "Sending…";
        try {
          const result = await window.playCall("play_trade_offer", { p_listing_id: listing.id, p_catch_id: offerPick });
          if (status) status.textContent = result.message || "Offer sent.";
          els.detailModal?.close();
          loadBoard();
        } catch (error) {
          if (status) status.textContent = window.playRpcError(error);
        }
      });
      els.detail.querySelectorAll("[data-accept]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            const result = await window.playCall("play_trade_accept", { p_offer_id: button.dataset.accept });
            if (els.status) els.status.textContent = result.message || "Trade complete.";
            els.detailModal?.close();
            loadBoard();
          } catch (error) {
            if (els.status) els.status.textContent = window.playRpcError(error);
          }
        });
      });
      els.detail.querySelectorAll("[data-decline]").forEach((button) => {
        button.addEventListener("click", async () => {
          await window.playCall("play_trade_decline", { p_offer_id: button.dataset.decline });
          openListing(listing.id);
        });
      });
    } catch (error) {
      if (els.status) els.status.textContent = window.playRpcError(error);
    }
  }

  function bindLive() {
    if (gtsChannel) supabase.removeChannel(gtsChannel);
    gtsChannel = supabase.channel("play-gts")
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_listings" }, () => loadBoard({ quiet: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_offers" }, () => loadBoard({ quiet: true }))
      .subscribe();
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadBoard({ quiet: true });
    }, 15000);
  }

  async function load() {
    fillSpeciesList();
    const { data: sessionData } = await supabase.auth.getSession();
    session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      if (els.gate) els.gate.hidden = false;
      if (els.myTrades) els.myTrades.hidden = true;
      storage = { mons: [] };
      await loadBoard();
      bindLive();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let snapshot = null;
    try { snapshot = await window.playCall("play_state"); } catch (_) {}
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer });
    if (els.gate) els.gate.hidden = true;
    try { storage = await window.playCall("play_storage"); } catch (_) { storage = { mons: [] }; }
    await loadBoard();
    bindLive();
    const listId = new URLSearchParams(location.search).get("list");
    if (listId) openListWizard(listId);
  }

  els.listModal?.querySelector("form")?.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
  });
  els.detailModal?.querySelector("form")?.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
  });
  els.wantModal?.querySelector("form")?.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
  });
  function dismissDialog(dialog, event) {
    if (!dialog || event.target !== dialog) return;
    dialog.close();
  }
  els.listModal?.addEventListener("click", (event) => dismissDialog(els.listModal, event));
  els.detailModal?.addEventListener("click", (event) => dismissDialog(els.detailModal, event));
  els.wantModal?.addEventListener("click", (event) => dismissDialog(els.wantModal, event));
  els.listOpen?.addEventListener("click", () => openListWizard());
  els.listPcGrid?.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-catch]");
    if (!tile) return;
    listingMon = availableMons().find((row) => String(row.id) === tile.dataset.catch) || null;
    renderListPc();
  });
  els.listPcSearch?.addEventListener("input", renderListPc);
  els.listBack?.addEventListener("click", () => setListStep(1));
  els.listNext?.addEventListener("click", () => {
    if (listStep === 1) {
      if (!listingMon) {
        if (els.listStatus) els.listStatus.textContent = "Select a Pokémon, then tap Trade.";
        return;
      }
      setListStep(2);
      return;
    }
    submitListing();
  });
  els.wantOpen?.addEventListener("click", openWantBrowser);
  els.wantAny?.addEventListener("click", () => pickWantSpecies(""));
  els.wantSearch?.addEventListener("input", renderWantGrid);
  els.wantGrid?.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-name]");
    if (!tile) return;
    pickWantSpecies(tile.dataset.name);
  });
  ["trade-q", "trade-want"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(renderBoard, 120);
    });
  });
  els.filter?.addEventListener("change", renderBoard);
  function listingFromEvent(event) {
    const cardEl = event.target.closest("[data-listing]");
    if (cardEl) openListing(cardEl.dataset.listing);
  }
  function listingKey(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const cardEl = event.target.closest("[data-listing]");
    if (!cardEl) return;
    event.preventDefault();
    openListing(cardEl.dataset.listing);
  }
  els.board?.addEventListener("click", listingFromEvent);
  els.board?.addEventListener("keydown", listingKey);
  els.myBoard?.addEventListener("click", listingFromEvent);
  els.myBoard?.addEventListener("keydown", listingKey);
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
