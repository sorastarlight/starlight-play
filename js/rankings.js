(() => {
  const supabase = window.playSupabase;
  const body = document.getElementById("rank-body");
  const status = document.getElementById("rank-status");
  const colA = document.getElementById("rank-col-a");
  const colB = document.getElementById("rank-col-b");
  const boards = document.getElementById("rank-boards");
  const podium = document.getElementById("rank-podium");
  const mine = document.getElementById("rank-me");
  let board = "level";

  window.playBindAccountNav();

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
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

  function labels() {
    if (board === "pokedex") return ["Pokédex", "Caught"];
    if (board === "shinies") return ["Shinies", "Pokédex"];
    if (board === "catches") return ["Catches", "Pokédex"];
    if (board === "evolutions") return ["Evolutions", "Lv"];
    if (board === "honey") return ["Honey", "Lv"];
    return ["Lv", "Pokédex"];
  }

  function score(row) {
    if (board === "pokedex") return `${row.species}/151`;
    if (board === "shinies") return row.shinies;
    if (board === "catches") return row.captures;
    if (board === "evolutions") return row.evolved;
    if (board === "honey") return row.honey;
    return `Lv. ${row.level}`;
  }

  function rowFace(row) {
    const sprite = window.playTrainerSpriteUrl
      ? window.playTrainerSpriteUrl(row.trainerSprite || "red-gen1")
      : "";
    const twitch = Boolean(row.twitchLinked);
    const img = sprite
      ? `<img class="rank-sprite" src="${window.playEscapeAttr(sprite)}" alt="" width="40" height="40" loading="lazy">`
      : window.playTwitchFaceHtml(row.avatar, row.displayName, "twitch-face-sm", twitch);
    return `<span class="rank-id${twitch ? " has-twitch" : ""}">${img}${twitch ? `<i class="twitch-badge" title="Twitch linked" aria-hidden="true"></i>` : ""}</span>`;
  }

  function renderPodium(rows) {
    if (!podium) return;
    const top = rows.slice(0, 3);
    if (!top.length) {
      podium.hidden = true;
      podium.innerHTML = "";
      return;
    }
    const placeClass = ["is-first", "is-second", "is-third"];
    podium.hidden = false;
    podium.innerHTML = top.map((row, index) => `
      <a class="rank-podium-card ${placeClass[index] || ""}" href="./trainer.html?u=${encodeURIComponent(row.login)}">
        <span class="rank-podium-place">#${row.place || index + 1}</span>
        ${rowFace(row)}
        <strong>${window.playEscapeAttr(row.displayName)}</strong>
        <span class="muted">${row.title ? `★ ${window.playEscapeAttr(row.title)}` : "Trainer"} · Lv. ${row.level || 1}</span>
        <span>${window.playEscapeAttr(String(score(row)))}</span>
      </a>`).join("");
  }

  function renderMine(me) {
    if (!mine) return;
    if (!me) {
      mine.hidden = true;
      mine.textContent = "";
      return;
    }
    mine.hidden = false;
    mine.innerHTML = `<strong>Your rank · #${me.place || "—"}</strong>
      <span> ${window.playEscapeAttr(me.displayName || "Trainer")} · ${window.playEscapeAttr(String(score(me)))}</span>`;
  }

  async function loadRanks() {
    try {
      const data = await window.playCall("play_rankings", { p_board: board });
      const rows = data?.trainers || [];
      const [a, b] = labels();
      if (colA) colA.textContent = a;
      if (colB) colB.textContent = b;
      status.textContent = rows.length ? `${rows.length} trainers · ${a}` : "No trainers ranked yet.";
      renderPodium(rows);
      renderMine(data?.me);
      body.innerHTML = rows.map((row, index) => {
        const face = rowFace(row);
        const left = board === "pokedex" ? `${row.species}/151`
          : board === "shinies" ? row.shinies
          : board === "catches" ? row.captures
          : board === "evolutions" ? row.evolved
          : board === "honey" ? row.honey
          : row.level;
        const right = board === "honey" || board === "evolutions" ? row.level : (board === "catches" || board === "shinies" ? row.species : row.caught);
        return `
        <tr>
          <td class="num">${row.place || index + 1}</td>
          <td class="rank-trainer">${face}<div><a href="./trainer.html?u=${encodeURIComponent(row.login)}">${window.playEscapeAttr(row.displayName)}</a><div class="muted">${row.title ? `★ ${window.playEscapeAttr(row.title)}` : "Trainer"} · Lv. ${row.level || 1}</div></div></td>
          <td class="num">${left}</td>
          <td class="num">${right}</td>
          <td>${window.playEscapeAttr(row.title || "—")}</td>
          <td>${row.online ? "Online" : "Away"}</td>
        </tr>`;
      }).join("");
    } catch (error) {
      status.textContent = window.playRpcError(error, "Rankings are not live yet.");
      if (body) body.innerHTML = "";
      if (podium) { podium.hidden = true; podium.innerHTML = ""; }
      if (mine) { mine.hidden = true; mine.textContent = ""; }
    }
  }

  boards?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-board]");
    if (!button) return;
    board = button.dataset.board;
    boards.querySelectorAll("[data-board]").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    loadRanks();
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; loadNav(); });
  loadNav();
  loadRanks();
})();
