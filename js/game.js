(() => {
  const ITEM_LABELS = {
    berry: "Berry",
    bait: "Honey",
    pokeball: "Poké Ball",
    greatball: "Great Ball",
    ultraball: "Ultra Ball",
    masterball: "Master Ball",
    premierball: "Premier Ball",
    luxuryball: "Luxury Ball",
    healball: "Heal Ball",
    friendball: "Friend Ball",
    loveball: "Love Ball",
    nestball: "Nest Ball",
    netball: "Net Ball",
    repeatball: "Repeat Ball",
    timerball: "Timer Ball",
    diveball: "Dive Ball",
    duskball: "Dusk Ball",
    quickball: "Quick Ball",
    fastball: "Fast Ball",
    lureball: "Lure Ball",
    moonball: "Moon Ball",
    heavyball: "Heavy Ball",
    levelball: "Level Ball",
    safariball: "Safari Ball",
    sportball: "Sport Ball",
    cherishball: "Cherish Ball",
    gsball: "GS Ball",
    ashball: "Ash's Poké Ball",
    cloneball: "Clone Ball",
    darkball: "Dark Ball",
    oldball: "Old Ball",
    hisuipokeball: "Hisui Poké Ball",
    hisuigreatball: "Hisui Great Ball",
    hisuiultraball: "Hisui Ultra Ball",
    hisuiheavyball: "Hisui Heavy Ball",
    featherball: "Feather Ball",
    wingball: "Wing Ball",
    jetball: "Jet Ball",
    leadenball: "Leaden Ball",
    gigatonball: "Gigaton Ball",
    originball: "Origin Ball",
    strangeball: "Strange Ball",
    lure: "Poké Radar",
    coins: "PokéCoins",
    bag_bonus: "inventory space"
  };
  const VARIANT_LABELS = {
    normal: "Normal",
    female: "Female",
    shiny: "Shiny",
    "shiny-female": "Shiny Female"
  };

  const GENDER_RATES = [null,
    1,1,1,1,1,1,1,1,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,8,8,8,0,0,0,6,6,6,6,6,6,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2,4,4,4,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,4,4,-1,-1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,-1,-1,4,4,4,4,0,0,4,4,4,4,4,8,4,8,4,4,4,4,-1,-1,4,4,8,2,2,4,0,4,4,4,-1,1,1,1,1,-1,1,1,1,1,1,1,-1,-1,-1,4,4,4,-1,-1
  ];

  const HABITATS = {
    1: "Pallet Town", 2: "Pallet Town", 3: "Pallet Town", 4: "Pallet Town", 5: "Pallet Town",
    6: "Pallet Town", 7: "Pallet Town", 8: "Pallet Town", 9: "Pallet Town",
    10: "Viridian Forest", 11: "Viridian Forest", 12: "Viridian Forest", 13: "Viridian Forest",
    14: "Viridian Forest", 15: "Viridian Forest", 16: "Route 1", 17: "Route 1", 18: "Route 1",
    19: "Route 1", 20: "Route 1", 21: "Route 3", 22: "Route 3", 23: "Route 4", 24: "Route 4",
    25: "Viridian Forest", 26: "Viridian Forest", 27: "Route 4", 28: "Route 4",
    29: "Route 22", 30: "Route 22", 31: "Route 22", 32: "Route 22", 33: "Route 22", 34: "Route 22",
    35: "Mt. Moon", 36: "Mt. Moon", 37: "Route 7", 38: "Route 7", 39: "Route 3", 40: "Route 3",
    41: "Mt. Moon", 42: "Mt. Moon", 43: "Route 2", 44: "Route 2", 45: "Route 2",
    46: "Mt. Moon", 47: "Mt. Moon", 48: "Route 2", 49: "Route 2", 50: "Diglett's Cave", 51: "Diglett's Cave",
    52: "Route 8", 53: "Route 8", 54: "Route 6", 55: "Route 6", 56: "Route 22", 57: "Route 22",
    58: "Route 7", 59: "Route 7", 60: "Route 6", 61: "Route 6", 62: "Route 6",
    63: "Route 11", 64: "Route 11", 65: "Route 11", 66: "Rock Tunnel", 67: "Rock Tunnel", 68: "Rock Tunnel",
    69: "Route 2", 70: "Route 2", 71: "Route 2", 72: "Route 19", 73: "Route 19",
    74: "Mt. Moon", 75: "Mt. Moon", 76: "Mt. Moon", 77: "Route 17", 78: "Route 17",
    79: "Seafoam Islands", 80: "Seafoam Islands", 81: "Power Plant", 82: "Power Plant",
    83: "Route 12", 84: "Route 12", 85: "Route 12", 86: "Seafoam Islands", 87: "Seafoam Islands",
    88: "Pokémon Mansion", 89: "Pokémon Mansion", 90: "Route 19", 91: "Route 19",
    92: "Pokémon Tower", 93: "Pokémon Tower", 94: "Pokémon Tower", 95: "Victory Road",
    96: "Route 11", 97: "Route 11", 98: "Route 19", 99: "Route 19", 100: "Power Plant", 101: "Power Plant",
    102: "Safari Zone", 103: "Safari Zone", 104: "Rock Tunnel", 105: "Rock Tunnel",
    106: "Saffron City", 107: "Saffron City", 108: "Route 18", 109: "Pokémon Mansion", 110: "Pokémon Mansion",
    111: "Victory Road", 112: "Victory Road", 113: "Route 10", 114: "Route 18", 115: "Rock Tunnel",
    116: "Route 19", 117: "Route 19", 118: "Route 6", 119: "Route 6", 120: "Route 19", 121: "Route 19",
    122: "Route 2", 123: "Route 12", 124: "Route 10", 125: "Power Plant", 126: "Victory Road",
    127: "Route 18", 128: "Route 18", 129: "Route 6", 130: "Route 6", 131: "Seafoam Islands",
    132: "Route 13", 133: "Route 17", 134: "Route 17", 135: "Power Plant", 136: "Victory Road",
    137: "Silph Co.", 138: "Cinnabar Lab", 139: "Cinnabar Lab", 140: "Cinnabar Lab", 141: "Cinnabar Lab",
    142: "Cinnabar Lab", 143: "Route 12", 144: "Seafoam Islands", 145: "Power Plant", 146: "Victory Road",
    147: "Safari Zone", 148: "Safari Zone", 149: "Safari Zone", 150: "Cerulean Cave", 151: "Faraway place"
  };

  const TYPE_COLORS = {
    Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Grass: "#78C850",
    Electric: "#F8D030", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
    Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
    Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
    Steel: "#B8B8D0", Fairy: "#EE99AC"
  };

  window.PLAY_BAG_MAX = 10000;
  window.PLAY_BALLS = [
    { key: "pokeball", sku: "poke5", name: "Poké Ball", qty: 5, cost: 40, rate: 0.45, multiplier: "1×", sprite: "poke-ball", extra: false },
    { key: "greatball", sku: "great3", name: "Great Ball", qty: 3, cost: 55, rate: 0.6, multiplier: "1.5×", sprite: "great-ball", extra: false },
    { key: "ultraball", sku: "ultra1", name: "Ultra Ball", qty: 1, cost: 50, rate: 0.75, multiplier: "2×", sprite: "ultra-ball", extra: false },
    { key: "masterball", sku: "master1", name: "Master Ball", qty: 1, cost: 10000, rate: 1, multiplier: "Always", sprite: "master-ball", extra: true },
    { key: "premierball", sku: "premier1", name: "Premier Ball", qty: 1, cost: 8, rate: 0.45, multiplier: "1×", sprite: "premier-ball", extra: true },
    { key: "luxuryball", sku: "luxury1", name: "Luxury Ball", qty: 1, cost: 12, rate: 0.45, multiplier: "1×", sprite: "luxury-ball", extra: true },
    { key: "healball", sku: "heal1", name: "Heal Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "heal-ball", extra: true },
    { key: "friendball", sku: "friend1", name: "Friend Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "friend-ball", extra: true },
    { key: "loveball", sku: "love1", name: "Love Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "love-ball", extra: true },
    { key: "nestball", sku: "nest1", name: "Nest Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "nest-ball", extra: true },
    { key: "netball", sku: "net1", name: "Net Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "net-ball", extra: true },
    { key: "repeatball", sku: "repeat1", name: "Repeat Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "repeat-ball", extra: true },
    { key: "timerball", sku: "timer1", name: "Timer Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "timer-ball", extra: true },
    { key: "diveball", sku: "dive1", name: "Dive Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "dive-ball", extra: true },
    { key: "duskball", sku: "dusk1", name: "Dusk Ball", qty: 1, cost: 12, rate: 0.45, multiplier: "1×", sprite: "dusk-ball", extra: true },
    { key: "quickball", sku: "quick1", name: "Quick Ball", qty: 1, cost: 12, rate: 0.45, multiplier: "1×", sprite: "quick-ball", extra: true },
    { key: "fastball", sku: "fast1", name: "Fast Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "fast-ball", extra: true },
    { key: "lureball", sku: "lureball1", name: "Lure Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "lure-ball", extra: true },
    { key: "moonball", sku: "moon1", name: "Moon Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "moon-ball", extra: true },
    { key: "heavyball", sku: "heavy1", name: "Heavy Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "heavy-ball", extra: true },
    { key: "levelball", sku: "level1", name: "Level Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "level-ball", extra: true },
    { key: "safariball", sku: "safari1", name: "Safari Ball", qty: 1, cost: 18, rate: 0.6, multiplier: "1.5×", sprite: "safari-ball", extra: true },
    { key: "sportball", sku: "sport1", name: "Sport Ball", qty: 1, cost: 18, rate: 0.6, multiplier: "1.5×", sprite: "sport-ball", extra: true },
    { key: "cherishball", sku: "cherish1", name: "Cherish Ball", qty: 1, cost: 20, rate: 0.45, multiplier: "1×", sprite: "cherish-ball", extra: true },
    { key: "gsball", sku: "gs1", name: "GS Ball", qty: 1, cost: 25, rate: 0.45, multiplier: "1×", sprite: "gs-ball", extra: true },
    { key: "ashball", sku: "ash1", name: "Ash's Poké Ball", qty: 1, cost: 15, rate: 0.45, multiplier: "1×", sprite: "ash-ball", extra: true },
    { key: "cloneball", sku: "clone1", name: "Clone Ball", qty: 1, cost: 22, rate: 0.45, multiplier: "1×", sprite: "clone-ball", extra: true },
    { key: "darkball", sku: "dark1", name: "Dark Ball", qty: 1, cost: 22, rate: 0.45, multiplier: "1×", sprite: "dark-ball", extra: true },
    { key: "oldball", sku: "old1", name: "Old Ball", qty: 1, cost: 12, rate: 0.45, multiplier: "1×", sprite: "old-ball", extra: true },
    { key: "hisuipokeball", sku: "hisuipoke1", name: "Hisui Poké Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "hisui-poke-ball", extra: true },
    { key: "hisuigreatball", sku: "hisuigreat1", name: "Hisui Great Ball", qty: 1, cost: 14, rate: 0.6, multiplier: "1.5×", sprite: "hisui-great-ball", extra: true },
    { key: "hisuiultraball", sku: "hisuiultra1", name: "Hisui Ultra Ball", qty: 1, cost: 18, rate: 0.75, multiplier: "2×", sprite: "hisui-ultra-ball", extra: true },
    { key: "featherball", sku: "feather1", name: "Feather Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "feather-ball", extra: true },
    { key: "wingball", sku: "wing1", name: "Wing Ball", qty: 1, cost: 14, rate: 0.6, multiplier: "1.5×", sprite: "wing-ball", extra: true },
    { key: "jetball", sku: "jet1", name: "Jet Ball", qty: 1, cost: 18, rate: 0.75, multiplier: "2×", sprite: "jet-ball", extra: true },
    { key: "hisuiheavyball", sku: "hisuiheavy1", name: "Hisui Heavy Ball", qty: 1, cost: 10, rate: 0.45, multiplier: "1×", sprite: "hisui-heavy-ball", extra: true },
    { key: "leadenball", sku: "leaden1", name: "Leaden Ball", qty: 1, cost: 14, rate: 0.6, multiplier: "1.5×", sprite: "leaden-ball", extra: true },
    { key: "gigatonball", sku: "gigaton1", name: "Gigaton Ball", qty: 1, cost: 18, rate: 0.75, multiplier: "2×", sprite: "gigaton-ball", extra: true },
    { key: "originball", sku: "origin1", name: "Origin Ball", qty: 1, cost: 40, rate: 0.45, multiplier: "1×", sprite: "origin-ball", extra: true },
    { key: "strangeball", sku: "strange1", name: "Strange Ball", qty: 1, cost: 12, rate: 0.45, multiplier: "1×", sprite: "strange-ball", extra: true }
  ];

  window.playItemLabel = function playItemLabel(item) {
    return ITEM_LABELS[item] || item;
  };

  window.playBallInfo = function playBallInfo(key) {
    return (window.PLAY_BALLS || []).find((row) => row.key === key) || null;
  };

  window.playSpeciesTypes = function playSpeciesTypes(dex, fallback) {
    if (Array.isArray(fallback) && fallback.length) return fallback;
    const list = window.PLAY_TYPES || [];
    return list[Number(dex) - 1] || ["Normal"];
  };

  window.playTypeChipHtml = function playTypeChipHtml(types) {
    return (types || []).map((type) => {
      const color = TYPE_COLORS[type] || "#A8A878";
      return `<span class="type-chip" style="--type:${color}">${type}</span>`;
    }).join("");
  };

  window.playSizeMeta = function playSizeMeta(size) {
    const key = String(size || "M").toUpperCase();
    const labels = { XS: "Extra Small", S: "Small", M: "Medium", L: "Large", XL: "Extra Large" };
    const order = ["XS", "S", "M", "L", "XL"];
    const index = Math.max(0, order.indexOf(key));
    return {
      key: order.includes(key) ? key : "M",
      label: labels[key] || "Medium",
      pips: order.map((name, i) => `<i class="${i <= index ? "is-on" : ""}" title="${labels[name]}"></i>`).join("")
    };
  };

  const GRANT_ORDER = ["bag_bonus", "masterball", "ultraball", "greatball", "pokeball", "lure", "berry", "bait"];
  const GRANT_WORDS = {
    berry: ["Berry", "Berries"],
    bait: ["Honey", "Honey"],
    pokeball: ["Poké Ball", "Poké Balls"],
    greatball: ["Great Ball", "Great Balls"],
    ultraball: ["Ultra Ball", "Ultra Balls"],
    masterball: ["Master Ball", "Master Balls"],
    premierball: ["Premier Ball", "Premier Balls"],
    luxuryball: ["Luxury Ball", "Luxury Balls"],
    healball: ["Heal Ball", "Heal Balls"],
    friendball: ["Friend Ball", "Friend Balls"],
    loveball: ["Love Ball", "Love Balls"],
    nestball: ["Nest Ball", "Nest Balls"],
    netball: ["Net Ball", "Net Balls"],
    repeatball: ["Repeat Ball", "Repeat Balls"],
    timerball: ["Timer Ball", "Timer Balls"],
    diveball: ["Dive Ball", "Dive Balls"],
    duskball: ["Dusk Ball", "Dusk Balls"],
    quickball: ["Quick Ball", "Quick Balls"],
    fastball: ["Fast Ball", "Fast Balls"],
    lureball: ["Lure Ball", "Lure Balls"],
    moonball: ["Moon Ball", "Moon Balls"],
    heavyball: ["Heavy Ball", "Heavy Balls"],
    levelball: ["Level Ball", "Level Balls"],
    safariball: ["Safari Ball", "Safari Balls"],
    sportball: ["Sport Ball", "Sport Balls"],
    cherishball: ["Cherish Ball", "Cherish Balls"],
    gsball: ["GS Ball", "GS Balls"],
    ashball: ["Ash's Poké Ball", "Ash's Poké Balls"],
    cloneball: ["Clone Ball", "Clone Balls"],
    darkball: ["Dark Ball", "Dark Balls"],
    oldball: ["Old Ball", "Old Balls"],
    hisuipokeball: ["Hisui Poké Ball", "Hisui Poké Balls"],
    hisuigreatball: ["Hisui Great Ball", "Hisui Great Balls"],
    hisuiultraball: ["Hisui Ultra Ball", "Hisui Ultra Balls"],
    hisuiheavyball: ["Hisui Heavy Ball", "Hisui Heavy Balls"],
    featherball: ["Feather Ball", "Feather Balls"],
    wingball: ["Wing Ball", "Wing Balls"],
    jetball: ["Jet Ball", "Jet Balls"],
    leadenball: ["Leaden Ball", "Leaden Balls"],
    gigatonball: ["Gigaton Ball", "Gigaton Balls"],
    originball: ["Origin Ball", "Origin Balls"],
    strangeball: ["Strange Ball", "Strange Balls"],
    lure: ["Poké Radar", "Poké Radars"]
  };

  window.playGrantLines = function playGrantLines(grants) {
    const qty = grants || {};
    const keys = GRANT_ORDER.filter((key) => Number(qty[key]) > 0);
    Object.keys(qty).forEach((key) => {
      if (!keys.includes(key) && Number(qty[key]) > 0) keys.push(key);
    });
    return keys.map((key) => {
      const n = Number(qty[key]) || 0;
      const words = GRANT_WORDS[key];
      const label = key === "bag_bonus"
        ? `+${n} bag space`
        : `${n} ${words ? (n === 1 ? words[0] : words[1]) : window.playItemLabel(key)}`;
      return { key, n, label, sprite: window.playItemSprite(key) };
    });
  };

  window.playVariantLabel = function playVariantLabel(variant) {
    return VARIANT_LABELS[String(variant || "normal")] || variant;
  };

  window.playAllowedVariants = function playAllowedVariants(dex) {
    const all = window.PLAY_VARIANTS || {};
    const list = all[Number(dex)] || ["normal", "shiny"];
    return list.filter((name) => name === "normal" || name === "female" || name === "shiny" || name === "shiny-female");
  };

  window.playGenderRate = function playGenderRate(dex) {
    return GENDER_RATES[Number(dex)] ?? 4;
  };

  window.playGenderOptions = function playGenderOptions(dex) {
    if (!dex) return ["Male", "Female"];
    const rate = window.playGenderRate(dex);
    if (rate === -1) return ["Genderless"];
    if (rate === 0) return ["Male"];
    if (rate === 8) return ["Female"];
    return ["Male", "Female"];
  };

  window.playHabitat = function playHabitat(dex, fallback) {
    const named = String(fallback || "").trim();
    if (named) return named;
    return HABITATS[Number(dex)] || "Kanto";
  };

  window.playSpriteVariant = function playSpriteVariant(dex, gender, shiny) {
    const allowed = new Set(window.playAllowedVariants(dex));
    const female = String(gender || "") === "Female";
    if (shiny && female && (allowed.has("shiny-female") || allowed.has("female"))) return "shiny-female";
    if (shiny) return "shiny";
    if (female && allowed.has("female")) return "female";
    return "normal";
  };

  window.PLAY_ROUND_IDLE_AFTER_MS = 3 * 60 * 1000;

  window.playLocalPhase = function playLocalPhase(round) {
    if (!round || round.cancelled) return "closed";
    const d = round.deadlines || {};
    const now = Date.now();
    const at = (key) => {
      const t = Date.parse(d[key] || "");
      return Number.isFinite(t) ? t : 0;
    };
    const join = at("join");
    const prepare = at("prepare");
    const throwAt = at("throw");
    const reveal = at("reveal");
    if (join && now < join) return "join";
    if (prepare && now < prepare) return "prepare";
    if (throwAt && now < throwAt) return "throw";
    if (reveal && now < reveal) return "reveal";
    if (join || prepare || throwAt || reveal) return "closed";
    return round.phase || "closed";
  };

  window.playRoundIdleAt = function playRoundIdleAt(round) {
    if (!round) return 0;
    const from = Date.parse(round.deadlines?.reveal || round.endsAt || round.startedAt || "");
    if (!Number.isFinite(from)) return 0;
    return from + (window.PLAY_ROUND_IDLE_AFTER_MS || 180000);
  };

  window.playApplyLocalRound = function playApplyLocalRound(round) {
    if (!round) return round;
    const hasCatch = Number(round.results?.caught || 0) > 0 || (Array.isArray(round.catchers) && round.catchers.length > 0);
    if (round.cancelled && !hasCatch) return null;
    const phase = round.cancelled ? "closed" : window.playLocalPhase(round);
    const ends = round.deadlines?.[phase] || round.endsAt;
    const next = { ...round, phase, endsAt: ends || round.endsAt };
    if (phase === "closed") {
      const idleAt = window.playRoundIdleAt(round);
      if (!idleAt || Date.now() >= idleAt) return null;
    }
    return next;
  };

  window.playSpriteUrl = function playSpriteUrl(dex, variant) {
    const id = Number(dex);
    if (!id) return "";
    const kind = String(variant || "normal");
    const shiny = kind.includes("shiny");
    const female = kind.includes("female");
    if (shiny && female) return `images/pokemon/shiny/female/${id}.png`;
    if (female) return `images/pokemon/female/${id}.png`;
    if (shiny) return `images/pokemon/shiny/${id}.png`;
    return `images/pokemon/${id}.png`;
  };

  window.playSpriteOnError = function playSpriteOnError(img) {
    const src = String(img?.getAttribute("src") || "");
    const match = src.match(/(\d+)\.png(?:\?.*)?$/i);
    if (!img || !match) {
      if (img) img.onerror = null;
      return;
    }
    const id = match[1];
    if (src.includes("/shiny/female/")) img.src = `images/pokemon/shiny/${id}.png`;
    else if (src.includes("/female/")) img.src = `images/pokemon/${id}.png`;
    else if (src.includes("/shiny/")) img.src = `images/pokemon/${id}.png`;
    else img.onerror = null;
  };

  const ITEM_SPRITES = {
    pokeball: "poke-ball",
    greatball: "great-ball",
    ultraball: "ultra-ball",
    masterball: "master-ball",
    premierball: "premier-ball",
    luxuryball: "luxury-ball",
    healball: "heal-ball",
    friendball: "friend-ball",
    loveball: "love-ball",
    nestball: "nest-ball",
    netball: "net-ball",
    repeatball: "repeat-ball",
    timerball: "timer-ball",
    diveball: "dive-ball",
    duskball: "dusk-ball",
    quickball: "quick-ball",
    fastball: "fast-ball",
    lureball: "lure-ball",
    moonball: "moon-ball",
    heavyball: "heavy-ball",
    levelball: "level-ball",
    safariball: "safari-ball",
    sportball: "sport-ball",
    cherishball: "cherish-ball",
    gsball: "gs-ball",
    ashball: "ash-ball",
    cloneball: "clone-ball",
    darkball: "dark-ball",
    oldball: "old-ball",
    hisuipokeball: "hisui-poke-ball",
    hisuigreatball: "hisui-great-ball",
    hisuiultraball: "hisui-ultra-ball",
    hisuiheavyball: "hisui-heavy-ball",
    featherball: "feather-ball",
    wingball: "wing-ball",
    jetball: "jet-ball",
    leadenball: "leaden-ball",
    gigatonball: "gigaton-ball",
    originball: "origin-ball",
    strangeball: "strange-ball",
    berry: "oran-berry",
    bait: "honey",
    lure: "poke-radar",
    coins: "relic-gold",
    bag_bonus: "explorer-kit",
    pass: "rainbow-pass",
    poke5: "poke-ball",
    great3: "great-ball",
    ultra1: "ultra-ball",
    master1: "master-ball",
    premier1: "premier-ball",
    luxury1: "luxury-ball",
    heal1: "heal-ball",
    friend1: "friend-ball",
    love1: "love-ball",
    nest1: "nest-ball",
    net1: "net-ball",
    repeat1: "repeat-ball",
    timer1: "timer-ball",
    dive1: "dive-ball",
    dusk1: "dusk-ball",
    quick1: "quick-ball",
    fast1: "fast-ball",
    lureball1: "lure-ball",
    moon1: "moon-ball",
    heavy1: "heavy-ball",
    level1: "level-ball",
    safari1: "safari-ball",
    sport1: "sport-ball",
    cherish1: "cherish-ball",
    gs1: "gs-ball",
    ash1: "ash-ball",
    clone1: "clone-ball",
    dark1: "dark-ball",
    old1: "old-ball",
    hisuipoke1: "hisui-poke-ball",
    hisuigreat1: "hisui-great-ball",
    hisuiultra1: "hisui-ultra-ball",
    hisuiheavy1: "hisui-heavy-ball",
    feather1: "feather-ball",
    wing1: "wing-ball",
    jet1: "jet-ball",
    leaden1: "leaden-ball",
    gigaton1: "gigaton-ball",
    origin1: "origin-ball",
    strange1: "strange-ball",
    berry5: "oran-berry",
    bait5: "honey",
    radar1: "poke-radar",
    lure1: "poke-radar",
    pouch10: "explorer-kit",
    "bits-starter": "poke-ball",
    "bits-great": "great-ball",
    "bits-ultra": "ultra-ball",
    "bits-pantry": "oran-berry",
    "bits-pouch": "explorer-kit"
  };

  const ITEM_RAW_BASE = "https://raw.githubusercontent.com/sorastarlight/starlight-play/main/images/items/";

  window.playItemSprite = function playItemSprite(key) {
    const raw = String(key || "").trim();
    if (!raw) return "images/items/poke-ball.png";
    if (raw.startsWith("species-") && raw.endsWith("-xl")) return "images/items/lgpe-candy-xl.png";
    if (raw.startsWith("species-") && raw.endsWith("-l")) return "images/items/lgpe-candy-l.png";
    if (raw.startsWith("species-")) return "images/items/lgpe-candy.png";
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (raw.includes("/")) return raw;
    if (raw === "premium-avatars.png") return "images/trainers/premium-avatars.png";
    if (/\.(png|webp|gif|jpe?g)$/i.test(raw)) return `images/items/${raw}`;
    const slug = ITEM_SPRITES[key] || ITEM_SPRITES[raw] || "poke-ball";
    return `images/items/${slug}.png`;
  };

  window.playItemRawUrl = function playItemRawUrl(key) {
    const raw = String(key || "").trim();
    if (!raw || /^(data:|blob:)/i.test(raw)) return "";
    const name = raw.replace(/\\/g, "/").split("/").pop() || "";
    if (!/\.(png|webp|gif|jpe?g)$/i.test(name)) return "";
    return ITEM_RAW_BASE + encodeURIComponent(name);
  };

  document.addEventListener("error", (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.playRawTried) return;
    const src = img.currentSrc || img.getAttribute("src") || "";
    if (!/images\/items\//.test(src) || src.includes("raw.githubusercontent.com")) return;
    const raw = window.playItemRawUrl(src);
    if (!raw) return;
    img.dataset.playRawTried = "1";
    img.src = raw;
  }, true);

  window.playMartArt = function playMartArt(item, fallback) {
    const src = (item && (item.thumb || item.sprite)) || fallback || item?.sku || item?.ballKey;
    return window.playItemSprite(src);
  };

  window.playParseCoins = function playParseCoins(raw) {
    const text = String(raw ?? "").replace(/[^0-9.]/g, "");
    if (!text || text === ".") return 0;
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  };

  window.playFormatCoins = function playFormatCoins(n) {
    if (n == null || n === "") return "—";
    const value = Number(n);
    if (!Number.isFinite(value)) return "—";
    const rounded = Math.round(value * 100) / 100;
    const frac = Math.abs(rounded - Math.round(rounded)) > 1e-9;
    return rounded.toLocaleString("en-US", {
      minimumFractionDigits: frac ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  window.playCoinsHtml = function playCoinsHtml(n) {
    return `<span class="poke-cash"><span class="poke-cash-mark" aria-hidden="true">₽</span><span>${window.playFormatCoins(n)}</span></span>`;
  };

  window.playCandyLabel = function playCandyLabel(key) {
    const raw = String(key || "");
    const species = raw.match(/^species-(\d+)(-l|-xl)?$/);
    if (species) {
      const name = window.playSpeciesName(Number(species[1]));
      if (species[2] === "-xl") return `${name} Candy XL`;
      if (species[2] === "-l") return `${name} Candy L`;
      return `${name} Candy`;
    }
    return window.playItemLabel(raw) || raw;
  };

  window.playPadDex = function playPadDex(dex) {
    return String(Number(dex) || 0).padStart(3, "0");
  };

  window.playParseSpeciesQuery = function playParseSpeciesQuery(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    const names = window.PLAY_SPECIES || [];
    const numbered = raw.match(/^0*(\d{1,3})(?:\s+(.+))?$/);
    if (numbered) {
      const n = Number(numbered[1]);
      if (n >= 1 && n <= names.length) {
        const name = names[n - 1];
        const rest = (numbered[2] || "").trim().toLowerCase();
        if (!rest || name.toLowerCase() === rest || name.toLowerCase().startsWith(rest)) {
          return [{ dex: n, name }];
        }
      }
      return [];
    }
    const q = raw.toLowerCase();
    const exact = [];
    const prefix = [];
    names.forEach((name, index) => {
      const lower = name.toLowerCase();
      if (lower === q) exact.push({ dex: index + 1, name });
      else if (lower.startsWith(q)) prefix.push({ dex: index + 1, name });
    });
    return exact.concat(prefix);
  };

  window.playSpeciesName = function playSpeciesName(dex) {
    const names = window.PLAY_SPECIES || [];
    return names[Number(dex) - 1] || `No. ${dex}`;
  };

  window.playPhaseLabel = function playPhaseLabel(phase) {
    return ({
      join: "Join",
      prepare: "Prepare",
      throw: "Throw",
      reveal: "Results",
      closed: "Idle"
    })[phase] || "Idle";
  };

  window.playRpcError = function playRpcError(error, fallback) {
    const message = error?.message || fallback || "That action did not work.";
    return message
      .replace(/^.*error:\s*/i, "")
      .replace(/\s+CONTEXT:[\s\S]*$/, "")
      .replace(/Mix It Up/gi, "the stream");
  };

  window.playSecondsLeft = function playSecondsLeft(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  };

  window.playDisplayName = function playDisplayName(round, options) {
    if (!round?.name) return "a wild Pokémon";
    const shiny = String(round.variant || "").includes("shiny");
    if (options?.plain) return round.name;
    if (shiny) return `Shiny ${round.name}`;
    return round.name;
  };

  window.playWatchHours = function playWatchHours(seconds) {
    const hours = Math.max(0, Number(seconds || 0) / 3600);
    if (hours < 10) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours)}h`;
  };

  window.playMonCp = function playMonCp(mon) {
    if (Number(mon?.cp) > 0) return Number(mon.cp);
    const stats = mon?.stats || {};
    const atk = Math.max(1, Number(stats.atk || 10));
    const def = Math.max(1, Number(stats.def || 10));
    const hp = Math.max(1, Number(stats.hp || 10));
    const level = Math.max(1, Number(mon?.level || 1));
    const cpm = 0.094 + 0.0176 * Math.min(level, 40);
    return Math.max(10, Math.floor((atk * Math.sqrt(def) * Math.sqrt(hp) * cpm * cpm) / 10));
  };

  window.playCall = async function playCall(name, args) {
    const { data, error } = await window.playSupabase.rpc(name, args || {});
    if (error) throw error;
    return data;
  };
})();
