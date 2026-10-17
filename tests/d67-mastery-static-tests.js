const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const earlier = fs.readFileSync(path.join(root, "supabase", "unapplied", "d66-mastery", "003_species_mastery_lifecycle.sql"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase", "unapplied", "d67-mastery", "004_species_mastery_catch_safety.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase", "unapplied", "d67-mastery", "rollback-before-activation.sql"), "utf8");
const note = fs.readFileSync(path.join(root, "supabase", "unapplied", "d67-mastery", "DO-NOT-APPLY.md"), "utf8");

assert(earlier.includes("CREATE TRIGGER catch_insert_authority"));
assert(earlier.includes("txid_current()"));
assert(sql.includes("DROP TRIGGER IF EXISTS catch_insert_authority ON public.catches"));
assert(sql.includes("NEW.server_inserted_at := clock_timestamp()"));
assert(!sql.includes("INSERT INTO private.catch_insert_authority"));
assert(!sql.includes("txid_current()"));
assert(!sql.includes("settle_if_needed"));
assert(!sql.includes("grant_mastery"));
assert(!sql.includes("obtained_method"));
assert(!/update\s+public\.catches\b/i.test(sql));
assert(sql.includes("c.server_inserted_at >= opened"));
assert(rollback.includes("DROP COLUMN IF EXISTS server_inserted_at"));
assert(!/delete\s+from\s+public\.catches/i.test(rollback));
assert(note.includes("DO NOT APPLY"));
assert(note.includes("dtflmlbjhttoewqgkujf"));
assert(!fs.existsSync(path.join(root, "supabase", "migrations", "004_species_mastery_catch_safety.sql")));

console.log("d67 static checks passed");
