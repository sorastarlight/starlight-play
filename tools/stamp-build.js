const fs = require("fs");
const path = require("path");
const BUILD = "20260914-rc2";
const dir = path.join(__dirname, "..");

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".html")) continue;
  const file = path.join(dir, name);
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/(href|src)="((?:css|js)\/[^"?]+)(?:\?v=[^"]*)?"/g, `$1="$2?v=${BUILD}"`);
  if (!/js\/build\.js/.test(html) && /js\/config\.js/.test(html)) {
    html = html.replace(/<script src="js\/config\.js(?:\?v=[^"]*)?"><\/script>/, (m) => `${m}\n<script src="js/build.js?v=${BUILD}"></script>`);
  }
  if (/js\/game\.js/.test(html) && !/js\/variants\.js/.test(html)) {
    html = html.replace(/<script src="js\/game\.js(?:\?v=[^"]*)?"><\/script>/, (m) => `<script src="js/variants.js?v=${BUILD}"></script>\n${m}`);
  }
  fs.writeFileSync(file, html);
}
console.log(`stamped ${BUILD}`);
