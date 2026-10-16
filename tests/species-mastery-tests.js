/* node tests/species-mastery-tests.js — offline synthetic fixtures only */
"use strict";
const assert = require("node:assert/strict");
const { MASTERY_TIERS, qualifyingCatch, progressForCount, summarizeCatches } =
  require("./fixtures/species-mastery-model.js");

const trainer = "trainer-a";
let serial = 0;
function caught(overrides = {}) {
  return {
    catchId: "catch-" + (++serial),
    trainerId: trainer, speciesId: 1, outcome: "caught",
    settled: true, source: "encounter_catch", provenanceVerified: true,
    ...overrides
  };
}
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test("tier boundaries are finite and cosmetic-only", () => {
  assert.deepEqual(MASTERY_TIERS.map(t => t.threshold), [0,1,3,6,12,20]);
  for (const [n, level] of [[0,0],[1,1],[2,1],[3,2],[5,2],[6,3],[11,3],[12,4],[19,4],[20,5],[300,5]]) {
    assert.equal(progressForCount(n).level, level);
  }
  assert.equal(progressForCount(20).maxed, true);
  assert.equal(progressForCount(6).remaining, 6);
  assert.throws(() => progressForCount(-1), RangeError);
});
test("duplicate catches increment one species and keep each record intact", () => {
  const original = caught(), shiny = caught({ shiny: true }), otherForm = caught({ form: "regional" });
  const records = [original, shiny, otherForm];
  const before = JSON.stringify(records);
  const result = summarizeCatches(records, trainer);
  assert.equal(result.species[0].count, 3);
  assert.equal(result.species[0].duplicates, 2);
  assert.equal(result.species[0].level, 2);
  assert.equal(JSON.stringify(records), before);
});
test("settlement replay is idempotent", () => {
  const c = caught();
  const result = summarizeCatches([c, c, {...c}], trainer);
  assert.equal(result.eligible, 1);
  assert.equal(result.replays, 2);
});
test("conflicting catch ids are flagged, never remapped", () => {
  const c = caught();
  const result = summarizeCatches([c, {...c, speciesId: 2}], trainer);
  assert.equal(result.conflicts, 1);
  assert.equal(result.species.length, 1);
});
test("different species and evolutions have independent mastery", () => {
  const result = summarizeCatches([caught({speciesId: 1}), caught({speciesId: 2})], trainer);
  assert.deepEqual(result.species.map(s => [s.speciesId, s.count]), [[1,1],[2,1]]);
});
test("failed rounds and uncertain provenance never count", () => {
  const rejected = [
    caught({outcome:"escaped"}), caught({settled:false}),
    caught({source:"admin_grant"}), caught({source:"import"}),
    caught({source:"reset_replacement"}), caught({provenanceVerified:false}),
    caught({catchId:""}), caught({speciesId:0})
  ];
  assert.equal(summarizeCatches(rejected, trainer).eligible, 0);
  rejected.forEach(r => assert.equal(qualifyingCatch(r), false));
});
test("trainers cannot accrue each other's synthetic records", () => {
  const result = summarizeCatches([caught(), caught({trainerId:"trainer-b"})], trainer);
  assert.equal(result.eligible, 1);
  assert.equal(result.rejected, 1);
});
test("mastery thresholds do not touch catch odds, coin, or inventory", () => {
  const c = caught({itemBalance:4, catchOdds:0.25, pcId:"specimen-123"});
  const before = structuredClone(c);
  summarizeCatches([c], trainer);
  assert.deepEqual(c, before);
});
test("invalid inputs fail closed", () => {
  assert.throws(() => summarizeCatches([], ""), TypeError);
  assert.throws(() => summarizeCatches(null, trainer), TypeError);
  assert.equal(qualifyingCatch({}), false);
});

let failures = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("PASS", name); }
  catch (error) { failures++; console.error("FAIL", name, error.message); }
}
console.log(`${tests.length - failures}/${tests.length} passed`);
if (failures) process.exitCode = 1;
