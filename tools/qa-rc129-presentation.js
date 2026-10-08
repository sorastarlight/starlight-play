/**
 * RC129 presentation QA — PlayTester only, non-mutating.
 * REAL DOM + LIVE RPC (read-only). Transfer armed button may be LOCAL HARNESS
 * when PlayTester has 0 sendable Pokémon. No evolve/transfer/claim RPCs.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4219;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc129-shots");
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });
const PLACEHOLDER = "Search by Pokémon name or Pokédex number...";

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
  async function auth() {
    const storageKey = await page.evaluate(() => {
      const ref = String((window.PLAY_CONFIG || {}).supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
      return `sb-${ref}-auth-token`;
    });
    await page.evaluate((key, sess) => localStorage.setItem(key, JSON.stringify(sess)), storageKey, sign.data.session);
  }
  async function shot(name) {
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
  }
  async function open(rel, width, height = 1080) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/${rel}`, { waitUntil: "domcontentloaded" });
    await auth();
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await wait(800);
  }
  function barProbe(sel) {
    return page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const fill = el.querySelector("i");
      return {
        h: Math.round(el.getBoundingClientRect().height),
        radius: cs.borderRadius,
        bg: cs.backgroundColor,
        fill: fill ? getComputedStyle(fill).backgroundImage : "",
        now: el.getAttribute("aria-valuenow"),
        max: el.getAttribute("aria-valuemax")
      };
    }, sel);
  }

  await open("evolve.html#evolution", 1920);
  await page.waitForSelector("#evo-app", { timeout: 25000 });
  await wait(400);
  await page.evaluate(() => document.querySelector("#evo-tab-evolve .oak-lab-collection-controls")?.scrollIntoView({ block: "center" }));
  await wait(200);
  await shot("evolution-1920");
  const evoSearch = await page.evaluate((expected) => {
    const input = document.getElementById("evo-search");
    const sort = document.getElementById("evo-sort");
    const label = input?.closest("label")?.childNodes[0]?.textContent?.trim();
    return {
      label,
      placeholder: input?.getAttribute("placeholder") || "",
      placeholderOk: (input?.getAttribute("placeholder") || "") === expected,
      options: [...(sort?.options || [])].map((o) => ({ value: o.value, text: o.textContent.trim() })),
      familyList: Boolean(document.getElementById("family-list")),
      notes: Boolean(document.querySelector("#evo-tab-evolve details.evo-research-notes")),
      pct: (document.getElementById("evo-kanto-pct")?.textContent || "").trim(),
      meter: {
        now: document.getElementById("evo-kanto-meter")?.getAttribute("aria-valuenow"),
        max: document.getElementById("evo-kanto-meter")?.getAttribute("aria-valuemax")
      }
    };
  }, PLACEHOLDER);
  const evoBar = await barProbe("#evo-kanto-meter");

  async function setSearch(sel, value) {
    await page.evaluate((selector, next) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.value = next;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, sel, value);
    await wait(250);
  }
  if (evoSearch.placeholderOk) {
    await setSearch("#evo-search", "025");
  }
  const evo025 = await page.evaluate(() => [...document.querySelectorAll("#evo-grid .oak-evo-card")].map((el) => el.getAttribute("data-dex")));
  await setSearch("#evo-search", "004");
  const evo004 = await page.evaluate(() => [...document.querySelectorAll("#evo-grid .oak-evo-card")].map((el) => ({
    dex: el.getAttribute("data-dex"),
    name: el.querySelector(".evo-mon-name")?.textContent.trim()
  })));
  await setSearch("#evo-search", "char");
  const evoChar = await page.evaluate(() => [...document.querySelectorAll("#evo-grid .oak-evo-card .evo-mon-name")].map((el) => el.textContent.trim()));
  await setSearch("#evo-search", "");

  for (const [w, h, name] of [[2560, 1440, "evolution-2560"], [1440, 900, "evolution-1440"], [960, 1080, "evolution-960"]]) {
    await page.setViewport({ width: w, height: h });
    await wait(200);
    await page.evaluate(() => document.querySelector("#evo-tab-evolve .oak-lab-collection-controls")?.scrollIntoView({ block: "center" }));
    await wait(150);
    await shot(name);
  }
  await page.setViewport({ width: 390, height: 844 });
  await wait(250);
  await page.evaluate(() => document.querySelector("#evo-tab-evolve .oak-lab-collection-controls")?.scrollIntoView({ block: "center" }));
  await wait(200);
  await shot("evolution-390");

  await open("evolve.html#transfer", 1920);
  await page.waitForSelector("#evo-app", { timeout: 25000 });
  await wait(400);
  await page.evaluate(() => document.querySelector("#evo-tab-send .evo-send-action")?.scrollIntoView({ block: "center" }));
  await wait(200);
  await shot("transfer-1920");
  const transferSearch = await page.evaluate((expected) => {
    const input = document.getElementById("evo-send-search");
    const sort = document.getElementById("evo-send-sort");
    return {
      label: input?.closest("label")?.childNodes[0]?.textContent?.trim(),
      placeholder: input?.getAttribute("placeholder") || "",
      placeholderOk: (input?.getAttribute("placeholder") || "") === expected,
      options: [...(sort?.options || [])].map((o) => ({ value: o.value, text: o.textContent.trim() })),
      notes: Boolean(document.querySelector("#evo-tab-send details.evo-research-notes"))
    };
  }, PLACEHOLDER);
  for (const [w, h, name] of [[2560, 1440, "transfer-2560"], [1440, 900, "transfer-1440"], [960, 1080, "transfer-960"]]) {
    await page.setViewport({ width: w, height: h });
    await wait(200);
    await page.evaluate(() => document.querySelector("#evo-tab-send .evo-send-action")?.scrollIntoView({ block: "center" }));
    await wait(150);
    await shot(name);
  }
  await page.setViewport({ width: 390, height: 844 });
  await wait(250);
  await page.evaluate(() => document.querySelector("#evo-tab-send .evo-send-action")?.scrollIntoView({ block: "center" }));
  await wait(200);
  await shot("transfer-390");

  await open("evolve.html#research/field", 1920);
  await page.waitForSelector("#oak-research-board", { timeout: 25000 });
  await wait(700);
  await shot("research-1920");
  const researchProbe = await page.evaluate(() => ({
    notes: Boolean(document.querySelector("#oak-research-board details.oak-research-notes, #evo-tab-research > details.evo-research-notes")),
    overview: Boolean(document.querySelector(".oak-research-overview")),
    pct: (document.querySelector(".oak-research-complete-pct")?.textContent || "").trim(),
    count: (document.querySelector(".oak-research-progress-count")?.textContent || "").replace(/\s+/g, " ").trim(),
    tracks: [...document.querySelectorAll("[data-research-track]")].map((b) => b.dataset.researchTrack)
  }));
  const researchBar = await barProbe(".oak-research-meter");
  await page.setViewport({ width: 2560, height: 1440 });
  await wait(200);
  await shot("research-2560");
  await page.setViewport({ width: 1440, height: 900 });
  await wait(200);
  await shot("research-1440");
  await page.setViewport({ width: 960, height: 1080 });
  await wait(200);
  await shot("research-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(250);
  await page.evaluate(() => document.querySelector(".oak-research-overview")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("research-390");

  await open("achievements.html", 1920);
  await page.waitForSelector("#prog-app", { timeout: 25000 });
  await wait(700);
  await page.evaluate(() => document.querySelector(".ach-hub-toolbar")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("achievements-1920");
  const achBar = await barProbe(".ach-hub-card .ach-hub-bar");
  const achProbe = await page.evaluate(() => {
    const card = document.querySelector(".ach-hub-card");
    return {
      cat: document.getElementById("ach-cats")?.tagName,
      height: card ? Math.round(card.getBoundingClientRect().height) : 0,
      progress: (card?.querySelector(".ach-hub-progress")?.textContent || "").trim(),
      barRole: card?.querySelector(".ach-hub-bar")?.getAttribute("role")
    };
  });
  await page.setViewport({ width: 2560, height: 1440 });
  await wait(200);
  await shot("achievements-2560");
  await page.setViewport({ width: 1440, height: 900 });
  await wait(200);
  await shot("achievements-1440");
  await page.setViewport({ width: 960, height: 1080 });
  await wait(200);
  await page.evaluate(() => document.querySelector(".ach-hub-toolbar")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("achievements-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(250);
  await page.evaluate(() => document.querySelector(".ach-hub-toolbar")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("achievements-390");

  const report = {
    qaAccount: session.email,
    soraMutated: false,
    twinkleMutated: false,
    mutations: [],
    cleanup: "none — read-only",
    evoSearch,
    evoBar,
    evo025,
    evo004,
    evoChar,
    transferSearch,
    researchProbe,
    researchBar,
    achProbe,
    achBar
  };
  fs.writeFileSync(path.join(outDir, "qa-rc129.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
