const fs = require("fs");
const path = require("path");
const srcRoot = "C:/Users/FET/AppData/Local/Temp/cursor/screenshots/docs/audits/rc108-shots";
const dest = path.join(__dirname, "..", "docs", "audits", "rc108-shots");
fs.mkdirSync(dest, { recursive: true });
const files = fs.existsSync(srcRoot) ? fs.readdirSync(srcRoot).filter((n) => /\.png$/i.test(n)) : [];
for (const file of files) {
  fs.copyFileSync(path.join(srcRoot, file), path.join(dest, file));
}
console.log(JSON.stringify({ copied: files.length, files: files.sort() }, null, 2));
