(() => {
  window.PLAY_TRAINERS = [
    { gen: 1, region: "Kanto", games: "Red / Blue / Yellow", male: { id: "red-gen1", name: "Red" }, female: { id: "leaf-gen3", name: "Leaf" } },
    { gen: 2, region: "Johto", games: "Gold / Silver / Crystal", male: { id: "ethan-gen2", name: "Ethan" }, female: { id: "kris-gen2", name: "Kris" } },
    { gen: 3, region: "Hoenn", games: "Ruby / Sapphire / Emerald", male: { id: "brendan-gen3", name: "Brendan" }, female: { id: "may-gen3", name: "May" } },
    { gen: 4, region: "Sinnoh", games: "Diamond / Pearl / Platinum", male: { id: "lucas", name: "Lucas" }, female: { id: "dawn", name: "Dawn" } },
    { gen: 5, region: "Unova", games: "Black / White", male: { id: "hilbert", name: "Hilbert" }, female: { id: "hilda", name: "Hilda" } },
    { gen: 6, region: "Kalos", games: "X / Y", male: { id: "calem", name: "Calem" }, female: { id: "serena", name: "Serena" } },
    { gen: 7, region: "Alola", games: "Sun / Moon", male: { id: "elio", name: "Elio" }, female: { id: "selene", name: "Selene" } },
    { gen: 8, region: "Galar", games: "Sword / Shield", male: { id: "victor", name: "Victor" }, female: { id: "gloria", name: "Gloria" } },
    { gen: 9, region: "Paldea", games: "Scarlet / Violet", male: { id: "florian-s", name: "Florian" }, female: { id: "juliana-s", name: "Juliana" } },
    { gen: 10, region: "Lumiose", games: "Legends Z-A", male: { id: "paxton", name: "Paxton" }, female: { id: "harmony", name: "Harmony" } }
  ];

  window.playTrainerSpriteOk = function playTrainerSpriteOk(id) {
    return window.PLAY_TRAINERS.some((row) => row.male.id === id || row.female.id === id);
  };

  window.playTrainerSpriteUrl = function playTrainerSpriteUrl(id) {
    const key = window.playTrainerSpriteOk(id) ? id : "red-gen1";
    return `images/trainers/${key}.png`;
  };

  window.playTrainerLook = function playTrainerLook(id) {
    for (const row of window.PLAY_TRAINERS) {
      if (row.male.id === id) return { ...row, gender: "Male", trainer: row.male };
      if (row.female.id === id) return { ...row, gender: "Female", trainer: row.female };
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
    const favName = card?.favoriteDex ? window.playSpeciesName(card.favoriteDex) : "";
    const fav = favName
      ? `${String(card.favoriteVariant || "").includes("shiny") ? "Shiny " : ""}${favName}`
      : "";
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    return `
      <article class="id-card">
        <header class="id-card-head">
          <i class="id-ball" aria-hidden="true"></i>
          <h2>Trainer Card</h2>
          <i class="id-ball" aria-hidden="true"></i>
        </header>
        <div class="id-card-body">
          <dl class="id-stats">
            <div><dt>Name</dt><dd>${card.displayName || "Trainer"}</dd></div>
            <div><dt>PokéCoins</dt><dd>${Number(card.coins || 0)}</dd></div>
            <div><dt>Pokédex</dt><dd>${card.species || 0}/151</dd></div>
            <div><dt>Time</dt><dd>${window.playCardTime(card.watchSeconds)}</dd></div>
            <div><dt>Started</dt><dd>${window.playCardDate(card.startedAt)}</dd></div>
            ${card.pass ? `<div><dt>Pass</dt><dd>Starlight</dd></div>` : ""}
          </dl>
          <div class="id-right">
            <p class="id-no">ID No. ${String(card.idNo || "00000").padStart(5, "0")}</p>
            <div class="id-sprite-well">
              <img src="${window.playTrainerSpriteUrl(card.trainerSprite)}" alt="${look.trainer.name}">
            </div>
            <p class="id-look">Lv. ${card.level || 1} · ${look.trainer.name}</p>
            ${card.title ? `<p class="id-title">${card.title}</p>` : ""}
          </div>
        </div>
        ${fav ? `<p class="id-fav">Favorite: ${fav}</p>` : ""}
        <ul class="id-team">
          ${slots.map((mon) => mon
            ? `<li><img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt=""><span>${window.playCaughtName(mon)}</span></li>`
            : `<li class="empty"><span>Empty</span></li>`
          ).join("")}
        </ul>
      </article>`;
  };
})();
