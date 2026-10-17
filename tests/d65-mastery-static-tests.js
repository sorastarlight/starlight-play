const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const harden = fs.readFileSync(path.join(root, "supabase", "unapplied", "d65-mastery", "002_species_mastery_hardening.sql"), "utf8");
const quiet = fs.readFileSync(path.join(root, "supabase", "unapplied", "d65-mastery", "rollback-before-activation.sql"), "utf8");
const destructive = fs.readFileSync(path.join(root, "supabase", "unapplied", "d65-mastery", "rollback-destructive.sql"), "utf8");
const note = fs.readFileSync(path.join(root, "supabase", "unapplied", "d65-mastery", "DO-NOT-APPLY.md"), "utf8");
const d64 = fs.readFileSync(path.join(root, "supabase", "unapplied", "d64-mastery", "001_species_mastery_events.sql"), "utf8");

assert(d64.includes("catch_id uuid PRIMARY KEY"));
assert(!harden.includes("settle_if_needed"));
assert(!harden.includes("grant_mastery"));
assert(!harden.includes("capture_chance"));
assert(!harden.includes("streamlink_wire"));
assert(!harden.includes("obtained_method"));
assert(!/alter\s+table\s+public\.(species_mastery|mastery_ledger)\b/i.test(harden));
assert(!/insert\s+into\s+public\.species_mastery_events\s+select/i.test(harden));
assert(!/activated_at\s*=\s*clock_timestamp\(\)/i.test(
  harden.slice(0, harden.indexOf("CREATE FUNCTION private.activate_species_mastery_events"))
));
assert(harden.includes("CREATE FUNCTION private.activate_species_mastery_events()"));
assert(!/activate_species_mastery_events\(\s*p_/i.test(harden));
assert(harden.includes("FOR SHARE"));
assert(harden.includes("catch predates activation"));
assert(harden.includes("SET search_path TO pg_catalog, public, private"));
assert(harden.includes("REVOKE ALL ON FUNCTION private.record_species_mastery_event(uuid) FROM PUBLIC, anon, authenticated"));
assert(quiet.includes("disable it instead"));
assert(!/delete\s+from\s+public\.catches/i.test(quiet));
assert(!/update\s+public\.species_mastery\b/i.test(quiet));
assert(destructive.includes("BACKUP_VERIFIED"));
assert(!/delete\s+from\s+public\.catches/i.test(destructive));
assert(!/update\s+public\.species_mastery\b/i.test(destructive));
assert(note.includes("DO NOT APPLY"));
assert(note.includes("dtflmlbjhttoewqgkujf"));
assert(!fs.existsSync(path.join(root, "supabase", "migrations", "002_species_mastery_hardening.sql")));

console.log("d65 static checks passed");
