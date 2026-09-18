/* node tests/phase10-special-tests.js */
const fs = require("fs");
const path = require("path");
const sim = require("../tools/kanto-balance-sim");

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

const eventsSql = read("supabase/migrations/20260917070000_phase10_special_events.sql");
const rpcsSql = read("supabase/migrations/20260917071000_phase10_special_rpcs.sql");
const grantsSql = read("supabase/migrations/20260917072000_phase10_admin_grants.sql");
const closureSql = read("supabase/migrations/20260917073000_phase10_closure_integrity.sql");
const reconcileSql = read("supabase/migrations/20260917074000_phase10_reconcile_final_state.sql");
const migrateNote = read("supabase/migrations/PHASE10_MIGRATION_NOTE.md");
const specialJs = read("js/special-events.js");
const adminSpecial = read("js/admin-special.js");
const adminLive = read("js/admin-live.js");
const admin = read("js/admin.js");
const play = read("js/play.js");
const hud = read("js/hud.js");
const present = read("js/play-present.js");
const pokedex = read("js/pokedex.js");
const overlay = read("js/overlay.js");
const studio = read("js/admin-studio.js");
const bitsFulfill = read("supabase/migrations/20260917050000_phase8_bits_fulfillment.sql");
const bitsOps = read("supabase/migrations/20260917051000_phase8_bits_ops.sql");

test("schema is smallest-fit and reuses Phase 1 launch", () => {
  assert(eventsSql.includes("create table if not exists private.special_events"));
  assert(eventsSql.includes("create table if not exists private.special_event_rounds"));
  assert(eventsSql.includes("special_events_one_live"));
  assert(eventsSql.includes("WAITING_FOR_STREAM"));
  assert(eventsSql.includes("NEEDS_ADMIN"));
  assert(eventsSql.includes("private.launch_community_round"));
  assert(eventsSql.includes("private.special_event_start_round"));
  assert(eventsSql.includes("A Special Event is live"));
  assert(eventsSql.includes("special_event_director_tick"));
  assert(eventsSql.includes("This event round already started"));
});

test("Kanto availability is 146 normal + 5 special + 0 unavailable", () => {
  assert(eventsSql.includes("'evolutionOnly', '[]'::jsonb"));
  assert(eventsSql.includes("'unavailable', '[]'::jsonb"));
  assert(rpcsSql.includes("normal=%s") || rpcsSql.includes("<> 146"));
  assert(rpcsSql.includes("<> 5"));
  assert(specialJs.includes("144") && specialJs.includes("151"));
});

test("Legendaries are not ordinary auto-spawns", () => {
  const data = read("tools/kanto-balance-data.js");
  assert(data.includes("if (legendary) return \"LEGENDARY\""));
  const simSrc = read("tools/kanto-balance-sim.js");
  assert(simSrc.includes("LEGENDARY: 0"));
  assert(eventsSql.includes("spawn_band(144)") || rpcsSql.includes("spawn_band(144)"));
  assert(closureSql.includes("only appear through a Special Event"));
  assert(closureSql.includes("spawn_allow_special"));
  assert(!/mode = 'SPECIAL_EVENT'/.test(closureSql.replace(/--[^\n]*/g, "")));
});

test("Kanto v1 acquisition model is documented and unchanged", () => {
  assert(closureSql.includes("ordinaryEncounterEligible', 146"));
  assert(closureSql.includes("specialEventOnly', 5"));
  assert(closureSql.includes("evolutionRequiredFor151', false"));
  assert(closureSql.includes("Evolution is NOT required for 151/151") || closureSql.includes("not required for 151/151"));
  assert(closureSql.includes("144 Articuno"));
  assert(reconcileSql.includes("ordinaryEncounterEligible', 146"));
  assert(reconcileSql.includes("only appear through a Special Event"));
  assert(reconcileSql.includes("create table if not exists private.special_events"));
});

test("Phase 10 migration note documents manual 70000/71000 apply", () => {
  assert(migrateNote.includes("supabase db query --file"));
  assert(migrateNote.includes("20260917074000_phase10_reconcile_final_state.sql"));
  assert(migrateNote.toLowerCase().includes("do not"));
  assert(migrateNote.includes("70000") && migrateNote.includes("71000"));
  assert(migrateNote.includes("schema_migrations"));
});

test("Mew is Mythical and hidden by default", () => {
  assert(eventsSql.includes("'eventType', 'MYTHICAL'"));
  assert(eventsSql.includes("'visibility', 'HIDDEN'"));
  assert(eventsSql.includes("A MYTH RETURNS"));
  assert(rpcsSql.includes("hidden leaked"));
});

test("hidden public cards cannot leak Mew before reveal", () => {
  assert(eventsSql.includes("visibility = 'HIDDEN' and e.rounds_launched < 1"));
  assert(rpcsSql.includes("QA HIDDEN MEW"));
  assert(rpcsSql.includes("hidden leaked"));
});

