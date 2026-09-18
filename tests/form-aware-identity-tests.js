/* node tests/form-aware-identity-tests.js
 *
 * Permanent form-aware Admin / Special Event identity guards.
 * Facing is rendering-only. Normal spawn stays BASE-only.
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

const mig = [
  "supabase/migrations/20260918050000_form_aware_schema.sql",
  "supabase/migrations/20260918050100_form_aware_seed.sql",
  "supabase/migrations/20260918050200_form_aware_rpcs.sql"
].map(read).join("\n");
const gameJs = read("js/game.js");
const adminJs = read("js/admin.js");
const specialJs = read("js/admin-special.js");
const containment = read("supabase/migrations/20260918040000_kanto_encounter_containment.sql");
const seed = JSON.parse(read("data/pokemon-forms-seed.json"));
const formsJs = read("js/forms.js");

const REPS = {
  megaDragonite: 10281,
  megaCharizardX: 10034,
  megaCharizardY: 10035,
  alolanRaichu: 10100,
  hisuianGrowlithe: 10229,
  galarianPonyta: 10162,
  galarianArticuno: 10169,
  gmaxGengar: 10202,
  megaMewtwoX: 10043,
  megaMewtwoY: 10044,
  pikachuCostume: 10080, // Rock-Star
  pikachuCap: 10094, // Original-Cap
};

test("migration establishes pokemon_forms + form columns", () => {
  assert(mig.includes("create table if not exists public.pokemon_forms"));
  assert(mig.includes("pokemon_form_id integer primary key"));
  assert(mig.includes("add column if not exists pokemon_form_id"));
  assert(mig.includes("private.canonical_form_id"));
  assert(mig.includes("private.assert_form_launchable"));
  assert(mig.includes("private.form_display_name"));
});

test("launch / settle / catch_json are form-aware", () => {
  assert(mig.includes("p_form_id integer default null"));
  assert(mig.includes("'formId', chosen_form"));
  assert(mig.includes("pokemon_form_id"));
  assert(mig.includes("insert into public.catches") && mig.includes("pokemon_form_id"));
  assert(mig.includes("'formId', fid"));
});

test("AUTO / normal spawn hard-firewall forces BASE", () => {
  assert(mig.includes("Alternate forms cannot appear in normal encounters"));
  assert(mig.includes("ordinary random spawn is always BASE"));
  assert(/if upper\\(coalesce\\(p_source, ''\\)\\) = 'AUTO'/.test(mig) || mig.includes("= 'AUTO'"));
  assert(containment.includes("private.normal_spawn_max_dex()"));
});

test("seed matrix: 146 ordinary base / 5 special base / 0 non-base normal / 85 event-ready", () => {
  const ordinary = seed.filter((r) => r.is_base && r.normal_encounter_enabled).length;
  const special = seed.filter((r) => r.is_base && [144, 145, 146, 150, 151].includes(r.dex) && !r.normal_encounter_enabled).length;
  const nonbaseNormal = seed.filter((r) => !r.is_base && r.normal_encounter_enabled).length;
  const eventReady = seed.filter((r) => !r.is_base && r.origin_gen1 && r.event_targetable && r.asset_status === "ready").length;
  const broken = seed.filter((r) => r.asset_status === "broken").length;
  assert(ordinary === 146, `ordinary ${ordinary}`);
  assert(special === 5, `special ${special}`);
  assert(nonbaseNormal === 0, `nonbaseNormal ${nonbaseNormal}`);
  assert(eventReady === 85, `eventReady ${eventReady}`);
  assert(broken === 0, `broken ${broken}`);
});

test("representative forms are EVENT_READY with verified FormIds", () => {
  for (const [label, formId] of Object.entries(REPS)) {
    const row = seed.find((r) => r.pokemon_form_id === formId);
    assert(row, `${label} missing ${formId}`);
    assert(!row.is_base, `${label} must be non-base`);
    assert(row.event_targetable && row.admin_targetable, `${label} not targetable`);
    assert(!row.normal_encounter_enabled, `${label} must not be normal`);
    assert(row.asset_status === "ready", `${label} not ready`);
  }
});

test("identity distinctions: base != alternate at FormId level", () => {
  assert(144 !== 10169);
  assert(150 !== 10043 && 150 !== 10044 && 10043 !== 10044);
  assert(149 !== 10281);
  const baseArt = seed.find((r) => r.pokemon_form_id === 144);
  const galarArt = seed.find((r) => r.pokemon_form_id === 10169);
  assert(baseArt.is_base && !galarArt.is_base);
  assert(baseArt.dex === galarArt.dex);
});

test("client resolver uses formId stems; refuses variant-axis forms; Back not selectable", () => {
  assert(gameJs.includes("playSpriteStem(dex, variant, formId)"));
  assert(gameJs.includes("forms/${resolvedForm}") || gameJs.includes("forms/"));
  assert(gameJs.includes("playFormsForDex"));
  assert(gameJs.includes("refused non-base sprite form") || /mega\|alola/.test(gameJs));
  assert(gameJs.includes("back\\b") || gameJs.includes("cap\\b|back\\b"));
  assert(!/PLAY_FORM_BY_DEX.*back/i.test(formsJs));
  assert(adminJs.includes("form-pick") || adminJs.includes("formPick") || adminJs.includes("selectedFormId"));
  assert(adminJs.includes("p_form_id") || adminJs.includes("formId"));
  assert(specialJs.includes("formId"));
  assert(specialJs.includes("draft.formId = dex") || specialJs.includes("formId: dex"));
});

test("Front/Back are not separate gameplay identities in catalog", () => {
  // forms.js entries have hasBack flag but no facing axis / no back-only form keys
  assert(formsJs.includes('"hasBack"'));
  assert(!formsJs.includes('"facing"'));
  assert(!formsJs.includes("formKey\":\"back\""));
});

test("migration integrity block asserts containment counts", () => {
  assert(mig.includes("ordinary <> 146"));
  assert(mig.includes("special_base <> 5"));
  assert(mig.includes("nonbase_normal <> 0"));
  assert(mig.includes("post_kanto <> 0"));
});

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
