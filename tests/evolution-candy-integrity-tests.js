/* node tests/evolution-candy-integrity-tests.js */
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
function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const candyFixMig = read("supabase/migrations/20260919030000_fix_family_candy_species_identity.sql");
const oakJs = read("js/oak-transfer.js");
const auditPath = path.join(__dirname, "..", "docs", "audits", "evolution-candy-integrity.csv");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        cols.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx];
    });
    return row;
  });
}

test("migration 20260919030000 sets family_candy_species_id = family_id", () => {
  assert(fs.existsSync(path.join(__dirname, "..", "supabase", "migrations", "20260919030000_fix_family_candy_species_identity.sql")));
  assert(/set\s+family_candy_species_id\s*=\s*s\.family_id/i.test(candyFixMig));
  assert(candyFixMig.includes("family_candy_species_id is distinct from s.family_id"));
});

test("play_transfer_oak grants by family_id and returns candyBaseDex/candyName", () => {
  assert(/fam\s*:=\s*coalesce\(spec\.family_id,\s*c\.dex\)/.test(candyFixMig));
  assert(candyFixMig.includes("'candyBaseDex', candy_base"));
  assert(candyFixMig.includes("'candyName', coalesce(fam_name"));
  assert(candyFixMig.includes("grant_family_candy"));
  assert(!/fam\s*:=\s*coalesce\(spec\.family_candy_species_id/.test(candyFixMig));
});

test("migration asserts Chansey/Rhyhorn/Pikachu/Sandshrew separation", () => {
  assert(/Chansey→Rhyhorn|Chansey.*Rhyhorn/i.test(candyFixMig));
  assert(candyFixMig.includes("Chansey candy key must be 113"));
  assert(candyFixMig.includes("Chansey must not point Candy at Rhyhorn"));
  assert(candyFixMig.includes("Sandshrew must not be in Pikachu family"));
  assert(candyFixMig.includes("family_candy_species_id = 111"));
});

test("audit CSV exists with zero invalid rows and required species", () => {
  assert(fs.existsSync(auditPath), "docs/audits/evolution-candy-integrity.csv missing");
  const rows = parseCsv(fs.readFileSync(auditPath, "utf8"));
  assert(rows.length >= 151, `expected >=151 rows got ${rows.length}`);
  const invalid = rows.filter((r) => String(r.valid).toLowerCase() !== "true");
  assert(invalid.length === 0, `invalid count ${invalid.length}`);
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
  for (const name of required) {
    const row = rows.find((r) => r.species === name);
    assert(row, `missing required species ${name}`);
    assert(String(row.valid).toLowerCase() === "true", `${name} valid!=true`);
    assert(row.family_id === row.family_candy_species_id, `${name} family/candy mismatch`);
    assert(row.candy_key === `species-${row.family_id}`, `${name} candy_key`);
  }
  const chansey = rows.find((r) => r.species === "Chansey");
  const rhyhorn = rows.find((r) => r.species === "Rhyhorn");
  assert(chansey.family_id === "113" && chansey.family_candy_species_id === "113");
  assert(rhyhorn.family_id === "111" && rhyhorn.family_candy_species_id === "111");
  assert(chansey.candy_display_species === "Chansey");
  assert(rhyhorn.candy_display_species === "Rhyhorn");
  assert(!chansey.candy_sprite.includes("111"));
  assert(chansey.candy_sprite.includes("113"));
});

test("oak-transfer.js does not use playItemSprite(species-familyId) as sole path without candyBaseDex", () => {
  assert(oakJs.includes("candyBaseDex"));
  assert(oakJs.includes("candyName"));
  assert(/candyArt|rewardSummary/.test(oakJs));
  // Must not blindly build species-{familyId} art as the only resolution path.
  assert(!/playItemSprite\s*\(\s*`species-\$\{familyId\}`\s*\)/.test(oakJs));
  assert(!/playItemSprite\s*\(\s*['"]species-['"]\s*\+\s*familyId/.test(oakJs));
  assert(!/playItemSprite\s*\(\s*['"]species-['"]\s*\+\s*fam\b/.test(oakJs));
  // candyArt must prefer candyBaseDex / playSpriteUrl(base)
  assert(/candyBaseDex\s*\|\|/.test(oakJs) || /rowOrFamilyId\.candyBaseDex/.test(oakJs));
  assert(/playSpriteUrl\s*\(\s*base/.test(oakJs));
});

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
