const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const cssPath = path.join(root, "css", "play.css");
const append = fs.readFileSync(path.join(__dirname, "rc111-css-append.css"), "utf8");
let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes("rc111 — Site cohesion")) {
  fs.writeFileSync(cssPath, css + append, "utf8");
  console.log("css appended");
} else console.log("css skip");

const stampPath = path.join(__dirname, "stamp-build.js");
let stamp = fs.readFileSync(stampPath, "utf8");
if (!stamp.includes("fs.writeFileSync(file, html, \"utf8\")") && !stamp.includes("fs.writeFileSync(file, html, 'utf8')")) {
  stamp = stamp.replace(/fs\.writeFileSync\(file, html\);/g, 'fs.writeFileSync(file, html, "utf8");');
  fs.writeFileSync(stampPath, stamp, "utf8");
  console.log("stamp utf8 hardened");
} else console.log("stamp ok");

// neutralize old body lab-station page-canvas coupling (keep bay accents on workspace)
css = fs.readFileSync(cssPath, "utf8");
css = css.replace(
  /body\[data-lab-station="evolve"\] \.evo-lab-stations \{[\s\S]*?\}\nbody\[data-lab-station="research"\] \.evo-lab-stations \{[\s\S]*?\}\n/,
  "/* body[data-lab-station] retired in rc111 — accents live on .evo-lab-workspace */\n"
);
fs.writeFileSync(cssPath, css, "utf8");
console.log("lab-station selectors retired");
