const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase", "unapplied", "d66-mastery", "003_species_mastery_lifecycle.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase", "unapplied", "d66-mastery", "rollback-before-activation.sql"), "utf8");
const note = fs.readFileSync(path.join(root, "supabase", "unapplied", "d66-mastery", "DO-NOT-APPLY.md"), "utf8");

assert(sql.includes("private.catch_insert_authority"));
assert(sql.includes("specimen predates activation"));
assert(!sql.includes("caught_at < activated_at"));
assert(!sql.includes("obtained_method"));
assert(!sql.includes("settle_if_needed"));
assert(!sql.includes("grant_mastery"));
assert(!sql.includes("CREATE OR REPLACE FUNCTION private.record_stream_catch"));
assert(!sql.includes("CREATE OR REPLACE FUNCTION private.persist_streamlink_catch"));
assert(!/alter\s+table\s+public\.catches\b/i.test(sql));
assert(!/update\s+public\.catches\b/i.test(sql));
assert(sql.includes("FOR UPDATE SKIP LOCKED"));
assert(sql.includes("split_part(c.source_key, ':', 1) = 'play'"));
assert(sql.includes("success IS TRUE"));
assert(sql.includes("round_is_test"));
assert(sql.includes("'exhausted'"));
assert(sql.includes("mastery lifecycle transition is not allowed"));
assert(rollback.includes("DROP TRIGGER IF EXISTS catch_insert_authority ON public.catches"));
assert(!/delete\s+from\s+public\.catches/i.test(rollback));
assert(!/update\s+public\.species_mastery\b/i.test(rollback));
assert(note.includes("DO NOT APPLY"));
assert(note.includes("dtflmlbjhttoewqgkujf"));
assert(!fs.existsSync(path.join(root, "supabase", "migrations", "003_species_mastery_lifecycle.sql")));

console.log("d66 static checks passed");
