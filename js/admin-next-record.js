/* Trainer record presenters and stored-stat rendering; data comes from gated adapters. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./admin-next-trainers.js"));
  else root.PLAY_ADMIN_NEXT_TRAINERS = factory(root.PLAY_ADMIN_NEXT_TRAINERS);
}(typeof globalThis !== "undefined" ? globalThis : this, function (base) {
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const value = (input) => input == null || input === "" ? "Unavailable" : input;
  const yes = (input) => input == null ? "Unavailable" : input ? "Yes" : "No";
  const rows = (items) => `<dl class="record-facts">${items.map(([key, val]) => `<div><dt>${esc(key)}</dt><dd>${esc(value(val))}</dd></div>`).join("")}</dl>`;
  const note = (text) => `<p class="record-note">${esc(text)}</p>`;
  const button = (label, action, id = "") => `<button type="button" class="record-hit" data-record-action="${action}" data-record-id="${esc(id)}">${esc(label)}<span aria-hidden="true">›</span></button>`;
  const back = (label, action) => `<button type="button" class="secondary record-back" data-record-action="${action}">← ${esc(label)}</button>`;
  const PANES = [...base.PANES, "pass", "gifts", "tickets"];
  const labels = { overview: "Overview", pokemon: "Pokémon", inventory: "Inventory", progression: "Progression", connections: "Connections", pass: "Starlight Pass", gifts: "Gifts", tickets: "Tickets" };
  const stamp = (input) => !input || !Number.isFinite(new Date(input).getTime()) ? "Unavailable" : new Date(input).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  function ballName(input) {
    if (input == null || input === "") return input;
    const raw = String(input);
    const aliases = { poke: "pokeball", great: "greatball", ultra: "ultraball", master: "masterball", premier: "premierball" };
    const key = aliases[raw.toLowerCase()] || raw.toLowerCase();
    const label = globalThis.playItemLabel?.(key);
    const fallback = { pokeball: "Poké Ball", greatball: "Great Ball", ultraball: "Ultra Ball", masterball: "Master Ball", premierball: "Premier Ball" };
    return label && label !== key ? label : fallback[key] || raw;
  }
  const genderName = input => ({ m: "Male", male: "Male", "♂": "Male", f: "Female", female: "Female", "♀": "Female", genderless: "Genderless" }[String(input).toLowerCase()] || input);
  const safeImage = (src) => /^(https?:\/\/|images\/)/i.test(String(src || "")) ? esc(src) : "";
  function avatar(user) {
    const src = safeImage(user.avatar);
    return src ? `<img class="record-avatar" src="${src}" alt="" width="44" height="44">` : `<span class="record-avatar" aria-hidden="true">${esc(String(user.displayName || user.login || "?").charAt(0))}</span>`;
  }
  function directoryHtml(view) {
    if (!view.users.length) return base.directoryHtml(view);
    return `<div class="record-directory-head" aria-hidden="true"><span>Trainer</span><span>Role / Pass</span><span>Pokémon</span><span>Last seen</span></div>` + view.users.map((user) => `<div role="listitem"><button type="button" class="record-directory-row" data-open-trainer="${esc(user.id)}">
      <span class="record-identity">${avatar(user)}<span><strong>${esc(user.displayName)}</strong><span class="admin-next-trainer-handle">@${esc(user.login)}</span></span></span>
      <span><span class="admin-next-chip">${esc(user.role)}</span> <span class="admin-next-chip${user.pass ? " is-pass" : ""}">${user.pass ? "Starlight Pass" : "No Pass"}</span></span>
      <span>${esc(user.caught)} Pokémon</span><span class="record-date">${esc(user.lastSeenAt)}</span>
    </button></div>`).join("");
  }
  function inventoryGroups(view) {
    const bag = view.bag || {};
    const items = (keys) => keys.map(([id, name]) => ({ id, name, qty: bag[id] }));
    return [
      { id: "currency", name: "PokéCoins and Inventory Space", items: items([["coins", "PokéCoins"], ["used", "Inventory used"], ["capacity", "Inventory capacity"]]) },
      { id: "balls", name: "Poké Balls", items: items([["pokeball", "Poké Ball"], ["greatball", "Great Ball"], ["ultraball", "Ultra Ball"], ["masterball", "Master Ball"]]) },
      { id: "consumables", name: "Consumables", items: items([["berry", "Berries"], ["bait", "Honey"], ["lure", "Poké Radar"]]) },
      { id: "candy", name: "Evolution Candy", items: (view.candy || []).filter((row) => Number(row.qty) > 0).map((row) => ({ id: row.familyId, name: row.name || row.familyId, qty: row.qty })) }
    ];
  }
  function unlockGroups(view) {
    const identity = view.identity || {};
    const cosmetics = identity.cosmetics || [];
    const kinds = [...new Set([...(identity.catalog || []), ...cosmetics].map((row) => row.kind).filter((kind) => kind && kind !== "frame"))];
    const status = (row) => ({ ...row, status: row.equipped === true ? "Equipped" : row.unlocked === true ? "Owned" : row.unlocked === false ? "Locked" : "Unavailable" });
    const groups = [
      { id: "titles", name: "Titles", items: (identity.titles || []).map(status) },
      { id: "badges", name: "Ribbons", items: (identity.badges || []).map(status) },
      ...kinds.map((kind) => {
        const catalog = (identity.catalog || []).filter((row) => row.kind === kind);
        const combined = new Map(catalog.map((row) => [row.id, row]));
        cosmetics.filter((row) => row.kind === kind).forEach((row) => combined.set(row.id, { ...combined.get(row.id), ...row }));
        return { id: kind, name: kind === "background" ? "Trainer ID Backgrounds" : kind === "avatar" ? "Avatars" : kind === "team_background" ? "Pokémon team backgrounds" : kind.replace(/_/g, " "), items: [...combined.values()].map(status) };
      }),
      { id: "packs", name: "Avatar Packs", items: (identity.ownedAvatarPacks || []).map((id) => ({ id, name: id, status: "Owned" })) },
      { id: "gym-badges-future", name: "Gym Badges", items: [], unavailable: "Gym Badges are earned by defeating Gym Leaders. Ownership is not available yet." }
    ];
    return groups;
  }
  function manager(view, kind) {
    const state = view.recordState || {};
    const groups = kind === "inventory" ? inventoryGroups(view) : unlockGroups(view);
    const group = groups.find((item) => item.id === state.group);
    const item = group?.items.find((row) => String(row.id) === state.item);
    if (item) return `${back(group.name, "items")}<section class="record-surface"><h4 tabindex="-1" data-record-heading>${esc(item.name || item.id)}</h4>${rows(kind === "inventory" ? [["Quantity", item.qty], ["Item / family id", item.id]] : [["Status", item.status], ["Id", item.id], ["Unlocked at", stamp(item.unlockedAt)]])}${note("Read only. Changes to this account belong in Support & Recovery.")}</section>`;
    if (group) return `${back(kind === "inventory" ? "Inventory categories" : "Unlockable groups", "groups")}<section class="record-surface"><h4 tabindex="-1" data-record-heading>${esc(group.name)}</h4>${group.unavailable ? note(group.unavailable) : group.items.length ? `<div class="record-list">${group.items.map((row) => button(`${row.name || row.id} · ${kind === "inventory" ? value(row.qty) : row.status}`, "item", row.id)).join("")}</div>` : note("No items returned.")}</section>`;
    return `<section class="record-surface"><h4 tabindex="-1" data-record-heading>${kind === "inventory" ? "Inventory" : "Unlockables"}</h4><div class="record-groups">${groups.map((group) => categoryButton(group, kind)).join("")}</div></section>`;
  }
  function categoryButton(group, kind) {
    const icons = { currency: "pokecoin.png", balls: "poke-ball.png", consumables: "inventory-bag.png", candy: "rare-candy.png" };
    const glyphs = { titles: "✦", badges: "✧", background: "▧", team_background: "▦", avatar: "◉", packs: "◈", "gym-badges-future": "◇" };
    const icon = icons[group.id] ? '<img src="images/items/' + icons[group.id] + '" alt="" width="32" height="32">' : esc(glyphs[group.id] || "✦");
    const status = group.unavailable ? "Unavailable" : kind === "inventory" ? (group.items.some(item => item.qty != null) ? (group.id === "currency" ? "View balances" : "View items") : "No balances returned") : (group.items.length ? "View ownership" : "No ownership returned");
    return '<button type="button" class="record-hit record-category" data-record-action="group" data-record-id="' + esc(group.id) + '"><span class="record-category-icon" aria-hidden="true">' + icon + '</span><span><strong>' + esc(group.name) + '</strong><small>' + esc(status) + '</small></span><span aria-hidden="true">›</span></button>';
  }
  const shinyChip = (mon) => String(mon.variant).toLowerCase() === "shiny" ? '<span class="admin-next-chip record-shiny">Shiny</span>' : "";
  function statsPanel(mon) {
    const data = mon.battleData || {};
    const friendly = input => typeof input === "string" ? input.replace(/[-_]+/g," ").replace(/\b\w/g, ch => ch.toUpperCase()) : null;
    const moves = Array.isArray(data.moves) ? (data.moves.length ? data.moves.map(move => friendly(typeof move === "string" ? move : move?.name) || "Unavailable").join(", ") : "No moves recorded") : null;
    const numeric = input => typeof input === "number" && Number.isFinite(input) ? input : null;
    const stats = [["hp","HP"],["atk","Attack"],["def","Defense"],["spa","Sp. Attack"],["spd","Sp. Defense"],["spe","Speed"]];
    const hasValues = stats.some(([key]) => [data.ivs, data.evs].some(group => numeric(group?.[key]) !== null));
    const table = hasValues ? '<div class="record-stat-scroll"><table class="record-stat-table"><caption>Stored individual and training values</caption><thead><tr><th scope="col">Stat</th><th scope="col">IV</th><th scope="col">EV</th></tr></thead><tbody>' + stats.map(([key,label]) => '<tr><th scope="row">' + label + '</th>' + [data.ivs,data.evs].map(group => '<td>' + esc(value(numeric(group?.[key]))) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : note("Individual stats are unavailable in this record.");
    const hp = numeric(data.hpCurrent) !== null || numeric(data.hpMax) !== null ? value(numeric(data.hpCurrent)) + " / " + value(numeric(data.hpMax)) : null;
    return '<section class="record-stats" aria-label="Stats and Battle Data"><h4>Stats &amp; Battle Data</h4>' + rows([["Moves", moves], ["Ability", friendly(data.ability)], ["Nature", data.nature], ["HP current / maximum", hp]]) + table + '<button type="button" disabled>Edit stats</button></section>';
  }
  function pokemonFacts(mon) { return rows([["Pokédex", mon.dex], ["Gender", genderName(mon.gender)], ["Poké Ball", ballName(mon.ball)], ["Caught", stamp(mon.caughtAt)], ["Specimen id", mon.id]]); }
  function pokemon(view) {
    const mons = view.mons || [];
    const mon = mons.find((row, index) => String(row.id || `snapshot-row-${index}`) === view.recordState?.mon);
    if (mon) return `${back("Pokémon collection", "mons")}<section class="record-surface"><div class="record-mon-identity">${monArt(mon)}<div><h4 tabindex="-1" data-record-heading>${esc(mon.nickname || mon.name)} ${shinyChip(mon)}</h4>${mon.nickname && mon.nickname !== mon.name ? note(mon.name) : ""}</div></div>${rows([["Pokédex", mon.dex], ["Level", mon.level], ["Gender", genderName(mon.gender)], ["Poké Ball", ballName(mon.ball)], ["Caught", stamp(mon.caughtAt)], ["Specimen id", mon.id]])}${statsPanel(mon)}</section>`;
    return `${note("Newest 40 live Pokémon only. This is not the full PC.")}<div class="record-list">${mons.length ? mons.map((row, index) => `<button type="button" class="record-hit" data-record-action="mon" data-record-id="${esc(row.id || `snapshot-row-${index}`)}">${monArt(row)}<span><strong>${esc(row.nickname || row.name || "Pokémon")}</strong> ${shinyChip(row)}<span class="admin-next-trainer-handle">Lv. ${esc(value(row.level))}${row.nickname && row.nickname !== row.name ? " · " + esc(row.name) : ""}</span></span><span aria-hidden="true">›</span></button>`).join("") : note("No live Pokémon returned.")}</div>`;
  }

  function monArt(mon) {
    const dex = Number(mon.dex);
    const variant = String(mon.variant || "normal").toLowerCase();
    if (!Number.isInteger(dex) || dex < 1 || dex > 151 || !["normal", "shiny"].includes(variant)) return "";
    return `<img class="record-mon-art" src="images/pokemon/home/${variant === "shiny" ? "shiny/" : ""}${dex}.png" alt="" width="64" height="64" loading="lazy">`;
  }
  function profileHtml(view) {
    if (view.loading || view.denied || view.error) return base.profileHtml(view);
    const user = view.user || {};
    const header = `<header class="record-header"><span class="record-identity">${avatar(user)}<span><p class="eyebrow">Trainer record</p><h3>${esc(user.displayName || user.login || "Trainer")}</h3>${user.login ? `<p class="admin-next-trainer-handle">@${esc(user.login)}</p>` : ""}<span class="record-account-meta"><span class="admin-next-chip">${esc(user.role || "player")}</span> <span data-record-pass class="admin-next-chip${user.pass ? " is-pass" : ""}">${user.pass ? "Starlight Pass" : "No Pass"}</span><span class="record-date">Last seen ${esc(stamp(user.lastSeenAt))}</span></span></span></span></header>
      <div class="admin-next-trainer-subnav record-tabs" role="tablist" aria-label="Trainer dossier">${PANES.map((pane) => `<button type="button" role="tab" data-trainer-pane="${pane}" aria-selected="${view.pane === pane}" tabindex="${view.pane === pane ? 0 : -1}">${labels[pane]}</button>`).join("")}</div>`;
    let body;
    if (view.pane === "pokemon") body = `<section data-trainer-roster>${pokemon(view)}</section>`;
    else if (view.pane === "inventory") body = manager(view, "inventory") + note("Bits, the complete item catalog and item removal are not available in this view. Use Gifts to give rewards.");
    else if (view.pane === "pass" || view.pane === "gifts") body = `<section class="record-surface" data-trainer-rewards><h4>${labels[view.pane]}</h4>${note("Loading staff reward tools…")}</section>`;
    else if (view.pane === "tickets") body = `<section class="record-surface"><h4>Tickets</h4><div data-support-trainer></div></section>`;
    else {
      const legacy = base.profileHtml(view);
      const legacyHeader = /^<header class="admin-next-trainer-head">[\s\S]*?<\/header>\s*<div class="admin-next-trainer-subnav"[^>]*>[\s\S]*?<\/div>/;
      body = legacyHeader.test(legacy) ? legacy.replace(legacyHeader, "") : note("This record section is unavailable. Refresh the page to load the current presentation.");
      if (view.pane === "progression") {
        const identity = view.identity || {};
        const trainer = identity.trainer || {};
        body = `<section class="record-surface"><h4>Progression</h4>${rows([["Level", trainer.level], ["XP", trainer.xp], ["Title", trainer.title], ["Ranking visible", yes(identity.rankingVisible)], ["Ranking eligible", yes(identity.rankingEligible)], ["Caught", trainer.caught], ["Seen", trainer.seen], ["Shiny caught", trainer.shinyCaught]])}</section>` + manager(view, "unlocks") + note("Achievement journals, Oak research and evolution history are unavailable here.");
      }
      if (view.pane === "connections") body = '<section class="record-surface"><h4>Connected Twitch accounts</h4><div class="record-list">' + (view.connections || []).map(row => '<article class="record-surface"><h4>' + esc(row.displayName || row.login || "Twitch account") + '</h4>' + rows([["Login", row.login], ["Primary Twitch", yes(row.primary)], ["Confirmed", yes(row.confirmed)], ["Can sign in", yes(row.loginEnabled)], ["Gameplay rewards", yes(row.gameplayEnabled)], ["Status", row.status], ["Connected on", stamp(row.linkedAt)]]) + '</article>').join('') + (!(view.connections || []).length ? note("No Twitch connections returned.") : "") + '</div></section>' + `<section class="record-surface" data-trainer-diagnostics></section>` + note("Primary: main identity. Confirmed: identity-confirmation flag. Login enabled: may sign in. Gameplay enabled: may earn rewards. Link status does not indicate online presence. Bot/utility links do not classify the trainer as a bot.");
    }
    return `${header}<div class="record-body">${body}</div><footer class="record-footer">Need to change this account? <a data-record-support href="./admin-next.html?section=support&amp;trainer=${encodeURIComponent(user.id || "")}">Open Support &amp; Recovery</a></footer>`;
  }
  function presentProfile(input) {
    const view = base.presentProfile(input);
    view.pane = PANES.includes(input?.pane) ? input.pane : "overview";
    return view;
  }
  const mounts = new WeakMap();
  function renderRecord(root, view) {
    const previous = mounts.get(root);
    const same = previous?.user?.id === view.user?.id && previous?.pane === view.pane;
    view.recordState = same ? previous.recordState : {};
    const preserveHeight = previous?.user?.id && previous.user.id === view.user?.id;
    // Keep enough document height for the current viewport, without retaining
    // the full height of a previously long claim/history pane.
    root.style.minHeight = preserveHeight ? `${Math.max(0, window.innerHeight-root.getBoundingClientRect().top)}px` : "";
    mounts.set(root, view);
    const restoreTabFocus = previous?.user?.id === view.user?.id && root.contains(document.activeElement) && document.activeElement?.matches("[data-trainer-pane]");
    root.innerHTML = profileHtml(view);
    if (restoreTabFocus) root.querySelector('[data-trainer-pane][aria-selected="true"]')?.focus({ preventScroll: true });
    if (root.dataset.recordBound) return;
    root.dataset.recordBound = "true";
    function paint(action, id) {
      const current = mounts.get(root);
      if (!current || current.loading || current.error || current.denied) return;
      const state = current.recordState;
      if (action === "group") { state.group = id; state.item = ""; }
      else if (action === "item") state.item = id;
      else if (action === "items") state.item = "";
      else if (action === "groups") { state.group = ""; state.item = ""; }
      else if (action === "mon") state.mon = id;
      else if (action === "mons") state.mon = "";
      root.style.minHeight = `${Math.max(0, window.innerHeight-root.getBoundingClientRect().top)}px`;
      root.innerHTML = profileHtml(current);
      root.querySelector("[data-record-heading], [data-record-action]")?.focus({ preventScroll: true });
    }
    root.addEventListener("click", (event) => {
      const hit = event.target.closest("[data-record-action]");
      if (hit && root.contains(hit)) paint(hit.dataset.recordAction, hit.dataset.recordId);
    });
    root.addEventListener("keydown", (event) => {
      const tab = event.target.closest("[data-trainer-pane]");
      if (tab && root.contains(tab) && ["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) {
        const tabs = [...root.querySelectorAll("[data-trainer-pane]:not(:disabled)")];
        const index = tabs.indexOf(tab);
        if (index < 0 || !tabs.length) return;
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault();
        tabs.forEach((item, i) => item.tabIndex = i === next ? 0 : -1);
        tabs[next].focus({ preventScroll: true });
        return;
      }
      const state = mounts.get(root)?.recordState;
      if (event.key !== "Escape" || !state) return;
      const action = state.mon ? "mons" : state.item ? "items" : state.group ? "groups" : "";
      if (action) { event.preventDefault(); paint(action); }
    });
  }
  return { ...base, PANES, directoryHtml, profileHtml, presentProfile, renderRecord, inventoryGroups, unlockGroups, statsPanel, monArt, pokemonFacts };
}));
