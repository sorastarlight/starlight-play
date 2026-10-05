/**
 * Quick Buy/Sell geometry remeasure after tab-height fix.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc113-shots");
const PORT = 4194;
const BASE = `http://127.0.0.1:${PORT}`;
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root, "-p", String(PORT), "-c-1", "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/store.html`, (res) => { res.resume(); resolve(); });
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
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/store.html`, { waitUntil: "domcontentloaded" });
  const storageKey = await page.evaluate(() => {
    const ref = String((window.PLAY_CONFIG || {}).supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  });
  await page.evaluate((key, sess) => localStorage.setItem(key, JSON.stringify(sess)), storageKey, sign.data.session);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await wait(1200);
  const measure = () => page.evaluate(() => {
    const mode = document.querySelector(".mart-mode");
    const shell = document.querySelector(".mart-mode-workspace");
    const body = document.querySelector(".mart-folder-body");
    const mr = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), width: Math.round(r.width) };
    };
    return { scrollY: window.scrollY, mode: mr(mode), shell: mr(shell), content: mr(body) };
  });
  await page.click('[data-mart-mode="buy"]');
  await wait(400);
  const buy = await measure();
  await page.click('[data-mart-mode="sell"]');
  await wait(500);
  const sell = await measure();
  await page.click('[data-mart-mode="buy"]');
  await wait(500);
  const buy2 = await measure();
  const out = {
    buy, sell, buy2,
    shellTopDeltaBuySell: Math.abs((sell.shell?.top || 0) - (buy.shell?.top || 0)),
    shellTopDeltaSellBuy: Math.abs((buy2.shell?.top || 0) - (sell.shell?.top || 0)),
    modeTopDelta: Math.abs((sell.mode?.top || 0) - (buy.mode?.top || 0)),
    scrollDelta: Math.abs((sell.scrollY || 0) - (buy.scrollY || 0))
  };
  fs.writeFileSync(path.join(dest, "geometry-remeasure.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  try { child.kill(); } catch (_) {}
})().catch((e) => { console.error(e); process.exit(1); });
