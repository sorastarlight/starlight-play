(() => {
  window.PLAY_TRAINERS = [
    { key: "gen1", label: "Gen 1 · Kanto", games: "Red / Blue / Yellow", looks: [
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
    { key: "gen2", label: "Gen 2 · Johto", games: "Gold / Silver / Crystal / HGSS", looks: [
      { id: "ethan-gen2", name: "Ethan", gender: "Male", outfit: "Gold / Silver" },
      { id: "ethan-gen2c", name: "Ethan", gender: "Male", outfit: "Crystal" },
      { id: "ethan", name: "Ethan", gender: "Male", outfit: "HGSS" },
      { id: "ethan-pokeathlon", name: "Ethan", gender: "Male", outfit: "Pokéathlon" },
      { id: "kris-gen2", name: "Kris", gender: "Female", outfit: "Crystal" },
      { id: "kris", name: "Kris", gender: "Female", outfit: "Classic" },
      { id: "lyra", name: "Lyra", gender: "Female", outfit: "HGSS" },
      { id: "lyra-pokeathlon", name: "Lyra", gender: "Female", outfit: "Pokéathlon" }
    ] },
    { key: "gen3", label: "Gen 3 · Hoenn", games: "Ruby / Sapphire / Emerald", looks: [
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
    { key: "gen4", label: "Gen 4 · Sinnoh", games: "Diamond / Pearl / Platinum", looks: [
      { id: "lucas", name: "Lucas", gender: "Male", outfit: "DP" },
      { id: "lucas-gen4pt", name: "Lucas", gender: "Male", outfit: "Platinum" },
      { id: "lucas-contest", name: "Lucas", gender: "Male", outfit: "Super Contest" },
      { id: "dawn", name: "Dawn", gender: "Female", outfit: "DP" },
      { id: "dawn-gen4pt", name: "Dawn", gender: "Female", outfit: "Platinum" },
      { id: "dawn-contest", name: "Dawn", gender: "Female", outfit: "Super Contest" }
    ] },
    { key: "gen5", label: "Gen 5 · Unova", games: "Black / White / B2W2", looks: [
      { id: "hilbert", name: "Hilbert", gender: "Male", outfit: "Black / White" },
      { id: "hilbert-wonderlauncher", name: "Hilbert", gender: "Male", outfit: "Wonder Launcher" },
      { id: "hilda", name: "Hilda", gender: "Female", outfit: "Black / White" },
      { id: "hilda-wonderlauncher", name: "Hilda", gender: "Female", outfit: "Wonder Launcher" },
      { id: "nate", name: "Nate", gender: "Male", outfit: "Black 2 / White 2" },
      { id: "rosa", name: "Rosa", gender: "Female", outfit: "Black 2 / White 2" },
      { id: "rosa-wonderlauncher", name: "Rosa", gender: "Female", outfit: "Wonder Launcher" }
    ] },
    { key: "gen6", label: "Gen 6 · Kalos", games: "X / Y", looks: [
      { id: "calem", name: "Calem", gender: "Male", outfit: "X / Y" },
      { id: "serena", name: "Serena", gender: "Female", outfit: "X / Y" },
      { id: "serena-anime", name: "Serena", gender: "Female", outfit: "Anime" }
    ] },
    { key: "gen7", label: "Gen 7 · Alola", games: "Sun / Moon / Ultra", looks: [
      { id: "elio", name: "Elio", gender: "Male", outfit: "Sun / Moon" },
      { id: "elio-usum", name: "Elio", gender: "Male", outfit: "Ultra" },
      { id: "selene", name: "Selene", gender: "Female", outfit: "Sun / Moon" },
      { id: "selene-usum", name: "Selene", gender: "Female", outfit: "Ultra" }
    ] },
    { key: "gen8", label: "Gen 8 · Galar", games: "Sword / Shield", looks: [
      { id: "victor", name: "Victor", gender: "Male", outfit: "Sword / Shield" },
      { id: "victor-dojo", name: "Victor", gender: "Male", outfit: "Isle of Armor" },
      { id: "victor-tundra", name: "Victor", gender: "Male", outfit: "Crown Tundra" },
      { id: "victor-league", name: "Victor", gender: "Male", outfit: "League" },
      { id: "gloria", name: "Gloria", gender: "Female", outfit: "Sword / Shield" },
      { id: "gloria-dojo", name: "Gloria", gender: "Female", outfit: "Isle of Armor" },
      { id: "gloria-tundra", name: "Gloria", gender: "Female", outfit: "Crown Tundra" },
      { id: "gloria-league", name: "Gloria", gender: "Female", outfit: "League" }
    ] },
    { key: "gen9", label: "Gen 9 · Paldea", games: "Scarlet / Violet", looks: [
      { id: "florian-s", name: "Florian", gender: "Male", outfit: "School" },
      { id: "florian-bb", name: "Florian", gender: "Male", outfit: "Blueberry" },
      { id: "florian-festival", name: "Florian", gender: "Male", outfit: "Festival" },
      { id: "juliana-s", name: "Juliana", gender: "Female", outfit: "School" },
      { id: "juliana-bb", name: "Juliana", gender: "Female", outfit: "Blueberry" },
      { id: "juliana-festival", name: "Juliana", gender: "Female", outfit: "Festival" }
    ] },
    { key: "gen10", label: "Legends Z-A", games: "Lumiose City", looks: [
      { id: "paxton", name: "Paxton", gender: "Male" },
      { id: "harmony", name: "Harmony", gender: "Female" }
    ] },
    { key: "lgpe", label: "Let's Go", games: "Let's Go Pikachu / Eevee", looks: [
      { id: "chase", name: "Chase", gender: "Male" },
      { id: "elaine", name: "Elaine", gender: "Female" },
      { id: "red-lgpe", name: "Red", gender: "Male", outfit: "Let's Go" }
    ] },
    { key: "pla", label: "Legends: Arceus", games: "Hisui", looks: [
      { id: "rei", name: "Rei", gender: "Male" },
      { id: "akari", name: "Akari", gender: "Female" }
    ] },
    { key: "ranger-fiore", label: "Ranger · Fiore", games: "Pokémon Ranger", looks: [
      { id: "pokemonranger-gen3", name: "Ranger", gender: "Male" },
      { id: "pokemonrangerf-gen3rs", name: "Ranger", gender: "Female" }
    ] },
    { key: "ranger-almia", label: "Ranger · Almia", games: "Shadows of Almia", looks: [
      { id: "pokemonranger-gen4", name: "Ranger", gender: "Male" },
      { id: "pokemonrangerf-gen4", name: "Ranger", gender: "Female" }
    ] },
    { key: "conquest", label: "Conquest", games: "Pokémon Conquest", looks: [
      { id: "hero-conquest", name: "Hero", gender: "Male" },
      { id: "heroine-conquest", name: "Heroine", gender: "Female" }
    ] },
    { key: "go", label: "Pokémon GO", games: "Pokémon GO", looks: [
      { id: "player-go", name: "GO Trainer" }
    ] },
    { key: "anime", label: "Anime", games: "Pokémon the Series", looks: [
      { id: "ash", name: "Ash", outfit: "Kanto" },
      { id: "ash-capbackward", name: "Ash", outfit: "Cap backward" },
      { id: "ash-johto", name: "Ash", outfit: "Johto" },
      { id: "ash-hoenn", name: "Ash", outfit: "Hoenn" },
      { id: "ash-sinnoh", name: "Ash", outfit: "Sinnoh" },
      { id: "ash-unova", name: "Ash", outfit: "Unova" },
      { id: "ash-kalos", name: "Ash", outfit: "Kalos" },
      { id: "ash-alola", name: "Ash", outfit: "Alola" },
      { id: "ashley", name: "Ashley (Kanto)" },
      { id: "ashley-crossdress-alola", name: "Ashley Crossdress Alola" },
      { id: "ashley-crossdress-unova", name: "Ashley Crossdress Unova" },
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
    { key: "sonic", premium: true, label: "Sonic the Hedgehog Series", games: "Sonic Advance / Sonic Origins", looks: [
      { id: "sonic-sonic", name: "Sonic" },
      { id: "sonic-origins-sonic", name: "Sonic Origins" },
      { id: "sonic-tails", name: "Tails" },
      { id: "sonic-origins-tails", name: "Tails Origins" },
      { id: "sonic-knuckles", name: "Knuckles" },
      { id: "sonic-origins-knuckles", name: "Knuckles Origins" },
      { id: "sonic-amy", name: "Amy" },
      { id: "sonic-origins-amy", name: "Amy Origins" },
      { id: "sonic-cream", name: "Cream" }
    ] },
    { key: "digimon", premium: true, label: "Digimon Adventure", games: "Digimon Adventure", looks: [
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
      name: "Sonic the Hedgehog Series",
      games: "Sonic Advance / Sonic Origins",
      cost: 200,
      blurb: "Unlock Sonic Advance and Sonic Origins looks for your Trainer ID.",
      looks: ["sonic-sonic", "sonic-origins-sonic", "sonic-tails", "sonic-origins-tails", "sonic-knuckles", "sonic-origins-knuckles", "sonic-amy", "sonic-origins-amy", "sonic-cream"]
    },
    {
      sku: "avatar-digimon",
      pack: "digimon",
      name: "Digimon Adventure",
      games: "Digimon Adventure",
      cost: 250,
      blurb: "Unlock Taichi, Yamato, Sora, Hikari, Takeru, Joe, Mimi, and Koushiro for your Trainer ID.",
      looks: ["taichi", "yamato", "sora", "hikari", "takeru", "joe", "mimi", "koushiro"]
    }
  ];

  window.playTrainerLooks = function playTrainerLooks(row) {
    if (Array.isArray(row?.looks) && row.looks.length) return row.looks;
    const looks = [];
    if (row?.male) looks.push({ ...row.male, gender: row.female ? "Male" : "" });
    if (row?.female) looks.push({ ...row.female, gender: row.male ? "Female" : "" });
    return looks;
  };

  window.playTrainerSpriteKey = function playTrainerSpriteKey(id) {
    return id === "ash-ashley" ? "ashley" : id;
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
    return `images/trainers/${key}.${ext}?v=av5`;
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
    return String(row.variant || "").includes("shiny") ? `Shiny ${row.name}` : row.name;
  };

  window.playCaughtBlurb = function playCaughtBlurb(row) {
    if (!row) return "";
    return [row.gender, window.playItemLabel(row.ball)].filter(Boolean).join(" · ");
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

  window.playRenderIdCard = function playRenderIdCard(card) {
    const team = Array.isArray(card?.team) ? card.team : [];
    const look = window.playTrainerLook(card?.trainerSprite);
    const bg = window.playCardBg(card?.cardBg);
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    return `
      <article class="id-card id-card-${bg.tone} id-card-${bg.group}" style="--id-chip:${bg.chip};--id-ink:${bg.ink};--id-head:${bg.head};--id-shadow:${bg.shadow};--id-slot:${bg.slot};--id-slot-ink:${bg.slotInk};background-image:url('${window.playCardBgUrl(bg.id)}')">
        <header class="id-card-head">
          <img class="id-ball" src="images/items/poke-ball.png" alt="" width="40" height="40">
          <h2>TRAINER CARD</h2>
          <p class="id-no">IDNo. ${String(card.idNo || "00000").padStart(5, "0")}</p>
          <img class="id-ball" src="images/items/poke-ball.png" alt="" width="40" height="40">
        </header>
        <div class="id-card-body">
          <dl class="id-stats">
            <div class="id-stat-wide"><dt>Name</dt><dd>${card.displayName || "Trainer"}</dd></div>
            <div><dt>Lv.</dt><dd>${card.level || 1}</dd></div>
            <div><dt>PokéCoins</dt><dd>${Number(card.coins || 0)}</dd></div>
            <div><dt>Pokédex</dt><dd>${card.species || 0}/151</dd></div>
            <div><dt>Time</dt><dd>${window.playCardTime(card.watchSeconds)}</dd></div>
            <div class="id-stat-wide"><dt>Started</dt><dd>${window.playCardDate(card.startedAt)}</dd></div>
          </dl>
          <div class="id-right">
            <div class="id-sprite-well">
              <img src="${window.playTrainerSpriteUrl(card.trainerSprite)}" alt="${look.trainer.name}">
            </div>
            ${card.title ? `<p class="id-title">${card.title}</p>` : ""}
          </div>
        </div>
        <ul class="id-team">
          ${slots.map((mon) => mon
            ? `<li><img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt=""><span>${window.playCaughtName(mon)}</span></li>`
            : `<li class="empty"><span>Empty</span></li>`
          ).join("")}
        </ul>
      </article>`;
  };
})();
