const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4213;
const BASE = `http://127.0.0.1:${PORT}`;
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = cfg.match(/supabaseUrl:\s*"([^"]+)"/)[1];
const sbKey = cfg.match(/supabaseKey:\s*"([^"]+)"/)[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root, "-p", String(PORT), "-c-1", "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  const stop = () => { try { child.kill(); } catch (_) {} };
  process.on("exit", stop);
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/evolve.html`, (res) => { res.resume(); resolve(); });
        req.on("error", reject);
      });
      break;
    } catch (_) { await wait(250); }
  }
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/evolve.html`, { waitUntil: "domcontentloaded" });
  const storageKey = await page.evaluate(() => {
    const ref = String((window.PLAY_CONFIG || {}).supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  });
  await page.evaluate((key, sess) => localStorage.setItem(key, JSON.stringify(sess)), storageKey, sign.data.session);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("#evo-app, #gate", { timeout: 20000 });
  await wait(800);
  await page.evaluate(() => {
    const candy = window.playEvolutionCandyItemUrl?.(25) || "images/items/evolution-candy/25.png";
    const spr = window.playSpriteUrl?.(25, "normal");
    const sprites = document.getElementById("oak-lab-sprites");
    const copy = document.getElementById("oak-lab-copy");
    const title = document.getElementById("oak-lab-title");
    if (title) title.textContent = "Transfer Pokémon?";
    if (sprites) {
      sprites.innerHTML = `<div class="oak-confirm-hero"><img src="${spr}" alt="" width="112" height="112"><strong>Pikachu</strong><span>#025 · Lv. 20</span></div>`;
    }
    if (copy) {
      copy.innerHTML = `<div class="oak-confirm-result"><p class="oak-confirm-result-label">Transfer result</p><span class="oak-confirm-candy-row"><span class="oak-candy-art" style="--oak-candy-size:40px"><img class="oak-candy-item" src="${candy}" width="40" height="40" alt=""></span><span>Pikachu Evolution Candy</span></span></div><div class="oak-confirm-warn"><p>Sending this Pokémon to Professor Oak permanently removes it from your collection. Professor Oak will provide Evolution Candy for its Evolution Line after receiving it. This cannot be undone.</p></div>`;
    }
    document.getElementById("oak-lab-modal")?.showModal?.();
  });
  await wait(400);
  await page.screenshot({ path: path.join(root, "docs", "audits", "rc122-shots", "transfer-confirm.png"), fullPage: false });
  await page.keyboard.press("Escape");
  await wait(200);
  await page.click("#tab-evolve");
  await wait(400);
  await page.evaluate(() => document.querySelector("#evo-grid .oak-evo-card")?.scrollIntoView({ block: "center" }));
  await wait(200);
  await page.screenshot({ path: path.join(root, "docs", "audits", "rc122-shots", "evolution-cards-footers.png"), fullPage: false });
  await page.evaluate(() => {
    const modal = document.getElementById("evo-modal");
    const detail = document.getElementById("evo-detail");
    const title = document.getElementById("evo-title");
    const goBtn = document.getElementById("evo-go");
    if (title) title.textContent = "Evolution Ready";
    modal?.classList.add("is-ready-confirm");
    if (goBtn) {
      goBtn.hidden = false;
      goBtn.textContent = "Evolve Sandshrew";
    }
    if (detail) {
      const candy = window.playEvolutionCandyItemUrl?.(27) || "images/items/evolution-candy/27.png";
      detail.innerHTML = `<div class="evo-confirm-pair">
        <div class="evo-confirm-mon"><img src="images/pokemon/27.gif" width="96" height="96" alt=""><strong>Sandshrew</strong><span>#027 · Lv. 12</span></div>
        <span class="evo-confirm-arrow">→</span>
        <div class="evo-confirm-mon"><img src="images/pokemon/28.gif" width="96" height="96" alt=""><strong>Sandslash</strong><span>#028</span></div>
      </div>
      <div class="evo-confirm-reqs"><p class="eyebrow">Requirements</p>
        <div class="evo-confirm-req"><img src="${candy}" width="36" height="36" alt=""><span>Sandshrew Evolution Candy</span><strong>67 / 25 ✓</strong></div>
      </div>
      <p class="evo-confirm-call">Sandshrew is ready to evolve into Sandslash!</p>`;
    }
    modal?.showModal?.();
  });
  await wait(300);
  const scroll = await page.evaluate(() => {
    const detail = document.getElementById("evo-detail");
    return detail ? { scrollHeight: detail.scrollHeight, clientHeight: detail.clientHeight, overflowY: getComputedStyle(detail).overflowY } : null;
  });
  await page.screenshot({ path: path.join(root, "docs", "audits", "rc122-shots", "evolution-confirm-1920.png"), fullPage: false });
  console.log(JSON.stringify({ extraConfirmScroll: scroll }));
  await browser.close();
  stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
