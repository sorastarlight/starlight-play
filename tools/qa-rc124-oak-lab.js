/**
 * rc124 Oak Lab visual repair QA — PlayTester only, non-mutating.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4215;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc124-shots");
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
  const collection = await sb.rpc("play_collection");
  if (collection.error) throw collection.error;
  const ready = collection.data?.ready || [];

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
  await wait(900);

  async function shot(name) {
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
  }

  function cardHtml(mon, selected) {
    return page.evaluate((row, isOn) => {
      const dex = String(row.dex).padStart(3, "0");
      const shiny = String(row.variant || "").includes("shiny");
      const spr = window.playSpriteUrl(row.dex, row.variant || "normal", row.formId);
      const candy = window.playEvolutionCandyItemUrl(row.dex);
      const label = window.playEvolutionCandyLabel(row.dex, "");
      return `<article class="evo-mon evo-send-card oak-mon-card${isOn ? " is-selected" : ""}" data-oak-id="${row.id}" data-dex="${row.dex}">
        <button type="button" class="oak-mon-inspect" data-oak-inspect="${row.id}" aria-label="Inspect ${row.name}">
          <span class="evo-mon-art"><img class="oak-sprite" src="${spr}" alt="" width="96" height="96" style="width:96px;height:96px"></span>
          <strong class="evo-mon-name oak-mon-name">#${dex} ${shiny ? "✨ " : ""}${row.name}</strong>
        </button>
        <div class="oak-card-context">
          <span class="oak-candy-block">
            <span class="oak-candy-art" style="--oak-candy-size:40px"><img class="oak-candy-item" src="${candy}" alt="" width="40" height="40"></span>
            <strong class="oak-candy-label">${label}</strong>
          </span>
        </div>
        <button type="button" class="evo-foot ${isOn ? "is-ready" : "is-select"}" data-oak-select="${row.id}">${isOn ? "Selected ✓" : "Select Pokémon"}</button>
      </article>`;
    }, mon, selected);
  }

  const samples = [
    { id: "qa-25", dex: 25, name: "Pikachu", variant: "normal" },
    { id: "qa-27a", dex: 27, name: "Sandshrew", variant: "normal" },
    { id: "qa-27b", dex: 27, name: "Sandshrew", variant: "shiny" },
    { id: "qa-113", dex: 113, name: "Chansey", variant: "normal" }
  ];
  const html = [];
  for (const mon of samples) html.push(await cardHtml(mon, mon.id === "qa-25"));
  await page.evaluate((markup) => {
    const grid = document.getElementById("evo-send-grid");
    if (grid) grid.innerHTML = markup;
  }, html.join(""));
  await wait(400);
  await shot("transfer-1920");
  const pika = await page.$('[data-dex="25"]');
  if (pika) await pika.screenshot({ path: path.join(outDir, "transfer-pikachu.png") });
  const sands = await page.$$('[data-dex="27"]');
  if (sands[0]) await sands[0].screenshot({ path: path.join(outDir, "transfer-sandshrew.png") });
  if (sands[1]) await sands[1].screenshot({ path: path.join(outDir, "transfer-sandshrew-shiny.png") });
  const chansey = await page.$('[data-dex="113"]');
  if (chansey) await chansey.screenshot({ path: path.join(outDir, "transfer-chansey.png") });

  const transferProbe = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#evo-send-grid .oak-mon-card")];
    return cards.map((el) => {
      const img = el.querySelector(".evo-mon-art img");
      const candy = el.querySelector(".oak-candy-item, .oak-candy-body");
      const cr = el.getBoundingClientRect();
      const foot = el.querySelector(".evo-foot")?.getBoundingClientRect();
      return {
        dex: el.dataset.dex,
        h: Math.round(cr.height),
        footGap: foot ? Math.round(cr.bottom - foot.bottom) : null,
        footText: el.querySelector(".evo-foot")?.innerText.trim(),
        candySrc: candy?.getAttribute("src") || "",
        candyLabel: el.querySelector(".oak-candy-label")?.innerText.trim() || "",
        overlay: Boolean(el.querySelector(".oak-candy-mascot, .is-composite")),
        spriteSrc: img?.getAttribute("src") || "",
        spriteDisplay: img ? { w: img.clientWidth, h: img.clientHeight, nw: img.naturalWidth, nh: img.naturalHeight } : null,
        line: /Evolution Line Evolution Candy/i.test(el.innerText)
      };
    });
  });

  await page.click("#tab-evolve");
  await wait(500);
  await page.evaluate(() => document.querySelector("#evo-grid")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("evolution-1920");
  const firstEvo = await page.$("#evo-grid .oak-evo-card");
  if (firstEvo) await firstEvo.screenshot({ path: path.join(outDir, "evo-card-closeup.png") });

  const evoProbe = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#evo-grid .oak-evo-card")];
    return {
      counts: Object.fromEntries([...document.querySelectorAll("#evo-filters [data-count]")].map((el) => [el.dataset.count, el.textContent.trim()])),
      overlay: Boolean(document.querySelector("#evo-grid .oak-candy-mascot, #evo-grid .is-composite")),
      cards: cards.map((el) => {
        const cr = el.getBoundingClientRect();
        const foot = el.querySelector(".evo-foot")?.getBoundingClientRect();
        const art = el.querySelector(".evo-mon-art img");
        const target = el.querySelector(".oak-evo-target-art img");
        return {
          dex: el.dataset.dex,
          kind: el.dataset.kind,
          h: Math.round(cr.height),
          footGap: foot ? Math.round(cr.bottom - foot.bottom) : null,
          footText: el.querySelector(".evo-foot")?.innerText.trim(),
          text: el.innerText.replace(/\s+/g, " ").trim(),
          sprite: art ? { src: art.getAttribute("src"), w: art.clientWidth, h: art.clientHeight, nw: art.naturalWidth, nh: art.naturalHeight } : null,
          target: target ? { w: target.clientWidth, h: target.clientHeight } : null,
          candySrc: el.querySelector(".oak-candy-item")?.getAttribute("src") || ""
        };
      })
    };
  });

  if (await page.$("[data-evo-inspect]")) {
    await page.click("[data-evo-inspect]");
    await wait(300);
    await shot("inspect-1920");
    await page.keyboard.press("Escape");
  }

  await page.setViewport({ width: 960, height: 900 });
  await wait(200);
  await shot("evolution-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(200);
  await shot("evolution-390");

  await browser.close();
  stop();
  const report = {
    qaAccount: session.email,
    soraMutated: "NO",
    twinkleMutated: "NO",
    mutations: "none",
    rpcReady: ready.length,
    transferProbe,
    evoProbe
  };
  fs.writeFileSync(path.join(outDir, "qa-rc124.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
