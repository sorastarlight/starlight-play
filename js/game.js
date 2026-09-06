(() => {
  const ITEM_LABELS = {
    berry: "Berry",
    bait: "Bait",
    pokeball: "Poké Ball",
    greatball: "Great Ball",
    ultraball: "Ultra Ball",
    lure: "Lure",
    coins: "PokéCoins",
    bag_bonus: "inventory space"
  };
  const VARIANT_LABELS = {
    normal: "Normal",
    female: "Female",
    shiny: "Shiny"
  };

  window.playItemLabel = function playItemLabel(item) {
    return ITEM_LABELS[item] || item;
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
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/${id}.png`;
    }
    if (kind.includes("shiny")) {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
    }
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
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
    return message.replace(/^.*error:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, "");
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

  window.playCall = async function playCall(name, args) {
    const { data, error } = await window.playSupabase.rpc(name, args || {});
    if (error) throw error;
    return data;
  };
})();
