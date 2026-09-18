/* node tests/pikachu-cosplay-gender-tests.js
 *
 * Cosplay Pikachu = COSPLAY (not COSTUME), Female-only gender authority.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

const sandbox = {
  window: {},
  console,
  document: {
    addEventListener() {},
    querySelector() { return null; },
    getElementById() { return null; }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(
  read("js/variants.js") + "\n" +
  read("js/species.js") + "\n" +
  read("js/forms.js") + "\n" +
  read("js/game.js") + "\n" +
  read("js/special-events.js"),
  sandbox
);
const w = sandbox.window;
const seed = JSON.parse(read("data/pokemon-forms-seed.json"));
const mig = read("supabase/migrations/20260918070000_pikachu_cosplay_gender.sql");
const adminSpecial = read("js/admin-special.js");

const COSPLAY = {
  10080: "Rock Star",
  10081: "Belle",
  10082: "Pop Star",
  10083: "PhD",
  10084: "Libre",
  10085: "Cosplay"
};

test("Rock Star / Belle / Pop Star / PhD / Libre / Cosplay = COSPLAY female-only", () => {
  for (const [id, name] of Object.entries(COSPLAY)) {
    const formId = Number(id);
    const meta = w.playFormMeta(formId);
    const row = seed.find((r) => r.pokemon_form_id === formId);
    assert(meta, `missing meta ${name}`);
    assert(row, `missing seed ${name}`);
    assert(meta.kind === "cosplay", `${name} kind ${meta.kind}`);
    assert(row.kind === "cosplay", `${name} seed kind ${row.kind}`);
    assert(meta.forcedGender === "Female", `${name} forced ${meta.forcedGender}`);
    assert(row.forced_gender === "Female", `${name} seed forced ${row.forced_gender}`);
    assert(w.playIsCosplayForm(formId), `${name} isCosplay`);
    const badge = w.playSpecialFormCategoryBadge?.(meta) || (() => {
      // selectionBadges path uses formCategoryBadge internally via export
      return null;
    })();
    const uiBadge = (() => {
      const badges = w.playSpecialSelectionBadges({
        dex: 25,
        formId,
        gender: "Female",
        shiny: false,
        variantPolicy: "NORMAL_ROLL"
      });
      return badges;
    })();
    assert(uiBadge.some((b) => b.code === "COSPLAY"), `${name} missing COSPLAY badge ${JSON.stringify(uiBadge)}`);
    assert(!uiBadge.some((b) => b.code === "COSTUME"), `${name} still COSTUME`);
    assert(JSON.stringify(w.playGenderOptions(25, formId)) === JSON.stringify(["Female"]), `${name} genders`);
  }
});

test("Cosplay forms never classified COSTUME in catalog", () => {
  const costumeCosplay = seed.filter((r) => r.kind === "costume" && COSPLAY[r.pokemon_form_id]);
  assert(costumeCosplay.length === 0, JSON.stringify(costumeCosplay));
  const cosplay = seed.filter((r) => r.kind === "cosplay");
  assert(cosplay.length >= 6, String(cosplay.length));
  assert(cosplay.every((r) => r.forced_gender === "Female"));
});

test("Cap / Gigantamax / Base are not COSPLAY", () => {
  assert(w.playFormMeta(10094).kind === "cap");
  assert(!w.playIsCosplayForm(10094));
  assert(w.playFormMeta(10199).kind === "gigantamax");
  assert(!w.playIsCosplayForm(10199));
  assert(w.playFormMeta(25).kind === "base");
  assert(!w.playIsCosplayForm(25));
  const capBadge = w.playSpecialSelectionBadges({
    dex: 25, formId: 10094, gender: "Male", shiny: false, variantPolicy: "NORMAL_ROLL"
  });
  assert(capBadge.some((b) => b.code === "CAP"));
  assert(!capBadge.some((b) => b.code === "COSPLAY"));
  const gmaxBadge = w.playSpecialSelectionBadges({
    dex: 25, formId: 10199, gender: "Female", shiny: false, variantPolicy: "NORMAL_ROLL"
  });
  assert(gmaxBadge.some((b) => b.code === "GIGANTAMAX"));
  assert(!gmaxBadge.some((b) => b.code === "COSPLAY"));
});

test("Male Base → Cosplay reconciles Female; Cosplay → Base restores Male/Female", () => {
  assert(JSON.stringify(w.playGenderOptions(25, 25)) === JSON.stringify(["Male", "Female"]));
  assert(JSON.stringify(w.playGenderOptions(25, 10080)) === JSON.stringify(["Female"]));
  // Cap keeps normal genders
  assert(JSON.stringify(w.playGenderOptions(25, 10094)) === JSON.stringify(["Male", "Female"]));
});

test("Server migration enforces forced_gender + rejects Male Cosplay", () => {
  assert(mig.includes("forced_gender"));
  assert(mig.includes("kind = 'cosplay'"));
  assert(mig.includes("Form % requires gender %"));
  assert(mig.includes("rock-star"));
  assert(mig.includes("belle"));
  assert(mig.includes("pop-star"));
  assert(mig.includes("phd"));
  assert(mig.includes("libre"));
  assert(mig.includes("resolve_form_gender") || mig.includes("forced_g"));
  assert(adminSpecial.includes("♀ Female 🔒") || adminSpecial.includes("se-gender-locked"));
  assert(adminSpecial.includes("normalizeGender(selection.dex, selection.gender, selection.formId)"));
});

test("Containment unchanged: 146/5/0 non-base normal", () => {
  const ordinary = seed.filter((r) => r.is_base && r.normal_encounter_enabled).length;
  const special = seed.filter((r) => r.is_base && [144, 145, 146, 150, 151].includes(r.dex) && !r.normal_encounter_enabled).length;
  const nonbaseNormal = seed.filter((r) => !r.is_base && r.normal_encounter_enabled).length;
  assert(ordinary === 146, String(ordinary));
  assert(special === 5, String(special));
  assert(nonbaseNormal === 0, String(nonbaseNormal));
  for (const id of Object.keys(COSPLAY)) {
    const row = seed.find((r) => r.pokemon_form_id === Number(id));
    assert(row.admin_targetable && row.event_targetable && !row.normal_encounter_enabled);
  }
});

test("Sprite stems: Cosplay uses forms/{FormId}; Front+Shiny available", () => {
  for (const id of Object.keys(COSPLAY)) {
    const formId = Number(id);
    const meta = w.playFormMeta(formId);
    assert(meta.hasFront, `${id} front`);
    assert(meta.hasShinyFront, `${id} shiny`);
    assert(w.playSpriteStem(25, "normal", formId) === `forms/${formId}`);
    assert(w.playSpriteStem(25, "shiny", formId) === `forms/shiny/${formId}`);
  }
});

test("Pikachu Forms filter still umbrella (16)", () => {
  const forms = w.playSpecialFormsForFilter(25, "pikachu");
  assert(forms.length === 16, String(forms.length));
});

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
