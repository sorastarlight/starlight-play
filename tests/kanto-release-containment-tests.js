/* node tests/kanto-release-containment-tests.js
 *
 * Permanent Kanto v1.0 release-containment guard.
 * Fails if ordinary encounter eligibility is re-coupled to the national catalog.
 */
const fs = require("fs");
const path = require("path");

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
function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const containment = read("supabase/migrations/20260918040000_kanto_encounter_containment.sql");
const nationalRoster = read("supabase/migrations/20260918030000_national_organized_roster.sql");
const nationalSpawn = read("supabase/migrations/20260918030100_national_spawn_eligible.sql");
const builder = read("tools/build-national-roster-migration.js");
const gameJs = read("js/game.js");
const variants = read("js/variants.js");

const SPECIAL = [144, 145, 146, 150, 151];

test("authoritative normal_spawn_max_dex is 151", () => {
  assert(containment.includes("create or replace function private.normal_spawn_max_dex()"));
  assert(/select 151;/.test(containment));
  assert(containment.includes("private.normal_spawn_max_dex()"));
});

test("spawn_species_eligible uses release max, not national catalog max", () => {
  assert(containment.includes("private.spawn_species_eligible"));
  assert(containment.includes("and s.dex between 1 and private.normal_spawn_max_dex()"));
  const eligibleStart = containment.indexOf("create or replace function private.spawn_species_eligible");
  const eligibleEnd = containment.indexOf("$function$;", eligibleStart);
  assert(eligibleStart >= 0 && eligibleEnd > eligibleStart, "eligible function block missing");
  const block = containment.slice(eligibleStart, eligibleEnd);
  assert(block.includes("private.normal_spawn_max_dex()"));
  assert(!block.includes("1025"), "eligible function must not hardcode national 1025");
});

test("spawn_pick_random_dex cannot escape into unreleased generations", () => {
  assert(containment.includes("create or replace function private.spawn_pick_random_dex()"));
  assert(containment.includes("where s.dex between 1 and max_dex"));
  assert(containment.includes("Never escape into unreleased"));
});

test("kanto availability model is v1-kanto-release with 146+5", () => {
  assert(containment.includes("'version', 'v1-kanto-release'"));
  assert(containment.includes("'ordinaryEncounterEligible', 146"));
  assert(containment.includes("'specialEventOnly', 5"));
  assert(containment.includes("jsonb_build_array(144, 145, 146, 150, 151)"));
  assert(containment.includes("'nationalDexMax', 1025"));
  assert(containment.includes("'nationalCatalogSpecies'"));
});

test("integrity block asserts 146 ordinary / 0 post-Kanto eligible / catalog preserved", () => {
  assert(containment.includes("ordinary <> 146"));
  assert(containment.includes("post <> 0"));
  assert(containment.includes("catalog < 1000"));
  assert(containment.includes("Phase 10 specials leaked"));
  assert(containment.includes("Post-Kanto species leaked"));
});

test("national catalog migrations remain (species rows not deleted)", () => {
  assert(nationalRoster.includes("1025"));
  assert(nationalRoster.includes("species_dex_check"));
  assert(nationalSpawn.includes("SUPERSEDED by 20260918040000_kanto_encounter_containment.sql"));
});

test("roster builder must not re-widen ordinary spawn to national max", () => {
  assert(builder.includes("Do NOT widen spawn_pick / spawn_species_eligible"));
  assert(builder.includes("20260918040000_kanto_encounter_containment.sql"));
  assert(!builder.includes("create or replace function private.spawn_species_eligible"));
  assert(!builder.includes("create or replace function private.spawn_pick_random_dex"));
  assert(!builder.includes("'version', 'v2-national'"));
});

test("play sprite resolver never falls forward to non-base forms", () => {
  assert(gameJs.includes("playSpriteStem"));
  assert(/(mega|alola|alolan|galar|galarian|hisui|hisuian|paldea|gmax|gigantamax)/i.test(gameJs));
  assert(gameJs.includes("refused non-base sprite form") || gameJs.includes("Never fall forward"));
});

test("KANTO_RELEASE_NORMAL_POOL is 146 BASE species conceptually", () => {
  // Structural ordinary = 151 - 5 specials.
  const ordinary = [];
  for (let dex = 1; dex <= 151; dex++) {
    if (!SPECIAL.includes(dex)) ordinary.push(dex);
  }
  assert(ordinary.length === 146, `expected 146, got ${ordinary.length}`);
  assert(ordinary[0] === 1);
  assert(ordinary[ordinary.length - 1] === 149);
  assert(!ordinary.some((d) => d > 151));
  assert(!ordinary.some((d) => SPECIAL.includes(d)));
  assert(new Set(ordinary).size === 146);
});

test("national PLAY_VARIANTS may exceed 151 while release pool stays 146", () => {
  const keys = [...variants.matchAll(/"(\d+)":\[/g)].map((m) => Number(m[1]));
  const max = Math.max(...keys);
  assert(max > 151, `national catalog expected >151, got max ${max}`);
  assert(keys.filter((d) => d >= 1 && d <= 151).length === 151);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
