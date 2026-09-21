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
assert(!/id="dex-detail"/.test(pokedexHtml), "inline detail section removed");
assert(/id="dex-overlay"|dex-overlay/.test(pokedexJs) && /id="dex-counters"/.test(pokedexHtml), "overlay mount + counters present");
assert(/pokedex-reference\.js/.test(pokedexHtml), "local pokedex reference script included");
assert(!/pokeapi\.co\/api/.test(pokedexJs), "no live pokeapi.co fetch in pokedex.js");
assert(pokedexJs.includes("playPokedexRef") || pokedexJs.includes("PLAY_POKEDEX_REF") || pokedexJs.includes("localRef"), "local reference helper used");
assert(pokedexJs.includes('role="dialog"') || pokedexJs.includes("aria-modal"), "dialog semantics present");
assert(pokedexJs.includes("dex-scroll-locked") || pokedexJs.includes("lockPageScroll"), "scroll lock present");
assert(pokedexJs.includes("data-dex-close"), "backdrop/X close hooks present");
assert(pokedexJs.includes("play_pokedex_entry"), "gated entry RPC used");
assert(pokedexJs.includes("You haven't discovered this Pokémon yet."), "undiscovered gate message");
assert(!pokedexJs.includes("Ready to evolve"), "no Ready to evolve on main grid");
assert(!/chip shiny/.test(pokedexJs), "no shiny chips on main grid");
assert(!/\{\s*id:\s*"stats"/m.test(pokedexJs) && !pokedexJs.includes('label: "Stats"'), "Stats tab removed from player UI");
assert(pokedexJs.includes("normalizeTab") && pokedexJs.includes('"stats"') && pokedexJs.includes("overview"), "old stats state falls back to overview");
assert(migration.includes("mark_seen(uid, r.dex, r.pokemon_form_id)"), "join registers form-aware seen");
assert(migration.includes("Discovery is join/catch authoritative"), "snapshot seen removed");
assert(migration.includes("from public.catches c"), "caught→seen backfill present");
assert(migration.includes("forward-only") || migration.includes("Do NOT backfill Seen from historical encounter"), "forward-only policy recorded");
const backfillSection = migration.split("-- Safe backfill")[1] || "";
assert(backfillSection.includes("from public.catches"), "backfill section uses catches");
assert(!/encounter_players/.test(backfillSection), "backfill section has no encounter_players fill");

console.log(`${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
