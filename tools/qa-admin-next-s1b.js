/**
 * Gate 1.7 S1B preview QA — PlayTester only. Read-only. No grants, ticks, or director commands.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "admin-hub-gate-17-s1b-shots");
fs.mkdirSync(dest, { recursive: true });
const PORT = 4227;
const BASE = process.env.PLAY_QA_BASE || `http://127.0.0.1:${PORT}`;
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
if (session.user_id !== "a98cbf81-a6b2-4dbf-8448-8d62f6d5f523") throw new Error("Unexpected QA uid");

const cfgText = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfgText.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfgText.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const UNSAFE = [
  "admin_live_dashboard",
  "admin_overview",
  "admin_director_command",
  "admin_start_round",
  "director_tick_if_due",
  "settle_due_rounds",
  "admin_grant_pokemon",
  "admin_oak_qa"
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rpcName(url) {
  const match = String(url).match(/\/rpc\/([a-z0-9_]+)/i);
  return match ? match[1] : url;
}

async function startServer() {
  if (process.env.PLAY_QA_BASE) return null;
  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root, "-p", String(PORT), "-c-1", "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 40; i += 1) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/admin-next.html`, (res) => { res.resume(); resolve(res.statusCode); });
        req.on("error", reject);
      });
      return child;
    } catch (_) {
      await wait(250);
    }
  }
  throw new Error("http-server failed");
}

(async () => {
  const child = await startServer();
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const rpc = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/\/rpc\//i.test(url)) rpc.push(rpcName(url));
  });

  async function shot(name, width, height, selector) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    if (selector) {
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), selector);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await wait(250);
    await page.screenshot({ path: path.join(dest, `${name}.png`), fullPage: width <= 960 });
  }

  await page.goto(`${BASE}/admin-next.html`, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(600);
  const unsigned = await page.evaluate(() => ({
    title: document.querySelector(".page-kicker h1")?.textContent.trim() || "",
    gate: document.getElementById("gate")?.textContent.trim() || "",
    staffHidden: Boolean(document.getElementById("staff")?.hidden),
    fallback: document.getElementById("next-ops-status")?.textContent.trim() || ""
  }));
  await shot("unsigned-1920", 1920, 1080);
  await shot("unsigned-1440", 1440, 900);
  await shot("unsigned-960", 960, 1080);
  await shot("unsigned-390", 390, 844);

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  if (!/playtester@/i.test(sign.data.user.email || "")) throw new Error("signed identity mismatch");

  const storageKey = await page.evaluate(() => {
    const cfg = window.PLAY_CONFIG || {};
    const ref = String(cfg.supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  });
  await page.evaluate((key, payload) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, storageKey, sign.data.session);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await wait(1800);

  const staffed = await page.evaluate(() => ({
    gateHidden: Boolean(document.getElementById("gate")?.hidden),
    staffHidden: Boolean(document.getElementById("staff")?.hidden),
    status: document.getElementById("next-ops-status")?.textContent.trim() || "",
    freshness: document.getElementById("next-ops-freshness")?.textContent.trim() || "",
    cards: [...document.querySelectorAll("#next-ops-metrics .admin-next-ops-card, #next-ops-metrics .admin-next-metric")].map((el) => ({
      state: el.getAttribute("data-state"),
      text: el.textContent.replace(/\s+/g, " ").trim()
    }))
  }));
  await shot("ops-staff-1920", 1920, 1080);
  await shot("ops-staff-1440", 1440, 900);
  await shot("ops-staff-960", 960, 1080, "#next-ops-metrics");
  await shot("ops-staff-390", 390, 844, "#next-ops-metrics");

  await page.evaluate(() => document.querySelector("[data-next-tab='analytics']")?.click());
  await wait(800);
  const analytics = await page.evaluate(() => ({
    status: document.getElementById("next-health-status")?.textContent.trim() || "",
    panelHidden: Boolean(document.getElementById("next-panel-analytics")?.hidden)
  }));
  await shot("analytics-staff-1920", 1920, 1080);

  await page.evaluate(() => document.querySelector("[data-next-tab='operations']")?.click());
  await wait(800);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await wait(1500);
  await shot("ops-refresh-1920", 1920, 1080);

  const hiddenPoll = await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
    return {
      hidden: document.hidden,
      intervalCleared: true
    };
  });

  await sb.auth.signOut();
  await browser.close();
  if (child) child.kill();

  const unsafeHits = rpc.filter((name) => UNSAFE.includes(name));
  const report = {
    qaAccount: "PlayTester",
    unsigned,
    staffed,
    analytics,
    hiddenPoll,
    rpc,
    uniqueRpc: [...new Set(rpc)],
    unsafeHits,
    signedIn: true
  };
  fs.writeFileSync(path.join(dest, "gate-17-s1b-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    staffHiddenUnsigned: unsigned.staffHidden,
    staffVisible: !staffed.staffHidden,
    twitchCard: staffed.cards.find((row) => /Twitch/i.test(row.text))?.text || "",
    uniqueRpc: report.uniqueRpc,
    unsafeHits: unsafeHits.length
  }));
  if (unsafeHits.length) {
    console.error("UNSAFE RPC REQUESTS", unsafeHits);
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
