const path = require("path");
const root = path.join(__dirname, "..", "docs", "audits", "rc110-shots");
const shots = [
  ["http://127.0.0.1:4188/docs/audits/avatar-rc110.html", "01-avatar-browser.png"],
  ["http://127.0.0.1:4188/docs/audits/avatar-rc110.html", "02-avatar-workshop-preview.png"],
  ["http://127.0.0.1:4188/docs/audits/team-rc110.html?v=2", "04-team-editor-six-slots.png"],
  ["http://127.0.0.1:4188/docs/audits/team-rc110.html?v=2", "05-team-editor-extreme.png"],
  ["http://127.0.0.1:4188/docs/audits/bg-modal-rc110.html?v=2", "06-basic-bg-modal.png"],
  ["http://127.0.0.1:4188/docs/audits/team-rc110.html?v=2", "07-basic-red-blue-scene.png"],
  ["http://127.0.0.1:4188/docs/audits/bg-modal-rc110.html?v=retro", "11-retro-coming-soon.png"]
];

(async () => {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  for (const [url, name] of shots) {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    if (name.includes("extreme")) {
      await page.evaluate(() => window.scrollTo(0, 420));
    }
    if (name.includes("red-blue")) {
      await page.evaluate(() => window.scrollTo(0, 900));
    }
    await page.screenshot({ path: path.join(root, name), fullPage: name.includes("modal") || name.includes("avatar") });
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4188/docs/audits/team-rc110.html?v=2", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(root, "15-mobile-team-editor.png"), fullPage: true });
  await page.goto("http://127.0.0.1:4188/docs/audits/bg-modal-rc110.html?v=2", { waitUntil: "networkidle2" });
  await page.screenshot({ path: path.join(root, "16-mobile-bg-modal.png"), fullPage: true });
  await browser.close();
  console.log("screenshots ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
