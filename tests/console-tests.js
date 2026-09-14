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

test("newest encounter events stay in time order", () => {
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
  const kinds = rows.map((row) => row.kind);
  assert(kinds.join(",") === "caught,threw,phase,selected,phase,prepared,joined,appeared", kinds.join(","));
  assert(rows[0].kind === "caught", rows[0].kind);
  assert(rows[2].message.includes("Poké Balls"), rows[2].message);
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
  assert(kinds[0] === "threw:Sora", kinds[0]);
  assert(kinds.some((row) => row === "appeared:Pidgey appeared!"), kinds.join(" | "));
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
  assert(rows[0].round_id === "r2" && rows[0].kind === "threw", `${rows[0].round_id}:${rows[0].kind}`);
  assert(rows[1].round_id === "r2" && rows[1].kind === "phase", `${rows[1].round_id}:${rows[1].kind}`);
  assert(rows[2].round_id === "r1" && rows[2].kind === "threw" && rows[2].name === "B", `${rows[2].round_id}:${rows[2].kind}:${rows[2].name}`);
  assert(rows[3].round_id === "r1" && rows[3].kind === "phase", `${rows[3].round_id}:${rows[3].kind}`);
});

test("catch stays above same-second throw echoes", () => {
  const rows = window.playConsoleRows([
    { kind: "resolved", message: "Sora Starlight has thrown a Great Ball!", at: "2026-09-14T06:43:07.819257+00" },
    { kind: "caught", name: "Sora Starlight", item: "Weedle", message: "⭐ Sora Starlight caught Weedle!", at: "2026-09-14T06:43:07.819257+00" },
    { kind: "threw", name: "Sora Starlight", item: "greatball", message: "Sora Starlight has thrown a Great Ball!", at: "2026-09-14T06:42:52.820748+00" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T06:42:25.502834+00" }
  ]);
  assert(rows[0].kind === "caught", rows.map((row) => row.kind).join(","));
  assert(rows[1].kind === "threw", rows[1].kind);
  assert(rows[2].kind === "phase", rows[2].kind);
  assert(!rows.some((row) => row.kind === "resolved"));
});

test("a delayed Poké Ball banner stays under a faster lock-in", () => {
  const rows = window.playConsoleRows([
    { kind: "escaped", name: "Sora Starlight", item: "Voltorb", at: "2026-09-14T11:28:13Z" },
    { kind: "threw", name: "Sora Starlight", item: "fastball", at: "2026-09-14T11:27:58Z" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T11:27:32.800Z" },
    { kind: "selected", name: "Sora Starlight", item: "fastball", at: "2026-09-14T11:27:32.100Z" },
    { kind: "prepared", name: "Sora Starlight", item: "berry", at: "2026-09-14T11:27:04Z" },
    { kind: "phase", item: "prepare", message: "Trainers are preparing their items…", at: "2026-09-14T11:26:59Z" },
    { kind: "joined", name: "Sora Starlight", at: "2026-09-14T11:26:37Z" },
    { kind: "appeared", message: "Voltorb appeared!", at: "2026-09-14T11:26:27Z" }
  ]);
  const kinds = rows.map((row) => row.kind);
  assert(kinds.join(",") === "escaped,threw,selected,phase,prepared,phase,joined,appeared", kinds.join(","));
  assert(rows[2].kind === "selected" && /fastball/i.test(rows[2].item), `${rows[2].kind}:${rows[2].item}`);
  assert(rows[3].message.includes("Poké Balls"), rows[3].message);
});

test("same-second status lines do not leapfrog a player action", () => {
  const rows = window.playConsoleRows([
    { kind: "selected", name: "Sora", item: "fastball", at: "2026-09-14T11:27:32Z" },
    { kind: "phase", item: "throw", message: "Trainers are choosing their Poké Balls!", at: "2026-09-14T11:27:32Z" }
  ]);
  assert(rows[0].kind === "selected", rows.map((row) => row.kind).join(","));
  assert(rows[1].kind === "phase", rows[1].kind);
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
