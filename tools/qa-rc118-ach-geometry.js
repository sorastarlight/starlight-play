/**
 * rc118 achievement card geometry — PlayTester real DOM.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc118-shots");
fs.mkdirSync(dest, { recursive: true });
const PORT = 4198;
const BASE = `http://127.0.0.1:${PORT}`;
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WANT = [
  "Sparkling Collector", "Number One Fan", "Community Champion",
  "Almost There", "Everpresent", "Kanto Master",
  "Experienced Trainer", "Familiar Faces", "Honey Legend",
  "Shiny Specialist", "Veteran Trainer", "Shiny Master",
  "Hive Helper", "Kanto Explorer", "Stream Regular", "Another One"
];

(async () => {
  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root, "-p", String(PORT), "-c-1", "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/achievements.html`, (res) => { res.resume(); resolve(); });
        req.on("error", reject);
      });
      break;
    } catch (_) { await wait(250); }
  }
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(`${BASE}/achievements.html`, { waitUntil: "domcontentloaded" });
  const storageKey = await page.evaluate(() => {
    const ref = String((window.PLAY_CONFIG || {}).supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  });

  async function measure(width, height) {
    await page.setViewport({ width, height });
    await page.goto(`${BASE}/achievements.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate((key, sess) => localStorage.setItem(key, JSON.stringify(sess)), storageKey, sign.data.session);
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector(".ach-hub-card, .ach-next-card, #gate", { timeout: 20000 });
    await wait(800);
    return page.evaluate((want) => {
      const box = (el, card) => {
        if (!el || !card) return null;
        const a = card.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        return {
          y: Math.round((b.top - a.top) * 10) / 10,
          height: Math.round(b.height * 10) / 10
        };
      };
      const read = (card) => {
        const r = card.getBoundingClientRect();
        const name = card.querySelector(".ach-hub-name")?.textContent?.trim() || "";
        return {
          name,
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          progressY: box(card.querySelector(".ach-hub-bar"), card)?.y ?? null,
          rewardY: box(card.querySelector(".ach-hub-rewards"), card)?.y ?? null
        };
      };
      const hub = [...document.querySelectorAll(".ach-hub-card")].map(read);
      const next = [...document.querySelectorAll(".ach-next-card")].map(read);
      const named = {};
      want.forEach((label) => {
        const hit = hub.concat(next).find((row) => row.name === label);
        if (hit) named[label] = hit;
      });
      const heights = hub.map((row) => row.height);
      const progressYs = hub.map((row) => row.progressY);
      const rewardYs = hub.map((row) => row.rewardY);
      const spread = (vals) => {
        const n = vals.filter((v) => v != null);
        if (!n.length) return null;
        return Math.round((Math.max(...n) - Math.min(...n)) * 10) / 10;
      };
      return {
        named,
        hubCount: hub.length,
        next,
        hubSample: hub.slice(0, 6),
        heightSpread: spread(heights),
        progressYSpread: spread(progressYs),
        rewardYSpread: spread(rewardYs)
      };
    }, WANT);
  }

  const report = {
    account: session.email,
    v1920: await measure(1920, 1080),
    v2560: await measure(2560, 1440),
    v960: await measure(960, 800),
    v390: await measure(390, 844)
  };
  fs.writeFileSync(path.join(dest, "ach-geometry.json"), `${JSON.stringify(report, null, 2)}\n`);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/achievements.html`, { waitUntil: "networkidle2" });
  await page.screenshot({ path: path.join(dest, "ach-1920.png"), fullPage: false });
  console.log(JSON.stringify({
    account: report.account,
    v1920: {
      hubCount: report.v1920.hubCount,
      heightSpread: report.v1920.heightSpread,
      progressYSpread: report.v1920.progressYSpread,
      rewardYSpread: report.v1920.rewardYSpread,
      named: report.v1920.named,
      next: report.v1920.next,
      sample: report.v1920.hubSample
    },
    v2560: { heightSpread: report.v2560.heightSpread, progressYSpread: report.v2560.progressYSpread, rewardYSpread: report.v2560.rewardYSpread },
    v960: { heightSpread: report.v960.heightSpread, progressYSpread: report.v960.progressYSpread, rewardYSpread: report.v960.rewardYSpread },
    v390: { heightSpread: report.v390.heightSpread, progressYSpread: report.v390.progressYSpread, rewardYSpread: report.v390.rewardYSpread }
  }, null, 2));
  const bad = ["v1920", "v2560", "v960", "v390"].some((key) => {
    const row = report[key];
    return row.heightSpread > 1.1 || row.progressYSpread > 1.1 || row.rewardYSpread > 1.1;
  });
  await browser.close();
  try { child.kill(); } catch (_) {}
  if (bad) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
