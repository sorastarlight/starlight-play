"use strict";

const assert = require("assert");
const { nextEncounterAction } = require("../tools/lib/encounter-phase-driver");

const bag = { berry: 5, bait: 1, pokeball: 13 };

function test(name, fn) {
  fn();
  console.log("PASS " + name);
}

test("join only while the phase is join", () => {
  assert.deepStrictEqual(nextEncounterAction({ phase: "join", me: {}, bag }), { action: "join" });
  assert.strictEqual(nextEncounterAction({ phase: "prepare", me: { joined: true }, bag, prefer: "berry" }).action, "prepare");
});

test("prepare selects a berry, no berry, or honey from the phase", () => {
  assert.deepStrictEqual(
    nextEncounterAction({ phase: "prepare", me: { joined: true }, bag, prefer: "berry" }),
    { action: "prepare", item: "berry" }
  );
  assert.deepStrictEqual(
    nextEncounterAction({ phase: "prepare", me: { joined: true }, bag, prefer: "none" }),
    { action: "prepare", item: "none" }
  );
  assert.deepStrictEqual(
    nextEncounterAction({ phase: "prepare", me: { joined: true }, bag, prefer: "honey" }),
    { action: "prepare", item: "bait" }
  );
});

test("an empty berry bag does not invent a berry during prepare", () => {
  const next = nextEncounterAction({
    phase: "prepare",
    me: { joined: true },
    bag: { berry: 0, bait: 0, pokeball: 13 },
    prefer: "berry"
  });
  assert.deepStrictEqual(next, { action: "prepare", item: "none", reason: "no-berry" });
});

test("throw waits for the throw phase and refuses an empty ball bag", () => {
  assert.strictEqual(
    nextEncounterAction({ phase: "prepare", me: { joined: true, prep: "berry" }, bag }).action,
    "wait"
  );
  assert.deepStrictEqual(
    nextEncounterAction({ phase: "throw", me: { joined: true, prep: "none" }, bag }),
    { action: "throw", item: "pokeball" }
  );
  assert.deepStrictEqual(
    nextEncounterAction({
      phase: "throw",
      me: { joined: true },
      bag: { berry: 5, bait: 1, pokeball: 0 }
    }),
    { action: "wait", reason: "no-ball" }
  );
});

test("reveal is the result step, not another click", () => {
  assert.deepStrictEqual(
    nextEncounterAction({ phase: "reveal", me: { ball: "pokeball" }, bag }),
    { action: "wait", reason: "result" }
  );
});

console.log("encounter-phase-driver: synthetic only, no browser");
