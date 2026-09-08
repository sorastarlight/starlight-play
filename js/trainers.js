(() => {
  window.PLAY_TRAINERS = [
    { key: "gen1", label: "Gen 1 · Kanto", games: "Red / Blue / Yellow", male: { id: "red-gen1", name: "Red" }, female: { id: "leaf-gen3", name: "Leaf" } },
    { key: "gen2", label: "Gen 2 · Johto", games: "Gold / Silver / Crystal", male: { id: "ethan-gen2", name: "Ethan" }, female: { id: "kris-gen2", name: "Kris" } },
    { key: "gen3", label: "Gen 3 · Hoenn", games: "Ruby / Sapphire / Emerald", male: { id: "brendan-gen3", name: "Brendan" }, female: { id: "may-gen3", name: "May" } },
    { key: "gen4", label: "Gen 4 · Sinnoh", games: "Diamond / Pearl / Platinum", male: { id: "lucas", name: "Lucas" }, female: { id: "dawn", name: "Dawn" } },
    { key: "gen5", label: "Gen 5 · Unova", games: "Black / White", male: { id: "hilbert", name: "Hilbert" }, female: { id: "hilda", name: "Hilda" } },
    { key: "gen6", label: "Gen 6 · Kalos", games: "X / Y", male: { id: "calem", name: "Calem" }, female: { id: "serena", name: "Serena" } },
    { key: "gen7", label: "Gen 7 · Alola", games: "Sun / Moon", male: { id: "elio", name: "Elio" }, female: { id: "selene", name: "Selene" } },
    { key: "gen8", label: "Gen 8 · Galar", games: "Sword / Shield", male: { id: "victor", name: "Victor" }, female: { id: "gloria", name: "Gloria" } },
    { key: "gen9", label: "Gen 9 · Paldea", games: "Scarlet / Violet", male: { id: "florian-s", name: "Florian" }, female: { id: "juliana-s", name: "Juliana" } },
    { key: "gen10", label: "Legends Z-A", games: "Lumiose City", male: { id: "paxton", name: "Paxton" }, female: { id: "harmony", name: "Harmony" } },
    { key: "lgpe", label: "Let's Go", games: "Let's Go Pikachu / Eevee", looks: [
      { id: "chase", name: "Chase", gender: "Male" },
      { id: "elaine", name: "Elaine", gender: "Female" },
      { id: "red-lgpe", name: "Red", gender: "Male" }
    ] },
    { key: "pla", label: "Legends: Arceus", games: "Hisui", male: { id: "rei", name: "Rei" }, female: { id: "akari", name: "Akari" } },
    { key: "ranger-fiore", label: "Ranger · Fiore", games: "Pokémon Ranger", male: { id: "pokemonranger-gen3", name: "Ranger" }, female: { id: "pokemonrangerf-gen3rs", name: "Ranger" } },
    { key: "ranger-almia", label: "Ranger · Almia", games: "Shadows of Almia", male: { id: "pokemonranger-gen4", name: "Ranger" }, female: { id: "pokemonrangerf-gen4", name: "Ranger" } },
    { key: "conquest", label: "Conquest", games: "Pokémon Conquest", male: { id: "hero-conquest", name: "Hero" }, female: { id: "heroine-conquest", name: "Heroine" } },
    { key: "go", label: "Pokémon GO", games: "Pokémon GO", male: { id: "player-go", name: "GO Trainer" } }
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
    { id: "kanto", name: "Kanto", games: "Red / Blue / Yellow", tone: "dark" },
    { id: "johto", name: "Johto", games: "Gold / Silver / Crystal", tone: "light" },
    { id: "hoenn", name: "Hoenn", games: "Ruby / Sapphire / Emerald", tone: "dark" },
    { id: "sinnoh", name: "Sinnoh", games: "Diamond / Pearl / Platinum", tone: "light" },
    { id: "unova", name: "Unova", games: "Black / White", tone: "dark" },
    { id: "kalos", name: "Kalos", games: "X / Y", tone: "dark" },
    { id: "alola", name: "Alola", games: "Sun / Moon", tone: "light" },
    { id: "galar", name: "Galar", games: "Sword / Shield", tone: "dark" },
    { id: "hisui", name: "Hisui", games: "Legends: Arceus", tone: "light" },
    { id: "paldea", name: "Paldea", games: "Scarlet / Violet", tone: "light" }
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
    return `
      <article class="id-card id-card-${bg.tone}" style="background-image:url('${window.playCardBgUrl(bg.id)}')">
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
            <p class="id-look">${look.trainer.name}</p>
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
