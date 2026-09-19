/* Write docs/audits/evolution-candy-integrity.csv from MCP export or stdin JSON. */
const fs = require("fs");
const path = require("path");

const src = process.argv[2] || path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/s-NewVTuberProject-Stream-Assets-Games-PokemonRPG/agent-tools/d1c7f59d-7068-43a7-96e5-89a905eafa33.txt"
);
const raw = fs.readFileSync(src, "utf8");
let rows;
const m = raw.match(/<untrusted-data-[^>]+>\s*([\s\S]*?)\s*<\/untrusted-data-/);
if (m) rows = JSON.parse(m[1]);
else rows = JSON.parse(raw);

const cols = [
  "dex", "species", "family_id", "family_candy_species_id", "line_members",
  "candy_key", "candy_display_species", "candy_display_name", "candy_sprite",
  "expected_line", "valid"
];
function esc(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const lines = [cols.join(",")].concat(rows.map((r) => cols.map((c) => {
  if (c === "species") return esc(r.name);
  return esc(r[c]);
}).join(",")));

const outDir = path.join(__dirname, "..", "docs", "audits");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "evolution-candy-integrity.csv");
fs.writeFileSync(out, `${lines.join("\n")}\n`);
const invalid = rows.filter((r) => r.valid !== true);
const need = ["Bulbasaur", "Charmander", "Pikachu", "Sandshrew", "Nidoran♀", "Nidoran♂", "Chansey", "Rhyhorn", "Eevee", "Scyther", "Mr. Mime"];
const missing = need.filter((n) => !rows.some((r) => r.name === n && r.valid === true));
console.log(`wrote ${out}`);
console.log(`rows=${rows.length} invalid=${invalid.length} missing=${missing.join("|") || "none"}`);
if (invalid.length || missing.length) process.exit(1);
