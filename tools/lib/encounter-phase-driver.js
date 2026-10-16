"use strict";

/**
 * Synthetic encounter driver. It reads phase and bag state.
 * It does not sleep, click a browser, or call production.
 */
function nextEncounterAction(state) {
  const phase = String(state && state.phase || "");
  const me = (state && state.me) || {};
  const bag = (state && state.bag) || {};
  const prefer = String(state && state.prefer || "berry");
  const berry = Number(bag.berry || 0);
  const bait = Number(bag.bait || 0);
  const pokeball = Number(bag.pokeball || 0);

  if (phase === "join" && !me.joined) return { action: "join" };
  if (phase === "prepare" && me.prep == null) {
    if (prefer === "honey" && bait > 0) return { action: "prepare", item: "bait" };
    if (prefer === "none") return { action: "prepare", item: "none" };
    if (prefer === "berry" && berry > 0) return { action: "prepare", item: "berry" };
    return { action: "prepare", item: "none", reason: "no-berry" };
  }
  if (phase === "throw" && !me.ball) {
    if (pokeball < 1) return { action: "wait", reason: "no-ball" };
    return { action: "throw", item: "pokeball" };
  }
  if (phase === "reveal" || phase === "closed") return { action: "wait", reason: "result" };
  return { action: "wait", reason: "phase" };
}

module.exports = { nextEncounterAction };
