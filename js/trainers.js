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
    ] }
  ];

  window.playTrainerLooks = function playTrainerLooks(row) {
    if (Array.isArray(row?.looks) && row.looks.length) return row.looks;
    const looks = [];
    if (row?.male) looks.push({ ...row.male, gender: row.female ? "Male" : "" });
    if (row?.female) looks.push({ ...row.female, gender: row.male ? "Female" : "" });
    return looks;
  };

  window.playTrainerSpriteOk = function playTrainerSpriteOk(id) {
    return window.PLAY_TRAINERS.some((row) => window.playTrainerLooks(row).some((look) => look.id === id));
  };

  window.playTrainerSpriteUrl = function playTrainerSpriteUrl(id) {
    const key = window.playTrainerSpriteOk(id) ? id : "red-gen1";
    return `images/trainers/${key}.png`;
  };

  window.PLAY_CARD_BGS = [
    { id: "kanto", name: "Kanto", group: "region", tone: "dark", chip: "#8c2020e8", ink: "#fff8f0", head: "#fff8e8", shadow: "0 2px 0 #5a1010", slot: "#ffe8d0", slotInk: "#6a2018" },
    { id: "johto", name: "Johto", group: "region", tone: "light", chip: "#5a4010e8", ink: "#fff6d8", head: "#4a3010", shadow: "0 1px 0 #ffe8a0", slot: "#fff0c0", slotInk: "#4a3010" },
    { id: "hoenn", name: "Hoenn", group: "region", tone: "dark", chip: "#2d5a88e8", ink: "#f4fbff", head: "#fff", shadow: "0 2px 0 #1a3a58", slot: "#dceeff", slotInk: "#1e4060" },
    { id: "sinnoh", name: "Sinnoh", group: "region", tone: "light", chip: "#3d6aa0e8", ink: "#f4fbff", head: "#1e4068", shadow: "0 1px 0 #e8f4ff", slot: "#e8f4ff", slotInk: "#234868" },
    { id: "unova", name: "Unova", group: "region", tone: "dark", chip: "#d8d8e6ee", ink: "#222230", head: "#f4f4fa", shadow: "0 2px 0 #111118", slot: "#ececf4", slotInk: "#222230" },
    { id: "kalos", name: "Kalos", group: "region", tone: "dark", chip: "#f5e48ae8", ink: "#1e4a88", head: "#fff", shadow: "0 2px 0 #1e4a88", slot: "#fff6c8", slotInk: "#1e4a88" },
    { id: "alola", name: "Alola", group: "region", tone: "light", chip: "#3a6a96e8", ink: "#fff8ee", head: "#3a4a68", shadow: "0 1px 0 #fff8e8", slot: "#fff4dc", slotInk: "#3a4a68" },
    { id: "galar", name: "Galar", group: "region", tone: "dark", chip: "#e8c44ae8", ink: "#1e2a4a", head: "#f4e8b0", shadow: "0 2px 0 #12182c", slot: "#ffe8a0", slotInk: "#1e2a4a" },
    { id: "hisui", name: "Hisui", group: "region", tone: "light", chip: "#784830e8", ink: "#fff8e8", head: "#4a3018", shadow: "0 1px 0 #fff4e0", slot: "#f4ead4", slotInk: "#4a3018" },
    { id: "paldea", name: "Paldea", group: "region", tone: "light", chip: "#c44858e8", ink: "#fff8f4", head: "#6a2838", shadow: "0 1px 0 #ffe8e8", slot: "#ffe4e4", slotInk: "#6a2838" },
    { id: "starlight", name: "Starlight", group: "cute", tone: "light", chip: "#b44a8ce8", ink: "#fff8fc", head: "#6a2858", shadow: "0 1px 0 #ffe8f8", slot: "#ffe0f0", slotInk: "#6a2858" },
    { id: "candy", name: "Candy", group: "cute", tone: "light", chip: "#d44890e8", ink: "#fff8fc", head: "#8a2860", shadow: "0 1px 0 #ffe8f4", slot: "#ffd8ec", slotInk: "#8a2860" },
    { id: "peach", name: "Peach", group: "cute", tone: "light", chip: "#e07080e8", ink: "#fff8f4", head: "#8a3840", shadow: "0 1px 0 #ffe8e0", slot: "#ffe0d4", slotInk: "#8a3840" },
    { id: "lilac", name: "Lilac", group: "cute", tone: "light", chip: "#7a58b8e8", ink: "#f8f0ff", head: "#4a3080", shadow: "0 1px 0 #f0e8ff", slot: "#eee0ff", slotInk: "#4a3080" },
    { id: "sakura", name: "Sakura", group: "cute", tone: "light", chip: "#d46088e8", ink: "#fff8fa", head: "#8a3058", shadow: "0 1px 0 #ffe8f0", slot: "#ffdce8", slotInk: "#8a3058" },
    { id: "cotton", name: "Cotton", group: "cute", tone: "light", chip: "#6a8ad0e8", ink: "#f8fbff", head: "#3a5088", shadow: "0 1px 0 #e8f4ff", slot: "#e0f0ff", slotInk: "#3a5088" },
    { id: "ribbon", name: "Ribbon", group: "cute", tone: "light", chip: "#c03870e8", ink: "#fff8fc", head: "#7a2048", shadow: "0 1px 0 #ffe0ec", slot: "#ffd0e0", slotInk: "#7a2048" },
    { id: "aurora", name: "Aurora", group: "cute", tone: "light", chip: "#6858c0e8", ink: "#f8f4ff", head: "#3a3088", shadow: "0 1px 0 #e8e0ff", slot: "#e4dcff", slotInk: "#3a3088" }
  ];

  window.playCardBg = function playCardBg(id) {
    return window.PLAY_CARD_BGS.find((row) => row.id === id) || window.PLAY_CARD_BGS.find((row) => row.id === "hoenn");
  };

  window.playCardBgUrl = function playCardBgUrl(id) {
    return `images/cards/${window.playCardBg(id).id}.png`;
  };

  window.playTrainerLook = function playTrainerLook(id) {
    for (const row of window.PLAY_TRAINERS) {
      for (const trainer of window.playTrainerLooks(row)) {
        if (trainer.id === id) return { ...row, gender: trainer.gender, trainer };
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
    const caption = [look.trainer.name, look.trainer.outfit].filter(Boolean).join(" · ");
    return `
      <article class="id-card id-card-${bg.tone}" style="--id-chip:${bg.chip};--id-ink:${bg.ink};--id-head:${bg.head};--id-shadow:${bg.shadow};--id-slot:${bg.slot};--id-slot-ink:${bg.slotInk};background-image:url('${window.playCardBgUrl(bg.id)}')">
        <header class="id-card-head">
          <i class="id-ball" aria-hidden="true"></i>
          <h2>Trainer ID</h2>
          <i class="id-ball" aria-hidden="true"></i>
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
            <p class="id-no">ID No. ${String(card.idNo || "00000").padStart(5, "0")}</p>
            <div class="id-sprite-well">
              <img src="${window.playTrainerSpriteUrl(card.trainerSprite)}" alt="${look.trainer.name}">
            </div>
            <p class="id-look">${caption}</p>
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
