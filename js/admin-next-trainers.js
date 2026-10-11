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
      return { status: "Trainer search is restricted to staff.", users: [], total: 0, offset: 0, query, selectedId, canPrev: false, canNext: false, empty: false, failed: true };
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
        empty: false,
        failed: true
      };
    }
    const users = mapUsers(data && data.users, selectedId);
    const total = Number(data && data.total || 0);
    const offset = Number(data && data.offset || 0);
    const shown = users.length;
    let status = "No trainers match.";
    if (total > 0) {
      status = `Showing ${offset + 1}–${offset + shown} of ${total}. Server page size is ${PAGE}.`;
    }
    return {
      status,
      users,
      total,
      offset,
      query,
      selectedId,
      canPrev: offset > 0,
      canNext: offset + shown < total,
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
        ? `<img class="admin-next-trainer-avatar" src="${esc(row.avatar)}" alt="" width="36" height="36">`
        : `<span class="admin-next-trainer-avatar is-empty" aria-hidden="true"></span>`;
      return `<div role="listitem"><button type="button" class="staff-user staff-user-pick admin-next-trainer-row${on}" data-open-trainer="${esc(row.id)}">
        ${avatar}
        <span>
          <strong>${esc(row.displayName)}</strong>
          <span class="muted">@${esc(row.login)} · ${esc(row.role)}${row.pass ? " · Pass" : ""} · ${esc(row.coins)} coins · ${esc(row.caught)} Pokémon · Last seen ${esc(row.lastSeenAt)}</span>
        </span>
      </button></div>`;
    }).join("");
  }

  function dl(rows) {
    return `<dl class="admin-next-ops-meta admin-next-trainer-dl">${rows.map((row) => (
      `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`
    )).join("")}</dl>`;
  }

  function paneButtons(active) {
    return PANES.map((pane) => {
      const labels = { overview: "Overview", pokemon: "Pokémon", inventory: "Inventory", progression: "Progression", connections: "Connections" };
      const selected = pane === active ? "true" : "false";
      return `<button type="button" role="tab" data-trainer-pane="${pane}" aria-selected="${selected}">${labels[pane]}</button>`;
    }).join("");
  }

  function itemGrid(items, empty) {
    if (!items.length) return `<p class="muted">${esc(empty)}</p>`;
    return `<ul class="admin-next-trainer-pills">${items.map((item) => (
      `<li class="${item.on ? "is-on" : "is-off"}"><strong>${esc(item.name)}</strong><span>${esc(item.meta)}</span></li>`
    )).join("")}</ul>`;
  }

  function profileHtml(view) {
    if (view.loading) return `<p class="muted">Loading trainer…</p>`;
    if (view.denied) return `<p class="muted">Trainer inspect is restricted to staff.</p>`;
    if (view.error) return `<p class="muted">${esc(view.error)}</p>`;
    const user = view.user || {};
    const trainer = view.identity && view.identity.trainer || {};
    const health = view.health || {};
    const bag = view.bag || {};
    const header = `<header class="admin-next-trainer-head">
      <p class="eyebrow">Selected trainer</p>
      <h3>${esc(user.displayName || trainer.displayName || "Trainer")}</h3>
      <p class="muted">@${esc(user.login || trainer.login || DASH)} · ${esc(user.role || "player")}${user.pass ? " · Starlight Pass" : ""}</p>
    </header>
    <div class="admin-next-trainer-subnav" role="tablist" aria-label="Trainer dossier">${paneButtons(view.pane)}</div>`;

    if (view.pane === "pokemon") {
      const mons = Array.isArray(view.mons) ? view.mons : [];
      const rows = mons.map((mon) => `<tr>
        <td>${esc(mon.name || DASH)}</td>
        <td>${esc(mon.dex != null ? `#${mon.dex}` : DASH)}</td>
        <td>${esc(mon.variant || DASH)}</td>
        <td>${esc(mon.gender || DASH)}</td>
        <td>${esc(mon.ball || DASH)}</td>
        <td>${esc(mon.level != null ? mon.level : DASH)}</td>
        <td>${esc(formatStamp(mon.caughtAt))}</td>
      </tr>`).join("");
      return `${header}
        <p class="admin-next-unavailable">Partial snapshot: newest 40 live Pokémon. Full PC boxes, favorites, and locked flags are not in this RPC.</p>
        ${mons.length ? `<div class="admin-next-trainer-table-wrap"><table class="admin-next-trainer-table"><thead><tr><th>Name</th><th>Dex</th><th>Variant</th><th>Gender</th><th>Ball</th><th>Level</th><th>Caught</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">No live Pokémon in this snapshot.</p>`}`;
    }

    if (view.pane === "inventory") {
      const candy = (Array.isArray(view.candy) ? view.candy : []).filter((row) => Number(row && row.qty || 0) > 0);
      return `${header}
        ${dl([
          { label: "Coins", value: text(bag.coins) },
          { label: "Poké Balls", value: text(bag.pokeball) },
          { label: "Great Balls", value: text(bag.greatball) },
          { label: "Ultra Balls", value: text(bag.ultraball) },
          { label: "Master Ball (display)", value: text(bag.masterball) },
          { label: "Berries", value: text(bag.berry) },
          { label: "Bait", value: text(bag.bait) },
          { label: "Lure", value: text(bag.lure) },
          { label: "Bag used / capacity", value: `${text(bag.used)} / ${text(bag.capacity)}` }
        ])}
        <h4>Family candy with quantity</h4>
        ${itemGrid(candy.map((row) => ({ name: row.name || row.familyId, meta: `${row.qty} · family ${row.familyId}`, on: true })), "No family candy quantities in this snapshot.")}
        <p class="admin-next-unavailable">Bits entitlements are not available from these RPCs.</p>`;
    }

    if (view.pane === "progression") {
      const identity = view.identity || presentIdentity(null);
      const cosmetics = identity.cosmetics || [];
      const titles = identity.titles || [];
      const badges = identity.badges || [];
      const packs = identity.ownedAvatarPacks || [];
      return `${header}
        ${dl([
          { label: "Level", value: text(trainer.level) },
          { label: "XP", value: text(trainer.xp) },
          { label: "Title", value: text(trainer.title) },
          { label: "Ranking visible", value: yn(identity.rankingVisible) },
          { label: "Ranking eligible", value: yn(identity.rankingEligible) },
          { label: "Kanto caught", value: text(trainer.kanto && trainer.kanto.caught) },
          { label: "Caught / seen", value: `${text(trainer.caught)} / ${text(trainer.seen)}` },
          { label: "Shiny caught", value: text(trainer.shinyCaught) }
        ])}
        <h4>Titles</h4>
        ${itemGrid(titles.map((row) => ({ name: row.name || row.id, meta: row.unlocked ? `Unlocked ${formatStamp(row.unlockedAt)}` : "Locked", on: Boolean(row.unlocked) })), "No titles returned.")}
        <h4>Badges</h4>
        ${itemGrid(badges.map((row) => ({ name: row.name || row.id, meta: row.unlocked ? `Unlocked ${formatStamp(row.unlockedAt)}` : "Locked", on: Boolean(row.unlocked) })), "No badges returned.")}
        <h4>Cosmetics</h4>
        ${itemGrid(cosmetics.map((row) => ({ name: row.name || row.id, meta: `${row.kind || "cosmetic"} · ${row.unlocked ? "Unlocked" : "Locked"}${row.equipped ? " · Equipped" : ""}`, on: Boolean(row.unlocked) })), "No cosmetics returned.")}
        <h4>Owned avatar packs</h4>
        ${itemGrid(packs.map((id) => ({ name: id, meta: "Owned", on: true })), "No owned avatar packs.")}
        <h4>Available catalog</h4>
        ${itemGrid((identity.catalog || []).map((row) => {
          const unlocked = cosmetics.some((item) => item && item.id === row.id && item.unlocked);
          return {
            name: row.name || row.id,
            meta: `${row.kind || "cosmetic"} · ${unlocked ? "Unlocked" : "Locked"}`,
            on: unlocked
          };
        }), "No catalog items returned.")}
        <p class="admin-next-unavailable">Full achievement list, Oak research, and evolution history are not in these RPCs.</p>`;
    }

    if (view.pane === "connections") {
      const connections = Array.isArray(view.connections) ? view.connections : [];
      const cards = connections.map((row) => `<article class="admin-next-ops-card hub-metric">
        <p class="eyebrow">${esc(row.type || "twitch")}</p>
        <p class="admin-next-ops-value">${esc(row.displayName || row.login || DASH)}</p>
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
      return `${header}
        ${dl([
          { label: "Primary Twitch", value: text(health.primaryTwitch) },
          { label: "Linked Twitch rows", value: text(health.linkedTwitch) },
          { label: "Gameplay Twitch", value: text(health.gameplayTwitch) },
          { label: "Bot / utility", value: text(health.botTwitch) }
        ])}
        <div class="admin-next-metrics">${cards || `<p class="muted">No Twitch connections returned.</p>`}</div>
        <p class="admin-next-unavailable">Link and unlink controls stay on the current hub. This preview is informational only.</p>`;
    }

    return `${header}
      ${dl([
        { label: "Display name", value: text(user.displayName) },
        { label: "Login", value: text(user.login) },
        { label: "Username", value: text(user.username) },
        { label: "Account id", value: text(user.id) },
        { label: "Role", value: text(user.role || "player") },
        { label: "Starlight Pass", value: yn(user.pass) },
        { label: "Password login present", value: yn(user.emailLogin) },
        { label: "Registered", value: formatStamp(user.createdAt) },
        { label: "Last seen", value: formatStamp(user.lastSeenAt) },
        { label: "Level", value: text(trainer.level) },
        { label: "Title", value: text(trainer.title) },
        { label: "Coins", value: text(trainer.coins != null ? trainer.coins : bag.coins) },
        { label: "Ranking visible", value: yn(view.identity && view.identity.rankingVisible) },
        { label: "Ranking eligible", value: yn(view.identity && view.identity.rankingEligible) },
        { label: "Primary Twitch", value: text(health.primaryTwitch) }
      ])}
      <p class="admin-next-unavailable">Email address is not returned. Password login is a boolean only. Recent activity journal is not available.</p>`;
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
