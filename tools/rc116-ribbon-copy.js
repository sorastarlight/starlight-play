// rc116: player-facing Ribbon copy = StreamLink achievement requirement only.
// Source text mirrors public.progression_achievements.description (server authority).
// `reason` / `provenance` / `ribbonOrigin` stay as internal metadata.
const fs = require("fs");
const REQUIREMENTS = {
  "dex-25": "Register 25 Kanto Pokémon in your Pokédex.",
  "dex-50": "Register 50 Kanto Pokémon in your Pokédex.",
  "dex-75": "Register 75 Kanto Pokémon in your Pokédex.",
  "dex-100": "Register 100 Kanto Pokémon in your Pokédex.",
  "dex-125": "Register 125 Kanto Pokémon in your Pokédex.",
  "dex-151": "Register all 151 Kanto Pokémon in your Pokédex.",
  "catch-10": "Catch 10 Pokémon in encounters.",
  "catch-25": "Catch 25 Pokémon in encounters.",
  "catch-50": "Catch 50 Pokémon in encounters.",
  "catch-100": "Catch 100 Pokémon in encounters.",
  "catch-250": "Catch 250 Pokémon in encounters.",
  "catch-500": "Catch 500 Pokémon in encounters.",
  "catch-1000": "Catch 1,000 Pokémon in encounters.",
  "dup-5": "Catch the same species 5 times.",
  "dup-10": "Catch the same species 10 times.",
  "dup-25": "Catch the same species 25 times.",
  "dup-50": "Catch the same species 50 times.",
  "dup-100": "Catch the same species 100 times.",
  "join-10": "Join 10 encounters.",
  "join-50": "Join 50 encounters.",
  "join-100": "Join 100 encounters.",
  "join-250": "Join 250 encounters.",
  "join-500": "Join 500 encounters.",
  "join-1000": "Join 1,000 encounters.",
  "honey-10": "Contribute Honey 10 times.",
  "honey-25": "Contribute Honey 25 times.",
  "honey-50": "Contribute Honey 50 times.",
  "honey-100": "Contribute Honey 100 times.",
  "honey-250": "Contribute Honey 250 times.",
  "honey-500": "Contribute Honey 500 times.",
  "shiny-1": "Catch your first shiny Pokémon.",
  "shiny-5": "Catch 5 different shiny species.",
  "shiny-10": "Catch 10 different shiny species.",
  "shiny-25": "Catch 25 different shiny species.",
  "shiny-50": "Catch 50 different shiny species.",
  "shiny-100": "Catch 100 different shiny species.",
  "shiny-151": "Catch every eligible Kanto shiny.",
  "female-1": "Catch your first female visual variant.",
  "female-10": "Catch 10 female visual variants.",
  "female-all": "Catch every eligible Kanto female visual variant.",
  "net-10": "Catch 10 Pokémon with a Net Ball while its bonus applies.",
  "dusk-10": "Catch 10 Pokémon with a Dusk Ball while its bonus applies.",
  "repeat-10": "Catch 10 Pokémon with a Repeat Ball while its bonus applies.",
  "fast-10": "Catch 10 Pokémon with a Fast Ball while its bonus applies.",
  "perfect-1": "Catch a Pokémon with a specialist Ball while its bonus is active.",
  "perfect-10": "Make 10 specialist Ball catches with the bonus active.",
  "perfect-50": "Make 50 specialist Ball catches with the bonus active.",
  "rare-1": "Catch a Rare Pokémon.",
  "rare-10": "Catch 10 Rare Pokémon.",
  "vrare-1": "Catch a Very Rare Pokémon.",
  "vrare-10": "Catch 10 Very Rare Pokémon.",
  "urare-1": "Catch an Ultra Rare Pokémon.",
  "legend-1": "Catch a Legendary or Mythical Pokémon.",
  "kanto-legend-set": "Catch Articuno, Zapdos, Moltres, and Mewtwo.",
  "fail-25": "Have 25 Pokémon break free.",
  "streak-5": "Catch Pokémon in 5 encounters in a row.",
  "streak-10": "Catch Pokémon in 10 encounters in a row.",
  "odds-5": "Catch a Pokémon at 5% or lower final chance.",
  "evo-1": "Evolve a Pokémon.",
  "evo-10": "Evolve 10 Pokémon.",
  "evo-50": "Evolve 50 Pokémon.",
  "trade-1": "Complete a trainer-to-trainer trade.",
  "trade-10": "Complete 10 trades.",
  "master-1": "Reach Master rank with one species.",
  "master-5": "Master 5 species.",
  "master-10": "Master 10 species.",
  "dup-catch-10": "Catch 10 duplicate Pokémon.",
  "dup-catch-50": "Catch 50 duplicate Pokémon."
};
// progression_achievements.rewards->>'badge' (server badge id that carries the Ribbon).
const BADGE = {
  "dex-25": "kanto-25", "dex-50": "kanto-50", "dex-75": "dex-75", "dex-100": "kanto-100", "dex-125": "dex-125",
  "dex-151": "kanto-complete", "catch-10": "catch-10", "catch-25": "catch-25", "catch-50": "catch-50",
  "catch-100": "catch-100", "catch-250": "catch-250", "catch-500": "catch-500", "catch-1000": "catch-1000",
  "dup-5": "dup-5", "dup-10": "dup-10", "dup-25": "dup-25", "dup-50": "dup-50", "dup-100": "dup-100",
  "join-10": "join-10", "join-50": "join-50", "join-100": "encounters-100", "join-250": "join-250",
  "join-500": "join-500", "join-1000": "join-1000", "honey-10": "honey-10", "honey-25": "honey-25",
  "honey-50": "honey-50", "honey-100": "honey-100", "honey-250": "honey-250", "honey-500": "honey-500",
  "shiny-1": "first-shiny", "shiny-5": "shiny-5", "shiny-10": "shiny-10", "shiny-25": "shiny-25",
  "shiny-50": "shiny-50", "shiny-100": "shiny-100", "shiny-151": "shiny-151", "female-1": "female-1",
  "female-10": "female-10", "female-all": "female-all", "net-10": "net-10", "dusk-10": "dusk-10",
  "repeat-10": "repeat-10", "fast-10": "fast-10", "perfect-1": "perfect-1", "perfect-10": "perfect-10",
  "perfect-50": "perfect-50", "rare-1": "rare-1", "rare-10": "rare-10", "vrare-1": "vrare-1",
  "vrare-10": "vrare-10", "urare-1": "urare-1", "legend-1": "legendary-catch", "kanto-legend-set": "kanto-legend-set",
  "fail-25": "fail-25", "streak-5": "streak-5", "streak-10": "streak-10", "odds-5": "odds-5",
  "evo-1": "evo-1", "evo-10": "evo-10", "evo-50": "evo-50", "trade-1": "trade-1", "trade-10": "trade-10",
  "master-1": "master-1", "master-5": "master-5", "master-10": "master-10",
  "dup-catch-10": "dup-catch-10", "dup-catch-50": "dup-catch-50"
};
const path = "data/achievement-ribbon-map.json";
const doc = JSON.parse(fs.readFileSync(path, "utf8"));
const missing = [];
doc.mappings.forEach((row) => {
  const req = REQUIREMENTS[row.achievementId];
  if (BADGE[row.achievementId]) row.badgeId = BADGE[row.achievementId];
  if (!req) {
    missing.push(row.achievementId);
    row.streamLinkDescription = `Complete the StreamLink achievement ${row.achievementName}.`;
    return;
  }
  row.streamLinkDescription = req;
});
const unmapped = Object.keys(REQUIREMENTS).filter((id) => !doc.mappings.some((row) => row.achievementId === id));
fs.writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
console.log("mappings", doc.mappings.length, "missingRequirement", missing.length, missing.join(","), "achievementsWithoutMapping", unmapped.length, unmapped.join(","));
