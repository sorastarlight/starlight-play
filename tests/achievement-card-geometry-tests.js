/* node tests/achievement-card-geometry-tests.js */
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

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css", "play.css"), "utf8");
const js = fs.readFileSync(path.join(root, "js", "achievements.js"), "utf8");
const rc118 = css.split("rc118")[1] || "";

test("card anatomy helper puts progress above description", () => {
  const helper = js.split("function cardAnatomyHtml")[1] || "";
  const progressAt = helper.indexOf("ach-hub-progress-block");
  const descAt = helper.indexOf("ach-hub-desc");
  const rewardsAt = helper.indexOf("rewardHtml");
  assert(progressAt > 0 && descAt > progressAt, "progress must precede description");
  assert(rewardsAt > descAt, "rewards must follow description");
});

test("rewards region is always rendered", () => {
  assert(/return `<div class="ach-hub-rewards"/.test(js));
  assert(!/if \(!parts\.length\) return ""/.test(js));
});

test("fixed grid tracks lock progress and reward Y", () => {
  assert(/grid-template-areas:/.test(rc118));
  assert(/"meta"/.test(rc118) && /"title"/.test(rc118) && /"bar"/.test(rc118));
  assert(/"progress"/.test(rc118) && /"desc"/.test(rc118) && /"rewards"/.test(rc118));
  assert(/min-height: 282px/.test(rc118), "canonical desktop card height");
  assert(/grid-area: bar/.test(rc118));
  assert(/grid-area: rewards/.test(rc118));
});

test("description is clamped and cannot resize the card", () => {
  assert(/-webkit-line-clamp: 2/.test(rc118));
  assert(/max-height: 40px/.test(rc118));
  assert(/grid-area: desc/.test(rc118));
});

test("title region is reserved for two lines", () => {
  assert(/grid-area: title/.test(rc118));
  assert(/min-height: 42px/.test(rc118));
  assert(/max-height: 42px/.test(rc118));
});

test("reward region is reserved at a fixed height", () => {
  assert(/grid-area: rewards/.test(rc118));
  assert(/min-height: 80px/.test(rc118));
  assert(/max-height: 80px/.test(rc118));
});

test("completed and in-progress cards share bar height", () => {
  assert(/\.ach-hub-card\.is-progress \.ach-hub-bar/.test(rc118));
  assert(/height: 10px/.test(rc118));
});

test("Next Goals reuse the same anatomy helper", () => {
  assert(/cardAnatomyHtml\(row, \{ next: true \}\)/.test(js));
  assert(/\.ach-next-card/.test(rc118));
});

const failed = results.filter((row) => !row.passed);
if (failed.length) {
  failed.forEach((row) => console.error(`FAIL ${row.name}: ${row.detail}`));
  process.exit(1);
}
results.forEach((row) => console.log(`PASS ${row.name}`));
console.log(`${results.length} tests ok`);
