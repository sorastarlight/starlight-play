(() => {
  const ITEM_LABELS = {
    berry: "Oran Berry",
    bait: "Honey",
    cheri: "Cheri Berry",
    chesto: "Chesto Berry",
    pecha: "Pecha Berry",
    rawst: "Rawst Berry",
    aspear: "Aspear Berry",
    leppa: "Leppa Berry",
    persim: "Persim Berry",
    lum: "Lum Berry",
    sitrus: "Sitrus Berry",
    figy: "Figy Berry",
    wiki: "Wiki Berry",
    mago: "Mago Berry",
    aguav: "Aguav Berry",
    iapapa: "Iapapa Berry",
    razz: "Razz Berry",
    bluk: "Bluk Berry",
    nanab: "Nanab Berry",
    wepear: "Wepear Berry",
    pinap: "Pinap Berry",
    goldenrazz: "Golden Razz Berry",
    silverpinap: "Silver Pinap Berry",
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
    bag_bonus: "inventory space",
    firestone: "Fire Stone",
    waterstone: "Water Stone",
    thunderstone: "Thunder Stone",
    leafstone: "Leaf Stone",
    moonstone: "Moon Stone",
    linkingcord: "Linking Cord",
    rarecandy: "Rare Candy",
    choice_stone: "Evolution Stone"
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

  // Catch power mirrors public.capture_balls. The server is still the only place
  // a real chance is calculated; these strings just describe the effect.
  const PLAIN = "Standard catch power.";
  const COLLECTOR = "Collector Ball. Same catch power as a Poké Ball.";
  window.PLAY_BALLS = [
    { key: "pokeball", sku: "poke5", name: "Poké Ball", qty: 1, cost: 100, multiplier: "1.00×", effect: "1.00× catch power. A standard Poké Ball for catching wild Pokémon.", sprite: "poke-ball", extra: false },
    { key: "greatball", sku: "great3", name: "Great Ball", qty: 1, cost: 225, multiplier: "1.25×", effect: "1.25× catch power. A higher-performance Poké Ball.", sprite: "great-ball", extra: false },
    { key: "ultraball", sku: "ultra1", name: "Ultra Ball", qty: 1, cost: 500, multiplier: "1.50×", effect: "1.50× catch power. Best saved for Pokémon you really want.", sprite: "ultra-ball", extra: false },
    { key: "masterball", sku: "master1", name: "Master Ball", qty: 1, cost: 10000, multiplier: "Always", effect: "Never fails to catch a wild Pokémon. Not sold on the ordinary shelf.", sprite: "master-ball", extra: true },
    { key: "premierball", sku: "premier1", name: "Premier Ball", qty: 1, cost: 100, multiplier: "1×", effect: "Collector Ball. Same catch power as a Poké Ball. Bonus gift when you buy 10 qualifying Balls.", sprite: "premier-ball", extra: true, collector: true },
    { key: "luxuryball", sku: "luxury1", name: "Luxury Ball", qty: 1, cost: 100, multiplier: "1×", effect: "Collector Ball. Same catch power as a Poké Ball.", sprite: "luxury-ball", extra: true, collector: true },
    { key: "healball", sku: "heal1", name: "Heal Ball", qty: 1, cost: 100, multiplier: "1×", effect: "Collector Ball. Same catch power as a Poké Ball.", sprite: "heal-ball", extra: true, collector: true },
    { key: "friendball", sku: "friend1", name: "Friend Ball", qty: 1, cost: 100, multiplier: "1×", effect: "Collector Ball. Same catch power as a Poké Ball. Friendship is not used in this RPG.", sprite: "friend-ball", extra: true, collector: true },
    { key: "loveball", sku: "love1", name: "Love Ball", qty: 1, cost: 300, multiplier: "1× / 1.40×", effect: "Stronger against Pokémon that have a gender. Ordinary on genderless Pokémon.", sprite: "love-ball", extra: true },
    { key: "nestball", sku: "nest1", name: "Nest Ball", qty: 1, cost: 275, multiplier: "up to 1.45×", effect: "Best against common, easily caught Pokémon.", sprite: "nest-ball", extra: true },
    { key: "netball", sku: "net1", name: "Net Ball", qty: 1, cost: 300, multiplier: "up to 1.55×", effect: "Best against Water- and Bug-type Pokémon.", sprite: "net-ball", extra: true },
    { key: "repeatball", sku: "repeat1", name: "Repeat Ball", qty: 1, cost: 350, multiplier: "up to 1.55×", effect: "Best against Pokémon you have already caught.", sprite: "repeat-ball", extra: true },
    { key: "timerball", sku: "timer1", name: "Timer Ball", qty: 1, cost: 300, multiplier: "1× / 1.50×", effect: "Stronger later in the throw phase. Ordinary if you throw immediately.", sprite: "timer-ball", extra: true },
    { key: "diveball", sku: "dive1", name: "Dive Ball", qty: 1, cost: 300, multiplier: "up to 1.5×", effect: "Best against Water-type Pokémon.", sprite: "dive-ball", extra: true },
    { key: "duskball", sku: "dusk1", name: "Dusk Ball", qty: 1, cost: 325, multiplier: "up to 1.5×", effect: "Best at night on the stream clock.", sprite: "dusk-ball", extra: true },
    { key: "quickball", sku: "quick1", name: "Quick Ball", qty: 1, cost: 350, multiplier: "1× / 1.55×", effect: "Stronger if you choose it immediately in the throw phase. Ordinary if you wait.", sprite: "quick-ball", extra: true },
    { key: "fastball", sku: "fast1", name: "Fast Ball", qty: 1, cost: 325, multiplier: "up to 1.55×", effect: "Best against very fast Pokémon.", sprite: "fast-ball", extra: true },
    { key: "lureball", sku: "lureball1", name: "Lure Ball", qty: 1, cost: 300, multiplier: "up to 1.5×", effect: "Best against Water-type Pokémon.", sprite: "lure-ball", extra: true },
    { key: "moonball", sku: "moon1", name: "Moon Ball", qty: 1, cost: 325, multiplier: "up to 1.6×", effect: "Best against Moon Stone evolution families.", sprite: "moon-ball", extra: true },
    { key: "heavyball", sku: "heavy1", name: "Heavy Ball", qty: 1, cost: 325, multiplier: "up to 1.55×", effect: "Best against very heavy Pokémon.", sprite: "heavy-ball", extra: true },
    { key: "levelball", sku: "level1", name: "Level Ball", qty: 1, cost: 300, multiplier: "1× / 1.40×", effect: "Stronger for experienced Trainers (Lv. 8+). Ordinary before then.", sprite: "level-ball", extra: true },
    { key: "safariball", sku: "safari1", name: "Safari Ball", qty: 1, cost: 125, multiplier: "1.1×", effect: "A small edge over a Poké Ball.", sprite: "safari-ball", extra: true },
    { key: "sportball", sku: "sport1", name: "Sport Ball", qty: 1, cost: 125, multiplier: "1.1×", effect: "A small edge over a Poké Ball.", sprite: "sport-ball", extra: true },
    { key: "cherishball", sku: "cherish1", name: "Cherish Ball", qty: 1, cost: 125, multiplier: "1×", effect: COLLECTOR, sprite: "cherish-ball", extra: true, collector: true },
    { key: "gsball", sku: "gs1", name: "GS Ball", qty: 1, cost: 125, multiplier: "1×", effect: COLLECTOR, sprite: "gs-ball", extra: true, collector: true },
    { key: "ashball", sku: "ash1", name: "Ash's Poké Ball", qty: 1, cost: 125, multiplier: "1×", effect: COLLECTOR, sprite: "ash-ball", extra: true, collector: true },
    { key: "cloneball", sku: "clone1", name: "Clone Ball", qty: 1, cost: 125, multiplier: "1×", effect: COLLECTOR, sprite: "clone-ball", extra: true, collector: true },
    { key: "darkball", sku: "dark1", name: "Dark Ball", qty: 1, cost: 125, multiplier: "1×", effect: COLLECTOR, sprite: "dark-ball", extra: true, collector: true },
    { key: "oldball", sku: "old1", name: "Old Ball", qty: 1, cost: 110, multiplier: "1×", effect: COLLECTOR, sprite: "old-ball", extra: true, collector: true },
    { key: "hisuipokeball", sku: "hisuipoke1", name: "Hisuian Poké Ball", qty: 1, cost: 100, multiplier: "1×", effect: COLLECTOR, sprite: "hisui-poke-ball", extra: true, collector: true },
    { key: "hisuigreatball", sku: "hisuigreat1", name: "Hisuian Great Ball", qty: 1, cost: 225, multiplier: "1.25×", effect: "A Hisuian Great Ball with the same catch power as a Great Ball.", sprite: "hisui-great-ball", extra: true },
    { key: "hisuiultraball", sku: "hisuiultra1", name: "Hisuian Ultra Ball", qty: 1, cost: 500, multiplier: "1.5×", effect: "A Hisuian Ultra Ball with the same catch power as an Ultra Ball.", sprite: "hisui-ultra-ball", extra: true },
    { key: "featherball", sku: "feather1", name: "Feather Ball", qty: 1, cost: 100, multiplier: "1×", effect: COLLECTOR, sprite: "feather-ball", extra: true, collector: true },
    { key: "wingball", sku: "wing1", name: "Wing Ball", qty: 1, cost: 225, multiplier: "1.25×", effect: "A Hisuian Wing Ball with Great Ball catch power.", sprite: "wing-ball", extra: true },
    { key: "jetball", sku: "jet1", name: "Jet Ball", qty: 1, cost: 500, multiplier: "1.5×", effect: "A Hisuian Jet Ball with Ultra Ball catch power.", sprite: "jet-ball", extra: true },
    { key: "hisuiheavyball", sku: "hisuiheavy1", name: "Hisuian Heavy Ball", qty: 1, cost: 100, multiplier: "1×", effect: COLLECTOR, sprite: "hisui-heavy-ball", extra: true, collector: true },
    { key: "leadenball", sku: "leaden1", name: "Leaden Ball", qty: 1, cost: 225, multiplier: "1.25×", effect: "A Hisuian Leaden Ball with Great Ball catch power.", sprite: "leaden-ball", extra: true },
    { key: "gigatonball", sku: "gigaton1", name: "Gigaton Ball", qty: 1, cost: 500, multiplier: "1.5×", effect: "A Hisuian Gigaton Ball with Ultra Ball catch power.", sprite: "gigaton-ball", extra: true },
    { key: "originball", sku: "origin1", name: "Origin Ball", qty: 1, cost: 150, multiplier: "1×", effect: COLLECTOR, sprite: "origin-ball", extra: true, collector: true },
    { key: "strangeball", sku: "strange1", name: "Strange Ball", qty: 1, cost: 110, multiplier: "1×", effect: COLLECTOR, sprite: "strange-ball", extra: true, collector: true },
    { key: "dreamball", sku: "dream1", name: "Dream Ball", qty: 1, cost: 350, multiplier: "1×", effect: "Collector Ball. Sleep conditions do not exist in this RPG, so it matches a Poké Ball.", sprite: "dream-ball", extra: true, collector: true },
    { key: "beastball", sku: "beast1", name: "Beast Ball", qty: 1, cost: 225, multiplier: "0.75×", effect: "Best saved for Ultra Beasts. Weaker than a Poké Ball against ordinary Pokémon.", sprite: "beast-ball", extra: true }
  ];

  // Fallback Berry shelf for pages that render before a snapshot arrives.
  // The live list comes from the server as snapshot.captureItems.berries.
  window.PLAY_BERRIES = [
    { key: "berry", name: "Oran Berry", sprite: "oran-berry", tier: "common", description: "A tasty Berry that makes a wild Pokémon a little easier to catch." },
    { key: "cheri", name: "Cheri Berry", sprite: "cheri-berry", tier: "common", description: "A tasty Berry that makes a wild Pokémon a little easier to catch." },
    { key: "chesto", name: "Chesto Berry", sprite: "chesto-berry", tier: "common", description: "A tasty Berry that makes a wild Pokémon a little easier to catch." },
    { key: "pecha", name: "Pecha Berry", sprite: "pecha-berry", tier: "common", description: "A tasty Berry that makes a wild Pokémon a little easier to catch." },
    { key: "rawst", name: "Rawst Berry", sprite: "rawst-berry", tier: "common", description: "A tasty Berry that makes a wild Pokémon a little easier to catch." },
    { key: "aspear", name: "Aspear Berry", sprite: "aspear-berry", tier: "common", description: "A tasty Berry that makes a wild Pokémon a little easier to catch." },
    { key: "nanab", name: "Nanab Berry", sprite: "nanab-berry", tier: "common", description: "The cheap everyday Berry. Same small catch help as Oran, sold as the common option." },
    { key: "pinap", name: "Pinap Berry", sprite: "pinap-berry", tier: "common", description: "Small catch help, plus extra PokéCoins if you catch this Pokémon." },
    { key: "sitrus", name: "Sitrus Berry", sprite: "sitrus-berry", tier: "better", description: "A quality Berry that makes a wild Pokémon easier to catch." },
    { key: "lum", name: "Lum Berry", sprite: "lum-berry", tier: "better", description: "A quality Berry that makes a wild Pokémon easier to catch." },
    { key: "razz", name: "Razz Berry", sprite: "razz-berry", tier: "specialty", description: "The dependable catch Berry. A clear upgrade over common Berries." },
    { key: "silverpinap", name: "Silver Pinap Berry", sprite: "pinap-berry", tier: "premium", description: "Strong catch help plus a smaller coin bonus on a successful catch." },
    { key: "goldenrazz", name: "Golden Razz Berry", sprite: "razz-berry", tier: "premium", description: "Rare, expensive catch help. Save it for Pokémon you really want." }
  ];

  window.playItemLabel = function playItemLabel(item) {
    return ITEM_LABELS[item] || item;
  };

  window.playBallInfo = function playBallInfo(key) {
    return (window.PLAY_BALLS || []).find((row) => row.key === key) || null;
  };

  window.playBerryCatalog = function playBerryCatalog(captureItems) {
    const live = captureItems?.berries;
    return Array.isArray(live) && live.length ? live : (window.PLAY_BERRIES || []);
  };

  window.playBerryInfo = function playBerryInfo(key, captureItems) {
    return window.playBerryCatalog(captureItems).find((row) => row.key === key) || null;
  };

  window.playOwnedBerries = function playOwnedBerries(bag, captureItems) {
    return window.playBerryCatalog(captureItems)
      .map((row) => ({ ...row, qty: Number(bag?.[row.key] || 0) }))
      .filter((row) => row.qty > 0);
  };

  // Auto-prepare spends the plainest Berry on hand so nobody burns a Golden Razz
  // on a Rattata without choosing to.
  const BERRY_TIER_ORDER = ["common", "better", "specialty", "premium"];
  window.playAutoBerryKey = function playAutoBerryKey(bag, captureItems) {
    const owned = window.playOwnedBerries(bag, captureItems);
    if (!owned.length) return null;
    const rank = (row) => {
      const tier = BERRY_TIER_ORDER.indexOf(String(row.tier || "common"));
      return (tier < 0 ? 0 : tier) * 10 + (row.key === "berry" ? 0 : 1);
    };
    return owned.slice().sort((a, b) => rank(a) - rank(b))[0].key;
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
    berry: ["Oran Berry", "Oran Berries"],
    cheri: ["Cheri Berry", "Cheri Berries"],
    chesto: ["Chesto Berry", "Chesto Berries"],
    pecha: ["Pecha Berry", "Pecha Berries"],
    rawst: ["Rawst Berry", "Rawst Berries"],
    aspear: ["Aspear Berry", "Aspear Berries"],
    leppa: ["Leppa Berry", "Leppa Berries"],
    persim: ["Persim Berry", "Persim Berries"],
    lum: ["Lum Berry", "Lum Berries"],
    sitrus: ["Sitrus Berry", "Sitrus Berries"],
    figy: ["Figy Berry", "Figy Berries"],
    wiki: ["Wiki Berry", "Wiki Berries"],
    mago: ["Mago Berry", "Mago Berries"],
    aguav: ["Aguav Berry", "Aguav Berries"],
    iapapa: ["Iapapa Berry", "Iapapa Berries"],
    razz: ["Razz Berry", "Razz Berries"],
    bluk: ["Bluk Berry", "Bluk Berries"],
    nanab: ["Nanab Berry", "Nanab Berries"],
    wepear: ["Wepear Berry", "Wepear Berries"],
    pinap: ["Pinap Berry", "Pinap Berries"],
    goldenrazz: ["Golden Razz Berry", "Golden Razz Berries"],
    silverpinap: ["Silver Pinap Berry", "Silver Pinap Berries"],
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

  window.PLAY_ROUND_IDLE_AFTER_MS = 12 * 1000;
  window.PLAY_RESULT_HOLD_MS = window.PLAY_RESULT_HOLD_MS || 5 * 1000;
  window.PLAY_UNRESOLVED_KEEP_MS = window.PLAY_UNRESOLVED_KEEP_MS || 120 * 1000;

  if (typeof window.playPhaseRank !== "function") {
    window.playPhaseRank = function playPhaseRank(phase) {
      return ({ join: 1, prepare: 2, throw: 3, reveal: 4, closed: 5 }[phase] || 0);
    };
  }

  if (typeof window.playLocalPhase !== "function") {
    window.playLocalPhase = function playLocalPhase(round) {
      if (!round || round.cancelled) return "closed";
      const d = round.deadlines || {};
      const pause = Date.parse(round.pausedAt || "");
      const freeze = round.paused && Number.isFinite(pause) && !round.resolved;
      const now = freeze ? pause : Date.now();
      const at = (key) => {
        const t = Date.parse(d[key] || "");
        return Number.isFinite(t) ? t : 0;
      };
      const join = at("join");
      const prepare = at("prepare");
      const throwAt = at("throw");
      const reveal = at("reveal");
      if (!join || !prepare || !throwAt || !reveal) {
        return round.phase || "closed";
      }
      if (now < join) return "join";
      if (now < prepare) return "prepare";
      if (now < throwAt) return "throw";
      if (now < reveal) return "reveal";
      return "closed";
    };
  }

  window.playIsThrowWindow = function playIsThrowWindow(round) {
    if (!round || round.cancelled || round.paused) return false;
    return (round.phase || window.playLocalPhase(round)) === "throw";
  };

  if (typeof window.playRoundIdleAt !== "function") {
    window.playRoundIdleAt = function playRoundIdleAt(round) {
      if (!round) return 0;
      const hold = window.PLAY_RESULT_HOLD_MS || window.PLAY_ROUND_IDLE_AFTER_MS || 12000;
      const updated = Date.parse(round.updatedAt || round.updated_at || "");
      if (round.cancelled) {
        return (Number.isFinite(updated) ? updated : Date.now()) + hold;
      }
      if (round.resolved) {
        const from = Number.isFinite(updated) ? updated : Date.parse(round.deadlines?.reveal || round.endsAt || "");
        if (!Number.isFinite(from)) return 0;
        return from + hold;
      }
      const reveal = Date.parse(round.deadlines?.reveal || round.endsAt || "");
      if (!Number.isFinite(reveal)) return 0;
      return reveal + (window.PLAY_UNRESOLVED_KEEP_MS || 120000);
    };
  }

  if (typeof window.playApplyLocalRound !== "function") {
    window.playApplyLocalRound = function playApplyLocalRound(round) {
      if (!round) return null;
      const local = window.playLocalPhase(round);
      const idleAt = window.playRoundIdleAt(round);
      if (idleAt && Date.now() >= idleAt && !round.paused) return null;
      if (round.cancelled) return { ...round, phase: "closed" };
      const revealAt = Date.parse(round.deadlines?.reveal || round.endsAt || "");
      const freeze = round.paused && !round.resolved;
      const revealPassed = Number.isFinite(revealAt) && Date.now() >= revealAt && !freeze;
      const shownPhase = revealPassed ? "closed" : local;
      const ends = round.deadlines?.[shownPhase] || round.endsAt;
      return { ...round, phase: shownPhase, endsAt: ends || round.endsAt };
    };
  }

  window.playOwnedBalls = function playOwnedBalls(bag) {
    return (window.PLAY_BALLS || []).filter((row) => Number(bag?.[row.key] || 0) > 0);
  };

  window.playEncounterSettings = function playEncounterSettings(raw) {
    const next = raw && typeof raw === "object" ? raw : {};
    const balls = Array.isArray(next.favoriteBalls)
      ? next.favoriteBalls.filter((key, index, list) => list.indexOf(key) === index && window.playBallInfo(key)).slice(0, 6)
      : [];
    const prep = ["berry", "bait", "ask"].includes(next.defaultPrep) ? next.defaultPrep : "ask";
    return {
      favoriteBalls: balls.length ? balls : ["pokeball", "greatball", "ultraball"],
      defaultPrep: prep,
      autoPrep: Boolean(next.autoPrep),
      autoThrow: Boolean(next.autoThrow)
    };
  };

  window.playFavoriteBalls = function playFavoriteBalls(bag, settings) {
    const owned = window.playOwnedBalls(bag);
    const prefs = window.playEncounterSettings(settings);
    const picked = prefs.favoriteBalls
      .map((key) => owned.find((row) => row.key === key))
      .filter(Boolean);
    if (picked.length) return picked;
    return owned.slice(0, 3);
  };

  window.playThrowableTotal = function playThrowableTotal(bag) {
    return (window.PLAY_BALLS || []).reduce((sum, row) => sum + Number(bag?.[row.key] || 0), 0);
  };

  window.playBallAdvice = function playBallAdvice(key, round) {
    const types = (Array.isArray(round?.types) ? round.types : [])
      .map((type) => String(type || "").toLowerCase());
    const has = (...need) => need.some((type) => types.includes(type));
    if (key === "netball" && has("water", "bug")) return "★ Great choice for this type";
    if ((key === "diveball" || key === "lureball") && has("water")) return "★ Great choice for Water types";
    if (key === "duskball") {
      const hour = new Date().getHours();
      if (hour >= 20 || hour < 6) return "★ Great choice at night";
    }
    if (key === "moonball" && [29, 30, 31, 32, 33, 34, 35, 36, 39, 40].includes(Number(round?.dex))) {
      return "★ Great choice for this family";
    }
    if (key === "ultraball" || key === "hisuiultraball" || key === "jetball" || key === "gigatonball") {
      return "★ Strong general-purpose Ball";
    }
    if (key === "pokeball" || key === "hisuipokeball" || key === "premierball") {
      return "Standard effectiveness";
    }
    return "";
  };

  window.playVariantIsShiny = function playVariantIsShiny(variant) {
    return String(variant || "").toLowerCase().includes("shiny");
  };

  window.playVariantIsFemaleVisual = function playVariantIsFemaleVisual(variant) {
    return String(variant || "").toLowerCase().includes("female");
  };

  window.playIsBaseForm = function playIsBaseForm(formId, dex) {
    const id = Number(formId);
    const d = Number(dex);
    if (!id || !d) return true;
    if (id === d) return true;
    const meta = window.playFormMeta(id);
    return !meta || meta.isBase === true || meta.dex !== d;
  };

  window.playFormId = function playFormId(dex, formId) {
    const d = Number(dex);
    if (!d) return null;
    const id = Number(formId);
    if (!id || id === d) return d;
    const meta = window.playFormMeta(id);
    if (!meta || Number(meta.dex) !== d) return d;
    return id;
  };

  window.playFormMeta = function playFormMeta(formId) {
    const id = Number(formId);
    if (!id) return null;
    const catalog = window.PLAY_FORMS || {};
    return catalog[id] || catalog[String(id)] || null;
  };

  window.playFormDisplayName = function playFormDisplayName(dex, formId) {
    const d = Number(dex);
    const id = window.playFormId(d, formId);
    const meta = window.playFormMeta(id);
    if (meta && meta.displayName) return meta.displayName;
    const species = typeof window.playSpeciesName === "function" ? window.playSpeciesName(d) : `No. ${d}`;
    if (!meta || meta.isBase || id === d) return species;
    return `${species} — ${meta.formLabel || "Form"}`;
  };

  window.playFormsForDex = function playFormsForDex(dex, opts) {
    const d = Number(dex);
    if (!d) return [];
    const ids = (window.PLAY_FORM_BY_DEX && (window.PLAY_FORM_BY_DEX[d] || window.PLAY_FORM_BY_DEX[String(d)])) || [];
    const wantAdmin = !opts || opts.admin !== false;
    const wantEvent = opts && opts.event === true;
    return ids
      .map((id) => window.playFormMeta(id))
      .filter(Boolean)
      .filter((f) => {
        if (f.isBase) return true;
        if (wantEvent) return !!f.eventTargetable;
        if (wantAdmin) return !!f.adminTargetable;
        return false;
      });
  };

  window.playResolveFormId = function playResolveFormId(entity) {
    if (!entity) return null;
    const dex = Number(entity.dex || entity.speciesDex || 0);
    const fromPokemon = entity.pokemon && (entity.pokemon.formId || entity.pokemon.pokemonFormId);
    const raw = entity.formId || entity.pokemonFormId || fromPokemon || entity.pokemon_form_id;
    return window.playFormId(dex, raw);
  };

  window.playSpriteStem = function playSpriteStem(dex, variant, formId) {
    const id = Number(dex);
    if (!id) return "";
    const resolvedForm = window.playFormId(id, formId);
    const formMeta = window.playFormMeta(resolvedForm);
    const useFormStem = formMeta && !formMeta.isBase && resolvedForm && resolvedForm !== id;

    // Roster freeze: never interpret mega/regional tokens on the variant axis.
    let kind = String(variant || "normal").toLowerCase();
    if (/(mega|alola|alolan|galar|galarian|hisui|hisuian|paldea|gmax|gigantamax|totem|cosplay|belle|libre|phd|popstar|rockstar|cap\b|back\b)/i.test(kind)) {
      if (typeof console !== "undefined") {
        console.warn(`[play] refused non-base sprite form for dex ${id}: ${kind}`);
      }
      kind = kind.includes("shiny") ? "shiny" : "normal";
    }
    const catalog = window.PLAY_VARIANTS;
    const allowed = new Set(typeof window.playAllowedVariants === "function" ? window.playAllowedVariants(id) : []);
    const shiny = kind.includes("shiny");
    const wantsFemale = kind.includes("female");
    const female = !useFormStem && wantsFemale && (!catalog || allowed.has("female") || allowed.has("shiny-female"));

    if (useFormStem) {
      if (shiny && female) return `forms/shiny/female/${resolvedForm}`;
      if (female) return `forms/female/${resolvedForm}`;
      if (shiny) return `forms/shiny/${resolvedForm}`;
      return `forms/${resolvedForm}`;
    }
    if (shiny && female) return `shiny/female/${id}`;
    if (female) return `female/${id}`;
    if (shiny) return `shiny/${id}`;
    return String(id);
  };

  window.playSpriteUrl = function playSpriteUrl(dex, variant, formId) {
    const id = Number(dex);
    if (!id) return "";
    const stem = window.playSpriteStem(id, variant, formId);
    const ext = (window.PLAY_SPRITE_EXT && window.PLAY_SPRITE_EXT[stem]) || "gif";
    const url = `images/pokemon/${stem}.${ext}`;
    const stamp = window.PLAY_SPRITE_BUILD;
    const stamped = stamp ? `${url}?v=${stamp}` : url;
    const kind = String(variant || "normal").toLowerCase();
    const catalog = window.PLAY_VARIANTS;
    const listed = catalog && catalog[id];
    if (typeof console !== "undefined" && catalog && kind.includes("female") && !String(stem).includes("female") && Array.isArray(listed) && listed.includes("female")) {
      console.warn(`[play] ${id} variant ${kind} has no female visual; requesting ${url}`);
    }
    return stamped;
  };

  window.playSpriteOnError = function playSpriteOnError(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.playSpriteDone || img.dataset.playSpriteLock) return;
    const src = String(img.getAttribute("src") || img.currentSrc || "");
    const formMatch = src.match(/images\/pokemon\/forms\/(?:(shiny)\/)?(?:(female)\/)?(\d+)\.(gif|png)(?:\?.*)?$/i);
    const baseMatch = src.match(/images\/pokemon\/(?:(shiny)\/)?(?:(female)\/)?(\d+)\.(gif|png)(?:\?.*)?$/i);
    const match = formMatch || baseMatch;
    if (!match) {
      img.dataset.playSpriteDone = "1";
      return;
    }
    img.dataset.playSpriteLock = "1";
    const isForm = Boolean(formMatch);
    const shiny = Boolean(match[1]);
    const female = Boolean(match[2]);
    const id = match[3];
    const ext = match[4].toLowerCase();
    let next = "";
    const stamp = window.PLAY_SPRITE_BUILD ? `?v=${window.PLAY_SPRITE_BUILD}` : "";
    const root = isForm ? "images/pokemon/forms" : "images/pokemon";
    if (ext === "gif") next = src.replace(/\.gif(?:\?.*)?$/i, `.png${stamp}`);
    else if (shiny && female) next = `${root}/shiny/${id}.gif${stamp}`;
    else if (female) next = `${root}/${id}.gif${stamp}`;
    else if (shiny) next = `${root}/${id}.gif${stamp}`;
    // Never fall across forms or into Back artwork.
    if (!next || next.split("?")[0] === src.split("?")[0]) {
      img.dataset.playSpriteDone = "1";
      delete img.dataset.playSpriteLock;
      if (typeof window.playLogAssetEvent === "function") {
        window.playLogAssetEvent({
          kind: "sprite-missing",
          requestedUrl: src,
          assetBuild: window.PLAY_SPRITE_BUILD || "",
          species: id,
          variant: [shiny ? "shiny" : "", female ? "female" : ""].filter(Boolean).join("-") || "normal"
        });
      }
      return;
    }
    if (typeof window.playLogAssetEvent === "function") {
      window.playLogAssetEvent({
        kind: "sprite-fallback",
        requestedUrl: src,
        fallbackUrl: next,
        assetBuild: window.PLAY_SPRITE_BUILD || "",
        species: id,
        variant: [shiny ? "shiny" : "", female ? "female" : ""].filter(Boolean).join("-") || "normal"
      });
    } else if (typeof console !== "undefined") {
      console.warn(`[play] sprite fallback ${src} → ${next}`);
    }
    img.src = next;
    queueMicrotask(() => { delete img.dataset.playSpriteLock; });
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
    dreamball: "dream-ball",
    beastball: "beast-ball",
    berry: "oran-berry",
    cheri: "cheri-berry",
    chesto: "chesto-berry",
    pecha: "pecha-berry",
    rawst: "rawst-berry",
    aspear: "aspear-berry",
    leppa: "leppa-berry",
    persim: "persim-berry",
    lum: "lum-berry",
    sitrus: "sitrus-berry",
    figy: "figy-berry",
    wiki: "wiki-berry",
    mago: "mago-berry",
    aguav: "aguav-berry",
    iapapa: "iapapa-berry",
    razz: "razz-berry",
    bluk: "bluk-berry",
    nanab: "nanab-berry",
    wepear: "wepear-berry",
    pinap: "pinap-berry",
    goldenrazz: "razz-berry",
    silverpinap: "pinap-berry",
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
    dream1: "dream-ball",
    beast1: "beast-ball",
    berry5: "oran-berry",
    cheri5: "cheri-berry",
    chesto5: "chesto-berry",
    pecha5: "pecha-berry",
    rawst5: "rawst-berry",
    aspear5: "aspear-berry",
    nanab5: "nanab-berry",
    pinap5: "pinap-berry",
    sitrus3: "sitrus-berry",
    lum3: "lum-berry",
    razz3: "razz-berry",
    silverpinap1: "pinap-berry",
    goldenrazz1: "razz-berry",
    bait5: "honey",
    radar1: "poke-radar",
    lure1: "poke-radar",
    pouch10: "explorer-kit",
    "bits-starter": "poke-ball",
    "bits-great": "great-ball",
    "bits-ultra": "ultra-ball",
    "bits-pantry": "oran-berry",
    "bits-pouch": "explorer-kit",
    firestone: "fire-stone",
    firestone1: "fire-stone",
    waterstone: "water-stone",
    waterstone1: "water-stone",
    thunderstone: "thunder-stone",
    thunderstone1: "thunder-stone",
    leafstone: "leaf-stone",
    leafstone1: "leaf-stone",
    moonstone: "moon-stone",
    moonstone1: "moon-stone",
    linkingcord: "linking-cord",
    linkingcord1: "linking-cord",
    rarecandy: "lgpe-candy"
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
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.currentSrc || img.getAttribute("src") || "";
    if (/images\/pokemon\//.test(src) && !img.dataset.playSpriteDone) {
      window.playSpriteOnError(img);
      return;
    }
    if (img.dataset.playRawTried) return;
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

  window.playDexExists = function playDexExists(dex) {
    const id = Number(dex);
    if (!Number.isFinite(id) || id < 1) return false;
    const catalog = window.PLAY_VARIANTS || {};
    return Array.isArray(catalog[id]) || Array.isArray(catalog[String(id)]);
  };

  window.playNationalTotal = function playNationalTotal() {
    return Object.keys(window.PLAY_VARIANTS || {}).length || 0;
  };

  window.playNationalMax = function playNationalMax() {
    const keys = Object.keys(window.PLAY_VARIANTS || {}).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return keys.length ? Math.max(...keys) : (window.PLAY_SPECIES || []).length || 0;
  };

  window.playParseSpeciesQuery = function playParseSpeciesQuery(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    const names = window.PLAY_SPECIES || [];
    const numbered = raw.match(/^0*(\d{1,4})(?:\s+(.+))?$/);
    if (numbered) {
      const n = Number(numbered[1]);
      if (window.playDexExists(n)) {
        const name = names[n - 1] || `Dex ${n}`;
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
      const dex = index + 1;
      if (!window.playDexExists(dex)) return;
      const lower = String(name || "").toLowerCase();
      if (lower === q) exact.push({ dex, name });
      else if (lower.startsWith(q)) prefix.push({ dex, name });
    });
    return exact.concat(prefix);
  };

  window.playSpeciesName = function playSpeciesName(dex) {
    const names = window.PLAY_SPECIES || [];
    return names[Number(dex) - 1] || `No. ${dex}`;
  };

  window.playArticle = function playArticle(label) {
    const text = String(label || "");
    if (!text) return "";
    return `${/^[aeiou]/i.test(text) ? "an" : "a"} ${text}`;
  };

  window.playPhaseLabel = function playPhaseLabel(phase) {
    if (typeof window.playPhaseTitle === "function") return window.playPhaseTitle(phase);
    return ({
      join: "JOIN",
      prepare: "ITEM",
      throw: "POKÉ BALL",
      reveal: "CATCH ATTEMPT",
      closed: "RESULTS"
    })[phase] || "ENCOUNTER";
  };

  window.playRewardCopy = function playRewardCopy(rewards) {
    if (!rewards) return "";
    if (Array.isArray(rewards)) {
      return rewards.map((row) => {
        if (row?.label) return row.label;
        if (typeof window.playPresentRewardLine === "function") return window.playPresentRewardLine(row);
        const type = String(row?.type || "");
        const n = Number(row?.amount || 0);
        if (type === "xp") return `${n} XP`;
        if (type === "coins") return `${n} PokéCoins`;
        if (type === "candy" || type === "evolutioncandy") return `${n} Evolution Candy`;
        if (n) return `${n} ${window.playItemLabel(type)}`;
        return window.playItemLabel(type);
      }).filter(Boolean).join(" · ");
    }
    if (typeof rewards !== "object") return "";
    const lines = typeof window.playGrantLines === "function" ? window.playGrantLines(rewards) : [];
    if (lines.length) return lines.map((row) => row.label).join(" · ");
    return Object.entries(rewards)
      .filter(([key, value]) => value && !["idempotency", "key", "label"].includes(key))
      .map(([key, value]) => {
        if (key === "xp") return `${value} XP`;
        if (key === "coins") return `${value} PokéCoins`;
        if (key === "candy" || key === "evolutioncandy") return `${value} Evolution Candy`;
        if (key === "title") return "Title";
        if (key === "badge") return "Badge";
        if (key === "cosmetic") return "Trainer ID cosmetic";
        return `${value} ${window.playItemLabel(key)}`;
      })
      .join(" · ");
  };

  window.playId = function playId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };

  window.playRpcError = function playRpcError(error, fallback) {
    const raw = String(error?.message || error?.details || fallback || "That action did not work.");
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "CONNECTION LOST. We're trying to reconnect.";
    }
    if (/Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED|Load failed/i.test(raw)) {
      return "CONNECTION LOST. Check your network. Do not refresh during an encounter.";
    }
    if (/JWT expired|invalid JWT|session_not_found|not authenticated/i.test(raw)) {
      return "Your sign-in expired. Sign in again to continue.";
    }
    if (/42501|not allowed|permission denied/i.test(raw)) {
      return "This action is not available on this account.";
    }
    return raw
      .replace(/^.*error:\s*/i, "")
      .replace(/\s+CONTEXT:[\s\S]*$/, "")
      .replace(/Mix It Up/gi, "the stream");
  };

  window.playCall = async function playCall(name, args) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const error = new Error("CONNECTION LOST. We're trying to reconnect.");
      error.code = "offline";
      throw error;
    }
    let result;
    try {
      result = await window.playSupabase.rpc(name, args || {});
    } catch (error) {
      const wrapped = new Error(window.playRpcError(error, "That action did not work."));
      wrapped.cause = error;
      throw wrapped;
    }
    const { data, error } = result || {};
    if (error) throw error;
    if (data && typeof data.twitchLinked === "boolean") window._playTwitchLinked = data.twitchLinked;
    else if (data?.trainer && typeof data.trainer.twitchLinked === "boolean") window._playTwitchLinked = data.trainer.twitchLinked;
    return data;
  };

  window.playSecondsLeft = function playSecondsLeft(iso, nowMs) {
    if (!iso) return 0;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
  };

  window.playEncounterSecondsLeft = function playEncounterSecondsLeft(round) {
    const endAt = round?.deadlines?.[round.phase] || round?.endsAt;
    if (typeof window.playDeadlineSecondsLeft === "function") {
      return window.playDeadlineSecondsLeft(round, endAt);
    }
    if (round?.paused && round.deadlines && round.phase && round.pausedAt) {
      const end = Date.parse(round.deadlines[round.phase]);
      const pause = Date.parse(round.pausedAt);
      if (Number.isFinite(end) && Number.isFinite(pause)) {
        return Math.max(0, Math.ceil((end - pause) / 1000));
      }
    }
    const now = typeof window.playRoundNowMs === "function" ? window.playRoundNowMs(round) : Date.now();
    return window.playSecondsLeft(endAt, now);
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

  function noticeHost() {
    let host = document.getElementById("play-notice-host");
    if (host) return host;
    host = document.createElement("div");
    host.id = "play-notice-host";
    host.className = "play-notice-host";
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
    return host;
  }

  window.playToast = function playToast(notice) {
    const host = noticeHost();
    const card = document.createElement("article");
    card.className = `play-toast play-toast-${notice?.kind || "info"}`;
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    card.innerHTML = `<strong>${esc(notice?.title || "Reward")}</strong><p>${esc(notice?.body || "")}</p>`;
    host.append(card);
    setTimeout(() => card.classList.add("is-out"), 4200);
    setTimeout(() => card.remove(), 5000);
  };

  let noticeBusy = false;
  window.playShowNotices = async function playShowNotices() {
    if (noticeBusy || !window.playSupabase) return;
    noticeBusy = true;
    try {
      const data = await window.playCall("play_notices");
      const notices = (data?.notices || []).slice().sort((a, b) => {
        const rank = (row) => {
          const text = `${row?.kind || ""} ${row?.title || ""} ${row?.body || ""}`.toLowerCase();
          if (/dex|new pokémon|new pokemon|new variant/.test(text)) return 0;
          if (/\bxp\b|experience/.test(text)) return 1;
          if (/coin/.test(text)) return 2;
          if (/candy/.test(text)) return 3;
          if (/drop|berry|ball|item/.test(text) && !/pokédex|pokedex/.test(text)) return 4;
          if (/mastery|achievement/.test(text)) return 5;
          return 6;
        };
        return rank(a) - rank(b);
      });
      if (notices.length > 3) {
        window.playToast({
          kind: "summary",
          title: `${notices.length} rewards earned!`,
          body: notices.slice(0, 4).map((row) => row.title).join(" · ")
        });
        notices.slice(0, 3).forEach((row, index) => {
          setTimeout(() => window.playToast(row), 400 + index * 350);
        });
      } else {
        notices.forEach((row, index) => {
          setTimeout(() => window.playToast(row), index * 350);
        });
      }
    } catch (_) {
    } finally {
      noticeBusy = false;
    }
  };
})();
