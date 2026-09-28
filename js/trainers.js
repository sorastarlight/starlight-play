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
    { id: "kanto", name: "Kanto", group: "region", tone: "light", chip: "#6aa4dee6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#d6ebf8", slotInk: "#2a3048" },
    { id: "johto", name: "Johto", group: "region", tone: "light", chip: "#f6cd08e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#fff4b8", slotInk: "#2a3048" },
    { id: "hoenn", name: "Hoenn", group: "region", tone: "light", chip: "#83b4ace6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#d8f0ea", slotInk: "#2a3048" },
    { id: "sinnoh", name: "Sinnoh", group: "region", tone: "light", chip: "#9aa4aee6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#e8ecec", slotInk: "#2a3048" },
    { id: "unova", name: "Unova", group: "region", tone: "light", chip: "#909aade6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#e4e6ec", slotInk: "#2a3048" },
    { id: "kalos", name: "Kalos", group: "region", tone: "light", chip: "#e265a8e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#fde0ef", slotInk: "#2a3048" },
    { id: "alola", name: "Alola", group: "region", tone: "light", chip: "#e79f60e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ffe6cc", slotInk: "#2a3048" },
    { id: "galar", name: "Galar", group: "region", tone: "light", chip: "#9957c8e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ead6f8", slotInk: "#2a3048" },
    { id: "hisui", name: "Hisui", group: "region", tone: "light", chip: "#d5bd8be6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#f4ead4", slotInk: "#2a3048" },
    { id: "paldea", name: "Paldea", group: "region", tone: "light", chip: "#da5365e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ffdce2", slotInk: "#2a3048" },
    { id: "starlight", name: "Starlight", group: "cute", tone: "light", chip: "#664fc3e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#e0d8fa", slotInk: "#2a3048" },
    { id: "candy", name: "Candy", group: "cute", tone: "light", chip: "#f059bee6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ffd8f2", slotInk: "#2a3048" },
    { id: "peach", name: "Peach", group: "cute", tone: "light", chip: "#f49b89e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ffe4dc", slotInk: "#2a3048" },
    { id: "lilac", name: "Lilac", group: "cute", tone: "light", chip: "#c278e7e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#f0dcff", slotInk: "#2a3048" },
    { id: "sakura", name: "Sakura", group: "cute", tone: "light", chip: "#f998bce6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ffe0ec", slotInk: "#2a3048" },
    { id: "cotton", name: "Cotton", group: "cute", tone: "light", chip: "#7eb8dce6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#e4f2ff", slotInk: "#2a3048" },
    { id: "ribbon", name: "Ribbon", group: "cute", tone: "light", chip: "#de5777e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#ffd4de", slotInk: "#2a3048" },
    { id: "aurora", name: "Aurora", group: "cute", tone: "light", chip: "#63e2d6e6", ink: "#2a3048", head: "#fffdf4", shadow: "0 2px 0 rgba(40,36,56,.28)", slot: "#d8faf6", slotInk: "#2a3048" },
    { id: "pride-trans", name: "Trans", group: "pride", tone: "light", chip: "#5a3a78e8", ink: "#fff8fc", head: "#3a3068", shadow: "0 1px 0 #fff", slot: "#ffe0ec", slotInk: "#3a3068" },
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

  window.playCaughtName = function playCaughtName(row) {
    if (!row) return "";
    const base = row.displayName
      || (typeof window.playFormDisplayName === "function"
        ? window.playFormDisplayName(row.dex, row.formId || row.pokemonFormId)
        : null)
      || row.name
      || "";
    const name = String(row.variant || "").includes("shiny") && !/^Shiny\b/i.test(base) ? `Shiny ${base}` : base;
    return window.playEscapeAttr ? window.playEscapeAttr(name) : String(name);
  };

  window.playCaughtBlurb = function playCaughtBlurb(row) {
    if (!row) return "";
    const bits = [row.gender, window.playItemLabel(row.ball)].filter(Boolean);
    return bits.map((bit) => (window.playEscapeAttr ? window.playEscapeAttr(bit) : String(bit))).join(" · ");
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
    if (!badges.length) return `<p class="tid-badge-empty">No featured badges yet</p>`;
    return `<ul class="tid-badge-row">${badges.map((row) => `
      <li class="tid-badge">
        <span class="tid-badge-gem" aria-hidden="true">★</span>
        <span class="tid-badge-name">${esc(row.name)}</span>
      </li>`).join("")}</ul>`;
  }

  window.playRenderIdCard = function playRenderIdCard(card, options) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const opts = options || {};
    const look = window.playTrainerLook(card?.trainerSprite);
    const bg = window.playCardBg(card?.cardBg);
    const frame = String(card?.cardFrame || "plain").replace(/[^a-z0-9-]/gi, "") || "plain";
    const title = String(card?.title || "").trim();
    const badges = (card?.badges || []).slice(0, 3);
    const twitch = Boolean(card?.twitchLinked);
    const counts = profileDexCounts(card);
    const mode = opts.mode === "preview" ? "preview" : "public";
    const variant = opts.variant || "hero";
    const avatarOnly = variant === "avatar";
    const identityOnly = variant === "identity";
    const trainerAlt = esc(card?.displayName || look.trainer?.name || "Trainer");
    if (avatarOnly) {
      // Avatar Workshop preview deliberately ignores the Card Style background so the
      // sprite is judged on a neutral stage.
      return `
        <div class="tid-avatar-preview is-neutral-stage">
          <div class="tid-avatar-stage is-hero${twitch ? " has-twitch" : ""}">
            <div class="tid-avatar-glow" aria-hidden="true"></div>
            <div class="tid-avatar-platform" aria-hidden="true"></div>
            <div class="tid-avatar-well">
              <img class="tid-avatar-sprite" src="${window.playTrainerSpriteUrl(card?.trainerSprite)}" alt="${trainerAlt}" width="320" height="320" decoding="async" onerror="this.onerror=null;this.src='images/trainers/red-gen1.png'">
            </div>
          </div>
        </div>`;
    }
    const variants = counts.variants || {};
    const mastered = Number(card?.speciesMastered || 0);
    const femaleVariants = Number(variants.femaleVariants || 0);
    const secondaryCells = [
      `<div><dt>SPECIES MASTERED</dt><dd>${esc(mastered)}</dd></div>`,
      `<div><dt>RESEARCH</dt><dd>${counts.kantoCaught}<span class="tid-slash">/</span>${counts.kantoTotal}</dd></div>`
    ];
    if (femaleVariants > 0) {
      secondaryCells.push(`<div><dt>FEMALE VARIANTS</dt><dd>${esc(femaleVariants)}</dd></div>`);
    }
    return `
      <article class="tid-card id-card-${bg.tone} id-card-${bg.group} id-card-frame-${esc(frame)}" data-tid-mode="${mode}" data-tid-variant="${esc(variant)}" style="--id-chip:${bg.chip};--id-ink:${bg.ink};--id-head:${bg.head};--id-shadow:${bg.shadow};--id-slot:${bg.slot};--id-slot-ink:${bg.slotInk}">
        <div class="tid-art" style="background-image:url('${window.playCardBgUrl(bg.id)}')" aria-hidden="true"></div>
        <div class="tid-art-scrim" aria-hidden="true"></div>
        <header class="tid-card-head">
          <div class="tid-card-head-left">
            <img class="id-ball" src="images/items/poke-ball.png" alt="" width="28" height="28">
            <h2>TRAINER ID</h2>
          </div>
          <p class="tid-id-no">ID No. ${String(card?.idNo || "00000").padStart(5, "0")}</p>
        </header>
        <div class="tid-card-body">
          <div class="tid-avatar-stage is-hero${twitch ? " has-twitch" : ""}">
            <div class="tid-avatar-glow" aria-hidden="true"></div>
            <div class="tid-avatar-platform" aria-hidden="true"></div>
            <div class="tid-avatar-well">
              <img class="tid-avatar-sprite" src="${window.playTrainerSpriteUrl(card?.trainerSprite)}" alt="${trainerAlt}" width="320" height="320" decoding="async" onerror="this.onerror=null;this.src='images/trainers/red-gen1.png'">
            </div>
            ${twitch ? `<i class="twitch-badge" title="Twitch linked" aria-hidden="true"></i>` : ""}
          </div>
          <div class="tid-identity-panel tid-glass">
            <div class="tid-plaque tid-plaque-name">
              <p class="tid-name">${esc(card?.displayName || "Trainer")}</p>
              ${title ? `<p class="tid-title">★ ${esc(title)}</p>` : `<p class="tid-title tid-title-empty">Trainer</p>`}
            </div>
            <div class="tid-plaque tid-plaque-meta">
              <p class="tid-level">Lv. ${esc(card?.level || 1)}</p>
              <p class="tid-started">Trainer since ${window.playCardDate(card?.startedAt)}</p>
            </div>
            <div class="tid-plaque tid-plaque-badges">
              ${badgeRowHtml(badges, esc)}
            </div>
          </div>
        </div>
        ${identityOnly ? "" : `
        <div class="tid-info-panel tid-glass">
          <dl class="tid-highlights">
            <div><dt>Pokédex</dt><dd>${counts.kantoCaught}<span class="tid-slash">/</span>${counts.kantoTotal}</dd></div>
            <div><dt>Catches</dt><dd>${esc(card?.caught || 0)}</dd></div>
            <div><dt>Shinies</dt><dd>${esc(card?.shinyCaught || 0)}</dd></div>
            <div><dt>Evolutions</dt><dd>${esc(card?.evolved || 0)}</dd></div>
          </dl>
          <dl class="tid-highlights tid-highlights-secondary">${secondaryCells.join("")}</dl>
          <div class="tid-plaque tid-plaque-xp">${window.playXpProgressHtml(card, { profile: true })}</div>
        </div>`}
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

  const PARTY_GENDER_MARKS = { male: "♂", female: "♀" };

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

  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const team = Array.isArray(card?.team) ? card.team : [];
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    const filled = slots.filter(Boolean).length;
    const slotHtml = slots.map((mon, index) => {
      const position = index + 1;
      if (!mon) {
        return `<li class="tid-party-slot is-open" style="--tid-slot-i:${index}">
            <span class="tid-party-index" aria-hidden="true">${position}</span>
            <span class="tid-party-ball-well" aria-hidden="true">
              <img class="tid-party-ball" src="images/items/poke-ball.png" alt="" width="40" height="40">
            </span>
            <span class="tid-party-open">Open Slot</span>
          </li>`;
      }
      const shiny = String(mon.variant || "").toLowerCase().includes("shiny");
      const species = partySpeciesLabel(mon) || "Pokémon";
      const nickname = String(mon.nickname || "").trim();
      const primary = nickname || species;
      const showSpecies = Boolean(nickname) && nickname !== species;
      const genderMark = PARTY_GENDER_MARKS[String(mon.gender || "").toLowerCase()] || "";
      const formLabel = partyFormLabel(mon, species);
      const ballSprite = mon.ball && typeof window.playItemSprite === "function"
        ? window.playItemSprite(mon.ball)
        : "";
      const ballName = mon.ball && typeof window.playItemLabel === "function"
        ? window.playItemLabel(mon.ball)
        : "";
      const tags = [
        genderMark
          ? `<span class="tid-party-tag tid-party-gender is-${esc(String(mon.gender).toLowerCase())}">${genderMark}<span class="visually-hidden">${esc(mon.gender)}</span></span>`
          : "",
        formLabel ? `<span class="tid-party-tag tid-party-form">${esc(formLabel)}</span>` : ""
      ].filter(Boolean).join("");
      return `<li class="tid-party-slot is-filled${shiny ? " is-shiny" : ""}" style="--tid-slot-i:${index}">
          <span class="tid-party-index" aria-hidden="true">${position}</span>
          <span class="tid-party-figure">
            <img class="tid-party-sprite" src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="" width="72" height="72" loading="lazy">
            ${shiny ? `<span class="tid-party-sparkle" title="Shiny"><span aria-hidden="true">✦</span><span class="visually-hidden">Shiny</span></span>` : ""}
          </span>
          <strong class="tid-party-name">${esc(primary)}</strong>
          ${showSpecies ? `<span class="tid-party-species">${esc(species)}</span>` : ""}
          ${mon.level != null ? `<span class="tid-party-lv">Lv. ${esc(mon.level)}</span>` : ""}
          ${tags ? `<span class="tid-party-tags">${tags}</span>` : ""}
          ${ballSprite ? `<img class="tid-party-ball-icon" src="${ballSprite}" alt="" width="18" height="18" loading="lazy" title="${esc(ballName || "Poké Ball")}">` : ""}
        </li>`;
    }).join("");
    return `<div class="tid-party-tray${filled ? "" : " is-all-empty"}">
      <ol class="tid-party tid-party-slots">${slotHtml}</ol>
      ${filled ? "" : `<p class="muted tid-empty tid-party-empty">No party set yet. Organize six Pokémon in My Account.</p>`}
    </div>`;
  };

  // Trainer Journey is folded into the Trainer ID info panel; kept as a stub so any
  // stale caller renders nothing instead of throwing.
  window.playRenderTrainerProgressHtml = function playRenderTrainerProgressHtml() {
    return "";
  };

  window.playRenderTrainerStatsHtml = function playRenderTrainerStatsHtml(card) {
    const variants = card?.variants || {};
    const counts = profileDexCounts(card);
    const rows = [
      ["Pokédex", `${counts.kantoCaught} / ${counts.kantoTotal}`],
      ["Caught", card?.caught || 0],
      ["Shinies", card?.shinyCaught || 0],
      ["Evolved", card?.evolved || 0],
      ["Mastered", card?.speciesMastered || 0],
      ["Female variants", variants.femaleVariants || 0]
    ];
    return `<dl class="tid-stats-grid">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
  };

  const JOURNAL_TYPE_LABELS = {
    CAPTURE: "Capture",
    ACHIEVEMENT: "Achievement",
    EVOLUTION: "Evolution",
    TRADE: "Trade",
    RESEARCH: "Research",
    MILESTONE: "Milestone"
  };
  const JOURNAL_TAB_LABELS = {
    ALL: "All",
    CAPTURE: "Captures",
    ACHIEVEMENT: "Achievements",
    EVOLUTION: "Evolutions",
    TRADE: "Trades",
    RESEARCH: "Research",
    MILESTONE: "Milestones"
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

  const JOURNAL_LEDE = "Your adventure, recorded along the way.";
  const JOURNAL_GENDER_MARKS = { male: "♂", female: "♀" };

  function journalFigureHtml(entry, esc) {
    if (entry.dex != null) {
      const shiny = String(entry.variant || "").toLowerCase().includes("shiny");
      return `<span class="tid-journal-figure${shiny ? " is-shiny" : ""}">
        <img class="tid-journal-sprite" src="${window.playSpriteUrl(entry.dex, entry.variant, entry.formId)}" alt="" width="48" height="48" loading="lazy">
        ${shiny ? `<span class="tid-journal-sparkle" aria-hidden="true">✦</span>` : ""}
      </span>`;
    }
    if (entry.type === "ACHIEVEMENT") {
      return `<span class="tid-journal-figure is-emblem"><span class="tid-journal-emblem" aria-hidden="true">★</span></span>`;
    }
    return `<span class="tid-journal-figure is-emblem"><span class="tid-journal-emblem is-plain" aria-hidden="true">${esc(entry.type === "EVOLUTION" ? "⤴" : "•")}</span></span>`;
  }

  function journalFactsHtml(entry, esc) {
    const facts = [];
    const mark = JOURNAL_GENDER_MARKS[String(entry.gender || "").toLowerCase()];
    if (mark) {
      facts.push(`<li class="tid-journal-fact tid-journal-gender is-${esc(String(entry.gender).toLowerCase())}">${mark}<span class="visually-hidden">${esc(entry.gender)}</span></li>`);
    }
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
              if (entry.type === "CAPTURE" && entry.dex != null) {
                const species = (typeof window.playSpeciesName === "function" && window.playSpeciesName(entry.dex))
                  || String(entry.title || "").replace(/^Caught\s+/i, "")
                  || `No. ${entry.dex}`;
                headline = species;
                subline = stamp ? `Caught ${stamp}` : "Caught";
              } else if (stamp) {
                subline = stamp;
              }
              const note = entry.body && entry.body !== entry.title && entry.body !== entry.place
                ? entry.body
                : "";
              return `<li class="tid-journal-entry tid-journal-entry-${esc(entry.type.toLowerCase())}${shiny ? " is-shiny" : ""}" data-journal-type="${esc(entry.type)}" style="--tid-journal-i:${index}">
                ${journalFigureHtml(entry, esc)}
                <div class="tid-journal-copy">
                  <p class="tid-journal-title">${esc(headline)}</p>
                  ${subline ? `<p class="tid-journal-sub">${esc(subline)}</p>` : ""}
                  <div class="tid-journal-meta">
                    <span class="tid-journal-type">${esc(typeLabel)}</span>
                    ${shiny ? `<span class="tid-journal-shiny-tag"><span aria-hidden="true">✦</span> Shiny</span>` : ""}
                  </div>
                  ${note ? `<p class="tid-journal-desc">${esc(note)}</p>` : ""}
                  ${journalFactsHtml(entry, esc)}
                </div>
              </li>`;
            }).join("")}
          </ol>
          ${moreRemain ? `<button type="button" class="button secondary tid-journal-more" data-journal-more>Show more</button>` : ""}
        </div>
      </div>`;
  };
})();
