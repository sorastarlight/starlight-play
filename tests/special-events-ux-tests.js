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
  assert(rows.every((r) => r.dex >= 1 && r.dex <= 151), "dex range");
  assert(rows.length === 151, String(rows.length));
  assert(!rows.some((r) => r.dex > 151));
});

test("Normal Spawn returns exactly 146 base species", () => {
  const rows = w.playSpecialFilterSpecies("normal");
  assert(rows.length === 146, String(rows.length));
  assert(!rows.some((r) => [144, 145, 146, 150, 151].includes(r.dex)));
  assert(!rows.some((r) => r.dex > 151));
});

test("Legendary & Mythical filter is authoritative Kanto set", () => {
  const rows = w.playSpecialFilterSpecies("legendary");
  assert(rows.length === 5, String(rows.length));
  assert(rows.map((r) => r.dex).sort((a, b) => a - b).join(",") === "144,145,146,150,151");
});

test("Regional / Mega / Gigantamax / Pikachu filters use form metadata", () => {
  const counts = w.playSpecialFilterCounts();
  assert(counts.regional > 0 && counts.mega > 0 && counts.gigantamax > 0, JSON.stringify(counts));
  assert(counts.pikachuForms >= 10, String(counts.pikachuForms));
  assert(counts.dexOver151 === 0, String(counts.dexOver151));
  const regionalSpecies = w.playSpecialFilterSpecies("regional");
  assert(regionalSpecies.every((r) => r.dex <= 151));
  assert(regionalSpecies.some((r) => r.dex === 144), "Articuno has Galarian");
  const megaSpecies = w.playSpecialFilterSpecies("mega");
  assert(megaSpecies.some((r) => r.dex === 149));
  const gmax = w.playSpecialFilterSpecies("gigantamax");
  assert(gmax.some((r) => r.dex === 94));
  const pika = w.playSpecialFilterSpecies("pikachu");
  assert(pika.length === 1 && pika[0].dex === 25);
});

test("Changing species resets incompatible form to Base", () => {
  const formsDn = w.playFormsForDex(149, { event: true });
  const mega = formsDn.find((f) => !f.isBase);
  assert(mega, "mega dragonite");
  // simulate admin reset: form belonging to Charizard must not stick on Dragonite
  const bad = w.playFormId(149, 10034);
  assert(bad === 149, String(bad));
});

test("Preview honors exact FormId + shiny", () => {
  const stem = w.playSpriteStem(144, "shiny", 10169);
  assert(stem === "forms/shiny/10169", stem);
  const stemMega = w.playSpriteStem(149, "shiny", 10281);
  assert(stemMega === "forms/shiny/10281", stemMega);
  const base = w.playSpriteStem(144, "normal", 144);
  assert(base === "144", base);
});

test("Back sprites never enter selector / form catalog as forms", () => {
  const alts = w.playSpecialKantoAlternateForms();
  assert(!alts.some((f) => /back/i.test(f.formKey) || /back/i.test(f.formLabel)));
  const formsJs = read("js/forms.js");
  assert(!formsJs.includes('"formKey":"back"'));
});

test("Event times render viewer-local short timezone", () => {
  const iso = "2026-09-19T14:56:00.000Z";
  const text = w.playSpecialFormatWhen(iso, true);
  assert(!/America\/New_York/.test(text), text);
  assert(/[AP]M/.test(text) || /\d/.test(text), text);
  const src = read("js/special-events.js");
  assert(src.includes('timeZoneName: "short"'));
  assert(!src.includes("America/New_York"));
});

test("Admin UI wires Pokémon dropdown, form cascade, delete, no Kanto path blurb", () => {
  const admin = read("js/admin-special.js");
  const html = read("admin.html");
  assert(admin.includes("se-species"));
  assert(admin.includes("applySpecies"));
  assert(admin.includes("draft.formId = next"));
  assert(admin.includes('data-se-act="delete"') || admin.includes('"delete"'));
  assert(admin.includes("Delete Event") || admin.includes("Delete \""));
  assert(!admin.includes("Kanto path:"));
  assert(!admin.includes("America/New_York"));
  assert(html.includes("special-picker-tools"));
  assert(!html.includes("Search species"));
  assert(admin.includes("Refresh events"));
});

test("Fanfare uses special-event type, not trainer unlock reward wording", () => {
  const special = read("js/special-events.js");
  const present = read("js/play-present.js");
  assert(special.includes('type: "special-event"'));
  assert(!/NEW TRAINER REWARD/.test(special));
  assert(present.includes("presentSpecialEvent"));
  assert(present.includes('type === "special-event"'));
  const ev = w.playSpecialPresentation("upcoming", {
    dex: 144,
    formId: 10169,
    variantPolicy: "FORCED_SHINY",
    title: "THE FROZEN LEGEND AWAKENS",
    startsAt: "2026-09-19T14:56:00.000Z"
  });
  assert(ev.type === "special-event", ev.type);
  assert(/Galarian/i.test(ev.displayName || ev.subtitle), JSON.stringify(ev));
  assert(ev.shiny === true);
  assert(ev.kicker === "SPECIAL EVENT" || ev.lifecycle === "EVENT ANNOUNCED");
});

test("Delete RPC migration is authorized + confirm-gated", () => {
  const mig = read("supabase/migrations/20260918060000_special_events_ux_closure.sql");
  assert(mig.includes("special_event_delete"));
  assert(mig.includes("Confirm deleting this Special Event"));
  assert(mig.includes("End or cancel the active event before deleting"));
  assert(mig.includes("action = 'delete'"));
  assert(mig.includes("is_play_admin"));
});

test("Containment still untouched in UX closure migration", () => {
  const mig = read("supabase/migrations/20260918060000_special_events_ux_closure.sql");
  assert(!mig.includes("normal_spawn_max_dex"));
  assert(!mig.includes("ordinary <> 146"));
});

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
