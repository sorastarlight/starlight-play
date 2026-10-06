(() => {
  window.PLAY_TRAINERS = [
    { key: "gen1", label: "Kanto Trainers", games: "Red / Blue / Yellow", looks: [
      { id: "red-gen1", name: "Red", gender: "Male", outfit: "Yellow" },
      { id: "red-gen1rb", name: "Red", gender: "Male", outfit: "Red / Blue" },
      { id: "red-gen1main", name: "Red", gender: "Male", outfit: "Overworld" },
      { id: "red-gen1title", name: "Red", gender: "Male", outfit: "Title" },
      { id: "red-gen2", name: "Red", gender: "Male", outfit: "Johto" },
      { id: "red-gen3", name: "Red", gender: "Male", outfit: "FRLG" },
      { id: "red-gen7", name: "Red", gender: "Male", outfit: "Alola" },
      { id: "red", name: "Red", gender: "Male", outfit: "Classic" },
      { id: "leaf-gen3", name: "Leaf", gender: "Female", outfit: "FRLG" },
      { id: "green", name: "Green", gender: "Female", outfit: "Classic" }
    ] },
    { key: "gen2", label: "Johto Trainers", games: "Gold / Silver / Crystal / HGSS", looks: [
      { id: "ethan-gen2", name: "Ethan", gender: "Male", outfit: "Gold / Silver" },
      { id: "ethan-gen2c", name: "Ethan", gender: "Male", outfit: "Crystal" },
      { id: "ethan", name: "Ethan", gender: "Male", outfit: "HGSS" },
      { id: "ethan-pokeathlon", name: "Ethan", gender: "Male", outfit: "Pokéathlon" },
      { id: "kris-gen2", name: "Kris", gender: "Female", outfit: "Crystal" },
      { id: "kris", name: "Kris", gender: "Female", outfit: "Classic" },
      { id: "lyra", name: "Lyra", gender: "Female", outfit: "HGSS" },
      { id: "lyra-pokeathlon", name: "Lyra", gender: "Female", outfit: "Pokéathlon" }
    ] },
    { key: "gen3", label: "Hoenn Trainers", games: "Ruby / Sapphire / Emerald", looks: [
      { id: "brendan-gen3", name: "Brendan", gender: "Male", outfit: "Emerald" },
      { id: "brendan-gen3rs", name: "Brendan", gender: "Male", outfit: "RS overworld" },
      { id: "brendan-rs", name: "Brendan", gender: "Male", outfit: "Ruby / Sapphire" },
      { id: "brendan-e", name: "Brendan", gender: "Male", outfit: "Emerald alt" },
      { id: "brendan", name: "Brendan", gender: "Male", outfit: "ORAS" },
      { id: "brendan-contest", name: "Brendan", gender: "Male", outfit: "Contest" },
      { id: "may-gen3", name: "May", gender: "Female", outfit: "Emerald" },
      { id: "may-gen3rs", name: "May", gender: "Female", outfit: "RS overworld" },
      { id: "may-rs", name: "May", gender: "Female", outfit: "Ruby / Sapphire" },
      { id: "may-e", name: "May", gender: "Female", outfit: "Emerald alt" },
      { id: "may", name: "May", gender: "Female", outfit: "ORAS" },
      { id: "may-contest", name: "May", gender: "Female", outfit: "Contest" }
    ] },
    { key: "gen4", label: "Sinnoh Trainers", games: "Diamond / Pearl / Platinum", looks: [
      { id: "lucas", name: "Lucas", gender: "Male", outfit: "DP" },
      { id: "lucas-gen4pt", name: "Lucas", gender: "Male", outfit: "Platinum" },
      { id: "lucas-contest", name: "Lucas", gender: "Male", outfit: "Super Contest" },
      { id: "dawn", name: "Dawn", gender: "Female", outfit: "DP" },
      { id: "dawn-gen4pt", name: "Dawn", gender: "Female", outfit: "Platinum" },
      { id: "dawn-contest", name: "Dawn", gender: "Female", outfit: "Super Contest" }
    ] },
    { key: "gen5", label: "Unova Trainers", games: "Black / White / B2W2", looks: [
      { id: "hilbert", name: "Hilbert", gender: "Male", outfit: "Black / White" },
      { id: "hilbert-wonderlauncher", name: "Hilbert", gender: "Male", outfit: "Wonder Launcher" },
      { id: "hilda", name: "Hilda", gender: "Female", outfit: "Black / White" },
      { id: "hilda-wonderlauncher", name: "Hilda", gender: "Female", outfit: "Wonder Launcher" },
      { id: "nate", name: "Nate", gender: "Male", outfit: "Black 2 / White 2" },
      { id: "rosa", name: "Rosa", gender: "Female", outfit: "Black 2 / White 2" },
      { id: "rosa-wonderlauncher", name: "Rosa", gender: "Female", outfit: "Wonder Launcher" }
    ] },
    { key: "gen6", label: "Kalos Trainers", games: "X / Y", looks: [
      { id: "calem", name: "Calem", gender: "Male", outfit: "X / Y" },
      { id: "serena", name: "Serena", gender: "Female", outfit: "X / Y" },
      { id: "serena-anime", name: "Serena", gender: "Female", outfit: "Anime" }
    ] },
    { key: "gen7", label: "Alola Trainers", games: "Sun / Moon / Ultra", looks: [
      { id: "elio", name: "Elio", gender: "Male", outfit: "Sun / Moon" },
      { id: "elio-usum", name: "Elio", gender: "Male", outfit: "Ultra" },
      { id: "selene", name: "Selene", gender: "Female", outfit: "Sun / Moon" },
      { id: "selene-usum", name: "Selene", gender: "Female", outfit: "Ultra" }
    ] },
    { key: "gen8", label: "Galar Trainers", games: "Sword / Shield", looks: [
      { id: "victor", name: "Victor", gender: "Male", outfit: "Sword / Shield" },
      { id: "victor-dojo", name: "Victor", gender: "Male", outfit: "Isle of Armor" },
      { id: "victor-tundra", name: "Victor", gender: "Male", outfit: "Crown Tundra" },
      { id: "victor-league", name: "Victor", gender: "Male", outfit: "League" },
      { id: "gloria", name: "Gloria", gender: "Female", outfit: "Sword / Shield" },
      { id: "gloria-dojo", name: "Gloria", gender: "Female", outfit: "Isle of Armor" },
      { id: "gloria-tundra", name: "Gloria", gender: "Female", outfit: "Crown Tundra" },
      { id: "gloria-league", name: "Gloria", gender: "Female", outfit: "League" }
    ] },
    { key: "gen9", label: "Paldea Trainers", games: "Scarlet / Violet", looks: [
      { id: "florian-s", name: "Florian", gender: "Male", outfit: "School" },
      { id: "florian-bb", name: "Florian", gender: "Male", outfit: "Blueberry" },
      { id: "florian-festival", name: "Florian", gender: "Male", outfit: "Festival" },
      { id: "juliana-s", name: "Juliana", gender: "Female", outfit: "School" },
      { id: "juliana-bb", name: "Juliana", gender: "Female", outfit: "Blueberry" },
      { id: "juliana-festival", name: "Juliana", gender: "Female", outfit: "Festival" }
    ] },
    { key: "gen10", label: "Special Outfits", games: "Lumiose City", looks: [
      { id: "paxton", name: "Paxton", gender: "Male" },
      { id: "harmony", name: "Harmony", gender: "Female" }
    ] },
    { key: "lgpe", label: "Kanto Trainers", games: "Let's Go Pikachu / Eevee", looks: [
      { id: "chase", name: "Chase", gender: "Male" },
      { id: "elaine", name: "Elaine", gender: "Female" },
      { id: "red-lgpe", name: "Red", gender: "Male", outfit: "Let's Go" }
    ] },
    { key: "pla", label: "Special Outfits", games: "Hisui", looks: [
      { id: "rei", name: "Rei", gender: "Male" },
      { id: "akari", name: "Akari", gender: "Female" }
    ] },
    { key: "ranger-fiore", label: "Special Outfits", games: "Pokémon Ranger", looks: [
      { id: "pokemonranger-gen3", name: "Ranger", gender: "Male" },
      { id: "pokemonrangerf-gen3rs", name: "Ranger", gender: "Female" }
    ] },
    { key: "ranger-almia", label: "Special Outfits", games: "Shadows of Almia", looks: [
      { id: "pokemonranger-gen4", name: "Ranger", gender: "Male" },
      { id: "pokemonrangerf-gen4", name: "Ranger", gender: "Female" }
    ] },
    { key: "conquest", label: "Special Outfits", games: "Pokémon Conquest", looks: [
      { id: "hero-conquest", name: "Hero", gender: "Male" },
      { id: "heroine-conquest", name: "Heroine", gender: "Female" }
    ] },
    { key: "go", label: "Special Outfits", games: "Pokémon GO", looks: [
      { id: "player-go", name: "GO Trainer" }
    ] },
    { key: "anime", label: "Special Outfits", games: "Pokémon the Series", looks: [
      { id: "ash", name: "Ash", outfit: "Kanto" },
      { id: "ash-capbackward", name: "Ash", outfit: "Cap backward" },
      { id: "ash-johto", name: "Ash", outfit: "Johto" },
      { id: "ash-hoenn", name: "Ash", outfit: "Hoenn" },
      { id: "ash-sinnoh", name: "Ash", outfit: "Sinnoh" },
      { id: "ash-unova", name: "Ash", outfit: "Unova" },
      { id: "ash-kalos", name: "Ash", outfit: "Kalos" },
      { id: "ash-alola", name: "Ash", outfit: "Alola" },
      { id: "misty", name: "Misty" },
      { id: "misty-gen1", name: "Misty", outfit: "Gen 1" },
      { id: "misty-lgpe", name: "Misty", outfit: "Let's Go" },
      { id: "brock", name: "Brock" },
      { id: "brock-gen1", name: "Brock", outfit: "Gen 1" },
      { id: "brock-lgpe", name: "Brock", outfit: "Let's Go" },
      { id: "oak", name: "Professor Oak" },
      { id: "clemont", name: "Clemont" },
      { id: "iris", name: "Iris" },
      { id: "cynthia-anime", name: "Cynthia", outfit: "Anime" },
      { id: "yellow", name: "Yellow" },
      { id: "liko", name: "Liko" },
      { id: "kiawe", name: "Kiawe" },
      { id: "lana", name: "Lana" },
      { id: "mallow", name: "Mallow" },
      { id: "sophocles", name: "Sophocles" },
      { id: "giovanni", name: "Giovanni" },
      { id: "teamrocket", name: "Team Rocket" },
      { id: "jessiejames-gen1", name: "Jessie & James", outfit: "Gen 1" },
      { id: "nurse", name: "Nurse Joy" },
      { id: "officer-gen2", name: "Officer Jenny" }
    ] },
    { key: "sonic", premium: true, label: "Premium / Special", games: "Sonic Advance", looks: [
      { id: "sonic-sonic", name: "Sonic" },
      { id: "sonic-tails", name: "Tails" },
      { id: "sonic-knuckles", name: "Knuckles" },
      { id: "sonic-amy", name: "Amy" },
      { id: "sonic-cream", name: "Cream" }
    ] },
    { key: "sonic-classic", premium: true, label: "Premium / Special", games: "Sonic Origins", looks: [
      { id: "sonic-origins-sonic", name: "Sonic" },
      { id: "sonic-origins-tails", name: "Tails" },
      { id: "sonic-origins-knuckles", name: "Knuckles" },
      { id: "sonic-origins-amy", name: "Amy" }
    ] },
    { key: "digimon", premium: true, label: "Premium / Special", games: "Digimon Adventure", looks: [
      { id: "taichi", name: "Taichi" },
      { id: "yamato", name: "Yamato" },
      { id: "sora", name: "Sora" },
      { id: "hikari", name: "Hikari" },
      { id: "takeru", name: "Takeru" },
      { id: "joe", name: "Joe" },
      { id: "mimi", name: "Mimi" },
      { id: "koushiro", name: "Koushiro" }
    ] }
  ];

  window.PLAY_AVATAR_PACKS = [
    {
      sku: "avatar-sonic",
      pack: "sonic",
      name: "Sonic The Hedgehog Advance Trainer Sprite Pack",
      games: "Sonic Advance",
      cost: 200,
      blurb: "Unlock Sonic, Tails, Knuckles, Amy, and Cream from Sonic Advance for your Trainer ID.",
      looks: ["sonic-sonic", "sonic-tails", "sonic-knuckles", "sonic-amy", "sonic-cream"]
    },
    {
      sku: "avatar-sonic-classic",
      pack: "sonic-classic",
      name: "Sonic The Hedgehog Classic Trainer Sprite Pack",
      games: "Sonic Origins",
      cost: 150,
      blurb: "Unlock classic Sonic Origins looks for Sonic, Tails, Knuckles, and Amy.",
      looks: ["sonic-origins-sonic", "sonic-origins-tails", "sonic-origins-knuckles", "sonic-origins-amy"]
    },
    {
      sku: "avatar-digimon",
      pack: "digimon",
      name: "Digimon Adventure Trainer Sprite Pack",
      games: "Digimon Adventure",
      cost: 250,
      blurb: "Unlock Taichi, Yamato, Sora, Hikari, Takeru, Joe, Mimi, and Koushiro for your Trainer ID.",
      looks: ["taichi", "yamato", "sora", "hikari", "takeru", "joe", "mimi", "koushiro"]
    }
  ];

  function applyTrainerGroups(groups) {
    if (!Array.isArray(groups) || !groups.length) return;
    window.PLAY_TRAINERS = groups.map((row) => ({
      key: row.key,
      label: /masters\s*ex/i.test(String(row.label || "")) ? "Premium / Special" : row.label,
      games: /masters\s*ex/i.test(String(row.games || "")) ? "Premium Avatars" : (row.games || ""),
      premium: Boolean(row.premium),
      looks: (row.looks || []).map((look) => ({
        id: look.id,
        name: look.name || look.id,
        gender: look.gender || "",
        outfit: look.outfit || "",
        ext: look.ext || "png"
      }))
    }));
  }

  window.playApplyTrainerCatalog = applyTrainerGroups;

  window.playTrainerCatalogReady = (async () => {
    if (typeof window.playCall !== "function") return window.PLAY_TRAINERS;
    try {
      const data = await window.playCall("play_trainer_catalog");
      applyTrainerGroups(data?.groups);
    } catch (_) {}
    return window.PLAY_TRAINERS;
  })();

  window.playTrainerLooks = function playTrainerLooks(row) {
    if (Array.isArray(row?.looks) && row.looks.length) return row.looks;
    const looks = [];
    if (row?.male) looks.push({ ...row.male, gender: row.female ? "Male" : "" });
    if (row?.female) looks.push({ ...row.female, gender: row.male ? "Female" : "" });
    return looks;
  };

  window.playTrainerSpriteKey = function playTrainerSpriteKey(id) {
    return id;
  };

  window.playTrainerSpriteOk = function playTrainerSpriteOk(id) {
    const key = window.playTrainerSpriteKey(id);
    return window.PLAY_TRAINERS.some((row) => window.playTrainerLooks(row).some((look) => look.id === key));
  };

  window.playTrainerSpriteUrl = function playTrainerSpriteUrl(id) {
    const key = window.playTrainerSpriteOk(id) ? window.playTrainerSpriteKey(id) : "red-gen1";
    let ext = "png";
    for (const row of window.PLAY_TRAINERS) {
      const look = window.playTrainerLooks(row).find((item) => item.id === key);
      if (look) {
        ext = look.ext || "png";
        break;
      }
    }
    return `images/trainers/${key}.${ext}?v=av10`;
  };

  /**
   * Presentation families — workshop/thumb keep recognition envelopes;
   * Trainer ID (card) uses target occupancy + nearest-integer (NOT max-fit).
   */
  window.PLAY_AVATAR_FAMILY_DEFAULTS = Object.assign({
    pokemon_classic_pixel: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.78, card: 0.72, thumb: 0.92 },
      minFill: { stage: 0.34, card: 0.52, thumb: 0.55 },
      cardTargetH: 0.64,
      cardMinH: 0.54,
      cardMaxH: 0.72,
      cardTargetW: 0.48,
      cardMaxW: 0.68,
      minIntegerScale: 1,
      maxIntegerScale: 4
    },
    pokemon_modern_pixel: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.80, card: 0.74, thumb: 0.92 },
      minFill: { stage: 0.36, card: 0.56, thumb: 0.55 },
      cardTargetH: 0.68,
      cardMinH: 0.56,
      cardMaxH: 0.74,
      cardTargetW: 0.50,
      cardMaxW: 0.70,
      minIntegerScale: 1,
      maxIntegerScale: 4
    },
    pokemon_modern_render: {
      pixelated: false,
      preferInteger: false,
      maxFill: { stage: 0.90, card: 0.78, thumb: 0.92 },
      minFill: { stage: 0.44, card: 0.62, thumb: 0.55 },
      cardTargetH: 0.72,
      cardMinH: 0.64,
      cardMaxH: 0.78,
      cardTargetW: 0.52,
      cardMaxW: 0.74,
      minIntegerScale: 1,
      maxIntegerScale: 8
    },
    digimon_pixel: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.82, card: 0.72, thumb: 0.92 },
      minFill: { stage: 0.38, card: 0.56, thumb: 0.55 },
      cardTargetH: 0.66,
      cardMinH: 0.56,
      cardMaxH: 0.72,
      cardTargetW: 0.48,
      cardMaxW: 0.64,
      minIntegerScale: 1,
      maxIntegerScale: 2
    },
    sonic_pixel: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.84, card: 0.72, thumb: 0.92 },
      minFill: { stage: 0.40, card: 0.52, thumb: 0.55 },
      cardTargetH: 0.64,
      cardMinH: 0.52,
      cardMaxH: 0.72,
      cardTargetW: 0.48,
      cardMaxW: 0.58,
      minIntegerScale: 1,
      maxIntegerScale: 3
    },
    // Legacy aliases (workshop / older metadata).
    pokemon_pixel: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.78, card: 0.72, thumb: 0.92 },
      minFill: { stage: 0.34, card: 0.52, thumb: 0.55 },
      cardTargetH: 0.64,
      cardMinH: 0.54,
      cardMaxH: 0.72,
      cardTargetW: 0.48,
      cardMaxW: 0.68,
      minIntegerScale: 1,
      maxIntegerScale: 4
    },
    pokemon_modern: {
      pixelated: false,
      preferInteger: false,
      maxFill: { stage: 0.90, card: 0.78, thumb: 0.92 },
      minFill: { stage: 0.44, card: 0.62, thumb: 0.55 },
      cardTargetH: 0.72,
      cardMinH: 0.64,
      cardMaxH: 0.78,
      cardTargetW: 0.52,
      cardMaxW: 0.74
    },
    digimon: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.82, card: 0.72, thumb: 0.92 },
      minFill: { stage: 0.38, card: 0.56, thumb: 0.55 },
      cardTargetH: 0.66,
      cardMinH: 0.56,
      cardMaxH: 0.72,
      cardTargetW: 0.48,
      cardMaxW: 0.64,
      minIntegerScale: 1,
      maxIntegerScale: 2
    },
    sonic: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.84, card: 0.72, thumb: 0.92 },
      minFill: { stage: 0.40, card: 0.52, thumb: 0.55 },
      cardTargetH: 0.64,
      cardMinH: 0.52,
      cardMaxH: 0.72,
      cardTargetW: 0.48,
      cardMaxW: 0.58,
      minIntegerScale: 1,
      maxIntegerScale: 3
    },
    default: {
      pixelated: false,
      preferInteger: false,
      maxFill: { stage: 0.86, card: 0.74, thumb: 0.92 },
      minFill: { stage: 0.38, card: 0.56, thumb: 0.55 },
      cardTargetH: 0.68,
      cardMinH: 0.56,
      cardMaxH: 0.74,
      cardTargetW: 0.50,
      cardMaxW: 0.70
    }
  }, window.PLAY_AVATAR_FAMILY_DEFAULTS || {});

  /**
   * Rare per-id Trainer ID presentation overrides (last resort).
   * Width-safe for wide appendages; body presence still raised via family targets.
   */
  window.PLAY_AVATAR_STAGE_OVERRIDES = Object.assign({
    // Classic Sonic Premium — Trainer ID card-mode only (workshop/thumb ignore card* keys).
    "sonic-amy": { preferInteger: false, cardMaxW: 0.70, cardTargetW: 0.52, cardTargetH: 0.68, cardMinH: 0.60, cardMaxH: 0.74, trainerCardScale: 1.08 },
    "sonic-cream": { preferInteger: false, cardTargetH: 0.68, cardMaxH: 0.74, cardMinH: 0.60, cardTargetW: 0.50, cardMaxW: 0.68, trainerCardScale: 1.06 },
    "sonic-tails": { preferInteger: false, cardMaxW: 0.72, cardTargetW: 0.54, cardTargetH: 0.66, cardMaxH: 0.74, cardMinH: 0.58, trainerCardScale: 1.08 },
    "sonic-sonic": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardTargetW: 0.52, cardMaxW: 0.70, trainerCardScale: 1.10 },
    "sonic-knuckles": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardTargetW: 0.52, cardMaxW: 0.70, trainerCardScale: 1.10 },
    "sonic-origins-amy": { preferInteger: false, cardTargetH: 0.68, cardMinH: 0.60, cardMaxH: 0.74, cardMaxW: 0.70, trainerCardScale: 1.05 },
    "sonic-origins-tails": { preferInteger: false, cardTargetH: 0.66, cardMinH: 0.58, cardMaxH: 0.74, cardMaxW: 0.72, trainerCardScale: 1.05 },
    "sonic-origins-sonic": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardMaxW: 0.70, trainerCardScale: 1.05 },
    "sonic-origins-knuckles": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardMaxW: 0.70, trainerCardScale: 1.05 },
    "iris": { preferInteger: false, cardTargetH: 0.66, cardMinH: 0.58, cardMaxH: 0.74, cardMaxW: 0.74, trainerCardScale: 1 },
    "red-lgpe": { preferInteger: false, cardTargetH: 0.66, cardMinH: 0.58, cardMaxH: 0.74, trainerCardScale: 1 }
  }, window.PLAY_AVATAR_STAGE_OVERRIDES || {});

  function avatarAlphaBounds(img) {
    const w = Number(img.naturalWidth || 0);
    const h = Number(img.naturalHeight || 0);
    if (!w || !h) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return { left: 0, top: 0, right: w - 1, bottom: h - 1, w, h, vw: w, vh: h, cw: w, ch: h };
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      let scan = typeof window.playPortraitVisibleBounds === "function"
        ? window.playPortraitVisibleBounds(data, w, h, 10)
        : null;
      if (!scan) {
        const minA = 10;
        let left = w;
        let top = h;
        let right = -1;
        let bottom = -1;
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            if (data[((y * w) + x) * 4 + 3] >= minA) {
              if (x < left) left = x;
              if (y < top) top = y;
              if (x > right) right = x;
              if (y > bottom) bottom = y;
            }
          }
        }
        scan = right < 0
          ? { left: 0, top: 0, right: w - 1, bottom: h - 1, empty: true }
          : { left, top, right, bottom, empty: false };
      }
      if (!scan || scan.empty) {
        return { left: 0, top: 0, right: w - 1, bottom: h - 1, w, h, vw: w, vh: h, cw: w, ch: h };
      }
      const vw = Math.max(1, scan.right - scan.left + 1);
      const vh = Math.max(1, scan.bottom - scan.top + 1);
      const core = avatarBodyCore(data, w, h, scan);
      return {
        left: scan.left,
        top: scan.top,
        right: scan.right,
        bottom: scan.bottom,
        w,
        h,
        vw,
        vh,
        cl: core.cl,
        ct: core.ct,
        cw: core.cw,
        ch: core.ch
      };
    } catch (_) {
      return { left: 0, top: 0, right: w - 1, bottom: h - 1, w, h, vw: w, vh: h, cw: w, ch: h };
    }
  }

  function avatarBodyCore(data, w, h, scan) {
    const minA = 10;
    const left = scan.left;
    const right = scan.right;
    const top = scan.top;
    const bottom = scan.bottom;
    const cols = new Float64Array(right - left + 1);
    const rows = new Float64Array(bottom - top + 1);
    let total = 0;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const a = data[((y * w) + x) * 4 + 3];
        if (a < minA) continue;
        const weight = a / 255;
        cols[x - left] += weight;
        rows[y - top] += weight;
        total += weight;
      }
    }
    if (total <= 0) {
      return { cl: left, ct: top, cw: Math.max(1, right - left + 1), ch: Math.max(1, bottom - top + 1) };
    }
    const trim = (arr, keep) => {
      const need = total * keep;
      let acc = 0;
      let i0 = 0;
      for (; i0 < arr.length; i0 += 1) {
        acc += arr[i0];
        if (acc >= (total - need) / 2) break;
      }
      acc = 0;
      let i1 = arr.length - 1;
      for (; i1 >= 0; i1 -= 1) {
        acc += arr[i1];
        if (acc >= (total - need) / 2) break;
      }
      return { i0: Math.max(0, i0), i1: Math.max(i0, i1) };
    };
    const cx = trim(cols, 0.78);
    const cy = trim(rows, 0.78);
    return {
      cl: left + cx.i0,
      ct: top + cy.i0,
      cw: Math.max(1, cx.i1 - cx.i0 + 1),
      ch: Math.max(1, cy.i1 - cy.i0 + 1)
    };
  }

  function avatarFamilyOf(id, bounds) {
    const key = String(id || "").toLowerCase();
    if (/^sonic/.test(key)) return "sonic_pixel";
    if (/^(taichi|yamato|sora|hikari|takeru|joe|mimi|koushiro)$/.test(key)) return "digimon_pixel";
    const maxSrc = Math.max(bounds?.w || 0, bounds?.h || 0);
    if (maxSrc >= 256) return "pokemon_modern_render";
    if (maxSrc > 0 && maxSrc <= 96) {
      if (/-gen3|-gen4|-gen5|-lgpe|wonderlauncher|pokeathlon|contest|-gen7|-usum|-dojo|-tundra|-league|-bb|-festival/.test(key)) {
        return "pokemon_modern_pixel";
      }
      if (/^(lucas|dawn|hilbert|hilda|nate|rosa|brendan|may|ethan|kris|lyra|iris|ash|misty|brock|clemont|cynthia|yellow|liko|kiawe|lana|mallow|sophocles|giovanni|teamrocket|chase|elaine|paxton|harmony|hero|heroine|player-go|pokemonranger|calem|serena|elio|selene|victor|gloria|florian|juliana|rei|akari)/.test(key)) {
        return "pokemon_modern_pixel";
      }
      return "pokemon_classic_pixel";
    }
    if (maxSrc > 96 && maxSrc < 256) return "pokemon_modern_pixel";
    return "default";
  }

  function avatarModeKey(mode) {
    if (mode === "thumb") return "thumb";
    if (mode === "card") return "card";
    return "stage";
  }

  function avatarEnvelopePx(mode) {
    if (mode === "thumb") return 112;
    if (mode === "card") return 400;
    return 240;
  }

  /** Avatar Browser thumbnails: full alpha envelope must fit (contain). Never inherit card occupancy. */
  function avatarThumbScale(bounds, familyCfg, stageBox) {
    const pad = 0.14;
    const usableH = Math.max(1, (stageBox.h || 96) * (1 - pad * 2));
    const usableW = Math.max(1, (stageBox.w || 96) * (1 - pad * 2));
    const safeH = Math.max(1, bounds.vh || bounds.h || 1);
    const safeW = Math.max(1, bounds.vw || bounds.w || 1);
    let scale = Math.min(usableH / safeH, usableW / safeW);

    if (familyCfg.preferInteger && Math.max(bounds.w || 0, bounds.h || 0) <= 128) {
      const maxI = Math.max(1, Number(familyCfg.maxIntegerScale || 6));
      let best = 0;
      for (let n = maxI; n >= 1; n -= 1) {
        if (safeH * n <= usableH + 0.5 && safeW * n <= usableW + 0.5) {
          best = n;
          break;
        }
      }
      if (best > 0) scale = best;
    }

    // Hard clamp: never exceed tile (full visibility wins over integer crispness).
    scale = Math.min(scale, usableH / safeH, usableW / safeW);
    return Math.max(0.15, scale);
  }

  function avatarFillLimit(familyCfg, mode, which) {
    const key = avatarModeKey(mode);
    const bag = familyCfg?.[which] || {};
    if (typeof bag === "number") return bag;
    return Number(bag[key] ?? bag.stage ?? (which === "maxFill" ? 0.82 : 0.34));
  }

  function avatarStageBox(img, mode, envelope) {
    if (mode === "card") {
      const well = img.closest?.(".tid-avatar-well, .tid-avatar-stage");
      if (well && well.clientHeight > 40 && well.clientWidth > 40) {
        return { w: well.clientWidth, h: well.clientHeight };
      }
    }
    if (mode === "stage") {
      const frame = img.closest?.(".scc-stage-frame");
      if (frame && frame.clientHeight > 40 && frame.clientWidth > 40) {
        return { w: frame.clientWidth, h: frame.clientHeight };
      }
    }
    if (mode === "thumb") {
      const thumb = img.closest?.(".scc-avatar-thumb");
      if (thumb) {
        const card = thumb.closest?.(".scc-avatar-card");
        let h = Math.max(thumb.clientHeight || 0, thumb.offsetHeight || 0);
        let w = Math.max(thumb.clientWidth || 0, thumb.offsetWidth || 0);
        const cardW = Math.max(card?.clientWidth || 0, card?.offsetWidth || 0);
        // Absolute sprites + justify-items:center can collapse the thumb width to
        // the label's min-content. Prefer the card track width when that happens.
        if (h < 40) h = envelope;
        if (w < 80 && cardW >= 80) w = cardW;
        if (w < 80) w = Math.max(h, envelope);
        return { w, h };
      }
    }
    return { w: envelope, h: envelope };
  }

  function avatarCardScale(bounds, familyCfg, stageBox) {
    const safeH = Math.max(1, bounds.vh || bounds.h || 1);
    const safeW = Math.max(1, bounds.vw || bounds.w || 1);
    const coreH = Math.max(1, bounds.ch || safeH);
    const coreW = Math.max(1, bounds.cw || safeW);
    const stageH = Math.max(1, stageBox.h || 1);
    const stageW = Math.max(1, stageBox.w || 1);
    const usableH = stageH * 0.94;
    const usableW = stageW * 0.92;

    const targetH = Number(familyCfg.cardTargetH ?? 0.55);
    const minH = Number(familyCfg.cardMinH ?? 0.45);
    const maxH = Number(familyCfg.cardMaxH ?? 0.65);
    const targetW = Number(familyCfg.cardTargetW ?? 0.45);
    const maxW = Number(familyCfg.cardMaxW ?? 0.60);

    const idealFromCore = Math.min(
      (usableH * targetH) / coreH,
      (usableW * targetW) / coreW
    );
    const safeMax = Math.min(
      (usableH * maxH) / safeH,
      (usableW * maxW) / safeW,
      usableH / safeH,
      usableW / safeW
    );
    const safeMin = Math.min((usableH * minH) / safeH, safeMax);

    let scale = Math.min(Math.max(idealFromCore, Math.min(safeMin, safeMax)), safeMax);

    if (familyCfg.preferInteger) {
      const minI = Math.max(1, Number(familyCfg.minIntegerScale || 1));
      const maxI = Math.max(minI, Number(familyCfg.maxIntegerScale || 6));
      const band = [];
      for (let n = minI; n <= maxI; n += 1) {
        const hOcc = (safeH * n) / usableH;
        const wOcc = (safeW * n) / usableW;
        if (hOcc <= maxH + 0.02 && wOcc <= maxW + 0.02 && hOcc >= minH - 0.04) {
          band.push({ n, dist: Math.abs(n - idealFromCore) });
        }
      }
      if (band.length) {
        band.sort((a, b) => a.dist - b.dist || a.n - b.n);
        scale = band[0].n;
        // If nearest integer still reads too small, allow a safe fractional bump for presence.
        const occ = (safeH * scale) / usableH;
        if (occ < minH - 0.01) {
          const frac = Math.min(Math.max(idealFromCore, safeMin), safeMax);
          if (frac > scale + 0.05) scale = frac;
        }
      } else {
        scale = Math.min(Math.max(idealFromCore, safeMin), safeMax);
      }
    }

    scale = Math.min(scale, safeMax, usableH / safeH, usableW / safeW);
    return Math.max(0.25, scale);
  }

  function avatarNaturalScale(bounds, familyCfg, envelope, mode) {
    if (mode === "card") return 1;
    const vw = Math.max(1, bounds.vw || bounds.w || 1);
    const vh = Math.max(1, bounds.vh || bounds.h || 1);
    const maxFill = avatarFillLimit(familyCfg, mode, "maxFill");
    const minFill = avatarFillLimit(familyCfg, mode, "minFill");
    const maxH = envelope * maxFill;
    const maxW = envelope * 0.92;
    let scale = Math.min(maxH / vh, maxW / vw);

    if (familyCfg.preferInteger && Math.max(bounds.w || 0, bounds.h || 0) <= 128) {
      const maxI = Math.max(1, Number(familyCfg.maxIntegerScale || 8));
      let best = 0;
      let bestDist = Infinity;
      const ideal = scale;
      for (let n = 1; n <= maxI; n += 1) {
        if (vh * n <= maxH + 0.5 && vw * n <= maxW + 0.5) {
          const dist = Math.abs(n - ideal);
          if (dist < bestDist || (dist === bestDist && n > best)) {
            best = n;
            bestDist = dist;
          }
        }
      }
      if (best > 0) scale = best;
    }

    const minScale = Math.min(maxH / vh, maxW / vw, (envelope * minFill) / vh);
    if (scale * vh < envelope * minFill * 0.98) {
      scale = Math.min(Math.max(scale, minScale), maxH / vh, maxW / vw);
    }
    return Math.max(0.25, scale);
  }

  function avatarShadowHost(img) {
    const well = img.closest(".scc-stage-frame, .tid-avatar-well, .scc-avatar-thumb, .tid-avatar-stage");
    if (!well) return null;
    let shadow = well.querySelector(".avatar-stage-shadow");
    if (!shadow) {
      shadow = document.createElement("span");
      shadow.className = "avatar-stage-shadow";
      shadow.setAttribute("aria-hidden", "true");
      well.appendChild(shadow);
    }
    return shadow;
  }

  window.playNormalizeTrainerAvatar = function playNormalizeTrainerAvatar(img, opts) {
    if (!img) return;
    const mode = opts?.mode
      || (img.classList.contains("scc-avatar-thumb-img") || img.closest?.(".scc-avatar-thumb") ? "thumb"
        : (img.classList.contains("tid-avatar-sprite") || img.closest?.(".tid-avatar-stage") ? "card" : "stage"));
    if (mode === "stage") {
      img.classList.add("is-stage-pending");
      img.style.opacity = "0";
      img.style.transition = "none";
    }
    const apply = () => {
      const bounds = avatarAlphaBounds(img) || {
        left: 0,
        top: 0,
        right: Math.max(0, (img.naturalWidth || 1) - 1),
        bottom: Math.max(0, (img.naturalHeight || 1) - 1),
        w: img.naturalWidth || 1,
        h: img.naturalHeight || 1,
        vw: img.naturalWidth || 1,
        vh: img.naturalHeight || 1,
        cw: img.naturalWidth || 1,
        ch: img.naturalHeight || 1
      };
      const srcKey = String(img.currentSrc || img.src || "")
        .replace(/\?.*$/, "")
        .replace(/^.*\//, "")
        .replace(/\.(png|gif|webp|jpe?g)$/i, "");
      const id = String(img.dataset.avatarId || img.getAttribute("data-avatar-id") || srcKey || "");
      const override = window.PLAY_AVATAR_STAGE_OVERRIDES?.[id] || null;
      const family = override?.family || avatarFamilyOf(id, bounds);
      const familyCfg = Object.assign(
        {},
        window.PLAY_AVATAR_FAMILY_DEFAULTS.default,
        window.PLAY_AVATAR_FAMILY_DEFAULTS[family] || {},
        override || {}
      );
      const envelope = avatarEnvelopePx(mode);
      const stageBox = avatarStageBox(img, mode, envelope);
      let scale = mode === "card"
        ? avatarCardScale(bounds, familyCfg, stageBox)
        : mode === "thumb"
          ? avatarThumbScale(bounds, familyCfg, stageBox)
          : avatarNaturalScale(bounds, familyCfg, Math.min(envelope, stageBox.h || envelope), mode);
      const modeMul = mode === "card"
        ? Number(familyCfg.trainerCardScale || 1)
        : mode === "thumb"
          ? Number(familyCfg.thumbScale || 1)
          : Number(familyCfg.workshopScale || 1);
      scale *= Number.isFinite(modeMul) && modeMul > 0 ? modeMul : 1;
      if (mode === "thumb") {
        // Re-clamp after multiplier so thumbs never crop.
        const pad = 0.14;
        const usableH = Math.max(1, (stageBox.h || 96) * (1 - pad * 2));
        const usableW = Math.max(1, (stageBox.w || 96) * (1 - pad * 2));
        const safeH = Math.max(1, bounds.vh || bounds.h || 1);
        const safeW = Math.max(1, bounds.vw || bounds.w || 1);
        scale = Math.min(scale, usableH / safeH, usableW / safeW);
      }

      const renderW = Math.max(1, Math.round(bounds.w * scale));
      const renderH = Math.max(1, Math.round(bounds.h * scale));
      const visW = Math.max(1, Math.round(bounds.vw * scale));
      const visH = Math.max(1, Math.round(bounds.vh * scale));
      const padL = bounds.left * scale;
      const padR = (bounds.w - 1 - bounds.right) * scale;
      const padT = bounds.top * scale;
      const padB = (bounds.h - 1 - bounds.bottom) * scale;
      const offX = Number(familyCfg.offsetX || 0);
      const offY = Number(familyCfg.offsetY || 0);
      const stageRefH = Math.max(1, stageBox.h || envelope);
      const stageRefW = Math.max(1, stageBox.w || envelope);
      const stagePct = Math.round((visH / stageRefH) * 1000) / 10;
      const widthPct = Math.round((visW / stageRefW) * 1000) / 10;
      const isInteger = Math.abs(scale - Math.round(scale)) < 0.02;

      img.dataset.avatarFamily = family;
      img.dataset.avatarNorm = "1";
      img.dataset.avatarMode = mode;
      img.dataset.avatarSrcW = String(bounds.w);
      img.dataset.avatarSrcH = String(bounds.h);
      img.dataset.avatarVis = `${bounds.vw}x${bounds.vh}`;
      img.dataset.avatarCore = `${bounds.cw || bounds.vw}x${bounds.ch || bounds.vh}`;
      img.dataset.avatarRender = `${visW}x${visH}`;
      img.dataset.avatarScale = String(Math.round(scale * 1000) / 1000);
      img.dataset.avatarStagePct = String(stagePct);
      img.dataset.avatarWidthPct = String(widthPct);
      img.dataset.avatarStrategy = mode === "thumb"
        ? (familyCfg.preferInteger && isInteger ? "thumb-integer-contain" : "thumb-contain")
        : (familyCfg.preferInteger
          ? (isInteger ? "integer" : "fractional-target")
          : "smooth");
      img.classList.toggle("is-pixel-art", Boolean(familyCfg.pixelated));
      img.classList.toggle("is-full-art", family === "pokemon_modern_render" || family === "pokemon_modern");
      img.classList.toggle("is-mascot-art", family === "sonic_pixel" || family === "sonic");
      img.style.width = `${renderW}px`;
      img.style.height = `${renderH}px`;
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.objectFit = "fill";
      if (mode === "thumb") {
        // Dedicated thumbnail contract: visible alpha must fit inside tile inset.
        // Transparent source padding may extend outside and is clipped by overflow:hidden.
        // left:50% + translateX(-(alphaCenterX)); never reuse card/stage offsets.
        const inset = Math.max(6, Math.round(Math.min(stageRefW, stageRefH) * 0.08));
        const maxVisH = Math.max(1, stageRefH - inset * 2);
        const maxVisW = Math.max(1, stageRefW - inset * 2);
        if (visH > maxVisH || visW > maxVisW) {
          const fit = Math.min(maxVisH / Math.max(1, bounds.vh), maxVisW / Math.max(1, bounds.vw));
          scale = Math.min(scale, fit);
        }
        const renderW2 = Math.max(1, Math.round(bounds.w * scale));
        const renderH2 = Math.max(1, Math.round(bounds.h * scale));
        const visW2 = Math.max(1, Math.round(bounds.vw * scale));
        const visH2 = Math.max(1, Math.round(bounds.vh * scale));
        const padL2 = bounds.left * scale;
        const padB2 = (bounds.h - 1 - bounds.bottom) * scale;
        const alphaCx = (bounds.left + (bounds.vw / 2)) * scale;
        img.style.setProperty("width", renderW2 + "px", "important");
        img.style.setProperty("height", renderH2 + "px", "important");
        img.style.setProperty("max-width", "none", "important");
        img.style.setProperty("max-height", "none", "important");
        img.style.setProperty("object-fit", "fill", "important");
        img.style.position = "absolute";
        img.style.left = "50%";
        img.style.right = "auto";
        img.style.top = "50%";
        img.style.bottom = "auto";
        img.style.margin = "0";
        const alphaCy = (bounds.top + (bounds.vh / 2)) * scale;
        img.style.setProperty("transform", "translate(" + (-alphaCx + offX).toFixed(2) + "px," + (-alphaCy + offY).toFixed(2) + "px)", "important");
        img.style.transformOrigin = "center center";
        img.dataset.avatarThumbInset = String(inset);
        img.dataset.avatarRender = `${visW2}x${visH2}`;
        img.dataset.avatarScale = String(Math.round(scale * 1000) / 1000);
        img.dataset.avatarStagePct = String(Math.round((visH2 / stageRefH) * 1000) / 10);
        img.dataset.avatarWidthPct = String(Math.round((visW2 / stageRefW) * 1000) / 10);
        img.dataset.avatarPad = `${padL2.toFixed(1)},${padB2.toFixed(1)}`;
      } else {
        img.style.position = "";
        img.style.left = "";
        img.style.right = "";
        img.style.top = "";
        img.style.bottom = "";
        img.style.removeProperty("width");
        img.style.removeProperty("height");
        img.style.width = renderW + "px";
        img.style.height = renderH + "px";
        // Center BODY/CORE on workshop stage; full alpha used for fit clamps.
        const alphaMid = bounds.left + (bounds.vw / 2);
        const coreMid = Number.isFinite(bounds.cl)
          ? (bounds.cl + ((bounds.cw || bounds.vw) / 2))
          : alphaMid;
        const coreShift = mode === "stage" ? ((alphaMid - coreMid) * scale) : 0;
        const tx = ((padR - padL) / 2) + offX + coreShift;
        img.style.margin = "0 " + (-padR) + "px " + (-padB + offY) + "px " + (-padL) + "px";
        img.style.transform = "translateX(" + tx.toFixed(2) + "px)";
        img.style.transformOrigin = "";
        img.style.transition = "none";
      }
      img.style.imageRendering = familyCfg.pixelated ? "pixelated" : "auto";
      img.style.filter = familyCfg.pixelated ? "none" : "";

      const shadow = avatarShadowHost(img);
      if (shadow) {
        const shadowW = Math.max(28, Math.min(stageRefW * 0.55, Number(familyCfg.shadowWidth) || visW * 0.78));
        shadow.style.setProperty("--shadow-w", Math.round(shadowW) + "px");
        shadow.classList.add("is-on");
      }
      if (mode === "stage") {
        img.classList.remove("is-stage-pending");
        img.classList.add("is-stage-ready");
        // Reveal only after final geometry. Prefer class opacity (no rAF) so
        // background-tab throttling cannot leave the sprite stuck at opacity 0.
        img.style.opacity = "";
        img.style.transition = "";
        const reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
        const low = String(window.playPerfMode?.() || window.PLAY_PERF_MODE || "").toLowerCase() === "low";
        if (reduce || low) {
          img.classList.add("is-stage-instant");
        } else {
          img.classList.remove("is-stage-instant");
        }
      }
    };
    const run = async () => {
      try {
        if (typeof img.decode === "function") {
          await Promise.race([
            img.decode(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("decode-timeout")), 2000))
          ]);
        }
      } catch (_) {}
      apply();
    };
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", () => { run(); }, { once: true });
  };

  window.playNormalizeAvatarThumb = function playNormalizeAvatarThumb(img) {
    window.playNormalizeTrainerAvatar(img, { mode: "thumb" });
  };

  window.playTrainerPortraitUrl = function playTrainerPortraitUrl(id) {
    const look = window.playTrainerLook?.(id);
    const trainer = look?.trainer || {};
    const file = trainer.portrait || trainer.portraitFile || trainer.portrait_file || "";
    if (file) {
      if (/^https?:\/\//.test(file) || file.startsWith("images/") || file.startsWith("blob:")) {
        return file.includes("?") || file.startsWith("blob:") ? file : `${file}?v=avp2`;
      }
      return `images/trainers/portraits/${file}?v=avp2`;
    }
    return window.playTrainerSpriteUrl(id);
  };

  window.PLAY_CARD_BGS = [
    { id: "kanto", name: "Kanto", group: "region", tone: "light", chip: "#6aa4dee6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#d6ebf8", slotInk: "#2a3048" },
    { id: "johto", name: "Johto", group: "region", tone: "light", chip: "#f6cd08e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#fff4b8", slotInk: "#2a3048" },
    { id: "hoenn", name: "Hoenn", group: "region", tone: "light", chip: "#83b4ace6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#d8f0ea", slotInk: "#2a3048" },
    { id: "sinnoh", name: "Sinnoh", group: "region", tone: "light", chip: "#9aa4aee6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#e8ecec", slotInk: "#2a3048" },
    { id: "unova", name: "Unova", group: "region", tone: "light", chip: "#909aade6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#e4e6ec", slotInk: "#2a3048" },
    { id: "kalos", name: "Kalos", group: "region", tone: "light", chip: "#e265a8e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#fde0ef", slotInk: "#2a3048" },
    { id: "alola", name: "Alola", group: "region", tone: "light", chip: "#e79f60e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffe6cc", slotInk: "#2a3048" },
    { id: "galar", name: "Galar", group: "region", tone: "light", chip: "#9957c8e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ead6f8", slotInk: "#2a3048" },
    { id: "hisui", name: "Hisui", group: "region", tone: "light", chip: "#d5bd8be6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#f4ead4", slotInk: "#2a3048" },
    { id: "paldea", name: "Paldea", group: "region", tone: "light", chip: "#da5365e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffdce2", slotInk: "#2a3048" },
    { id: "starlight", name: "Starlight", group: "cute", tone: "light", chip: "#664fc3e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#e0d8fa", slotInk: "#2a3048" },
    { id: "candy", name: "Candy", group: "cute", tone: "light", chip: "#f059bee6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffd8f2", slotInk: "#2a3048" },
    { id: "peach", name: "Peach", group: "cute", tone: "light", chip: "#f49b89e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffe4dc", slotInk: "#2a3048" },
    { id: "lilac", name: "Lilac", group: "cute", tone: "light", chip: "#c278e7e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#f0dcff", slotInk: "#2a3048" },
    { id: "sakura", name: "Sakura", group: "cute", tone: "light", chip: "#f998bce6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffe0ec", slotInk: "#2a3048" },
    { id: "cotton", name: "Cotton", group: "cute", tone: "light", chip: "#7eb8dce6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#e4f2ff", slotInk: "#2a3048" },
    { id: "ribbon", name: "Ribbon", group: "cute", tone: "light", chip: "#de5777e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffd4de", slotInk: "#2a3048" },
    { id: "aurora", name: "Aurora", group: "cute", tone: "light", chip: "#63e2d6e6", ink: "#2a3048", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#d8faf6", slotInk: "#2a3048" },
    { id: "pride-trans", name: "Trans", group: "pride", tone: "light", chip: "#c8f0faee", ink: "#1a2744", head: "#1a2744", shadow: "0 1px 0 rgba(255,255,255,.85)", slot: "#ffe4f0", slotInk: "#1a2744" },
    { id: "pride-rainbow", name: "Pride", group: "pride", tone: "dark", chip: "#1e1038e8", ink: "#fff8e8", head: "#fff", shadow: "0 2px 0 #3a0860", slot: "#ffe8a0", slotInk: "#3a0860" },
    { id: "pride-lesbian", name: "Lesbian", group: "pride", tone: "dark", chip: "#6a1028e8", ink: "#fff8f4", head: "#fff", shadow: "0 2px 0 #5a0818", slot: "#ffd8c8", slotInk: "#6a1028" },
    { id: "pride-bi", name: "Bi", group: "pride", tone: "dark", chip: "#4a2068e8", ink: "#fff8fc", head: "#fff", shadow: "0 2px 0 #1a2068", slot: "#e8d8ff", slotInk: "#2a1860" },
    { id: "pride-pan", name: "Pan", group: "pride", tone: "light", chip: "#b01868e8", ink: "#fff8fc", head: "#3a2868", shadow: "0 1px 0 #fff4a0", slot: "#ffe0f0", slotInk: "#3a2868" },
    { id: "pride-nb", name: "Nonbinary", group: "pride", tone: "light", chip: "#4a2878e8", ink: "#fffdf0", head: "#222", shadow: "0 1px 0 #fff06a", slot: "#f4e8ff", slotInk: "#3a2060" },
    { id: "pride-ace", name: "Ace", group: "pride", tone: "dark", chip: "#d8d8d8ee", ink: "#221028", head: "#fff", shadow: "0 2px 0 #000", slot: "#f0e0f8", slotInk: "#4a0868" },
    { id: "pride-gf", name: "Genderfluid", group: "pride", tone: "dark", chip: "#f4f4f4ee", ink: "#2a1038", head: "#fff", shadow: "0 2px 0 #3a0860", slot: "#ffd8e8", slotInk: "#4a1848" },
    { id: "pride-mlm", name: "MLM", group: "pride", tone: "dark", chip: "#143060e8", ink: "#f4fff8", head: "#fff", shadow: "0 2px 0 #0a3040", slot: "#d8fff0", slotInk: "#143060" },
    { id: "pride-intersex", name: "Intersex", group: "pride", tone: "light", chip: "#681878e8", ink: "#fffdf0", head: "#4a1060", shadow: "0 1px 0 #ffe86a", slot: "#fff0b8", slotInk: "#4a1060" }
  ];

  window.playCardBg = function playCardBg(id) {
    return window.PLAY_CARD_BGS.find((row) => row.id === id) || window.PLAY_CARD_BGS.find((row) => row.id === "hoenn");
  };

  window.playCardBgUrl = function playCardBgUrl(id) {
    return `images/cards/${window.playCardBg(id).id}.png?v=blank1`;
  };

  window.playTrainerLook = function playTrainerLook(id) {
    const key = window.playTrainerSpriteKey(id);
    for (const row of window.PLAY_TRAINERS) {
      for (const trainer of window.playTrainerLooks(row)) {
        if (trainer.id === key) return { ...row, gender: trainer.gender, trainer };
      }
    }
    return window.playTrainerLook("red-gen1");
  };

  /** Nickname if set, else form/species display name. Shiny is never part of the name. */
  window.playCaughtSpeciesName = function playCaughtSpeciesName(row) {
    if (!row) return "";
    return row.displayName
      || (typeof window.playFormDisplayName === "function"
        ? window.playFormDisplayName(row.dex, row.formId || row.pokemonFormId)
        : null)
      || row.name
      || "Pokémon";
  };

  window.playCaughtName = function playCaughtName(row) {
    if (!row) return "";
    const nick = String(row.nickname || "").trim();
    const name = nick || window.playCaughtSpeciesName(row) || "Pokémon";
    return window.playEscapeAttr ? window.playEscapeAttr(name) : String(name);
  };

  /** Compact provenance only — never gender (badges own that) and never shiny-as-name. */
  window.playCaughtBlurb = function playCaughtBlurb(row) {
    if (!row) return "";
    const ball = typeof window.playItemLabel === "function" ? window.playItemLabel(row.ball) : "";
    return ball && window.playEscapeAttr ? window.playEscapeAttr(ball) : String(ball || "");
  };

  window.playCaughtIsShiny = function playCaughtIsShiny(row) {
    return Boolean(row?.shiny) || String(row?.variant || "").toLowerCase().includes("shiny");
  };

  window.playCardTime = function playCardTime(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  window.playCardDate = function playCardDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  };

  window.playXpProgressHtml = function playXpProgressHtml(card, options) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const level = Number(card?.level || 1);
    const into = Number(card?.xpInto || 0);
    const need = Math.max(1, Number(card?.xpNeed || 1));
    const remain = Math.max(0, Number(card?.xpToNext != null ? card.xpToNext : need - into));
    const pct = Math.max(0, Math.min(100, Math.round((into / need) * 100)));
    const compact = Boolean(options?.compact);
    const profile = Boolean(options?.profile);
    if (profile) {
      return `
        <div class="tid-xp" role="img" aria-label="Trainer Level ${esc(level)}. ${into.toLocaleString()} of ${need.toLocaleString()} XP.">
          <div class="tid-xp-meta">
            <span class="tid-xp-lv">Lv. ${esc(level)}</span>
            <span class="tid-xp-nums">${into.toLocaleString()} / ${need.toLocaleString()} XP</span>
          </div>
          <div class="xp-bar tid-xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        </div>`;
    }
    return `
      <div class="xp-progress" role="img" aria-label="Trainer Level ${esc(level)}. ${into.toLocaleString()} of ${need.toLocaleString()} XP. ${remain.toLocaleString()} XP to Level ${level + 1}.">
        <p class="xp-progress-kicker">${compact ? `Lv. ${esc(level)}` : `TRAINER LEVEL ${esc(level)}`}</p>
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <p class="muted">${into.toLocaleString()} / ${need.toLocaleString()} XP${compact ? "" : ` · ${remain.toLocaleString()} XP to Level ${level + 1}`}</p>
      </div>`;
  };

  function profileDexCounts(card) {
    const variants = card?.variants || {};
    const kanto = card?.kanto || {};
    const releasedTotal = window.playReleasedDexTotal?.() || 151;
    const kantoCaught = kanto.caught != null
      ? kanto.caught
      : (card?.species != null ? Math.min(Number(card.species) || 0, releasedTotal) : 0);
    const kantoTotal = kanto.total || releasedTotal || 151;
    return { variants, kanto, kantoCaught, kantoTotal };
  }

  function badgeRowHtml(badges, esc) {
    if (!badges.length) return `<p class="tid-badge-empty">No featured Ribbons yet</p>`;
    return `<ul class="tid-ribbon-row">${badges.map((row) => {
      const ribbon = window.playRibbonForBadge?.(row) || row;
      const name = esc(ribbon.name || row.name);
      return `<li>
        <button type="button" class="tid-ribbon-btn" data-ribbon-open="${esc(row.id)}" aria-label="${name}">
          ${window.playRibbonIconHtml?.(ribbon, { name, size: 36 }) || `<span class="tid-badge-gem" aria-hidden="true">★</span>`}
        </button>
      </li>`;
    }).join("")}</ul>`;
  }

  function tidStatRowsHtml(card, counts, esc) {
    const mastered = Number(card?.speciesMastered || 0);
    const rows = [
      { label: "Pokédex", value: `${counts.kantoCaught}<span class="tid-slash">/</span>${counts.kantoTotal}` },
      { label: "Catches", value: String(Number(card?.caught || 0)) },
      { label: "Shinies", value: String(Number(card?.shinyCaught || 0)) },
      { label: "Species Mastered", value: String(mastered) }
    ];
    return `<dl class="tid-stat-rows">${rows.map((row) => `
      <div class="tid-stat-row">
        <dt>${esc(row.label)}</dt>
        <dd>${row.value}</dd>
      </div>`).join("")}</dl>`;
  }

  window.playRenderIdCard = function playRenderIdCard(card, options) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const opts = options || {};
    const look = window.playTrainerLook(card?.trainerSprite);
    const bg = window.playCardBg(card?.cardBg);
    const frame = String(card?.cardFrame || "plain").replace(/[^a-z0-9-]/gi, "") || "plain";
    const title = String(card?.title || "").trim();
    const badges = (card?.badges || []).slice(0, window.PLAY_FEATURED_RIBBON_MAX || 5);
    const twitch = Boolean(card?.twitchLinked);
    const counts = profileDexCounts(card);
    const mode = opts.mode === "preview" ? "preview" : "public";
    const variant = opts.variant || "hero";
    const avatarOnly = variant === "avatar";
    const identityOnly = variant === "identity";
    const trainerAlt = esc(card?.displayName || look.trainer?.name || "Trainer");
    const spriteId = window.playEscapeAttr?.(card?.trainerSprite) || card?.trainerSprite || "";
    const avatarStageHtml = `
          <div class="tid-avatar-stage is-hero is-character">
            <div class="tid-avatar-glow" aria-hidden="true"></div>
            <div class="tid-avatar-well">
              <span class="avatar-stage-shadow" aria-hidden="true"></span>
              <img class="tid-avatar-sprite" data-avatar-id="${spriteId}" src="${window.playTrainerSpriteUrl(card?.trainerSprite)}" alt="${trainerAlt}" width="320" height="320" decoding="async" onload="window.playNormalizeTrainerAvatar?.(this, { mode: 'card' })" onerror="this.onerror=null;this.src='images/trainers/red-gen1.png';window.playNormalizeTrainerAvatar?.(this, { mode: 'card' })">
            </div>
          </div>`;
    if (avatarOnly) {
      // Avatar Workshop preview deliberately ignores the Card Style background so the
      // sprite is judged on a neutral stage.
      return `
        <div class="tid-avatar-preview is-neutral-stage">
          ${avatarStageHtml}
        </div>`;
    }
    const infoHtml = `
          <div class="tid-identity-panel tid-glass">
            <div class="tid-plaque tid-plaque-name">
              <p class="tid-name">${esc(card?.displayName || "Trainer")}${twitch ? `<i class="twitch-badge tid-name-twitch" title="Twitch linked" aria-label="Twitch linked"></i>` : ""}</p>
              <p class="tid-title-label">Trainer Title</p>
              ${title ? `<p class="tid-title">★ ${esc(title)}</p>` : `<p class="tid-title tid-title-empty">None equipped</p>`}
            </div>
            <div class="tid-data-rows" aria-label="Trainer identity">
              <div class="tid-data-row">
                <span class="tid-data-label">Trainer Level</span>
                <span class="tid-data-value">Lv. ${esc(card?.level || 1)}</span>
              </div>
              <div class="tid-data-row">
                <span class="tid-data-label">Trainer Since</span>
                <span class="tid-data-value">${window.playCardDate(card?.startedAt)}</span>
              </div>
            </div>
            ${identityOnly ? "" : tidStatRowsHtml(card, counts, esc)}
            ${identityOnly ? "" : `<div class="tid-info-xp">${window.playXpProgressHtml(card, { profile: true })}</div>`}
            <div class="tid-plaque tid-plaque-badges">
              <p class="tid-ach-kicker">Featured Ribbons</p>
              ${badgeRowHtml(badges, esc)}
            </div>
          </div>`;
    return `
      <article class="tid-card tid-card-bdsp id-card-${bg.tone} id-card-${bg.group} id-card-frame-${esc(frame)}" data-tid-mode="${mode}" data-tid-variant="${esc(variant)}" style="--id-chip:${bg.chip};--id-ink:${bg.ink};--id-head:${bg.head};--id-shadow:${bg.shadow};--id-slot:${bg.slot};--id-slot-ink:${bg.slotInk}">
        <div class="tid-art" style="background-image:url('${window.playCardBgUrl(bg.id)}')" aria-hidden="true"></div>
        <div class="tid-art-scrim" aria-hidden="true"></div>
        <div class="tid-ball-watermark" aria-hidden="true"></div>
        <header class="tid-card-head">
          <div class="tid-card-head-left">
            <img class="id-ball" src="images/items/poke-ball.png" alt="" width="28" height="28">
            <h2>TRAINER ID</h2>
          </div>
          <p class="tid-id-no">ID No. ${String(card?.idNo || "00000").padStart(5, "0")}</p>
        </header>
        <div class="tid-card-body">
          ${infoHtml}
          ${avatarStageHtml}
        </div>
      </article>`;
  };

  window.playRenderTrainerShowcaseHtml = function playRenderTrainerShowcaseHtml(card) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const showcase = card?.showcase || {};
    const favDex = showcase.favoriteDex || card?.favoriteDex;
    const favVar = showcase.favoriteVariant || card?.favoriteVariant || "normal";
    const shiny = showcase.shinyCatch;
    const achName = showcase.achievementName;
    const achDesc = showcase.achievementDescription || showcase.achievementDesc || "";
    const favName = favDex
      ? (window.playSpeciesName?.(favDex) || `No. ${favDex}`)
      : "";
    return `
      <div class="tid-showcase-grid">
        <article class="tid-show-card${favDex ? "" : " is-empty"}">
          <p class="tid-show-kicker">Favorite Pokémon</p>
          ${favDex
            ? `<div class="tid-show-stage"><img class="tid-show-sprite" src="${window.playSpriteUrl(favDex, favVar)}" alt="" width="112" height="112" loading="lazy"></div><strong>${esc(favName)}</strong>`
            : `<div class="tid-show-stage is-empty" aria-hidden="true"></div><p class="muted">Choose a favorite in My Account.</p>`}
        </article>
        <article class="tid-show-card tid-show-shiny${shiny ? "" : " is-empty"}">
          <p class="tid-show-kicker">Featured Shiny</p>
          ${shiny
            ? `<div class="tid-show-stage"><img class="tid-show-sprite" src="${window.playSpriteUrl(shiny.dex, shiny.variant, shiny.formId)}" alt="" width="112" height="112" loading="lazy"></div><strong>${window.playCaughtName(shiny)}</strong><span class="se-badge se-badge-shiny"><span class="se-badge-icon" aria-hidden="true">✦</span><span>Shiny</span></span>${shiny.level != null ? `<span class="muted">Lv. ${esc(shiny.level)}</span>` : ""}`
            : `<div class="tid-show-stage is-empty" aria-hidden="true"></div><p class="muted">Feature a Shiny catch.</p>`}
        </article>
        <article class="tid-show-card tid-show-ach${achName ? "" : " is-empty"}">
          <p class="tid-show-kicker">Featured Achievement</p>
          ${achName
            ? `<div class="tid-ach-emblem" aria-hidden="true">★</div><strong class="tid-ach-name">${esc(achName)}</strong>${achDesc ? `<span class="muted">${esc(achDesc)}</span>` : ""}`
            : `<div class="tid-ach-emblem is-empty" aria-hidden="true">★</div><p class="muted">Feature an achievement.</p>`}
        </article>
      </div>`;
  };

  function partySpeciesLabel(mon) {
    const formName = typeof window.playFormDisplayName === "function"
      ? window.playFormDisplayName(mon.dex, mon.formId || mon.pokemonFormId)
      : "";
    return String(mon.displayName || formName || mon.name || "").trim();
  }

  function partyFormLabel(mon, speciesLabel) {
    const formId = mon.formId || mon.pokemonFormId;
    if (!formId || typeof window.playFormDisplayName !== "function") return "";
    const label = String(window.playFormDisplayName(mon.dex, formId) || "").trim();
    if (!label || label === speciesLabel || label === String(mon.name || "").trim()) return "";
    // playFormDisplayName renders "Species — Form"; only the form half is worth a chip.
    const dash = label.indexOf("—");
    return dash >= 0 ? label.slice(dash + 1).trim() : label;
  }

  /**
   * Authoritative local Team Showcase background catalog (presentation).
   * Unlock/equip authority lives in progression_cosmetics kind=team_background.
   */
  window.PLAY_TEAM_BACKGROUNDS = [
  {
    "sort": 1,
    "id": "basic-red-blue",
    "name": "Red & Blue",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-red-blue",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen1",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 2,
    "id": "basic-yellow",
    "name": "Yellow",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-yellow",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen1",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 3,
    "id": "basic-gold-silver",
    "name": "Gold & Silver",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-gold-silver",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen2",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 4,
    "id": "basic-crystal",
    "name": "Crystal",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-crystal",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen2",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 5,
    "id": "basic-ruby-sapphire",
    "name": "Ruby & Sapphire",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-ruby-sapphire",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 6,
    "id": "basic-emerald",
    "name": "Emerald",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-emerald",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 7,
    "id": "basic-frlg",
    "name": "FireRed & LeafGreen",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-frlg",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 8,
    "id": "basic-diamond-pearl",
    "name": "Diamond & Pearl",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-diamond-pearl",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen4",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 9,
    "id": "basic-platinum",
    "name": "Platinum",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-platinum",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen4",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 10,
    "id": "basic-hgss",
    "name": "HeartGold & SoulSilver",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-hgss",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen4",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 11,
    "id": "basic-bw",
    "name": "Black & White",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-bw",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen5",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 12,
    "id": "basic-xy",
    "name": "X & Y",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-xy",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen6",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 13,
    "id": "basic-sun-moon",
    "name": "Sun & Moon",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-sun-moon",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen7",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 14,
    "id": "basic-scarlet-violet",
    "name": "Scarlet & Violet",
    "category": "Basic",
    "filter": "basic",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-basic-scarlet-violet",
    "free": true,
    "renderMode": "css",
    "generationStyle": "gen9",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 10,
    "id": "battle-stage",
    "name": "Battle Stage",
    "category": "Battle",
    "filter": "battle",
    "region": "",
    "source": "ST★RLIGHT",
    "style": "css",
    "cssClass": "team-bg-battle-stage",
    "free": true,
    "renderMode": "css",
    "generationStyle": "starlight",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 11,
    "id": "pallet-town",
    "name": "Pallet Town",
    "category": "Cities",
    "filter": "kanto",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/pallet-town.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 12,
    "id": "viridian-forest",
    "name": "Viridian Forest",
    "category": "Landmarks",
    "filter": "kanto",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/viridian-forest.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 13,
    "id": "route-1",
    "name": "Route 1",
    "category": "Routes",
    "filter": "kanto",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/route-1.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 14,
    "id": "route-2",
    "name": "Route 2",
    "category": "Routes",
    "filter": "kanto",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/route-2.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 15,
    "id": "mt-moon",
    "name": "Mt. Moon",
    "category": "Landmarks",
    "filter": "kanto",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/mt-moon.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 16,
    "id": "cerulean-cave",
    "name": "Cerulean Cave",
    "category": "Landmarks",
    "filter": "kanto",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/cerulean-cave.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 17,
    "id": "digletts-cave",
    "name": "Diglett's Cave",
    "category": "Landmarks",
    "filter": "kanto",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/digletts-cave.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 18,
    "id": "rock-tunnel",
    "name": "Rock Tunnel",
    "category": "Landmarks",
    "filter": "kanto",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/rock-tunnel.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 19,
    "id": "seafoam-islands",
    "name": "Seafoam Islands",
    "category": "Landmarks",
    "filter": "kanto",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/seafoam-islands.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 20,
    "id": "saffron-city",
    "name": "Saffron City",
    "category": "Cities",
    "filter": "kanto",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/saffron-city.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 21,
    "id": "cinnabar-lab",
    "name": "Cinnabar Lab",
    "category": "Special",
    "filter": "kanto",
    "filterBucket": "special",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/cinnabar-lab.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 22,
    "id": "safari-zone",
    "name": "Safari Zone",
    "category": "Special",
    "filter": "kanto",
    "filterBucket": "special",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/safari-zone.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 23,
    "id": "power-plant",
    "name": "Power Plant",
    "category": "Special",
    "filter": "kanto",
    "filterBucket": "special",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/power-plant.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 24,
    "id": "victory-road",
    "name": "Victory Road",
    "category": "Battle",
    "filter": "kanto",
    "filterBucket": "battle",
    "region": "Kanto",
    "source": "FRLG",
    "style": "image",
    "asset": "images/encounters/locations/frlg/victory-road.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "pixel-cover",
    "generationStyle": "gen3",
    "focalX": 0.5,
    "focalY": 0.45,
    "pixelArt": true
  },
  {
    "sort": 25,
    "id": "lgpe-digletts-cave",
    "name": "Diglett's Cave",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Digletts_Cave.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 26,
    "id": "lgpe-mt-moon",
    "name": "Mt. Moon",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Mt_Moon.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 27,
    "id": "lgpe-power-plant",
    "name": "Power Plant",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Power_Plant.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 28,
    "id": "lgpe-rock-tunnel",
    "name": "Rock Tunnel",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Rock_Tunnel.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 29,
    "id": "lgpe-seafoam-islands",
    "name": "Seafoam Islands",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Seafoam_Islands.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 30,
    "id": "lgpe-victory-road",
    "name": "Victory Road",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Victory_Road.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 31,
    "id": "lgpe-viridian-forest",
    "name": "Viridian Forest",
    "category": "Landmarks",
    "filter": "lets-go",
    "filterBucket": "landmarks",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Viridian_Forest.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 32,
    "id": "lgpe-celadon-city",
    "name": "Celadon City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Celadon_City.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 33,
    "id": "lgpe-cerulean-city",
    "name": "Cerulean City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Cerulean_City.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 34,
    "id": "lgpe-cinnabar-island",
    "name": "Cinnabar Island",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Cinnabar_Island.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 35,
    "id": "lgpe-fuchsia-city",
    "name": "Fuchsia City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Fuchsia_City.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 36,
    "id": "lgpe-indigo-plateau",
    "name": "Indigo Plateau",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Indigo_Plateau.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 37,
    "id": "lgpe-lavender-town",
    "name": "Lavender Town",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Lavender_Town.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 38,
    "id": "lgpe-pallet-town",
    "name": "Pallet Town",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Pallet_Town.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 39,
    "id": "lgpe-pewter-city",
    "name": "Pewter City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Pewter_City.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 40,
    "id": "lgpe-saffron-city",
    "name": "Saffron City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Saffron_City.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 41,
    "id": "lgpe-vermilion-city",
    "name": "Vermilion City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Vermilion_City.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 42,
    "id": "lgpe-viridian-city",
    "name": "Viridian City",
    "category": "Cities",
    "filter": "lets-go",
    "filterBucket": "cities",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Viridian_City.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 43,
    "id": "lgpe-kanto-map-background",
    "name": "Kanto Map Background",
    "category": "Special",
    "filter": "lets-go",
    "filterBucket": "special",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Kanto_Map_Background.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 44,
    "id": "lgpe-route-01",
    "name": "Route 01",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_01.png",
    "cssClass": "team-bg-image",
    "free": true,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 45,
    "id": "lgpe-route-02",
    "name": "Route 02",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_02.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 46,
    "id": "lgpe-route-03",
    "name": "Route 03",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_03.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 47,
    "id": "lgpe-route-04",
    "name": "Route 04",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_04.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 48,
    "id": "lgpe-route-05",
    "name": "Route 05",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_05.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 49,
    "id": "lgpe-route-06",
    "name": "Route 06",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_06.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 50,
    "id": "lgpe-route-07",
    "name": "Route 07",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_07.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 51,
    "id": "lgpe-route-08",
    "name": "Route 08",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_08.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 52,
    "id": "lgpe-route-09",
    "name": "Route 09",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_09.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 53,
    "id": "lgpe-route-10",
    "name": "Route 10",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_10.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 54,
    "id": "lgpe-route-11",
    "name": "Route 11",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_11.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 55,
    "id": "lgpe-route-12",
    "name": "Route 12",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_12.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 56,
    "id": "lgpe-route-13",
    "name": "Route 13",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_13.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 57,
    "id": "lgpe-route-14",
    "name": "Route 14",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_14.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 58,
    "id": "lgpe-route-15",
    "name": "Route 15",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_15.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 59,
    "id": "lgpe-route-16",
    "name": "Route 16",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_16.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 60,
    "id": "lgpe-route-17",
    "name": "Route 17",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_17.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 61,
    "id": "lgpe-route-18",
    "name": "Route 18",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_18.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 62,
    "id": "lgpe-route-19",
    "name": "Route 19",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_19.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 63,
    "id": "lgpe-route-20",
    "name": "Route 20",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_20.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 64,
    "id": "lgpe-route-21",
    "name": "Route 21",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_21.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 65,
    "id": "lgpe-route-22",
    "name": "Route 22",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_22.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 66,
    "id": "lgpe-route-23",
    "name": "Route 23",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_23.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 67,
    "id": "lgpe-route-24",
    "name": "Route 24",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_24.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  },
  {
    "sort": 68,
    "id": "lgpe-route-25",
    "name": "Route 25",
    "category": "Routes",
    "filter": "lets-go",
    "filterBucket": "routes",
    "region": "Kanto",
    "source": "Let's Go",
    "style": "image",
    "asset": "images/team-bgs/lets-go/Route_25.png",
    "cssClass": "team-bg-image",
    "free": false,
    "renderMode": "cover",
    "generationStyle": "modern",
    "focalX": 0.5,
    "focalY": 0.55
  }
];
  window.PLAY_TEAM_BG_ALIASES = {
  "starlight-gradient": "pallet-town",
  "pokedex-grid": "pallet-town",
  "research-lab": "pallet-town",
  "kanto-route": "route-1",
  "gen1-mono": "pallet-town",
  "gen2-color": "pallet-town",
  "gen3-gba": "pallet-town",
  "gen4-ds": "pallet-town",
  "retro-battle": "battle-stage",
  "owner-r011d0101": "lgpe-digletts-cave",
  "owner-r004d0101": "lgpe-mt-moon",
  "owner-r010r0101": "lgpe-power-plant",
  "owner-r010d0101": "lgpe-rock-tunnel",
  "owner-r020d0101": "lgpe-seafoam-islands",
  "owner-r023d0101": "lgpe-victory-road",
  "owner-r002g0101": "lgpe-viridian-forest",
  "owner-town007": "lgpe-celadon-city",
  "owner-town004": "lgpe-cerulean-city",
  "owner-town011": "lgpe-cinnabar-island",
  "owner-town008": "lgpe-fuchsia-city",
  "owner-town010": "lgpe-indigo-plateau",
  "owner-town005": "lgpe-lavender-town",
  "owner-town001": "lgpe-pallet-town",
  "owner-town003": "lgpe-pewter-city",
  "owner-town009": "lgpe-saffron-city",
  "owner-town006": "lgpe-vermilion-city",
  "owner-town002": "lgpe-viridian-city",
  "owner-road001": "lgpe-route-01",
  "owner-road002": "lgpe-route-02",
  "owner-road003": "lgpe-route-03",
  "owner-road004": "lgpe-route-04",
  "owner-road005": "lgpe-route-05",
  "owner-road006": "lgpe-route-06",
  "owner-road007": "lgpe-route-07",
  "owner-road008": "lgpe-route-08",
  "owner-road009": "lgpe-route-09",
  "owner-road010": "lgpe-route-10",
  "owner-road011": "lgpe-route-11",
  "owner-road012": "lgpe-route-12",
  "owner-road013": "lgpe-route-13",
  "owner-road014": "lgpe-route-14",
  "owner-road015": "lgpe-route-15",
  "owner-road016": "lgpe-route-16",
  "owner-road017": "lgpe-route-17",
  "owner-road018": "lgpe-route-18",
  "owner-road019": "lgpe-route-19",
  "owner-road020": "lgpe-route-20",
  "owner-road021": "lgpe-route-21",
  "owner-road022": "lgpe-route-22",
  "owner-road023": "lgpe-route-23",
  "owner-road024": "lgpe-route-24",
  "owner-road025": "lgpe-route-25"
};
  window.playNormalizeTeamBgId = function playNormalizeTeamBgId(id) {
    const raw = String(id || "").trim();
    if (!raw) return "pallet-town";
    return window.PLAY_TEAM_BG_ALIASES?.[raw] || raw;
  };
  window.PLAY_FREE_TEAM_BG_IDS = ["battle-stage","pallet-town","viridian-forest","route-1","mt-moon","safari-zone","lgpe-viridian-forest","lgpe-pallet-town","lgpe-viridian-city","lgpe-kanto-map-background","lgpe-route-01","basic-red-blue","basic-yellow","basic-gold-silver","basic-crystal","basic-ruby-sapphire","basic-emerald","basic-frlg","basic-diamond-pearl","basic-platinum","basic-hgss","basic-bw","basic-xy","basic-sun-moon","basic-scarlet-violet"];


  window.playTeamBg = function playTeamBg(id) {
    const key = window.playNormalizeTeamBgId?.(id) || String(id || "").trim() || "pallet-town";
    return window.PLAY_TEAM_BACKGROUNDS.find((row) => row.id === key)
      || window.PLAY_TEAM_BACKGROUNDS.find((row) => row.id === "pallet-town")
      || window.PLAY_TEAM_BACKGROUNDS[0];
  };


  window.playNormalizePartyEditorSprite = function playNormalizePartyEditorSprite(img) {
    if (!img) return;
    const viewport = img.closest(".team-slot-sprite");
    if (!viewport) return;
    const run = () => {
      try {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 1;
        if (!w || !h) return;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        let data;
        try { data = ctx.getImageData(0, 0, w, h).data; } catch (_) { return; }
        let left = w, right = 0, top = h, bottom = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] < 24) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
        if (right < left || bottom < top) return;
        const boxW = viewport.clientWidth || 72;
        const boxH = viewport.clientHeight || 72;
        const scale = Math.min(boxW / w, boxH / h) * 0.96;
        const renderW = Math.max(1, Math.round(w * scale));
        const renderH = Math.max(1, Math.round(h * scale));
        img.style.width = renderW + "px";
        img.style.height = renderH + "px";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        img.style.margin = "0";
        img.style.position = "relative";
        img.dataset.partyEditorNorm = "1";
      } catch (_) {}
    };
    const go = async () => {
      try { if (typeof img.decode === "function") await img.decode(); } catch (_) {}
      run();
    };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener("load", () => { go(); }, { once: true });
  };

  window.playNormalizePartySprite = function playNormalizePartySprite(img) {
    if (!img) return;
    const run = () => {
      try {
        const figure = img.closest(".tid-party-figure");
        if (!figure) return;
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 1;
        if (!w || !h) return;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        let data;
        try { data = ctx.getImageData(0, 0, w, h).data; } catch (_) { return; }
        let left = w, right = 0, top = h, bottom = 0;
        let sumX = 0, sumY = 0, mass = 0;
        let coreSumX = 0, coreMass = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a < 24) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            sumX += x; sumY += y; mass += 1;
            // Body/core band: middle 55% of visible height
          }
        }
        if (!mass || right < left || bottom < top) return;
        const vh = bottom - top + 1;
        const coreTop = top + Math.floor(vh * 0.2);
        const coreBot = top + Math.floor(vh * 0.75);
        for (let y = coreTop; y <= coreBot; y++) {
          for (let x = left; x <= right; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a < 40) continue;
            coreSumX += x;
            coreMass += 1;
          }
        }
        const alphaMid = (left + right) / 2;
        const coreMid = coreMass ? (coreSumX / coreMass) : alphaMid;
        const dispW = img.getBoundingClientRect().width || img.clientWidth || w;
        const scale = dispW / w;
        const coreShiftPx = (coreMid - alphaMid) * scale;
        const footPad = Math.max(0, (h - 1 - bottom) * scale);
        const visW = Math.max(1, (right - left + 1) * scale);
        figure.style.setProperty("--party-core-x", coreShiftPx.toFixed(2) + "px");
        figure.style.setProperty("--party-shadow-w", Math.round(Math.max(28, Math.min(90, visW * 0.72))) + "px");
        figure.style.setProperty("--party-foot-gap", Math.max(0, Math.min(10, footPad * 0.15)).toFixed(2) + "px");
        figure.dataset.partyNorm = "1";
      } catch (_) {}
    };
    const go = async () => {
      try { if (typeof img.decode === "function") await img.decode(); } catch (_) {}
      run();
    };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener("load", () => { go(); }, { once: true });
  };

  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const team = Array.isArray(card?.team) ? card.team : [];
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    const filled = slots.filter(Boolean).length;
    const bg = window.playTeamBg?.(card?.teamBg) || window.playTeamBg?.("pallet-town");
    const bgClass = bg?.cssClass || "team-bg-image";
    const gen = bg?.generationStyle || "modern";
    const renderMode = bg?.renderMode || (bg?.style === "image" ? "cover" : "css");
    const fx = Number.isFinite(bg?.focalX) ? bg.focalX : 0.5;
    const fy = Number.isFinite(bg?.focalY) ? bg.focalY : 0.55;
    const pixel = Boolean(bg?.pixelArt) || String(renderMode).startsWith("pixel") || gen === "gen1" || gen === "gen2" || gen === "gen3";
    const assetUrl = bg?.asset ? esc(bg.asset) : "";
    const sizeMode = String(renderMode || "cover");
    const bgSize = sizeMode === "contain" || sizeMode === "pixel-contain"
      ? "contain"
      : (sizeMode === "tile" ? "auto" : "cover");
    const bgRepeat = sizeMode === "tile" ? "repeat" : "no-repeat";
    const bgStyle = assetUrl
      ? ` style="--team-bg-image:url('${assetUrl}');--team-bg-fx:${fx};--team-bg-fy:${fy};background-image:linear-gradient(180deg,rgba(12,24,48,.08),rgba(12,24,48,.18)),url('${assetUrl}');background-size:${bgSize};background-position:calc(${fx}*100%) calc(${fy}*100%);background-repeat:${bgRepeat};${pixel ? "image-rendering:pixelated;" : ""}"`
      : ` style="--team-bg-fx:${fx};--team-bg-fy:${fy}"`;
    const perf = String(window.playPerfMode?.() || window.PLAY_PERF_MODE || "balanced").toLowerCase();
    const reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const animate = !reduce && (perf === "high" || perf === "auto" || perf === "balanced");
    const fanfare = animate ? (card?.editor ? " is-fanfare-soft" : " is-fanfare") : "";
    const figures = slots.map((mon, index) => {
      const position = index + 1;
      const row = (position % 2 === 0) ? "is-back" : "is-front";
      if (!mon) {
        return `<li class="tid-party-figure is-open ${row}" style="--i:${index}" data-slot="${position}">
          <span class="tid-party-stage" aria-hidden="true">
            <span class="tid-party-shadow"></span>
            <span class="tid-party-actor is-empty"></span>
          </span>
          <span class="tid-party-ball" aria-hidden="true">${position}</span>
          <span class="tid-party-caption is-open-label">Open</span>
        </li>`;
      }
      const shiny = String(mon.variant || "").toLowerCase().includes("shiny") || mon.shiny;
      const species = partySpeciesLabel(mon) || "Pokémon";
      const nickname = String(mon.nickname || "").trim();
      const primary = nickname || species;
      const catchId = mon.id ? esc(mon.id) : "";
      let spriteUrl = window.playSpriteUrl(mon.dex, mon.variant, mon.formId);
      if (animate && typeof window.playAnimatedSpriteUrl === "function") {
        spriteUrl = window.playAnimatedSpriteUrl(mon.dex, mon.variant, mon.formId) || spriteUrl;
      }
      return `<li class="tid-party-figure is-filled ${row}${shiny ? " is-shiny" : ""}${catchId ? " is-inspectable" : ""}" style="--i:${index}" data-slot="${position}"${catchId ? ` data-catch-id="${catchId}"` : ""}>
        ${catchId ? `<button type="button" class="tid-party-hit" data-inspect-catch="${catchId}" aria-label="Inspect ${esc(primary)}"></button>` : ""}
        <span class="tid-party-stage">
          <span class="tid-party-shadow" aria-hidden="true"></span>
          <span class="tid-party-actor">
            <img class="tid-party-sprite${animate ? " is-anim" : ""}" src="${spriteUrl}" alt="" width="96" height="96" loading="lazy" decoding="async" onload="window.playNormalizePartySprite?.(this)">
            ${shiny ? `<span class="tid-party-sparkle" title="Shiny" aria-label="Shiny">✦</span>` : ""}
          </span>
        </span>
        <span class="tid-party-ball" aria-hidden="true">${position}</span>
        <strong class="tid-party-caption">${esc(primary)}</strong>
      </li>`;
    }).join("");
    return `<div class="tid-team-showcase is-scene${fanfare}" data-team-bg-id="${esc(bg?.id || "pallet-town")}" data-gen="${esc(gen)}" data-render="${esc(renderMode)}" data-has-image="${assetUrl ? "1" : "0"}">
      <div class="tid-team-stage ${esc(bgClass)} is-${esc(renderMode)}"${bgStyle}>
        <div class="tid-team-stage-veil" aria-hidden="true"></div>
        <div class="tid-team-stage-frame" aria-hidden="true"></div>
        <ol class="tid-party-scene is-depth is-grounded">${figures}</ol>
        <p class="tid-team-scene-bgname">${esc(bg?.name || "Pallet Town")}</p>
      </div>
      ${filled ? "" : `<p class="muted tid-empty tid-party-empty">No party set yet. Organize six Pokémon in My Account.</p>`}
    </div>`;
  };

  // Trainer Journey is folded into the Trainer ID info panel; kept as a stub so any
  // stale caller renders nothing instead of throwing.
  window.playRenderTrainerProgressHtml = function playRenderTrainerProgressHtml() {
    return "";
  };

  window.playRenderTrainerStatsHtml = function playRenderTrainerStatsHtml(card) {
    const counts = profileDexCounts(card);
    const rows = [
      ["Pokédex", `${counts.kantoCaught} / ${counts.kantoTotal}`],
      ["Catches", card?.caught || 0],
      ["Shinies", card?.shinyCaught || 0],
      ["Species Mastered", card?.speciesMastered || 0]
    ];
    return `<dl class="tid-stats-grid">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
  };

  const JOURNAL_TYPE_LABELS = {
    CAPTURE: "Catch",
    ACHIEVEMENT: "Achievement",
    EVOLUTION: "Evolution",
    TRADE: "Trade",
    RESEARCH: "Research",
    MILESTONE: "Milestone"
  };
  const JOURNAL_TAB_LABELS = {
    ALL: "★ All",
    CAPTURE: "● Catches",
    ACHIEVEMENT: "★ Achievements",
    EVOLUTION: "◇ Evolutions",
    TRADE: "⇄ Trades",
    RESEARCH: "✧ Research",
    MILESTONE: "◆ Milestones"
  };

  function journalNormalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.type) {
      return {
        type: String(raw.type || "CAPTURE").toUpperCase(),
        at: raw.at || raw.caughtAt || null,
        title: raw.title || "",
        body: raw.body || "",
        dex: raw.dex,
        variant: raw.variant,
        formId: raw.formId,
        gender: raw.gender || "",
        ball: raw.ball || "",
        place: raw.place || raw.routeName || raw.locationName || raw.area || ""
      };
    }
    const at = raw.caughtAt || raw.at || null;
    if (!at && raw.dex == null) return null;
    const place = raw.routeName || raw.locationName || raw.area || "";
    return {
      type: "CAPTURE",
      at,
      title: `Caught ${window.playCaughtName(raw)}`,
      body: place || (typeof window.playCaughtBlurb === "function" ? window.playCaughtBlurb(raw) : ""),
      dex: raw.dex,
      variant: raw.variant,
      formId: raw.formId,
      gender: raw.gender || "",
      ball: raw.ball || "",
      place
    };
  }

  function journalEntryTime(entry) {
    const when = entry?.at ? new Date(entry.at) : null;
    return when && !Number.isNaN(when.getTime()) ? when.getTime() : 0;
  }

  const JOURNAL_LEDE = "A field journal of this Trainer's adventure — catches, milestones, and research along the way.";

  function journalFigureHtml(entry, esc) {
    if (entry.dex != null) {
      const shiny = String(entry.variant || "").toLowerCase().includes("shiny");
      return `<span class="tid-journal-figure${shiny ? " is-shiny" : ""}">
        <img class="tid-journal-sprite" src="${window.playSpriteUrl(entry.dex, entry.variant, entry.formId)}" alt="" width="48" height="48" loading="lazy">
        ${shiny ? `<span class="tid-journal-sparkle" aria-hidden="true">✦</span>` : ""}
      </span>`;
    }
    if (entry.type === "ACHIEVEMENT") {
      return `<span class="tid-journal-figure is-emblem is-achievement"><span class="tid-journal-emblem" aria-hidden="true">★</span></span>`;
    }
    if (entry.type === "EVOLUTION") {
      return `<span class="tid-journal-figure is-emblem is-evolution"><span class="tid-journal-emblem" aria-hidden="true">◇</span></span>`;
    }
    if (entry.type === "TRADE") {
      return `<span class="tid-journal-figure is-emblem is-trade"><span class="tid-journal-emblem" aria-hidden="true">⇄</span></span>`;
    }
    return `<span class="tid-journal-figure is-emblem"><span class="tid-journal-emblem is-plain" aria-hidden="true">•</span></span>`;
  }

  function journalFactsHtml(entry, esc) {
    const facts = [];
    // Catch entries: place · ball only (no gender noise).
    if (entry.ball) {
      const ballName = typeof window.playItemLabel === "function" ? window.playItemLabel(entry.ball) : entry.ball;
      const ballSprite = typeof window.playItemSprite === "function" ? window.playItemSprite(entry.ball) : "";
      facts.push(`<li class="tid-journal-fact tid-journal-ball">${ballSprite ? `<img src="${ballSprite}" alt="" width="16" height="16" loading="lazy">` : ""}${esc(ballName)}</li>`);
    }
    if (entry.place) {
      facts.push(`<li class="tid-journal-fact tid-journal-place">${esc(entry.place)}</li>`);
    }
    if (!facts.length) return "";
    return `<ul class="tid-journal-facts">${facts.join("")}</ul>`;
  }

  window.playRenderAdventureLogHtml = function playRenderAdventureLogHtml(entries, options) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const opts = options && typeof options === "object" ? options : {};
    const limit = Math.max(1, Number(opts.limit) || 8);
    const activeCat = String(opts.category || "ALL").toUpperCase();
    const source = Array.isArray(entries) ? entries : [];
    const normalized = source.map(journalNormalizeEntry).filter(Boolean);
    normalized.sort((a, b) => journalEntryTime(b) - journalEntryTime(a));
    if (!normalized.length) {
      return `<div class="tid-journal is-empty">
        <p class="tid-journal-lede">${JOURNAL_LEDE}</p>
        <p class="muted tid-empty tid-journal-empty">No journal entries yet. Catches will appear here.</p>
      </div>`;
    }
    const presentTypes = [...new Set(normalized.map((row) => row.type))];
    const tabKeys = ["ALL", ...presentTypes.filter((t) => t !== "ALL")];
    const filtered = activeCat === "ALL"
      ? normalized
      : normalized.filter((row) => row.type === activeCat);
    const visible = filtered.slice(0, limit);
    const moreRemain = filtered.length > visible.length;
    const fmtDate = (entry) => {
      const when = entry.at ? new Date(entry.at) : null;
      if (!when || Number.isNaN(when.getTime())) return "";
      return when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };
    return `
      <div class="tid-journal" data-journal-root>
        <p class="tid-journal-lede">${JOURNAL_LEDE}</p>
        <div class="tid-journal-tabs" role="tablist" aria-label="Journal categories">
          ${tabKeys.map((key) => {
            const selected = key === activeCat;
            const label = JOURNAL_TAB_LABELS[key] || JOURNAL_TYPE_LABELS[key] || key;
            return `<button type="button" class="tid-journal-tab${selected ? " is-active" : ""}" role="tab" data-journal-cat="${esc(key)}" aria-selected="${selected ? "true" : "false"}">${esc(label)}</button>`;
          }).join("")}
        </div>
        <div class="tid-journal-book">
          <ol class="tid-journal-timeline">
            ${visible.map((entry, index) => {
              const typeLabel = JOURNAL_TYPE_LABELS[entry.type] || entry.type;
              const shiny = String(entry.variant || "").toLowerCase().includes("shiny");
              const stamp = fmtDate(entry);
              let headline = entry.title || entry.body || typeLabel;
              let subline = "";
              let note = "";
              let showTypeChip = entry.type !== "CAPTURE";
              if (entry.type === "CAPTURE" && entry.dex != null) {
                const species = (typeof window.playSpeciesName === "function" && window.playSpeciesName(entry.dex))
                  || String(entry.title || "").replace(/^Caught\s+/i, "")
                  || `No. ${entry.dex}`;
                headline = species;
                subline = stamp ? `Caught ${stamp}` : "Caught";
                // Place · Ball are shown as facts; skip repeating body.
                note = "";
              } else {
                if (stamp) subline = stamp;
                note = entry.body && entry.body !== entry.title && entry.body !== entry.place
                  ? entry.body
                  : "";
              }
              const factBits = [];
              if (entry.type === "CAPTURE") {
                if (entry.place) factBits.push(esc(entry.place));
                if (entry.ball) {
                  const ballName = typeof window.playItemLabel === "function" ? window.playItemLabel(entry.ball) : entry.ball;
                  factBits.push(esc(ballName));
                }
              }
              return `<li class="tid-journal-entry tid-journal-entry-${esc(entry.type.toLowerCase())}${shiny ? " is-shiny" : ""}" data-journal-type="${esc(entry.type)}" style="--tid-journal-i:${index}">
                ${journalFigureHtml(entry, esc)}
                <div class="tid-journal-copy">
                  <p class="tid-journal-title">${esc(headline)}</p>
                  ${subline ? `<p class="tid-journal-sub">${esc(subline)}</p>` : ""}
                  ${factBits.length ? `<p class="tid-journal-catchline">${factBits.join(" · ")}</p>` : ""}
                  <div class="tid-journal-meta">
                    ${showTypeChip ? `<span class="tid-journal-type">${esc(typeLabel)}</span>` : ""}
                    ${shiny ? `<span class="tid-journal-shiny-tag"><span aria-hidden="true">✦</span> Shiny</span>` : ""}
                  </div>
                  ${note ? `<p class="tid-journal-desc">${esc(note)}</p>` : ""}
                  ${entry.type === "CAPTURE" ? "" : journalFactsHtml(entry, esc)}
                </div>
              </li>`;
            }).join("")}
          </ol>
          ${moreRemain ? `<button type="button" class="button secondary tid-journal-more" data-journal-more>Show more</button>` : ""}
        </div>
      </div>`;
  };
})();
