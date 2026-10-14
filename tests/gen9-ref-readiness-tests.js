/* node tests/gen9-ref-readiness-tests.js */
const fs = require("fs");
const path = require("path");
const { loadPin, verifyManifest, formById, speciesByDex, levelUpSlice } = require("../tools/lib/gen9-ref");
const {
  GMAX_FORM_IDS,
  CHAMPIONS_MEGA_IDS,
  CHAMPIONS_MEGA_META,
  proposedStreamlinkFriendship,
  proposedFriendshipForDex,
  proposedGmaxLearnset,
  proposedChampionsMega
} = require("../tools/lib/gen9-ref-proposals");

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
const reviewDir = path.join(__dirname, "..", "supabase", "unapplied", "a19-ref-review");
const unappliedDir = path.join(__dirname, "..", "supabase", "unapplied", "a19-ref");
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

test("pin checksums and 220/16 coverage stay unchanged", () => {
  const errors = verifyManifest(pin);
  assert(!errors.length, errors.join("; "));
  assert(pin.coverage.resolvedLearnsets === 220);
  assert(pin.coverage.unresolvedLearnsets === 16);
  assert(pin.meta.appliedToSupabase === false);
  assert(pin.meta.runtimeNetwork === false);
});

test("all 12 Gigantamax forms have no own learnset and match Kantonian base combat identity", () => {
  assert(GMAX_FORM_IDS.length === 12);
  GMAX_FORM_IDS.forEach((id) => {
    const form = formById(pin, id);
    assert(form && form.kind === "gigantamax", String(id));
    assert(form.learnsetStatus === "unresolved");
    const own = pin.learnsets.filter((row) => Number(row.formId) === id);
    assert(own.length === 0, `own rows ${id}`);
    const base = pin.forms.find((row) => row.dex === form.dex && row.isBase);
    assert(base && base.learnsetStatus === "resolved", `base ${id}`);
    ["hp", "atk", "def", "spa", "spd", "spe"].forEach((stat) => {
      assert(form[stat] === base[stat], `${id} ${stat}`);
    });
    assert(JSON.stringify(form.types) === JSON.stringify(base.types), `types ${id}`);
    assert(Number(form.heightM) !== Number(base.heightM), `height ${id}`);
    const gAbs = pin.formAbilities.filter((a) => a.formId === id).map((a) => `${a.abilityId}:${a.slot}:${a.isHidden}`).sort().join(",");
    const bAbs = pin.formAbilities.filter((a) => a.formId === base.formId).map((a) => `${a.abilityId}:${a.slot}:${a.isHidden}`).sort().join(",");
    assert(gAbs === bAbs && gAbs.length > 0, `abilities ${id}`);
    const slice = levelUpSlice(pin, id, 50);
    assert(slice.ok === false && slice.moves.length === 0, `slice still fail-closed ${id}`);
  });
});

test("Gmax proposal shares resolved base without inventing moves or authorizing the rule", () => {
  GMAX_FORM_IDS.forEach((id) => {
    const proposal = proposedGmaxLearnset(pin, id);
    assert(proposal.ok && proposal.authorized === false, String(id));
    assert(proposal.inheritedInventedMoves === false);
    assert(proposal.swshAvailableOnBase === true, `SWSH on base ${id}`);
    const base = formById(pin, proposal.sharedWithFormId);
    assert(base && base.isBase && base.learnsetStatus === "resolved");
    assert(proposal.versionGroup === base.learnsetVersionGroup);
  });
  assert(proposedGmaxLearnset(pin, 6).ok === false);
});

test("Champions megas stay fail-closed and do not gain fabricated SV or SWSH learnsets", () => {
  CHAMPIONS_MEGA_IDS.forEach((id) => {
    const form = formById(pin, id);
    const ex = pin.exceptions.find((row) => row.formId === id);
    const meta = CHAMPIONS_MEGA_META[id];
    assert(form.kind === "mega" && form.learnsetStatus === "unresolved", String(id));
    assert(pin.learnsets.filter((row) => Number(row.formId) === id).length === 0);
    assert(ex.versionGroupsPresent.includes("champions"));
    assert(!ex.versionGroupsPresent.includes("scarlet-violet"));
    assert(!ex.versionGroupsPresent.includes("sword-shield"));
    assert(!ex.versionGroupsPresent.includes("omega-ruby-alpha-sapphire"));
    const abs = pin.formAbilities.filter((a) => a.formId === id);
    assert(abs.length === 1 && abs[0].abilityId === meta.abilityId && abs[0].isHidden === false);
    const ability = pin.abilities.find((a) => a.abilityId === meta.abilityId);
    assert(ability && ability.slug === meta.abilitySlug);
    const base = pin.forms.find((row) => row.dex === form.dex && row.isBase);
    assert(base.learnsetStatus === "resolved");
    assert(JSON.stringify(form.types) !== JSON.stringify(base.types) || JSON.stringify({
      hp: form.hp, atk: form.atk, def: form.def, spa: form.spa, spd: form.spd, spe: form.spe
    }) !== JSON.stringify({
      hp: base.hp, atk: base.atk, def: base.def, spa: base.spa, spd: base.spd, spe: base.spe
    }));
    const slice = levelUpSlice(pin, id, 50);
    assert(slice.ok === false && slice.moves.length === 0);
    const proposal = proposedChampionsMega(pin, id);
    assert(proposal.ok && proposal.authorized === false);
    assert(proposal.hasChampionsMarker && !proposal.hasSvRows && !proposal.hasSwshRows);
    assert(proposal.pinLearnsetRows === 0);
    assert(proposal.proposal === "fail-closed-mega-is-transform-of-base");
  });
});

