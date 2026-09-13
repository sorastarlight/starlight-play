(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const STATUS = {
    joined: "You have joined the encounter! Please wait while other Trainers join you.",
    joining: "JOINING…",
    joinedShort: "JOINED ✓",
    honey: "You have contributed Honey! Please wait while the other Trainers make their choices.",
    noItem: "You chose not to use an item. Please wait while the other Trainers make their choices.",
    noItemTimeout: "No item selected.",
    noBall: "You didn't choose a Poké Ball in time!",
    reconnect: "Reconnecting…",
    phaseEnded: "That phase has ended.",
    emptyBalls: "You don't have a Poké Ball available for this encounter.",
    emptyItems: "No encounter items available.",
    firstPrep: "Choose a Berry to help yourself, Honey to help everyone, or skip.",
    firstThrow: "Choose a Poké Ball. Recommended Balls are marked.",
    adPause: "A Twitch ad break is currently running. The encounter will resume when the stream returns."
  };

  const TIMER = {
    join: "JOIN ENDS IN",
    prepare: "ITEM SELECTION ENDS IN",
    throw: "BALL SELECTION ENDS IN",
    reveal: "CATCH RESOLVES IN",
    closed: "ENCOUNTER ENDED"
  };

  const PHASE = {
    join: "JOIN",
    prepare: "CHOOSE AN ITEM",
    throw: "CHOOSE YOUR POKÉ BALL",
    reveal: "CATCH ATTEMPT",
    closed: "RESULTS"
  };

  const BERRY_KEYS = new Set([
    "berry", "cheri", "chesto", "pecha", "rawst", "aspear", "leppa", "persim",
    "lum", "sitrus", "figy", "wiki", "mago", "aguav", "iapapa", "razz", "bluk",
    "nanab", "wepear", "pinap", "goldenrazz", "silverpinap"
  ]);
  const BALL_KEYS = new Set(root.PLAY_BALLS
    ? root.PLAY_BALLS.map((row) => row.key)
    : [
      "pokeball", "greatball", "ultraball", "masterball", "premierball",
      "luxuryball", "healball", "friendball", "loveball", "nestball", "netball",
      "repeatball", "timerball", "diveball", "duskball", "quickball", "fastball",
      "lureball", "moonball", "heavyball", "levelball", "safariball", "sportball"
    ]);
  const EVO_KEYS = new Set([
    "firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord", "rarecandy"
  ]);
  const COMMUNITY_KEYS = new Set(["bait", "lure"]);

  const STONE_USES = {
    firestone: [["Growlithe", "Arcanine"], ["Vulpix", "Ninetales"], ["Eevee", "Flareon"]],
    waterstone: [["Poliwhirl", "Poliwrath"], ["Shellder", "Cloyster"], ["Staryu", "Starmie"], ["Eevee", "Vaporeon"]],
    thunderstone: [["Pikachu", "Raichu"], ["Eevee", "Jolteon"]],
    leafstone: [["Gloom", "Vileplume"], ["Weepinbell", "Victreebel"], ["Exeggcute", "Exeggutor"]],
    moonstone: [["Nidorina", "Nidoqueen"], ["Nidorino", "Nidoking"], ["Clefairy", "Clefable"], ["Jigglypuff", "Wigglytuff"]],
    linkingcord: [["Kadabra", "Alakazam"], ["Machoke", "Machamp"], ["Graveler", "Golem"], ["Haunter", "Gengar"]]
  };

  function esc(value) {
    return typeof window !== "undefined" && root.playEscapeAttr
      ? root.playEscapeAttr(value)
      : String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
  }

  function labelOf(key) {
    if (key === "none") return "No item";
    return typeof window !== "undefined" && root.playItemLabel
      ? root.playItemLabel(key)
      : key;
  }

  function spriteOf(key) {
    return typeof window !== "undefined" && root.playItemSprite
      ? root.playItemSprite(key)
      : "";
  }

  root.PLAY_STATUS = STATUS;
  root.PLAY_TIMER = TIMER;
  root.PLAY_PHASE = PHASE;

  root.playItemCategory = function playItemCategory(key) {
    if (key === "coins") return "wallet";
    if (COMMUNITY_KEYS.has(key)) return "community";
    if (BERRY_KEYS.has(key)) return "berries";
    if (BALL_KEYS.has(key) || (typeof window !== "undefined" && root.playBallInfo?.(key))) return "balls";
    if (EVO_KEYS.has(key)) return "evolution";
    return "special";
  };

  root.playItemUseLines = function playItemUseLines(key) {
    return STONE_USES[key] ? STONE_USES[key].slice() : [];
  };

  root.playItemPlayerText = function playItemPlayerText(key, captureItems) {
    if (key === "bait") {
      return (captureItems?.honey?.description)
        || "Contribute during the item phase to improve the community catch bonus for every participating Trainer.";
    }
    if (key === "lure") return "Automatically joins you to encounters for 30 minutes.";
    if (key === "coins") return "Spend these in Starlight Mart.";
    if (key === "rarecandy") return "Gives 1 family Candy. Use it on the Evolution page.";
    if (STONE_USES[key]) {
      const first = STONE_USES[key][0];
      return `Used to evolve certain Pokémon such as ${first[0]}.`;
    }
    const berry = typeof window !== "undefined" ? root.playBerryInfo?.(key, captureItems) : null;
    if (berry?.description) return berry.description;
    const ball = (captureItems?.balls || []).find((row) => row.key === key)
      || (typeof window !== "undefined" ? root.playBallInfo?.(key) : null);
    if (ball?.description || ball?.effect) return ball.description || ball.effect;
    return "A useful Trainer item.";
  };

  root.playItemAcquisition = function playItemAcquisition(key, captureItems) {
    if (key === "masterball") return "Not sold in Starlight Mart. Awarded for rare Trainer milestones.";
    if (key === "rarecandy") return "Found as a rare capture reward.";
    if (key === "linkingcord") return "Sold in Starlight Mart. Also awarded after your first trade.";
    if (EVO_KEYS.has(key)) return "Sold in Starlight Mart. Sometimes found after a catch.";
    if (key === "bait") return "Daily Trainer Supply, Starlight Mart, and encounter rewards.";
    const berry = typeof window !== "undefined" ? root.playBerryInfo?.(key, captureItems) : null;
    if (berry?.storeAvailable) return "Available in Starlight Mart.";
    const ball = (captureItems?.balls || []).find((row) => row.key === key);
    if (ball?.storeAvailable || ["pokeball", "greatball", "ultraball"].includes(key)) {
      return "Available in Starlight Mart.";
    }
    return "Earned from encounters, Daily Trainer Supply, or the Mart.";
  };

  root.playPhaseTitle = function playPhaseTitle(phase) {
    return PHASE[phase] || "ENCOUNTER";
  };

  root.playTimerLabel = function playTimerLabel(phase) {
    return TIMER[phase] || "TIME LEFT";
  };

  root.playEncounterTimeText = function playEncounterTimeText(round) {
    if (!round) return "";
    if (round.paused) return "PAUSED";
    const seconds = typeof window !== "undefined" && root.playEncounterSecondsLeft
      ? root.playEncounterSecondsLeft(round)
      : 0;
    const label = root.playTimerLabel(round.phase);
    if (seconds <= 5 && seconds > 0) return `${label} ${seconds} — 5 SECONDS`;
    if (seconds > 0) return `${label} ${String(seconds).padStart(2, "0")}`;
    return round.phase === "closed" ? "Waiting" : `${label} 00`;
  };

  root.playTimerWarnClass = function playTimerWarnClass(seconds) {
    if (seconds <= 5) return "is-urgent";
    if (seconds <= 10) return "is-warn";
    return "";
  };

  root.playStatusItem = function playStatusItem(item) {
    if (!item || item === "none") return STATUS.noItem;
    if (item === "bait") return STATUS.honey;
    return `You have selected ${labelOf(item)}! Please wait while the other Trainers make their choices.`;
  };

  root.playStatusBall = function playStatusBall(item) {
    return `You have chosen ${labelOf(item)}! Please wait while the other Trainers make their choices.`;
  };

  root.playHumanRpcError = function playHumanRpcError(error, fallback) {
    const raw = typeof window !== "undefined" && root.playRpcError
      ? root.playRpcError(error, fallback)
      : (error?.message || fallback || "That action did not work.");
    const text = String(raw || "");
    if (/failed to fetch|networkerror|load failed|the network/i.test(text)) return STATUS.reconnect;
    if (/item phase|poké ball phase|joining has closed|joining is closed|items can only|poké balls can only/i.test(text)) {
      return STATUS.phaseEnded;
    }
    if (/http\s*409|conflict|already used that action/i.test(text)) return "That item was already used.";
    if (/inventory_validation|no .+ left|have no /i.test(text)) return "You no longer have that item available.";
    if (/42501|jwt/i.test(text)) return "Sign in with Twitch to continue.";
    return text.replace(/Mix It Up/gi, "the stream");
  };

  root.playSortEncounterBalls = function playSortEncounterBalls(rows, pins) {
    const pinSet = new Set(pins || []);
    const rank = (row) => {
      if (row.recommended) return 0;
      if (pinSet.has(row.key || row.ballId)) return 1;
      if (row.specialist) return 2;
      const key = row.key || row.ballId;
      if (key === "ultraball" || key === "hisuiultraball") return 3;
      if (key === "greatball" || key === "hisuigreatball") return 4;
      if (key === "pokeball" || key === "premierball" || key === "hisuipokeball") return 5;
      return 6;
    };
    return (rows || []).slice().sort((a, b) => rank(a) - rank(b) || String(a.name || "").localeCompare(String(b.name || "")));
  };

  root.playBagPins = function playBagPins() {
    try {
      const raw = JSON.parse(localStorage.getItem("play-bag-pins") || "[]");
      return Array.isArray(raw) ? raw.filter(Boolean).slice(0, 12) : [];
    } catch (_) {
      return [];
    }
  };

  root.playToggleBagPin = function playToggleBagPin(key) {
    const next = root.playBagPins();
    const index = next.indexOf(key);
    if (index >= 0) next.splice(index, 1);
    else next.unshift(key);
    try { localStorage.setItem("play-bag-pins", JSON.stringify(next.slice(0, 12))); } catch (_) {}
    return next;
  };

  root.playSeenItems = function playSeenItems() {
    try {
      return JSON.parse(localStorage.getItem("play-seen-items") || "{}") || {};
    } catch (_) {
      return {};
    }
  };

  root.playMarkItemSeen = function playMarkItemSeen(key) {
    const seen = root.playSeenItems();
    seen[key] = true;
    try { localStorage.setItem("play-seen-items", JSON.stringify(seen)); } catch (_) {}
  };

  root.playIsNewItem = function playIsNewItem(key, qty) {
    if (Number(qty || 0) < 1) return false;
    return !root.playSeenItems()[key];
  };

  root.playRecentKeys = function playRecentKeys(kind) {
    try {
      const raw = JSON.parse(localStorage.getItem(`play-recent-${kind}`) || "[]");
      return Array.isArray(raw) ? raw.filter(Boolean).slice(0, 3) : [];
    } catch (_) {
      return [];
    }
  };

  root.playRememberUsed = function playRememberUsed(kind, key) {
    if (!key || key === "none") return;
    const next = [key].concat(root.playRecentKeys(kind).filter((item) => item !== key)).slice(0, 3);
    try { localStorage.setItem(`play-recent-${kind}`, JSON.stringify(next)); } catch (_) {}
  };

  root.playConfirmRare = function playConfirmRare() {
    try {
      const raw = localStorage.getItem("play-confirm-rare");
      return raw == null ? true : raw !== "0";
    } catch (_) {
      return true;
    }
  };

  root.playSetConfirmRare = function playSetConfirmRare(on) {
    try { localStorage.setItem("play-confirm-rare", on ? "1" : "0"); } catch (_) {}
    return Boolean(on);
  };

  root.playBallShopBlurb = function playBallShopBlurb(key, captureItems) {
    if (key === "masterball") return "Guaranteed capture. Extremely rare — not sold on the ordinary shelf.";
    const text = root.playItemPlayerText(key, captureItems);
    return String(text || "A Poké Ball for catching wild Pokémon.").replace(/\d+(\.\d+)?\s*×/g, "").trim();
  };

  root.playTipDone = function playTipDone(key) {
    try {
      const raw = JSON.parse(localStorage.getItem("play-tips-done") || "{}") || {};
      return Boolean(raw[key]);
    } catch (_) {
      return false;
    }
  };

  root.playMarkTip = function playMarkTip(key) {
    try {
      const raw = JSON.parse(localStorage.getItem("play-tips-done") || "{}") || {};
      raw[key] = true;
      localStorage.setItem("play-tips-done", JSON.stringify(raw));
    } catch (_) {}
  };

  root.playTipHtml = function playTipHtml(key, message) {
    if (!message || root.playTipDone(key)) return "";
    return `<aside class="play-tip" data-tip="${esc(key)}">
      <p>${esc(message)}</p>
      <button type="button" class="secondary" data-dismiss-tip="${esc(key)}">Got it</button>
    </aside>`;
  };

  root.playDailyStreakHtml = function playDailyStreakHtml(wallet) {
    const day = Math.max(1, Math.min(7, Number(wallet?.dailyStreakDay || 1)));
    const claimed = Boolean(wallet?.dailyClaimed);
    const extras = {
      2: "Great Ball",
      4: "Honey",
      5: "Great Ball",
      6: "Razz Berry",
      7: "Ultra Ball"
    };
    const cells = [1, 2, 3, 4, 5, 6, 7].map((n) => {
      const done = claimed ? n <= day : n < day;
      const today = (!claimed && n === day) || (claimed && n === day);
      const extra = extras[n] ? `<em>${esc(extras[n])}</em>` : "";
      return `<li class="${done ? "is-done" : ""}${today ? " is-today" : ""}">
        <span>Day ${n}${done ? " ✓" : today ? " TODAY" : ""}</span>
        ${extra}
      </li>`;
    }).join("");
    return `<ol class="daily-streak" aria-label="Daily Trainer Supply streak">${cells}</ol>`;
  };

  root.playEncounterCardHtml = function playEncounterCardHtml(row) {
    const selected = row.selected ? " is-selected" : "";
    const rec = row.recommended ? `<span class="enc-badge is-rec">★ RECOMMENDED</span>` : "";
    const effect = row.effectiveness
      ? `<span class="enc-badge is-${String(row.effectiveness).toLowerCase()}">${esc(row.effectiveness)}</span>`
      : "";
    const mark = row.selected
      ? `<span class="enc-selected-mark">SELECTED ✓</span>`
      : "";
    const why = row.disabled && row.reason
      ? `<span class="enc-why">${esc(row.reason)}</span>`
      : "";
    const qty = row.qty == null ? "" : `<span class="enc-qty">x${row.qty}</span>`;
    const disabled = row.disabled ? "disabled" : "";
    return `<button type="button" class="enc-card item-btn${selected}${row.recommended ? " is-rec" : ""}" data-kind="${esc(row.kind)}" data-item="${esc(row.item)}" ${disabled} aria-pressed="${row.selected ? "true" : "false"}" aria-label="${esc(row.label)}${row.qty != null ? `, ${row.qty} owned` : ""}${row.disabled && row.reason ? `, ${row.reason}` : ""}">
      <span class="item-icon item-icon-img"><img src="${spriteOf(row.sprite || row.item)}" alt=""></span>
      <span class="item-copy">
        <strong>${esc(row.label)}</strong>
        ${qty}
        ${rec}${effect}${mark}
        ${row.effect ? `<em>${esc(row.effect)}</em>` : ""}
        ${why}
      </span>
    </button>`;
  };

  root.playBagRowHtml = function playBagRowHtml(key, qty, captureItems, opts) {
    const options = opts || {};
    const name = labelOf(key);
    const pinned = (options.pins || []).includes(key);
    const isNew = root.playIsNewItem(key, qty);
    const coins = key === "coins";
    const qtyHtml = coins
      ? (typeof window !== "undefined" && root.playCoinsHtml
        ? root.playCoinsHtml(qty)
        : String(qty || 0))
      : `x${Number(qty || 0).toLocaleString()}`;
    return `<article class="bag-row${coins ? " coins" : ""}${Number(qty || 0) < 1 ? " is-empty" : ""}" data-item="${esc(key)}" tabindex="0" role="button" aria-label="${esc(name)}, ${qtyHtml}">
      <img class="item-sprite" src="${spriteOf(key)}" alt="">
      <div class="bag-copy">
        <h3>${esc(name)}${isNew ? ` <span class="chip">NEW</span>` : ""}${pinned ? ` <span class="chip">PINNED</span>` : ""}</h3>
        <p>${esc(root.playItemPlayerText(key, captureItems))}</p>
      </div>
      <strong class="bag-qty">${qtyHtml}</strong>
    </article>`;
  };

  root.playItemDetailHtml = function playItemDetailHtml(key, qty, captureItems) {
    const uses = STONE_USES[key];
    const store = root.playItemAcquisition(key, captureItems);
    return `<div class="item-detail">
      <img class="item-sprite" src="${spriteOf(key)}" alt="">
      <h3>${esc(labelOf(key))}</h3>
      <p class="bag-qty">Owned: ${Number(qty || 0).toLocaleString()}</p>
      <p>${esc(root.playItemPlayerText(key, captureItems))}</p>
      <p class="muted">Category: ${esc(root.playItemCategory(key))}</p>
      <p>${esc(store)}</p>
      ${uses ? `<div class="item-uses"><p class="eyebrow">Used for</p><ul>${uses.map(([from, to]) => `<li>${esc(from)} → ${esc(to)}</li>`).join("")}</ul></div>` : ""}
    </div>`;
  };

  root.playHoneyMeterHtml = function playHoneyMeterHtml(round) {
    const contributors = Number(round?.honeyContributors || (round?.honeyTrainers || []).length || 0);
    const participants = Math.max(Number(round?.honeyParticipants || round?.participants || 0), 0);
    const denom = Math.max(participants, 1);
    const bonus = Number(round?.baitBonusPercent || 0);
    const pct = Math.max(0, Math.min(100, Math.round((contributors / denom) * 100)));
    return `<aside class="honey-meter" data-honey="${contributors}:${participants}:${bonus}">
      <img src="${spriteOf("bait")}" alt="">
      <div>
        <strong>Community Honey</strong>
        <div class="honey-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${denom}" aria-valuenow="${contributors}" aria-label="Community Honey ${contributors} of ${participants} Trainers">
          <i style="width:${pct}%"></i>
        </div>
        <p>${contributors} / ${participants || "—"} Trainers · Current catch bonus +${bonus}%</p>
      </div>
    </aside>`;
  };

  root.playUsedSummaryHtml = function playUsedSummaryHtml(me, round) {
    if (!me) return "";
    const berry = me.prep && me.prep !== "none" && me.prep !== "bait" ? labelOf(me.prep) : "";
    const honey = me.prep === "bait" || Number(round?.baitBonusPercent || 0) > 0;
    const ball = me.ball ? labelOf(me.ball) : "";
    if (!berry && !ball && !honey) return "";
    return `<dl class="enc-used">
      ${berry ? `<div><dt>Used</dt><dd>${esc(berry)}</dd></div>` : ""}
      ${ball ? `<div><dt>Poké Ball</dt><dd>${esc(ball)}</dd></div>` : ""}
      <div><dt>Honey bonus</dt><dd>+${Number(round?.baitBonusPercent || 0)}%</dd></div>
    </dl>`;
  };

  root.playLedgerLabel = function playLedgerLabel(reason) {
    const map = {
      ENCOUNTER_DROP: "Encounter reward",
      ENCOUNTER_PARTICIPATION: "Encounter reward",
      STORE_PURCHASE: "Starlight Mart",
      DAILY_SUPPLY: "Daily Trainer Supply",
      DAILY_TRAINER_SUPPLY: "Daily Trainer Supply",
      LEVEL_REWARD: "Trainer level reward",
      DEX_REWARD: "Pokédex milestone",
      TRADE_REWARD: "Trade reward",
      ADMIN_GRANT: "Staff gift",
      EVOLUTION: "Evolution",
      ENCOUNTER_USE: "Used in encounter"
    };
    return map[reason] || String(reason || "Reward").replace(/_/g, " ");
  };

  root.playPremierPreview = function playPremierPreview(cart, findSku) {
    const keys = new Set(["pokeball", "greatball", "ultraball", "premierball"]);
    let qualifying = 0;
    (cart || []).forEach((row) => {
      const item = findSku?.(row.sku);
      const grant = item?.ballKey || Object.keys(item?.grants || {})[0] || "";
      if (keys.has(grant)) qualifying += Number(row.qty || 0) * Number(item?.qty || item?.grants?.[grant] || 1);
    });
    return Math.floor(qualifying / 10);
  };

  root.playBindTips = function playBindTips(host) {
    host?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-dismiss-tip]");
      if (!btn) return;
      root.playMarkTip(btn.dataset.dismissTip);
      btn.closest(".play-tip")?.remove();
    });
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      STATUS,
      TIMER,
      PHASE,
      playItemCategory: root.playItemCategory,
      playHumanRpcError: root.playHumanRpcError,
      playSortEncounterBalls: root.playSortEncounterBalls,
      playTimerWarnClass: root.playTimerWarnClass,
      playPremierPreview: root.playPremierPreview,
      playLedgerLabel: root.playLedgerLabel,
      playBallShopBlurb: root.playBallShopBlurb
    };
  }
})();
