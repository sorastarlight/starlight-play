(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    box: document.getElementById("settings"),
    status: document.getElementById("edit-status"),
    view: document.getElementById("view-id"),
    pass: document.getElementById("pass-status"),
    passCard: document.getElementById("pass-card"),
    check: document.getElementById("check-pass"),
    workspace: document.getElementById("profile-workspace"),
    preview: document.getElementById("id-preview"),
    previewDirty: document.getElementById("preview-dirty"),
    favorites: document.getElementById("favorite-balls"),
    favoriteEmpty: document.getElementById("favorite-empty"),
    defaultPrep: document.getElementById("default-prep"),
    autoPrep: document.getElementById("auto-prep"),
    autoThrow: document.getElementById("auto-throw"),
    confirmRare: document.getElementById("confirm-rare"),
    saveEncounter: document.getElementById("save-encounter"),
    encounterStatus: document.getElementById("encounter-status"),
    perfPicks: document.getElementById("perf-picks"),
    perfStatus: document.getElementById("perf-status"),
    perfCurrent: document.getElementById("perf-current"),
    reducedMotion: document.getElementById("reduced-motion-status")
  };

  let card = null;
  let savedCard = null;
  let cosmetics = [];
  let titles = [];
  let badges = [];
  let achievements = [];
  let draft = null;
  let catches = [];
  let ownedPacks = [];
  let bag = {};
  let encounter = window.playEncounterSettings();
  let nameBusy = false;
  let category = "profile";
  let profileTab = "identity";
  let avatarFilter = "all";
  let avatarQuery = "";
  let login = "";

  const LEGACY_HASH = {
    "trainer-id": { cat: "profile", tab: "identity" },
    profile: { cat: "profile", tab: "identity" },
    "profile/identity": { cat: "profile", tab: "identity" },
    "profile/avatar": { cat: "profile", tab: "avatar" },
    "profile/card-style": { cat: "profile", tab: "card-style" },
    "profile/titles": { cat: "profile", tab: "titles" },
    "profile/showcase": { cat: "profile", tab: "showcase" },
    "profile/team": { cat: "profile", tab: "team" },
    gameplay: { cat: "gameplay" },
    encounter: { cat: "gameplay" },
    display: { cat: "display" },
    performance: { cat: "display" },
    account: { cat: "account" },
    pass: { cat: "account" }
  };

  window.playBindAccountNav({
    onSignOut() {
      els.box.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to customize your Trainer and configure your game.");
    }
  });

  function esc(value) {
    return window.playEscapeAttr ? window.playEscapeAttr(value) : String(value || "");
  }

  function snapshotDraft(next) {
    const featured = Array.isArray(next.featuredBadgeIds)
      ? next.featuredBadgeIds
      : (next.badges || []).map((row) => row.id);
    draft = {
      sprite: next.trainerSprite,
      bg: next.cardBg,
      frame: next.cardFrame || "plain",
      titleId: next.activeTitleId || "",
      badgeIds: featured.slice(0, 3),
      shinyCatchId: next.showcase?.shinyCatch?.id || next.showcase?.shinyCatchId || "",
      achievementId: next.showcase?.achievementId || "",
      favoriteDex: next.favoriteDex || next.showcase?.favoriteDex || null,
      favoriteVariant: next.favoriteVariant || next.showcase?.favoriteVariant || "normal"
    };
  }

  function previewCard() {
    if (!card || !draft) return card;
    return {
      ...card,
      trainerSprite: draft.sprite || card.trainerSprite,
      cardBg: draft.bg || card.cardBg,
      cardFrame: draft.frame || card.cardFrame,
      title: (titles.find((row) => row.id === draft.titleId) || {}).name || (draft.titleId ? card.title : ""),
      activeTitleId: draft.titleId || "",
      badges: (badges || []).filter((row) => (draft.badgeIds || []).includes(row.id)).slice(0, 3)
        .map((row) => ({ id: row.id, name: row.name })),
      showcase: {
        ...(card.showcase || {}),
        shinyCatchId: draft.shinyCatchId || "",
        achievementId: draft.achievementId || "",
        shinyCatch: (catches || []).find((row) => String(row.id) === String(draft.shinyCatchId))
          || card.showcase?.shinyCatch,
        achievementName: (achievements.find((row) => row.id === draft.achievementId) || {}).name || card.showcase?.achievementName,
        achievementDescription: (achievements.find((row) => row.id === draft.achievementId) || {}).description || card.showcase?.achievementDescription
      },
      favoriteDex: draft.favoriteDex ?? card.favoriteDex,
      favoriteVariant: draft.favoriteVariant || card.favoriteVariant
    };
  }

  function profileDirty() {
    if (!savedCard || !draft) return false;
    return draft.sprite !== savedCard.trainerSprite
      || draft.bg !== savedCard.cardBg
      || draft.frame !== (savedCard.cardFrame || "plain")
      || (draft.titleId || "") !== (savedCard.activeTitleId || "")
      || JSON.stringify(draft.badgeIds || []) !== JSON.stringify(savedCard.featuredBadgeIds || savedCard.badges?.map((row) => row.id) || [])
      || (draft.shinyCatchId || "") !== String(savedCard.showcase?.shinyCatch?.id || savedCard.showcase?.shinyCatchId || "")
      || (draft.achievementId || "") !== (savedCard.showcase?.achievementId || "")
      || Number(draft.favoriteDex || 0) !== Number(savedCard.favoriteDex || 0)
      || String(draft.favoriteVariant || "normal") !== String(savedCard.favoriteVariant || "normal");
  }

  function pickState(row, equipped) {
    if (!row.unlocked) return "locked";
    if (equipped) return "equipped";
    if (row.isNew) return "new";
    return "owned";
  }

  function avatarGroups() {
    const q = avatarQuery.trim().toLowerCase();
    return (window.PLAY_TRAINERS || []).filter((group) => {
      if (avatarFilter === "premium") return Boolean(group.premium);
      if (avatarFilter === "special") return !group.premium && /special|anime|go|ranger|conquest|lgpe|pla|gen10/i.test(`${group.key} ${group.label}`);
      if (avatarFilter !== "all") {
        const map = {
          kanto: /gen1|lgpe/i,
          johto: /gen2/i,
          hoenn: /gen3/i,
          sinnoh: /gen4/i,
          unova: /gen5/i,
          kalos: /gen6/i,
          alola: /gen7/i,
          galar: /gen8/i,
          paldea: /gen9/i
        };
        const re = map[avatarFilter];
        if (re && !re.test(`${group.key} ${group.label} ${group.games || ""}`)) return false;
      }
      if (!q) return true;
      return window.playTrainerLooks(group).some((look) => {
        const blob = `${look.name} ${look.gender || ""} ${look.outfit || ""} ${group.label}`.toLowerCase();
        return blob.includes(q);
      }) || `${group.label} ${group.games || ""}`.toLowerCase().includes(q);
    });
  }

  function fillPreview() {
    const view = previewCard();
    if (els.preview) els.preview.innerHTML = view ? window.playRenderIdCard(view, { mode: "preview" }) : "";
    const dirty = profileDirty();
    if (els.previewDirty) els.previewDirty.hidden = !dirty;
  }

  function renderIdentity() {
    const look = window.playTrainerLook(previewCard()?.trainerSprite);
    return `
      <header class="scc-panel-head">
        <h2>Identity</h2>
        <p class="muted">Your display name is used everywhere on Play. Trainer avatar is customized under Avatar.</p>
      </header>
      <p class="muted">Twitch login: <strong id="twitch-login">${login ? `@${esc(login)}` : "not linked"}</strong></p>
      <label class="field" for="trainer-display-name">Display name
        <input id="trainer-display-name" type="text" maxlength="24" placeholder="Sora Starlight" autocomplete="nickname" value="${esc(card?.displayName || "")}">
      </label>
      <button id="save-display-name" type="button">Save display name</button>
      <p id="name-status" class="muted" role="status"></p>
      <div class="scc-identity-look">
        <img src="${window.playTrainerSpriteUrl(look.trainer.id)}" alt="" width="96" height="96">
        <div>
          <p><strong>${esc(look.trainer.name)}</strong></p>
          <p class="muted">${esc([look.trainer.outfit, look.label, look.gender].filter(Boolean).join(" · "))}</p>
          <button type="button" class="secondary" data-jump-tab="avatar">Open Avatar workshop</button>
        </div>
      </div>`;
  }

  function renderAvatar() {
    const view = previewCard();
    const look = window.playTrainerLook(view?.trainerSprite);
    const filters = [
      ["all", "All"], ["kanto", "Kanto"], ["johto", "Johto"], ["hoenn", "Hoenn"], ["sinnoh", "Sinnoh"],
      ["unova", "Unova"], ["kalos", "Kalos"], ["alola", "Alola"], ["galar", "Galar"], ["paldea", "Paldea"],
      ["special", "Special"], ["premium", "Premium"]
    ];
    const groups = avatarGroups();
    return `
      <header class="scc-panel-head">
        <h2>Trainer Avatar</h2>
        <p class="muted">Preview instantly. Premium series stay locked until purchased in the Mart.</p>
      </header>
      <div class="scc-avatar-hero">
        <img src="${window.playTrainerSpriteUrl(look.trainer.id)}" alt="${esc(look.trainer.name)}" width="160" height="160">
        <div>
          <p class="tid-name">${esc(look.trainer.name)}</p>
          <p class="muted">${esc([look.trainer.outfit, look.label, look.gender].filter(Boolean).join(" · "))}</p>
        </div>
      </div>
      <div class="scc-avatar-tools">
        <label class="field">Search
          <input id="avatar-search" type="search" placeholder="Name, outfit, series" value="${esc(avatarQuery)}">
        </label>
        <div class="scc-filter-row" role="group" aria-label="Avatar filters">
          ${filters.map(([id, label]) => `<button type="button" class="secondary scc-filter${avatarFilter === id ? " is-on" : ""}" data-avatar-filter="${id}" aria-pressed="${avatarFilter === id}">${label}</button>`).join("")}
        </div>
      </div>
      <div class="scc-avatar-gallery">
        ${groups.map((group) => {
          const lockedPack = Boolean(group.premium) && !ownedPacks.includes(group.key);
          const looks = window.playTrainerLooks(group).filter((lookRow) => {
            if (!avatarQuery.trim()) return true;
            const blob = `${lookRow.name} ${lookRow.gender || ""} ${lookRow.outfit || ""}`.toLowerCase();
            return blob.includes(avatarQuery.trim().toLowerCase());
          });
          if (!looks.length) return "";
          return `<section class="trainer-gen${lockedPack ? " is-locked" : ""}">
            <h3>${esc(group.label)}</h3>
            <p class="muted">${esc(group.games || "")}${lockedPack ? ` · <a href="./store.html#premium-avatars">Available in Mart</a>` : ""}</p>
            <div class="trainer-gen-row">
              ${looks.map((lookRow) => {
                const equipped = lookRow.id === view.trainerSprite;
                const state = lockedPack ? "locked" : (equipped ? "equipped" : "owned");
                return `<button type="button" class="trainer-opt is-${state}" data-sprite="${esc(lookRow.id)}" data-locked="${lockedPack ? "1" : "0"}" aria-pressed="${equipped}" aria-label="${esc(lookRow.name)} ${state}">
                  <img src="${window.playTrainerSpriteUrl(lookRow.id)}" alt="" width="72" height="72" loading="lazy">
                  <strong>${esc(lookRow.name)}</strong>
                  <span class="id-state">${state}</span>
                </button>`;
              }).join("")}
            </div>
          </section>`;
        }).join("") || `<p class="muted">No avatars match this filter.</p>`}
      </div>`;
  }

  function renderCardStyle() {
    const view = previewCard();
    const bgs = cosmetics.filter((row) => row.kind === "background");
    const frames = cosmetics.filter((row) => row.kind === "frame");
    const bgFallback = !bgs.length;
    const bgRows = bgFallback
      ? (window.PLAY_CARD_BGS || []).map((row) => ({
        id: `bg-${row.id}`,
        kind: "background",
        asset: row.id,
        name: row.name,
        unlocked: true,
        description: row.group,
        howTo: ""
      }))
      : bgs;
    return `
      <header class="scc-panel-head">
        <h2>Card Style</h2>
        <p class="muted">Background and frame are cosmetic. Locked looks stay visible with unlock hints.</p>
      </header>
      <h3>Background</h3>
      <div class="prog-pick-grid scc-style-grid">
        ${bgRows.map((row) => {
          const equipped = row.asset === view.cardBg;
          const state = pickState(row, equipped);
          return `<button type="button" class="prog-pick card-bg-opt is-${state}" data-cosmetic="${esc(row.id)}" data-bg-asset="${esc(row.asset)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
            <img src="${window.playCardBgUrl(row.asset)}" alt="" loading="lazy">
            <strong>${esc(row.name)}</strong>
            <span class="id-state">${state}</span>
            <span>${esc(row.unlocked ? (row.description || "") : (row.howTo || row.description || "Locked"))}</span>
          </button>`;
        }).join("")}
      </div>
      <h3>Frame</h3>
      <div class="prog-pick-grid">
        ${(frames.length ? frames : [{ id: "frame-plain", asset: "plain", name: "Plain", unlocked: true, description: "Default frame", howTo: "" }]).map((row) => {
          const equipped = row.asset === view.cardFrame;
          const state = pickState(row, equipped);
          return `<button type="button" class="prog-pick is-${state}" data-cosmetic="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
            <strong>${esc(row.name)}</strong>
            <span class="id-state">${state}</span>
            <span>${esc(row.unlocked ? (row.description || "") : (row.howTo || row.description || "Locked"))}</span>
          </button>`;
        }).join("")}
      </div>`;
  }

  function renderTitles() {
    return `
      <header class="scc-panel-head">
        <h2>Title &amp; Badges</h2>
        <p class="muted">Wear one title. Feature up to three badges on your Trainer ID.</p>
      </header>
      <h3>Title</h3>
      <div class="prog-pick-grid">
        ${(titles || []).map((row) => {
          const equipped = row.id === (draft?.titleId || "");
          const state = pickState(row, equipped);
          return `<button type="button" class="prog-pick is-${state}" data-title="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
            <strong>${esc(row.name)}</strong>
            <span class="id-state">${state}</span>
            <span>${esc(row.unlocked ? row.description : (row.howTo || row.description))}</span>
          </button>`;
        }).join("") || `<p class="muted">No titles unlocked yet.</p>`}
      </div>
      <h3>Featured badges <span class="muted">(${(draft?.badgeIds || []).length}/3)</span></h3>
      <div class="prog-pick-grid">
        ${(badges || []).map((row) => {
          const equipped = (draft?.badgeIds || []).includes(row.id);
          const state = pickState(row, equipped);
          return `<button type="button" class="prog-pick is-${state}" data-badge="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
            <strong>${esc(row.name)}</strong>
            <span class="id-state">${state}</span>
            <span>${esc(row.unlocked ? row.description : (row.howTo || row.description))}</span>
          </button>`;
        }).join("") || `<p class="muted">No badges yet. Catch Pokémon and unlock achievements to earn them.</p>`}
      </div>`;
  }

  function renderShowcase() {
    const owned = [];
    const seen = new Set();
    (catches || []).forEach((row) => {
      const key = `${row.dex}:${row.variant || "normal"}`;
      if (seen.has(key)) return;
      seen.add(key);
      owned.push(row);
    });
    owned.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")) || Number(a.dex) - Number(b.dex));
    const shinies = (catches || []).filter((row) => String(row.variant || "").includes("shiny"));
    const done = (achievements || []).filter((row) => row.unlocked);
    return `
      <header class="scc-panel-head">
        <h2>Showcase</h2>
        <p class="muted">Three meaningful picks for your public profile. Favorite and Shiny must be Pokémon you own.</p>
      </header>
      <div class="id-showcase-edit">
        <label class="field">Favorite Pokémon
          <select id="showcase-fav">
            <option value="">None</option>
            ${owned.map((row) => `<option value="${esc(row.dex)}:${esc(row.variant || "normal")}" ${Number(draft.favoriteDex) === Number(row.dex) && String(draft.favoriteVariant || "normal") === String(row.variant || "normal") ? "selected" : ""}>${window.playCaughtName(row)}</option>`).join("")}
          </select>
        </label>
        <label class="field">Featured Shiny
          <select id="showcase-shiny">
            <option value="">None</option>
            ${shinies.map((row) => `<option value="${esc(row.id)}" ${String(draft.shinyCatchId) === String(row.id) ? "selected" : ""}>${window.playCaughtName(row)}</option>`).join("")}
          </select>
        </label>
        <label class="field">Featured Achievement
          <select id="showcase-ach">
            <option value="">None</option>
            ${done.map((row) => `<option value="${esc(row.id)}" ${draft.achievementId === row.id ? "selected" : ""}>${esc(row.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="scc-showcase-preview">${window.playRenderTrainerShowcaseHtml(previewCard())}</div>`;
  }

  function renderTeam() {
    return `
      <header class="scc-panel-head">
        <h2>My Team</h2>
        <p class="muted">Organize six Pokémon from ones you’ve caught. This team appears on your Trainer ID and Pokédex.</p>
      </header>
      <div id="team-slots" class="team-slots"></div>
      <p id="team-status" class="muted" role="status"></p>`;
  }

  function renderProfileWorkspace() {
    if (!els.workspace) return;
    if (profileTab === "identity") els.workspace.innerHTML = renderIdentity();
    else if (profileTab === "avatar") els.workspace.innerHTML = renderAvatar();
    else if (profileTab === "card-style") els.workspace.innerHTML = renderCardStyle();
    else if (profileTab === "titles") els.workspace.innerHTML = renderTitles();
    else if (profileTab === "showcase") els.workspace.innerHTML = renderShowcase();
    else if (profileTab === "team") {
      els.workspace.innerHTML = renderTeam();
      const teamEl = document.getElementById("team-slots");
      window.playRenderTeamSlots(teamEl, card?.team, { mine: true });
    }
    fillPreview();
    syncSubnav();
  }

  function syncNav() {
    document.querySelectorAll("[data-scc-cat]").forEach((btn) => {
      const on = btn.dataset.sccCat === category;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-scc-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.sccPanel !== category;
    });
  }

  function syncSubnav() {
    document.querySelectorAll("[data-profile-tab]").forEach((btn) => {
      const on = btn.dataset.profileTab === profileTab;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function setHash() {
    const next = category === "profile" && profileTab !== "identity"
      ? `profile/${profileTab}`
      : category;
    if (location.hash.replace(/^#/, "") !== next) {
      history.replaceState(null, "", `#${next}`);
    }
  }

  function applyHash() {
    const raw = location.hash.replace(/^#/, "").toLowerCase();
    const mapped = LEGACY_HASH[raw] || LEGACY_HASH[raw.split("/")[0]] || { cat: "profile", tab: "identity" };
    category = mapped.cat || "profile";
    if (mapped.tab) profileTab = mapped.tab;
    if (raw.startsWith("profile/")) {
      const tab = raw.split("/")[1];
      if (["identity", "avatar", "card-style", "titles", "showcase", "team"].includes(tab)) profileTab = tab;
    }
    syncNav();
    if (category === "profile") renderProfileWorkspace();
  }

  function fillEncounter(syncForm) {
    if (syncForm !== false) {
      encounter = window.playEncounterSettings(encounter);
      if (els.defaultPrep) els.defaultPrep.value = encounter.defaultPrep;
      if (els.autoPrep) els.autoPrep.checked = encounter.autoPrep;
      if (els.autoThrow) els.autoThrow.checked = encounter.autoThrow;
      if (els.confirmRare) els.confirmRare.checked = window.playConfirmRare?.() !== false;
    }
    if (!els.favorites) return;
    const owned = window.playOwnedBalls(bag);
    if (els.favoriteEmpty) els.favoriteEmpty.hidden = owned.length > 0;
    if (!owned.length) {
      els.favorites.innerHTML = "";
      return;
    }
    els.favorites.innerHTML = owned.map((row) => {
      const on = encounter.favoriteBalls.includes(row.key);
      const qty = Number(bag[row.key] || 0);
      return `<button type="button" class="ball-tile" data-fav="${row.key}" aria-pressed="${on ? "true" : "false"}">
        <img src="${window.playItemSprite(row.key)}" alt="">
        <strong>${row.name}</strong>
        <span class="muted">${qty} owned${on ? " · favorite" : ""}</span>
      </button>`;
    }).join("");
  }

  function fillPerf() {
    const pref = window.playPerfPref?.() || "auto";
    const mode = window.playPerfMode?.() || pref;
    els.perfPicks?.querySelectorAll("[name=perf-mode]").forEach((input) => {
      input.checked = input.value === pref;
    });
    if (els.perfCurrent) els.perfCurrent.textContent = `Current mode: ${String(mode).toUpperCase()} (preference: ${String(pref).toUpperCase()})`;
    if (els.perfStatus) {
      els.perfStatus.textContent = pref === "auto" ? `AUTO is using ${String(mode).toUpperCase()} on this device.` : `${String(pref).toUpperCase()} is on.`;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (els.reducedMotion) {
      els.reducedMotion.textContent = `System Reduced Motion: ${reduced ? "ON" : "OFF"}`;
    }
  }

  function describePass(pass) {
    if (!pass) return "Sign in to check your pass.";
    const checked = pass.checkedAt ? ` Last checked ${new Date(pass.checkedAt).toLocaleString()}.` : "";
    if (pass.active) {
      if (pass.source === "twitch-sub") return `ACTIVE · Twitch subscription.${checked}`;
      if (pass.source === "admin") return `ACTIVE · Staff grant.${checked}`;
      if (pass.source === "broadcaster") return `ACTIVE · Channel account.${checked}`;
      return `ACTIVE.${checked}`;
    }
    return `Not Active. Subscribe on Twitch, then check again.${checked}`;
  }

  function paintPass(pass) {
    if (els.pass) els.pass.textContent = describePass(pass);
    if (els.passCard) els.passCard.classList.toggle("is-active", Boolean(pass?.active));
  }

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return body.message;
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) return fallback;
    return error?.message || fallback;
  }

  async function loadProgression() {
    try {
      const prog = await window.playCall("play_progression");
      titles = prog?.titles || [];
      badges = prog?.badges || [];
      achievements = prog?.achievements || [];
      cosmetics = prog?.cosmetics || cosmetics;
      ownedPacks = prog?.ownedAvatarPacks || ownedPacks;
      window._playOwnedAvatarPacks = ownedPacks;
      if (prog?.trainer) {
        card = { ...card, ...prog.trainer };
        savedCard = { ...card };
        snapshotDraft(card);
      }
    } catch (_) {}
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.box.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to customize your Trainer and configure your game.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.box, { soft: !els.box?.hidden });
    if (window.playTrainerCatalogReady) await window.playTrainerCatalogReady;
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, username").eq("id", session.user.id).maybeSingle();
    login = profile?.twitch_login || profile?.username || "";
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
      ownedPacks = snapshot?.ownedAvatarPacks || [];
      window._playOwnedAvatarPacks = ownedPacks;
      bag = snapshot?.bag || {};
      encounter = window.playEncounterSettings(snapshot?.encounterSettings);
      paintPass(snapshot?.pass);
    } catch (_) {
      paintPass(null);
      if (els.pass) els.pass.textContent = "Pass status is not available right now.";
    }
    window.playSetAccountNav(session, profile, extras);
    if (!login) {
      els.gate.textContent = "Sign in to edit your Trainer ID look and encounter settings.";
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    try {
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      savedCard = { ...card };
      cosmetics = data.cosmetics || [];
      ownedPacks = data.ownedAvatarPacks || ownedPacks;
      window._playOwnedAvatarPacks = ownedPacks;
      catches = data.catches || data.caughtOptions || [];
      snapshotDraft(card);
      await loadProgression();
    } catch (error) {
      els.gate.textContent = window.playRpcError(error, "Could not load your Trainer ID.");
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    if (els.view) els.view.href = `./trainer.html?u=${encodeURIComponent(login)}`;
    applyHash();
    fillEncounter();
    fillPerf();
    els.gate.hidden = true;
    els.box.hidden = false;
  }

  const teamStatusProxy = {
    _text: "",
    get textContent() { return this._text; },
    set textContent(value) {
      this._text = value;
      const el = document.getElementById("team-status");
      if (el) el.textContent = value;
    }
  };

  if (els.workspace) {
    window.playBindTeamSlots(
      els.workspace,
      () => ({ team: card?.team || [], caught: catches }),
      async (ids) => {
        const data = await window.playCall("play_set_team", { p_catch_ids: ids });
        if (data?.trainer) card = data.trainer;
        else if (data?.team && card) card.team = data.team;
        if (savedCard) savedCard = { ...savedCard, team: card.team };
        const teamEl = document.getElementById("team-slots");
        if (teamEl) window.playRenderTeamSlots(teamEl, card?.team, { mine: true });
        fillPreview();
        return data;
      },
      teamStatusProxy
    );
  }

  document.querySelector(".scc-nav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-scc-cat]");
    if (!btn) return;
    if (category === "profile" && profileDirty() && btn.dataset.sccCat !== "profile") {
      if (!window.confirm("You have unsaved profile changes. Leave without saving?")) return;
    }
    category = btn.dataset.sccCat;
    syncNav();
    setHash();
    if (category === "profile") renderProfileWorkspace();
  });

  document.querySelector(".scc-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-profile-tab]");
    if (!btn) return;
    profileTab = btn.dataset.profileTab;
    renderProfileWorkspace();
    setHash();
  });

  els.workspace?.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-jump-tab]");
    if (jump) {
      profileTab = jump.dataset.jumpTab;
      renderProfileWorkspace();
      setHash();
      return;
    }
    const filter = event.target.closest("[data-avatar-filter]");
    if (filter) {
      avatarFilter = filter.dataset.avatarFilter;
      renderProfileWorkspace();
      return;
    }
    const sprite = event.target.closest("[data-sprite]");
    if (sprite) {
      if (sprite.dataset.locked === "1") {
        if (els.status) els.status.textContent = "Premium Avatar — available in Mart.";
        return;
      }
      draft.sprite = sprite.dataset.sprite;
      renderProfileWorkspace();
      return;
    }
    const cosmetic = event.target.closest("[data-cosmetic]");
    if (cosmetic) {
      const row = cosmetics.find((item) => item.id === cosmetic.dataset.cosmetic)
        || (cosmetic.dataset.bgAsset ? { kind: "background", asset: cosmetic.dataset.bgAsset, unlocked: true, name: cosmetic.dataset.bgAsset } : null);
      if (!row?.unlocked) {
        if (els.status) els.status.textContent = `${row?.name || "This look"} is locked. ${row?.howTo || ""}`.trim();
        return;
      }
      if (row.kind === "background") draft.bg = row.asset;
      if (row.kind === "frame") draft.frame = row.asset;
      renderProfileWorkspace();
      return;
    }
    const titleBtn = event.target.closest("[data-title]");
    if (titleBtn) {
      const row = titles.find((item) => item.id === titleBtn.dataset.title);
      if (!row?.unlocked) {
        if (els.status) els.status.textContent = `${row?.name || "This title"} is locked. ${row?.howTo || row?.description || ""}`.trim();
        return;
      }
      draft.titleId = draft.titleId === row.id ? "" : row.id;
      renderProfileWorkspace();
      return;
    }
    const badgeBtn = event.target.closest("[data-badge]");
    if (badgeBtn) {
      const row = badges.find((item) => item.id === badgeBtn.dataset.badge);
      if (!row?.unlocked) {
        if (els.status) els.status.textContent = `${row?.name || "This badge"} is locked. ${row?.howTo || row?.description || ""}`.trim();
        return;
      }
      const next = new Set(draft.badgeIds || []);
      if (next.has(row.id)) next.delete(row.id);
      else {
        if (next.size >= 3) {
          if (els.status) els.status.textContent = "Feature up to three badges.";
          return;
        }
        next.add(row.id);
      }
      draft.badgeIds = Array.from(next);
      renderProfileWorkspace();
    }
  });

  els.workspace?.addEventListener("input", (event) => {
    if (event.target.id === "avatar-search") {
      avatarQuery = event.target.value || "";
      renderProfileWorkspace();
      const input = document.getElementById("avatar-search");
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
  });

  els.workspace?.addEventListener("change", (event) => {
    if (event.target.id === "showcase-fav") {
      const [dex, variant] = String(event.target.value || "").split(":");
      draft.favoriteDex = dex ? Number(dex) : null;
      draft.favoriteVariant = variant || "normal";
      fillPreview();
      const box = els.workspace.querySelector(".scc-showcase-preview");
      if (box) box.innerHTML = window.playRenderTrainerShowcaseHtml(previewCard());
    } else if (event.target.id === "showcase-shiny") {
      draft.shinyCatchId = event.target.value || "";
      fillPreview();
      const box = els.workspace.querySelector(".scc-showcase-preview");
      if (box) box.innerHTML = window.playRenderTrainerShowcaseHtml(previewCard());
    } else if (event.target.id === "showcase-ach") {
      draft.achievementId = event.target.value || "";
      fillPreview();
      const box = els.workspace.querySelector(".scc-showcase-preview");
      if (box) box.innerHTML = window.playRenderTrainerShowcaseHtml(previewCard());
    }
  });

  els.workspace?.addEventListener("click", (event) => {
    if (event.target.id === "save-display-name" || event.target.closest("#save-display-name")) {
      saveDisplayName();
    }
  });

  async function saveDisplayName() {
    if (nameBusy) return;
    const input = document.getElementById("trainer-display-name");
    const nameStatus = document.getElementById("name-status");
    nameBusy = true;
    if (nameStatus) nameStatus.textContent = "Saving…";
    try {
      const data = await window.playCall("play_update_profile", {
        p_display_name: input?.value || "",
        p_favorite_dex: draft?.favoriteDex ?? card?.favoriteDex ?? null,
        p_favorite_variant: draft?.favoriteVariant || card?.favoriteVariant || "normal"
      });
      if (nameStatus) nameStatus.textContent = data?.message || "Display name saved.";
      if (typeof window.playToast === "function") {
        window.playToast({ kind: "success", title: "Profile updated", body: "Display name saved." });
      }
      await load();
    } catch (error) {
      if (nameStatus) {
        nameStatus.textContent = window.playHumanRpcError
          ? window.playHumanRpcError(error, "Could not save that display name.")
          : window.playRpcError(error);
      }
    } finally {
      nameBusy = false;
    }
  }

  document.getElementById("revert-profile")?.addEventListener("click", () => {
    if (!savedCard) return;
    card = { ...savedCard };
    snapshotDraft(savedCard);
    renderProfileWorkspace();
    if (els.status) els.status.textContent = "Reverted to the saved profile.";
  });

  document.getElementById("save-profile")?.addEventListener("click", async () => {
    if (!draft) return;
    if (els.status) els.status.textContent = "Saving profile…";
    try {
      const saved = await window.playCall("play_save_trainer_id", {
        p_sprite: draft.sprite,
        p_bg: draft.bg,
        p_frame: draft.frame,
        p_title: draft.titleId || "",
        p_badges: draft.badgeIds || [],
        p_favorite_dex: draft.favoriteDex ?? null,
        p_favorite_variant: draft.favoriteVariant || "normal",
        p_showcase: {
          shinyCatchId: draft.shinyCatchId || "",
          achievementId: draft.achievementId || ""
        }
      });
      card = saved.trainer;
      savedCard = { ...card };
      cosmetics = saved.cosmetics || cosmetics;
      snapshotDraft(card);
      renderProfileWorkspace();
      if (els.status) els.status.textContent = saved.message || "Profile saved.";
    } catch (error) {
      if (els.status) els.status.textContent = window.playRpcError(error);
    }
  });

  els.confirmRare?.addEventListener("change", () => {
    window.playSetConfirmRare?.(Boolean(els.confirmRare.checked));
  });

  els.favorites?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fav]");
    if (!button) return;
    const key = button.dataset.fav;
    const on = encounter.favoriteBalls.includes(key);
    encounter.favoriteBalls = on
      ? encounter.favoriteBalls.filter((item) => item !== key)
      : encounter.favoriteBalls.concat(key).slice(0, 6);
    if (!encounter.favoriteBalls.length) encounter.favoriteBalls = [key];
    fillEncounter(false);
  });

  els.saveEncounter?.addEventListener("click", async () => {
    els.encounterStatus.textContent = "Saving…";
    try {
      const data = await window.playCall("play_set_encounter_settings", {
        p_settings: {
          favoriteBalls: encounter.favoriteBalls,
          defaultPrep: els.defaultPrep?.value || "ask",
          autoPrep: Boolean(els.autoPrep?.checked),
          autoThrow: Boolean(els.autoThrow?.checked)
        }
      });
      encounter = window.playEncounterSettings(data?.encounterSettings);
      window.playSetConfirmRare?.(Boolean(els.confirmRare?.checked));
      fillEncounter();
      els.encounterStatus.textContent = data.message || "Encounter settings saved.";
    } catch (error) {
      els.encounterStatus.textContent = window.playRpcError(error);
    }
  });

  els.check?.addEventListener("click", async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      if (els.pass) els.pass.textContent = "Sign in first.";
      return;
    }
    if (!session.provider_token) {
      if (els.pass) els.pass.textContent = "Twitch did not keep a session token. Sign out, sign in again, then check immediately.";
      return;
    }
    if (els.pass) els.pass.textContent = "Checking Twitch…";
    const { data, error } = await supabase.functions.invoke("refresh-pass", {
      body: { accessToken: session.provider_token }
    });
    if (error) {
      if (els.pass) els.pass.textContent = await functionMessage(error, "Could not check your subscription right now.");
      return;
    }
    if (els.pass) els.pass.textContent = data?.message || (data?.active ? "Starlight Pass is active." : "Twitch says you are not subscribed right now.");
    await load();
  });

  els.perfPicks?.addEventListener("change", (event) => {
    const input = event.target.closest("[name=perf-mode]");
    if (!input) return;
    const applied = window.playSetPerfPref?.(input.value) || { pref: input.value, mode: input.value };
    fillPerf();
    if (els.perfStatus) {
      els.perfStatus.textContent = applied.pref === "auto"
        ? `AUTO is using ${String(applied.mode).toUpperCase()} on this device.`
        : `${String(applied.pref).toUpperCase()} is on.`;
    }
  });

  window.addEventListener("hashchange", () => applyHash());
  window.addEventListener("beforeunload", (event) => {
    if (profileDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
