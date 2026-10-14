/* node tests/a19-apply-decision-tests.js */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
function sha256(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", rel))).digest("hex");
}

const packet = read("docs/project-command-center/GEN-IX-APPLY-DECISION.md");
const seedManifest = JSON.parse(read("supabase/unapplied/a19-schema/seed/manifest.json"));
const pinManifest = JSON.parse(read("data/gen9-ref/manifest.json"));
const mig = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");

const ddl = {
  "001_private_ref_tables.sql": "61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30",
  "002_catches_nullable_extensions.sql": "855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932",
  "003_rollback.sql": "54fd5c6f69239a9ef81aae7051c255a3c5f1e97b891f5045994752f5cc840208"
};

test("decision packet records owner backup evidence and stays unapproved", () => {
  assert(packet.includes("**Verdict: UNAPPROVED.**"));
  assert(packet.includes("A19-APPLY remains **UNAPPROVED**"));
  assert(packet.includes("2026-10-14 07:44:26"));
  assert(/PITR disabled/i.test(packet));
  assert(!packet.includes("Backup gate **BLOCKED**"));
  assert(!/PRODUCTION PASS/.test(packet));
  assert(!packet.includes("A19-APPLY **APPROVED**"));
  assert(!/SELECT \* FROM public\.catches/i.test(packet));
});

test("packet names the recorded restore target and PITR-off risk", () => {
  assert(packet.includes("07:44:26"));
  assert(packet.includes("+0000") || packet.includes("UTC"));
  assert(/PITR disabled/i.test(packet));
  assert(packet.includes("entire Postgres database"));
});

test("packet explains whole-database restore data loss", () => {
  assert(/entire Postgres database/i.test(packet));
  assert(packet.includes("Storage objects"));
  assert(/7\.5 hours|full day|grows/i.test(packet));
  assert(packet.includes("offline"));
});

test("packet names the schema-only sequence and forbids 003/GENVAL", () => {
  [
    "001_private_ref_tables.sql",
    "seed/00_meta.sql",
    "seed/07_learnsets.sql",
    "seed/10_form_policies.sql",
    "002_catches_nullable_extensions.sql"
  ].forEach((name) => assert(packet.includes(name), name));
  assert(packet.includes("Do not run:** `003_rollback.sql`") || packet.includes("Do not run:** `003"));
  assert(packet.includes("GENVAL"));
  assert(!mig.includes("a19-schema"));
  assert(!mig.includes("001_private_ref_tables"));
});

test("DDL checksums match disk and the packet", () => {
  Object.entries(ddl).forEach(([name, expected]) => {
    const actual = sha256("supabase/unapplied/a19-schema/" + name);
    assert(actual === expected, name + " " + actual);
    assert(packet.includes(expected), name + " missing from packet");
  });
});

test("seed and pin checksums match manifests, packet, and disk", () => {
  assert(seedManifest.contentBuild === "sl-ref-20261013-227b573");
  assert(seedManifest.appliedToSupabase === false);
  assert(seedManifest.counts.learnsets === 14048);
  assert(seedManifest.counts.evolutions === 88);
  Object.entries(seedManifest.files).forEach(([name, row]) => {
    const actual = sha256("supabase/unapplied/a19-schema/seed/" + name);
    assert(actual === row.sha256, name);
    assert(packet.includes(row.sha256), name + " seed hash missing from packet");
  });
  Object.entries(pinManifest.files).forEach(([name, expected]) => {
    if (name === "manifest.json") return;
    const actual = sha256("data/gen9-ref/" + name);
    assert(actual === expected, name);
    assert(packet.includes(expected), name + " pin hash missing from packet");
  });
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
