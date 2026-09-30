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
   * Family presentation hints — envelopes and pixel rules only.
   * maxFill is a SAFE CEILING, never a forced equal-height target.
   */
  window.PLAY_AVATAR_FAMILY_DEFAULTS = Object.assign({
    pokemon_pixel: {
      pixelated: true,
      preferInteger: true,
      // Tall BDSP-style stage: keep crisp integer scale — do not stretch tiny sprites.
      maxFill: { stage: 0.72, card: 0.62, thumb: 0.96 },
      minFill: { stage: 0.30, card: 0.28, thumb: 0.52 }
    },
    pokemon_modern: {
      pixelated: false,
      preferInteger: false,
      maxFill: { stage: 0.88, card: 0.84, thumb: 0.96 },
      minFill: { stage: 0.40, card: 0.55, thumb: 0.55 }
    },
    digimon: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.78, card: 0.80, thumb: 0.96 },
      minFill: { stage: 0.34, card: 0.48, thumb: 0.52 }
    },
    sonic: {
      pixelated: true,
      preferInteger: true,
      maxFill: { stage: 0.80, card: 0.78, thumb: 0.96 },
      minFill: { stage: 0.36, card: 0.42, thumb: 0.54 }
    },
    default: {
      pixelated: false,
      preferInteger: false,
      maxFill: { stage: 0.82, card: 0.80, thumb: 0.96 },
      minFill: { stage: 0.34, card: 0.45, thumb: 0.52 }
    }
  }, window.PLAY_AVATAR_FAMILY_DEFAULTS || {});

  /**
   * Rare per-id presentation overrides (presentation metadata only).
   * Keys: family, workshopScale, trainerCardScale, thumbScale, offsetX, offsetY, shadowWidth, pixelated, preferInteger
   */
  window.PLAY_AVATAR_STAGE_OVERRIDES = Object.assign({
    // Keep unusual mascot art from looking oversized when padding is thin.
    "sonic-amy": { trainerCardScale: 0.92, workshopScale: 0.94 },
    "sonic-cream": { trainerCardScale: 0.94, workshopScale: 0.96 }
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
      if (!ctx) return { left: 0, top: 0, right: w - 1, bottom: h - 1, w, h, vw: w, vh: h };
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
        return { left: 0, top: 0, right: w - 1, bottom: h - 1, w, h, vw: w, vh: h };
      }
      return {
        left: scan.left,
        top: scan.top,
        right: scan.right,
        bottom: scan.bottom,
        w,
        h,
        vw: Math.max(1, scan.right - scan.left + 1),
        vh: Math.max(1, scan.bottom - scan.top + 1)
      };
    } catch (_) {
      return { left: 0, top: 0, right: w - 1, bottom: h - 1, w, h, vw: w, vh: h };
    }
  }

  function avatarFamilyOf(id, bounds) {
    const key = String(id || "").toLowerCase();
    if (/^sonic/.test(key)) return "sonic";
    if (/^(taichi|yamato|sora|hikari|takeru|joe|mimi|koushiro)$/.test(key)) return "digimon";
    const maxSrc = Math.max(bounds?.w || 0, bounds?.h || 0);
    if (maxSrc >= 256) return "pokemon_modern";
    if (maxSrc > 0 && maxSrc <= 96) return "pokemon_pixel";
    if (maxSrc > 96 && maxSrc < 256) return "digimon";
    return "default";
  }

  function avatarModeKey(mode) {
    if (mode === "thumb") return "thumb";
    if (mode === "card") return "card";
    return "stage";
  }

  function avatarEnvelopePx(mode) {
    // Context-specific presentation envelopes (same asset identity, different stage).
    // Card = tall BDSP-inspired right-side character stage (not the old square portrait).
    if (mode === "thumb") return 68;
    if (mode === "card") return 360;
    return 220;
  }

  function avatarFillLimit(familyCfg, mode, which) {
    const key = avatarModeKey(mode);
    const bag = familyCfg?.[which] || {};
    if (typeof bag === "number") return bag;
    return Number(bag[key] ?? bag.stage ?? (which === "maxFill" ? 0.82 : 0.34));
  }

  /**
   * Natural scale from authored/visible art — integer where practical, never forced equal height.
   */
  function avatarNaturalScale(bounds, familyCfg, envelope, mode) {
    const vw = Math.max(1, bounds.vw || bounds.w || 1);
    const vh = Math.max(1, bounds.vh || bounds.h || 1);
    const maxFill = avatarFillLimit(familyCfg, mode, "maxFill");
    const minFill = avatarFillLimit(familyCfg, mode, "minFill");
    const maxH = envelope * maxFill;
    const maxW = envelope * 0.92;
    let scale = Math.min(maxH / vh, maxW / vw);

    if (familyCfg.preferInteger && Math.max(bounds.w || 0, bounds.h || 0) <= 128) {
      // Largest clean integer that still fits the family's safe envelope.
      let best = 0;
      for (let n = 1; n <= 8; n += 1) {
        if (vh * n <= maxH + 0.5 && vw * n <= maxW + 0.5) best = n;
      }
      if (best > 0) scale = best;
    }

    // Recognition floor for thumbnails / tiny assets — never inflate past maxFill.
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

  /**
   * Present avatars at intentional natural scale inside a fixed stage.
   * Alpha bounds trim transparent padding for grounding only.
   */
  window.playNormalizeTrainerAvatar = function playNormalizeTrainerAvatar(img, opts) {
    if (!img) return;
    const mode = opts?.mode
      || (img.classList.contains("scc-avatar-thumb-img") || img.closest?.(".scc-avatar-thumb") ? "thumb"
        : (img.classList.contains("tid-avatar-sprite") || img.closest?.(".tid-avatar-stage") ? "card" : "stage"));
    const apply = () => {
      const bounds = avatarAlphaBounds(img) || {
        left: 0,
        top: 0,
        right: Math.max(0, (img.naturalWidth || 1) - 1),
        bottom: Math.max(0, (img.naturalHeight || 1) - 1),
        w: img.naturalWidth || 1,
        h: img.naturalHeight || 1,
        vw: img.naturalWidth || 1,
        vh: img.naturalHeight || 1
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
      let scale = avatarNaturalScale(bounds, familyCfg, envelope, mode);
      const modeMul = mode === "card"
        ? Number(familyCfg.trainerCardScale || 1)
        : mode === "thumb"
          ? Number(familyCfg.thumbScale || 1)
          : Number(familyCfg.workshopScale || 1);
      scale *= Number.isFinite(modeMul) && modeMul > 0 ? modeMul : 1;

      const renderW = Math.max(1, Math.round(bounds.w * scale));
      const renderH = Math.max(1, Math.round(bounds.h * scale));
      const visW = Math.max(1, Math.round(bounds.vw * scale));
      const visH = Math.max(1, Math.round(bounds.vh * scale));
      const padL = bounds.left * scale;
      const padR = (bounds.w - 1 - bounds.right) * scale;
      const padB = (bounds.h - 1 - bounds.bottom) * scale;
      const offX = Number(familyCfg.offsetX || 0);
      const offY = Number(familyCfg.offsetY || 0);
      const stagePct = Math.round((visH / envelope) * 1000) / 10;

      img.dataset.avatarFamily = family;
      img.dataset.avatarNorm = "1";
      img.dataset.avatarMode = mode;
      img.dataset.avatarSrcW = String(bounds.w);
      img.dataset.avatarSrcH = String(bounds.h);
      img.dataset.avatarVis = `${bounds.vw}x${bounds.vh}`;
      img.dataset.avatarRender = `${visW}x${visH}`;
      img.dataset.avatarScale = String(Math.round(scale * 1000) / 1000);
      img.dataset.avatarStagePct = String(stagePct);
      img.classList.toggle("is-pixel-art", Boolean(familyCfg.pixelated));
      img.classList.toggle("is-full-art", family === "pokemon_modern");
      img.classList.toggle("is-mascot-art", family === "sonic");
      img.style.width = `${renderW}px`;
      img.style.height = `${renderH}px`;
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.objectFit = "fill";
      img.style.margin = `0 ${-padR}px ${-padB + offY}px ${-padL}px`;
      img.style.transform = `translateX(${(((padR - padL) / 2) + offX).toFixed(2)}px)`;
      img.style.imageRendering = familyCfg.pixelated ? "pixelated" : "auto";
      img.style.filter = familyCfg.pixelated ? "none" : "";

      const shadow = avatarShadowHost(img);
      if (shadow) {
        const shadowW = Math.max(28, Math.min(envelope * 0.72, Number(familyCfg.shadowWidth) || visW * 0.78));
        shadow.style.setProperty("--shadow-w", `${Math.round(shadowW)}px`);
        shadow.classList.add("is-on");
      }
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener("load", apply, { once: true });
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
    if (!badges.length) return `<p class="tid-badge-empty">No featured badges yet</p>`;
    return `<ul class="tid-badge-row">${badges.map((row) => `
      <li class="tid-badge">
        <span class="tid-badge-gem" aria-hidden="true">★</span>
        <span class="tid-badge-name">${esc(row.name)}</span>
      </li>`).join("")}</ul>`;
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
    const badges = (card?.badges || []).slice(0, 3);
    const twitch = Boolean(card?.twitchLinked);
    const counts = profileDexCounts(card);
    const mode = opts.mode === "preview" ? "preview" : "public";
    const variant = opts.variant || "hero";
    const avatarOnly = variant === "avatar";
    const identityOnly = variant === "identity";
    const trainerAlt = esc(card?.displayName || look.trainer?.name || "Trainer");
    const spriteId = window.playEscapeAttr?.(card?.trainerSprite) || card?.trainerSprite || "";
    const avatarStageHtml = `
          <div class="tid-avatar-stage is-hero is-character${twitch ? " has-twitch" : ""}">
            <div class="tid-avatar-glow" aria-hidden="true"></div>
            <div class="tid-avatar-well">
              <span class="avatar-stage-shadow" aria-hidden="true"></span>
              <img class="tid-avatar-sprite" data-avatar-id="${spriteId}" src="${window.playTrainerSpriteUrl(card?.trainerSprite)}" alt="${trainerAlt}" width="320" height="320" decoding="async" onload="window.playNormalizeTrainerAvatar?.(this, { mode: 'card' })" onerror="this.onerror=null;this.src='images/trainers/red-gen1.png';window.playNormalizeTrainerAvatar?.(this, { mode: 'card' })">
            </div>
            ${twitch ? `<i class="twitch-badge" title="Twitch linked" aria-hidden="true"></i>` : ""}
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
              <p class="tid-name">${esc(card?.displayName || "Trainer")}</p>
              ${title ? `<p class="tid-title">★ ${esc(title)}</p>` : `<p class="tid-title tid-title-empty">Trainer</p>`}
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
              <p class="tid-ach-kicker">Featured Achievements</p>
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
    { id: "starlight-gradient", name: "ST★RLIGHT Gradient", category: "ST★RLIGHT Originals", region: "", source: "ST★RLIGHT", style: "css", cssClass: "team-bg-starlight-gradient", sort: 10 },
    { id: "pokedex-grid", name: "Pokédex Grid", category: "ST★RLIGHT Originals", region: "", source: "ST★RLIGHT", style: "css", cssClass: "team-bg-pokedex-grid", sort: 11 },
    { id: "research-lab", name: "Research Lab", category: "ST★RLIGHT Originals", region: "", source: "ST★RLIGHT", style: "css", cssClass: "team-bg-research-lab", sort: 12 },
    { id: "battle-stage", name: "Battle Stage", category: "ST★RLIGHT Originals", region: "", source: "ST★RLIGHT", style: "css", cssClass: "team-bg-battle-stage", sort: 13 },
    { id: "pallet-town", name: "Pallet Town", category: "Locations", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/pallet-town.png", cssClass: "team-bg-image", sort: 100 },
    { id: "viridian-forest", name: "Viridian Forest", category: "Locations", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/viridian-forest.png", cssClass: "team-bg-image", sort: 101 },
    { id: "route-1", name: "Route 1", category: "Routes", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/route-1.png", cssClass: "team-bg-image", sort: 110 },
    { id: "mt-moon", name: "Mt. Moon", category: "Locations", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/mt-moon.png", cssClass: "team-bg-image", sort: 120 },
    { id: "cerulean-cave", name: "Cerulean Cave", category: "Locations", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/cerulean-cave.png", cssClass: "team-bg-image", sort: 121 },
    { id: "saffron-city", name: "Saffron City", category: "Cities", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/saffron-city.png", cssClass: "team-bg-image", sort: 130 },
    { id: "cinnabar-lab", name: "Cinnabar Lab", category: "Pokémon Centers", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/cinnabar-lab.png", cssClass: "team-bg-image", sort: 140 },
    { id: "safari-zone", name: "Safari Zone", category: "Special Events", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/safari-zone.png", cssClass: "team-bg-image", sort: 150 },
    { id: "power-plant", name: "Power Plant", category: "Locations", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/power-plant.png", cssClass: "team-bg-image", sort: 151 },
    { id: "victory-road", name: "Victory Road", category: "Battle Arenas", region: "Kanto", source: "FRLG", style: "image", asset: "images/encounters/locations/frlg/victory-road.png", cssClass: "team-bg-image", sort: 160 }
  ];

  window.playTeamBg = function playTeamBg(id) {
    const key = String(id || "").trim() || "starlight-gradient";
    return window.PLAY_TEAM_BACKGROUNDS.find((row) => row.id === key)
      || window.PLAY_TEAM_BACKGROUNDS.find((row) => row.id === "starlight-gradient");
  };

  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const team = Array.isArray(card?.team) ? card.team : [];
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    const filled = slots.filter(Boolean).length;
    const bg = window.playTeamBg?.(card?.teamBg) || window.playTeamBg?.("starlight-gradient");
    const bgClass = bg?.cssClass || "team-bg-starlight-gradient";
    const bgStyle = bg?.asset
      ? ` style="--team-bg-image:url('${esc(bg.asset)}')"`
      : "";
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
      const formLabel = partyFormLabel(mon, species);
      const catchId = mon.id ? esc(mon.id) : "";
      return `<li class="tid-party-slot is-filled${shiny ? " is-shiny" : ""}${catchId ? " is-inspectable" : ""}" style="--tid-slot-i:${index}"${catchId ? ` data-catch-id="${catchId}"` : ""}>
          ${catchId ? `<button type="button" class="tid-party-hit" data-inspect-catch="${catchId}" aria-label="Inspect ${esc(primary)}"></button>` : ""}
          <span class="tid-party-index" aria-hidden="true">${position}</span>
          <span class="tid-party-figure">
            <img class="tid-party-sprite" src="${window.playSpriteUrl(mon.dex, mon.variant, mon.formId)}" alt="" width="72" height="72" loading="lazy">
            ${shiny ? `<span class="tid-party-sparkle" title="Shiny"><span aria-hidden="true">✦</span><span class="visually-hidden">Shiny</span></span>` : ""}
          </span>
          <strong class="tid-party-name">${esc(primary)}</strong>
          ${showSpecies ? `<span class="tid-party-species">${esc(species)}</span>` : ""}
          ${formLabel ? `<span class="tid-party-tags"><span class="tid-party-tag tid-party-form">${esc(formLabel)}</span></span>` : ""}
        </li>`;
    }).join("");
    return `<div class="tid-team-showcase" data-team-bg-id="${esc(bg?.id || "starlight-gradient")}">
      <div class="tid-team-stage ${esc(bgClass)}"${bgStyle}>
        <div class="tid-team-stage-veil" aria-hidden="true"></div>
        <ol class="tid-party tid-party-slots">${slotHtml}</ol>
      </div>
      <p class="tid-team-bg-meta"><span class="tid-team-bg-name">${esc(bg?.name || "ST★RLIGHT Gradient")}</span>${bg?.category ? `<span class="tid-team-bg-cat">${esc(bg.category)}</span>` : ""}</p>
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
