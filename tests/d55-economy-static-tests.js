"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { borrowedBallDecision } = require("../tools/lib/borrowed-ball-rules");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "unapplied", "d55-economy", "001_spend_rules.sql"),
  "utf8"
);

assert(sql.includes("Do not apply to production"));
assert(sql.includes("IS DISTINCT FROM 'standard_throw'"));
assert(sql.includes("ERRCODE = 'NB001'"));
assert(sql.includes("WHEN SQLSTATE 'NB001'"));
assert(!sql.includes("WHEN OTHERS"));
assert(sql.includes("-1, 'BAG_SPEND'"));
assert(sql.includes("AND coalesce((berries->>p_item)::int, 0) > 0"));
assert(sql.includes("AND coalesce((balls->>p_item)::int, 0) > 0"));
assert(!sql.includes("capture_chance"));
assert(!sql.includes("streamlink_wire_set_enabled"));
assert(!sql.includes("SL00025376"));
console.log("PASS d55 SQL keeps the safety-net skip, NB001, and atomic JSON debit");

assert.deepStrictEqual(borrowedBallDecision("pokeball", 2, 2), {
  ok: true, ball: "pokeball", borrowed: false, spends: true
});
assert.deepStrictEqual(borrowedBallDecision("pokeball", 0, 0), {
  ok: true, ball: "pokeball", borrowed: true, spends: false
});
assert.deepStrictEqual(borrowedBallDecision("standard", 0, 0), {
  ok: true, ball: "pokeball", borrowed: true, spends: false
});
assert.deepStrictEqual(borrowedBallDecision("standard", 5, 5), {
  ok: true, ball: "pokeball", borrowed: true, spends: false
});
assert.deepStrictEqual(borrowedBallDecision("greatball", 0, 0), { ok: false, error: "unavailable" });
assert.deepStrictEqual(borrowedBallDecision("pokeball", 0, 1), { ok: false, error: "unavailable" });
console.log("PASS borrowed-ball rules match the live safety-net");
console.log("borrowed-ball rules: synthetic only, no database");
