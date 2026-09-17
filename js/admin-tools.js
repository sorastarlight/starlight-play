(() => {
  if (new URLSearchParams(location.search).has("embed")) {
    document.documentElement.classList.add("hub-embed");
    document.body.classList.add("hub-embed");
  }
  const hubHosted = document.body?.dataset?.page === "admin";
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    channel: document.getElementById("channel"),
    client: document.getElementById("twitch-client"),
    clientSecret: document.getElementById("twitch-secret"),
    broadcaster: document.getElementById("twitch-broadcaster"),
    save: document.getElementById("save-channel"),
    saveStatus: document.getElementById("save-status"),
    githubToken: document.getElementById("github-token"),
    githubStatus: document.getElementById("github-status"),
    packLogin: document.getElementById("pack-login"),
    packSku: document.getElementById("pack-sku"),
    packStatus: document.getElementById("pack-status"),
    bitsAutoStatus: document.getElementById("bits-auto-status"),
    bitsConnect: document.getElementById("bits-connect"),
    passLogin: document.getElementById("pass-login"),
    passCount: document.getElementById("pass-count"),
    passStatus: document.getElementById("pass-admin-status"),
    issueToken: document.getElementById("issue-token"),
    bridgeToken: document.getElementById("bridge-token"),
    bridgeTokenStatus: document.getElementById("bridge-token-status"),
    userQ: document.getElementById("user-q"),
    userList: document.getElementById("user-list"),
    userStatus: document.getElementById("user-status"),
    userListStatus: document.getElementById("user-list-status"),
    userModal: document.getElementById("user-modal"),
    userDetail: document.getElementById("user-detail"),
    openUsers: document.getElementById("open-users"),
    userPrev: document.getElementById("user-prev"),
    userNext: document.getElementById("user-next"),
    userSearch: document.getElementById("user-search")
  };
  let overview = null;
  let userOffset = 0;
  let userTotal = 0;
  let selectedUserId = "";
  let accountState = null;
  let identityState = null;
  let bitsSticky = "";

  function setSignedOut() {
    els.staff.hidden = true;
    els.gate.hidden = false;
    els.gate.textContent = "Sign in to open staff tools.";
    window.playSetAccountNav(null);
  }

  if (!hubHosted) window.playBindAccountNav({ onSignOut: setSignedOut });
  window.playApplyStaffOverview = applyOverview;
  window.playStaffLoadUsers = loadUsers;

  function applyOverview(data, fillForms) {
    overview = data;
    if (fillForms) {
      if (els.channel) els.channel.value = data.channel || "";
      if (els.client) els.client.value = data.twitchClientId || "";
      if (els.broadcaster) els.broadcaster.value = data.twitchBroadcasterId || "";
      if (els.clientSecret && !els.clientSecret.value) {
        els.clientSecret.placeholder = data.twitchClientSecretSaved
          ? "Saved on Play. Paste again only to replace it."
          : "Paste once. Play will not show it again.";
      }
      if (els.githubToken && !els.githubToken.value) {
        els.githubToken.placeholder = data.githubTokenSaved
          ? "Saved on Play. Paste again only to replace it."
          : "Paste once. Play will not show it again.";
      }
      if (els.githubStatus && data.githubTokenSaved && !els.githubStatus.textContent) {
        els.githubStatus.textContent = "GitHub token is saved.";
      }
    }
    if (els.passCount) {
      els.passCount.textContent = `${data.passes || 0} Starlight Pass${data.passes === 1 ? "" : "es"} active.`;
    }
    renderBitsStatus(data.bitsAuto || {});
    fillBitsPacks(data);
    document.querySelectorAll(".owner-only").forEach((node) => {
      node.hidden = data.canManageSecrets === false;
    });
  }

  function fillBitsPacks(data) {
    if (!els.packSku || els.packSku.dataset.filled === "1") return;
    const bits = data?.bitsPacks || data?.catalog?.bits;
    if (!Array.isArray(bits) || !bits.length) return;
    const current = els.packSku.value;
    els.packSku.innerHTML = bits.map((row) => (
      `<option value="${window.playEscapeAttr(row.sku)}">${window.playEscapeAttr(row.name)}${row.bits ? ` (${row.bits} Bits)` : ""}</option>`
    )).join("");
    if (current) els.packSku.value = current;
    els.packSku.dataset.filled = "1";
  }

  const GRANT_CATS = [
    ["wallet", "Wallet"],
    ["balls", "Poké Balls"],
    ["berries", "Berries"],
    ["community", "Honey & Radar"],
    ["evolution", "Evolution items"],
    ["candy", "Evolution Candy"]
  ];
  const GRANT_EVO = [
    ["firestone", "Fire Stone"],
    ["waterstone", "Water Stone"],
    ["thunderstone", "Thunder Stone"],
    ["leafstone", "Leaf Stone"],
    ["moonstone", "Moon Stone"],
    ["linkingcord", "Linking Cord"],
    ["rarecandy", "Rare Candy"],
    ["choice_stone", "Evolution Stone (player chooses)"]
  ];
  let grantMonDex = 0;
  let grantMonGender = "";
  let grantMonShiny = false;
  let grantMonBall = "pokeball";
  let grantItemKey = "";
  let grantItemQty = 1;
  let grantOpenCats = new Set();

  function candyKey(familyId) {
    return `candy-${Number(familyId) || 0}`;
  }

  function candyFamilyId(key) {
    const match = String(key || "").match(/^candy-(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  function candyCatalog(list) {
    return (list || accountState?.candy || []).map((row) => {
      const familyId = Number(row.familyId || row.baseDex || 0);
      const baseDex = Number(row.baseDex || familyId || 0);
      const name = `${row.name || window.playSpeciesName(baseDex)} Candy`;
      return {
        key: candyKey(familyId || baseDex),
        name,
        cat: "candy",
        familyId,
        baseDex,
        members: Array.isArray(row.members) ? row.members : [],
        art: window.playSpriteUrl(baseDex, "normal"),
        qty: Number(row.qty || 0)
      };
    });
  }

  function grantItemName(key) {
    if (key === "bag_bonus") return "Bag space";
    if (key === "choice_stone") return "Evolution Stone (player chooses)";
    const candy = candyCatalog().find((row) => row.key === key);
    if (candy) return candy.name;
    const ball = window.playBallInfo?.(key);
    if (ball?.name) return ball.name;
    const berry = (window.PLAY_BERRIES || []).find((row) => row.key === key);
    if (berry?.name) return berry.name;
    const label = window.playItemLabel?.(key);
    return label && label !== key ? label : key;
  }

  function grantItemCatalog(bag, candy) {
    const rows = [];
    const seen = new Set();
    const add = (key, cat, extra) => {
      if (!key || seen.has(key) || key === "capacity" || key === "used" || key === "lureArmed" || key === "lureUntil") return;
      seen.add(key);
      rows.push({ key, name: extra?.name || grantItemName(key), cat, ...extra });
    };
    add("coins", "wallet");
    add("bag_bonus", "wallet");
    (window.PLAY_BALLS || []).forEach((row) => add(row.key, "balls"));
    (window.PLAY_BERRIES || []).forEach((row) => add(row.key, "berries"));
    add("bait", "community");
    add("lure", "community");
    GRANT_EVO.forEach(([key]) => add(key, "evolution"));
    candyCatalog(candy).forEach((row) => add(row.key, "candy", row));
    Object.keys(bag || {}).forEach((key) => add(key, "special"));
    return rows;
  }

  function parseItemQuery(text, catalog) {
    const list = catalog || grantItemCatalog(accountState?.bag, accountState?.candy);
    const raw = String(text || "").trim().toLowerCase().replace(/\s+candy\s*$/i, "").trim();
    if (!raw) return [];
    const exact = [];
    const prefix = [];
    const includes = [];
    const species = window.playParseSpeciesQuery(raw)[0] || window.playParseSpeciesQuery(text)[0];
    list.forEach((row) => {
      const name = String(row.name || "").toLowerCase();
      const key = String(row.key || "").toLowerCase();
      const members = (row.members || []).map((bit) => String(bit || "").toLowerCase());
      const hay = [name, key, ...members];
      if (species && (Number(row.baseDex) === species.dex || members.includes(species.name.toLowerCase()))) {
        exact.push(row);
        return;
      }
      if (hay.some((bit) => bit === raw)) exact.push(row);
      else if (hay.some((bit) => bit.startsWith(raw))) prefix.push(row);
      else if (hay.some((bit) => bit.includes(raw))) includes.push(row);
    });
    const seen = new Set();
    return exact.concat(prefix, includes).filter((row) => {
      if (seen.has(row.key || row.dex)) return false;
      seen.add(row.key || row.dex);
      return true;
    });
  }

  function grantRowArt(row) {
    if (row?.art) return row.art;
    if (row?.dex && !row?.key) return window.playSpriteUrl(row.dex, "normal");
    if (candyFamilyId(row?.key) && row?.baseDex) return window.playSpriteUrl(row.baseDex, "normal");
    return window.playItemSprite(row?.key);
  }

  function suggestRowsHtml(rows, dataKey) {
    return rows.slice(0, 12).map((row) => {
      const value = row.key || row.dex;
      const label = row.dex && !row.key
        ? `${window.playPadDex(row.dex)} ${row.name}`
        : row.name;
      const qty = row.qty == null ? "" : ` · ${row.qty}`;
      return `<li><button type="button" data-${dataKey}="${window.playEscapeAttr(String(value))}">
        <img src="${window.playEscapeAttr(grantRowArt(row))}" alt="">
        <span>${window.playEscapeAttr(label)}${qty}</span>
      </button></li>`;
    }).join("");
  }

  function fillSuggest(list, rows, dataKey) {
    if (!list) return;
    if (!rows.length) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }
    list.hidden = false;
    list.innerHTML = suggestRowsHtml(rows, dataKey);
  }

  function selectedGrantGender(dex) {
    const options = window.playGenderOptions(dex);
    if (options.length === 1) return options[0];
    if (grantMonGender && options.includes(grantMonGender)) return grantMonGender;
    return dex ? (options[0] || "") : grantMonGender;
  }

  function renderGrantMonPreview() {
    const dex = grantMonDex;
    const genderEl = document.getElementById("grant-gender-row");
    const shinyEl = document.getElementById("grant-shiny-row");
    const preview = document.getElementById("grant-mon-preview");
    const copy = document.getElementById("grant-mon-copy");
    if (!genderEl || !shinyEl) return;
    const options = window.playGenderOptions(dex);
    if (!dex) {
      genderEl.innerHTML = ["Male", "Female"].map((name) => (
        `<button type="button" data-grant-gender="${name}" aria-pressed="${grantMonGender === name}">${name}</button>`
      )).join("");
    } else if (options.length === 1) {
      grantMonGender = options[0];
      genderEl.innerHTML = `<span class="chip">${options[0]}</span>`;
    } else {
      if (!options.includes(grantMonGender)) grantMonGender = options[0];
      genderEl.innerHTML = options.map((name) => (
        `<button type="button" data-grant-gender="${name}" aria-pressed="${grantMonGender === name}">${name}</button>`
      )).join("");
    }
    shinyEl.innerHTML = `<button type="button" data-grant-shiny="1" aria-pressed="${grantMonShiny}">Shiny</button>`;
    const gender = selectedGrantGender(dex);
    const variant = window.playSpriteVariant(dex, gender, grantMonShiny);
    if (!dex) {
      if (copy) {
        copy.textContent = grantMonShiny || grantMonGender
          ? `${grantMonGender || "Any gender"}${grantMonShiny ? " · Shiny" : ""}`
          : "Pick a species to preview.";
      }
      if (preview) preview.removeAttribute("src");
      return;
    }
    if (preview) {
      delete preview.dataset.playSpriteDone;
      delete preview.dataset.playSpriteLock;
      preview.src = window.playSpriteUrl(dex, variant);
      preview.alt = `${window.playSpeciesName(dex)} ${gender}${grantMonShiny ? " Shiny" : ""}`;
    }
    if (copy) copy.textContent = `${window.playSpeciesName(dex)} · ${gender}${grantMonShiny ? " · Shiny" : ""}`;
  }

  function renderGrantItemPreview(bag) {
    const preview = document.getElementById("grant-item-preview");
    const copy = document.getElementById("grant-item-copy");
    if (!preview || !copy) return;
    const key = grantItemKey;
    const row = grantItemCatalog(bag || accountState?.bag, accountState?.candy).find((item) => item.key === key);
    if (!key) {
      preview.removeAttribute("src");
      copy.textContent = "Pick an item to preview.";
      return;
    }
    preview.src = grantRowArt(row || { key });
    preview.alt = grantItemName(key);
    const qty = row?.qty != null ? Number(row.qty) : Number((bag || accountState?.bag || {})[key] || 0);
    copy.textContent = `${grantItemName(key)} · they have ${qty}`;
    if (key === "masterball") {
      const real = Number((accountState?.bagSource?.ballsMasterball) ?? qty);
      const overlay = Number(accountState?.bagSource?.itemsMasterball || 0);
      copy.textContent = `REAL Master Balls: ${real} (inventories.balls.masterball)${overlay ? ` · leftover items overlay ${overlay}` : ""}`;
    }
  }

  function pickGrantSpecies(dex) {
    grantMonDex = Number(dex) || 0;
    const input = document.getElementById("grant-dex");
    const list = document.getElementById("grant-dex-suggest");
    if (input && grantMonDex) {
      input.value = `${window.playPadDex(grantMonDex)} ${window.playSpeciesName(grantMonDex)}`;
    }
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    renderGrantMonPreview();
  }

  function pickGrantItem(key) {
    grantItemKey = key || "";
    const input = document.getElementById("grant-item-pick");
    const list = document.getElementById("grant-item-suggest");
    if (input && grantItemKey) input.value = grantItemName(grantItemKey);
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    renderGrantItemPreview();
    els.userDetail?.querySelectorAll("[data-grant-item]").forEach((node) => {
      node.classList.toggle("is-on", node.dataset.grantItem === grantItemKey);
    });
  }

  function pickGrantBall(key) {
    grantMonBall = key || "pokeball";
    const input = document.getElementById("grant-ball-pick");
    const list = document.getElementById("grant-ball-suggest");
    if (input) input.value = grantItemName(grantMonBall);
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
  }

  function openUserModal() {
    if (!els.userModal) return;
    if (typeof els.userModal.showModal === "function") els.userModal.showModal();
    else els.userModal.setAttribute("open", "");
    loadUsers();
  }

  async function loadUsers() {
    if (!els.userList) return;
    const status = els.userListStatus || els.userStatus;
    if (status) status.textContent = "Loading…";
    try {
      const data = await window.playCall("admin_list_users", {
        p_query: els.userQ?.value || "",
        p_offset: userOffset
      });
      const users = data?.users || [];
      userTotal = Number(data?.total || 0);
      userOffset = Number(data?.offset || userOffset || 0);
      if (els.userStatus) els.userStatus.textContent = `${userTotal} trainer${userTotal === 1 ? "" : "s"}`;
      if (status) {
        status.textContent = userTotal
          ? `Showing ${userOffset + 1}–${Math.min(userOffset + users.length, userTotal)} of ${userTotal}`
          : "No trainers match.";
      }
      if (els.userPrev) els.userPrev.disabled = userOffset < 1;
      if (els.userNext) els.userNext.disabled = userOffset + users.length >= userTotal;
      els.userList.innerHTML = users.map((row) => {
        const name = window.playEscapeAttr(row.displayName || row.login || "Trainer");
        const login = window.playEscapeAttr(row.login || "");
        const on = row.id === selectedUserId ? " is-on" : "";
        return `<button type="button" class="staff-user staff-user-pick${on}" data-open-user="${row.id}">
          <div>
            <strong>${name}</strong>
            <p class="muted">@${login} · ${row.role || "player"}${row.pass ? " · Pass" : ""} · ${row.coins || 0} coins · ${row.caught || 0} Pokémon</p>
          </div>
        </button>`;
      }).join("") || `<p class="muted">No trainers match.</p>`;
      if (selectedUserId) await loadAccount(selectedUserId);
    } catch (error) {
      if (status) status.textContent = window.playRpcError(error);
      if (els.userStatus) els.userStatus.textContent = window.playRpcError(error);
    }
  }

  async function loadAccount(userId) {
    if (!els.userDetail || !userId) return;
    selectedUserId = userId;
    els.userDetail.innerHTML = `<p class="muted">Loading account…</p>`;
    try {
      const data = await window.playCall("admin_user_account", { p_user: userId });
      try {
        identityState = await window.playCall("admin_identity_inspect", { p_user: userId });
        data.identity = identityState;
      } catch (_) {
        identityState = null;
      }
      renderAccount(data);
    } catch (error) {
      els.userDetail.innerHTML = `<p class="muted">${window.playEscapeAttr(window.playRpcError(error))}</p>`;
    }
  }

  function renderAccount(data) {
    accountState = data;
    const user = data?.user || {};
    const bag = data?.bag || {};
    const mons = data?.mons || [];
    const actor = data?.staffRole || overview?.staffRole || "moderator";
    const canEdit = Boolean(data?.canEdit);
    const role = user.role || "player";
    const name = window.playEscapeAttr(user.displayName || user.login || "Trainer");
    const login = window.playEscapeAttr(user.login || "");
    const roleBtns = [];
    if (canEdit && role !== "owner") {
      if (actor === "owner" && role !== "admin") {
        roleBtns.push(`<button type="button" data-user="${user.id}" data-role="admin">Admin</button>`);
      }
      if (role !== "moderator") {
        roleBtns.push(`<button type="button" data-user="${user.id}" data-role="moderator">Moderator</button>`);
      }
      if (role !== "player") {
        roleBtns.push(`<button type="button" class="secondary" data-user="${user.id}" data-role="player">Player</button>`);
      }
    }
    const catalog = grantItemCatalog(bag, data?.candy);
    const catMenus = GRANT_CATS.map(([id, label]) => {
      const items = catalog.filter((row) => row.cat === id).slice().sort((a, b) => {
        if (id === "candy") return (Number(b.qty || 0) > 0) - (Number(a.qty || 0) > 0) || a.name.localeCompare(b.name);
        return 0;
      });
      if (!items.length) return "";
      const chips = items.map((row) => {
        const qty = row.qty != null ? Number(row.qty) : Number(bag[row.key] || 0);
        const on = grantItemKey === row.key ? " is-on" : "";
        return `<button type="button" class="gift-pick${on}" data-grant-item="${window.playEscapeAttr(row.key)}">
          <img src="${window.playEscapeAttr(grantRowArt(row))}" alt="">
          <strong>${window.playEscapeAttr(row.name)}</strong>
          <span>×${qty}</span>
        </button>`;
      }).join("");
      return `<details class="user-grant-cat hub-specific"${grantOpenCats.has(id) ? " open" : ""} data-grant-cat="${id}">
        <summary>${window.playEscapeAttr(label)}</summary>
        <div class="gift-pick-grid">${chips}</div>
      </details>`;
    }).join("");
    const extraCats = catalog.filter((row) => row.cat === "special");
    const extraMenu = extraCats.length
      ? `<details class="user-grant-cat hub-specific"${grantOpenCats.has("special") ? " open" : ""} data-grant-cat="special">
          <summary>Other items</summary>
          <div class="gift-pick-grid">${extraCats.map((row) => {
            const qty = Number(bag[row.key] || 0);
            const on = grantItemKey === row.key ? " is-on" : "";
            return `<button type="button" class="gift-pick${on}" data-grant-item="${window.playEscapeAttr(row.key)}">
              <img src="${window.playEscapeAttr(window.playItemSprite(row.key))}" alt="">
              <strong>${window.playEscapeAttr(row.name)}</strong>
              <span>×${qty}</span>
            </button>`;
          }).join("")}</div>
        </details>`
      : "";
    const dexValue = grantMonDex
      ? `${window.playPadDex(grantMonDex)} ${window.playSpeciesName(grantMonDex)}`
      : "";
    const itemValue = grantItemKey ? grantItemName(grantItemKey) : "";
    const ballValue = grantItemName(grantMonBall || "pokeball");
    const monRows = mons.map((mon) => {
      const title = window.playEscapeAttr(mon.nickname || mon.name || "Pokémon");
      return `<article class="user-mon">
        <img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="">
        <div>
          <strong>${title}</strong>
          <p class="muted">No. ${window.playPadDex(mon.dex)} · Lv. ${mon.level || 1} · ${window.playEscapeAttr(mon.gender || "")} · ${window.playEscapeAttr(window.playItemLabel(mon.ball))}</p>
        </div>
        ${canEdit ? `<button type="button" class="danger secondary" data-remove-mon="${mon.id}">Remove</button>` : ""}
      </article>`;
    }).join("") || `<p class="muted">No Pokémon in this PC.</p>`;
    const health = data?.health || {};
    const connections = data?.connections || [];
    const ownerTools = Boolean(data?.ownerTools);
    const connCards = connections.map((row) => {
      const tid = window.playEscapeAttr(row.twitchUserId || "");
      const actions = [];
      if (canEdit && !row.primary && row.confirmed !== false) {
        actions.push(`<button type="button" data-admin-primary="${tid}">Make Primary</button>`);
      }
      if (canEdit && row.type !== "bot" && row.type !== "utility") {
        actions.push(`<button type="button" class="secondary" data-admin-bot="${tid}">Mark bot / utility</button>`);
      }
      if (canEdit) {
        actions.push(`<button type="button" class="secondary" data-admin-gameplay="${tid}" data-on="${row.gameplayEnabled ? "0" : "1"}">${row.gameplayEnabled ? "Disable gameplay" : "Enable gameplay"}</button>`);
      }
      if (ownerTools && !row.primary) {
        actions.push(`<button type="button" class="danger secondary" data-admin-disconnect="${tid}">Disconnect</button>`);
      }
      return `<article class="connection-card${row.primary ? " is-primary" : ""}">
        <div class="connection-head">
          ${row.avatar ? `<img class="avatar" src="${window.playEscapeAttr(row.avatar)}" alt="">` : `<span class="avatar-fallback">${window.playEscapeAttr((row.displayName || "T").slice(0, 1))}</span>`}
          <div>
            <strong>${window.playEscapeAttr(row.displayName || row.login || "Twitch")}</strong>
            <p class="muted">@${window.playEscapeAttr(row.login || "")} · ID ${tid}</p>
          </div>
        </div>
        <div class="conn-badges">
          <span class="conn-badge${row.primary ? " conn-primary" : ""}">${row.primary ? "Primary" : "Linked"}</span>
          <span class="conn-badge">${row.type === "bot" || row.type === "utility" ? "Bot / Utility" : "Player"}</span>
          <span class="conn-badge">${row.gameplayEnabled ? "Gameplay enabled" : "Gameplay disabled"}</span>
          <span class="conn-badge">${row.loginEnabled ? "Login enabled" : "Login disabled"}</span>
          <span class="conn-badge">${row.status === "connected" ? "Connected" : "Needs reauthorization"}</span>
        </div>
        <div class="links">${actions.join("")}</div>
      </article>`;
    }).join("") || `<p class="muted">No Twitch connections on this Trainer Account.</p>`;
    els.userDetail.innerHTML = `
      <header class="user-account-head">
        ${user.avatar ? `<img class="avatar" src="${window.playEscapeAttr(user.avatar)}" alt="">` : `<span class="avatar-fallback">${name.slice(0, 1)}</span>`}
        <div>
          <h3>${name}</h3>
          <p class="muted">${user.username ? `@${window.playEscapeAttr(user.username)} · ` : ""}@${login} · ${role}${user.pass ? " · Pass" : ""}</p>
          <p class="muted">RPG ID ${window.playEscapeAttr(user.id || "")}</p>
        </div>
      </header>
      <p class="account-health muted">Primary Twitch: ${window.playEscapeAttr(health.primaryTwitch || "none")} · Linked: ${health.linkedTwitch || 0} · Gameplay: ${health.gameplayTwitch || 0} · Bot/utility: ${health.botTwitch || 0}</p>
      ${roleBtns.length ? `<div class="links">${roleBtns.join("")}</div>` : ""}
      <p id="user-edit-status" class="muted" role="status"></p>
      <h4>Account &amp; Connections</h4>
      <p class="muted">Twitch identities belong to this Trainer Account. Changing Primary does not move Pokémon, inventory, or XP.</p>
      <div class="admin-connections">${connCards}</div>
      <h4>Give a Pokémon</h4>
      <p class="muted">Type a name or Dex number. Suggestions fill in as you type, the same way as Start a specific Pokémon on Encounters.</p>
      <label class="field" for="grant-dex">Species
        <input id="grant-dex" type="text" placeholder="ex: Pikachu" value="${window.playEscapeAttr(dexValue)}" autocomplete="off">
      </label>
      <ul id="grant-dex-suggest" class="dex-suggest user-suggest" hidden></ul>
      <p class="muted">Gender is Male, Female, or Genderless. Shiny is its own switch on top of that.</p>
      <div id="grant-gender-row" class="variant-row"></div>
      <div id="grant-shiny-row" class="variant-row shiny-row"></div>
      <div class="form-preview">
        <img id="grant-mon-preview" alt="">
        <p id="grant-mon-copy" class="muted">Pick a species to preview.</p>
      </div>
      <label class="field" for="grant-ball-pick">Ball
        <input id="grant-ball-pick" type="text" placeholder="ex: Premier Ball" value="${window.playEscapeAttr(ballValue)}" autocomplete="off">
      </label>
      <ul id="grant-ball-suggest" class="dex-suggest user-suggest" hidden></ul>
      <div class="links">
        <button type="button" id="grant-mon" ${canEdit ? "" : "disabled"}>Add to PC</button>
      </div>
      <h4>Give items</h4>
      <p class="muted">Type a name to pick Poké Balls, Berries, Honey, Radar, stones, Rare Candy, Evolution Candy, or PokéCoins — same style as the encounter species picker. Browse by kind in the menus below.</p>
      <label class="field" for="grant-item-pick">Item
        <input id="grant-item-pick" type="text" placeholder="ex: Premier Ball, Fire Stone, Eevee Candy" value="${window.playEscapeAttr(itemValue)}" autocomplete="off">
      </label>
      <ul id="grant-item-suggest" class="dex-suggest user-suggest" hidden></ul>
      <div class="form-preview">
        <img id="grant-item-preview" alt="">
        <p id="grant-item-copy" class="muted">Pick an item to preview.</p>
      </div>
      <div class="user-grant-qty">
        <label class="field" for="grant-item-qty">Quantity (±)
          <input id="grant-item-qty" type="number" step="1" value="${Number.isFinite(grantItemQty) && grantItemQty !== 0 ? grantItemQty : 1}">
        </label>
        <button type="button" id="grant-item" ${canEdit ? "" : "disabled"}>Give item</button>
      </div>
      <div class="user-wallet-row">
        <p class="muted">Wallet: ${Number(bag.coins || 0)} PokéCoins · bag space ${Number(bag.capacity || 0)} (${Number(bag.used || 0)} used) · Candy ${(data?.candy || []).reduce((sum, row) => sum + Number(row.qty || 0), 0)}</p>
        <label class="field" for="set-coins-amount">Set exact PokéCoins
          <input id="set-coins-amount" type="number" min="0" step="1" placeholder="${Number(bag.coins || 0)}">
        </label>
        <button type="button" id="set-coins" class="secondary" ${canEdit ? "" : "disabled"}>Set PokéCoins</button>
      </div>
      ${catMenus}${extraMenu}
      <div id="identity-desk" class="identity-desk"></div>
      <h4>PC</h4>
      <div class="user-mon-list">${monRows}</div>`;
    renderGrantMonPreview();
    renderGrantItemPreview(bag);
    renderIdentity(data);
  }

  function renderIdentity(data) {
    const host = document.getElementById("identity-desk");
    if (!host) return;
    const ident = data?.identity || identityState;
    const trainer = ident?.trainer || {};
    const canEdit = Boolean(data?.canEdit ?? accountState?.canEdit);
    const cosmetics = ident?.cosmetics || [];
    const titles = ident?.titles || [];
    const badges = ident?.badges || [];
    const catalog = ident?.catalog || cosmetics;
    const owned = cosmetics.filter((row) => row.unlocked).map((row) => `${row.name} (${row.kind})`).join(", ") || "starter set";
    host.innerHTML = `
      <h4>Trainer identity</h4>
      <p class="muted">Inspect only. Grant and revoke are logged, confirmed, and do not change XP or capture rates.</p>
      <dl class="sim-grid">
        <div><dt>Level</dt><dd>${trainer.level || 1}</dd></div>
        <div><dt>XP</dt><dd>${Number(trainer.xp || 0).toLocaleString()}</dd></div>
        <div><dt>Pokédex</dt><dd>${trainer.kanto?.caught || trainer.species || 0}/151</dd></div>
        <div><dt>Title</dt><dd>${window.playEscapeAttr(trainer.title || "—")}</dd></div>
        <div><dt>Frame</dt><dd>${window.playEscapeAttr(trainer.cardFrame || "plain")}</dd></div>
        <div><dt>Background</dt><dd>${window.playEscapeAttr(trainer.cardBg || "—")}</dd></div>
      </dl>
      <p class="muted">Owned cosmetics: ${window.playEscapeAttr(owned)}</p>
      <p class="muted">Public Rankings: ${ident?.rankingVisible === false ? "hidden" : "listed"}${ident?.rankingEligible ? " · eligible" : " · not eligible"}</p>
      <div class="links">
        <button type="button" id="identity-ranking-hide" class="secondary" ${canEdit ? "" : "disabled"}>Hide from Rankings</button>
        <button type="button" id="identity-ranking-show" class="secondary" ${canEdit ? "" : "disabled"}>List on Rankings</button>
      </div>
      <label class="field" for="identity-reason">Reason
        <input id="identity-reason" type="text" maxlength="120" placeholder="event grant / correction">
      </label>
      <label class="field" for="identity-cosmetic">Cosmetic
        <select id="identity-cosmetic">
          ${(catalog.length ? catalog : cosmetics).map((row) => `<option value="${window.playEscapeAttr(row.id)}">${window.playEscapeAttr(row.name)} · ${window.playEscapeAttr(row.kind)}</option>`).join("")}
        </select>
      </label>
      <div class="links">
        <button type="button" id="identity-grant-cosmetic" ${canEdit ? "" : "disabled"}>Grant cosmetic</button>
        <button type="button" class="danger secondary" id="identity-revoke-cosmetic" ${canEdit ? "" : "disabled"}>Revoke cosmetic</button>
      </div>
      <label class="field" for="identity-title">Title
        <select id="identity-title">
          ${titles.map((row) => `<option value="${window.playEscapeAttr(row.id)}">${window.playEscapeAttr(row.name)}${row.unlocked ? " · owned" : ""}</option>`).join("")}
        </select>
      </label>
      <button type="button" id="identity-grant-title" ${canEdit ? "" : "disabled"}>Grant title</button>
      <label class="field" for="identity-badge">Badge
        <select id="identity-badge">
          ${badges.map((row) => `<option value="${window.playEscapeAttr(row.id)}">${window.playEscapeAttr(row.name)}${row.unlocked ? " · owned" : ""}</option>`).join("")}
        </select>
      </label>
      <button type="button" id="identity-grant-badge" ${canEdit ? "" : "disabled"}>Grant badge</button>
      <p id="identity-status" class="muted" role="status"></p>`;
  }

  function accountStatus(text) {
    const node = document.getElementById("user-edit-status") || els.userStatus;
    if (node) node.textContent = text;
  }

  function renderBitsStatus(bits) {
    if (!els.bitsAutoStatus) return;
    if (bitsSticky) {
      els.bitsAutoStatus.innerHTML = bitsSticky;
      return;
    }
    const info = bits || {};
    if (info.connected) {
      els.bitsAutoStatus.innerHTML = `<span class="status-ok">Auto-credit is on.</span> Power-Ups used while live credit Play bags.`;
    } else if (info.needsAppSecret) {
      els.bitsAutoStatus.innerHTML = `<span class="status-bad">Save the Play Twitch Client Secret under Stream channel first.</span> It is the same secret already used for Play login.`;
    } else if ((info.status || "").includes("pending")) {
      els.bitsAutoStatus.innerHTML = `Twitch is confirming the webhook. Wait a few seconds. Do not click Turn on again yet.`;
    } else if (info.status) {
      els.bitsAutoStatus.innerHTML = `<span class="status-bad">Twitch status: ${info.status}.</span> Click the button to connect again.`;
    } else {
      els.bitsAutoStatus.innerHTML = `<span class="status-bad">Auto-credit is off.</span> Connect once after the Power-Ups exist on Twitch.`;
    }
    if (info.lastDetail && !(info.status || "").includes("pending")) {
      els.bitsAutoStatus.innerHTML += ` Last grant: ${info.lastDetail}`;
    }
    if (info.pending) {
      els.bitsAutoStatus.innerHTML += ` ${info.pending} pack${info.pending === 1 ? "" : "s"} waiting for a Play sign-in.`;
    }
  }

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return { message: body.message, needsScope: Boolean(body.needsScope), ok: Boolean(body.ok) };
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) return { message: fallback, needsScope: false, ok: false };
    return { message: error?.message || fallback, needsScope: false, ok: false };
  }

  async function finishBitsConnect(accessToken) {
    if (!accessToken) return { ok: false, needsScope: true, message: "Twitch did not keep a Bits token." };
    if (finishBitsConnect.busy) return { ok: false, needsScope: false, message: "Connecting Bits auto-credit…" };
    finishBitsConnect.busy = true;
    bitsSticky = `<span class="status-ok">Connecting Bits auto-credit…</span>`;
    renderBitsStatus({});
    try {
      const { data, error } = await supabase.functions.invoke("bits-connect", {
        body: { accessToken }
      });
      if (error) {
        const info = await functionMessage(error, "Twitch would not enable Bits auto-credit.");
        bitsSticky = `<span class="status-bad">${info.message}</span>`;
        renderBitsStatus({});
        return info;
      }
      const ok = Boolean(data?.ok);
      bitsSticky = ok
        ? `<span class="status-ok">${data.message || "Bits auto-credit is on."}</span>`
        : `<span class="status-bad">${data?.message || "Twitch would not enable Bits auto-credit."}</span>`;
      renderBitsStatus({});
      if (ok) {
        sessionStorage.removeItem("playBitsConnect");
        bitsSticky = "";
        await refreshOverview(false);
      }
      return { ok, needsScope: Boolean(data?.needsScope), message: data?.message || "" };
    } catch (error) {
      bitsSticky = `<span class="status-bad">${error?.message || "Could not connect Bits auto-credit."}</span>`;
      renderBitsStatus({});
      return { ok: false, needsScope: false, message: error?.message || "Could not connect Bits auto-credit." };
    } finally {
      finishBitsConnect.busy = false;
    }
  }

  async function maybeFinishBits(session) {
    if (sessionStorage.getItem("playBitsConnect") !== "1") return false;
    const token = session?.provider_token;
    if (!token) return false;
    sessionStorage.removeItem("playBitsConnect");
    await finishBitsConnect(token);
    return true;
  }

  async function refreshOverview(fillForms) {
    try {
      const data = await window.playCall("admin_overview");
      applyOverview(data, fillForms);
    } catch (error) {
      const message = window.playRpcError(error, "Could not load staff overview.");
      if (els.saveStatus) els.saveStatus.textContent = message;
    }
  }

  async function loadHub(passedSession) {
    const session = passedSession || (await supabase.auth.getSession()).data.session;
    if (hubHosted) {
      if (session) await maybeFinishBits(session);
      return;
    }
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(isAdmin) });
    if (error || !isAdmin) {
      els.staff.hidden = true;
      els.gate.hidden = false;
      els.gate.textContent = "This page is for moderators and admins. Viewer logins cannot open it.";
      return;
    }
    els.gate.hidden = true;
    els.staff.hidden = false;
    await refreshOverview(true);
    await maybeFinishBits(session);
  }

  async function run(name, args, statusEl) {
    const target = statusEl;
    if (target) target.textContent = "Working…";
    try {
      const data = await window.playCall(name, args);
      if (target) target.textContent = String(data?.message || "Done.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      if (target) target.textContent = window.playRpcError(error);
    }
  }

  els.save?.addEventListener("click", async () => {
    const secret = (els.clientSecret?.value || "").trim();
    await run("admin_save_channel", {
      p_login: els.channel.value.trim().replace(/^@/, ""),
      p_client_id: els.client.value.trim(),
      p_broadcaster_id: els.broadcaster.value.trim()
    }, els.saveStatus);
    if (!secret) return;
    try {
      const saved = await window.playCall("admin_save_twitch_client_secret", { p_secret: secret });
      els.clientSecret.value = "";
      els.saveStatus.textContent = saved?.message || "Play Twitch Client Secret saved.";
      await refreshOverview(false);
    } catch (error) {
      els.saveStatus.textContent = window.playRpcError(error);
    }
  });
  document.getElementById("save-github")?.addEventListener("click", async () => {
    const token = (els.githubToken?.value || "").trim();
    if (!token) {
      els.githubStatus.textContent = "Paste a GitHub token first.";
      return;
    }
    els.githubStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_save_github_token", { p_token: token });
      els.githubToken.value = "";
      els.githubStatus.textContent = saved?.message || "GitHub token saved.";
      await refreshOverview(false);
    } catch (error) {
      els.githubStatus.textContent = window.playRpcError(error);
    }
  });
  document.getElementById("grant-pack")?.addEventListener("click", () => run("admin_grant_bits_pack", {
    p_login: els.packLogin.value,
    p_sku: els.packSku.value
  }, els.packStatus));
  els.bitsConnect?.addEventListener("click", async () => {
    bitsSticky = `<span class="status-ok">Connecting Bits auto-credit…</span>`;
    renderBitsStatus({});
    const { data: sessionData } = await supabase.auth.getSession();
    const existing = sessionData.session?.provider_token;
    if (existing) {
      const result = await finishBitsConnect(existing);
      if (result?.ok) return;
      if (!result?.needsScope) return;
    }
    sessionStorage.setItem("playBitsConnect", "1");
    bitsSticky = `<span class="status-ok">Opening Twitch for Bits permission…</span>`;
    renderBitsStatus({});
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitch",
      options: {
        redirectTo: hubHosted
          ? `${window.location.origin}/admin.html?section=system&view=bits`
          : `${window.location.origin}${window.location.pathname}`,
        scopes: "user:read:email user:read:subscriptions bits:read",
        queryParams: { force_verify: "true" }
      }
    });
    if (error) {
      sessionStorage.removeItem("playBitsConnect");
      bitsSticky = `<span class="status-bad">${error.message || "Twitch sign-in is not enabled yet."}</span>`;
      renderBitsStatus({});
    }
  });
  document.getElementById("grant-pass")?.addEventListener("click", () => run("admin_set_pass", {
    p_login: els.passLogin.value,
    p_active: true
  }, els.passStatus));
  document.getElementById("revoke-pass")?.addEventListener("click", () => run("admin_set_pass", {
    p_login: els.passLogin.value,
    p_active: false
  }, els.passStatus));
  els.openUsers?.addEventListener("click", () => openUserModal());
  document.getElementById("user-search")?.addEventListener("click", () => {
    userOffset = 0;
    loadUsers();
  });
  els.userQ?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    userOffset = 0;
    loadUsers();
  });
  els.userPrev?.addEventListener("click", () => {
    userOffset = Math.max(0, userOffset - 50);
    loadUsers();
  });
  els.userNext?.addEventListener("click", () => {
    userOffset += 50;
    loadUsers();
  });
  els.userModal?.addEventListener("click", (event) => {
    if (event.target === els.userModal) els.userModal.close("cancel");
  });
  els.userList?.addEventListener("click", async (event) => {
    const pick = event.target.closest("[data-open-user]");
    if (pick) {
      await loadAccount(pick.dataset.openUser);
      els.userList.querySelectorAll(".staff-user-pick").forEach((node) => {
        node.classList.toggle("is-on", node.dataset.openUser === selectedUserId);
      });
    }
  });
  els.userDetail?.addEventListener("toggle", (event) => {
    const cat = event.target;
    if (!(cat instanceof HTMLDetailsElement) || !cat.dataset.grantCat) return;
    if (cat.open) grantOpenCats.add(cat.dataset.grantCat);
    else grantOpenCats.delete(cat.dataset.grantCat);
  }, true);
  els.userDetail?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "grant-dex") {
      const matches = window.playParseSpeciesQuery(target.value);
      fillSuggest(document.getElementById("grant-dex-suggest"), matches, "grant-dex");
      grantMonDex = matches.length === 1 ? matches[0].dex : (matches[0]?.dex || 0);
      renderGrantMonPreview();
      return;
    }
    if (target.id === "grant-item-pick") {
      const bag = accountState?.bag || {};
      const matches = parseItemQuery(target.value).map((row) => ({
        ...row,
        qty: row.qty != null ? row.qty : Number(bag[row.key] || 0)
      }));
      fillSuggest(document.getElementById("grant-item-suggest"), matches, "grant-item");
      grantItemKey = matches[0]?.key || "";
      renderGrantItemPreview(bag);
      els.userDetail?.querySelectorAll("[data-grant-item]").forEach((node) => {
        node.classList.toggle("is-on", node.dataset.grantItem === grantItemKey);
      });
      return;
    }
    if (target.id === "grant-ball-pick") {
      const balls = (window.PLAY_BALLS || []).map((row) => ({ key: row.key, name: row.name }));
      const matches = parseItemQuery(target.value, balls);
      fillSuggest(document.getElementById("grant-ball-suggest"), matches, "grant-ball");
      if (matches[0]) grantMonBall = matches[0].key;
      return;
    }
    if (target.id === "grant-item-qty") {
      const n = Number(target.value);
      if (Number.isFinite(n) && n !== 0) grantItemQty = n;
    }
  });
  els.userDetail?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "grant-dex") {
      event.preventDefault();
      const matches = window.playParseSpeciesQuery(target.value);
      if (matches[0]) pickGrantSpecies(matches[0].dex);
      return;
    }
    if (target.id === "grant-item-pick") {
      event.preventDefault();
      const matches = parseItemQuery(target.value);
      if (matches[0]) pickGrantItem(matches[0].key);
      return;
    }
    if (target.id === "grant-ball-pick") {
      event.preventDefault();
      const balls = (window.PLAY_BALLS || []).map((row) => ({ key: row.key, name: row.name }));
      const matches = parseItemQuery(target.value, balls);
      if (matches[0]) pickGrantBall(matches[0].key);
    }
  });
  els.userDetail?.addEventListener("click", async (event) => {
    const roleBtn = event.target.closest("button[data-user][data-role]");
    if (roleBtn) {
      accountStatus("Updating role…");
      try {
        const data = await window.playCall("admin_set_role", {
          p_user: roleBtn.dataset.user,
          p_role: roleBtn.dataset.role
        });
        accountStatus(data?.message || "Role updated.");
        await loadAccount(roleBtn.dataset.user);
        await loadUsers();
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const dexPick = event.target.closest("button[data-grant-dex]");
    if (dexPick) {
      pickGrantSpecies(Number(dexPick.dataset.grantDex));
      return;
    }
    const itemPick = event.target.closest("button[data-grant-item]");
    if (itemPick) {
      pickGrantItem(itemPick.dataset.grantItem);
      return;
    }
    const ballPick = event.target.closest("button[data-grant-ball]");
    if (ballPick) {
      pickGrantBall(ballPick.dataset.grantBall);
      return;
    }
    const genderBtn = event.target.closest("button[data-grant-gender]");
    if (genderBtn) {
      grantMonGender = grantMonGender === genderBtn.dataset.grantGender && !grantMonDex
        ? ""
        : genderBtn.dataset.grantGender;
      renderGrantMonPreview();
      return;
    }
    if (event.target.closest("button[data-grant-shiny]")) {
      grantMonShiny = !grantMonShiny;
      renderGrantMonPreview();
      return;
    }
    if (event.target.closest("#grant-item")) {
      const raw = document.getElementById("grant-item-pick")?.value || "";
      const match = parseItemQuery(raw)[0];
      const key = grantItemKey || match?.key;
      const qtyInput = document.getElementById("grant-item-qty");
      const qty = Number(qtyInput?.value);
      if (!key) {
        accountStatus("Pick an item from the list, or type a name until a match appears.");
        return;
      }
      if (!Number.isFinite(qty) || qty === 0) {
        accountStatus("Enter how many to add or remove.");
        return;
      }
      grantItemKey = key;
      grantItemQty = qty;
      if (key === "masterball") {
        const ok = typeof window.playPresentConfirm === "function"
          ? await window.playPresentConfirm({
            title: "Change real Master Balls?",
            body: "Master Ball quantity lives in inventories.balls.masterball. This is real inventory, not a test overlay.",
            confirmLabel: "Change real Master Balls",
            cancelLabel: "Cancel",
            danger: true
          })
          : window.confirm("This changes REAL Master Ball inventory (balls.masterball), not a test overlay. Continue?");
        if (!ok) {
          accountStatus("Master Ball change cancelled.");
          return;
        }
      }
      const familyId = candyFamilyId(key);
      accountStatus(familyId ? "Updating Candy…" : "Updating bag…");
      try {
        const data = familyId
          ? await window.playCall("admin_grant_candy", {
              p_user: selectedUserId,
              p_dex: grantItemCatalog(accountState?.bag, accountState?.candy).find((row) => row.key === key)?.baseDex || familyId,
              p_amount: qty
            })
          : await window.playCall("admin_grant_bag", {
              p_user: selectedUserId,
              p_grants: { [key]: qty }
            });
        renderAccount(data);
        accountStatus(data?.message || (familyId ? "Candy updated." : "Bag updated."));
        await loadUsers();
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    if (event.target.closest("#set-coins")) {
      const input = document.getElementById("set-coins-amount");
      const coins = Number(input?.value);
      if (input?.value === "" || !Number.isFinite(coins) || coins < 0) {
        accountStatus("Type the new PokéCoin total, then Set PokéCoins.");
        return;
      }
      accountStatus("Setting PokéCoins…");
      try {
        const data = await window.playCall("admin_set_coins", {
          p_user: selectedUserId,
          p_coins: Math.floor(coins)
        });
        renderAccount(data);
        accountStatus(data?.message || "PokéCoins set.");
        await loadUsers();
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    if (event.target.closest("#grant-mon")) {
      const raw = document.getElementById("grant-dex")?.value || "";
      const match = window.playParseSpeciesQuery(raw)[0];
      const dex = grantMonDex || match?.dex || Number(raw);
      if (!dex || dex < 1 || dex > 151) {
        accountStatus("Pick a species from 1 to 151.");
        return;
      }
      const ballRaw = document.getElementById("grant-ball-pick")?.value || "";
      const ballMatch = parseItemQuery(ballRaw, (window.PLAY_BALLS || []).map((row) => ({ key: row.key, name: row.name })))[0];
      const ball = grantMonBall || ballMatch?.key || "pokeball";
      accountStatus("Adding Pokémon…");
      try {
        const data = await window.playCall("admin_grant_pokemon", {
          p_user: selectedUserId,
          p_dex: dex,
          p_name: match?.name || window.playSpeciesName(dex),
          p_gender: selectedGrantGender(dex) || "Unknown",
          p_shiny: Boolean(grantMonShiny),
          p_ball: ball
        });
        grantMonDex = dex;
        grantMonBall = ball;
        renderAccount(data);
        accountStatus(data?.message || "Pokémon added.");
        await loadUsers();
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const adminPrimary = event.target.closest("[data-admin-primary]");
    if (adminPrimary) {
      accountStatus("Updating Primary…");
      try {
        const data = await window.playCall("admin_set_twitch_primary", {
          p_user: selectedUserId,
          p_twitch_user_id: adminPrimary.dataset.adminPrimary
        });
        renderAccount(data);
        accountStatus(data?.message || "Primary updated. RPG progress is unchanged.");
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const adminBot = event.target.closest("[data-admin-bot]");
    if (adminBot) {
      if (!window.confirm("Mark this Twitch identity as bot/utility? It stays linked but will not join gameplay.")) return;
      accountStatus("Updating connection…");
      try {
        const data = await window.playCall("admin_set_twitch_flags", {
          p_user: selectedUserId,
          p_twitch_user_id: adminBot.dataset.adminBot,
          p_connection_type: "bot",
          p_gameplay_enabled: false,
          p_login_enabled: false
        });
        renderAccount(data);
        accountStatus(data?.message || "Marked as bot/utility.");
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const adminGameplay = event.target.closest("[data-admin-gameplay]");
    if (adminGameplay) {
      accountStatus("Updating gameplay…");
      try {
        const data = await window.playCall("admin_set_twitch_flags", {
          p_user: selectedUserId,
          p_twitch_user_id: adminGameplay.dataset.adminGameplay,
          p_gameplay_enabled: adminGameplay.dataset.on === "1"
        });
        renderAccount(data);
        accountStatus(data?.message || "Gameplay updated.");
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const adminDisconnect = event.target.closest("[data-admin-disconnect]");
    if (adminDisconnect) {
      if (!window.confirm("Owner recovery: disconnect this Twitch identity? RPG progress stays on this Trainer.")) return;
      accountStatus("Disconnecting…");
      try {
        const data = await window.playCall("admin_disconnect_twitch", {
          p_user: selectedUserId,
          p_twitch_user_id: adminDisconnect.dataset.adminDisconnect
        });
        renderAccount(data);
        accountStatus(data?.message || "Disconnected.");
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const rankingToggle = event.target.closest("#identity-ranking-hide, #identity-ranking-show");
    if (rankingToggle) {
      const hide = rankingToggle.id === "identity-ranking-hide";
      const reason = document.getElementById("identity-reason")?.value || "";
      const ok = typeof window.playPresentConfirm === "function"
        ? await window.playPresentConfirm({
          title: hide ? "Hide from Rankings?" : "List on Rankings?",
          body: hide
            ? `Hide this Trainer from public Rankings and search? Ownership and collection stay. Reason: ${reason || "(none)"}.`
            : `List this Trainer on public Rankings again? Reason: ${reason || "(none)"}.`,
          confirmLabel: hide ? "Hide" : "List",
          cancelLabel: "Cancel",
          danger: hide
        })
        : window.confirm(hide ? "Hide this Trainer from public Rankings?" : "List this Trainer on public Rankings?");
      if (!ok) {
        accountStatus("Ranking visibility change cancelled.");
        return;
      }
      accountStatus(hide ? "Hiding from Rankings…" : "Listing on Rankings…");
      try {
        identityState = await window.playCall("admin_set_ranking_visible", {
          p_user: selectedUserId,
          p_visible: !hide,
          p_reason: reason
        });
        if (accountState) accountState.identity = identityState;
        renderIdentity(accountState);
        const note = document.getElementById("identity-status");
        if (note) note.textContent = identityState?.message || "Ranking visibility updated.";
        accountStatus(identityState?.message || "Ranking visibility updated.");
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const identityGrant = event.target.closest("#identity-grant-cosmetic, #identity-revoke-cosmetic, #identity-grant-title, #identity-grant-badge");
    if (identityGrant) {
      const reason = document.getElementById("identity-reason")?.value || "";
      const cosmetic = document.getElementById("identity-cosmetic")?.value || "";
      const titleId = document.getElementById("identity-title")?.value || "";
      const badgeId = document.getElementById("identity-badge")?.value || "";
      const isRevoke = identityGrant.id === "identity-revoke-cosmetic";
      const rpc = identityGrant.id === "identity-grant-cosmetic" ? "admin_grant_cosmetic"
        : identityGrant.id === "identity-revoke-cosmetic" ? "admin_revoke_cosmetic"
        : identityGrant.id === "identity-grant-title" ? "admin_grant_title"
        : "admin_grant_badge";
      const args = rpc.includes("cosmetic")
        ? { p_id: cosmetic, p_reason: reason }
        : rpc.includes("title")
          ? { p_title: titleId, p_reason: reason }
          : { p_badge: badgeId, p_reason: reason };
      if (!args.p_id && !args.p_title && !args.p_badge) {
        accountStatus("Pick an identity reward first.");
        return;
      }
      const ok = typeof window.playPresentConfirm === "function"
        ? await window.playPresentConfirm({
          title: isRevoke ? "Revoke cosmetic?" : "Grant identity reward?",
          body: isRevoke
            ? `Revoke ${cosmetic} from this trainer? This is logged. Reason: ${reason || "(none)"}.`
            : `Grant this identity reward to the selected trainer? This is logged. Reason: ${reason || "(none)"}.`,
          confirmLabel: isRevoke ? "Revoke" : "Grant",
          cancelLabel: "Cancel",
          danger: isRevoke
        })
        : window.confirm(isRevoke ? "Revoke this cosmetic? This is logged." : "Grant this identity reward? This is logged.");
      if (!ok) {
        accountStatus("Identity change cancelled.");
        return;
      }
      accountStatus(isRevoke ? "Revoking…" : "Granting…");
      try {
        identityState = await window.playCall(rpc, { p_user: selectedUserId, ...args });
        if (accountState) accountState.identity = identityState;
        renderIdentity(accountState);
        const note = document.getElementById("identity-status");
        if (note) note.textContent = identityState?.message || "Identity updated.";
        accountStatus(identityState?.message || "Identity updated.");
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
      return;
    }
    const remove = event.target.closest("[data-remove-mon]");
    if (remove) {
      accountStatus("Removing Pokémon…");
      try {
        const data = await window.playCall("admin_remove_pokemon", {
          p_user: selectedUserId,
          p_catch_id: remove.dataset.removeMon
        });
        renderAccount(data);
        accountStatus(data?.message || "Pokémon removed.");
        await loadUsers();
      } catch (error) {
        accountStatus(window.playRpcError(error));
      }
    }
  });
  els.issueToken?.addEventListener("click", async () => {
    els.bridgeTokenStatus.textContent = "Creating token…";
    try {
      const data = await window.playCall("admin_issue_bridge_token");
      els.bridgeToken.value = data.token || "";
      els.bridgeTokenStatus.textContent = data.message || "Copy this token into Data/play-bridge.json.";
      els.bridgeToken.select();
      await refreshOverview(false);
    } catch (error) {
      els.bridgeTokenStatus.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (sessionStorage.getItem("playBitsConnect") === "1") {
      if (session?.provider_token) {
        maybeFinishBits(session);
      } else if (event === "SIGNED_IN") {
        bitsSticky = `<span class="status-bad">Twitch signed you back in, but did not keep a Bits token. Click Turn on Bits auto-credit once more and approve Bits permission.</span>`;
        renderBitsStatus({});
      }
    }
    if (window.playAuthNoise(event)) return;
    loadHub(session);
  });
  if (!hubHosted) loadHub();
  else supabase.auth.getSession().then(({ data }) => { if (data.session) maybeFinishBits(data.session); });
})();
