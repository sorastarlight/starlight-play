(() => {
  const ITEM_LABELS = {
    berry: "Berry",
    bait: "Bait",
    pokeball: "Poké Ball",
    greatball: "Great Ball",
    ultraball: "Ultra Ball"
  };

  window.playItemLabel = function playItemLabel(item) {
    return ITEM_LABELS[item] || item;
  };

  window.playSpriteUrl = function playSpriteUrl(dex, variant) {
    const id = Number(dex);
    if (!id) return "";
    const shiny = String(variant || "").includes("shiny");
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
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

  window.playCall = async function playCall(name, args) {
    const { data, error } = await window.playSupabase.rpc(name, args || {});
    if (error) throw error;
    return data;
  };
})();