test("admin special RPCs are not anon-executable", () => {
  assert(grantsSql.includes("revoke execute on function public.admin_special_event_command"));
  assert(grantsSql.includes("from public, anon"));
  assert(rpcsSql.includes("if not private.is_play_admin()"));
});

test("Bits cannot buy Legendary access, Shinies, or catch odds", () => {
  assert(rpcsSql.includes("paid legendary sku"));
  assert(bitsFulfill.includes("Bits products cannot grant Pokémon"));
  assert(adminSpecial.includes("Bits cannot buy") || admin.includes("Special Events"));
  assert(studio.includes("Bits cannot buy Legendary"));
  assert(!/bits.*forced.?shiny/i.test(eventsSql));
  assert(eventsSql.includes("NORMAL_ROLL"));
});

test("Director cannot overwrite a live Special Event", () => {
  assert(eventsSql.includes("special_event_director_tick"));
  assert(adminLive.includes("SPECIAL EVENT ACTIVE"));
  assert(adminLive.includes("Normal auto encounters are paused"));
  assert(eventsSql.includes("WAITING_FOR_STREAM"));
});

test("duplicate start cannot duplicate rounds", () => {
  assert(eventsSql.includes("pg_try_advisory_xact_lock"));
  assert(eventsSql.includes("round_index = next_index"));
  assert(eventsSql.includes("This event round already started"));
});

test("client uses Phase 3 presentation instead of a new modal system", () => {
  assert(present.includes("presentLegendary"));
  assert(present.includes('legendary: 0.4'));
  assert(play.includes("playSpecialPresentation"));
  assert(play.includes("playShowNotices"));
  assert(hud.includes("playEncounterHeadCopy"));
  assert(hud.includes("is-special"));
});

test("Pokédex does not spoil hidden Mew", () => {
  assert(pokedex.includes("announcedEvents"));
  assert(pokedex.includes("144, 145, 146, 150"));
  assert(!pokedex.includes("new Set([144, 145, 146, 150, 151])"));
  assert(pokedex.includes("EVENT ENCOUNTER"));
});

test("overlay and Live Ops distinguish special vs normal", () => {
  assert(overlay.includes("is-special"));
  assert(adminLive.includes("NORMAL ENCOUNTERS"));
  assert(admin.includes("playBindAdminSpecial"));
});

test("destructive live controls require confirmation", () => {
  assert(adminSpecial.includes("Start now"));
  assert(adminSpecial.includes("playPresentConfirm"));
  assert(adminSpecial.includes("This starts a live Special Encounter"));
  assert(adminSpecial.includes("Repeat encounter"));
  assert(adminSpecial.includes("End event"));
});

test("timezone is shown, not a bare clock", () => {
  assert(specialJs.includes("timeZone") || specialJs.includes("timeZoneName"));
  assert(adminSpecial.includes("UTC") && adminSpecial.includes("local timezone"));
  assert(adminSpecial.includes("datetime-local"));
  assert(!adminSpecial.includes("America/New_York"));
});

test("selftest never launches 144-151 against Sora", () => {
  assert(rpcsSql.includes("QA never starts a live Legendary"));
  assert(!/special_event_start_round\(.*144/.test(rpcsSql));
  assert(!/director_start_now\(\s*144/.test(rpcsSql));
});

test("achievements reuse existing catalog plus Kanto legend set", () => {
  assert(rpcsSql.includes("kanto-legend-set"));
  assert(rpcsSql.includes("SPECIES_SET"));
  const catalog = read("supabase/migrations/20260913052000_progression_catalog.sql");
  assert(catalog.includes("legend-1"));
  assert(catalog.includes("dex-151") || read("supabase/migrations/20260916200000_phase5_identity.sql").includes("dex-151"));
});

test("Phase 9 legendary catch tier is unchanged", () => {
  assert(rpcsSql.includes("capture_base_chance(3)"));
  assert(rpcsSql.includes("0.04"));
  const chance = sim.baseChance(3, sim.makeBalance("v1").baseTiers);
  assert(chance === 0.04, String(chance));
  const mew = sim.baseChance(45, sim.makeBalance("v1").baseTiers);
  assert(mew === 0.16, String(mew));
});

test("1 vs 3 independent event encounters stay below the 0.85 cap", () => {
  const catalog = sim.buildSpecies();
  const v1 = sim.makeBalance("v1");
  const honey = { contributors: 10, participants: 10 };
  const ctx = { owns: false, throwContext: true, throwProgress: 0.8, trainerLevel: 12, gender: "", night: true };
  [144, 145, 146, 150, 151].forEach((dex) => {
    const species = catalog.species[dex - 1];
    const stacked = sim.captureChance(species, "ultraball", "goldenrazz", honey, true, ctx, v1);
    assert(stacked.final <= 0.85, `${dex} ${stacked.final}`);
    const three = 1 - Math.pow(1 - stacked.final, 3);
    assert(three < 1, `${dex} cumulative ${three}`);
  });
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  const mark = row.passed ? "PASS" : "FAIL";
  console.log(`${mark}  ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) process.exit(1);
