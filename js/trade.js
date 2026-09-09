(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("trade-app"),
    q: document.getElementById("trade-q"),
    want: document.getElementById("trade-want"),
    login: document.getElementById("trade-login"),
    board: document.getElementById("trade-board"),
    status: document.getElementById("trade-status"),
    listPanel: document.getElementById("list-panel"),
    listMon: document.getElementById("list-mon"),
    listWant: document.getElementById("list-want"),
    listNote: document.getElementById("list-note"),
    detail: document.getElementById("listing-detail")
  };
  let storage = null;
  let listingMon = null;

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      els.gate.hidden = false;
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

  function card(listing) {
    const mon = listing.mon || {};
    const want = listing.wantDex ? window.playSpeciesName(listing.wantDex) : "Open to offers";
    const trainer = listing.trainer || {};
    const shiny = String(mon.variant || "").includes("shiny");
    return `<article class="trade-pad" data-listing="${listing.id}">
      <div class="trade-pad-trainer">
        <img src="${trainerSprite(trainer)}" alt="">
        <strong>${window.playEscapeAttr(trainer.displayName || "Trainer")}</strong>
        ${listing.mine ? `<span class="trade-mine">Your listing</span>` : ""}
      </div>
      <div class="trade-pad-mon">
        <img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="">
        ${shiny ? `<span class="lgpe-spark">✦</span>` : ""}
        ${mon.isAlpha ? `<span class="lgpe-alpha-pip">α</span>` : ""}
        <strong>${window.playEscapeAttr(monName(mon))}</strong>
        <span>Lv. ${mon.level || 1}</span>
      </div>
      <p class="trade-pad-want">Wants ${window.playEscapeAttr(want)}</p>
    </article>`;
  }

  async function loadBoard() {
    els.status.textContent = "Searching…";
    try {
      const data = await window.playCall("play_trade_board", {
        p_query: els.q.value.trim(),
        p_dex: wantDex(els.want.value),
        p_login: els.login.value.trim() || null
      });
      const rows = data.listings || [];
      els.board.innerHTML = rows.length ? rows.map(card).join("") : `<p class="muted">Nothing on the board matches that.</p>`;
      els.status.textContent = `${rows.length} listing${rows.length === 1 ? "" : "s"}`;
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  }

  async function openListing(id) {
    try {
      const data = await window.playCall("play_trade_listing", { p_id: id });
      const listing = data.listing;
      const mon = listing.mon || {};
      const offers = listing.offerRows || [];
      const mine = listing.mine;
      els.detail.hidden = false;
      els.detail.innerHTML = `
        <div class="trade-detail-hero">
          <img class="trade-detail-trainer" src="${trainerSprite(listing.trainer)}" alt="">
          <div>
            <h2>${window.playEscapeAttr(monName(mon))}</h2>
            <p class="muted">${window.playEscapeAttr(listing.trainer?.displayName || "Trainer")} · ${listing.wantDex ? `wants ${window.playSpeciesName(listing.wantDex)}` : "open to offers"}</p>
          </div>
          <img class="trade-detail-mon" src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="">
        </div>
        ${listing.note ? `<p>${listing.note}</p>` : ""}
        ${mine ? `<div class="links"><button id="cancel-listing" class="secondary" type="button">Take down</button></div>
          <h3>Offers</h3>
          <div id="offer-list">${offers.length ? offers.map((row) => `
            <article class="caught-card">
              <img src="${window.playSpriteUrl(row.mon.dex, row.mon.variant)}" alt="">
              <strong>${monName(row.mon)}</strong>
              <span>${row.trainer?.displayName || "Trainer"}</span>
              <div class="links">
                <button type="button" data-accept="${row.id}">Accept</button>
                <button type="button" class="secondary" data-decline="${row.id}">Decline</button>
              </div>
            </article>`).join("") : "<p class=\"muted\">No offers yet.</p>"}</div>`
          : `<label class="field" for="offer-pick">Offer one of yours
              <select id="offer-pick">${(storage?.mons || []).filter((row) => !row.listed && !row.onTeam).map((row) =>
                `<option value="${row.id}">${monName(row)} · ${row.publicId || ""}</option>`).join("")}</select>
            </label>
            <div class="links"><button id="send-offer" type="button">Send offer</button></div>`}`;
      document.getElementById("cancel-listing")?.addEventListener("click", async () => {
        await window.playCall("play_trade_cancel", { p_listing_id: listing.id });
        els.detail.hidden = true;
        loadBoard();
      });
      document.getElementById("send-offer")?.addEventListener("click", async () => {
        const catchId = document.getElementById("offer-pick")?.value;
        if (!catchId) return;
        els.status.textContent = "Sending…";
        try {
          const result = await window.playCall("play_trade_offer", { p_listing_id: listing.id, p_catch_id: catchId });
          els.status.textContent = result.message || "Offer sent.";
          loadBoard();
        } catch (error) {
          els.status.textContent = window.playRpcError(error);
        }
      });
      els.detail.querySelectorAll("[data-accept]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            const result = await window.playCall("play_trade_accept", { p_offer_id: button.dataset.accept });
            els.status.textContent = result.message || "Trade complete.";
            els.detail.hidden = true;
            loadBoard();
          } catch (error) {
            els.status.textContent = window.playRpcError(error);
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
    try { snapshot = await window.playCall("play_state"); } catch (_) {}
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer });
    els.gate.hidden = true;
    els.app.hidden = false;
    try { storage = await window.playCall("play_storage"); } catch (_) { storage = { mons: [] }; }
    const listId = new URLSearchParams(location.search).get("list");
    if (listId) {
      listingMon = (storage.mons || []).find((row) => String(row.id) === listId);
      if (listingMon) {
        els.listPanel.hidden = false;
        els.listMon.innerHTML = `<p><strong>${monName(listingMon)}</strong> · ${listingMon.publicId || ""} · Lv. ${listingMon.level || 1}</p>`;
      }
    }
    await loadBoard();
  }

  document.getElementById("trade-search").addEventListener("click", loadBoard);
  els.board.addEventListener("click", (event) => {
    const cardEl = event.target.closest("[data-listing]");
    if (cardEl) openListing(cardEl.dataset.listing);
  });
  document.getElementById("list-submit")?.addEventListener("click", async () => {
    if (!listingMon) return;
    els.status.textContent = "Listing…";
    try {
      const result = await window.playCall("play_trade_create", {
        p_catch_id: listingMon.id,
        p_want_dex: wantDex(els.listWant.value),
        p_note: els.listNote.value
      });
      els.status.textContent = result.message || "Listed.";
      els.listPanel.hidden = true;
      history.replaceState(null, "", "./trade.html");
      loadBoard();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
