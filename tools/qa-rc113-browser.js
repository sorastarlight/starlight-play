/**
 * rc113 Mart / Pass / My PC browser visual QA
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc113-shots");
fs.mkdirSync(dest, { recursive: true });
const PORT = 4193;
const BASE = `http://127.0.0.1:${PORT}`;

const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");

const cfgText = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfgText.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfgText.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startServer() {
  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root, "-p", String(PORT), "-c-1", "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/store.html`, (res) => { res.resume(); resolve(res.statusCode); });
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
  const report = { brand: {}, mart: {}, pass: {}, geometry: {}, pc: {}, viewports: {} };

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;

  async function injectAuth() {
    await page.evaluateOnNewDocument((sess) => {
      const key = Object.keys(sess.storage || {})[0];
      // filled below after reading localStorage schema from config project ref
      window.__QA_SESSION__ = sess;
    }, { access_token: sign.data.session.access_token, refresh_token: sign.data.session.refresh_token });
  }

  // Discover supabase storage key
  await page.goto(`${BASE}/store.html`, { waitUntil: "domcontentloaded" });
  const storageKey = await page.evaluate(() => {
    const cfg = window.PLAY_CONFIG || {};
    const ref = String(cfg.supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  });

  async function authedGoto(urlPath) {
    await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.evaluate((key, sessionPayload) => {
      localStorage.setItem(key, JSON.stringify(sessionPayload));
    }, storageKey, sign.data.session);
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await wait(1200);
  }

  // Brand / Mart header
  await page.setViewport({ width: 1920, height: 1080 });
  await authedGoto("/store.html");
  report.brand = await page.evaluate(() => {
    const h1 = document.querySelector(".mart-kicker h1")?.textContent?.trim() || "";
    const body = document.body.innerText || "";
    return {
      h1,
      hasStarlightMartHeader: /ST★RLIGHT\s+Mart/i.test(h1),
      hasStarlightRpg: /ST★RLIGHT\s+(Pokémon\s+)?RPG/i.test(body),
      hasAmericaNewYork: /America\/New_York/i.test(body),
      hasMartNav: Array.from(document.querySelectorAll("a")).some((a) => a.textContent.trim() === "Mart"),
      passTitle: document.querySelector(".pass-title")?.textContent?.trim() || "",
      supplyNote: document.querySelector(".pass-time-note")?.textContent?.trim() || "",
      sellId: document.getElementById("sell")?.id || null,
      sellPanelId: document.getElementById("mart-sell-panel")?.id || null
    };
  });

  await page.screenshot({ path: path.join(dest, "mart-1920.png"), fullPage: true });

  // Buy/Sell geometry
  async function measureMode() {
    return page.evaluate(() => {
      const mode = document.querySelector(".mart-mode");
      const shell = document.querySelector(".mart-mode-workspace");
      const body = document.querySelector(".mart-folder-body");
      const mr = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
      };
      const selected = document.querySelector(".mart-mode-btn.is-on")?.textContent?.trim();
      const selectedBg = getComputedStyle(document.querySelector(".mart-mode-btn.is-on") || document.body).backgroundImage;
      return {
        scrollY: window.scrollY,
        mode: mr(mode),
        shell: mr(shell),
        content: mr(body),
        selected,
        selectedBg
      };
    });
  }

  // Ensure buy first
  const buyBtn = await page.$('[data-mart-mode="buy"]');
  if (buyBtn) await buyBtn.click();
  await wait(500);
  const buyGeo = await measureMode();
  const sellBtn = await page.$('[data-mart-mode="sell"]');
  if (sellBtn) await sellBtn.click();
  await wait(700);
  const sellGeo = await measureMode();
  const buyBtn2 = await page.$('[data-mart-mode="buy"]');
  if (buyBtn2) await buyBtn2.click();
  await wait(700);
  const buyGeo2 = await measureMode();

  report.geometry = {
    buy: buyGeo,
    sell: sellGeo,
    buyAgain: buyGeo2,
    shellTopDeltaBuySell: Math.abs((sellGeo.shell?.top || 0) - (buyGeo.shell?.top || 0)),
    shellTopDeltaSellBuy: Math.abs((buyGeo2.shell?.top || 0) - (sellGeo.shell?.top || 0)),
    modeTopDelta: Math.abs((sellGeo.mode?.top || 0) - (buyGeo.mode?.top || 0)),
    scrollDelta: Math.abs((sellGeo.scrollY || 0) - (buyGeo.scrollY || 0)),
    noRainbow: !/ff7eb6|5ec8ef/i.test(String(buyGeo.selectedBg) + String(sellGeo.selectedBg))
  };
  await page.screenshot({ path: path.join(dest, "mart-sell-1920.png"), fullPage: false });

  report.pass = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".pass-reward-card")).map((el) => ({
      chip: el.querySelector(".pass-reward-chip")?.textContent?.trim(),
      ready: el.classList.contains("is-ready"),
      claimed: el.classList.contains("is-claimed")
    }));
    return {
      active: document.querySelector(".pass-showcase")?.classList.contains("is-active") || document.querySelector(".pass-showcase")?.classList.contains("active"),
      cards,
      hasEastern: /12:00 AM Eastern Time/.test(document.body.innerText),
      hasAmericaTz: /America\/New_York/.test(document.body.innerText),
      cooldownCopy: Array.from(document.querySelectorAll(".pass-time-note")).map((n) => n.textContent.trim())
    };
  });

  // PC page
  await authedGoto("/storage.html");
  report.pc = await page.evaluate(() => ({
    title: document.querySelector(".pc-title")?.textContent?.trim(),
    placeholder: document.getElementById("box-search")?.getAttribute("placeholder") || "",
    searchIcon: document.querySelector(".pc-search-icon")?.textContent?.trim() || "",
    hasAutoArrange: Boolean(document.getElementById("pc-auto-arrange")),
    hasDeleteBox: Boolean(document.getElementById("pc-delete-box"))
  }));
  await page.screenshot({ path: path.join(dest, "pc-1920.png"), fullPage: false });

  for (const vp of [
    { name: "2560", width: 2560, height: 1440 },
    { name: "390", width: 390, height: 844 }
  ]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await authedGoto("/store.html");
    await page.screenshot({ path: path.join(dest, `mart-${vp.name}.png`), fullPage: false });
    report.viewports[vp.name] = {
      h1: await page.$eval(".mart-kicker h1", (el) => el.textContent.trim()).catch(() => ""),
      passPanels: await page.$$eval(".pass-reward-card", (els) => els.length).catch(() => 0)
    };
  }

  fs.writeFileSync(path.join(dest, "browser-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  try { child.kill(); } catch (_) {}
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
