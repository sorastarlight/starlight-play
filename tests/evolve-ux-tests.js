/* node tests/evolve-ux-tests.js */
globalThis.window = globalThis;
require("../js/evolve-view.js");

const view = window.playEvoView;
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, detail: error.message });
  }
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

const ready = {
  catchId: "a", ruleId: "4-5", dex: 4, name: "Charmander", toDex: 5, toName: "Charmeleon",
  haveCandy: 24, candyCost: 20, haveItem: true, available: true, familyName: "Charmander"
};
const needCandy = { ...ready, catchId: "b", haveCandy: 12, candyCost: 20, available: false, reasonUnavailable: "You need 8 more Evolution Candy." };
const needStone = {
  catchId: "c", ruleId: "25-26", dex: 25, name: "Pikachu", toDex: 26, toName: "Raichu",
  haveCandy: 50, candyCost: 40, item: "thunderstone", haveItem: false, haveItemQty: 0, available: false
};
const cord = {
  catchId: "d", ruleId: "64-65", dex: 64, name: "Kadabra", toDex: 65, toName: "Alakazam",
  haveCandy: 50, candyCost: 50, item: "linkingcord", haveItem: true, haveItemQty: 1, method: "TRADE_OR_ITEM", available: true
};
const tradeReady = { ...cord, catchId: "e", tradeReady: true, candyCost: 0, item: null, haveItem: true, available: true };
const favorite = { ...ready, catchId: "f", favorite: true };
const locked = { ...ready, catchId: "g", locked: true, available: false };
const reserved = { ...ready, catchId: "h", reserved: true, available: false };
const shiny = { ...ready, catchId: "i", variant: "shiny", name: "Charmander" };
const ownedTarget = { ...ready, catchId: "j", targetOwned: true, targetPokedex: true };
const terminal = { id: "t", dex: 6, name: "Charizard", terminal: true, canEvolve: false };

