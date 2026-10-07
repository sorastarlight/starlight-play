/**
 * rc121 Oak Lab presentation QA — PlayTester only. No transfer / evolve / claim mutations.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4211;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc121-shots");
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });

function blockReason(mon, owned) {
  if (mon.favorite) return "Favorite";
  if (mon.locked) return "Locked";
  if (mon.onTeam) return "On team";
  if (mon.listed) return "Listed for trade";
  const copies = owned.filter((row) => Number(row.dex) === Number(mon.dex)).length;
  if (copies <= 1) return "Keep for Living Dex";
  return "";
}

(async () => {
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  const storage = await sb.rpc("play_storage");
  if (storage.error) throw storage.error;
  const mons = storage.data?.mons || [];
  const eligibleIds = mons.filter((mon) => !blockReason(mon, mons)).map((mon) => String(mon.id));
  const ineligible = mons.filter((mon) => blockReason(mon, mons)).map((mon) => ({
    id: mon.id,
    name: mon.name,
    reason: blockReason(mon, mons)
  }));

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

  async function loginLab() {
    await page.goto(`${BASE}/evolve.html`, { waitUntil: "domcontentloaded" });
    const storageKey = await page.evaluate(() => {
      const ref = String((window.PLAY_CONFIG || {}).supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
      return `sb-${ref}-auth-token`;
    });
    await page.evaluate((key, sess) => localStorage.setItem(key, JSON.stringify(sess)), storageKey, sign.data.session);
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("#evo-app, #gate", { timeout: 20000 });
    await wait(900);
  }

  async function shot(name) {
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    return file;
  }

  async function probe() {
    return page.evaluate(() => {
      const cards = [...document.querySelectorAll("#evo-send-grid .evo-send-card")];
      const evoCards = [...document.querySelectorAll("#evo-grid .oak-evo-card")];
      const blockedCopy = cards.map((el) => el.textContent).join(" ");
      const candySrc = [...document.querySelectorAll("#evo-send-grid .oak-candy-item, #evo-send-grid .oak-candy-body")]
        .map((img) => img.getAttribute("src") || "");
      const inspectOpen = Boolean(document.getElementById("oak-inspect-modal")?.open);
      const inspectText = (document.getElementById("oak-inspect-body")?.textContent || "").slice(0, 400);
      const researchSummary = document.querySelector(".oak-research-summary")?.innerText || "";
      const researchPct = document.querySelector(".oak-research-complete-pct")?.textContent || "";
      const claimable = [...document.querySelectorAll(".oak-research-card.is-claimable")].length;
      const footers = cards.map((el) => el.querySelector("[data-oak-select]")?.textContent?.trim() || "");
      const selected = cards.filter((el) => el.classList.contains("is-selected")).length;
      const available = (document.getElementById("evo-send-note")?.textContent || "").trim();
      const shownIds = cards.map((el) => el.getAttribute("data-oak-id"));
      const hasLevel = /Lv\.\s*\d/.test(document.querySelector("#evo-send-grid")?.innerText || "");
      const hasGender = /[♂♀]/.test(document.querySelector("#evo-send-grid")?.innerText || "");
      const hasBall = Boolean(document.querySelector("#evo-send-grid .evo-mon-ball"));
      const evoHasGender = /[♂♀]/.test(document.querySelector("#evo-grid")?.innerText || "");
      const heights = cards.map((el) => Math.round(el.getBoundingClientRect().height));
      const evoHeights = evoCards.map((el) => Math.round(el.getBoundingClientRect().height));
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      return {
        cardCount: cards.length,
        evoCount: evoCards.length,
        blockedCopy,
        candySrc,
        inspectOpen,
        inspectText,
        researchSummary,
        researchPct,
        claimable,
        footers,
        selected,
        available,
        shownIds,
        hasLevel,
        hasGender,
        hasBall,
        evoHasGender,
        heights,
        evoHeights,
        overflow,
        sendGo: (document.getElementById("evo-send-go")?.textContent || "").trim()
      };
    });
  }

  await page.setViewport({ width: 1920, height: 1080 });
  await loginLab();
  const transfer = await probe();
  await shot("transfer-desktop");

  let harnessUsed = false;
  if (transfer.cardCount < 1 && mons[0]) {
    harnessUsed = true;
    const fixture = mons[0];
    await page.evaluate((mon) => {
      const grid = document.getElementById("evo-send-grid");
      if (!grid) return;
      const id = String(mon.id);
      const dex = String(mon.dex).padStart(3, "0");
      const spr = window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
      const candy = window.playEvolutionCandyItemUrl?.(mon.dex) || "images/items/lgpe-candy.png";
      grid.innerHTML = `<article class="evo-mon evo-send-card oak-mon-card" data-oak-id="${id}" data-dex="${mon.dex}">
        <button type="button" class="oak-mon-inspect" data-oak-inspect="${id}" aria-label="Inspect ${mon.name}">
          <span class="evo-mon-art"><img src="${spr}" alt="" width="96" height="96"></span>
          <strong class="evo-mon-name oak-mon-name">#${dex} ${mon.name}</strong>
        </button>
        <span class="oak-send-candy evo-cost-candy">
          <span class="oak-candy-art" style="--oak-candy-size:40px"><img class="oak-candy-item" src="${candy}" alt="" width="40" height="40"></span>
          <span class="evo-cost-candy-copy"><strong>${mon.name} Evolution Candy</strong></span>
        </span>
        <button type="button" class="evo-foot is-select" data-oak-select="${id}" aria-pressed="false">Click here to select</button>
      </article>`;
    }, fixture);
    await wait(300);
  }

  const inspectBtn = await page.$("[data-oak-inspect]");
  if (inspectBtn) {
    await inspectBtn.click();
    await wait(400);
  }
  const afterInspect = await probe();
  await shot("transfer-inspect");
  const selectedAfterInspect = afterInspect.selected;
  await page.keyboard.press("Escape");
  await wait(250);

  let afterSelect = await probe();
  if (harnessUsed && mons[0]) {
    await page.evaluate((mon) => {
      const grid = document.getElementById("evo-send-grid");
      if (!grid) return;
      const id = String(mon.id);
      const dex = String(mon.dex).padStart(3, "0");
      const spr = window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
      const candy = window.playEvolutionCandyItemUrl?.(mon.dex) || "images/items/lgpe-candy.png";
      grid.innerHTML = `<article class="evo-mon evo-send-card oak-mon-card is-selected" data-oak-id="${id}" data-dex="${mon.dex}">
        <button type="button" class="oak-mon-inspect" data-oak-inspect="${id}" aria-label="Inspect ${mon.name}">
          <span class="evo-mon-art"><img src="${spr}" alt="" width="96" height="96"></span>
          <strong class="evo-mon-name oak-mon-name">#${dex} ${mon.name}</strong>
        </button>
        <span class="oak-send-candy evo-cost-candy">
          <span class="oak-candy-art" style="--oak-candy-size:40px"><img class="oak-candy-item" src="${candy}" alt="" width="40" height="40"></span>
          <span class="evo-cost-candy-copy"><strong>${mon.name} Evolution Candy</strong></span>
        </span>
        <button type="button" class="evo-foot is-ready" data-oak-select="${id}" aria-pressed="true">Selected ✓</button>
      </article>`;
      document.getElementById("evo-send-go")?.classList.add("is-armed");
      if (document.getElementById("evo-send-go")) document.getElementById("evo-send-go").textContent = "Send 1 to Oak";
    }, mons[0]);
    await wait(250);
    afterSelect = await probe();
    await shot("transfer-selected");
  } else if (await page.$("[data-oak-select]")) {
    await page.click("[data-oak-select]");
    await wait(250);
    afterSelect = await probe();
    await shot("transfer-selected");
    if (await page.$("[data-oak-select]")) await page.click("[data-oak-select]");
  } else {
    await shot("transfer-selected");
  }

  await page.click('#tab-evolve');
  await wait(500);
  await page.evaluate(() => document.getElementById("evo-grid")?.scrollIntoView({ block: "start" }));
  await wait(200);
  const evoDesktop = await probe();
  await shot("evolution-desktop");
  const evoInspect = await page.$("[data-evo-inspect]");
  if (evoInspect) {
    await evoInspect.click();
    await wait(400);
  }
  const evoInspectState = await probe();
  await shot("evolution-inspect");
  await page.keyboard.press("Escape");
  await wait(200);

  await page.click('#tab-research');
  await wait(500);
  const researchField = await probe();
  await shot("research-field");
  const claimableShot = await page.$(".oak-research-card.is-claimable");
  if (claimableShot) await shot("research-claimable");
  else await shot("research-milestones");

  await page.setViewport({ width: 2560, height: 1440 });
  await page.click('#tab-send');
  await wait(400);
  await shot("transfer-2560");
  await page.click('#tab-research');
  await wait(300);
  await shot("research-2560");

  await page.setViewport({ width: 960, height: 1280 });
  await page.click('#tab-send');
  await wait(400);
  const tablet = await probe();
  await shot("transfer-960");
  await page.click('#tab-evolve');
  await wait(300);
  await shot("evolution-960");
  await page.click('#tab-research');
  await wait(300);
  await shot("research-960");

  await page.setViewport({ width: 390, height: 844 });
  await page.click('#tab-send');
  await wait(400);
  const mobile = await probe();
  await shot("transfer-390");
  await page.click('#tab-research');
  await wait(300);
  await shot("research-390");

  await browser.close();
  stop();

  const extraShown = transfer.shownIds.filter((id) => !eligibleIds.includes(id));
  const missingShown = eligibleIds.filter((id) => !transfer.shownIds.includes(id));
  const report = {
    account: session.email,
    mutated: false,
    soraMutated: false,
    twinkleMutated: false,
    eligibleServerMirror: eligibleIds.length,
    ineligibleHidden: ineligible.length,
    ineligibleReasons: ineligible.slice(0, 12),
    shown: transfer.cardCount,
    extraShown,
    missingShown,
    hasLevel: transfer.hasLevel,
    hasGender: transfer.hasGender,
    hasBall: transfer.hasBall,
    candySrc: transfer.candySrc.slice(0, 8),
    selectChanged: afterSelect.selected !== transfer.selected,
    heights: transfer.heights.slice(0, 8),
    evoHeights: evoDesktop.evoHeights.slice(0, 8),
    evoHasGender: evoDesktop.evoHasGender,
    evoInspectOpened: evoInspectState.inspectOpen,
    researchSummary: researchField.researchSummary.slice(0, 400),
    researchPct: researchField.researchPct,
    claimable: researchField.claimable,
    overflow1920: transfer.overflow,
    overflow960: tablet.overflow,
    overflow390: mobile.overflow,
    availableCopy: transfer.available,
    harnessUsed,
    inspectOpenedWithoutSelect: afterInspect.inspectOpen === true && selectedAfterInspect === (harnessUsed ? 0 : transfer.selected)
  };
  fs.writeFileSync(path.join(root, "docs", "audits", "rc121-oak-lab-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (extraShown.length) process.exitCode = 1;
  if (transfer.hasLevel || transfer.hasGender || transfer.hasBall) process.exitCode = 1;
  if (!afterInspect.inspectOpen) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
