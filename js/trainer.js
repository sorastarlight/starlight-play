(() => {
  const supabase = window.playSupabase;
  const gate = document.getElementById("gate");
  const profileBox = document.getElementById("profile");
  const hero = document.getElementById("hero");
  const caught = document.getElementById("caught-grid");
  const title = document.getElementById("page-title");
  const ownerCustomize = document.getElementById("owner-customize");
  let card = null;
  let mine = false;
  let journalEntries = [];
  let journalCategory = "ALL";
  let journalLimit = 8;

  window.playBindAccountNav();

  function capturesToJournalEntries(recent) {
    const rows = Array.isArray(recent) ? recent : [];
    return rows.map((row) => ({
      type: "CAPTURE",
      at: row.caughtAt,
      title: `Caught ${window.playCaughtName(row)}`,
      body: "",
      dex: row.dex,
      variant: row.variant,
      formId: row.formId,
      gender: row.gender || "",
      ball: row.ball || "",
      place: row.routeName || row.locationName || row.area || ""
    })).filter((entry) => entry.at || entry.dex != null);
  }

  function renderJournal() {
    if (!caught) return;
    caught.innerHTML = window.playRenderAdventureLogHtml(journalEntries, {
      limit: journalLimit,
      category: journalCategory
    });
  }

  function bindJournalInteractions() {
    const host = document.getElementById("trainer-journal") || caught?.closest(".tid-module");
    if (!host || host.dataset.journalBound === "1") return;
    host.dataset.journalBound = "1";
    host.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-journal-cat]");
      if (tab) {
        journalCategory = tab.getAttribute("data-journal-cat") || "ALL";
        journalLimit = 8;
        renderJournal();
        return;
      }
      if (event.target.closest("[data-journal-more]")) {
        journalLimit += 8;
        renderJournal();
      }
    });
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
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return { session, profile };
  }

  function render(view, recent) {
    title.textContent = view?.displayName ? `${view.displayName}` : "Trainer ID";
    if (ownerCustomize) ownerCustomize.hidden = !mine;
    if (hero) {
      hero.innerHTML = window.playRenderIdCard(view, { mode: "public", variant: "hero" });
      hero.classList.remove("is-revealed");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => hero.classList.add("is-revealed"));
      });
    }
    const showcaseBody = document.getElementById("trainer-showcase-body");
    if (showcaseBody) showcaseBody.innerHTML = window.playRenderTrainerShowcaseHtml(view);
    const teamBody = document.getElementById("trainer-team-body");
    if (teamBody) teamBody.innerHTML = window.playRenderTrainerPartyHtml(view);
    if (recent) journalEntries = capturesToJournalEntries(recent);
    renderJournal();
    bindJournalInteractions();
  }

  async function load() {
    const nav = await loadNav();
    const login = new URLSearchParams(location.search).get("u")
      || nav?.profile?.twitch_login
      || nav?.profile?.username
      || "";
    if (!login) {
      gate.textContent = "Sign in, or open a trainer from Rankings.";
      return;
    }
    try {
      if (window.playTrainerCatalogReady) await window.playTrainerCatalogReady;
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      mine = Boolean(data.mine);
      journalEntries = capturesToJournalEntries(data.recent || []);
      journalCategory = "ALL";
      journalLimit = 8;
      render(card, data.recent || []);
      if (mine) {
        try {
          const prog = await window.playCall("play_progression");
          const achRows = (prog?.achievements || [])
            .filter((row) => row?.unlocked && (row.unlockedAt || row.unlocked_at))
            .map((row) => ({
              type: "ACHIEVEMENT",
              at: row.unlockedAt || row.unlocked_at,
              title: row.name || "Achievement earned",
              body: row.description || "Achievement earned",
              dex: null,
              variant: null,
              formId: null
            }));
          const evoRows = (prog?.recentEvolutions || prog?.evolutions || [])
            .filter((row) => row?.at || row?.evolvedAt || row?.createdAt)
            .map((row) => ({
              type: "EVOLUTION",
              at: row.at || row.evolvedAt || row.createdAt,
              title: row.title || (row.toName ? `${row.fromName || "Pokémon"} evolved into ${row.toName}` : "Evolution"),
              body: row.body || row.note || "",
              dex: row.toDex || row.dex || null,
              variant: row.variant || null,
              formId: row.formId || null
            }));
          if (achRows.length || evoRows.length) {
            journalEntries = journalEntries.concat(achRows, evoRows).sort((a, b) => {
              const ta = a.at ? new Date(a.at).getTime() : 0;
              const tb = b.at ? new Date(b.at).getTime() : 0;
              return tb - ta;
            });
            renderJournal();
          }
        } catch (_) {}
        if (typeof window.playSpecialMount === "function") {
          try {
            const special = await window.playCall("play_special_events");
            window.playSpecialMount(document.getElementById("special-upcoming"), special);
          } catch (_) {}
        }
        window.playCall("play_ack_cosmetics", { p_ids: null }).catch(() => {});
      }
      gate.hidden = true;
      profileBox.hidden = false;
    } catch (error) {
      gate.textContent = window.playRpcError(error, "No Trainer ID for that login yet.");
    }
  }

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
