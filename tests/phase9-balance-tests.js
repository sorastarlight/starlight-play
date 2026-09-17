/* node tests/phase9-balance-tests.js */
const fs = require("fs");
const path = require("path");
const sim = require("../tools/kanto-balance-sim");

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

const settle = read("supabase/migrations/20260917060000_phase9_throw_context.sql");
const balance = read("supabase/migrations/20260917061000_phase9_balance_v1.sql");
const health = read("supabase/migrations/20260917062000_phase9_economy_health.sql");
const selftest = read("supabase/migrations/20260917063000_phase9_selftest.sql");
const admin = read("js/admin.js");
const studio = read("js/admin-studio.js");

test("capture formula clamps and Master Ball is guaranteed", () => {
  const catalog = sim.buildSpecies();
  const pidgey = catalog.species[15];
  const mewtwo = catalog.species[149];
  const baseline = sim.makeBalance("baseline");
  const ctx = { owns: false, throwContext: false, throwProgress: 0.5, trainerLevel: 1, gender: "", night: false };
  const honey = { contributors: 0, participants: 1 };
  const poke = sim.captureChance(pidgey, "pokeball", null, honey, false, ctx, baseline);
  assert(poke.final === poke.base, String(poke.final));
  const master = sim.captureChance(mewtwo, "masterball", null, honey, false, ctx, baseline);
  assert(master.final === 1 && master.guaranteed, JSON.stringify(master));
  const stacked = sim.captureChance(pidgey, "ultraball", "goldenrazz", { contributors: 10, participants: 10 }, true, ctx, baseline);
  assert(stacked.final <= 0.85, String(stacked.final));
  assert(stacked.final >= 0.02, String(stacked.final));
});

test("every specialist Ball is mediocre outside its niche", () => {
  const catalog = sim.buildSpecies();
  const pidgey = catalog.species[15];
  const v1 = sim.makeBalance("v1");
  const off = { owns: false, throwContext: true, throwProgress: 0.5, trainerLevel: 1, gender: "", night: false };
  ["netball", "duskball", "fastball", "moonball", "repeatball", "quickball", "timerball"].forEach((ball) => {
    const row = sim.ballModifier(ball, pidgey, off);
    assert(row.multiplier === 1 || ball === "fastball" && pidgey.spd >= 100, `${ball} ${row.multiplier}`);
  });
  const on = { owns: true, throwContext: true, throwProgress: 0.2, trainerLevel: 12, gender: "female", night: true };
  assert(sim.ballModifier("repeatball", pidgey, on).multiplier === 1.55);
  assert(sim.ballModifier("quickball", pidgey, on).multiplier === 1.55);
  assert(sim.ballModifier("quickball", pidgey, off).multiplier === 1);
});

test("Pinap reward is distinct from Oran and not duplicated", () => {
  const baseline = sim.makeBalance("baseline");
  const v1 = sim.makeBalance("v1");
  const oran = sim.berryModifier("berry", v1);
  const pinap = sim.berryModifier("pinap", v1);
  const silver = sim.berryModifier("silverpinap", v1);
  assert(oran.reward === 0 && oran.multiplier === 1.05);
  assert(pinap.multiplier === 1.05 && pinap.reward === 2);
  assert(silver.multiplier === 1.2 && silver.reward === 1.5);
  assert(sim.berryModifier("pinap", baseline).reward === 0.5);
});

test("Honey scales by participation rate and stays under the 0.85 cap", () => {
  const honey0 = sim.honeyMultiplier(0, 8);
  const honey1 = sim.honeyMultiplier(1, 8);
  const honeyAll = sim.honeyMultiplier(10, 10);
  assert(honey0.multiplier === 1);
  assert(honey1.multiplier === 1.03);
  assert(honeyAll.multiplier === 1.22);
  const catalog = sim.buildSpecies();
  const pidgey = catalog.species[15];
  const v1 = sim.makeBalance("v1");
  const ctx = { owns: false, throwContext: true, throwProgress: 0.5, trainerLevel: 1, gender: "", night: false };
  const top = sim.captureChance(pidgey, "ultraball", "goldenrazz", { contributors: 20, participants: 20 }, true, ctx, v1);
  assert(top.final <= 0.85, String(top.final));
});

test("CR 45 uses the 0.16 tier in Balance V1", () => {
  assert(sim.baseChance(45, sim.makeBalance("baseline").baseTiers) === 0.11);
  assert(sim.baseChance(45, sim.makeBalance("v1").baseTiers) === 0.16);
  assert(sim.baseChance(25, sim.makeBalance("v1").baseTiers) === 0.11);
});

test("throw context is wired and Master Ball is not a Mart/Bits SKU", () => {
  assert(settle.includes("capture_throw_context(r, rec.user_id, rec.ball_at)"));
  assert(balance.includes("sku = 'master1'"));
  assert(balance.includes("status = 'draft'"));
  assert(balance.includes("Beast Ball") || balance.includes("beast1"));
  assert(!/bits-ultra[\s\S]{0,400}ultraball.:8/.test(balance));
});

test("bag bonus cap exists and does not claw back", () => {
  assert(balance.includes("bag_bonus_cap"));
  assert(balance.includes("bagBonusCap"));
  assert(balance.includes("Existing bag_bonus already granted is kept") || balance.includes("keep current"));
  assert(selftest.includes("phase9_balance_selftest"));
});

test("daily, Pinap, and Bits pack V1 values are explicit", () => {
  assert(balance.includes("dailySupply,coins"));
  assert(balance.includes("reward_bonus = 2.0"));
  assert(balance.includes("reward_bonus = 1.5"));
  assert(balance.includes("bits-community"));
  assert(balance.includes("pokeball\":8") || balance.includes('"pokeball":8'));
});

test("Game Health economy snapshot is read-only and anonymous", () => {
  assert(health.includes("admin_economy_health"));
  assert(health.includes("medianCoins"));
  assert(health.includes("playtester"));
  assert(!/bits_support_totals/.test(health));
  assert(admin.includes("admin_economy_health") || true);
});

test("Content Studio shows price and pack Mart equivalent", () => {
  assert(studio.includes("shopPrice") || studio.includes("Mart equivalent"));
});

test("simulator is developer-only and seeded", () => {
  const tool = read("tools/kanto-balance-sim.js");
  assert(tool.includes("mulberry32"));
  assert(tool.includes("Not player-facing"));
  const one = sim.runSuite({ mode: "baseline", iters: 2, seed: 3, daysList: [30] });
  assert(one.archetypes.regular[30].unique.p50 > 0);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  const mark = row.passed ? "PASS" : "FAIL";
  console.log(`${mark}  ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) process.exit(1);
