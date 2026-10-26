/* Preview-only Trainer Management presenters. Observation, never mutation. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PLAY_ADMIN_NEXT_TRAINERS = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PAGE = 50;
  const DASH = "—";
  const EXPECTED_IDENTITY_KEYS = Object.freeze([
    "ok", "trainer", "rankingVisible", "rankingEligible",
    "cosmetics", "ownedAvatarPacks", "titles", "badges", "catalog"
  ]);
  const PANES = Object.freeze(["overview", "pokemon", "inventory", "progression", "connections"]);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function text(value) {
    if (value == null || value === "") return DASH;
    return String(value);
  }

  function formatStamp(value) {
    if (value == null || value === "") return DASH;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return DASH;
    return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC").replace("Z", " UTC");
  }

  function yn(value) {
    if (value == null) return DASH;
    return value ? "Yes" : "No";
  }

  function mapUsers(rows, selectedId) {
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row && row.id || ""),
      displayName: text(row && (row.displayName || row.login) || "Trainer"),
      login: text(row && row.login),
      avatar: row && row.avatar ? String(row.avatar) : "",
      role: text(row && row.role || "player"),
      pass: Boolean(row && row.pass),
      coins: Number(row && row.coins || 0),
      caught: Number(row && row.caught || 0),
      lastSeenAt: formatStamp(row && row.lastSeenAt),
      createdAt: formatStamp(row && row.createdAt),
      selected: String(row && row.id || "") === selectedId
    }));
  }

  function presentDirectory(input) {
    const data = input && input.data;
    const error = input && input.error;
    const query = input && input.query != null ? String(input.query) : "";
    const selectedId = input && input.selectedId || "";
    if (error === "denied") {
      return { status: "Trainer search is restricted to staff.", users: [], total: 0, offset: 0, query, selectedId, canPrev: false, canNext: false, showPager: false, empty: false, failed: true };
    }
    const fallbackUsers = Array.isArray(input && input.users) ? input.users : [];
    const fallbackTotal = Number(input && input.total || 0);
    const fallbackOffset = Number(input && input.offset || 0);
    if (error === "loading") {
      const users = mapUsers(fallbackUsers, selectedId);
      return {
        status: "Loading trainers…",
        users,
        total: fallbackTotal,
        offset: fallbackOffset,
        query,
        selectedId,
        canPrev: fallbackOffset > 0,
        canNext: fallbackOffset + users.length < fallbackTotal,
        showPager: fallbackOffset > 0 || fallbackOffset + users.length < fallbackTotal,
        empty: false,
        failed: false
      };
    }
    if (error) {
      const users = mapUsers(fallbackUsers, selectedId);
      return {
        status: "Could not load trainers.",
        users,
        total: fallbackTotal,
        offset: fallbackOffset,
        query,
        selectedId,
        canPrev: false,
        canNext: false,
        showPager: false,
        empty: false,
        failed: true
      };
    }
    const users = mapUsers(data && data.users, selectedId);
    const total = Number(data && data.total || 0);
    const offset = Number(data && data.offset || 0);
    const shown = users.length;
    const canPrev = offset > 0;
    const canNext = offset + shown < total;
    let status = "No trainers match.";
    if (total === 1) status = "1 trainer.";
    else if (total > 0 && !canPrev && !canNext) status = `${total} trainers.`;
    else if (total > 0) status = `Showing ${offset + 1}–${offset + shown} of ${total}.`;
    return {
      status,
      users,
      total,
      offset,
      query,
      selectedId,
      canPrev,
      canNext,
      showPager: canPrev || canNext,
      empty: total === 0,
      failed: false
    };
  }

  function presentIdentity(data) {
    const payload = data && typeof data === "object" ? data : {};
    const keys = Object.keys(payload);
    const trainer = payload.trainer && typeof payload.trainer === "object" ? payload.trainer : null;
    const cosmetics = Array.isArray(payload.cosmetics) ? payload.cosmetics : [];
    const titles = Array.isArray(payload.titles) ? payload.titles : [];
    const badges = Array.isArray(payload.badges) ? payload.badges : [];
    const catalog = Array.isArray(payload.catalog) ? payload.catalog : [];
    const packs = Array.isArray(payload.ownedAvatarPacks) ? payload.ownedAvatarPacks : [];
    return {
      ok: payload.ok === true,
      keys,
      missingKeys: EXPECTED_IDENTITY_KEYS.filter((key) => !keys.includes(key)),
      trainer,
      rankingVisible: payload.rankingVisible,
      rankingEligible: payload.rankingEligible,
      cosmetics,
      titles,
      badges,
      catalog,
      ownedAvatarPacks: packs
    };
  }

  function directoryHtml(view) {
    if (!view.users.length) {
      return `<p class="muted">${esc(view.empty ? "No trainers match." : view.status)}</p>`;
    }
    return view.users.map((row) => {
      const on = row.selected ? " is-on" : "";
      const avatar = row.avatar
        ? `<img class="admin-next-trainer-avatar" src="${esc(row.avatar)}" alt="" width="44" height="44">`
        : `<span class="admin-next-trainer-avatar is-empty" aria-hidden="true"></span>`;
      return `<div role="listitem"><button type="button" class="staff-user staff-user-pick admin-next-trainer-row${on}" data-open-trainer="${esc(row.id)}">
        ${avatar}
        <span>
          <strong>${esc(row.displayName)}</strong>
          <span class="admin-next-trainer-handle">@${esc(row.login)} · ${esc(row.role)}${row.pass ? " · Pass" : ""}</span>
          <span class="muted admin-next-trainer-stats">${esc(row.coins)} coins · ${esc(row.caught)} Pokémon · Last seen ${esc(row.lastSeenAt)}</span>
        </span>
      </button></div>`;
    }).join("");
  }

  function dl(rows) {
    return `<dl class="admin-next-trainer-dl">${rows.map((row) => (
      `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`
    )).join("")}</dl>`;
  }

  function chip(label, tone) {
    return `<span class="admin-next-chip${tone ? ` is-${tone}` : ""}">${esc(label)}</span>`;
  }

  function card(title, body) {
    return `<article class="admin-next-dossier-card"><h4>${esc(title)}</h4>${body}</article>`;
  }

  function isZeroish(value) {
    return value == null || value === "" || value === DASH || Number(value) === 0;
  }

  function metric(label, value) {
    const empty = isZeroish(value);
    return `<div class="admin-next-stat${empty ? " is-empty" : ""}"><p class="eyebrow">${esc(label)}</p><p>${esc(value)}</p></div>`;
  }

  function stack(inner) {
    return `<div class="admin-next-dossier-stack">${inner}</div>`;
  }

  function emptyNote(message) {
    return `<p class="admin-next-empty">${esc(message)}</p>`;
  }

  function paneButtons(active) {
    return PANES.map((pane) => {
      const labels = { overview: "Overview", pokemon: "Pokémon", inventory: "Inventory", progression: "Progression", connections: "Connections" };
      const selected = pane === active ? "true" : "false";
      return `<button type="button" role="tab" data-trainer-pane="${pane}" aria-selected="${selected}">${labels[pane]}</button>`;
    }).join("");
  }

  function itemGrid(items, empty) {
    if (!items.length) return emptyNote(empty);
    return `<ul class="admin-next-trainer-pills">${items.map((item) => (
      `<li class="${item.on ? "is-on" : "is-off"}" data-state="${item.on ? "unlocked" : "locked"}"><strong>${esc(item.name)}</strong><span>${esc(item.meta)}</span></li>`
    )).join("")}</ul>`;
  }

  function sameText(left, right) {
    return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
  }

  function accountRows(user) {
    const rows = [
      { label: "Display name", value: text(user.displayName) },
      { label: "Login", value: text(user.login) }
    ];
    if (user.username && !sameText(user.username, user.login)) {
      rows.push({ label: "Username", value: text(user.username) });
    }
    rows.push(
      { label: "Account id", value: text(user.id) },
      { label: "Role", value: text(user.role || "player") },
      { label: "Starlight Pass", value: yn(user.pass) },
      { label: "Password sign-in", value: yn(user.emailLogin) }
    );
    return rows;
  }

  function catalogBlock(catalog, cosmetics) {
    const rows = Array.isArray(catalog) ? catalog : [];
    if (!rows.length) return emptyNote("No catalog items returned.");
    const cosmeticIds = new Set((Array.isArray(cosmetics) ? cosmetics : []).map((item) => item && item.id).filter(Boolean));
    const extras = rows.filter((row) => !cosmeticIds.has(row.id));
    if (!extras.length) {
      return emptyNote(`Enabled catalog matches the unlock list above (${rows.length} items).`);
    }
    return itemGrid(rows.map((row) => {
      const unlocked = (cosmetics || []).some((item) => item && item.id === row.id && item.unlocked);
      return {
        name: row.name || row.id,
        meta: `${row.kind || "cosmetic"} · ${unlocked ? "Unlocked" : "Locked"}`,
        on: unlocked
      };
    }), "No catalog items returned.");
  }

  function profileHtml(view) {
    if (view.loading) return `<p class="muted">Loading trainer…</p>`;
    if (view.denied) return `<p class="muted">Trainer inspect is restricted to staff.</p>`;
    if (view.error) return `<p class="muted">${esc(view.error)}</p>`;
    const user = view.user || {};
    const trainer = view.identity && view.identity.trainer || {};
    const health = view.health || {};
    const bag = view.bag || {};
    const chips = [
      chip(user.role || "player", "role"),
      user.pass ? chip("Starlight Pass", "pass") : chip("No Pass", "muted"),
      chip(`Last seen ${formatStamp(user.lastSeenAt)}`, "muted")
    ].join("");
    const header = `<header class="admin-next-trainer-head">
      <p class="eyebrow">Selected trainer</p>
      <h3>${esc(user.displayName || trainer.displayName || "Trainer")}</h3>
      <p class="admin-next-trainer-handle">@${esc(user.login || trainer.login || DASH)}</p>
      <p class="admin-next-chip-row">${chips}</p>
    </header>
    <div class="admin-next-trainer-subnav" role="tablist" aria-label="Trainer dossier">${paneButtons(view.pane)}</div>`;

    if (view.pane === "pokemon") {
      const mons = Array.isArray(view.mons) ? view.mons : [];
      const cards = mons.map((mon) => `<article class="admin-next-mon-card">
        <p class="admin-next-mon-name">${esc(mon.name || DASH)}</p>
        <p class="muted">${esc(mon.dex != null ? `#${mon.dex}` : DASH)} · ${esc(mon.variant || DASH)} · ${esc(mon.gender || DASH)}</p>
        <p>Lv. ${esc(mon.level != null ? mon.level : DASH)} · ${esc(mon.ball || DASH)}</p>
        <p class="muted">Caught ${esc(formatStamp(mon.caughtAt))}</p>
      </article>`).join("");
      return `${header}${stack(`
        <p class="admin-next-unavailable">Newest 40 live Pokémon only. Full PC boxes, favorites, and locked flags are not in this RPC.</p>
        ${mons.length ? `<div class="admin-next-mon-grid">${cards}</div>` : emptyNote("No live Pokémon in this snapshot.")}
      `)}`;
    }

    if (view.pane === "inventory") {
      const candy = (Array.isArray(view.candy) ? view.candy : []).filter((row) => Number(row && row.qty || 0) > 0);
      return `${header}${stack(`
        ${card("Currency and bag", `<div class="admin-next-stat-grid">
          ${metric("Coins", text(bag.coins))}
          ${metric("Bag used / capacity", `${text(bag.used)} / ${text(bag.capacity)}`)}
        </div>`)}
        ${card("Poké Balls", `<div class="admin-next-stat-grid">
          ${metric("Poké Balls", text(bag.pokeball))}
          ${metric("Great Balls", text(bag.greatball))}
          ${metric("Ultra Balls", text(bag.ultraball))}
          ${metric("Master Ball (display)", text(bag.masterball))}
        </div>`)}
        ${card("Consumables", `<div class="admin-next-stat-grid">
          ${metric("Berries", text(bag.berry))}
          ${metric("Bait", text(bag.bait))}
          ${metric("Lure", text(bag.lure))}
        </div>`)}
        ${card("Family candy", itemGrid(candy.map((row) => ({ name: row.name || row.familyId, meta: `${row.qty} · family ${row.familyId}`, on: true })), "No family candy quantities in this snapshot."))}
        <p class="admin-next-unavailable">Bits entitlements are not available from these RPCs.</p>
      `)}`;
    }

    if (view.pane === "progression") {
      const identity = view.identity || presentIdentity(null);
      const cosmetics = (identity.cosmetics || []).filter((row) => row.kind !== "frame");
      const titles = identity.titles || [];
      const badges = identity.badges || [];
      const packs = identity.ownedAvatarPacks || [];
      return `${header}${stack(`
        <div class="admin-next-stat-grid">
          ${metric("Level", text(trainer.level))}
          ${metric("XP", text(trainer.xp))}
          ${metric("Title", text(trainer.title))}
          ${metric("Ranking visible", yn(identity.rankingVisible))}
          ${metric("Ranking eligible", yn(identity.rankingEligible))}
          ${metric("Kanto caught", text(trainer.kanto && trainer.kanto.caught))}
          ${metric("Caught / seen", `${text(trainer.caught)} / ${text(trainer.seen)}`)}
          ${metric("Shiny caught", text(trainer.shinyCaught))}
        </div>
        ${card("Titles", itemGrid(titles.map((row) => ({ name: row.name || row.id, meta: row.unlocked ? `Unlocked ${formatStamp(row.unlockedAt)}` : "Locked", on: Boolean(row.unlocked) })), "No titles returned."))}
        ${card("Badges", itemGrid(badges.map((row) => ({ name: row.name || row.id, meta: row.unlocked ? `Unlocked ${formatStamp(row.unlockedAt)}` : "Locked", on: Boolean(row.unlocked) })), "No badges returned."))}
        ${card("Cosmetics", itemGrid(cosmetics.map((row) => ({ name: row.name || row.id, meta: `${row.kind || "cosmetic"} · ${row.unlocked ? "Unlocked" : "Locked"}${row.equipped ? " · Equipped" : ""}`, on: Boolean(row.unlocked) })), "No cosmetics returned."))}
        ${card("Owned avatar packs", itemGrid(packs.map((id) => ({ name: id, meta: "Owned", on: true })), "No owned avatar packs."))}
        ${card("Available catalog", catalogBlock((identity.catalog || []).filter((row) => row.kind !== "frame"), cosmetics))}
        <p class="admin-next-unavailable">Full achievement list, Oak research, and evolution history are not in these RPCs.</p>
      `)}`;
    }

    if (view.pane === "connections") {
      const connections = Array.isArray(view.connections) ? view.connections : [];
      const cards = connections.map((row) => `<article class="admin-next-link-card">
        <p class="eyebrow">${esc(row.type || "twitch")}</p>
        <p class="admin-next-link-name">${esc(row.displayName || row.login || DASH)}</p>
        ${dl([
          { label: "Login", value: text(row.login) },
          { label: "Twitch user id", value: text(row.twitchUserId) },
          { label: "Primary", value: yn(row.primary) },
          { label: "Confirmed", value: yn(row.confirmed) },
          { label: "Gameplay", value: yn(row.gameplayEnabled) },
          { label: "Login enabled", value: yn(row.loginEnabled) },
          { label: "Status", value: text(row.status) },
          { label: "Linked", value: formatStamp(row.linkedAt) }
        ])}
      </article>`).join("");
      return `${header}${stack(`
        <div class="admin-next-stat-grid">
          ${metric("Primary Twitch", text(health.primaryTwitch))}
          ${metric("Linked Twitch rows", text(health.linkedTwitch))}
          ${metric("Gameplay Twitch", text(health.gameplayTwitch))}
          ${metric("Bot / utility", text(health.botTwitch))}
        </div>
        <div class="admin-next-link-grid">${cards || emptyNote("No Twitch connections returned.")}</div>
        <p class="admin-next-unavailable">Link and unlink controls stay on the current hub. This preview is informational only.</p>
      `)}`;
    }

    return `${header}${stack(`
      <div class="admin-next-dossier-grid">
        ${card("Account", dl(accountRows(user)))}
        ${card("Registration", dl([
          { label: "Registered", value: formatStamp(user.createdAt) },
          { label: "Last seen", value: formatStamp(user.lastSeenAt) }
        ]))}
      </div>
      <p class="admin-next-dossier-jumps">Use Progression for levels and unlocks, Inventory for items and PokéCoins, or Account for Twitch connections and ranking visibility.</p>
    `)}`;
  }

  function presentProfile(input) {
    const error = input && input.error;
    if (error === "loading") return { loading: true, pane: input.pane || "overview" };
    if (error === "denied") return { denied: true, pane: input.pane || "overview" };
    if (error) return { error: typeof error === "string" ? error : "Could not load that trainer.", pane: input.pane || "overview" };
    const account = input && input.account || {};
    const identity = presentIdentity(input && input.identity);
    return {
      loading: false,
      denied: false,
      error: "",
      pane: PANES.includes(input && input.pane) ? input.pane : "overview",
      user: account.user || {},
      health: account.health || {},
      bag: account.bag || {},
      candy: account.candy || [],
      mons: account.mons || [],
      connections: account.connections || [],
      identity
    };
  }

  return {
    PAGE,
    EXPECTED_IDENTITY_KEYS,
    PANES,
    presentDirectory,
    presentIdentity,
    presentProfile,
    directoryHtml,
    profileHtml
  };
}));
