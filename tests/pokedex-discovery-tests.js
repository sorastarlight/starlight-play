/* node tests/pokedex-discovery-tests.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg || "assertion");
    return;
  }
  passed += 1;
  console.log("PASS", msg || "ok");
}

const pokedexHtml = fs.readFileSync(path.join(root, "pokedex.html"), "utf8");
const pokedexJs = fs.readFileSync(path.join(root, "js/pokedex.js"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260921123505_pokedex_discovery_seen_forms.sql"),
  "utf8"
);

assert(!/id="filter-region"|id="filter-gen"|id="filter-form"|id="filter-gender"/.test(pokedexHtml), "no region/gen/form/gender grid filters");
assert(/id="dex-detail"/.test(pokedexHtml) && /id="dex-counters"/.test(pokedexHtml), "detail + counters present");
assert(pokedexJs.includes("play_pokedex_entry"), "gated entry RPC used");
assert(pokedexJs.includes("You haven't discovered this Pokémon yet."), "undiscovered gate message");
assert(!pokedexJs.includes("Ready to evolve"), "no Ready to evolve on main grid");
assert(!/chip shiny/.test(pokedexJs), "no shiny chips on main grid");
assert(migration.includes("mark_seen(uid, r.dex, r.pokemon_form_id)"), "join registers form-aware seen");
assert(migration.includes("Discovery is join/catch authoritative"), "snapshot seen removed");
assert(migration.includes("from public.catches c"), "caught→seen backfill present");
assert(migration.includes("forward-only") || migration.includes("Do NOT backfill Seen from historical encounter"), "forward-only policy recorded");
const backfillSection = migration.split("-- Safe backfill")[1] || "";
assert(backfillSection.includes("from public.catches"), "backfill section uses catches");
assert(!/encounter_players/.test(backfillSection), "backfill section has no encounter_players fill");

console.log(`${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
