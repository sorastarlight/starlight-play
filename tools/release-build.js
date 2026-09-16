const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const dir = path.join(__dirname, "..");
const configPath = path.join(dir, "build.json");
const args = process.argv.slice(2);

function readConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function run(script) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: dir,
    stdio: "inherit"
  });
  if (result.status) process.exit(result.status || 1);
}

const setIdx = args.indexOf("--set");
if (setIdx >= 0) {
  const next = String(args[setIdx + 1] || "").trim();
  if (!next) {
    console.error("usage: node tools/release-build.js --set 20260916-rc3");
    process.exit(1);
  }
  const config = readConfig();
  config.appBuild = next;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`appBuild set to ${next}`);
}

const spriteIdx = args.indexOf("--sprite");
if (spriteIdx >= 0) {
  const next = String(args[spriteIdx + 1] || "").trim();
  if (!next) {
    console.error("usage: node tools/release-build.js --sprite 20260916-sp1");
    process.exit(1);
  }
  const config = readConfig();
  config.spriteBuild = next;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`spriteBuild set to ${next}`);
}

run("stamp-build.js");
run("validate-build.js");

const config = readConfig();
const sql = `update public.site_config set game_settings = coalesce(game_settings, '{}'::jsonb) || jsonb_build_object('clientBuild', '${config.appBuild}'), updated_at = now() where id = 1;`;
console.log("");
console.log("Release checklist");
console.log("1. APP_BUILD is", config.appBuild);
console.log("2. HTML/JS/CSS stamps validated");
console.log("3. Publish site_config.clientBuild BEFORE pushing Pages:");
console.log(`   ${sql}`);
console.log("4. Run tests: node tests/play-perf-tests.js && node tests/phase4-hardening-tests.js && node tests/play-present-tests.js && node tests/encounter-stability-tests.js && node tests/encounter-stage-tests.js && node tests/play-ux-tests.js && node tests/evolve-ux-tests.js && node tests/sprite-variant-tests.js && node tests/location-visual-tests.js && node tests/build-hygiene-tests.js");
console.log("5. git commit && git push origin main");
console.log("6. Verify Admin Hub → Game Health → Build Health after Pages cache (up to 10 min) or a hard refresh");
