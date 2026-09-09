(() => {
  const ITEM_LABELS = {
    berry: "Berry",
    bait: "Honey",
    pokeball: "Poké Ball",
    greatball: "Great Ball",
    ultraball: "Ultra Ball",
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
    lure: "Lure",
    coins: "PokéCoins",
    bag_bonus: "inventory space"
  };
  const VARIANT_LABELS = {
    normal: "Normal",
    female: "Female",
    shiny: "Shiny"
  };

  const TYPE_COLORS = {
    Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Grass: "#78C850",
    Electric: "#F8D030", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
    Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
    Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
    Steel: "#B8B8D0", Fairy: "#EE99AC"
  };

  window.PLAY_BALLS = [
    { key: "pokeball", sku: "poke5", name: "Poké Ball", qty: 5, cost: 40, rate: 0.45, multiplier: "1×", sprite: "poke-ball", extra: false },
    { key: "greatball", sku: "great3", name: "Great Ball", qty: 3, cost: 55, rate: 0.6, multiplier: "1.5×", sprite: "great-ball", extra: false },
    { key: "ultraball", sku: "ultra1", name: "Ultra Ball", qty: 1, cost: 50, rate: 0.75, multiplier: "2×", sprite: "ultra-ball", extra: false },
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

  const GRANT_ORDER = ["bag_bonus", "ultraball", "greatball", "pokeball", "lure", "berry", "bait"];
  const GRANT_WORDS = {
    berry: ["Berry", "Berries"],
    bait: ["Honey", "Honey"],
    pokeball: ["Poké Ball", "Poké Balls"],
    greatball: ["Great Ball", "Great Balls"],
    ultraball: ["Ultra Ball", "Ultra Balls"],
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
    lure: ["Lure", "Lures"]
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
    return list.filter((name) => name === "normal" || name === "female" || name === "shiny");
  };

  window.playSpriteUrl = function playSpriteUrl(dex, variant) {
    const id = Number(dex);
    if (!id) return "";
    const kind = String(variant || "normal");
    if (kind === "female") {
      return `images/pokemon/female/${id}.png`;
    }
    if (kind.includes("shiny")) {
      return `images/pokemon/shiny/${id}.png`;
    }
    return `images/pokemon/${id}.png`;
  };

  const ITEM_SPRITES = {
    pokeball: "poke-ball",
    greatball: "great-ball",
    ultraball: "ultra-ball",
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
    lure1: "poke-radar",
    pouch10: "explorer-kit",
    "bits-starter": "poke-ball",
    "bits-great": "great-ball",
    "bits-ultra": "ultra-ball",
    "bits-pantry": "oran-berry",
    "bits-pouch": "explorer-kit"
  };

  window.playItemSprite = function playItemSprite(key) {
    const raw = String(key || "");
    if (raw.startsWith("species-") && raw.endsWith("-xl")) return "images/items/lgpe-candy-xl.png";
    if (raw.startsWith("species-") && raw.endsWith("-l")) return "images/items/lgpe-candy-l.png";
    if (raw.startsWith("species-")) return "images/items/lgpe-candy.png";
    const slug = ITEM_SPRITES[key] || "poke-ball";
    return `images/items/${slug}.png`;
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

  window.playDisplayName = function playDisplayName(round) {
    if (!round?.name) return "a wild Pokémon";
    if (String(round.variant || "").includes("shiny")) return `Shiny ${round.name}`;
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
