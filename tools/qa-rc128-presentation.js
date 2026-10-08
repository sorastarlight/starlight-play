/**
 * RC128 presentation QA — PlayTester only, non-mutating.
 * REAL DOM + LIVE RPC (read-only). Transfer grid may be injected when
 * PlayTester has 0 sendable Pokémon (LOCAL HARNESS for that shot).
 * Confirm dialogs are opened then cancelled. No evolve/transfer/claim RPCs.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4218;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc128-shots");
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });

const expectedNav = [
  "Play", "My PC", "My Pokédex", "My Inventory", "My Trainer ID", "My Achievements",
  "Prof. Oak's Lab", "Rankings", "GTS", "Events", "How to Play", "Mart"
];

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
  function navProbe() {
    return page.evaluate((expected) => {
      const links = [...document.querySelectorAll("#topnav-links a[data-nav]")];
      const labels = links.map((a) => a.textContent.trim());
      return {
        labels,
        hrefs: links.map((a) => a.getAttribute("href")),
        last: labels[labels.length - 1] || "",
        orderOk: expected.every((label, i) => labels[i] === label),
        hamburger: getComputedStyle(document.querySelector(".nav-toggle")).display !== "none",
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        storeClass: Boolean(document.querySelector(".topnav-link-store"))
      };
    }, expectedNav);
  }

  await open("index.html", 2560, 1440);
  await shot("nav-2560");
  const nav2560 = await navProbe();

  await page.setViewport({ width: 1920, height: 1080 });
  await wait(250);
  await shot("nav-1920");
  const nav1920 = await navProbe();

  await page.setViewport({ width: 1440, height: 900 });
  await wait(250);
  await shot("nav-1440");
  const nav1440 = await navProbe();

  await page.setViewport({ width: 960, height: 1080 });
  await wait(250);
  await shot("nav-960");
  await page.click(".nav-toggle");
  await wait(300);
  await shot("nav-960-open");
  const nav960 = await navProbe();
  await page.click(".nav-toggle");
  await wait(200);

  await page.setViewport({ width: 390, height: 844 });
  await wait(250);
  await shot("nav-390");
  await page.click(".nav-toggle");
  await wait(300);
  await shot("nav-390-open");
  const nav390 = await navProbe();

  await open("evolve.html#evolution", 1920);
  await page.waitForSelector("#evo-app", { timeout: 25000 });
  await wait(500);
  await shot("evolution-1920");
  const evoProbe = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#evo-grid .oak-evo-card")];
    return {
      familyList: Boolean(document.getElementById("family-list")),
      linesTitle: Boolean(document.getElementById("evo-lines-title")),
      linesHeading: [...document.querySelectorAll("h2")].some((h) => h.textContent.trim() === "Evolution Lines"),
      grid: Boolean(document.getElementById("evo-grid")),
      count: cards.length,
      candy: cards.filter((el) => el.querySelector(".oak-evo-candy, .oak-candy-item, .oak-candy-art")).length,
      filters: [...document.querySelectorAll("#evo-filters [data-filter]")].map((b) => b.dataset.filter),
      search: Boolean(document.getElementById("evo-search")),
      sort: Boolean(document.getElementById("evo-sort"))
    };
  });
  await page.setViewport({ width: 960, height: 1080 });
  await wait(300);
  await shot("evolution-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await shot("evolution-390");

  const readyBtn = await page.$("#evo-grid .oak-evo-card .evo-foot.is-ready, #evo-grid .oak-evo-card [data-evo-act]");
  let confirmOpened = false;
  if (readyBtn) {
    await readyBtn.click();
    await wait(400);
    confirmOpened = await page.evaluate(() => {
      const modal = document.getElementById("evo-modal");
      return Boolean(modal && (modal.open || modal.hasAttribute("open")));
    });
    if (confirmOpened) {
      await shot("evolution-confirm");
      await page.click("#evo-cancel");
      await wait(200);
    }
  }

  await open("evolve.html#transfer", 1920);
  await page.waitForSelector("#evo-app", { timeout: 25000 });
  await wait(500);
  await page.evaluate(() => document.querySelector(".evo-send-action")?.scrollIntoView({ block: "center" }));
  await wait(200);
  const transferIdle = await page.evaluate(() => ({
    note: (document.getElementById("evo-send-note")?.textContent || "").trim(),
    go: (document.getElementById("evo-send-go-label")?.textContent || document.getElementById("evo-send-go")?.textContent || "").trim(),
    disabled: Boolean(document.getElementById("evo-send-go")?.disabled),
    ball: Boolean(document.querySelector("#evo-send-go img")),
    searchSortRow: Boolean(document.querySelector(".evo-send-toolbar")),
    action: Boolean(document.querySelector(".evo-send-action")),
    goInToolbar: Boolean(document.querySelector(".evo-send-toolbar #evo-send-go"))
  }));
  await shot("transfer-1920");
  let transferHarness = false;
  const transferCount = await page.evaluate(() => document.querySelectorAll("#evo-send-grid .oak-mon-card").length);
  if (transferCount < 1) {
    transferHarness = true;
    await page.evaluate(() => {
      const go = document.getElementById("evo-send-go");
      const label = document.getElementById("evo-send-go-label");
      if (label) label.textContent = "Send 2 Pokémon to Oak";
      if (go) {
        go.disabled = false;
        go.classList.add("is-armed");
        go.setAttribute("aria-label", "Send 2 Pokémon to Oak");
      }
    });
  } else {
    const selectBtn = await page.$("[data-oak-select]");
    if (selectBtn) {
      await selectBtn.click();
      await wait(250);
    }
  }
  const transferSelected = await page.evaluate(() => ({
    go: (document.getElementById("evo-send-go-label")?.textContent || document.getElementById("evo-send-go")?.textContent || "").trim(),
    disabled: Boolean(document.getElementById("evo-send-go")?.disabled),
    armed: document.getElementById("evo-send-go")?.classList.contains("is-armed")
  }));
  await shot("transfer-selected-1920");
  if (!transferHarness && !transferSelected.disabled) {
    await page.click("#evo-send-go");
    await wait(400);
    const oakOpen = await page.evaluate(() => {
      const modal = document.getElementById("oak-lab-modal");
      return Boolean(modal && (modal.open || modal.hasAttribute("open")));
    });
    if (oakOpen) {
      await shot("transfer-confirm");
      await page.evaluate(() => document.getElementById("oak-lab-modal")?.close("cancel"));
      await wait(200);
    }
  }
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await page.evaluate(() => document.querySelector(".evo-send-action")?.scrollIntoView({ block: "center" }));
  await wait(200);
  await shot("transfer-390");

  await open("evolve.html#research/field", 1920);
  await page.waitForSelector("#oak-research-board", { timeout: 25000 });
  await wait(700);
  await shot("research-field-1920");
  const researchProbe = await page.evaluate(() => {
    const notes = document.querySelector("#oak-research-board details.oak-research-notes");
    const tracks = [...document.querySelectorAll("[data-research-track]")].map((b) => ({
      id: b.dataset.researchTrack,
      label: b.querySelector("strong")?.textContent.trim()
    }));
    return {
      disconnectedStrip: Boolean(document.querySelector("#evo-tab-research > details.evo-research-notes")),
      overview: Boolean(document.querySelector(".oak-research-overview")),
      notes: Boolean(notes),
      notesOpen: Boolean(notes?.open),
      hint: (notes?.querySelector(".oak-research-notes-hint")?.textContent || "").trim(),
      title: (document.getElementById("oak-active-track-title")?.textContent || "").trim(),
      next: (document.querySelector(".oak-research-next-label")?.textContent || "").trim(),
      cards: [...document.querySelectorAll(".oak-research-card .oak-research-status")].map((el) => el.textContent.trim()),
      tracks
    };
  });
  if (researchProbe.notes) {
    await page.click("#oak-research-board details.oak-research-notes summary");
    await wait(250);
    await shot("research-notes-open");
    await page.click("#oak-research-board details.oak-research-notes summary");
    await wait(200);
  }
  for (const track of ["evolution", "line", "transfer", "history"]) {
    const btn = await page.$(`[data-research-track="${track}"]`);
    if (btn) {
      await btn.click();
      await wait(400);
      await shot(`research-${track}-1920`);
    }
  }
  const fieldBtn = await page.$('[data-research-track="field"]');
  if (fieldBtn) {
    await fieldBtn.click();
    await wait(400);
  }
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await page.evaluate(() => document.querySelector(".oak-research-overview")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("research-390");

  await open("achievements.html", 1920);
  await page.waitForSelector("#prog-app", { timeout: 25000 });
  await wait(700);
  await shot("achievements-1920");
  const achProbe = await page.evaluate(() => {
    const cats = document.getElementById("ach-cats");
    const options = cats ? [...cats.options].map((o) => ({ value: o.value, label: o.textContent.trim() })) : [];
    return {
      title: (document.querySelector(".ach-hub-toolbar-status .ach-hub-section-title")?.textContent || "").trim(),
      states: [...document.querySelectorAll("[data-ach-state]")].map((b) => b.textContent.trim()),
      catTag: cats ? cats.tagName : "",
      options,
      search: Boolean(document.getElementById("ach-search")),
      sort: Boolean(document.getElementById("ach-sort")),
      pills: document.querySelectorAll(".ach-hub-cats .ach-hub-chip").length
    };
  });
  await page.select("#ach-cats", achProbe.options.find((o) => o.value !== "all")?.value || "all");
  await wait(250);
  await page.click('[data-ach-state="progress"]');
  await wait(250);
  await shot("achievements-filtered-1920");
  await page.setViewport({ width: 960, height: 1080 });
  await wait(300);
  await page.evaluate(() => document.querySelector(".ach-hub-toolbar")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("achievements-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await page.evaluate(() => document.querySelector(".ach-hub-toolbar")?.scrollIntoView({ block: "start" }));
  await wait(200);
  await shot("achievements-390");

  const report = {
    qaAccount: session.email,
    soraMutated: false,
    twinkleMutated: false,
    mutations: [],
    cleanup: "none — read-only / cancelled confirms / optional local transfer harness",
    nav2560,
    nav1920,
    nav1440,
    nav960,
    nav390,
    evoProbe,
    confirmOpened,
    transferHarness,
    transferIdle,
    transferSelected,
    researchProbe,
    achProbe
  };
  fs.writeFileSync(path.join(outDir, "qa-rc128.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
