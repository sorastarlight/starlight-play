const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(dir, "build.json"), "utf8"));
const APP = String(config.appBuild || "").trim();
const SPRITE = String(config.spriteBuild || "").trim();
const LOCATION = String(config.locationBuild || "").trim();
const STALE = [
  "enc4", "enc7", "enc9", "p1", "p1a", "p1b", "p2", "p4",
  "rc1", "rc2", "rc8", "auth1", "grant2", "set1", "evo3", "evo4", "acct1"
];

const failures = [];
function fail(msg) {
  failures.push(msg);
}

if (!APP) fail("build.json.appBuild is empty");
if (!SPRITE) fail("build.json.spriteBuild is empty");

const buildJs = fs.readFileSync(path.join(dir, "js", "build.js"), "utf8");
const playBuild = (buildJs.match(/window\.PLAY_BUILD\s*=\s*["']([^"']+)["']/) || [])[1] || "";
const playSprite = (buildJs.match(/window\.PLAY_SPRITE_BUILD\s*=\s*["']([^"']+)["']/) || [])[1] || "";
const playLocation = (buildJs.match(/window\.PLAY_LOCATION_BUILD\s*=\s*["']([^"']+)["']/) || [])[1] || "";
if (playBuild !== APP) fail(`js/build.js PLAY_BUILD=${playBuild || "missing"} expected ${APP}`);
if (playSprite !== SPRITE) fail(`js/build.js PLAY_SPRITE_BUILD=${playSprite || "missing"} expected ${SPRITE}`);
if (LOCATION && playLocation !== LOCATION) fail(`js/build.js PLAY_LOCATION_BUILD=${playLocation || "missing"} expected ${LOCATION}`);

const variants = fs.readFileSync(path.join(dir, "js", "variants.js"), "utf8");
const variantStamp = (variants.match(/window\.PLAY_SPRITE_BUILD\s*=\s*["']([^"']+)["']/) || [])[1] || "";
if (variantStamp !== SPRITE) fail(`js/variants.js PLAY_SPRITE_BUILD=${variantStamp || "missing"} expected ${SPRITE}`);

const manifestPath = path.join(dir, "build-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.appBuild !== APP) fail(`build-manifest.json appBuild=${manifest.appBuild} expected ${APP}`);
  if (manifest.spriteBuild !== SPRITE) fail(`build-manifest.json spriteBuild=${manifest.spriteBuild} expected ${SPRITE}`);
}

const pages = [];
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".html")) continue;
  const html = fs.readFileSync(path.join(dir, name), "utf8");
  const assets = [];
  const re = /(href|src)="((?:css|js)\/[^"?]+)\?v=([^"]*)"/g;
  let match;
  while ((match = re.exec(html))) {
    assets.push({ attr: match[1], path: match[2], stamp: match[3] });
    if (match[3] !== APP) {
      fail(`${name}: ${match[2]} = ${match[3]}`);
    }
  }
  const thirdParty = [];
  const ext = /(href|src)="(https?:\/\/[^"]+)"/g;
  while ((match = ext.exec(html))) {
    thirdParty.push(match[2]);
    if (/\?(?:v=)2026/.test(match[2])) {
      fail(`${name}: third-party URL was given an app stamp ${match[2]}`);
    }
  }
  if (/js\/config\.js/.test(html) && !/js\/build\.js/.test(html)) {
    fail(`${name}: has config.js but missing build.js`);
  }
  if (/js\/build\.js/.test(html) && !/js\/build-client\.js/.test(html)) {
    fail(`${name}: has build.js but missing build-client.js`);
  }
  pages.push({ name, assets, thirdParty });
}

const htmlBlob = pages.map((page) => fs.readFileSync(path.join(dir, page.name), "utf8")).join("\n");
for (const token of STALE) {
  const staleRe = new RegExp(`(?:css|js)/[^"?]+\\?v=[^"\\s]*${token}(?:["&]|$)`);
  if (staleRe.test(htmlBlob)) {
    fail(`stale HTML token still present: ${token}`);
  }
}

if (failures.length) {
  console.error("BUILD VALIDATION FAILED\n");
  console.error(`Expected:\n  ${APP}\n`);
  failures.forEach((row) => console.error(row));
  process.exit(1);
}

console.log(`BUILD VALIDATION PASSED`);
console.log(`APP_BUILD ${APP}`);
console.log(`SPRITE_BUILD ${SPRITE}`);
if (LOCATION) console.log(`LOCATION_BUILD ${LOCATION}`);
console.log(`HTML pages ${pages.length}`);
console.log(`First-party stamps ${pages.reduce((n, page) => n + page.assets.length, 0)}`);
