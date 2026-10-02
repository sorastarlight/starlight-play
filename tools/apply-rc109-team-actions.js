const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "js", "team.js");
let t = fs.readFileSync(file, "utf8");
if (!t.includes("is-always")) {
  if (!t.includes('class="team-slot-actions"')) {
    console.error("marker missing");
    process.exit(1);
  }
  t = t.replace('class="team-slot-actions"', 'class="team-slot-actions is-always"');
  fs.writeFileSync(file, t);
}
console.log("ok", fs.readFileSync(file, "utf8").includes("is-always"));
