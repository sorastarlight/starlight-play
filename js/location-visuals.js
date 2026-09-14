(() => {
  const ASSET_DIR = "images/encounters/locations/frlg/";
  const SKIP_FILE_TOKENS = new Set(["frlg", "kanto", "fl", "png", "jpg", "jpeg", "webp", "gif"]);
  const WEAK_EXTRA = new Set([
    "1f", "2f", "3f", "4f", "5f", "6f", "7f", "8f", "9f", "10f", "11f",
    "b1f", "b2f", "b3f", "b4f", "b5f", "area", "map"
  ]);
  const REJECT_EXTRA = new Set([
    "gym", "house", "hotel", "store", "department", "bedroom", "mart", "center",
    "rooftop", "prize", "unused", "gate", "dojo", "museum", "corner", "chief",
    "entrance", "harbor", "inside", "interior", "exterior"
  ]);

  const ALIASES = {
    "diglett-cave": "digletts-cave",
    "digletts-cave": "digletts-cave",
    "mt-moon": "mt-moon",
    "mount-moon": "mt-moon",
    "pokemon-lab": "cinnabar-lab",
    "silph-company": "silph-co",
    "silph-co": "silph-co",
    "faraway": "faraway-place"
  };

  const MATCH_ALIASES = {
    "cinnabar-lab": ["cinnabar lab", "pokemon lab"],
    "digletts-cave": ["digletts cave", "diglett cave"],
    "faraway-place": ["faraway place", "birth island"],
    "silph-co": ["silph co", "silph company"],
    "kanto": ["kanto"]
  };

  window.PLAY_LOCATION_VISUAL_DIR = ASSET_DIR;

  window.playNormalizeLocationText = function playNormalizeLocationText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/pok[eé]mon/gi, "pokemon")
      .replace(/['’`]/g, "")
      .replace(/\.(png|jpe?g|webp|gif)$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  window.playLocationTokens = function playLocationTokens(value, opts) {
    const skipMeta = opts?.keepMeta ? new Set() : SKIP_FILE_TOKENS;
    return window.playNormalizeLocationText(value)
      .split(" ")
      .filter((token) => token && !skipMeta.has(token));
  };

  window.playLocationKey = function playLocationKey(value) {
    const tokens = window.playLocationTokens(value, { keepMeta: true })
      .filter((token) => token !== "frlg" && token !== "fl");
    const key = tokens.join("-");
    return ALIASES[key] || key;
  };

  function routeNumber(tokens) {
    const idx = tokens.indexOf("route");
    if (idx < 0) return "";
    return /^\d+$/.test(tokens[idx + 1] || "") ? tokens[idx + 1] : "";
  }

  function extraTokens(locationTokens, fileTokens) {
    const needed = new Set(locationTokens);
    return fileTokens.filter((token) => !needed.has(token));
  }

  function hasAllTokens(locationTokens, fileTokens) {
    return locationTokens.every((token) => fileTokens.includes(token));
  }

  function locationTokenSets(locationName) {
    const key = window.playLocationKey(locationName);
    const primary = key === "kanto" ? ["kanto"] : window.playLocationTokens(locationName);
    const extras = MATCH_ALIASES[key] || [];
    const sets = [primary];
    for (const alias of extras) {
      const tokens = alias === "kanto" ? ["kanto"] : window.playLocationTokens(alias);
      if (tokens.length) sets.push(tokens);
    }
    return sets;
  }

  function scoreTokenSet(locTokens, fileTokens, filename) {
    if (locTokens.join("-") === "kanto") {
      const raw = window.playLocationTokens(filename, { keepMeta: true });
      const extras = raw.filter((token) => token !== "frlg" && token !== "kanto");
      if (raw.includes("kanto") && !extras.length) return "HIGH";
    }
    if (!locTokens.length || !fileTokens.length) return "NONE";
    const locRoute = routeNumber(locTokens);
    const fileRoute = routeNumber(fileTokens);
    if (locRoute) {
      if (fileRoute !== locRoute) return "NONE";
    } else if (fileRoute) {
      return "NONE";
    }
    if (!hasAllTokens(locTokens, fileTokens)) return "NONE";
    const extras = extraTokens(locTokens, fileTokens);
    const locKey = locTokens.join("-");
    const locStem = locTokens.join(" ");
    const fileStem = fileTokens.join(" ");
    if (locStem === fileStem) return "EXACT";
    const rejected = extras.filter((token) => {
      if (locKey === "pokemon-mansion" && token === "mansion") return false;
      if (locKey === "power-plant" && (token === "interior" || token === "exterior")) return false;
      if ((locKey === "cinnabar-lab" || locKey === "pokemon-lab") && (token === "lab" || token === "entrance")) return false;
      if (locKey === "faraway-place" && token === "island") return false;
      return REJECT_EXTRA.has(token);
    });
    if (rejected.length) return "LOW";
    if (!extras.length) return "EXACT";
    if (extras.every((token) => WEAK_EXTRA.has(token))) return "HIGH";
    return "MEDIUM";
  }

  window.playLocationMatchConfidence = function playLocationMatchConfidence(locationName, filename) {
    const fileTokens = window.playLocationTokens(filename);
    const ranks = { EXACT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    let best = "NONE";
    for (const locTokens of locationTokenSets(locationName)) {
      const score = scoreTokenSet(locTokens, fileTokens, filename);
      if ((ranks[score] || 0) > (ranks[best] || 0)) best = score;
    }
    return best;
  };

  window.playProposeLocationMatches = function playProposeLocationMatches(locationName, filenames) {
    const rows = (filenames || [])
      .map((filename) => ({
        filename,
        confidence: window.playLocationMatchConfidence(locationName, filename)
      }))
      .filter((row) => row.confidence !== "NONE")
      .sort((a, b) => {
        const rank = { EXACT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (rank[b.confidence] || 0) - (rank[a.confidence] || 0) || a.filename.localeCompare(b.filename);
      });
    return rows;
  };

  window.playLocationVisual = function playLocationVisual(locationName) {
    const catalog = window.PLAY_LOCATION_VISUALS || {};
    const locations = catalog.locations || {};
    const seen = new Set();
    let key = window.playLocationKey(locationName);
    while (key && !seen.has(key)) {
      seen.add(key);
      const row = locations[key];
      if (row && row.enabled !== false && row.local_asset_path) {
        const asset = /^https?:\/\//i.test(row.local_asset_path) || String(row.local_asset_path).startsWith("/")
          ? row.local_asset_path
          : `/${row.local_asset_path}`;
        return {
          key,
          displayName: row.display_name || locationName,
          asset,
          position: `${row.background_position_x || 50}% ${row.background_position_y || 42}%`,
          scale: row.background_scale || 1,
          fallback: false
        };
      }
      key = row?.fallback_key || (key === "kanto" ? "" : "kanto");
    }
    return null;
  };

  window.playLocationVisualAttrs = function playLocationVisualAttrs(locationName) {
    const visual = window.playLocationVisual(locationName);
    if (!visual) return "";
    const escape = typeof window.playEscapeAttr === "function"
      ? window.playEscapeAttr
      : (value) => String(value || "").replace(/"/g, "&quot;");
    return ` data-location-key="${escape(visual.key)}" style="--loc-bg-image:url('${escape(visual.asset)}');--loc-bg-position:${escape(visual.position)}"`;
  };
})();
