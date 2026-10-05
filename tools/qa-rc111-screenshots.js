const path = require("path");
const root = path.join(__dirname, "..", "docs", "audits", "rc111-shots");
const shots = [
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "01-play-copy.png", async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "02-tid-linked.png", async (page) => { await page.evaluate(() => document.getElementById("tid").scrollIntoView()); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "03-tid-unlinked.png", async (page) => { await page.evaluate(() => document.getElementById("tid-unlinked").scrollIntoView()); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "04-team-no-kicker.png", async (page) => { await page.evaluate(() => document.getElementById("team").scrollIntoView()); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "05-nav-active.png", async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "06-pc-empty.png", async (page) => { await page.evaluate(() => document.getElementById("pc").scrollIntoView()); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "07-dex-071.png", async (page) => { await page.evaluate(() => document.getElementById("dex").scrollIntoView()); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "11-rankings-desktop.png", async (page) => { await page.evaluate(() => document.getElementById("rank").scrollIntoView()); }],
  ["http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", "16-achievements-top.png", async (page) => { await page.evaluate(() => document.getElementById("ach").scrollIntoView()); }],
  ["http://127.0.0.1:4188/evolve.html", "08-oak-transfer.png", null],
  ["http://127.0.0.1:4188/rankings.html", "12-rankings-page.png", null],
  ["http://127.0.0.1:4188/achievements.html", "17-achievements-page.png", null],
  ["http://127.0.0.1:4188/index.html", "01b-play-index.png", null]
];

(async () => {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const metrics = {};
  for (const [url, name, prep] of shots) {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 1800));
    if (prep) await prep(page);
    if (name.startsWith("01-play")) {
      metrics.play = await page.evaluate(() => {
        const t = document.querySelector(".welcome-blurb")?.textContent || "";
        return { text: t, fffd: t.includes("\uFFFD"), star: t.includes("★"), pokemon: t.includes("Pokémon"), dash: t.includes("—") };
      });
    }
    if (name.includes("tid-linked")) {
      metrics.tid = await page.evaluate(() => ({
        onAvatar: Boolean(document.querySelector("#tid .tid-avatar-stage .twitch-badge")),
        onName: Boolean(document.querySelector("#tid .tid-name .twitch-badge")),
        kicker: Boolean(document.querySelector("#team .tid-team-scene-kicker"))
      }));
    }
    if (name.includes("nav")) {
      metrics.nav = await page.evaluate(() => {
        const a = document.querySelector(".topnav-link[aria-current='page']")?.getBoundingClientRect();
        const i = [...document.querySelectorAll(".topnav-link")].find((el) => el.getAttribute("aria-current") !== "page")?.getBoundingClientRect();
        return { dw: Math.abs((a?.width || 0) - (i?.width || 0)), dh: Math.abs((a?.height || 0) - (i?.height || 0)) };
      });
    }
    await page.screenshot({ path: path.join(root, name), fullPage: name.includes("play") || name.includes("rankings-page") || name.includes("achievements-page") });
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4188/docs/audits/cohesion-rc111.html", { waitUntil: "networkidle2" });
  await page.evaluate(() => document.getElementById("rank").scrollIntoView());
  await page.screenshot({ path: path.join(root, "15-rankings-mobile.png") });
  await page.evaluate(() => document.getElementById("ach").scrollIntoView());
  await page.screenshot({ path: path.join(root, "20-achievements-mobile.png") });
  await browser.close();
  require("fs").writeFileSync(path.join(root, "browser-metrics.json"), JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
