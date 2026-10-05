const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc112-shots");
fs.mkdirSync(dest, { recursive: true });
const PORT = 4192;
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startServer() {
  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root,
    "-p",
    String(PORT),
    "-c-1",
    "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/index.html`, (res) => {
          res.resume();
          resolve(res.statusCode);
        });
        req.on("error", reject);
      });
      return child;
    } catch (_) {
      await wait(250);
    }
  }
  throw new Error("http-server failed to start");
}

(async () => {
  let child;
  try {
    child = await startServer();
  } catch (err) {
    // fallback: npx
    child = spawn("npx", ["--yes", "http-server", root, "-p", String(PORT), "-c-1"], {
      cwd: root,
      stdio: "ignore",
      shell: true,
      windowsHide: true
    });
    await wait(1500);
  }

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const report = { viewports: {}, dex: {}, mart: {}, brand: {}, passUi: {} };

  // Fixture page for dex geometry without auth
  const fixture = `<!doctype html><html><meta charset="utf-8">
<link rel="stylesheet" href="/css/play.css">
<body data-page="pokedex">
<div class="wrap"><div class="dex-grid" id="grid"></div></div>
<script src="/js/config.js"></script>
<script src="/js/build.js"></script>
<script src="/js/variants.js"></script>
<script src="/js/game.js"></script>
<script>
const cells = [
  {dex:1,name:"Bulbasaur",seen:false,caught:false},
  {dex:25,name:"Pikachu",seen:true,caught:false},
  {dex:64,name:"Kadabra",seen:true,caught:true},
  {dex:65,name:"Alakazam",seen:true,caught:true},
  {dex:70,name:"Weepinbell",seen:false,caught:false},
  {dex:71,name:"Victreebel",seen:false,caught:false},
  {dex:72,name:"Tentacool",seen:false,caught:false},
  {dex:102,name:"Exeggcute",seen:true,caught:true}
];
document.getElementById("grid").innerHTML = cells.map((entry) => {
  const state = entry.caught ? "caught" : entry.seen ? "seen" : "unseen";
  const label = entry.seen ? entry.name : "???";
  const sprite = window.playSpriteUrl(entry.dex, "normal");
  const spriteClass = state === "unseen" ? "silhouette" : state === "seen" ? "seen-sprite" : "";
  return '<article class="dex-cell '+state+'" data-dex="'+entry.dex+'">'
    +'<span class="dex-no">No. '+String(entry.dex).padStart(3,"0")+'</span>'
    +'<img src="'+sprite+'" alt="" class="dex-sprite '+spriteClass+'" width="72" height="72">'
    +'<strong class="dex-name">'+label+'</strong></article>';
}).join("");
</script></body></html>`;
  fs.writeFileSync(path.join(dest, "dex-fixture.html"), fixture);

  async function measureDex(vp) {
    await page.setViewport(vp);
    await page.goto(`${BASE}/docs/audits/rc112-shots/dex-fixture.html`, { waitUntil: "networkidle2", timeout: 60000 });
    await wait(800);
    const data = await page.evaluate(async () => {
      const out = [];
      for (const cell of document.querySelectorAll(".dex-cell")) {
        const no = cell.querySelector(".dex-no");
        const img = cell.querySelector("img.dex-sprite");
        const name = cell.querySelector(".dex-name");
        const cr = cell.getBoundingClientRect();
        const nr = no.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        const mr = name.getBoundingClientRect();
        const ok = nr.bottom <= ir.top + 1 && ir.bottom <= mr.top + 2
          && Math.abs((nr.left + nr.width / 2) - (cr.left + cr.width / 2)) < 12
          && Math.abs((mr.left + mr.width / 2) - (cr.left + cr.width / 2)) < 14;
        let natural = 0;
        try {
          if (!img.complete) await new Promise((res) => { img.onload = img.onerror = res; setTimeout(res, 2000); });
          natural = img.naturalWidth || 0;
        } catch (_) {}
        out.push({
          dex: Number(cell.dataset.dex),
          state: [...cell.classList].find((c) => /unseen|seen|caught/.test(c)),
          label: name.textContent,
          geometryOk: ok,
          imgNatural: natural,
          src: img.getAttribute("src"),
          h: Math.round(cr.height),
          w: Math.round(cr.width)
        });
      }
      return out;
    });
    await page.screenshot({ path: path.join(dest, `dex-${vp.width}.png`) });
    return data;
  }

  report.dex["1920"] = await measureDex({ width: 1920, height: 1080 });
  report.dex["2560"] = await measureDex({ width: 2560, height: 1440 });
  report.dex["390"] = await measureDex({ width: 390, height: 844 });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/docs/audits/rc112-shots/dex-fixture.html`, { waitUntil: "networkidle2" });
  await page.evaluate(() => { document.body.style.zoom = "0.8"; });
  await wait(400);
  await page.screenshot({ path: path.join(dest, "dex-80zoom.png") });
  report.viewports.dex80 = true;

  // Brand pages
  for (const [url, shot] of [
    ["/index.html", "brand-index.png"],
    ["/help.html", "brand-help.png"],
    ["/rankings.html", "brand-rankings.png"],
    ["/achievements.html", "brand-achievements.png"]
  ]) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 60000 });
    await wait(600);
    await page.screenshot({ path: path.join(dest, shot), fullPage: false });
  }
  report.brand = await page.evaluate(() => {
    const pages = {};
    return pages;
  });
  report.brand.scan = await (async () => {
    const results = {};
    for (const url of ["/index.html", "/help.html", "/rankings.html", "/achievements.html"]) {
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
      results[url] = await page.evaluate(() => {
        const t = document.body.innerText;
        return {
          hasRpg: /ST★RLIGHT\s+(Pokémon\s+)?RPG/.test(t),
          streamLink: t.includes("Pokémon StreamLink"),
          fffd: t.includes("\uFFFD"),
          pokemon: t.includes("Pokémon")
        };
      });
    }
    return results;
  })();

  // Mart background stability
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/store.html`, { waitUntil: "networkidle2", timeout: 90000 });
  await wait(2500);
  const bgOf = async () => page.evaluate(() => getComputedStyle(document.body).backgroundImage + "||" + getComputedStyle(document.body).backgroundColor);
  const bgs = {};
  bgs.initial = await bgOf();
  await page.screenshot({ path: path.join(dest, "mart-initial.png") });

  // Click department tabs if present
  const tabs = await page.$$(".mart-tab");
  const tabLabels = [];
  for (let i = 0; i < tabs.length; i++) {
    const label = await tabs[i].evaluate((el) => el.textContent.trim().replace(/\s+/g, " "));
    tabLabels.push(label);
    await tabs[i].click();
    await wait(400);
    bgs[label || `tab${i}`] = await bgOf();
    const safe = String(label || i).replace(/[^\w]+/g, "-").slice(0, 40);
    await page.screenshot({ path: path.join(dest, `mart-tab-${safe}.png`) });
  }

  // Buy/Sell geometry
  const modeGeom = await page.evaluate(() => {
    const buy = document.querySelector('[data-mart-mode="buy"]');
    const sell = document.querySelector('[data-mart-mode="sell"]');
    const workspace = document.querySelector(".mart-mode-workspace");
    const inKicker = Boolean(document.querySelector(".mart-kicker [data-mart-mode]"));
    return {
      hasBuy: Boolean(buy),
      hasSell: Boolean(sell),
      inWorkspace: Boolean(workspace && workspace.contains(buy)),
      inKicker,
      buyOn: buy?.classList.contains("is-on"),
      rect: buy?.getBoundingClientRect()?.toJSON?.() || null
    };
  });
  report.mart.modeGeom = modeGeom;
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const buyRectBefore = await page.evaluate(() => document.querySelector('[data-mart-mode="buy"]')?.getBoundingClientRect().toJSON());
  if (await page.$('[data-mart-mode="sell"]')) {
    await page.click('[data-mart-mode="sell"]');
    await wait(800);
  }
  const sellRect = await page.evaluate(() => document.querySelector('[data-mart-mode="sell"]')?.getBoundingClientRect().toJSON());
  const buyRectAfter = await page.evaluate(() => document.querySelector('[data-mart-mode="buy"]')?.getBoundingClientRect().toJSON());
  const scrollAfter = await page.evaluate(() => window.scrollY);
  bgs.afterSell = await bgOf();
  await page.screenshot({ path: path.join(dest, "mart-sell.png") });
  if (await page.$('[data-mart-mode="buy"]')) {
    await page.click('[data-mart-mode="buy"]');
    await wait(800);
  }
  bgs.afterBuy = await bgOf();
  await page.screenshot({ path: path.join(dest, "mart-buy.png") });

  const bgValues = Object.values(bgs);
  report.mart.bgs = bgs;
  report.mart.sameBg = bgValues.every((v) => v === bgValues[0]);
  report.mart.tabs = tabLabels;
  report.mart.geometry = {
    scrollDelta: Math.abs(scrollAfter - scrollBefore),
    buyWidthDelta: Math.abs((buyRectAfter?.width || 0) - (buyRectBefore?.width || 0)),
    modeBarStable: Math.abs((buyRectAfter?.top || 0) - (buyRectBefore?.top || 0)) < 40
  };

  // Pass UI copy (signed-out still renders after store load attempt)
  report.passUi = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      americaNewYork: t.includes("America/New_York"),
      eastern: /Eastern Time/.test(t) || /12:00 AM Eastern/.test(t),
      trainerIdError: /Could not save your Trainer ID/.test(t)
    };
  });
  await page.screenshot({ path: path.join(dest, "mart-pass-area.png"), fullPage: true });

  // Mobile mart
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/store.html`, { waitUntil: "networkidle2", timeout: 90000 });
  await wait(2000);
  await page.screenshot({ path: path.join(dest, "mart-mobile.png") });
  report.viewports.mart390 = true;

  // Error mapper unit checks in page
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle2" });
  report.errors = await page.evaluate(() => {
    const samples = [
      { msg: "column reference \"title_id\" is ambiguous", expectNot: null, expect: "Trainer ID" },
      { msg: "column reference \"foo\" is ambiguous", expectNot: "Trainer ID" },
      { msg: "42702", expectNot: "Trainer ID" },
      { msg: "Daily Pass gift is not ready yet.", expectNot: "Trainer ID" }
    ];
    return samples.map((s) => {
      const out = window.playRpcError({ message: s.msg }, "fallback");
      return {
        msg: s.msg,
        out,
        ok: s.expect ? out.includes(s.expect) : !new RegExp(s.expectNot).test(out)
      };
    });
  });

  fs.writeFileSync(path.join(dest, "browser-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  try { child.kill(); } catch (_) {}
  const dexFail = Object.values(report.dex).flat().some((c) => !c.geometryOk || (c.dex === 71 && c.imgNatural < 1));
  const brandFail = Object.values(report.brand.scan || {}).some((r) => r.hasRpg || r.fffd);
  const errFail = (report.errors || []).some((r) => !r.ok);
  if (dexFail || brandFail || !report.mart.sameBg || report.passUi.americaNewYork || errFail) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