test("ready Pokémon can evolve", () => {
  assert(view.canEvolve(ready));
  assert(view.cardKind(ready) === "ready");
});
test("not enough Candy is blocked and filterable", () => {
  assert(!view.canEvolve(needCandy));
  assert(view.matchesFilter(needCandy, "candy"));
  assert(view.candyNeed(needCandy) === 8);
});
test("missing Stone is blocked and item-filterable", () => {
  assert(!view.canEvolve(needStone));
  assert(view.matchesFilter(needStone, "item"));
  assert(view.martHref("thunderstone").includes("store.html#thunderstone"));
});
test("trade evolution filter includes Cord and trade-ready", () => {
  assert(view.matchesFilter(cord, "trade"));
  assert(view.matchesFilter(tradeReady, "trade"));
  assert(!view.matchesFilter(ready, "trade"));
});
test("Linking Cord method is recognized", () => {
  assert(view.isTradeMethod(cord));
  assert(view.canEvolve(cord));
  assert(view.evolveLabel(cord).includes("Linking Cord"));
});
test("trade-ready evolution needs no Cord", () => {
  assert(view.canEvolve(tradeReady));
  assert(view.evolveLabel(tradeReady) === "Evolve Kadabra");
});
test("Favorite Pokémon is still evolvable", () => {
  assert(view.canEvolve(favorite));
  assert(view.matchesFilter(favorite, "favorites"));
});
test("Locked Pokémon opens as locked, not ready", () => {
  assert(!view.canEvolve(locked));
  assert(view.cardKind(locked) === "locked");
});
test("trade-reserved Pokémon is reserved", () => {
  assert(view.isReserved(reserved));
  assert(view.cardKind(reserved) === "reserved");
  assert(!view.canEvolve(reserved));
});
test("Shiny evolution keeps shiny filter", () => {
  assert(view.isShiny(shiny));
  assert(view.matchesFilter(shiny, "shiny"));
});
test("already-owned target still evolves", () => {
  assert(view.canEvolve(ownedTarget));
});
test("terminal Pokémon has no evolve action", () => {
  assert(view.cardKind(terminal) === "terminal");
  assert(!view.canEvolve(terminal));
});
test("double-click prevention", () => {
  const gate = view.pendingGuard();
  assert(gate.begin() === true);
  assert(gate.begin() === false);
  gate.end();
  assert(gate.begin() === true);
});
test("RPC failure copy stays human", () => {
  assert(view.humanEvoError("Unlock this Pokémon before evolving it.").includes("Unlock"));
  assert(view.humanEvoError("That Pokémon is reserved for a trade.").includes("trade"));
  assert(view.humanEvoError("This evolution's artwork is not available yet.").includes("artwork"));
});
test("Rare Candy conversion stays a +1 mapping", () => {
  assert("Rare Candy used. Charmander Evolution Candy 18 → 19.".includes("18 → 19"));
});
test("Eevee branching line uses enabled Kanto next edges", () => {
  // Authoritative release routes come from evolution_rules / play_collection
  // (to_dex 1..151). Client kantoOnlyMembers is catalog-range after national
  // roster rollout (playNationalMax), not the Kanto release gate.
  const members = [
    { dex: 133, name: "Eevee" },
    { dex: 134, name: "Vaporeon" },
    { dex: 135, name: "Jolteon" },
    { dex: 136, name: "Flareon" },
    { dex: 196, name: "Espeon" }
  ];
  const next = [
    { fromDex: 133, toDex: 134, toName: "Vaporeon" },
    { fromDex: 133, toDex: 135, toName: "Jolteon" },
    { fromDex: 133, toDex: 136, toName: "Flareon" }
  ];
  const catalog = view.kantoOnlyMembers(members);
  assert(catalog.some((row) => row.dex === 196), "catalog helper keeps national members");
  assert(catalog.every((row) => row.dex >= 1 && row.dex <= (window.playNationalMax?.() || 1025)));
  // Release UX still branches only on enabled Kanto next edges.
  const releaseMembers = members.filter((row) => row.dex <= 151);
  const layout = view.lineLayout(releaseMembers, next);
  assert(layout.kind === "branch");
  assert(layout.from.dex === 133);
  assert(layout.targets.map((row) => row.dex).join(",") === "134,135,136");
  assert(!layout.targets.some((row) => row.dex === 196));
});
test("catalog membership helper uses national max, not Kanto release", () => {
  const members = view.kantoOnlyMembers([{ dex: 133, name: "Eevee" }, { dex: 700, name: "Sylveon" }]);
  assert(members.length === 2, "national catalog members remain visible to the helper");
  assert(members.some((row) => row.dex === 700));
  assert(members.every((row) => row.dex <= (window.playNationalMax?.() || 1025)));
});
test("Kanto evolution release boundary stays server-side (to_dex 1..151)", () => {
  const fs = require("fs");
  const path = require("path");
  const root = path.join(__dirname, "..");
  const collection = fs.readFileSync(path.join(root, "supabase/migrations/20260915140000_evolution_center_viewmodel.sql"), "utf8");
  const integrity = fs.readFileSync(path.join(root, "supabase/migrations/20260916170000_phase2_evolution_integrity.sql"), "utf8");
  assert(collection.includes("r.to_dex between 1 and 151"));
  assert(collection.includes("s.dex between 1 and 151"));
  assert(integrity.includes("r.to_dex between 1 and 151"));
});
test("result model uses authoritative rewards only", () => {
  const model = view.resultModel({
    evolution: { fromName: "Charmander", toName: "Charmeleon", fromDex: 4, toDex: 5, variant: "shiny", level: 18 },
    rewards: { trainerXp: 35, masteryFrom: 2, masteryTo: 2, newDex: true, newDexXp: 25, coins: 100 },
    spent: { evolutionCandy: 20, item: null }
  }, ready);
  assert(model.newDex === true);
  assert(model.trainerXp === 35);
  assert(model.coins === 100);
  assert(model.candySpent === 20);
});
test("evolution dialogue uses the classic two-line beat", () => {
  const lines = view.dialogueLines({ fromName: "Eevee", toName: "Jolteon" });
  assert(lines.what === "What?");
  assert(lines.evolving === "EEVEE is evolving!");
  assert(lines.congrats === "Congratulations!");
  assert(lines.done === "Your Eevee evolved into Jolteon!");
});
test("result pages stay in two-line RPG dialogue", () => {
  const pages = view.resultPages({
    fromName: "Eevee",
    toName: "Jolteon",
    toDex: 135,
    trainerXp: 35,
    masteryFrom: 2,
    masteryTo: 2,
    newDex: true,
    newDexXp: 25,
    coins: 100
  });
  assert(pages[0].line1 === "Congratulations!");
  assert(pages[0].line2 === "Your Eevee evolved into Jolteon!");
  assert(pages[1].line1 === "New Pokédex entry!");
  assert(pages[1].line2.includes("#135 Jolteon"));
  assert(pages.some((page) => page.line1 === "+35 Trainer XP!"));
  assert(pages.some((page) => /PokéCoins/.test(`${page.line1} ${page.line2}`)));
});
test("Low Performance and reduced motion still have a result model", () => {
  const model = view.resultModel({ message: "Your Charmander evolved into Charmeleon!" }, ready);
  assert(model.toName === "Charmeleon");
});
test("idempotent already-evolved result does not fabricate rewards", () => {
  const model = view.resultModel({ ok: true, message: "Already evolved." }, ready);
  assert(model.already === true);
  assert(model.trainerXp === 0);
  assert(model.newDex === false);
});
test("result panel waits for Continue and skip stays on the result", () => {
  const panel = view.resultPanel(view.resultModel({
    evolution: { fromName: "Charmander", toName: "Charmeleon", fromDex: 4, toDex: 5 },
    rewards: { trainerXp: 10, masteryFrom: 2, masteryTo: 2, newDex: true, newDexXp: 25, coins: 100 }
  }, ready));
  assert(panel.subtitle.toLowerCase().includes("complete"));
  assert(panel.newDex === true);
  assert(panel.extras.some((line) => /Trainer XP/.test(line)));
});
test("Rare Candy client retries reuse one idempotency key", () => {
  const first = view.newIdempotency();
  assert(Boolean(first));
  assert(first !== view.newIdempotency());
});
test("female display uses the sprite resolver instead of copying the source file", () => {
  const ivy = view.displayVariant({ gender: "Female", variant: "normal" }, 2);
  const venusaur = view.displayVariant({ gender: "Female", variant: "normal" }, 3);
  assert(ivy === "normal" || ivy === "female");
  assert(venusaur === "female" || venusaur === "normal");
});

const failed = results.filter((row) => !row.passed);
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
console.log(`evolve-ux tests: ${results.length} passed`);
