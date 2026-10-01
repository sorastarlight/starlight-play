/**
 * Headless-ish screenshot helper via fetch of QA pages is not enough;
 * browser MCP captures screenshots. This script writes movement summary
 * placeholder and lists expected shot filenames for the closure report.
 */
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "docs", "audits", "rc108-shots");
fs.mkdirSync(out, { recursive: true });
const expected = [
  "team-workspace-desktop.png",
  "team-party-stage.png",
  "compact-bg-selector.png",
  "bg-modal.png",
  "owner-bg-contact-sheet.png",
  "gen1-party-scene.png",
  "gen2-party-scene.png",
  "gen3-party-scene.png",
  "gen4-party-scene.png",
  "public-tid-my-team.png",
  "avatar-workshop-tails.png",
  "avatar-workshop-amy.png",
  "avatar-workshop-sora.png",
  "avatar-workshop-mimi.png",
  "avatar-workshop-leaf.png",
  "avatar-workshop-modern-red.png",
  "avatar-movement-qa.png"
];
fs.writeFileSync(path.join(out, "expected-shots.json"), JSON.stringify({ expected }, null, 2));
console.log(JSON.stringify({ out, count: expected.length }, null, 2));
