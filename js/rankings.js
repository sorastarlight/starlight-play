(() => {
  const supabase = window.playSupabase;
  const boardsEl = document.getElementById("rank-boards");
  const status = document.getElementById("rank-status");
  const defEl = document.getElementById("rank-board-def");
  const list = document.getElementById("rank-list");
  const mineBox = document.getElementById("rank-mine");
  const mineGrid = document.getElementById("rank-mine-grid");
  const pin = document.getElementById("rank-you-pin");
  const fail = document.getElementById("rank-fail");
  const moreBtn = document.getElementById("rank-more");
  const refreshBtn = document.getElementById("rank-refresh");
  const spotlight = document.getElementById("rank-spotlight");
  const recentBox = document.getElementById("rank-recent");
  const searchForm = document.getElementById("rank-search-form");
  const searchInput = document.getElementById("rank-search");
  const searchStatus = document.getElementById("rank-search-status");
  const searchResults = document.getElementById("rank-search-results");

  const BOARDS = ["level", "pokedex", "shinies", "catches", "evolutions", "mastery", "honey", "achievements"];
  const PAGE = 20;
  const FRESH_MS = 45000;
  const cache = new Map();

  let board = boardFromUrl();
  let offset = 0;
  let rows = [];
  let payload = null;
  let signedIn = false;
  let focusLogin = "";

  window.playBindAccountNav();

  function reduced() {
    return Boolean(window.playPerfReduced?.() || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  function boardFromUrl() {
    const query = new URLSearchParams(location.search).get("board");
    const hash = String(location.hash || "").replace(/^#/, "");
    const raw = String(query || hash || "level").toLowerCase();
    return BOARDS.includes(raw) ? raw : "level";
  }

  function setUrl(next) {
    const url = new URL(location.href);
    url.searchParams.set("board", next);
    url.hash = "";
    history.replaceState({}, "", url);
  }

  function pressBoard() {
    boardsEl?.querySelectorAll("[data-board]").forEach((item) => {
      item.setAttribute("aria-pressed", item.dataset.board === board ? "true" : "false");
    });
  }

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    signedIn = Boolean(session);
    if (!session) {
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let trainer = null;
    let isAdmin = false;
    let snapshot = null;
    try {
      snapshot = await window.playCall("play_state");
      trainer = snapshot?.trainer;
      isAdmin = Boolean(snapshot?.isAdmin);
    } catch (_) {}
    window.playSetAccountNav(session, profile, { isAdmin, trainer, twitchLinked: snapshot?.twitchLinked });
  }

  function face(row) {
    const sprite = window.playTrainerPortraitUrl
      ? window.playTrainerPortraitUrl(row.trainerSprite || "red-gen1")
      : (window.playTrainerSpriteUrl
        ? window.playTrainerSpriteUrl(row.trainerSprite || "red-gen1")
        : "");
    const twitch = Boolean(row.twitchLinked);
    const img = sprite
      ? `<img class="rank-sprite" src="${window.playEscapeAttr(sprite)}" alt="" width="48" height="48" loading="lazy">`
      : window.playTwitchFaceHtml(row.avatar, row.displayName, "twitch-face-sm", twitch);
    return `<span class="rank-id${twitch ? " has-twitch" : ""}">${img}${twitch ? `<i class="twitch-badge" title="Twitch linked" aria-hidden="true"></i>` : ""}</span>`;
  }

  function badges(row) {
    const items = (row.featuredBadges || []).slice(0, 3);
    if (!items.length) return "";
    return `<span class="rank-badges">${items.map((item) => `<span class="rank-badge">${window.playEscapeAttr(item.name || item.id)}</span>`).join("")}</span>`;
  }

  function placeLabel(place) {
    return `#${String(place).padStart(2, "0")}`;
  }

  function trainerCard(row, opts = {}) {
    const you = Boolean(opts.you);
    const top = Number(row.place) >= 1 && Number(row.place) <= 3 ? ` is-top-${row.place}` : "";
    const login = encodeURIComponent(row.login || "");
    const title = row.title ? `★ ${window.playEscapeAttr(row.title)}` : "Trainer";
    const metric = window.playEscapeAttr(String(row.metricText || row.metric || ""));
    const detail = row.metricDetail ? `<span class="muted">${window.playEscapeAttr(row.metricDetail)}</span>` : "";
    return `
      <article class="rank-row${you ? " is-you" : ""}${top}" id="rank-row-${window.playEscapeAttr(row.login || "")}" data-login="${window.playEscapeAttr(row.login || "")}">
        <span class="rank-mark" aria-label="Rank ${row.place}">${placeLabel(row.place)}</span>
        ${face(row)}
        <div class="rank-copy">
          <strong>${window.playEscapeAttr(row.displayName || "Trainer")}${you ? ` <span class="rank-you-tag">YOU</span>` : ""}</strong>
          <span class="muted">${title} · Lv. ${row.level || 1}</span>
          ${badges(row)}
        </div>
        <div class="rank-metric">
          <strong>${metric}</strong>
          ${detail}
        </div>
        <a class="button secondary rank-profile" href="./trainer.html?u=${login}">View Trainer</a>
      </article>`;
  }

  function skeleton(count = 6) {
    return Array.from({ length: count }, () => `<article class="rank-row is-skel" aria-hidden="true"><span class="rank-mark">#00</span><span class="rank-id"></span><div class="rank-copy"><strong>—</strong><span class="muted">—</span></div><div class="rank-metric"><strong>—</strong></div></article>`).join("");
  }

  function failBox(message) {
    const text = /sqlstate|column |relation |operator |undefined_function|postgres/i.test(message)
      ? "We couldn't load Trainer Rankings right now."
      : message;
    return `<div class="rank-fail" role="alert">
      <strong>RANKINGS UNAVAILABLE</strong>
      <p>${window.playEscapeAttr(text)}</p>
      <button type="button" class="button" data-rank-retry>TRY AGAIN</button>
    </div>`;
  }

  function emptyCopy() {
    if (board === "shinies") return "No Trainers have registered a Shiny yet. Be the first to register one!";
    if (board === "evolutions") return "No Trainers have evolved a Pokémon yet. Be the first!";
    if (board === "honey") return "No Honey has been contributed on an encounter yet.";
    if (board === "mastery") return "No Species Mastery points are on the board yet.";
    if (board === "achievements") return "No Achievements have been completed yet. Be the first!";
    if (board === "pokedex" || board === "catches") return "No Trainers have caught a Pokémon yet. Be the first!";
    return "NOT RANKED YET — keep playing to appear on this board.";
  }

  function renderMine(data) {
    if (!mineBox || !mineGrid) return;
    const ranks = (data?.myRanks || []).filter((row) => row && (row.ranked || row.board === "level"));
    if (!signedIn || data?.me?.eligible === false || !ranks.length) {
      mineBox.hidden = true;
      mineGrid.innerHTML = "";
      return;
    }
    mineBox.hidden = false;
    mineGrid.innerHTML = ranks.map((row) => {
      const ranked = Boolean(row.ranked);
      const value = ranked ? placeLabel(row.place) : "NOT RANKED YET";
      return `<button type="button" class="rank-mine-chip" data-my-board="${window.playEscapeAttr(row.board)}" aria-label="${window.playEscapeAttr(row.label)} ${ranked ? `rank ${row.place}` : "not ranked yet"}">
        <span>${window.playEscapeAttr(row.label)}</span>
        <strong>${window.playEscapeAttr(value)}</strong>
        <em>${ranked ? window.playEscapeAttr(row.metricText || "") : window.playEscapeAttr(row.hint || "Not ranked yet")}</em>
      </button>`;
    }).join("");
  }

  function renderPin(data) {
    if (!pin) return;
    const me = data?.me;
    if (!signedIn || !me?.ranked || !me.login) {
      pin.hidden = true;
      pin.innerHTML = "";
      return;
    }
    const inList = rows.some((row) => row.login === me.login);
    if (inList) {
      pin.hidden = true;
      pin.innerHTML = "";
      return;
    }
    pin.hidden = false;
    pin.innerHTML = `<p class="rank-pin-label">YOUR POSITION</p>${trainerCard(me, { you: true })}`;
  }

  function renderList(data) {
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = `<p class="rank-empty">${emptyCopy()}</p>`;
      return;
    }
    const meLogin = data?.me?.login;
    list.innerHTML = rows.map((row) => trainerCard(row, { you: Boolean(meLogin) && row.login === meLogin })).join("");
  }

  function renderDiscover(data) {
    if (spotlight) {
      const items = data?.spotlight || [];
      if (!items.length) {
        spotlight.hidden = true;
        spotlight.innerHTML = "";
      } else {
        spotlight.hidden = false;
        spotlight.innerHTML = `<h3>Trainer Spotlight</h3>
          <p class="muted">Recent public milestones. This is not a popularity ranking.</p>
          <div class="rank-discover-grid">${items.map((row) => `
            <a class="rank-discover-card" href="./trainer.html?u=${encodeURIComponent(row.login)}">
              ${face(row)}
              <strong>${window.playEscapeAttr(row.displayName)}</strong>
              <span class="muted">${window.playEscapeAttr(row.event || row.title || "Trainer")}</span>
            </a>`).join("")}</div>`;
      }
    }
    if (recentBox) {
      const items = data?.discover || [];
      if (!items.length) {
        recentBox.innerHTML = "";
        return;
      }
      recentBox.innerHTML = `<h3>Recently active</h3>
        <div class="rank-discover-grid">${items.map((row) => `
          <a class="rank-discover-card" href="./trainer.html?u=${encodeURIComponent(row.login)}">
            ${face(row)}
            <strong>${window.playEscapeAttr(row.displayName)}</strong>
            <span class="muted">${row.title ? `★ ${window.playEscapeAttr(row.title)}` : "Trainer"} · Lv. ${row.level || 1}</span>
          </a>`).join("")}</div>`;
    }
  }

  function showFail(error) {
    const raw = window.playHumanRpcError
      ? window.playHumanRpcError(error, "We couldn't load Trainer Rankings right now.")
      : window.playRpcError(error, "We couldn't load Trainer Rankings right now.");
    if (fail) {
      fail.hidden = false;
      fail.innerHTML = failBox(raw);
    }
    if (status) status.textContent = "";
    if (list) list.innerHTML = "";
    if (moreBtn) moreBtn.hidden = true;
  }

  function applyPayload(data, append) {
    payload = data;
    rows = append ? rows.concat(data?.trainers || []) : (data?.trainers || []);
    if (defEl) defEl.textContent = data?.definition || "";
    if (status) {
      const total = Number(data?.total || 0);
      status.textContent = total
        ? `${total} Trainer${total === 1 ? "" : "s"} · ${data?.metricLabel || "Rankings"} · lifetime`
        : emptyCopy();
    }
    if (fail) { fail.hidden = true; fail.innerHTML = ""; }
    renderMine(data);
    renderList(data);
    renderPin(data);
    if (!append) renderDiscover(data);
    if (moreBtn) {
      moreBtn.hidden = !data?.hasMore;
      moreBtn.disabled = false;
    }
    if (focusLogin) {
      const node = document.getElementById(`rank-row-${focusLogin}`) || pin?.querySelector(".rank-row");
      node?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
      node?.querySelector(".rank-profile")?.focus();
      focusLogin = "";
    }
  }

  async function fetchBoard(nextOffset, append) {
    const key = `${board}:${nextOffset}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < FRESH_MS) {
      applyPayload(hit.data, append);
      return;
    }
    const data = await window.playCall("play_rankings", {
      p_board: board,
      p_limit: PAGE,
      p_offset: nextOffset
    });
    cache.set(key, { at: Date.now(), data });
    applyPayload(data, append);
  }

  async function loadRanks(opts = {}) {
    const append = Boolean(opts.append);
    if (!append) {
      offset = 0;
      rows = [];
      if (defEl) defEl.textContent = "";
      if (list) {
        list.setAttribute("aria-busy", "true");
        list.innerHTML = skeleton();
      }
      if (status) status.textContent = "Loading rankings…";
    } else if (moreBtn) {
      moreBtn.disabled = true;
    }
    try {
      await fetchBoard(append ? offset : 0, append);
      if (append) offset += PAGE;
      else offset = PAGE;
    } catch (error) {
      if (!append) showFail(error);
      else if (status) status.textContent = window.playRpcError(error, "Could not load more Trainers.");
    } finally {
      list?.setAttribute("aria-busy", "false");
    }
  }

  function switchBoard(next, opts = {}) {
    if (!BOARDS.includes(next)) next = "level";
    board = next;
    focusLogin = opts.focusLogin || "";
    pressBoard();
    setUrl(board);
    loadRanks();
  }

  boardsEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-board]");
    if (!button) return;
    switchBoard(button.dataset.board);
  });

  mineGrid?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-my-board]");
    if (!chip) return;
    const meLogin = payload?.me?.login;
    switchBoard(chip.dataset.myBoard, { focusLogin: meLogin || "" });
  });

  moreBtn?.addEventListener("click", () => loadRanks({ append: true }));
  refreshBtn?.addEventListener("click", () => {
    cache.clear();
    loadRanks();
  });
  fail?.addEventListener("click", (event) => {
    if (event.target.closest("[data-rank-retry]")) loadRanks();
  });

  searchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const q = String(searchInput?.value || "").trim();
    if (q.length < 2) {
      if (searchStatus) searchStatus.textContent = "Type at least two letters of a Trainer name.";
      if (searchResults) searchResults.innerHTML = "";
      return;
    }
    if (searchStatus) searchStatus.textContent = "Searching…";
    try {
      const data = await window.playCall("play_trainer_search", { p_q: q });
      const found = data?.trainers || [];
      if (searchStatus) {
        searchStatus.textContent = found.length
          ? `${found.length} Trainer${found.length === 1 ? "" : "s"}`
          : "No public Trainers match that name.";
      }
      if (searchResults) {
        searchResults.innerHTML = found.map((row) => `
          <a class="rank-discover-card" href="./trainer.html?u=${encodeURIComponent(row.login)}">
            ${face(row)}
            <strong>${window.playEscapeAttr(row.displayName)}</strong>
            <span class="muted">${row.title ? `★ ${window.playEscapeAttr(row.title)}` : "Trainer"} · Lv. ${row.level || 1}</span>
          </a>`).join("");
      }
    } catch (error) {
      if (searchStatus) {
        searchStatus.textContent = window.playHumanRpcError
          ? window.playHumanRpcError(error, "Search is unavailable right now.")
          : window.playRpcError(error, "Search is unavailable right now.");
      }
    }
  });

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    loadNav();
    cache.clear();
    loadRanks();
  });
  pressBoard();
  setUrl(board);
  loadNav();
  loadRanks();
})();
