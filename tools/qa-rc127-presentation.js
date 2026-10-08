/**
 * RC127 presentation QA — PlayTester only, non-mutating.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4217;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc127-shots");
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });

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

  await open("index.html", 2560, 1440);
  await shot("nav-2560");
  const nav2560 = await page.evaluate(() => {
    const links = [...document.querySelectorAll("#topnav-links a[data-nav]")];
    const toggle = getComputedStyle(document.querySelector(".nav-toggle")).display;
    return {
      labels: links.map((a) => a.textContent.trim()),
      hrefs: links.map((a) => a.getAttribute("href")),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      hamburger: toggle !== "none"
    };
  });

  await page.setViewport({ width: 1920, height: 1080 });
  await wait(250);
  await shot("nav-1920");
  const nav1920 = await page.evaluate(() => {
    const links = [...document.querySelectorAll("#topnav-links a[data-nav]")];
    const toggle = getComputedStyle(document.querySelector(".nav-toggle")).display;
    const actions = document.querySelector(".topnav-actions")?.getBoundingClientRect();
    const last = links[links.length - 1]?.getBoundingClientRect();
    return {
      labels: links.map((a) => a.textContent.trim()),
      hamburger: toggle !== "none",
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      lastBehindProfile: last && actions ? last.right > actions.left + 4 : null
    };
  });

  await page.setViewport({ width: 1440, height: 900 });
  await wait(250);
  await shot("nav-1440");
  const nav1440 = await page.evaluate(() => ({
    hamburger: getComputedStyle(document.querySelector(".nav-toggle")).display !== "none",
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));

  await page.setViewport({ width: 1280, height: 800 });
  await wait(250);
  await shot("nav-1280");

  await page.setViewport({ width: 960, height: 1080 });
  await wait(250);
  await shot("nav-960");
  await page.click(".nav-toggle");
  await wait(300);
  await shot("nav-960-open");
  await page.click(".nav-toggle");
  await wait(200);

  await page.setViewport({ width: 390, height: 844 });
  await wait(250);
  await shot("nav-390");
  await page.click(".nav-toggle");
  await wait(300);
  await shot("nav-390-open");

  await open("trainer.html", 1920);
  await shot("trainer-1920");
  const trainerProbe = await page.evaluate(() => ({
    heading: document.getElementById("page-title")?.textContent.trim(),
    desc: document.querySelector(".tid-kicker-copy p")?.textContent.trim(),
    card: Boolean(document.querySelector(".tid-hero, .tid-card, #hero")),
    shadows: document.querySelectorAll(".tid-party-shadow").length,
    glows: document.querySelectorAll(".tid-party-glow").length,
    sprites: [...document.querySelectorAll(".tid-party-sprite")].map((img) => ({
      w: Math.round(img.getBoundingClientRect().width),
      h: Math.round(img.getBoundingClientRect().height),
      fit: getComputedStyle(img).objectFit,
      render: getComputedStyle(img).imageRendering
    }))
  }));
  const teamShot = await page.$("#trainer-team");
  if (teamShot) await teamShot.screenshot({ path: path.join(outDir, "team-1920.png") });

  await page.setViewport({ width: 390, height: 844 });
  await wait(400);
  await shot("trainer-390");
  const teamMobile = await page.$("#trainer-team");
  if (teamMobile) await teamMobile.screenshot({ path: path.join(outDir, "team-390.png") });

  await open("evolve.html#evolution", 1920);
  await shot("evolution-1920");
  const evoProbe = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#evo-grid .oak-evo-card")];
    return {
      count: cards.length,
      heights: cards.slice(0, 8).map((el) => Math.round(el.getBoundingClientRect().height)),
      candy: cards.filter((el) => el.querySelector(".oak-evo-candy, .oak-candy-item, .oak-candy-art")).length,
      required: cards.filter((el) => /required|owned|more needed/i.test(el.innerText)).length,
      feet: cards.slice(0, 8).map((el) => el.querySelector(".evo-foot")?.innerText.trim())
    };
  });
  const evoCard = await page.$("#evo-grid .oak-evo-card");
  if (evoCard) await evoCard.screenshot({ path: path.join(outDir, "evolution-card.png") });
  await page.setViewport({ width: 960, height: 1080 });
  await wait(300);
  await shot("evolution-960");

  const report = {
    qaAccount: session.email,
    soraMutated: false,
    twinkleMutated: false,
    nav2560,
    nav1920,
    nav1440,
    trainerProbe,
    evoProbe
  };
  fs.writeFileSync(path.join(outDir, "qa-rc127.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
