// Extracts the read-only progression snapshot from an MCP execute_sql dump into a local QA fixture.
// Output (_fixture.json) is player data: QA-only, never committed.
const fs = require("fs");
const src = process.argv[2];
const raw = fs.readFileSync(src, "utf8");
const outer = JSON.parse(raw);
const text = typeof outer.result === "string" ? outer.result : raw;
const start = text.indexOf("[{");
const end = text.lastIndexOf("}]") + 2;
const rows = JSON.parse(text.slice(start, end).replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
fs.writeFileSync(__dirname + "/_fixture.json", JSON.stringify(rows[0].fixture));
const f = rows[0].fixture;
console.log("achievements", f.achievements.length, "badges", f.badges.length, "titles", f.titles.length, "cosmetics", (f.cosmetics || []).length);
