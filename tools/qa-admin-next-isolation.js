/* node tools/qa-admin-next-isolation.js */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const BASE = process.env.PLAY_QA_BASE || "http://127.0.0.1:4221";
const out = path.join(__dirname, "..", "docs", "audits", "admin-hub-gate-16-shots");
fs.mkdirSync(out, { recursive: true });

const UNSAFE = [
  "admin_live_dashboard",
  "admin_overview",
  "admin_director_command",
  "admin_start_round",
  "director_tick_if_due",
  "settle_due_rounds"
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const rpc = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/\/rest\/v1\/rpc\//i.test(url) || /rpc\/[a-z0-9_]+/i.test(url)) {
      rpc.push({ url, method: req.method() });
    }
  });

  async function shot(name, width, height) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 250));
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
  }

  await page.goto(`${BASE}/admin-next.html`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 500));
  const unsigned = await page.evaluate(() => ({
    title: document.querySelector(".page-kicker h1")?.textContent.trim() || "",
    gate: document.getElementById("gate")?.textContent.trim() || "",
    staffHidden: Boolean(document.getElementById("staff")?.hidden),
    fallback: document.getElementById("next-ops-status")?.textContent.trim() || "",
    unavailable: [...document.querySelectorAll("[data-state='unavailable']")].map((el) => el.textContent.trim())
  }));
  await shot("unsigned-1920", 1920, 1080);
  await shot("unsigned-1440", 1440, 900);
  await shot("unsigned-960", 960, 1080);
  await shot("unsigned-390", 390, 844);

  await page.evaluate(() => {
    const staff = document.getElementById("staff");
    const gate = document.getElementById("gate");
    if (staff) staff.hidden = false;
    if (gate) gate.hidden = true;
    document.querySelector("[data-next-tab='operations']")?.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  const ops = await page.evaluate(() => ({
    status: document.getElementById("next-ops-status")?.textContent.trim() || "",
    states: [...document.querySelectorAll("#next-ops-metrics [data-state]")].map((el) => ({
      state: el.getAttribute("data-state"),
      text: el.textContent.replace(/\s+/g, " ").trim()
    })),
    hasHealthyGreen: [...document.querySelectorAll("#next-ops-metrics .is-active")].length
  }));
  await shot("ops-fallback-1920", 1920, 1080);
  await shot("ops-fallback-1440", 1440, 900);
  await shot("ops-fallback-960", 960, 1080);
  await shot("ops-fallback-390", 390, 844);

  for (const tab of ["trainers", "support", "mart", "config", "system", "analytics"]) {
    await page.evaluate((name) => document.querySelector(`[data-next-tab='${name}']`)?.click(), tab);
    await new Promise((r) => setTimeout(r, 250));
  }
  await shot("analytics-1920", 1920, 1080);

  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));

  const unsafeHits = rpc.filter((row) => UNSAFE.some((name) => row.url.includes(name)));
  const report = {
    unsigned,
    ops,
    rpc,
    unsafeHits,
    signedIn: false,
    staffPanel: "revealed-for-layout-only"
  };
  fs.writeFileSync(path.join(out, "gate-16-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    unsafeHits: unsafeHits.length,
    rpc: rpc.map((row) => row.url),
    fallback: ops.status.slice(0, 80),
    staffHiddenUnsigned: unsigned.staffHidden
  }));
  if (unsafeHits.length) {
    console.error("UNSAFE RPC REQUESTS", unsafeHits);
    process.exit(1);
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
