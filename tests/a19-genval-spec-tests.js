/* node tests/a19-genval-spec-tests.js */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { loadPin, formById, speciesByDex, levelUpSlice } = require("../tools/lib/gen9-ref");

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
function sha256(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", rel))).digest("hex");
}

const spec = read("docs/project-command-center/GEN-IX-GENVAL-SPEC.md");
const decisions = read("docs/project-command-center/DECISIONS.md");
const matrix = JSON.parse(read("tests/fixtures/a19-genval/matrix.json"));
const pin = loadPin();
const mig = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
const unappliedDir = path.join(__dirname, "..", "supabase", "unapplied", "a19-genval");
const unapplied = fs.existsSync(unappliedDir);

test("spec snapshot stays honest and D36 remains recorded", () => {
  assert(spec.includes("**Verdict: SPEC READY. A19-GENVAL implementation remains UNAPPROVED.**"));
  assert(spec.includes("generate_streamlink_mon"));
  assert(spec.includes("assert_streamlink_legal"));
  assert(spec.includes("Per-catcher IVs and Natures"));
  assert(spec.includes("p_allow_hidden"));
  assert(spec.includes("streamlink_base_friendship"));
  assert(spec.includes("stamp_catch_row"));
  assert(spec.includes("MUST NOT be round_id alone"));
  assert(spec.includes("A19-GV1"));
  assert(!spec.includes("PRODUCTION PASS"));
  assert(/A19-GENVAL[\s\S]{0,200}UNAPPROVED/.test(decisions));
  assert(decisions.includes("D36"));
});

test("production apply history is reconciled without copying SQL into migrations", () => {
  assert(spec.includes("a19_apply_001_private_ref_tables"));
  assert(spec.includes("a19_apply_002_catches_nullable_extensions"));
  assert(spec.includes("execute_sql"));
  assert(spec.includes("appliedToSupabase: false"));
  assert(!mig.includes("a19-schema"));
  assert(!mig.includes("a19_apply_"));
  assert(!mig.includes("generate_streamlink_mon"));
  assert(unapplied, "branch-only GENVAL SQL now lives under unapplied/a19-genval");
  assert(read("supabase/unapplied/a19-genval/DO-NOT-APPLY.md").includes("DO NOT"));
  assert(sha256("supabase/unapplied/a19-schema/001_private_ref_tables.sql") ===
    "61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30");
  assert(sha256("supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql") ===
    "855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932");
});

test("G1/C1/F1 and hidden-ability policy are fail-closed in the spec", () => {
  assert(spec.includes("10195–10206") || spec.includes("10195-10206") || spec.includes("10195–10206"));
  assert(spec.includes("10278–10281") || spec.includes("10278-10281"));
  assert(spec.includes("Fail closed"));
  assert(spec.includes("hidden ability only") || spec.includes("Hidden ability only"));
  assert(formById(pin, 10195).learnsetStatus === "unresolved");
  assert(formById(pin, 10278).learnsetStatus === "unresolved");
  assert(Number(speciesByDex(pin, 1).baseFriendship) === 70);
});

test("synthetic fixture matrix parses and is not live Pokémon", () => {
  assert(matrix.synthetic === true && matrix.notLivePokemon === true);
  assert(matrix.contentBuild === "sl-ref-20261013-227b573");
  const ids = matrix.cases.map((row) => row.id);
  ["L-BULBA", "L-CHAR", "L-GMAX", "L-C1", "L-HA-NO", "L-HA-YES", "L-TM", "I-IV", "I-EV", "I-MAREEP", "I-LEGACY"].forEach((id) => {
    assert(ids.includes(id), id);
  });
  assert(matrix.cases.every((row) => row.mon && row.expect));
});

test("legal Bulbasaur and Charizard fixtures match the pin level-up oracle", () => {
  const bulb = matrix.cases.find((row) => row.id === "L-BULBA");
  const char = matrix.cases.find((row) => row.id === "L-CHAR");
  const bulbSlice = levelUpSlice(pin, 1, 5);
  const charSlice = levelUpSlice(pin, 6, 36);
  assert(bulbSlice.ok && charSlice.ok);
  assert(JSON.stringify(bulb.mon.moveIds) === JSON.stringify(bulbSlice.moves.map((m) => m.moveId)));
  assert(JSON.stringify(char.mon.moveIds) === JSON.stringify(charSlice.moves.map((m) => m.moveId)));
  assert(bulb.mon.abilityId === 65 && bulb.mon.abilitySlot === "1");
  assert(char.mon.abilityId === 66 && char.mon.friendship === 50);
  assert(bulb.mon.friendship === 50);
});

test("illegal fixtures encode IV, G1, C1, hidden, and legacy-row failures", () => {
  const iv = matrix.cases.find((row) => row.id === "I-IV");
  const gmax = matrix.cases.find((row) => row.id === "L-GMAX");
  const c1 = matrix.cases.find((row) => row.id === "L-C1");
  const ha = matrix.cases.find((row) => row.id === "L-HA-NO");
  const legacy = matrix.cases.find((row) => row.id === "I-LEGACY");
  const mareep = matrix.cases.find((row) => row.id === "I-MAREEP");
  assert(iv.expect === "fail" && iv.mon.ivs.hp === 32);
  assert(gmax.expect === "fail" && gmax.mon.formId === 10195);
  assert(c1.expect === "fail" && c1.mon.formId === 10278);
  assert(ha.expect === "fail" && ha.mon.abilitySlot === "hidden" && ha.ctx === "catch");
  assert(legacy.expect === "fail" && legacy.contentBuild === null);
  assert(mareep.expect === "fail" && mareep.mon.dex === 179);
  assert(!speciesByDex(pin, 179));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
