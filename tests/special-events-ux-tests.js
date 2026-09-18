/* node tests/special-events-ux-tests.js */
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

test("All Kanto excludes Dex >151", () => {
  const rows = w.playSpecialFilterSpecies("all");
  assert(rows.every((r) => r.dex >= 1 && r.dex <= 151));
  assert(rows.length === 151, String(rows.length));
});

test("Normal Spawn returns exactly 146 base species", () => {
  const rows = w.playSpecialFilterSpecies("normal");
  assert(rows.length === 146, String(rows.length));
  assert(!rows.some((r) => [144, 145, 146, 150, 151].includes(r.dex)));
});

test("Filter change reconciles Squirtle → Pikachu Forms", () => {
  const next = w.playSpecialReconcileSelection({ filter: "pikachu", query: "", dex: 7, formId: 7 });
  assert(next.dex === 25, `dex ${next.dex}`);
  assert(next.changed === true);
  assert(next.formId !== 7, `form ${next.formId}`);
  assert(next.formId !== 25, "Pikachu Forms should default to an alternate form, not Base");
  const stem = w.playSpriteStem(next.dex, "normal", next.formId);
  assert(stem.startsWith("forms/"), stem);
});

test("Mega filter reconciles to valid mega species/form", () => {
  const next = w.playSpecialReconcileSelection({ filter: "mega", query: "", dex: 25, formId: 10080 });
  assert(next.dex !== 25 || w.playSpecialFormsForFilter(next.dex, "mega").some((f) => !f.isBase));
  const forms = w.playSpecialFormsForFilter(next.dex, "mega");
  assert(forms.every((f) => !f.isBase || forms.length === 0) || forms.some((f) => w.playSpecialUiCategory(f) === "mega"));
  assert(forms.some((f) => w.playSpecialUiCategory(f) === "mega"));
});

test("Changing species resets incompatible FormId", () => {
  assert(w.playFormId(149, 10034) === 149);
});

test("Preview stems honor form + shiny immediately", () => {
  assert(w.playSpriteStem(144, "shiny", 10169) === "forms/shiny/10169");
  assert(w.playSpriteStem(150, "shiny", 10043) === "forms/shiny/10043");
});

test("Regional classification includes Alolan Raticate / Marowak; Totem is Regional not Other", () => {
  const audit = w.playSpecialClassificationAudit();
  const alolanRat = audit.find((r) => r.formId === 10092);
  const totemRat = audit.find((r) => r.formId === 10093);
  const alolanMar = audit.find((r) => r.formId === 10115);
  const totemMar = audit.find((r) => r.formId === 10149);
  assert(alolanRat && alolanRat.uiCategory === "regional", JSON.stringify(alolanRat));
  assert(totemRat && totemRat.uiCategory === "regional", JSON.stringify(totemRat));
  assert(alolanMar && alolanMar.uiCategory === "regional", JSON.stringify(alolanMar));
  assert(totemMar && totemMar.uiCategory === "regional", JSON.stringify(totemMar));
  const other = audit.filter((r) => r.uiCategory === "other");
  assert(other.length === 0, JSON.stringify(other));
  assert(!w.playSpecialFilterSpecies("other").length || other.length === 0);
});

test("Pikachu Forms membership exact (16)", () => {
  const counts = w.playSpecialFilterCounts();
  assert(counts.pikachuForms === 16, String(counts.pikachuForms));
  const forms = w.playSpecialFormsForFilter(25, "pikachu");
  assert(forms.length === 16, String(forms.length));
  assert(forms.every((f) => !f.isBase && f.dex === 25));
});

test("Classification counts: regional absorbs totems; other = 0", () => {
  const counts = w.playSpecialFilterCounts();
  assert(counts.allKantoAlternate === 85, String(counts.allKantoAlternate));
  assert(counts.regional === 38, `regional ${counts.regional}`); // 36 + 2 totem
  assert(counts.mega === 19);
  assert(counts.gigantamax === 12);
  assert(counts.other === 0, `other ${counts.other}`);
  assert(counts.dexOver151 === 0);
});

test("Back sprites absent; timezone blurb absent; UTC/local behavior retained", () => {
  const admin = read("js/admin-special.js");
  const special = read("js/special-events.js");
  assert(!admin.includes("Event times are saved in UTC"));
  assert(!admin.includes("Your timezone"));
  assert(!admin.includes("se-tz-hint"));
  assert(!admin.includes("se-schedule-blurb"));
  assert(!admin.includes("America/New_York"));
  assert(special.includes('timeZoneName: "short"'));
  assert(admin.includes("playSpecialReconcileSelection") || admin.includes("reconcile"));
  assert(!read("js/forms.js").includes('"formKey":"back"'));
});

test("Refresh reloads server data and reconciles selection", () => {
  const admin = read("js/admin-special.js");
  assert(admin.includes("Refreshing…"));
  assert(admin.includes("Refresh failed"));
  assert(admin.includes("is-loading"));
  assert(admin.includes("aria-busy"));
  assert(admin.includes("reconcile()"));
});

test("Presentation themes are distinct", () => {
  const themes = ["upcoming", "incoming", "caught", "escaped", "complete"].map((k) =>
    w.playSpecialPresentation(k, { dex: 149, formId: 10281, variantPolicy: "FORCED_SHINY", gender: "Male" })
  );
  const set = new Set(themes.map((t) => t.theme));
  assert(set.has("announced") && set.has("live") && set.has("caught") && set.has("escaped") && set.has("complete"));
  assert(themes.every((t) => t.type === "special-event"));
  assert(themes.every((t) => t.formId === 10281 && t.shiny === true));
  const present = read("js/play-present.js");
  assert(present.includes("se-theme-") && present.includes("data-se-theme"));
  const css = read("css/play.css");
  assert(css.includes("se-theme-announced") && css.includes("se-theme-caught") && css.includes("se-theme-escaped"));
});

test("Authoritative selection architecture + 3D badges", () => {
  const admin = read("js/admin-special.js");
  assert(admin.includes("const selection = {"));
  assert(admin.includes("data-se-preview-dex"));
  assert(admin.includes("playSpecialBadgeHtml") || admin.includes("se-badge"));
  assert(read("css/play.css").includes(".se-badge"));
  assert(read("css/play.css").includes("se-badge-shiny"));
});

test("Delete RPC migration still present", () => {
  const mig = read("supabase/migrations/20260918060000_special_events_ux_closure.sql");
  assert(mig.includes("special_event_delete"));
  assert(mig.includes("action = 'delete'"));
});

// Write classification audit artifact
const audit = w.playSpecialClassificationAudit();
const outDir = path.join(__dirname, "..", "docs", "audits");
fs.mkdirSync(outDir, { recursive: true });
const csv = ["Dex,Species,FormId,FormLabel,FormKey,Kind,UiCategory"]
  .concat(audit.map((r) => [r.dex, r.species, r.formId, r.formLabel, r.formKey, r.kind, r.uiCategory]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")))
  .join("\n");
fs.writeFileSync(path.join(outDir, "special-events-form-classification.csv"), `${csv}\n`);

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
console.log("Wrote docs/audits/special-events-form-classification.csv", audit.length, "rows");
if (failed.length) process.exit(1);
