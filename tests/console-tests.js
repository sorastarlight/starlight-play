/* node tests/console-tests.js */
globalThis.window = globalThis;
window.playEscapeAttr = (value) => String(value || "");
window.playArticle = (value) => value;
window.playItemLabel = (key) => key === "greatball" ? "Great Ball" : key === "berry" ? "Oran Berry" : key;
require("../js/hud.js");

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

test("status banners stay first inside their own encounter", () => {
  const rows = window.playConsoleRows([
    { kind: "caught", name: "Sora", item: "Diglett", at: "2026-09-14T05:03:40Z" },
    { kind: "threw", name: "Sora", item: "greatball", at: "2026-09-14T05:03:25Z" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T05:03:00Z" },
    { kind: "selected", name: "Sora", item: "greatball", at: "2026-09-14T05:02:54Z" },
    { kind: "phase", item: "prepare", message: "Trainers are preparing their items…", at: "2026-09-14T05:02:33Z" },
    { kind: "prepared", name: "Sora", item: "berry", at: "2026-09-14T05:02:28Z" },
    { kind: "joined", name: "Sora", at: "2026-09-14T05:02:12Z" },
    { kind: "appeared", message: "Diglett appeared!", at: "2026-09-14T05:01:54Z" }
  ]);
  assert(rows[0].kind === "phase" && /Poké Balls/.test(rows[0].message), rows[0].kind);
  assert(rows[1].kind === "caught", rows[1].kind);
  assert(rows[4].kind === "phase" && /prepar/.test(rows[4].message), rows[4].message);
  assert(rows[6].kind === "appeared", rows[6].kind);
  assert(rows[7].kind === "joined", rows[7].kind);
});

test("later encounters do not swallow earlier throws", () => {
  const rows = window.playConsoleRows([
    { kind: "appeared", message: "Pidgey appeared!", at: "2026-09-14T06:10:00Z" },
    { kind: "joined", name: "Sora", at: "2026-09-14T06:10:05Z" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T06:11:00Z" },
    { kind: "threw", name: "Sora", item: "pokeball", at: "2026-09-14T06:11:10Z" },
    { kind: "appeared", message: "Diglett appeared!", at: "2026-09-14T05:01:54Z" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T05:03:00Z" },
    { kind: "threw", name: "Ash", item: "greatball", at: "2026-09-14T05:03:25Z" }
  ]);
  const kinds = rows.map((row) => `${row.kind}:${row.name || row.message || ""}`);
  assert(kinds[0].includes("Trainers are choosing"), kinds[0]);
  assert(kinds[1] === "threw:Sora", kinds[1]);
  assert(kinds[2] === "appeared:Pidgey appeared!", kinds[2]);
  assert(kinds.some((row) => row === "threw:Ash"), kinds.join(" | "));
  assert(kinds.indexOf("threw:Sora") < kinds.indexOf("threw:Ash"), kinds.join(" | "));
});

test("round_id keeps overlapping encounters separate", () => {
  const rows = window.playConsoleRows([
    { kind: "threw", name: "A", item: "pokeball", at: "2026-09-14T06:10:10Z", round_id: "r2" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T06:10:00Z", round_id: "r2" },
    { kind: "threw", name: "B", item: "greatball", at: "2026-09-14T06:00:12Z", round_id: "r1" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T06:00:01Z", round_id: "r1" }
  ]);
  assert(rows[0].round_id === "r2" && rows[0].kind === "phase", `${rows[0].round_id}:${rows[0].kind}`);
  assert(rows[1].name === "A", rows[1].name);
  assert(rows[2].round_id === "r1" && rows[2].kind === "phase", `${rows[2].round_id}:${rows[2].kind}`);
  assert(rows[3].name === "B", rows[3].name);
});

test("console lines still name berries, honey, and throws", () => {
  const berry = window.playConsoleLine({ kind: "prepared", name: "Sora", item: "berry", at: "2026-09-14T06:00:00Z" });
  const honey = window.playConsoleLine({ kind: "prepared", name: "Sora", item: "bait", at: "2026-09-14T06:00:00Z" });
  const threw = window.playConsoleLine({ kind: "threw", name: "Sora", item: "greatball", at: "2026-09-14T06:00:00Z" });
  assert(/has chosen Oran Berry/.test(berry), berry);
  assert(/used a honey/.test(honey), honey);
  assert(/has thrown/.test(threw) && /Great Ball/.test(threw), threw);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