test("friendship pin stays historical; proposed Gen IX map is 70 to 50 only", () => {
  assert(speciesByDex(pin, 1).baseFriendship === 70);
  assert(speciesByDex(pin, 35).baseFriendship === 140);
  assert(speciesByDex(pin, 36).baseFriendship === 140);
  assert(speciesByDex(pin, 113).baseFriendship === 140);
  assert(speciesByDex(pin, 144).baseFriendship === 35);
  assert(speciesByDex(pin, 149).baseFriendship === 35);
  assert(speciesByDex(pin, 150).baseFriendship === 0);
  assert(speciesByDex(pin, 151).baseFriendship === 100);
  const mapped = pin.species.map((s) => proposedFriendshipForDex(pin, s.dex));
  assert(mapped.every((row) => row.ok && row.authorized === false));
  assert(mapped.filter((row) => row.pokeapiValue === 70).every((row) => row.streamlinkValue === 50));
  assert(proposedStreamlinkFriendship(70).streamlinkValue === 50);
  assert(proposedStreamlinkFriendship(140).streamlinkValue === 140);
  assert(proposedStreamlinkFriendship(35).streamlinkValue === 35);
  assert(proposedStreamlinkFriendship(0).streamlinkValue === 0);
  assert(proposedStreamlinkFriendship(100).streamlinkValue === 100);
  assert(mapped.filter((row) => row.pokeapiValue === 70).length === 140, "Kanto default-70 count");
});

test("current unapplied SQL is public, unlocked, and not a live migration", () => {
  const create = fs.readFileSync(path.join(unappliedDir, "001_create_ref_tables.sql"), "utf8");
  const seed = fs.readFileSync(path.join(unappliedDir, "002_seed_meta_natures_species.sql"), "utf8");
  assert(create.includes("DO NOT RUN") && seed.includes("DO NOT RUN"));
  assert(!/row level security/i.test(create));
  assert(!/revoke /i.test(create));
  assert(!/on conflict/i.test(seed));
  assert(!/create schema/i.test(create));
  assert(create.includes("CREATE TABLE IF NOT EXISTS ref_meta"));
  const mig = fs.readdirSync(migrationsDir).join("\n");
  assert(!mig.includes("a19-ref") && !mig.includes("a19-ref-review"));
});

test("proposed secure SQL stays review-only and names the security gaps", () => {
  const create = fs.readFileSync(path.join(reviewDir, "001_proposed_secure_ref_tables.sql"), "utf8");
  const note = fs.readFileSync(path.join(reviewDir, "DO-NOT-APPLY.md"), "utf8");
  assert(create.includes("DO NOT RUN") && note.includes("Must not be run"));
  assert(/row level security/i.test(create));
  assert(/revoke all/i.test(create));
  assert(/on conflict/i.test(create));
  assert(create.includes("private.ref_meta") || create.includes("CREATE SCHEMA"));
  assert(create.includes("pokeapi_base_friendship"));
  assert(create.includes("streamlink_base_friendship"));
  assert(create.includes("content_build"));
  assert(!fs.readdirSync(migrationsDir).join("\n").includes("a19-ref-review"));
});

test("readiness review document records proposals without authorizing SCHEMA", () => {
  const report = fs.readFileSync(path.join(__dirname, "..", "docs", "project-command-center", "GEN-IX-REF-READINESS-REVIEW.md"), "utf8");
  assert(report.includes("Gigantamax"));
  assert(report.includes("10278"));
  assert(report.includes("authorized: false") || report.includes("Not authorized"));
  assert(report.includes("A19-SCHEMA remains UNAPPROVED") || report.includes("A19-SCHEMA remains **UNAPPROVED**"));
  assert(!report.includes("PRODUCTION PASS"));
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
