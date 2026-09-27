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
  let avatarFilter = "all";
  let avatarQuery = "";
  let login = "";
  let accountState = null;
  let pcStorage = null;
  let pendingOauth = "";

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

  function markDirtyFlag() {
    if (els.previewDirty) els.previewDirty.hidden = !profileDirty();
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
        <p class="muted">Your display name saves on its own. Avatar, card style, titles, and showcase are saved with <strong>Save Trainer ID</strong> in those tabs.</p>
      </header>
      <div class="scc-identity-modules">
        ${identityStatusHtml()}
        ${twitchModuleHtml()}
      </div>
      <label class="field" for="trainer-display-name">Display name
        <input id="trainer-display-name" type="text" maxlength="24" placeholder="Sora Starlight" autocomplete="nickname" value="${esc(card?.displayName || "")}">
      </label>
      <div class="links id-actions">
        <button id="save-display-name" type="button">Save Display Name</button>
      </div>
      <p id="name-status" class="muted" role="status"></p>
      <p class="muted scc-identity-hint">Looking for your avatar? <a href="#trainer-id/avatar" data-jump-tab="avatar">Open the Avatar tab</a>.</p>`;
  }

  function avatarPreviewHtml() {
    const view = previewCard();
    const look = window.playTrainerLook(view?.trainerSprite);
    const meta = lookMeta(look);
    return `${window.playRenderIdCard(view, { mode: "preview", variant: "avatar" })}
      <p class="scc-contextual-caption"><strong>${esc(look.trainer?.name || "Trainer")}</strong>${meta ? ` · ${esc(meta)}` : ""}</p>`;
  }

  function renderAvatar() {
    const view = previewCard();
    const filters = [
      ["all", "All"], ["kanto", "Kanto"], ["johto", "Johto"], ["hoenn", "Hoenn"], ["sinnoh", "Sinnoh"],
      ["unova", "Unova"], ["kalos", "Kalos"], ["alola", "Alola"], ["galar", "Galar"], ["paldea", "Paldea"],
      ["special", "Special"], ["premium", "Premium"]
    ];
    const groups = avatarGroups();
    return `
      <header class="scc-panel-head">
        <h2>Trainer Avatar</h2>
        <p class="muted">Preview instantly. Premium series stay locked until purchased in the Mart. Press <strong>Save Trainer ID</strong> to keep changes.</p>
      </header>
      <div class="scc-contextual scc-contextual-avatar">${avatarPreviewHtml()}</div>
      <div class="scc-avatar-tools">
        <label class="field">Search
          <input id="avatar-search" type="search" placeholder="Name or outfit" value="${esc(avatarQuery)}">
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
                const rowMeta = [lookRow.outfit, lookRow.gender].filter(Boolean).join(" · ");
                return `<button type="button" class="trainer-opt is-${state}" data-sprite="${esc(lookRow.id)}" data-locked="${lockedPack ? "1" : "0"}" aria-pressed="${equipped}" aria-label="${esc(lookRow.name)} ${state}">
                  <img src="${window.playTrainerSpriteUrl(lookRow.id)}" alt="" width="72" height="72" loading="lazy">
                  <strong>${esc(lookRow.name)}</strong>
                  ${rowMeta ? `<span>${esc(rowMeta)}</span>` : ""}
                  <span class="id-state">${state}</span>
                </button>`;
              }).join("")}
            </div>
          </section>`;
        }).join("") || `<p class="muted">No avatars match this filter.</p>`}
      </div>
      ${trainerIdActions()}`;
  }

  function backgroundRows() {
    const bgs = cosmetics.filter((row) => row.kind === "background");
    if (bgs.length) return bgs;
    return (window.PLAY_CARD_BGS || []).map((row) => ({
      id: `bg-${row.id}`,
      kind: "background",
      asset: row.id,
      name: row.name,
      unlocked: true,
      description: row.group,
      howTo: ""
    }));
  }

  function frameRows() {
    const frames = cosmetics.filter((row) => row.kind === "frame");
    if (frames.length) return frames;
    return [{ id: "frame-plain", kind: "frame", asset: "plain", name: "Plain", unlocked: true, description: "Default frame", howTo: "" }];
  }

  function cardPreviewStageHtml() {
    return `<p class="scc-contextual-kicker">Live Trainer ID preview</p>
      ${window.playRenderIdCard(previewCard(), { mode: "preview", variant: "hero" })}`;
  }

  function renderCardStyle() {
    const view = previewCard();
    return `
      <header class="scc-panel-head">
        <h2>Card Style</h2>
        <p class="muted">Background is the art layer. Frame accents the card. Locked looks stay visible with unlock hints.</p>
      </header>
      <div class="scc-card-preview-stage">${cardPreviewStageHtml()}</div>
      <div class="scc-style-layout">
        <section class="scc-style-catalog">
          <h3>Background</h3>
          <div class="prog-pick-grid scc-style-grid">
            ${backgroundRows().map((row) => {
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
        </section>
        <section class="scc-style-catalog">
          <h3>Frame</h3>
          <div class="prog-pick-grid scc-frame-grid">
            ${frameRows().map((row) => {
              const equipped = row.asset === view.cardFrame;
              const state = pickState(row, equipped);
              return `<button type="button" class="prog-pick is-${state}" data-cosmetic="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
                <strong>${esc(row.name)}</strong>
                <span class="id-state">${state}</span>
                <span>${esc(row.unlocked ? (row.description || "") : (row.howTo || row.description || "Locked"))}</span>
              </button>`;
            }).join("")}
          </div>
        </section>
      </div>
      ${trainerIdActions()}`;
  }

  function renderTitles() {
    const view = previewCard();
    return `
      <header class="scc-panel-head">
        <h2>Title &amp; Badges</h2>
        <p class="muted">Wear one title. Feature up to three badges on your Trainer ID.</p>
      </header>
      <div class="scc-contextual scc-contextual-identity">
        ${window.playRenderIdCard(view, { mode: "preview", variant: "identity" })}
      </div>
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
      <h3>Featured badges <span class="muted" id="badge-count">(${(draft?.badgeIds || []).length}/3)</span></h3>
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
      </div>
      ${trainerIdActions()}`;
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
        <p class="muted">Three meaningful picks for your public Trainer ID. Favorite and Shiny must be Pokémon you own.</p>
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
          <label class="field">Featured Achievement
            <select id="showcase-ach">
              <option value="">None</option>
              ${done.map((row) => `<option value="${esc(row.id)}" ${draft.achievementId === row.id ? "selected" : ""}>${esc(row.name)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="scc-contextual scc-showcase-preview">${window.playRenderTrainerShowcaseHtml(previewCard())}</div>
      </div>
      ${trainerIdActions()}`;
  }

  function renderTeam() {
    return `
      <header class="scc-panel-head">
        <h2>My Team</h2>
        <p class="muted">Pick six Pokémon from your current PC. Team saves immediately when you edit slots — there is nothing extra to press.</p>
      </header>
      <div class="scc-contextual scc-contextual-team">${window.playRenderTrainerPartyHtml(card)}</div>
      <div id="team-slots" class="team-slots"></div>
      <p id="team-status" class="muted" role="status"></p>`;
  }

  function renderProfileWorkspace() {
    if (!els.workspace) return;
    const gallery = els.workspace.querySelector(".scc-avatar-gallery");
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
      const next = els.workspace.querySelector(".scc-avatar-gallery");
      if (next) next.scrollTop = galleryTop;
    }
    markDirtyFlag();
    syncSubnav();
  }

  function repaintPick(btn, state) {
    btn.classList.remove("is-locked", "is-equipped", "is-owned", "is-new");
    btn.classList.add(`is-${state}`);
    const label = btn.querySelector(".id-state");
    if (label) label.textContent = state;
  }

  function updateAvatarSelection() {
    if (!els.workspace) return;
    els.workspace.querySelectorAll("[data-sprite]").forEach((btn) => {
      const equipped = btn.dataset.sprite === draft.sprite;
      const locked = btn.dataset.locked === "1";
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, locked ? "locked" : (equipped ? "equipped" : "owned"));
    });
    const preview = els.workspace.querySelector(".scc-contextual-avatar");
    if (preview) preview.innerHTML = avatarPreviewHtml();
    markDirtyFlag();
  }

  function updateCardStyleSelection() {
    if (!els.workspace) return;
    const view = previewCard();
    const lookup = backgroundRows().concat(frameRows());
    els.workspace.querySelectorAll("[data-cosmetic]").forEach((btn) => {
      const row = lookup.find((item) => item.id === btn.dataset.cosmetic);
      if (!row) return;
      const equipped = row.kind === "background" ? row.asset === view.cardBg : row.asset === view.cardFrame;
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, pickState(row, equipped));
    });
    const stage = els.workspace.querySelector(".scc-card-preview-stage");
    if (stage) stage.innerHTML = cardPreviewStageHtml();
    markDirtyFlag();
  }

  function updateTitleSelection() {
    if (!els.workspace) return;
    els.workspace.querySelectorAll("[data-title]").forEach((btn) => {
      const row = (titles || []).find((item) => item.id === btn.dataset.title);
      if (!row) return;
      const equipped = row.id === (draft?.titleId || "");
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, pickState(row, equipped));
    });
    els.workspace.querySelectorAll("[data-badge]").forEach((btn) => {
      const row = (badges || []).find((item) => item.id === btn.dataset.badge);
      if (!row) return;
      const equipped = (draft?.badgeIds || []).includes(row.id);
      btn.setAttribute("aria-pressed", equipped ? "true" : "false");
      repaintPick(btn, pickState(row, equipped));
    });
    const count = document.getElementById("badge-count");
    if (count) count.textContent = `(${(draft?.badgeIds || []).length}/3)`;
    const preview = els.workspace.querySelector(".scc-contextual-identity");
    if (preview) preview.innerHTML = window.playRenderIdCard(previewCard(), { mode: "preview", variant: "identity" });
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

  function goToCategory(next) {
    if (category === "trainer-id" && next !== "trainer-id" && profileDirty()) {
      if (!window.confirm("You have unsaved Trainer ID changes. Leave without saving?")) return;
    }
    category = next;
    syncNav();
    setHash();
    if (category === "trainer-id") renderProfileWorkspace();
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
    setConnStatus("Saving username…");
    try {
      accountState = await window.playCall("play_set_username", { p_username: els.username?.value || "" });
      renderAccountPanels();
      setConnStatus(accountState?.message || "Username saved.");
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
        savedCard = { ...card };
        snapshotDraft(card);
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
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
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
      snapshotDraft(card);
      await loadProgression();
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
      () => ({ team: card?.team || [], pcStorage }),
      async (ids) => {
        const data = await window.playCall("play_set_team", { p_catch_ids: ids });
        if (data?.trainer) card = data.trainer;
        else if (data?.team && card) card.team = data.team;
        if (savedCard) savedCard = { ...savedCard, team: card.team };
        const teamEl = document.getElementById("team-slots");
        if (teamEl) window.playRenderTeamSlots(teamEl, card?.team, { mine: true });
        const party = els.workspace.querySelector(".scc-contextual-team");
        if (party) party.innerHTML = window.playRenderTrainerPartyHtml(card);
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
      updateAvatarSelection();
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
      updateTitleSelection();
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
    } else if (event.target.id === "showcase-shiny") {
      draft.shinyCatchId = event.target.value || "";
    } else if (event.target.id === "showcase-ach") {
      draft.achievementId = event.target.value || "";
    } else {
      return;
    }
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
    if (!savedCard) return;
    card = { ...savedCard };
    snapshotDraft(savedCard);
    renderProfileWorkspace();
    if (els.status) els.status.textContent = "Reverted to your saved Trainer ID.";
  }

  async function saveTrainerId() {
    if (!draft) return;
    if (els.status) els.status.textContent = "Saving Trainer ID…";
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
      if (els.status) els.status.textContent = saved.message || "Trainer ID saved.";
    } catch (error) {
      if (els.status) els.status.textContent = friendlySaveError(error, SAVE_FAIL);
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

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    if (event === "SIGNED_IN") pendingOauth = pendingOauth || "done";
    load();
  });
  load();
})();
