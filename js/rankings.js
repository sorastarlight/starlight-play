(() => {
  const supabase = window.playSupabase;
  const body = document.getElementById("rank-body");
  const status = document.getElementById("rank-status");
  const colA = document.getElementById("rank-col-a");
  const colB = document.getElementById("rank-col-b");
  const boards = document.getElementById("rank-boards");
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
    try {
      const snapshot = await window.playCall("play_state");
      trainer = snapshot?.trainer;
      isAdmin = Boolean(snapshot?.isAdmin);
    } catch (_) {}
    window.playSetAccountNav(session, profile, { isAdmin, trainer });
  }

  function labels() {
    if (board === "pokedex") return ["Pokédex", "Caught"];
    if (board === "shinies") return ["Shinies", "Pokédex"];
    if (board === "catches") return ["Catches", "Pokédex"];
    if (board === "honey") return ["Honey", "Lv"];
    return ["Lv", "Pokédex"];
  }

  async function loadRanks() {
    try {
      const data = await window.playCall("play_rankings", { p_board: board });
      const rows = data?.trainers || [];
      const [a, b] = labels();
      if (colA) colA.textContent = a;
      if (colB) colB.textContent = b;
      status.textContent = rows.length ? `${rows.length} trainers · ${a}` : "No trainers ranked yet.";
      body.innerHTML = rows.map((row, index) => {
        const face = window.playTwitchFaceHtml(row.avatar, row.displayName, "twitch-face-sm");
        const left = board === "pokedex" ? `${row.species}/151`
          : board === "shinies" ? row.shinies
          : board === "catches" ? row.captures
          : board === "honey" ? row.honey
          : row.level;
        const right = board === "honey" ? row.level : (board === "catches" || board === "shinies" ? row.species : row.caught);
        return `
        <tr>
          <td class="num">${index + 1}</td>
          <td class="rank-trainer">${face}<div><a href="./trainer.html?u=${encodeURIComponent(row.login)}">${window.playEscapeAttr(row.displayName)}</a><div class="muted">@${window.playEscapeAttr(row.login)}</div></div></td>
          <td class="num">${left}</td>
          <td class="num">${right}</td>
          <td>${window.playEscapeAttr(row.title || "—")}</td>
          <td>${row.online ? "Online" : "Away"}</td>
        </tr>`;
      }).join("");
    } catch (error) {
      status.textContent = window.playRpcError(error, "Rankings are not live yet.");
      if (body) body.innerHTML = "";
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
