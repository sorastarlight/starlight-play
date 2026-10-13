/* Workspace 2.0 prototype presenters. Preview-only. Reuses Gate 2A contracts. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./admin-next-trainers.js"));
  } else {
    root.PLAY_ADMIN_NEXT_TRAINERS_V2 = factory(root.PLAY_ADMIN_NEXT_TRAINERS);
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  const DASH = "—";
  const PANES = core && core.PANES || Object.freeze(["overview", "pokemon", "inventory", "progression", "connections"]);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function text(value) {
    if (value == null || value === "") return DASH;
    return String(value);
  }

  function available(value) {
    if (value == null || value === "") return "unavailable";
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

  function emptyNote(message) {
    return `<p class="admin-next-ws2-empty">${esc(message)}</p>`;
  }

  function fact(label, value) {
    return `<div class="admin-next-ws2-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function kv(rows) {
    return `<ul class="admin-next-ws2-kv">${rows.map((row) => (
      `<li><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></li>`
    )).join("")}</ul>`;
  }

  function section(title, body) {
    return `<section class="admin-next-ws2-section"><h4>${esc(title)}</h4>${body}</section>`;
  }

  function avatar(src, size) {
    return src
      ? `<img class="admin-next-ws2-avatar" src="${esc(src)}" alt="" width="${size}" height="${size}">`
      : `<span class="admin-next-ws2-avatar is-empty" aria-hidden="true"></span>`;
  }

  function chip(label, tone) {
    return `<span class="admin-next-ws2-chip${tone ? ` is-${tone}` : ""}">${esc(label)}</span>`;
  }

  function paneButtons(active) {
    const labels = { overview: "Overview", pokemon: "Pokémon", inventory: "Inventory", progression: "Progression", connections: "Connections" };
    return PANES.map((pane) => (
      `<button type="button" role="tab" data-trainer-pane="${pane}" aria-selected="${pane === active ? "true" : "false"}">${labels[pane]}</button>`
    )).join("");
  }

  function unlockItems(items, filter) {
    const rows = Array.isArray(items) ? items : [];
    if (filter === "unlocked") return rows.filter((item) => item.on);
    if (filter === "locked") return rows.filter((item) => !item.on);
    return rows;
  }

  function unlockList(items, empty) {
    if (!items.length) return emptyNote(empty);
    return `<ul class="admin-next-ws2-unlocks">${items.map((item) => (
      `<li class="${item.on ? "is-on" : "is-off"}" data-state="${item.on ? "unlocked" : "locked"}"><strong>${esc(item.name)}</strong><span>${esc(item.meta)}</span></li>`
    )).join("")}</ul>`;
  }

  function filterBar(active) {
    return `<div class="admin-next-ws2-filters" role="group" aria-label="Unlock filter">
      <button type="button" data-ws2-filter="all" aria-pressed="${active === "all" ? "true" : "false"}">All</button>
      <button type="button" data-ws2-filter="unlocked" aria-pressed="${active === "unlocked" ? "true" : "false"}">Unlocked</button>
      <button type="button" data-ws2-filter="locked" aria-pressed="${active === "locked" ? "true" : "false"}">Locked</button>
    </div>`;
  }

  function directoryHtml(view) {
    if (!view.users.length) {
      return emptyNote(view.empty ? "No trainers match." : view.status);
    }
    const rows = view.users.map((row) => {
      const on = row.selected ? " is-on" : "";
      return `<div role="row"><button type="button" class="admin-next-ws2-row${on}" data-open-trainer="${esc(row.id)}">
        <span class="admin-next-ws2-id">
          ${avatar(row.avatar, 32)}
          <span>
            <strong>${esc(row.displayName)}</strong>
            <span class="admin-next-ws2-handle">@${esc(row.login)}</span>
          </span>
        </span>
        <span class="admin-next-ws2-cell" data-label="Role">${esc(row.role)}</span>
        <span class="admin-next-ws2-cell" data-label="Pass">${row.pass ? "Pass" : DASH}</span>
        <span class="admin-next-ws2-cell" data-label="Pokémon">${esc(row.caught)}</span>
        <span class="admin-next-ws2-cell" data-label="Last seen">${esc(row.lastSeenAt)}</span>
      </button></div>`;
    }).join("");
    return `<div class="admin-next-ws2-table" role="table" aria-label="Trainer directory">
      <div class="admin-next-ws2-thead" role="row">
        <span role="columnheader">Trainer</span>
        <span role="columnheader">Role</span>
        <span role="columnheader">Pass</span>
        <span role="columnheader">Pokémon</span>
        <span role="columnheader">Last seen</span>
      </div>
      <div role="rowgroup">${rows}</div>
    </div>`;
  }

  function summaryFacts(view) {
    const user = view.user || {};
    const trainer = view.identity && view.identity.trainer || {};
    const bag = view.bag || {};
    return [
      fact("Level", trainer.level == null || trainer.level === "" ? "unavailable" : String(trainer.level)),
      fact("Caught", trainer.caught == null || trainer.caught === "" ? "unavailable" : String(trainer.caught)),
      fact("Coins", bag.coins == null || bag.coins === "" ? "unavailable" : String(bag.coins)),
      fact("Starlight Pass", user.pass === true ? "Yes" : user.pass === false ? "No" : "unavailable")
    ].join("");
  }

  function profileChrome(view, body) {
    const user = view.user || {};
    const trainer = view.identity && view.identity.trainer || {};
    const chips = [
      chip(user.role || "player", "role"),
      user.pass ? chip("Starlight Pass", "pass") : chip("No Pass", "muted"),
      chip(`Last seen ${formatStamp(user.lastSeenAt)}`, "muted")
    ].join("");
    return `<nav class="admin-next-ws2-crumb">
      <button type="button" data-ws2-back>All trainers</button>
    </nav>
    <header class="admin-next-ws2-head">
      ${avatar(user.avatar, 48)}
      <div>
        <h3>${esc(user.displayName || trainer.displayName || "Trainer")}</h3>
        <p class="admin-next-ws2-handle">@${esc(user.login || trainer.login || DASH)}</p>
        <p class="admin-next-ws2-chips">${chips}</p>
      </div>
    </header>
    <div class="admin-next-ws2-facts">${summaryFacts(view)}</div>
    <div class="admin-next-ws2-tabs" role="tablist" aria-label="Trainer workspace">${paneButtons(view.pane)}</div>
    <div class="admin-next-ws2-body">${body}</div>`;
  }

  function profileHtml(view) {
    if (view.loading) return `<p class="admin-next-ws2-empty">Loading trainer…</p>`;
    if (view.denied) return `<p class="admin-next-ws2-empty">Trainer inspect is restricted to staff.</p>`;
    if (view.error) return `<p class="admin-next-ws2-empty">${esc(view.error)}</p>`;
    const user = view.user || {};
    const trainer = view.identity && view.identity.trainer || {};
    const health = view.health || {};
    const bag = view.bag || {};
    const filter = view.unlockFilter === "unlocked" || view.unlockFilter === "locked" ? view.unlockFilter : "all";

    if (view.pane === "pokemon") {
      const mons = Array.isArray(view.mons) ? view.mons : [];
      const rows = mons.map((mon) => `<article class="admin-next-ws2-mon">
        <strong>${esc(mon.name || DASH)}</strong>
        <span>${esc(mon.dex != null ? `#${mon.dex}` : DASH)} · ${esc(mon.variant || DASH)} · ${esc(mon.gender || DASH)}</span>
        <span>Lv. ${esc(mon.level != null ? mon.level : DASH)} · ${esc(mon.ball || DASH)}</span>
        <span>Caught ${esc(formatStamp(mon.caughtAt))}</span>
      </article>`).join("");
      return profileChrome(view, `
        <p class="admin-next-ws2-note">Newest 40 live Pokémon only. Full PC boxes, favorites, and locked flags are not in this RPC.</p>
        ${mons.length ? `<div class="admin-next-ws2-mon-list">${rows}</div>` : emptyNote("No live Pokémon in this snapshot.")}
      `);
    }

    if (view.pane === "inventory") {
      const candy = (Array.isArray(view.candy) ? view.candy : []).filter((row) => Number(row && row.qty || 0) > 0);
      return profileChrome(view, `
        <div class="admin-next-ws2-facts">
          ${fact("Coins", available(bag.coins))}
          ${fact("Bag used / capacity", `${available(bag.used)} / ${available(bag.capacity)}`)}
        </div>
        ${section("Poké Balls", kv([
          { label: "Poké Balls", value: available(bag.pokeball) },
          { label: "Great Balls", value: available(bag.greatball) },
          { label: "Ultra Balls", value: available(bag.ultraball) },
          { label: "Master Ball (display)", value: available(bag.masterball) }
        ]))}
        ${section("Consumables", kv([
          { label: "Berries", value: available(bag.berry) },
          { label: "Bait", value: available(bag.bait) },
          { label: "Lure", value: available(bag.lure) }
        ]))}
        ${section("Family candy", candy.length
          ? kv(candy.map((row) => ({ label: row.name || row.familyId, value: `${row.qty} · family ${row.familyId}` })))
          : emptyNote("No family candy quantities in this snapshot."))}
        <p class="admin-next-ws2-note">Bits entitlements are not available from these RPCs.</p>
      `);
    }

    if (view.pane === "progression") {
      const identity = view.identity || {};
      const titles = (identity.titles || []).map((row) => ({
        name: row.name || row.id,
        meta: row.unlocked ? `Unlocked ${formatStamp(row.unlockedAt)}` : "Locked",
        on: Boolean(row.unlocked)
      }));
      const badges = (identity.badges || []).map((row) => ({
        name: row.name || row.id,
        meta: row.unlocked ? `Unlocked ${formatStamp(row.unlockedAt)}` : "Locked",
        on: Boolean(row.unlocked)
      }));
      const cosmetics = (identity.cosmetics || []).map((row) => ({
        name: row.name || row.id,
        meta: `${row.kind || "cosmetic"} · ${row.unlocked ? "Unlocked" : "Locked"}${row.equipped ? " · Equipped" : ""}`,
        on: Boolean(row.unlocked)
      }));
      const packs = (identity.ownedAvatarPacks || []).map((id) => ({ name: id, meta: "Owned", on: true }));
      const catalog = Array.isArray(identity.catalog) ? identity.catalog : [];
      const extras = catalog.filter((row) => !(identity.cosmetics || []).some((item) => item && item.id === row.id));
      const catalogBody = !catalog.length
        ? emptyNote("No catalog items returned.")
        : extras.length
          ? unlockList(extras.map((row) => ({
            name: row.name || row.id,
            meta: `${row.kind || "cosmetic"} · Locked`,
            on: false
          })), "No catalog extras.")
          : emptyNote(`Enabled catalog matches the unlock list above (${catalog.length} items).`);
      return profileChrome(view, `
        <div class="admin-next-ws2-facts">
          ${fact("Level", available(trainer.level))}
          ${fact("XP", available(trainer.xp))}
          ${fact("Title", available(trainer.title))}
          ${fact("Caught / seen", `${available(trainer.caught)} / ${available(trainer.seen)}`)}
        </div>
        ${filterBar(filter)}
        ${section("Titles", unlockList(unlockItems(titles, filter), "No titles in this filter."))}
        ${section("Badges", unlockList(unlockItems(badges, filter), "No badges in this filter."))}
        ${section("Cosmetics", unlockList(unlockItems(cosmetics, filter), "No cosmetics in this filter."))}
        ${section("Owned avatar packs", unlockList(unlockItems(packs, filter), "No owned avatar packs in this filter."))}
        ${section("Available catalog", catalogBody)}
        <p class="admin-next-ws2-note">Full achievement list, Oak research, and evolution history are not in these RPCs.</p>
      `);
    }

    if (view.pane === "connections") {
      const connections = Array.isArray(view.connections) ? view.connections : [];
      const rows = connections.map((row) => {
        const flags = [
          row.primary ? "Primary" : null,
          row.confirmed ? "Confirmed" : "Unconfirmed",
          row.gameplayEnabled ? "Gameplay on" : "Gameplay off",
          row.loginEnabled ? "Login on" : "Login off"
        ].filter(Boolean).join(" · ");
        return `<article class="admin-next-ws2-link">
          <p class="admin-next-ws2-kicker">${esc(row.type || "twitch")}</p>
          <p><strong>${esc(row.displayName || row.login || DASH)}</strong> · @${esc(row.login || DASH)}</p>
          <p>${esc(flags)}</p>
          <p>Status ${esc(text(row.status))} · Linked ${esc(formatStamp(row.linkedAt))}${row.twitchUserId ? ` · id ${esc(row.twitchUserId)}` : ""}</p>
        </article>`;
      }).join("");
      return profileChrome(view, `
        <div class="admin-next-ws2-facts">
          ${fact("Primary Twitch", health.primaryTwitch ? String(health.primaryTwitch) : "unavailable")}
          ${fact("Linked rows", available(health.linkedTwitch))}
          ${fact("Gameplay Twitch", available(health.gameplayTwitch))}
          ${fact("Bot / utility", available(health.botTwitch))}
        </div>
        ${rows || emptyNote("No Twitch connections returned.")}
        <p class="admin-next-ws2-note">Link and unlink controls stay on the current hub. This preview is informational only.</p>
      `);
    }

    const username = user.username && String(user.username).toLowerCase() !== String(user.login || "").toLowerCase()
      ? [{ label: "Username", value: text(user.username) }]
      : [];
    return profileChrome(view, `
      <div class="admin-next-ws2-split">
        ${section("Account", kv([
          { label: "Display name", value: text(user.displayName) },
          { label: "Login", value: text(user.login) },
          ...username,
          { label: "Account id", value: text(user.id) },
          { label: "Role", value: text(user.role || "player") },
          { label: "Password login", value: yn(user.emailLogin) }
        ]))}
        ${section("Registration", kv([
          { label: "Registered", value: formatStamp(user.createdAt) },
          { label: "Last seen", value: formatStamp(user.lastSeenAt) }
        ]))}
        ${section("Connection summary", kv([
          { label: "Primary Twitch", value: health.primaryTwitch ? String(health.primaryTwitch) : "unavailable" },
          { label: "Linked Twitch rows", value: available(health.linkedTwitch) }
        ]))}
      </div>
      <p class="admin-next-ws2-note">Email address is not returned. Password login is a boolean only. Recent activity journal is not available.</p>
    `);
  }

  return {
    PAGE: core && core.PAGE || 50,
    directoryHtml,
    profileHtml
  };
}));
