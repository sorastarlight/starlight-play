const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const note = read("supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql");
const life = read("supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql");
const grants = read("supabase/unapplied/d72-mastery/007_progress_view_grants.sql");
const live = read("supabase/unapplied/a19-wire/003_settle_integration.sql");
assert(note.includes("DO NOT APPLY"));
assert(note.includes("0c6bf2fb2ca740415fffc567c362192a"));
assert(note.includes("PERFORM private.note_species_mastery_catch(v_catch_id)"));
assert(note.includes("EXCEPTION WHEN OTHERS"));
assert(note.indexOf("wire-materialize-failed") < note.indexOf("EXCEPTION WHEN OTHERS"));
assert((note.match(/v_mat := private\.materialize_streamlink_catch/g) || []).length === 1);
assert(!note.includes("capture_chance(") || note.includes("private.capture_chance("));
assert(!life.includes("settle_if_needed"));
assert(life.includes("FOR SHARE"));
assert(life.includes("recording is not open"));
assert(grants.includes("REVOKE ALL ON TABLE public.species_mastery_progress FROM authenticated"));
assert(grants.includes("GRANT SELECT ON TABLE public.species_mastery_progress TO authenticated"));
assert(!grants.includes("species_mastery.points"));
assert(!live.includes("note_species_mastery_catch"));
assert(!read("js/play.js").includes("note_species_mastery_catch"));
assert(!fs.existsSync(path.join(root, "supabase", "migrations", "006_settle_familiarity_note.sql")));
console.log("d72 static tests passed");
