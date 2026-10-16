"use strict";

/**
 * Mirrors live public.play_throw borrow rules. It does not call the database.
 * A safety-net throw is free. Any other accepted throw spends one ball later.
 */
function borrowedBallDecision(item, bagQty, throwableTotal) {
  let chosen = String(item || "");
  let borrowed = false;
  const qty = Number(bagQty || 0);
  const throwable = Number(throwableTotal || 0);
  if (chosen === "standard") {
    chosen = "pokeball";
    borrowed = true;
  }
  if (qty < 1) {
    if (chosen === "pokeball" && throwable < 1) borrowed = true;
    else return { ok: false, error: "unavailable" };
  }
  return { ok: true, ball: chosen, borrowed, spends: !borrowed };
}

module.exports = { borrowedBallDecision };
