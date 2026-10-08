/**
 * rc123 close-up shots after candy-mascot contrast tweak. PlayTester, non-mutating.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4214;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc123-shots");
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
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
  await page.waitForSelector("#evo-app", { timeout: 20000 });
  await wait(800);

  await page.click("#tab-evolve");
  await wait(400);
  await page.evaluate(() => document.querySelector("#evo-grid")?.scrollIntoView({ block: "start" }));
  await wait(200);
  const first = await page.$("#evo-grid .oak-evo-card");
  if (first) await first.screenshot({ path: path.join(outDir, "evo-card-closeup.png") });
  await page.screenshot({ path: path.join(outDir, "evolution-grid-scrolled.png"), fullPage: false });

  await page.evaluate(() => {
    const grid = document.getElementById("evo-send-grid");
    const candy = window.playEvolutionCandyItemUrl?.(113);
    const mascot = window.playSpriteUrl?.(113, "normal") || "";
    grid.innerHTML = `<article class="evo-mon evo-send-card oak-mon-card" data-oak-id="qa-chansey" data-dex="113">
      <button type="button" class="oak-mon-inspect">
        <span class="evo-mon-art"><img src="${window.playSpriteUrl?.(113, "normal") || ""}" alt="" width="96" height="96"></span>
        <strong class="evo-mon-name oak-mon-name">#113 Chansey</strong>
      </button>
      <div class="oak-card-context">
        <span class="oak-send-candy evo-cost-candy">
          <span class="oak-candy-art is-composite" style="--oak-candy-size:40px">
            <img class="oak-candy-body" src="${candy}" alt="" width="40" height="40">
            <span class="oak-candy-mascot-plate" aria-hidden="true">
              <img class="oak-candy-mascot" src="${mascot}" alt="" width="21" height="21">
            </span>
          </span>
          <span class="evo-cost-candy-copy"><strong>Chansey Evolution Candy</strong></span>
        </span>
      </div>
      <button type="button" class="evo-foot is-select">Click here to select</button>
    </article>`;
  });
  await page.click("#tab-send");
  await wait(300);
  const card = await page.$('[data-dex="113"]');
  if (card) await card.screenshot({ path: path.join(outDir, "chansey-card-closeup.png") });

  const geom = await page.evaluate(() => {
    const evo = document.querySelector("#evo-grid .oak-evo-card");
    const send = document.querySelector("#evo-send-grid .oak-mon-card");
    const box = (el) => {
      if (!el) return null;
      const cr = el.getBoundingClientRect();
      const foot = el.querySelector(".evo-foot")?.getBoundingClientRect();
      return {
        h: Math.round(cr.height),
        pad: getComputedStyle(el).paddingBottom,
        footGap: foot ? Math.round(cr.bottom - foot.bottom) : null,
        text: el.innerText.replace(/\s+/g, " ").trim()
      };
    };
    return { evo: box(evo), send: box(send) };
  });
  fs.writeFileSync(path.join(outDir, "qa-rc123-closeup.json"), JSON.stringify(geom, null, 2));
  console.log(JSON.stringify(geom, null, 2));
  await browser.close();
  stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
