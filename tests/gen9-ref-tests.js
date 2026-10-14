/* node tests/gen9-ref-tests.js */
const fs = require("fs");
const path = require("path");
const { loadPin, verifyManifest, formById, speciesByDex, levelUpSlice } = require("../tools/lib/gen9-ref");

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

const pin = loadPin();
const unappliedDir = path.join(__dirname, "..", "supabase", "unapplied", "a19-ref");
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

test("pin manifest checksums match committed files", () => {
  const errors = verifyManifest(pin);
  assert(!errors.length, errors.join("; "));
  assert(pin.meta.runtimeNetwork === false);
  assert(pin.meta.appliedToSupabase === false);
  assert(pin.meta.pokeapiCommit === "227b573712414a86ba299d322fa398fbb2893edc");
  assert(pin.meta.rulesetId === "streamlink-gen9-xgen");
});

test("natures are the official 25 with valid stat modifiers", () => {
  assert(pin.natures.length === 25, String(pin.natures.length));
  const slugs = new Set(pin.natures.map((n) => n.slug));
  ["hardy", "adamant", "modest", "jolly", "timid", "bold"].forEach((slug) => assert(slugs.has(slug), slug));
  const hardy = pin.natures.find((n) => n.slug === "hardy");
  assert(hardy.upStat === null && hardy.downStat === null);
  const adamant = pin.natures.find((n) => n.slug === "adamant");
  assert(adamant.upStat === "atk" && adamant.downStat === "spa");
});

test("Kanto species 1-151 exist with gender rates and friendship", () => {
  assert(pin.species.length === 151);
  assert(speciesByDex(pin, 1).slug === "bulbasaur");
  assert(speciesByDex(pin, 29).genderRate === 8, "nidoran-f");
  assert(speciesByDex(pin, 32).genderRate === 0, "nidoran-m");
  assert(speciesByDex(pin, 81).genderRate === -1, "magnemite");
  assert(speciesByDex(pin, 151).isMythical === true);
  assert(speciesByDex(pin, 144).isLegendary === true);
  assert(Number(speciesByDex(pin, 1).baseFriendship) > 0);
  assert(!speciesByDex(pin, 179), "mareep must stay out of v1");
});

test("catalog forms map to PokéAPI pokemon ids and never invent a base inherit", () => {
  assert(pin.forms.length === 236, String(pin.forms.length));
  assert(pin.forms.every((f) => f.mappingStatus === "ok"));
  assert(pin.exceptions.every((e) => e.inheritedFromBase === false));
  const bulb = formById(pin, 1);
  assert(bulb.learnsetVersionGroup === "scarlet-violet");
  assert(bulb.types[0] === "grass");
});

test("Bulbasaur level-5 wild slice is legal SV level-up only", () => {
  const slice = levelUpSlice(pin, 1, 5);
  assert(slice.ok);
  const names = slice.moves.map((m) => m.name);
  assert(names.includes("tackle") && names.includes("growl") && names.includes("vine-whip"));
  assert(slice.moves.every((m) => m.method === "level-up" && m.versionGroup === "scarlet-violet"));
  assert(slice.moves.every((m) => Number(m.pp) > 0));
  assert(slice.moves.length <= 4);
  const abs = pin.formAbilities.filter((a) => a.formId === 1);
  assert(abs.some((a) => a.abilityId === 65 && !a.isHidden), "overgrow");
  assert(abs.some((a) => a.isHidden), "chlorophyll hidden slot exists");
});

