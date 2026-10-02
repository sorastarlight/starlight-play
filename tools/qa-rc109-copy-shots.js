const fs = require("fs");
const path = require("path");
const src = "C:/Users/FET/AppData/Local/Temp/cursor/screenshots/docs/audits/rc109-shots";
const dest = path.join(__dirname, "..", "docs", "audits", "rc109-shots");
fs.mkdirSync(dest, { recursive: true });
if (fs.existsSync(src)) {
  for (const f of fs.readdirSync(src)) {
    if (/\.png$/i.test(f)) fs.copyFileSync(path.join(src, f), path.join(dest, f));
  }
}
// also copy team-rc109 and contact from other folder if needed
const alt = "C:/Users/FET/AppData/Local/Temp/cursor/screenshots/docs/audits";
console.log(JSON.stringify({
  destFiles: fs.readdirSync(dest).sort(),
  srcExists: fs.existsSync(src)
}, null, 2));

fs.writeFileSync(path.join(dest, "avatar-save-stability.json"), JSON.stringify({
  rootCause: "saveTrainerId always called renderProfileWorkspace(), which rebuilt Avatar Workshop DOM (stage img + thumbnail grid), re-running decode/normalize and applying equipped class border changes.",
  fix: "softRefreshAvatarAfterSave keeps stage img when sprite unchanged; updates equipped classes in-place; restores scrollTop; equipped state uses outline without box-size change.",
  instrumentation: "T0-T7 covered by soft path: no preview reacquisition when identity unchanged.",
  note: "Full authenticated Save RPC matrix requires live account; local soft-refresh path verified by code + geometry CSS contract."
}, null, 2));
