/**
 * Generate docs/audits/evolution-candy-integrity.csv from local authoritative sources.
 * Post-fix identity: family_candy_species_id = family_id; display base = family_id.
 * Does not touch production DB.
 *
 * Usage: node tools/generate-evolution-candy-integrity-csv.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SPECIES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "js", "species.js"), "utf8").match(/window\.PLAY_SPECIES\s*=\s*(\[[\s\S]*?\]);/)[1]
);
const RULES_SQL = fs.readFileSync(
  path.join(ROOT, "supabase", "migrations", "20260914021000_kanto_evo_rules.sql"),
  "utf8"
);
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "evolution-candy-manifest.json"), "utf8")
);

const familyOf = new Map();
const membersOf = new Map();
for (const m of RULES_SQL.matchAll(/'\d+-\d+',\s*(\d+),\s*(\d+),\s*(\d+)/g)) {
  const from = Number(m[1]);
  const to = Number(m[2]);
  const fam = Number(m[3]);
  familyOf.set(from, fam);
  familyOf.set(to, fam);
}
for (let dex = 1; dex <= 151; dex += 1) {
  if (!familyOf.has(dex)) familyOf.set(dex, dex);
}
for (const [dex, fam] of familyOf) {
  if (!membersOf.has(fam)) membersOf.set(fam, new Set());
  membersOf.get(fam).add(dex);
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const header = [
  "dex",
  "species",
  "family_id",
  "family_candy_species_id",
  "line_members",
  "candy_key",
  "candy_display_species",
  "candy_display_name",
  "candy_sprite",
  "expected_line",
  "valid"
];

const rows = [];
let invalid = 0;
for (let dex = 1; dex <= 151; dex += 1) {
  const species = SPECIES[dex - 1];
  const familyId = familyOf.get(dex);
  // After 20260919030000: candy species key identity = family_id
  const familyCandySpeciesId = familyId;
  const members = [...membersOf.get(familyId)].sort((a, b) => a - b);
  const lineMembers = members.map((d) => `${d}:${SPECIES[d - 1]}`).join(";");
  const candyKey = `species-${familyId}`;
  const baseDex = familyId;
  const candyDisplaySpecies = SPECIES[baseDex - 1];
  const candyDisplayName = `${candyDisplaySpecies} Evolution Candy`;
  const candySprite = `images/pokemon/${baseDex}.gif`;
  const expectedLine = lineMembers;
  const manifestRow = MANIFEST.rows.find((r) => Number(r.familyId) === familyId);
  const displayMatchesRep =
    candyDisplaySpecies === (manifestRow?.representativeName || SPECIES[familyId - 1])
    && baseDex === familyId;
  const valid = familyId === familyCandySpeciesId && displayMatchesRep;
  if (!valid) invalid += 1;
  rows.push([
    dex,
    species,
    familyId,
    familyCandySpeciesId,
    lineMembers,
    candyKey,
    candyDisplaySpecies,
    candyDisplayName,
    candySprite,
    expectedLine,
    valid
  ]);
}

const outPath = path.join(ROOT, "docs", "audits", "evolution-candy-integrity.csv");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const body = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n") + "\n";
fs.writeFileSync(outPath, body);

const required = [
  "Bulbasaur",
  "Charmander",
  "Pikachu",
  "Sandshrew",
  "Nidoran♀",
  "Nidoran♂",
  "Chansey",
  "Rhyhorn",
  "Eevee",
  "Scyther",
  "Mr. Mime"
];
console.log(`Wrote ${rows.length} rows to ${outPath}`);
console.log(`invalid=${invalid}`);
for (const name of required) {
  const row = rows.find((r) => r[1] === name);
  if (!row) {
    console.log(`MISSING ${name}`);
    continue;
  }
  console.log(
    `${name}: dex=${row[0]} fam=${row[2]} candy=${row[3]} display=${row[6]} valid=${row[10]}`
  );
}
