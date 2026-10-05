const path = require("path");
const fs = require("fs");
const root = path.join(__dirname, "..", "docs", "audits", "rc111-shots");
(async () => {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("http://127.0.0.1:4188/evolve.html", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    const gate = document.getElementById("gate");
    const app = document.getElementById("evo-app");
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
  });
  const samples = {};
  async function capture(key, station) {
    await page.evaluate((st) => {
      const app = document.getElementById("evo-app");
      if (app) app.dataset.labStation = st;
      delete document.body.dataset.labStation;
      document.querySelectorAll("[data-tab]").forEach((btn) => {
        const on = btn.dataset.tab === st;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.classList.toggle("is-active", on);
      });
      const map = { send: "evo-tab-send", evolve: "evo-tab-evolve", research: "evo-tab-research" };
      Object.entries(map).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (el) el.hidden = k !== st;
      });
    }, station);
    await new Promise((r) => setTimeout(r, 400));
    samples[key] = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return {
        bg: body.backgroundImage,
        color: body.backgroundColor,
        labStationBody: document.body.dataset.labStation || "",
        labStationApp: document.getElementById("evo-app")?.dataset.labStation || ""
      };
    });
    await page.screenshot({ path: path.join(root, key + ".png") });
  }
  await capture("09-oak-evolution-outer", "evolve");
  await capture("10-oak-research-outer", "research");
  await capture("08-oak-transfer-outer", "send");
  const sameBg = samples["08-oak-transfer-outer"].bg === samples["09-oak-evolution-outer"].bg
    && samples["09-oak-evolution-outer"].bg === samples["10-oak-research-outer"].bg
    && !samples["08-oak-transfer-outer"].labStationBody
    && !samples["09-oak-evolution-outer"].labStationBody
    && !samples["10-oak-research-outer"].labStationBody;
  fs.writeFileSync(path.join(root, "oak-background.json"), JSON.stringify({ sameBg, samples }, null, 2));
  console.log(JSON.stringify({ sameBg, samples }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
