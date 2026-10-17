const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const sql4 = read("supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql");
const stamp = sql4.slice(
  sql4.indexOf("CREATE FUNCTION private.stamp_catch_server_inserted_at()"),
  sql4.indexOf("CREATE TRIGGER catch_server_inserted_at")
);
const guard = sql4.slice(sql4.indexOf("CREATE OR REPLACE FUNCTION private.species_mastery_events_guard()"));
assert(stamp.includes("NEW.server_inserted_at := clock_timestamp()"));
assert(!/exception/i.test(stamp));
assert(sql4.trimStart().startsWith("--"));
assert(sql4.indexOf("DROP TRIGGER IF EXISTS catch_insert_authority") < sql4.indexOf("ADD COLUMN server_inserted_at"));
assert(!guard.includes("catch_insert_authority"));
assert(!sql4.includes("settle_if_needed"));
assert(!sql4.includes("grant_mastery"));
assert(!/update\s+public\.catches\b/i.test(sql4));
for (const rel of [
  "supabase/unapplied/d64-mastery/001_species_mastery_events.sql",
  "supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql",
  "supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql",
  "supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql"
]) {
  assert(read(rel).includes("DO NOT APPLY"));
  assert(!fs.existsSync(path.join(root, "supabase", "migrations", path.basename(rel))));
}
assert(read("supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql").includes("CREATE TRIGGER catch_insert_authority"));

console.log("d68 static checks passed");
