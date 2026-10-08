const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const out = path.join(__dirname, "..", "docs", "audits", "admin-hub-next-shots");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  for (const [width, height, name] of [[1920, 1080, "gate-1920"], [960, 1080, "gate-960"], [390, 844, "gate-390"]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:4221/admin-next.html", { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  }
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("http://127.0.0.1:4221/admin.html", { waitUntil: "networkidle2", timeout: 60000 });
  const preview = await page.$eval("a[href='./admin-next.html']", (el) => el.textContent.trim());
  const title = await page.$eval(".page-kicker h1", (el) => el.textContent.trim());
  const report = { preview, title, signedIn: false };
  fs.writeFileSync(path.join(out, "gate-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