test("Charizard base uses SV; Mega X uses ORAS and not the base SV set", () => {
  const base = formById(pin, 6);
  const megaX = formById(pin, 10034);
  assert(base.learnsetResolution === "sv");
  assert(megaX.kind === "mega" || megaX.formKey === "mega-x");
  assert(megaX.learnsetResolution === "historical-exception");
  assert(megaX.learnsetVersionGroup === "omega-ruby-alpha-sapphire");
  const baseSlice = levelUpSlice(pin, 6, 36);
  const megaSlice = levelUpSlice(pin, 10034, 36);
  assert(baseSlice.ok && megaSlice.ok);
  assert(JSON.stringify(baseSlice.moves) !== JSON.stringify(megaSlice.moves), "mega must not clone base SV slice");
  const abs = pin.formAbilities.filter((a) => a.formId === 6);
  assert(abs.some((a) => !a.isHidden));
  assert(abs.some((a) => a.isHidden), "solar-power hidden");
});

test("Alolan and Hisuian forms resolve on their own ids", () => {
  const raichuA = formById(pin, 10100);
  assert(raichuA.formKey.includes("alol"));
  assert(raichuA.learnsetStatus === "resolved");
  assert(raichuA.learnsetVersionGroup !== formById(pin, 26).learnsetVersionGroup || raichuA.types.join("/") !== formById(pin, 26).types.join("/"));
  const growlitheH = formById(pin, 10229);
  assert(growlitheH.formKey.includes("hisui"));
  assert(growlitheH.learnsetStatus === "resolved");
  assert(growlitheH.learnsetResolution === "sv" || growlitheH.learnsetResolution === "swsh-verified");
});

test("Gigantamax and Champions megas fail closed without invented moves", () => {
  const gmax = formById(pin, 10196);
  assert(gmax.kind === "gigantamax");
  assert(gmax.learnsetStatus === "unresolved");
  const slice = levelUpSlice(pin, 10196, 50);
  assert(slice.ok === false && slice.moves.length === 0);
  [10278, 10279, 10280, 10281].forEach((id) => {
    const mega = formById(pin, id);
    assert(mega.learnsetStatus === "unresolved", String(id));
    assert(levelUpSlice(pin, id, 50).ok === false, `slice ${id}`);
  });
});

test("special obtain and gender-locked species", () => {
  const mew = pin.obtain.find((o) => o.formId === 151);
  const articuno = pin.obtain.find((o) => o.formId === 144);
  assert(mew.channel === "special");
  assert(articuno.channel === "special");
  const bulb = pin.obtain.find((o) => o.formId === 1);
  assert(bulb.channel === "ordinary");
  const alolan = pin.obtain.find((o) => o.formId === 10100);
  assert(alolan.channel === "event");
});

test("Johto Mareep is a documented out-of-roster placeholder", () => {
  assert(pin.coverage.johtoPlaceholder.dex === 179);
  assert(pin.coverage.johtoPlaceholder.inV1 === false);
  assert(!pin.species.some((s) => s.dex === 179));
});

test("unapplied SQL is review-only and not a live migration", () => {
  const create = fs.readFileSync(path.join(unappliedDir, "001_create_ref_tables.sql"), "utf8");
  const seed = fs.readFileSync(path.join(unappliedDir, "002_seed_meta_natures_species.sql"), "utf8");
  const note = fs.readFileSync(path.join(unappliedDir, "DO-NOT-APPLY.md"), "utf8");
  assert(create.includes("DO NOT RUN"));
  assert(seed.includes("DO NOT RUN"));
  assert(note.includes("Must not be run"));
  const mig = fs.readdirSync(migrationsDir).join("\n");
  assert(!mig.includes("a19-ref") && !mig.includes("ref_natures"), "unapplied SQL leaked into migrations");
});

test("coverage reports Mega and regional gaps honestly", () => {
  assert(pin.coverage.unresolvedLearnsets === 16, String(pin.coverage.unresolvedLearnsets));
  assert(pin.coverage.byKind.mega.unresolved === 4);
  assert(pin.coverage.byKind.gigantamax.unresolved === 12);
  assert(pin.coverage.byKind.regional.unresolved === 0);
  assert(pin.coverage.byKind.base.resolved === 151);
  assert(pin.coverage.rules.neverInheritBaseLearnset === true);
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
