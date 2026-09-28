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
  let catchById = new Map();
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
      place: row.metLocation || row.routeName || row.locationName || row.area || ""
    })).filter((entry) => entry.at || entry.dex != null);
  }

  function achievementsToJournalEntries(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.unlockedAt || row?.unlocked_at || row?.at)
      .map((row) => ({
        type: "ACHIEVEMENT",
        at: row.unlockedAt || row.unlocked_at || row.at,
        title: row.name || row.title || "Achievement earned",
        body: row.description || row.body || "Achievement earned",
        dex: null,
        variant: null,
        formId: null
      }));
  }

  function mergeJournal(...groups) {
    return groups.flat().filter(Boolean).sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return tb - ta;
    });
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

  function bindTeamInspect(view) {
    const teamBody = document.getElementById("trainer-team-body");
    if (!teamBody || teamBody.dataset.inspectBound === "1") return;
    teamBody.dataset.inspectBound = "1";
    teamBody.addEventListener("click", (event) => {
      const hit = event.target.closest("[data-inspect-catch]");
      if (!hit) return;
      const id = hit.getAttribute("data-inspect-catch");
      const mon = (view?.team || card?.team || []).find((row) => String(row?.id) === String(id));
      if (!mon) return;
      window.playOpenTeamMonInspect?.(mon, {
        mode: mine ? "owner" : "public",
        resolve: (row) => catchById.get(String(row.id)) || row
      });
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

  function render(view) {
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
    renderJournal();
    bindJournalInteractions();
    bindTeamInspect(view);
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
      catchById = new Map();
      (data.catches || []).forEach((row) => {
        if (row?.id) catchById.set(String(row.id), row);
      });
      (data.recent || []).forEach((row) => {
        if (row?.id && !catchById.has(String(row.id))) catchById.set(String(row.id), row);
      });
      (card?.team || []).forEach((row) => {
        if (row?.id && !catchById.has(String(row.id))) catchById.set(String(row.id), row);
      });
      journalEntries = mergeJournal(
        capturesToJournalEntries(data.recent || []),
        achievementsToJournalEntries(data.journalAchievements || [])
      );
      journalCategory = "ALL";
      journalLimit = 8;
      render(card);
      if (mine) {
        try {
          const prog = await window.playCall("play_progression");
          // Prefer public journalAchievements when present; still merge owner evolutions.
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
          if (evoRows.length) {
            journalEntries = mergeJournal(journalEntries, evoRows);
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

  supabase.auth.onAuthStateChange((event, session) => { if (window.playAuthNoise(event, session)) return;
    load();
  });
  load();
})();
