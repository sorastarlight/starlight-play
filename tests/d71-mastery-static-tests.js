const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const plan = read("docs/project-command-center/D71-MASTERY-INTEGRATION-PLAN.md");
const rehearsal = read("tools/d71-mastery-integration-rehearsal.js");
assert(plan.includes("233a368e"));
assert(plan.includes("D71 INTEGRATION PLAN READY"));
assert(plan.includes("Do not start D72"));
assert(plan.includes("Species Familiarity"));
assert(plan.includes("settle_if_needed"));
assert(!plan.includes("PRODUCTION PASS"));
assert(rehearsal.includes("settle_if_needed was not called"));
assert(rehearsal.includes("NOT supabase"));
assert(!read("js/play.js").includes("note_species_mastery_catch"));
assert(!read("supabase/unapplied/a19-wire/003_settle_integration.sql").includes("note_species_mastery_catch"));
console.log("d71 static tests passed");
