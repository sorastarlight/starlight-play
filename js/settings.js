(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    box: document.getElementById("settings"),
    status: document.getElementById("edit-status"),
    pass: document.getElementById("pass-status"),
    passCard: document.getElementById("pass-card"),
    check: document.getElementById("check-pass"),
    workspace: document.getElementById("profile-workspace"),
    dirtyBar: document.getElementById("dirty-bar"),
    dirtyText: document.getElementById("dirty-bar-text"),
    dirtyDiscard: document.getElementById("dirty-discard"),
    dirtySave: document.getElementById("dirty-save"),
    dirtyWarn: document.getElementById("dirty-warn"),
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
    reducedMotion: document.getElementById("reduced-motion-status"),
    connStatus: document.getElementById("conn-status"),
    username: document.getElementById("acc-username"),
    securityEmail: document.getElementById("security-email"),
    claimForm: document.getElementById("claim-form"),
    passwordForm: document.getElementById("password-form"),
    pendingLink: document.getElementById("pending-link"),
    connectionList: document.getElementById("connection-list"),
    twitchWarn: document.getElementById("twitch-warn")
  };

  const GATE_COPY = "Sign in to open My Account.";
  const SAVE_FAIL = "Could not save your Trainer ID. Please try again.";
  const PROFILE_TABS = ["identity", "avatar", "card-style", "titles", "showcase", "team"];

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
  let category = "trainer-id";
  let profileTab = "identity";
  let avatarScope = "all";
  let avatarFilter = "all";
  let avatarQuery = "";
  let titleFilter = "all";
  let saveBusy = false;
  let leaveIntent = null;
  let login = "";
  let accountState = null;
  let pcStorage = null;
  let pendingOauth = "";
  let staffRole = "";
  let cardBgFilter = "all";
  let teamBgFilter = "all";
  let teamBgQuery = "";
  let honorsPane = "titles";
  let ribbonFilter = "all";
  let ribbonQuery = "";
  let titleQuery = "";

  function isCosmeticAdmin() {
    return staffRole === "admin" || staffRole === "owner";
  }

  function freeTeamBgIds() {
    if (Array.isArray(window.PLAY_FREE_TEAM_BG_IDS) && window.PLAY_FREE_TEAM_BG_IDS.length) {
      return window.PLAY_FREE_TEAM_BG_IDS.slice();
    }
    return (window.PLAY_TEAM_BACKGROUNDS || []).filter((row) => row.free).map((row) => row.id);
  }
  const LEGACY_HASH = {
    "": { cat: "trainer-id", tab: "identity" },
    settings: { cat: "trainer-id", tab: "identity" },
    "trainer-id": { cat: "trainer-id", tab: "identity" },
    profile: { cat: "trainer-id", tab: "identity" },
    "trainer-id/identity": { cat: "trainer-id", tab: "identity" },
    "trainer-id/avatar": { cat: "trainer-id", tab: "avatar" },
    "trainer-id/card-style": { cat: "trainer-id", tab: "card-style" },
    "trainer-id/titles": { cat: "trainer-id", tab: "titles" },
    "trainer-id/showcase": { cat: "trainer-id", tab: "showcase" },
    "trainer-id/team": { cat: "trainer-id", tab: "team" },
    "profile/identity": { cat: "trainer-id", tab: "identity" },
    "profile/avatar": { cat: "trainer-id", tab: "avatar" },
    "profile/card-style": { cat: "trainer-id", tab: "card-style" },
    "profile/titles": { cat: "trainer-id", tab: "titles" },
    "profile/showcase": { cat: "trainer-id", tab: "showcase" },
    "profile/team": { cat: "trainer-id", tab: "team" },
    gameplay: { cat: "gameplay" },
    encounter: { cat: "gameplay" },
    display: { cat: "display" },
    performance: { cat: "display" },
    connections: { cat: "connections" },
    account: { cat: "connections" },
    pass: { cat: "pass" }
  };

  window.playBindAccountNav({
    onSignOut() {
      els.box.hidden = true;
      if (els.dirtyBar) {
        els.dirtyBar.hidden = true;
        els.dirtyBar.classList.remove("is-in");
      }
      window.playRestoreGate(els.gate, GATE_COPY);
    }
  });

  function esc(value) {
    return window.playEscapeAttr ? window.playEscapeAttr(value) : String(value || "");
  }

  function friendlySaveError(error, fallback) {
    console.warn("Trainer ID save failed", error);
    const human = window.playHumanRpcError
      ? window.playHumanRpcError(error, fallback)
      : window.playRpcError(error, fallback);
    if (/column reference|ambiguous|sqlstate|42702|p0001|title_id/i.test(String(human || ""))) return fallback;
    return human || fallback;
  }

  function snapshotDraft(next, options = {}) {
    if (!options.force && draft && savedCard && profileDirty()) return;
    const featured = Array.isArray(next.featuredBadgeIds)
      ? next.featuredBadgeIds
      : (next.badges || []).map((row) => row.id);
    draft = {
      sprite: next.trainerSprite,
      bg: next.cardBg,
      teamBg: window.playNormalizeTeamBgId?.(next.teamBg) || next.teamBg || "pallet-town",
      titleId: next.activeTitleId || "",
      badgeIds: featured.slice(0, 5),
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
      teamBg: window.playNormalizeTeamBgId?.(draft.teamBg || card.teamBg) || draft.teamBg || card.teamBg || "pallet-town",
      title: (titles.find((row) => row.id === draft.titleId) || {}).name || (draft.titleId ? card.title : ""),
      activeTitleId: draft.titleId || "",
      badges: (badges || []).filter((row) => (draft.badgeIds || []).includes(row.id)).slice(0, 5)
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
      || (window.playNormalizeTeamBgId?.(draft.teamBg) || draft.teamBg || "pallet-town") !== (window.playNormalizeTeamBgId?.(savedCard.teamBg) || savedCard.teamBg || "pallet-town")
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

  const STATE_LABELS = { locked: "Locked", equipped: "Equipped", owned: "Owned", new: "New" };

  function stateLabel(state) {
    return STATE_LABELS[state] || state;
  }

  const AVATAR_SCOPES = [["all", "All"], ["regions", "Regions"], ["special", "Special"], ["premium", "Premium"]];

  const AVATAR_REGIONS = [
    ["kanto", "Kanto", /^(gen1|lgpe)$/],
    ["johto", "Johto", /^gen2$/],
    ["hoenn", "Hoenn", /^gen3$/],
    ["sinnoh", "Sinnoh", /^gen4$/],
    ["unova", "Unova", /^gen5$/],
    ["kalos", "Kalos", /^gen6$/],
    ["alola", "Alola", /^gen7$/],
    ["galar", "Galar", /^gen8$/],
    ["paldea", "Paldea", /^gen9$/]
  ];

  function avatarRegionOf(group) {
    const row = AVATAR_REGIONS.find((item) => item[2].test(String(group?.key || "")));
    return row ? row[0] : "";
  }

  function avatarScopeOf(group) {
    if (group?.premium) return "premium";
    return avatarRegionOf(group) ? "regions" : "special";
  }

  function packLocked(group) {
    return Boolean(group?.premium) && !ownedPacks.includes(group.key);
  }

  function avatarAvailable(group) {
    return !packLocked(group);
  }

  function avatarLooks() {
    const q = avatarQuery.trim().toLowerCase();
    const rows = [];
    (window.PLAY_TRAINERS || []).forEach((group) => {
      if (!avatarAvailable(group)) return;
      const scope = avatarScopeOf(group);
      if (avatarScope !== "all" && scope !== avatarScope) return;
      if (avatarScope === "regions" && avatarFilter !== "all" && avatarRegionOf(group) !== avatarFilter) return;
      window.playTrainerLooks(group).forEach((look) => {
        if (q) {
          const blob = `${look.name} ${look.gender || ""} ${look.outfit || ""} ${group.label} ${group.games || ""}`.toLowerCase();
          if (!blob.includes(q)) return;
        }
        rows.push({ look, group, locked: false });
      });
    });
    return rows;
  }

  function avatarScopesPresent() {
    const present = new Set(["all"]);
    (window.PLAY_TRAINERS || []).forEach((group) => {
      if (!avatarAvailable(group)) return;
      present.add(avatarScopeOf(group));
    });
    return AVATAR_SCOPES.filter(([id]) => present.has(id));
  }

  function ensureAvatarScope() {
    const scopes = avatarScopesPresent().map(([id]) => id);
    if (!scopes.includes(avatarScope)) {
      avatarScope = "all";
      avatarFilter = "all";
    }
  }

  function motionOk() {
    if (window.playPerfReduced?.()) return false;
    return (window.playPerfMode?.() || "balanced") !== "low";
  }

  function markDirtyFlag() {
    const bar = els.dirtyBar;
    if (!bar) return;
    if (!profileDirty()) {
      bar.hidden = true;
      bar.classList.remove("is-in");
      return;
    }
    const wasHidden = bar.hidden;
    bar.hidden = false;
    // Apply is-in synchronously so the bar is visible even if a later
    // paint/nav runs before the next animation frame.
    bar.classList.add("is-in");
    if (wasHidden && motionOk()) {
      bar.classList.remove("is-in");
      void bar.offsetWidth;
      bar.classList.add("is-in");
    }
  }

  function setSaveBusy(busy) {
    saveBusy = Boolean(busy);
    els.dirtyBar?.classList.toggle("is-busy", saveBusy);
    if (els.dirtySave) {
      els.dirtySave.disabled = saveBusy;
      els.dirtySave.textContent = saveBusy ? "Saving…" : "Save Trainer ID";
    }
    if (els.dirtyDiscard) els.dirtyDiscard.disabled = saveBusy;
    els.workspace?.querySelectorAll("#save-trainer-id, #revert-trainer-id").forEach((btn) => {
      btn.disabled = saveBusy;
    });
  }

  function lookMeta(look) {
    return [look?.trainer?.outfit, look?.gender || look?.trainer?.gender].filter(Boolean).join(" · ");
  }

  function trainerIdActions() {
    return `
      <div class="scc-workspace-actions links id-actions">
        <button id="save-trainer-id" type="button">Save Trainer ID</button>
        <button id="revert-trainer-id" class="secondary" type="button">Revert Changes</button>
        <a id="view-id" class="button secondary" href="./trainer.html${login ? `?u=${encodeURIComponent(login)}` : ""}">View Trainer ID</a>
      </div>`;
  }

  function linkedConnections() {
    return (accountState?.connections || []).filter((row) => row.confirmed !== false);
  }

  function identityStatusHtml() {
    const view = previewCard();
    const title = view?.title || "";
    return `
      <div class="scc-identity-status">
        <div class="scc-identity-avatar">
          <img src="${window.playTrainerSpriteUrl(view?.trainerSprite)}" alt="" width="96" height="96">
        </div>
        <div class="scc-identity-facts">
          <p class="scc-module-kicker">TRAINER IDENTITY</p>
          <p class="scc-identity-name">${esc(card?.displayName || "Trainer")}</p>
          <p class="scc-identity-meta">ID No. ${esc(String(card?.idNo || "00000").padStart(5, "0"))} · Lv. ${esc(card?.level || 1)}${title ? ` · ${esc(title)}` : ""}</p>
        </div>
      </div>`;
  }

  function twitchModuleHtml() {
    const rows = linkedConnections();
    if (!rows.length) {
      return `
        <div class="scc-twitch-module">
          <p class="scc-module-kicker">TWITCH CONNECTION</p>
          <p class="scc-twitch-headline is-off">Not connected</p>
          <p class="muted">Link Twitch so the RPG knows which Trainer is playing in chat and on stream.</p>
          <div class="links id-actions">
            <button id="identity-link-twitch" type="button">Connect Twitch</button>
          </div>
        </div>`;
    }
    const primary = rows.find((row) => row.primary) || rows[0];
    const others = rows.filter((row) => row !== primary);
    return `
      <div class="scc-twitch-module scc-twitch-connected">
        <p class="scc-module-kicker">TWITCH CONNECTION</p>
        <p class="scc-twitch-headline">✓ TWITCH CONNECTED</p>
        <div class="scc-twitch-who">
          ${primary.avatar ? `<img class="avatar" src="${esc(primary.avatar)}" alt="">` : ""}
          <div>
            <strong>@${esc(primary.login || primary.displayName || "twitch")}</strong>
            <p class="muted">${rows.length > 1 ? "Primary" : "Linked"}</p>
          </div>
        </div>
        ${others.length
          ? `<ul class="scc-twitch-extra">${others.map((row) => `<li>@${esc(row.login || "")} · Linked</li>`).join("")}</ul>`
          : ""}
        <div class="links id-actions">
          <button type="button" class="secondary" data-jump-cat="connections">Manage connections</button>
        </div>
      </div>`;
  }

  function renderIdentity() {
    return `
      <header class="scc-panel-head">
        <h2>Identity</h2>
        <p class="muted">Your Display Name saves on its own — it is the name other Trainers see, separate from the Account Username you sign in with. Avatar, card style, titles, and showcase are saved with <strong>Save Trainer ID</strong> in those tabs.</p>
      </header>
      <div class="scc-identity-modules">
        ${identityStatusHtml()}
        ${twitchModuleHtml()}
      </div>
      <label class="field" for="trainer-display-name">Display Name
        <input id="trainer-display-name" type="text" maxlength="24" placeholder="Sora Starlight" autocomplete="nickname" value="${esc(card?.displayName || "")}">
      </label>
      <div class="links id-actions">
        <button id="save-display-name" type="button">Save Display Name</button>
      </div>
      <p id="name-status" class="muted" role="status"></p>
      <p class="muted scc-identity-hint">Looking for your avatar? <a href="#trainer-id/avatar" data-jump-tab="avatar">Open the Avatar tab</a>.</p>`;
  }

  function avatarStageHtml() {
    const view = previewCard();
    const look = window.playTrainerLook(view?.trainerSprite);
    const meta = lookMeta(look);
    const era = [look?.label, look?.games].filter(Boolean).join(" · ");
    return `
      <div class="scc-stage-frame">
        <div class="scc-stage-glow" aria-hidden="true"></div>
        <span class="avatar-stage-shadow" aria-hidden="true"></span>
        <img class="scc-stage-sprite is-stage-pending" data-avatar-id="${esc(view?.trainerSprite || "")}" src="${window.playTrainerSpriteUrl(view?.trainerSprite)}" alt="${esc(look?.trainer?.name || "Trainer")}" width="320" height="320" decoding="async" onload="window.playNormalizeTrainerAvatar?.(this, { mode: 'stage' })" onerror="this.onerror=null;this.src='images/trainers/red-gen1.png';window.playNormalizeTrainerAvatar?.(this, { mode: 'stage' })">
      </div>
      <p class="scc-stage-name">${esc(look?.trainer?.name || "Trainer")}</p>
      ${meta ? `<p class="scc-stage-meta">${esc(meta)}</p>` : ""}
      ${era ? `<p class="scc-stage-era">${esc(era)}</p>` : ""}`;
  }

  function avatarCountText() {
    const total = avatarLooks().length;
    return `${total} avatar${total === 1 ? "" : "s"} shown`;
  }

  function avatarResultsHtml() {
    const view = previewCard();
    const rows = avatarLooks();
    if (!rows.length) return `<p class="muted scc-workshop-empty">No avatars match this search.</p>`;
    return rows.map(({ look }) => {
      const equipped = look.id === view.trainerSprite;
      const state = equipped ? "equipped" : "owned";
      return `<button type="button" class="scc-avatar-card trainer-opt is-${state}" data-sprite="${esc(look.id)}" data-locked="0" aria-pressed="${equipped}" aria-label="${esc(look.name)}${equipped ? ", equipped" : ""}">
        <span class="scc-avatar-thumb">
          <img class="scc-avatar-thumb-img" data-avatar-id="${esc(look.id)}" src="${window.playTrainerSpriteUrl(look.id)}" alt="" width="112" height="112" decoding="async" onload="window.playNormalizeAvatarThumb?.(this)">
        </span>
        <strong class="scc-avatar-name">${esc(look.name)}</strong>
        <span class="scc-avatar-equipped"${equipped ? "" : ' aria-hidden="true"'}>${equipped ? "EQUIPPED" : "\u00a0"}</span>
      </button>`;
    }).join("");
  }

  function avatarRegionsPresent() {
    const present = new Set();
    (window.PLAY_TRAINERS || []).forEach((group) => {
      if (!avatarAvailable(group)) return;
      const region = avatarRegionOf(group);
      if (region) present.add(region);
    });
    return AVATAR_REGIONS.filter(([id]) => present.has(id));
  }

  function renderAvatar() {
    ensureAvatarScope();
    const scopes = avatarScopesPresent();
    const regionChips = [["all", "All regions"]].concat(avatarRegionsPresent().map((row) => [row[0], row[1]]));
    return `
      <header class="scc-panel-head">
        <h2>Avatar Workshop</h2>
        <p class="muted">Choose from the Trainer avatars available to your account. Your collection includes free avatars and any avatar packs you've unlocked. Press <strong>Save Trainer ID</strong> to keep your pick.</p>
      </header>
      <div class="scc-workshop-split">
        <section class="scc-avatar-stage" aria-label="Avatar stage">
          <p class="scc-module-kicker">AVATAR STAGE</p>
          <div class="scc-stage-body">${avatarStageHtml()}</div>
        </section>
        <section class="scc-avatar-browser" aria-label="Avatar browser">
          <p class="scc-module-kicker">AVATAR BROWSER</p>
          <div class="scc-scope-row" role="group" aria-label="Avatar categories">
            ${scopes.map(([id, label]) => `<button type="button" class="scc-scope${avatarScope === id ? " is-on" : ""}" data-avatar-scope="${id}" aria-pressed="${avatarScope === id}">${label.toUpperCase()}</button>`).join("")}
          </div>
          <label class="field scc-browser-search" for="avatar-search">Search
            <input id="avatar-search" type="search" placeholder="Name or outfit" value="${esc(avatarQuery)}">
          </label>
          <div class="scc-region-chips" role="group" aria-label="Regions"${avatarScope === "regions" ? "" : " hidden"}>
            ${regionChips.map(([id, label]) => `<button type="button" class="scc-chip${avatarFilter === id ? " is-on" : ""}" data-avatar-filter="${id}" aria-pressed="${avatarFilter === id}">${label}</button>`).join("")}
          </div>
          <div id="avatar-results" class="scc-avatar-results">${avatarResultsHtml()}</div>
          <p id="avatar-count" class="muted scc-browser-count">${avatarCountText()}</p>
        </section>
      </div>
      ${trainerIdActions()}`;
  }

  function refreshAvatarBrowser() {
    const box = document.getElementById("avatar-results");
    if (!box) {
      renderProfileWorkspace();
      return;
    }
    box.innerHTML = avatarResultsHtml();
    box.scrollTop = 0;
    const count = document.getElementById("avatar-count");
    if (count) count.textContent = avatarCountText();
    els.workspace?.querySelectorAll("[data-avatar-scope]").forEach((btn) => {
      const on = btn.dataset.avatarScope === avatarScope;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const chips = els.workspace?.querySelector(".scc-region-chips");
    if (!chips) return;
    chips.hidden = avatarScope !== "regions";
    chips.querySelectorAll("[data-avatar-filter]").forEach((btn) => {
      const on = btn.dataset.avatarFilter === avatarFilter;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function backgroundRows() {
    const bgs = cosmetics.filter((row) => row.kind === "background");
    const metaById = new Map((window.PLAY_CARD_BGS || []).map((row) => [row.id, row]));
    if (bgs.length) {
      return bgs.map((row) => {
        const meta = metaById.get(row.asset) || {};
        return {
          ...row,
          unlocked: Boolean(row.unlocked || isCosmeticAdmin()),
          group: meta.group || (String(row.asset || "").startsWith("pride-") ? "pride" : (["starlight", "candy"].includes(row.asset) ? "rewards" : "region")),
          thumb: window.playCardBgUrl(row.asset)
        };
      });
    }
    return (window.PLAY_CARD_BGS || []).map((row) => ({
      id: `bg-${row.id}`,
      kind: "background",
      asset: row.id,
      name: row.name,
      unlocked: true,
      description: row.group,
      howTo: "",
      group: row.group || "region",
      thumb: window.playCardBgUrl(row.id)
    }));
  }

  // Background picks only swap art/tone; re-rendering the card reloads the avatar and shifts layout.
  function patchCardPreviewArt(stage) {
    const current = stage.querySelector(".tid-card");
    const currentArt = current?.querySelector(".tid-art");
    if (!current || !currentArt) return false;
    const tpl = document.createElement("template");
    tpl.innerHTML = window.playRenderIdCard(previewCard(), { mode: "preview", variant: "hero" }).trim();
    const next = tpl.content.querySelector(".tid-card");
    const nextArt = next?.querySelector(".tid-art");
    if (!next || !nextArt) return false;
    current.className = next.className;
    current.setAttribute("style", next.getAttribute("style") || "");
    currentArt.setAttribute("style", nextArt.getAttribute("style") || "");
    return true;
  }

  function cardPreviewStageHtml() {
    return `<p class="scc-contextual-kicker">Live Trainer ID preview</p>
      ${window.playRenderIdCard(previewCard(), { mode: "preview", variant: "hero" })}`;
  }

  const CARD_BG_FILTERS = [
    ["all", "All"],
    ["starlight", "ST★RLIGHT"],
    ["region", "Pokémon"],
    ["kanto", "Kanto"],
    ["cute", "Special"],
    ["pride", "Pride"],
    ["rewards", "Rewards"]
  ];

  function cardBgMatchesFilter(row, filter) {
    if (filter === "all") return true;
    if (filter === "kanto") return row.asset === "kanto" || row.group === "kanto";
    if (filter === "starlight") return row.asset === "starlight" || /starlight/i.test(row.name || "");
    if (filter === "rewards") return row.group === "rewards" || ["starlight", "candy"].includes(row.asset) || !row.starter;
    if (filter === "region") return row.group === "region";
    if (filter === "cute") return row.group === "cute";
    if (filter === "pride") return row.group === "pride" || String(row.asset || "").startsWith("pride-");
    return true;
  }

  function renderCardStyle() {
    const view = previewCard();
    const bgs = backgroundRows().filter((row) => cardBgMatchesFilter(row, cardBgFilter));
    return `
      <header class="scc-panel-head">
        <h2>Card Style</h2>
        <p class="muted">Choose the background art for your Trainer ID. Locked looks stay visible with unlock hints.</p>
      </header>
      <div class="scc-card-preview-stage">${cardPreviewStageHtml()}</div>
      <div class="scc-style-layout">
        <section class="scc-style-catalog" aria-label="Card backgrounds">
          <h3>Background</h3>
          <div class="scc-scope-row" role="group" aria-label="Background categories">
            ${CARD_BG_FILTERS.map(([id, label]) => `<button type="button" class="scc-scope${cardBgFilter === id ? " is-on" : ""}" data-card-bg-filter="${esc(id)}" aria-pressed="${cardBgFilter === id}">${esc(label)}</button>`).join("")}
          </div>
          <div class="scc-compact-bg-grid scc-style-grid">
            ${bgs.map((row) => {
              const equipped = row.asset === view.cardBg;
              const state = pickState(row, equipped);
              return `<button type="button" class="scc-compact-bg-opt card-bg-opt is-${state}" data-cosmetic="${esc(row.id)}" data-bg-asset="${esc(row.asset)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
                <span class="scc-compact-bg-thumb" style="background-image:url('${esc(row.thumb || window.playCardBgUrl(row.asset))}')" aria-hidden="true"></span>
                <strong class="scc-compact-bg-name">${esc(row.name)}</strong>
                <span class="id-state">${stateLabel(state)}</span>
              </button>`;
            }).join("")}
          </div>
        </section>
      </div>
      ${trainerIdActions()}`;
  }

  const TITLE_FILTERS = [["all", "All"], ["owned", "Earned"], ["locked", "Locked"]];
  const RIBBON_FILTERS = [["all", "All"], ["owned", "Earned"], ["locked", "Locked"], ["featured", "Featured"]];

  function titleHeroHtml() {
    const row = (titles || []).find((item) => item.id === (draft?.titleId || ""));
    const name = row?.name || "";
    return `
      <p class="scc-module-kicker">YOUR TRAINER TITLE</p>
      <p class="scc-title-hero-name${name ? "" : " is-empty"}">${name ? `★ ${esc(name)}` : "Choose a Trainer Title"}</p>
      <p class="muted">Displayed beneath your Trainer name.</p>`;
  }

  function ribbonStreamHint(row) {
    return window.playRibbonCopy?.({ badge: row })?.requirement || "";
  }

  function titleListHtml() {
    const q = String(titleQuery || "").trim().toLowerCase();
    const rows = (titles || []).filter((row) => {
      if (titleFilter === "owned") return Boolean(row.unlocked);
      if (titleFilter === "locked") return !row.unlocked;
      return true;
    }).filter((row) => {
      if (!q) return true;
      return `${row.name || ""} ${row.description || ""} ${row.howTo || ""}`.toLowerCase().includes(q);
    });
    if (!rows.length) {
      return `<p class="muted scc-workshop-empty">${q
        ? "No Trainer Titles match your search."
        : (titleFilter === "locked"
          ? "Nothing left to unlock here."
          : "No Trainer Titles unlocked yet. Keep playing to earn some.")}</p>`;
    }
    return rows.map((row) => {
      const equipped = row.id === (draft?.titleId || "");
      const state = pickState(row, equipped);
      const hint = row.unlocked ? (row.description || "") : (row.howTo || row.description || "Locked");
      return `<button type="button" class="scc-title-card prog-pick is-${state}" data-title="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
        <strong class="scc-title-name">${esc(row.name)}</strong>
        <span class="id-state">${stateLabel(state)}</span>
        ${hint ? `<span class="scc-title-hint">${esc(hint)}</span>` : ""}
      </button>`;
    }).join("");
  }

  function badgeSocketsHtml() {
    const max = window.PLAY_FEATURED_RIBBON_MAX || 5;
    const ids = (draft?.badgeIds || []).slice(0, max);
    return Array.from({ length: max }, (_, index) => {
      const row = (badges || []).find((item) => item.id === ids[index]);
      if (!row) {
        return `<li class="scc-ribbon-socket is-empty">
          <span class="scc-socket-name">Empty</span>
        </li>`;
      }
      const ribbon = window.playRibbonForBadge?.(row) || row;
      return `<li class="scc-ribbon-socket">
        <button type="button" class="scc-socket-btn" data-badge="${esc(row.id)}" aria-label="Remove ${esc(ribbon.name || row.name)} from featured Ribbons">
          ${window.playRibbonIconHtml?.(ribbon, { name: ribbon.name || row.name, size: 36 }) || ""}
          <span class="scc-socket-name">${esc(ribbon.name || row.name)}</span>
        </button>
      </li>`;
    }).join("");
  }

  function badgeCollectionHtml() {
    if (!(badges || []).length) {
      return `<p class="muted scc-workshop-empty">Complete Achievements to earn Ribbons.</p>`;
    }
    const q = String(ribbonQuery || "").trim().toLowerCase();
    const featured = new Set(draft?.badgeIds || []);
    const rows = (badges || []).filter((row) => {
      if (ribbonFilter === "owned") return Boolean(row.unlocked);
      if (ribbonFilter === "locked") return !row.unlocked;
      if (ribbonFilter === "featured") return featured.has(row.id);
      return true;
    }).filter((row) => {
      if (!q) return true;
      const ribbon = window.playRibbonForBadge?.(row) || row;
      const copy = window.playRibbonCopy?.({ badge: row }) || {};
      return `${ribbon.name || row.name || ""} ${copy.achievementName || ""} ${copy.requirement || ""}`.toLowerCase().includes(q);
    });
    if (!rows.length) {
      return `<p class="muted scc-workshop-empty">${q ? "No Ribbons match your search." : "No Ribbons in this filter."}</p>`;
    }
    return rows.map((row) => {
      const equipped = featured.has(row.id);
      const state = pickState(row, equipped);
      const ribbon = window.playRibbonForBadge?.(row) || row;
      const hint = ribbonStreamHint(row);
      return `<div class="scc-ribbon-card-wrap">
        <button type="button" class="scc-ribbon-card prog-pick is-${state}" data-badge="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(ribbon.name || row.name)} ${state}">
          ${window.playRibbonIconHtml?.(ribbon, { name: ribbon.name || row.name, locked: !row.unlocked, size: 48 }) || ""}
          <strong class="scc-badge-name">${esc(ribbon.name || row.name)}</strong>
          <span class="id-state">${stateLabel(state)}</span>
          ${hint ? `<span class="scc-badge-hint">${esc(hint)}</span>` : ""}
        </button>
        <button type="button" class="scc-ribbon-info" data-ribbon-detail="${esc(row.id)}" aria-label="Details for ${esc(ribbon.name || row.name)}">Details</button>
      </div>`;
    }).join("");
  }

  function renderTitles() {
    const max = window.PLAY_FEATURED_RIBBON_MAX || 5;
    const featuredCount = (draft?.badgeIds || []).length;
    return `
      <header class="scc-panel-head">
        <h2>Titles &amp; Ribbons</h2>
        <p class="muted">Choose the Trainer Title and Featured Ribbons displayed on your Trainer ID. Press <strong>Save Trainer ID</strong> to keep changes.</p>
      </header>
      <div class="scc-honors-subnav" role="tablist" aria-label="Titles and Ribbons">
        <button type="button" class="scc-chip${honorsPane === "titles" ? " is-on" : ""}" data-honors-pane="titles" role="tab" aria-selected="${honorsPane === "titles"}">Trainer Titles</button>
        <button type="button" class="scc-chip${honorsPane === "ribbons" ? " is-on" : ""}" data-honors-pane="ribbons" role="tab" aria-selected="${honorsPane === "ribbons"}">Ribbons</button>
      </div>
      <section class="scc-workshop" aria-label="Trainer Title workshop" ${honorsPane === "titles" ? "" : "hidden"}>
        <h3 class="scc-workshop-head">Trainer Titles</h3>
        <div class="scc-title-hero">${titleHeroHtml()}</div>
        <div class="scc-workshop-bar">
          <label class="field scc-browser-search" for="title-search">Search
            <input id="title-search" type="search" placeholder="Search Trainer Titles…" value="${esc(titleQuery || "")}">
          </label>
          <div class="scc-filter-row" role="group" aria-label="Trainer Title filters">
            ${TITLE_FILTERS.map(([id, label]) => `<button type="button" class="scc-chip${titleFilter === id ? " is-on" : ""}" data-title-filter="${id}" aria-pressed="${titleFilter === id}">${label}</button>`).join("")}
          </div>
        </div>
        <div id="title-list" class="scc-title-list">${titleListHtml()}</div>
      </section>
      <section class="scc-workshop" aria-label="Ribbon workshop" ${honorsPane === "ribbons" ? "" : "hidden"}>
        <h3 class="scc-workshop-head">Ribbons</h3>
        <p class="muted">Feature up to five earned Ribbons on your Trainer ID.</p>
        <p class="scc-module-kicker">FEATURED RIBBONS <span id="badge-count">${featuredCount}/${max}</span></p>
        <ul id="badge-sockets" class="scc-ribbon-sockets">${badgeSocketsHtml()}</ul>
        <div class="scc-workshop-bar">
          <label class="field scc-browser-search" for="ribbon-search">Search
            <input id="ribbon-search" type="search" placeholder="Search Ribbons…" value="${esc(ribbonQuery || "")}">
          </label>
          <div class="scc-filter-row" role="group" aria-label="Ribbon filters">
            ${RIBBON_FILTERS.map(([id, label]) => `<button type="button" class="scc-chip${ribbonFilter === id ? " is-on" : ""}" data-ribbon-filter="${id}" aria-pressed="${ribbonFilter === id}">${label}</button>`).join("")}
          </div>
        </div>
        <p class="scc-module-kicker scc-collection-kicker">RIBBON COLLECTION</p>
        <div id="badge-collection" class="scc-ribbon-collection">${badgeCollectionHtml()}</div>
      </section>
      ${trainerIdActions()}`;
  }

  function refreshTitleList() {
    const box = document.getElementById("title-list");
    if (!box) {
      renderProfileWorkspace();
      return;
    }
    box.innerHTML = titleListHtml();
    box.scrollTop = 0;
    els.workspace?.querySelectorAll("[data-title-filter]").forEach((btn) => {
      const on = btn.dataset.titleFilter === titleFilter;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function refreshRibbonCollection() {
    const box = document.getElementById("badge-collection");
    if (!box) {
      renderProfileWorkspace();
      return;
    }
    box.innerHTML = badgeCollectionHtml();
    els.workspace?.querySelectorAll("[data-ribbon-filter]").forEach((btn) => {
      const on = btn.dataset.ribbonFilter === ribbonFilter;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const count = document.getElementById("badge-count");
    if (count) count.textContent = `${(draft?.badgeIds || []).length}/${window.PLAY_FEATURED_RIBBON_MAX || 5}`;
    const sockets = document.getElementById("badge-sockets");
    if (sockets) sockets.innerHTML = badgeSocketsHtml();
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
    const rainbow = window.PLAY_GYM_BADGE_CATALOG?.badges?.find((b) => b.id === "rainbow-badge")
      || { id: "rainbow-badge", name: "Rainbow Badge", localIcon: "images/gym-badges/rainbow-badge.png" };
    return `
      <header class="scc-panel-head">
        <h2>Showcase</h2>
        <p class="muted">Favorite Pokémon and Featured Shiny appear on your public Trainer ID.</p>
      </header>
      <div class="scc-showcase-layout">
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
          <section class="scc-gym-badge-placeholder" aria-label="Gym Badge Coming Soon">
            <p class="scc-module-kicker">GYM BADGE</p>
            <div class="tid-show-badge-placeholder">
              <div class="tid-show-badge-art" aria-hidden="true">
                <img src="${esc(rainbow.localIcon || "images/gym-badges/rainbow-badge.png")}" alt="" width="48" height="48" decoding="async">
              </div>
              <p class="tid-show-badge-soon">Badges Coming Soon</p>
            </div>
          </section>
        </div>
        <div class="scc-contextual scc-showcase-preview">${window.playRenderTrainerShowcaseHtml(previewCard())}</div>
      </div>
      ${trainerIdActions()}`;
  }

  function teamBgRows() {
    const catalog = window.PLAY_TEAM_BACKGROUNDS || [];
    const byAsset = new Map();
    (cosmetics || []).forEach((row) => {
      if (row.kind === "team_background") byAsset.set(row.asset, row);
    });
    const freeIds = new Set(freeTeamBgIds());
    const filterRank = (filter) => {
      const order = ["basic", "kanto", "lets-go", "cities", "routes", "landmarks", "battle", "special", "retro"];
      const idx = order.indexOf(String(filter || "").toLowerCase());
      return idx < 0 ? 90 : idx;
    };
    return catalog
      .slice()
      .sort((a, b) => filterRank(a.filter) - filterRank(b.filter) || (a.sort || 0) - (b.sort || 0) || String(a.name || "").localeCompare(String(b.name || "")))
      .map((meta) => {
        const cos = byAsset.get(meta.id);
        const free = Boolean(meta.free || freeIds.has(meta.id));
        return {
          id: cos?.id || `team-bg-${meta.id}`,
          kind: "team_background",
          asset: meta.id,
          name: cos?.name || meta.name,
          description: cos?.description || "",
          howTo: cos?.howTo || "Coming soon — unlocks through future Trainer rewards.",
          unlocked: Boolean(
            cos?.unlocked
            || cos?.starter
            || free
            || isCosmeticAdmin()
          ),
          starter: Boolean(cos?.starter || free),
          category: meta.category || "Special",
          filter: meta.filter || "special",
          region: meta.region || "",
          source: meta.source || "",
          cssClass: meta.cssClass,
          style: meta.style,
          image: meta.asset || "",
          sort: meta.sort || 0
        };
      });
  }

  const TEAM_BG_FILTERS = [
    ["all", "All"],
    ["basic", "Basic"],
    ["kanto", "Kanto"],
    ["lets-go", "Let's Go"],
    ["retro", "Retro"],
    ["cities", "Cities"],
    ["routes", "Routes"],
    ["landmarks", "Landmarks"],
    ["battle", "Battle"],
    ["special", "Special"]
  ];

  function teamBgMatchesFilter(row, filter) {
    if (filter === "all") return true;
    if (filter === "retro") return false;
    if (filter === "basic") return row.filter === "basic";
    if (filter === "kanto" || filter === "lets-go") return row.filter === filter;
    if (["cities", "routes", "landmarks", "battle", "special"].includes(filter)) {
      const bucket = String(row.filterBucket || row.category || "").toLowerCase();
      return bucket === filter;
    }
    return row.filter === filter;
  }

  function teamBgThumbStyle(row) {
    if (!row?.image) return "";
    return ` style="--team-bg-image:url('${esc(row.image)}');background-image:linear-gradient(180deg,rgba(12,24,48,.12),rgba(12,24,48,.28)),url('${esc(row.image)}');background-size:cover;background-position:center"`;
  }

  function ownedTeamBgCycle() {
    return teamBgRows().filter((row) => row.unlocked);
  }

  function selectedTeamBgRow() {
    const view = previewCard();
    const key = window.playNormalizeTeamBgId?.(view.teamBg) || view.teamBg || "pallet-town";
    return teamBgRows().find((row) => row.asset === key)
      || teamBgRows().find((row) => row.asset === "pallet-town")
      || teamBgRows()[0];
  }

  function cycleTeamBg(dir) {
    const owned = ownedTeamBgCycle();
    if (!owned.length) return;
    const current = selectedTeamBgRow()?.asset || "pallet-town";
    let idx = owned.findIndex((row) => row.asset === current);
    if (idx < 0) idx = 0;
    const next = owned[(idx + dir + owned.length) % owned.length];
    if (!next?.unlocked) return;
    draft.teamBg = next.asset;
    updateTeamBgSelection();
  }

  function renderTeamBgCompact() {
    const selected = selectedTeamBgRow();
    const thumbStyle = teamBgThumbStyle(selected);
    const locked = selected && !selected.unlocked;
    return `
      <section class="scc-team-bg-compact" aria-label="Team background">
        <div class="scc-team-bg-compact-head">
          <p class="scc-module-kicker">TEAM BACKGROUND</p>
          <button type="button" class="scc-team-bg-browse" data-team-bg-browse="1">Browse All Backgrounds</button>
        </div>
        <div class="scc-team-bg-carousel" role="group" aria-label="Background selector">
          <button type="button" class="scc-team-bg-nav" data-team-bg-cycle="-1" aria-label="Previous background">‹</button>
          <button type="button" class="scc-team-bg-current${locked ? " is-locked" : ""}" data-team-bg="${esc(selected?.asset || "pallet-town")}" aria-label="Selected ${esc(selected?.name || "Background")}">
            <span class="scc-team-bg-current-thumb ${esc(selected?.cssClass || "")}"${thumbStyle} aria-hidden="true"></span>
            <strong class="scc-team-bg-current-name">${esc(selected?.name || "Pallet Town")}</strong>
            ${locked ? `<span class="id-state">LOCKED</span>` : ""}
          </button>
          <button type="button" class="scc-team-bg-nav" data-team-bg-cycle="1" aria-label="Next background">›</button>
        </div>
        <p class="muted scc-team-bg-hint">Preview updates instantly. Persist with <strong>Save Trainer ID</strong>.</p>
      </section>`;
  }

  function renderTeamBgModalBody() {
    const view = previewCard();
    const key = window.playNormalizeTeamBgId?.(view.teamBg) || view.teamBg || "pallet-town";
    const chromeFilters = TEAM_BG_FILTERS.map(([id, label]) => `<button type="button" class="scc-scope${teamBgFilter === id ? " is-on" : ""}" data-team-bg-filter="${esc(id)}" aria-pressed="${teamBgFilter === id}">${esc(label)}</button>`).join("");
    if (teamBgFilter === "retro") {
      return `
      <div class="scc-team-bg-modal-chrome">
        <div class="scc-scope-row" role="group" aria-label="Background categories">${chromeFilters}</div>
        <label class="field scc-browser-search" for="team-bg-search">Search
          <input id="team-bg-search" type="search" placeholder="Viridian, Route, Forest…" value="${esc(teamBgQuery || "")}">
        </label>
        <div class="scc-team-bg-modal-viewport">
          <div class="scc-team-bg-coming-soon" role="status">
            <p class="scc-module-kicker">RETRO BACKGROUNDS</p>
            <strong>Coming Soon</strong>
            <p class="muted">Classic-era Team scenes are resting in the PC for a future update.</p>
          </div>
        </div>
      </div>`;
    }
    const rows = teamBgRows().filter((row) => teamBgMatchesFilter(row, teamBgFilter));
    const q = String(teamBgQuery || "").trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) => `${row.name} ${row.category} ${row.filter}`.toLowerCase().includes(q))
      : rows;
    return `
      <div class="scc-team-bg-modal-chrome">
        <div class="scc-scope-row" role="group" aria-label="Background categories">${chromeFilters}</div>
        <label class="field scc-browser-search" for="team-bg-search">Search
          <input id="team-bg-search" type="search" placeholder="Viridian, Route, Forest…" value="${esc(teamBgQuery || "")}">
        </label>
        <div class="scc-team-bg-modal-viewport">
          <div class="scc-team-bg-modal-grid">
            ${filtered.map((row) => {
              const equipped = row.asset === key;
              const state = pickState(row, equipped);
              const labelExtra = state === "locked" ? " locked" : (equipped ? " selected" : "");
              return `<button type="button" class="scc-compact-bg-opt team-bg-opt is-${state}" data-team-bg="${esc(row.asset)}" aria-pressed="${equipped}" aria-label="${esc(row.name)}${labelExtra}">
                <span class="scc-compact-bg-thumb team-bg-thumb ${esc(row.cssClass || "")}"${teamBgThumbStyle(row)} aria-hidden="true"></span>
                <strong class="scc-compact-bg-name">${esc(row.name)}</strong>
                ${state === "locked" ? `<span class="id-state">LOCKED</span>` : `<span class="id-state is-silent" aria-hidden="true"></span>`}
              </button>`;
            }).join("") || `<p class="muted scc-team-bg-empty">No backgrounds match.</p>`}
          </div>
        </div>
      </div>`;
  }

  function openTeamBgModal() {
    const existing = document.getElementById("team-bg-modal");
    if (existing) existing.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "team-bg-modal";
    dialog.className = "play-modal play-modal-wide scc-team-bg-modal";
    dialog.innerHTML = `
      <form method="dialog" class="play-modal-card scc-team-bg-modal-card">
        <header class="play-modal-head">
          <h2>Team Backgrounds</h2>
          <button type="submit" class="play-modal-close" value="cancel" aria-label="Close">×</button>
        </header>
        <div class="play-modal-body scc-team-bg-modal-body" id="team-bg-modal-body">${renderTeamBgModalBody()}</div>
      </form>`;
    document.body.appendChild(dialog);
    const browseBtn = els.workspace?.querySelector("[data-team-bg-browse]");
    const onClose = () => {
      dialog.removeEventListener("close", onClose);
      dialog.remove();
      browseBtn?.focus?.();
    };
    dialog.addEventListener("close", onClose);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
      const filterBtn = event.target.closest("[data-team-bg-filter]");
      if (filterBtn) {
        teamBgFilter = filterBtn.dataset.teamBgFilter || "all";
        const body = document.getElementById("team-bg-modal-body");
        if (body) body.innerHTML = renderTeamBgModalBody();
        return;
      }
      const pick = event.target.closest("[data-team-bg]");
      if (pick) {
        const row = teamBgRows().find((item) => item.asset === pick.dataset.teamBg);
        if (!row?.unlocked) {
          if (els.status) els.status.textContent = `${row?.name || "This background"} is locked. ${row?.howTo || ""}`.trim();
          return;
        }
        draft.teamBg = row.asset;
        updateTeamBgSelection();
        dialog.close();
      }
    });
    dialog.addEventListener("input", (event) => {
      if (event.target?.id !== "team-bg-search") return;
      teamBgQuery = event.target.value || "";
      const body = document.getElementById("team-bg-modal-body");
      if (body) body.innerHTML = renderTeamBgModalBody();
      const search = document.getElementById("team-bg-search");
      if (search) {
        search.focus();
        const len = search.value.length;
        search.setSelectionRange(len, len);
      }
    });
    window.playShowDialog?.(dialog) || dialog.showModal?.();
    document.getElementById("team-bg-search")?.focus?.();
  }

  function renderTeam() {
    const view = previewCard();
    view.editor = true;
    const filled = (card?.team || []).filter(Boolean).length;
    return `
      <header class="scc-panel-head scc-team-head">
        <div>
          <h2>My Team</h2>
          <p class="muted">Build your Trainer party from Pokémon in your PC. Showcase backgrounds save with <strong>Save Trainer ID</strong>.</p>
        </div>
        <p class="scc-team-count" aria-label="Party size">${filled} / 6</p>
      </header>
      <section class="scc-team-stage-wrap" aria-label="Party stage">
        <div class="scc-team-live-preview" id="team-bg-live-preview">${window.playRenderTrainerPartyHtml(view)}</div>
      </section>
      <section class="scc-team-editor" aria-label="My Team slots">
        <p class="scc-module-kicker">PARTY</p>
        <div id="team-slots" class="team-slots team-slots-party team-party-strip"></div>
        <p id="team-status" class="muted" role="status"></p>
      </section>
      ${renderTeamBgCompact()}
      ${trainerIdActions()}`;
  }

  function updateTeamBgSelection() {
    if (!els.workspace) return;
    const view = previewCard();
    view.editor = true;
    const selected = selectedTeamBgRow();
    const current = els.workspace.querySelector(".scc-team-bg-current");
    if (current && selected) {
      current.dataset.teamBg = selected.asset;
      current.setAttribute("aria-label", `Selected ${selected.name}`);
      const thumb = current.querySelector(".scc-team-bg-current-thumb");
      if (thumb) {
        thumb.className = `scc-team-bg-current-thumb ${selected.cssClass || ""}`;
        if (selected.image) {
          thumb.style.setProperty("--team-bg-image", `url('${selected.image}')`);
          thumb.style.backgroundImage = `linear-gradient(180deg,rgba(12,24,48,.12),rgba(12,24,48,.28)),url('${selected.image}')`;
          thumb.style.backgroundSize = "cover";
          thumb.style.backgroundPosition = "center";
        } else {
          thumb.style.removeProperty("--team-bg-image");
          thumb.style.backgroundImage = "";
        }
      }
      const name = current.querySelector("strong");
      if (name) name.textContent = selected.name || "Pallet Town";
      const stateEl = current.querySelector(".id-state");
      if (stateEl) {
        if (!selected.unlocked) stateEl.textContent = "LOCKED";
        else stateEl.remove();
      }
    }
    const preview = els.workspace.querySelector("#team-bg-live-preview");
    if (preview) preview.innerHTML = window.playRenderTrainerPartyHtml(view);
    const modalBody = document.getElementById("team-bg-modal-body");
    if (modalBody) modalBody.innerHTML = renderTeamBgModalBody();
    markDirtyFlag();
  }

  function renderProfileWorkspace() {
    if (!els.workspace) return;
    const gallery = els.workspace.querySelector(".scc-avatar-results");
    const galleryTop = gallery ? gallery.scrollTop : null;
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
    if (galleryTop != null) {
      const next = els.workspace.querySelector(".scc-avatar-results");
      if (next) next.scrollTop = galleryTop;
    }
    markDirtyFlag();
    setSaveBusy(saveBusy);
    syncSubnav();
  }

  function repaintPick(btn, state) {
    btn.classList.remove("is-locked", "is-equipped", "is-owned", "is-new");
    btn.classList.add(`is-${state}`);
    const label = btn.querySelector(".id-state");
    if (label) label.textContent = stateLabel(state);
  }

  function updateAvatarSelection() {
    if (!els.workspace) return;
    els.workspace.querySelectorAll("[data-sprite]").forEach((btn) => {
      const equipped = btn.dataset.sprite === draft.sprite;
      const locked = btn.dataset.locked === "1";
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, locked ? "locked" : (equipped ? "equipped" : "owned"));
    });
    const stage = els.workspace.querySelector(".scc-stage-body");
    if (stage) {
      stage.innerHTML = avatarStageHtml();
      // Geometry is applied atomically inside playNormalizeTrainerAvatar (stage mode).
      // Do not run positional acquire animations — they cause visible jumps.
    }
    markDirtyFlag();
  }

  function updateCardStyleSelection() {
    if (!els.workspace) return;
    const view = previewCard();
    const lookup = backgroundRows();
    els.workspace.querySelectorAll("[data-cosmetic]").forEach((btn) => {
      const row = lookup.find((item) => item.id === btn.dataset.cosmetic);
      if (!row) return;
      const equipped = row.asset === view.cardBg;
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, pickState(row, equipped));
    });
    const stage = els.workspace.querySelector(".scc-card-preview-stage");
    if (stage && !patchCardPreviewArt(stage)) stage.innerHTML = cardPreviewStageHtml();
    markDirtyFlag();
  }

  function updateTitleSelection() {
    if (!els.workspace) return;
    els.workspace.querySelectorAll("#title-list [data-title]").forEach((btn) => {
      const row = (titles || []).find((item) => item.id === btn.dataset.title);
      if (!row) return;
      const equipped = row.id === (draft?.titleId || "");
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, pickState(row, equipped));
    });
    els.workspace.querySelectorAll("#badge-collection [data-badge]").forEach((btn) => {
      const row = (badges || []).find((item) => item.id === btn.dataset.badge);
      if (!row) return;
      const equipped = (draft?.badgeIds || []).includes(row.id);
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, pickState(row, equipped));
    });
    const hero = els.workspace.querySelector(".scc-title-hero");
    if (hero) hero.innerHTML = titleHeroHtml();
    const sockets = document.getElementById("badge-sockets");
    if (sockets) sockets.innerHTML = badgeSocketsHtml();
    const count = document.getElementById("badge-count");
    if (count) count.textContent = `${(draft?.badgeIds || []).length}/${window.PLAY_FEATURED_RIBBON_MAX || 5}`;
    markDirtyFlag();
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
    const next = category === "trainer-id" && profileTab !== "identity"
      ? `trainer-id/${profileTab}`
      : category;
    if (location.hash.replace(/^#/, "") !== next) {
      history.replaceState(null, "", `#${next}`);
    }
  }

  function applyHash() {
    const raw = location.hash.replace(/^#/, "").toLowerCase();
    const mapped = LEGACY_HASH[raw] || LEGACY_HASH[raw.split("/")[0]] || { cat: "trainer-id", tab: "identity" };
    category = mapped.cat || "trainer-id";
    if (mapped.tab) profileTab = mapped.tab;
    const tab = raw.split("/")[1];
    if (PROFILE_TABS.includes(tab)) profileTab = tab;
    syncNav();
    if (category === "trainer-id") renderProfileWorkspace();
  }

  function applyCategory(next) {
    category = next;
    syncNav();
    setHash();
    if (category === "trainer-id") renderProfileWorkspace();
    markDirtyFlag();
  }

  function goToCategory(next) {
    if (category === "trainer-id" && next !== "trainer-id" && profileDirty()) {
      confirmLeave(() => applyCategory(next));
      return;
    }
    applyCategory(next);
  }

  /* ---------- Unsaved Trainer ID guard ---------- */

  function confirmLeave(proceed) {
    if (!profileDirty()) {
      proceed();
      return;
    }
    if (typeof els.dirtyWarn?.showModal === "function") {
      leaveIntent = proceed;
      if (!els.dirtyWarn.open) {
        els.dirtyWarn.returnValue = "";
        els.dirtyWarn.showModal();
      }
      return;
    }
    if (window.confirm("You have unsaved Trainer ID changes. Leave without saving?")) {
      revertTrainerId();
      proceed();
    }
  }

  function leavingHref(anchor) {
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return "";
    const raw = anchor.getAttribute("href") || "";
    if (!raw || raw.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(raw)) return "";
    try {
      const url = new URL(raw, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  els.dirtyWarn?.addEventListener("close", async () => {
    const proceed = leaveIntent;
    const choice = els.dirtyWarn.returnValue;
    leaveIntent = null;
    if (!proceed || choice === "keep" || !choice) return;
    if (choice === "discard") {
      revertTrainerId();
      proceed();
      return;
    }
    if (choice === "save") {
      const ok = await saveTrainerId();
      if (ok) proceed();
    }
  });

  document.addEventListener("click", (event) => {
    if (!profileDirty()) return;
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || els.dirtyWarn?.contains(anchor)) return;
    const href = leavingHref(anchor);
    if (!href) return;
    event.preventDefault();
    confirmLeave(() => { location.href = href; });
  }, true);

  els.dirtyDiscard?.addEventListener("click", () => {
    if (saveBusy) return;
    revertTrainerId();
  });

  els.dirtySave?.addEventListener("click", () => {
    if (saveBusy) return;
    saveTrainerId();
  });

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

  /* ---------- Connections (Trainer Account) ---------- */

  function setConnStatus(text) {
    if (els.connStatus) els.connStatus.textContent = text || "";
  }

  function renderSecurity() {
    if (els.securityEmail) {
      els.securityEmail.textContent = accountState?.emailLogin
        ? "Email & password login is enabled for this Trainer Account."
        : "This Trainer was originally created through Twitch. Add an email and password so you can sign in even if Twitch changes.";
    }
    if (els.claimForm) els.claimForm.hidden = Boolean(accountState?.emailLogin);
    if (els.passwordForm) els.passwordForm.hidden = !accountState?.emailLogin;
  }

  function renderConnections() {
    if (!els.connectionList || !els.pendingLink) return;
    const rows = accountState?.connections || [];
    const advanced = rows.length > 1 || Boolean(accountState?.staffRole);
    const unconfirmed = rows.filter((row) => row.confirmed === false);
    const intent = window.playReadOAuthIntent();
    if (unconfirmed.length) {
      const row = unconfirmed[0];
      const mismatch = intent.intent === "reauthorize" && intent.target && intent.target !== row.twitchUserId;
      els.pendingLink.hidden = false;
      els.pendingLink.innerHTML = mismatch
        ? `<strong>Identity mismatch</strong>
           <p>You started reauthorization for a different Twitch account. This returned <strong>${esc(row.displayName || row.login)}</strong> (@${esc(row.login || "")}). It was not connected.</p>
           <div class="links"><button type="button" data-cancel-link="${esc(row.twitchUserId)}">Dismiss</button></div>`
        : `<strong>Twitch account found</strong>
           <div class="connection-found">
             ${row.avatar ? `<img class="avatar" src="${esc(row.avatar)}" alt="">` : ""}
             <div>
               <strong>${esc(row.displayName || row.login || "Twitch")}</strong>
               <p class="muted">@${esc(row.login || "")}</p>
             </div>
           </div>
           <p>Is this the Twitch account you want to connect?</p>
           <div class="links">
             <button type="button" data-confirm-link="${esc(row.twitchUserId)}">Yes, link this account</button>
             <button type="button" class="secondary" data-cancel-link="${esc(row.twitchUserId)}">Cancel</button>
           </div>`;
      if (mismatch) {
        window.playCall("play_cancel_twitch_link", { p_twitch_user_id: row.twitchUserId }).catch(() => {});
      }
    } else {
      els.pendingLink.hidden = true;
      els.pendingLink.innerHTML = "";
      if (intent.intent === "reauthorize" && pendingOauth === "done") {
        els.pendingLink.hidden = false;
        els.pendingLink.innerHTML = `<strong>Twitch reauthorized.</strong> The same identity was confirmed. Primary did not change.`;
      }
    }
    const shown = rows.filter((row) => row.confirmed !== false);
    els.connectionList.innerHTML = shown.map((row) => {
      const tags = [];
      if (row.primary) tags.push(`<span class="conn-badge conn-primary">Primary</span>`);
      else tags.push(`<span class="conn-badge">Linked</span>`);
      if (row.type === "bot" || row.type === "utility") tags.push(`<span class="conn-badge">Bot / Utility</span>`);
      tags.push(`<span class="conn-badge">${row.gameplayEnabled ? "Gameplay enabled" : "Gameplay disabled"}</span>`);
      if (advanced) tags.push(`<span class="conn-badge">${row.loginEnabled ? "Login enabled" : "Login disabled"}</span>`);
      tags.push(`<span class="conn-badge">${row.status === "connected" ? "Connected" : "Needs reauthorization"}</span>`);
      const actions = [];
      if (!row.primary) actions.push(`<button type="button" data-primary="${esc(row.twitchUserId)}">Make Primary</button>`);
      actions.push(`<button type="button" class="secondary" data-reauth="${esc(row.twitchUserId)}">Reauthorize</button>`);
      if (!row.primary) actions.push(`<button type="button" class="secondary" data-disconnect="${esc(row.twitchUserId)}">Disconnect</button>`);
      if (advanced && row.type !== "bot" && row.type !== "utility") {
        actions.push(`<button type="button" class="secondary" data-bot="${esc(row.twitchUserId)}">Mark bot / utility</button>`);
      }
      return `<article class="connection-card${row.primary ? " is-primary" : ""}">
        <div class="connection-head">
          ${row.avatar ? `<img class="avatar" src="${esc(row.avatar)}" alt="">` : `<span class="avatar-fallback">${esc((row.displayName || "T").slice(0, 1))}</span>`}
          <div>
            <strong>${esc(row.displayName || row.login || "Twitch")}</strong>
            <p class="muted">@${esc(row.login || "")} · ${esc(window.playTwitchConnectionKindLabel(row))}</p>
          </div>
        </div>
        <div class="conn-badges">${tags.join("")}</div>
        <p class="muted conn-help">${row.primary
          ? "Primary is your default Twitch-facing identity. Changing it does not move Pokémon, inventory, or XP."
          : "This identity stays linked to the same Trainer Account."}</p>
        <div class="links">${actions.join("")}</div>
      </article>`;
    }).join("") || `<p class="muted">No Twitch account is linked yet.<br>Connect Twitch so the RPG knows which Trainer is participating when you play in chat and on stream. You can still browse your Pokédex, PC, Mart, Rankings, and Events without it.</p>`;
  }

  function renderAccountPanels() {
    if (els.username) els.username.value = accountState?.username || "";
    renderSecurity();
    renderConnections();
  }

  async function startLink() {
    setConnStatus("Opening Twitch…");
    const result = await window.playLinkTwitch({
      intent: pendingOauth === "reauth" ? "reauthorize" : "link",
      target: pendingOauth === "reauth" ? window.playReadOAuthIntent().target : ""
    });
    if (result && !result.ok) setConnStatus(result.message);
  }

  function openLinkFlow(kind) {
    pendingOauth = kind;
    if (typeof els.twitchWarn?.showModal === "function") els.twitchWarn.showModal();
    else startLink();
  }

  document.getElementById("save-username")?.addEventListener("click", async () => {
    setConnStatus("Saving Account Username…");
    try {
      accountState = await window.playCall("play_set_username", { p_username: els.username?.value || "" });
      renderAccountPanels();
      setConnStatus(accountState?.message || "Account Username saved.");
    } catch (error) {
      setConnStatus(window.playRpcError(error));
    }
  });

  els.claimForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setConnStatus("Adding login method…");
    const result = await window.playClaimEmailPassword(
      document.getElementById("claim-email")?.value,
      document.getElementById("claim-password")?.value
    );
    setConnStatus(result.message);
    if (result.ok) await loadAccountState();
  });

  els.passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pass = document.getElementById("new-password")?.value || "";
    if (pass.length < 8) {
      setConnStatus("Use at least 8 characters for your password.");
      return;
    }
    setConnStatus("Updating password…");
    const { error } = await supabase.auth.updateUser({ password: pass });
    setConnStatus(error ? "Could not update that password." : "Password updated.");
  });

  document.getElementById("link-twitch")?.addEventListener("click", () => openLinkFlow("link"));

  document.getElementById("twitch-warn-go")?.addEventListener("click", (event) => {
    event.preventDefault();
    els.twitchWarn?.close?.("yes");
    startLink();
  });

  els.connectionList?.addEventListener("click", async (event) => {
    const primary = event.target.closest("[data-primary]");
    const disconnect = event.target.closest("[data-disconnect]");
    const reauth = event.target.closest("[data-reauth]");
    const bot = event.target.closest("[data-bot]");
    try {
      if (primary) {
        setConnStatus("Updating Primary…");
        accountState = await window.playCall("play_set_primary_twitch", { p_twitch_user_id: primary.dataset.primary });
        renderAccountPanels();
        setConnStatus(accountState?.message || "Primary updated. RPG progress is unchanged.");
        return;
      }
      if (disconnect) {
        if (!window.confirm("Disconnect this Twitch identity? Pokémon, inventory, and XP stay on this Trainer Account.")) return;
        setConnStatus("Disconnecting…");
        accountState = await window.playCall("play_disconnect_twitch", { p_twitch_user_id: disconnect.dataset.disconnect });
        renderAccountPanels();
        setConnStatus(accountState?.message || "Disconnected.");
        return;
      }
      if (bot) {
        if (!window.confirm("Mark this Twitch identity as bot/utility? It will stay linked but will not join gameplay or sign in.")) return;
        setConnStatus("Updating connection…");
        accountState = await window.playCall("play_set_twitch_flags", {
          p_twitch_user_id: bot.dataset.bot,
          p_connection_type: "bot",
          p_gameplay_enabled: false,
          p_login_enabled: false
        });
        renderAccountPanels();
        setConnStatus(accountState?.message || "Marked as bot/utility.");
        return;
      }
      if (reauth) {
        window.playSetOAuthIntent("reauthorize", reauth.dataset.reauth);
        openLinkFlow("reauth");
      }
    } catch (error) {
      setConnStatus(window.playRpcError(error));
    }
  });

  els.pendingLink?.addEventListener("click", async (event) => {
    const confirmBtn = event.target.closest("[data-confirm-link]");
    const cancelBtn = event.target.closest("[data-cancel-link]");
    try {
      if (confirmBtn) {
        setConnStatus("Linking…");
        accountState = await window.playCall("play_confirm_twitch_link", { p_twitch_user_id: confirmBtn.dataset.confirmLink });
        window.playClearOAuthIntent();
        renderAccountPanels();
        if (category === "trainer-id" && profileTab === "identity") renderProfileWorkspace();
        setConnStatus(accountState?.message || "Twitch account linked.");
      }
      if (cancelBtn) {
        setConnStatus("Cancelling…");
        accountState = await window.playCall("play_cancel_twitch_link", { p_twitch_user_id: cancelBtn.dataset.cancelLink });
        window.playClearOAuthIntent();
        renderAccountPanels();
        setConnStatus(accountState?.message || "Link cancelled.");
      }
    } catch (error) {
      setConnStatus(window.playRpcError(error));
    }
  });

  async function loadAccountState() {
    try {
      accountState = await window.playCall("play_account_state");
    } catch (error) {
      console.warn("play_account_state failed", error);
      accountState = null;
      setConnStatus(window.playRpcError(error, "Could not load your account connections."));
      return;
    }
    renderAccountPanels();
  }

  /* ---------- Load ---------- */

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
        if (!profileDirty()) {
          savedCard = { ...card };
          snapshotDraft(card);
        } else if (savedCard) {
          // Keep the in-progress Trainer ID draft; refresh non-draft fields only.
          savedCard = { ...savedCard, ...prog.trainer };
        }
      }
    } catch (_) {}
  }

  async function loadPcStorage() {
    try {
      const boxes = await window.playCall("play_storage");
      pcStorage = { mons: boxes?.mons || [], layout: boxes?.layout || { boxes: [] } };
    } catch (error) {
      console.warn("play_storage failed", error);
      pcStorage = null;
    }
  }

  async function load() {
    const keepDraft = profileDirty() ? { ...draft } : null;
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    window.playAuthRememberSession?.(session || null);
    if (!session) {
      window.playSetAccountNav(null);
      els.box.hidden = true;
      window.playRestoreGate(els.gate, GATE_COPY);
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
      staffRole = String(snapshot?.staffRole || "");
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
    await loadAccountState();
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
      if (keepDraft) draft = keepDraft;
      else snapshotDraft(card);
      await loadProgression();
      if (keepDraft) draft = keepDraft;
    } catch (error) {
      els.gate.textContent = window.playRpcError(error, "Could not load your Trainer ID.");
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    await loadPcStorage();
    applyHash();
    fillEncounter();
    fillPerf();
    els.gate.hidden = true;
    els.box.hidden = false;
    markDirtyFlag();
  }

  const teamStatusProxy = {
    _text: "",
    _clearTimer: 0,
    get textContent() { return this._text; },
    set textContent(value) {
      this._text = value;
      const el = document.getElementById("team-status");
      if (!el) return;
      el.textContent = value;
      window.clearTimeout(this._clearTimer);
      if (value) {
        this._clearTimer = window.setTimeout(() => {
          if (el.textContent === value) el.textContent = "";
          if (this._text === value) this._text = "";
        }, 2400);
      }
    }
  };

  function flashEditStatus(message) {
    if (!els.status) return;
    els.status.textContent = message || "";
    window.clearTimeout(flashEditStatus._timer);
    if (message) {
      flashEditStatus._timer = window.setTimeout(() => {
        if (els.status?.textContent === message) els.status.textContent = "";
      }, 2400);
    }
  }

  if (els.workspace) {
    window.playBindTeamSlots(
      els.workspace,
      () => ({ team: card?.team || [], pcStorage }),
      async (ids) => {
        const data = await window.playCall("play_set_team", { p_catch_ids: ids });
        if (data?.trainer) card = data.trainer;
        else if (data?.team && card) card.team = data.team;
        if (savedCard) savedCard = { ...savedCard, team: card.team };
        const teamEl = document.getElementById("team-slots");
        if (teamEl) window.playRenderTeamSlots(teamEl, card?.team, { mine: true });
        const party = els.workspace.querySelector(".scc-contextual-team");
        if (party) {
          party.innerHTML = window.playRenderTrainerPartyHtml(previewCard());
          if (party.dataset.inspectBound !== "1") {
            party.dataset.inspectBound = "1";
            party.addEventListener("click", (event) => {
              const hit = event.target.closest("[data-inspect-catch]");
              if (!hit) return;
              const id = hit.getAttribute("data-inspect-catch");
              const mon = (card?.team || []).find((row) => String(row?.id) === String(id));
              if (!mon) return;
              const richer = (pcStorage?.mons || []).find((row) => String(row?.id) === String(id)) || mon;
              window.playOpenTeamMonInspect?.(richer, { mode: "owner" });
            });
          }
        }
        return data;
      },
      teamStatusProxy
    );
  }

  document.querySelector(".scc-nav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-scc-cat]");
    if (!btn) return;
    goToCategory(btn.dataset.sccCat);
  });

  document.querySelector(".scc-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-profile-tab]");
    if (!btn) return;
    profileTab = btn.dataset.profileTab;
    renderProfileWorkspace();
    setHash();
  });

  els.workspace?.addEventListener("click", (event) => {
    if (event.target.closest("#save-display-name")) {
      saveDisplayName();
      return;
    }
    if (event.target.closest("#save-trainer-id")) {
      saveTrainerId();
      return;
    }
    if (event.target.closest("#revert-trainer-id")) {
      revertTrainerId();
      return;
    }
    if (event.target.closest("#identity-link-twitch")) {
      goToCategory("connections");
      return;
    }
    const jumpCat = event.target.closest("[data-jump-cat]");
    if (jumpCat) {
      goToCategory(jumpCat.dataset.jumpCat);
      return;
    }
    const jump = event.target.closest("[data-jump-tab]");
    if (jump) {
      event.preventDefault();
      profileTab = jump.dataset.jumpTab;
      renderProfileWorkspace();
      setHash();
      return;
    }
    const scope = event.target.closest("[data-avatar-scope]");
    if (scope) {
      avatarScope = scope.dataset.avatarScope;
      if (avatarScope !== "regions") avatarFilter = "all";
      refreshAvatarBrowser();
      return;
    }
    const filter = event.target.closest("[data-avatar-filter]");
    if (filter) {
      avatarFilter = filter.dataset.avatarFilter;
      refreshAvatarBrowser();
      return;
    }
    const titleFilterBtn = event.target.closest("[data-title-filter]");
    if (titleFilterBtn) {
      titleFilter = titleFilterBtn.dataset.titleFilter;
      refreshTitleList();
      return;
    }
    const honorsPaneBtn = event.target.closest("[data-honors-pane]");
    if (honorsPaneBtn) {
      honorsPane = honorsPaneBtn.dataset.honorsPane || "titles";
      renderProfileWorkspace();
      return;
    }
    const ribbonFilterBtn = event.target.closest("[data-ribbon-filter]");
    if (ribbonFilterBtn) {
      ribbonFilter = ribbonFilterBtn.dataset.ribbonFilter || "all";
      refreshRibbonCollection();
      return;
    }
    const ribbonDetailBtn = event.target.closest("[data-ribbon-detail]");
    if (ribbonDetailBtn) {
      const row = (badges || []).find((item) => item.id === ribbonDetailBtn.dataset.ribbonDetail);
      if (row) {
        const ribbon = window.playRibbonForBadge?.(row) || row;
        window.playOpenRibbonDetail?.({
          badge: row,
          ribbon,
          ribbonId: ribbon?.id || row.id,
          name: ribbon?.name || row.name,
          locked: !row.unlocked
        });
      }
      return;
    }
    const sprite = event.target.closest("[data-sprite]");
    if (sprite) {
      if (sprite.dataset.locked === "1") {
        if (els.status) els.status.textContent = "Premium Avatar — available in the Mart.";
        return;
      }
      draft.sprite = sprite.dataset.sprite;
      updateAvatarSelection();
      return;
    }
    const teamBgFilterBtn = event.target.closest("[data-team-bg-filter]");
    if (teamBgFilterBtn) {
      teamBgFilter = teamBgFilterBtn.dataset.teamBgFilter || "all";
      const modalBody = document.getElementById("team-bg-modal-body");
      if (modalBody) modalBody.innerHTML = renderTeamBgModalBody();
      else if (profileTab === "team") renderProfileWorkspace();
      return;
    }
    const teamBgBrowse = event.target.closest("[data-team-bg-browse]");
    if (teamBgBrowse) {
      openTeamBgModal();
      return;
    }
    const teamBgCycle = event.target.closest("[data-team-bg-cycle]");
    if (teamBgCycle) {
      cycleTeamBg(Number(teamBgCycle.dataset.teamBgCycle || 0));
      return;
    }
    const cardBgFilterBtn = event.target.closest("[data-card-bg-filter]");
    if (cardBgFilterBtn) {
      cardBgFilter = cardBgFilterBtn.dataset.cardBgFilter || "all";
      if (profileTab === "card-style") renderProfileWorkspace();
      return;
    }
    const teamBgBtn = event.target.closest("[data-team-bg]");
    if (teamBgBtn) {
      const row = teamBgRows().find((item) => item.asset === teamBgBtn.dataset.teamBg);
      if (!row?.unlocked) {
        if (els.status) els.status.textContent = `${row?.name || "This background"} is locked. ${row?.howTo || ""}`.trim();
        return;
      }
      draft.teamBg = row.asset;
      updateTeamBgSelection();
      return;
    }
    const cosmetic = event.target.closest("[data-cosmetic]");
    if (cosmetic) {
      const row = backgroundRows().find((item) => item.id === cosmetic.dataset.cosmetic)
        || cosmetics.find((item) => item.id === cosmetic.dataset.cosmetic && item.kind === "background")
        || (cosmetic.dataset.bgAsset ? { kind: "background", asset: cosmetic.dataset.bgAsset, unlocked: true, name: cosmetic.dataset.bgAsset } : null);
      if (!row?.unlocked) {
        if (els.status) els.status.textContent = `${row?.name || "This look"} is locked. ${row?.howTo || ""}`.trim();
        return;
      }
      if (row.kind === "background") draft.bg = row.asset;
      updateCardStyleSelection();
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
      updateTitleSelection();
      return;
    }
    const badgeBtn = event.target.closest("[data-badge]");
    if (badgeBtn) {
      const row = badges.find((item) => item.id === badgeBtn.dataset.badge);
      if (!row?.unlocked) {
        if (els.status) els.status.textContent = `${row?.name || "This Ribbon"} is locked. ${row ? ribbonStreamHint(row) : ""}`.trim();
        return;
      }
      const next = new Set(draft.badgeIds || []);
      if (next.has(row.id)) next.delete(row.id);
      else {
        if (next.size >= (window.PLAY_FEATURED_RIBBON_MAX || 5)) {
          if (els.status) els.status.textContent = "Pick up to five Ribbons to show on your Trainer ID.";
          return;
        }
        next.add(row.id);
      }
      draft.badgeIds = Array.from(next);
      updateTitleSelection();
    }
  });

  els.workspace?.addEventListener("input", (event) => {
    if (event.target.id === "avatar-search") {
      avatarQuery = event.target.value || "";
      refreshAvatarBrowser();
      return;
    }
    if (event.target.id === "title-search") {
      titleQuery = event.target.value || "";
      refreshTitleList();
      return;
    }
    if (event.target.id === "ribbon-search") {
      ribbonQuery = event.target.value || "";
      refreshRibbonCollection();
    }
  });

  els.workspace?.addEventListener("change", (event) => {
    if (event.target.id === "showcase-fav") {
      const [dex, variant] = String(event.target.value || "").split(":");
      draft.favoriteDex = dex ? Number(dex) : null;
      draft.favoriteVariant = variant || "normal";
    } else if (event.target.id === "showcase-shiny") {
      draft.shinyCatchId = event.target.value || "";
    } else {
      return;
    }
    // Legacy Featured Achievement field remains in draft for save compatibility only.
    markDirtyFlag();
    const box = els.workspace.querySelector(".scc-showcase-preview");
    if (box) box.innerHTML = window.playRenderTrainerShowcaseHtml(previewCard());
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
        window.playToast({ kind: "success", title: "Display name saved", body: "Other Trainers will see your new name." });
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

  function revertTrainerId() {
    if (!savedCard || saveBusy) return;
    card = { ...savedCard };
    snapshotDraft(savedCard, { force: true });
    renderProfileWorkspace();
    markDirtyFlag();
    flashEditStatus("Reverted to your saved Trainer ID.");
  }


  function softRefreshAvatarAfterSave(galleryTop) {
    const stage = els.workspace?.querySelector(".scc-stage-body");
    const stageImg = stage?.querySelector("img.scc-stage-sprite");
    const currentId = draft?.sprite || card?.trainerSprite || "";
    if (stageImg && stageImg.dataset.avatarId === currentId) {
      // Keep the already-stable stage image; only refresh labels.
      const look = window.playTrainerLook?.(currentId);
      const name = stage.querySelector(".scc-stage-name");
      if (name) name.textContent = look?.trainer?.name || "Trainer";
    } else if (stage) {
      stage.innerHTML = avatarStageHtml();
    }
    const box = document.getElementById("avatar-results");
    if (box) {
      // Update selection classes without rebuilding tile DOM / re-decoding thumbs.
      box.querySelectorAll(".scc-avatar-card[data-sprite]").forEach((btn) => {
        const equipped = btn.dataset.sprite === currentId;
        btn.classList.toggle("is-equipped", equipped);
        btn.classList.toggle("is-owned", !equipped);
        btn.setAttribute("aria-pressed", equipped ? "true" : "false");
        btn.setAttribute("aria-label", `${btn.querySelector(".scc-avatar-name")?.textContent || "Avatar"}${equipped ? ", equipped" : ""}`);
        const badge = btn.querySelector(".scc-avatar-equipped");
        if (badge) {
          badge.textContent = equipped ? "EQUIPPED" : "\u00a0";
          if (equipped) badge.removeAttribute("aria-hidden");
          else badge.setAttribute("aria-hidden", "true");
        }
      });
      if (galleryTop != null) box.scrollTop = galleryTop;
    }
    const count = document.getElementById("avatar-count");
    if (count) count.textContent = avatarCountText();
  }

  async function saveTrainerId() {
    if (!draft || saveBusy) return false;
    setSaveBusy(true);
    flashEditStatus("Saving Trainer ID…");
    try {
      const saved = await window.playCall("play_save_trainer_id", {
        p_sprite: draft.sprite,
        p_bg: draft.bg,
        p_team_bg: window.playNormalizeTeamBgId?.(draft.teamBg) || draft.teamBg || "pallet-town",
        p_title: draft.titleId || "",
        p_badges: draft.badgeIds || [],
        p_favorite_dex: draft.favoriteDex ?? null,
        p_favorite_variant: draft.favoriteVariant || "normal",
        p_showcase: {
          shinyCatchId: draft.shinyCatchId || "",
          achievementId: draft.achievementId || ""
        }
      });
      const savedSprite = draft.sprite;
      const galleryEl = document.getElementById("avatar-results");
      const galleryTop = galleryEl ? galleryEl.scrollTop : null;
      const keepAvatarDom = profileTab === "avatar"
        && savedSprite
        && String(saved.trainer?.trainerSprite || savedSprite) === String(savedSprite);
      card = saved.trainer;
      savedCard = { ...card };
      cosmetics = saved.cosmetics || cosmetics;
      snapshotDraft(card, { force: true });
      setSaveBusy(false);
      if (keepAvatarDom) {
        softRefreshAvatarAfterSave(galleryTop);
      } else {
        renderProfileWorkspace();
      }
      markDirtyFlag();
      flashEditStatus(saved.message || "Trainer ID saved.");
      return true;
    } catch (error) {
      setSaveBusy(false);
      flashEditStatus(friendlySaveError(error, SAVE_FAIL));
      return false;
    }
  }

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

  supabase.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise(event, session)) return;
    if (event === "SIGNED_IN") pendingOauth = pendingOauth || "done";
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") load();
  });
  load();
})();
