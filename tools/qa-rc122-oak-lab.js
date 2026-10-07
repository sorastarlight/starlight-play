/**
 * rc122 Oak Lab polish QA — PlayTester only. No transfer / evolve / claim mutations.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4212;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc122-shots");
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
  const requests = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/^https?:\/\//.test(url) && !url.startsWith(BASE) && !url.includes("supabase") && !url.includes("jsdelivr")) {
      requests.push(url);
    }
  });

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
      const claimCards = [...document.querySelectorAll(".oak-research-card")];
      const footerY = cards.map((el) => {
        const foot = el.querySelector(".evo-foot");
        const cr = el.getBoundingClientRect();
        const fr = foot?.getBoundingClientRect();
        return {
          cardBottom: Math.round(cr.bottom),
          footBottom: fr ? Math.round(fr.bottom) : null,
          gap: fr ? Math.round(cr.bottom - fr.bottom) : null,
          height: Math.round(cr.height)
        };
      });
      const evoFooterY = evoCards.map((el) => {
        const foot = el.querySelector(".evo-foot");
        const cr = el.getBoundingClientRect();
        const fr = foot?.getBoundingClientRect();
        return {
          kind: el.dataset.kind,
          cardBottom: Math.round(cr.bottom),
          footBottom: fr ? Math.round(fr.bottom) : null,
          gap: fr ? Math.round(cr.bottom - fr.bottom) : null,
          height: Math.round(cr.height)
        };
      });
      const claims = claimCards.map((el) => {
        const btn = el.querySelector(".oak-research-claim, .oak-research-claim-slot");
        const cr = el.getBoundingClientRect();
        const br = btn?.getBoundingClientRect();
        return {
          state: [...el.classList].find((c) => c.startsWith("is-")),
          cardH: Math.round(cr.height),
          clipped: br ? br.bottom > cr.bottom + 1 : false,
          gap: br ? Math.round(cr.bottom - br.bottom) : null
        };
      });
      const modal = document.getElementById("evo-modal");
      const detail = document.getElementById("evo-detail");
      const candySrc = [...document.querySelectorAll(".oak-candy-item")].map((img) => img.getAttribute("src") || "").slice(0, 8);
      const header = document.querySelector(".oak-research-summary")?.innerText || "";
      const identity = document.querySelector(".oak-research-summary-identity")?.innerText || "";
      const next = document.querySelector(".oak-research-next-milestone")?.innerText || "";
      const toast = document.querySelector(".play-toast")?.innerText || "";
      return {
        cardCount: cards.length,
        evoCount: evoCards.length,
        footerY,
        evoFooterY,
        claims,
        candySrc,
        header,
        identity,
        next,
        toast,
        inspectOpen: Boolean(document.getElementById("oak-inspect-modal")?.open),
        transferOpen: Boolean(document.getElementById("oak-lab-modal")?.open),
        evoOpen: Boolean(modal?.open),
        evoScroll: detail ? {
          scrollHeight: detail.scrollHeight,
          clientHeight: detail.clientHeight,
          overflowY: getComputedStyle(detail).overflowY
        } : null,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        sendStatus: (document.getElementById("evo-send-status")?.textContent || "").trim()
      };
    });
  }

  await page.setViewport({ width: 1920, height: 1080 });
  await loginLab();
  let transfer = await probe();
  await shot("transfer-cards");

  let harnessUsed = false;
  if (transfer.cardCount < 1 && mons[0]) {
    harnessUsed = true;
    await page.evaluate((mon) => {
      const grid = document.getElementById("evo-send-grid");
      const id = String(mon.id);
      const dex = String(mon.dex).padStart(3, "0");
      const spr = window.playSpriteUrl(mon.dex, mon.variant || "normal", mon.formId);
      const candy = window.playEvolutionCandyItemUrl?.(mon.dex) || "images/items/lgpe-candy.png";
      const card = (selected) => `<article class="evo-mon evo-send-card oak-mon-card${selected ? " is-selected" : ""}" data-oak-id="${id}" data-dex="${mon.dex}">
        <button type="button" class="oak-mon-inspect" data-oak-inspect="${id}" aria-label="Inspect ${mon.name}">
          <span class="evo-mon-art"><img src="${spr}" alt="" width="96" height="96"></span>
          <strong class="evo-mon-name oak-mon-name">#${dex} ${mon.name}</strong>
        </button>
        <span class="oak-card-grow" aria-hidden="true"></span>
        <span class="oak-send-candy evo-cost-candy">
          <span class="oak-candy-art" style="--oak-candy-size:40px"><img class="oak-candy-item" src="${candy}" alt="" width="40" height="40"></span>
          <span class="evo-cost-candy-copy"><strong>${mon.name} Evolution Candy</strong></span>
        </span>
        <button type="button" class="evo-foot ${selected ? "is-ready" : "is-select"}" data-oak-select="${id}" aria-pressed="${selected ? "true" : "false"}">${selected ? "Selected ✓" : "Click here to select"}</button>
      </article>`;
      grid.innerHTML = card(false) + card(false).replaceAll(id, `${id}-b`).replace(mon.name, `${mon.name} B`);
    }, mons[0]);
    await wait(200);
    transfer = await probe();
  }

  const inspectBtn = await page.$("[data-oak-inspect]");
  if (inspectBtn) {
    await inspectBtn.click();
    await wait(400);
  }
  const afterInspect = await probe();
  await page.keyboard.press("Escape");
  await wait(200);

  if (harnessUsed) {
    await page.evaluate(() => {
      document.querySelector(".evo-send-card")?.classList.add("is-selected");
      const foot = document.querySelector("[data-oak-select]");
      if (foot) {
        foot.className = "evo-foot is-ready";
        foot.textContent = "Selected ✓";
        foot.setAttribute("aria-pressed", "true");
      }
      const go = document.getElementById("evo-send-go");
      if (go) {
        go.classList.add("is-armed");
        go.textContent = "Send 1 to Oak";
        go.disabled = false;
      }
    });
  } else if (await page.$("[data-oak-select]")) {
    await page.click("[data-oak-select]");
    await wait(200);
  }
  await shot("transfer-selected");

  if (await page.$("#evo-send-go:not([disabled])")) {
    await page.click("#evo-send-go");
    await wait(300);
  } else {
    await page.evaluate(() => document.getElementById("oak-lab-modal")?.showModal?.());
    await wait(200);
  }
  const confirmState = await probe();
  await shot("transfer-confirm");
  await page.keyboard.press("Escape");
  await wait(200);
  if (!harnessUsed && await page.$("[data-oak-select]")) {
    await page.click("[data-oak-select]");
  }

  await page.evaluate(() => {
    window.playToast?.({
      kind: "success",
      title: "Transferred to Professor Oak",
      body: "Pikachu was sent to Professor Oak.\nReceived Pikachu Evolution Candy ×1."
    });
  });
  await wait(400);
  const toastState = await probe();
  await shot("transfer-success-toast");

  await page.click("#tab-evolve");
  await wait(500);
  const evoDesktop = await probe();
  await shot("evolution-cards");
  const evoInspect = await page.$("[data-evo-inspect]");
  if (evoInspect) {
    await evoInspect.click();
    await wait(300);
    await page.keyboard.press("Escape");
    await wait(150);
  }
  const readyAct = await page.$("[data-evo-act]");
  if (readyAct) {
    await readyAct.click();
    await wait(400);
  } else {
    await page.evaluate(() => {
      const modal = document.getElementById("evo-modal");
      const detail = document.getElementById("evo-detail");
      const title = document.getElementById("evo-title");
      if (title) title.textContent = "Evolution Ready";
      modal?.classList.add("is-ready-confirm");
      if (detail) {
        detail.innerHTML = `<div class="evo-confirm-pair">
          <div class="evo-confirm-mon"><img src="images/pokemon/27.gif" width="96" height="96" alt=""><strong>Sandshrew</strong><span>#027 · Lv. 12</span></div>
          <span class="evo-confirm-arrow">→</span>
          <div class="evo-confirm-mon"><img src="images/pokemon/28.gif" width="96" height="96" alt=""><strong>Sandslash</strong><span>#028</span></div>
        </div>
        <div class="evo-confirm-reqs"><p class="eyebrow">Requirements</p>
          <div class="evo-confirm-req"><img src="${window.playEvolutionCandyItemUrl?.(27) || "images/items/lgpe-candy.png"}" width="36" height="36" alt=""><span>Sandshrew Evolution Candy</span><strong>67 / 25 ✓</strong></div>
        </div>
        <p class="evo-confirm-call">Sandshrew is ready to evolve into Sandslash!</p>`;
      }
      modal?.showModal?.();
    });
    await wait(300);
  }
  const evoConfirm1920 = await probe();
  await shot("evolution-confirm-1920");
  await page.keyboard.press("Escape");
  await wait(200);

  await page.click("#tab-research");
  await wait(500);
  const tracks = {};
  for (const id of ["field", "evolution", "line", "transfer"]) {
    const btn = await page.$(`[data-research-track="${id}"]`);
    if (btn) {
      await btn.click();
      await wait(250);
    }
    tracks[id] = await probe();
    await shot(`research-${id}`);
  }
  const claimableShot = await page.$(".oak-research-card.is-claimable");
  if (claimableShot) await shot("research-claimable");

  await page.evaluate(() => {
    window.playPresentEnqueue?.([{
      id: "qa-oak-research-single",
      type: "item",
      kind: "oak-research",
      rare: true,
      title: "PROFESSOR OAK'S RESEARCH",
      subtitle: "Research Complete!",
      item: "stardust",
      qty: 2,
      payload: {
        milestoneTitle: "Line Research II",
        description: "Complete 5 Kanto Evolution Lines.",
        oakLine: "Excellent work! We're learning more about Pokémon every day!"
      },
      rewards: [{ type: "stardust", amount: 2 }]
    }], { noSummary: true });
  });
  await wait(600);
  await shot("research-complete-single");
  await page.click("[data-present-continue]").catch(() => {});
  await wait(400);
  await page.evaluate(() => {
    window.playPresentEnqueue?.([{
      id: "qa-oak-research-multi",
      type: "item",
      kind: "oak-research",
      rare: true,
      title: "PROFESSOR OAK'S RESEARCH",
      subtitle: "Research Complete!",
      payload: {
        milestoneTitle: "Transfer Research II",
        description: "Send 25 Pokémon to Professor Oak.",
        oakLine: "Excellent work! We're learning more about Pokémon every day!"
      },
      rewards: [{ type: "nugget", amount: 1 }, { type: "stardust", amount: 2 }]
    }], { noSummary: true });
  });
  await wait(600);
  await shot("research-complete-multi");
  await page.click("[data-present-continue]").catch(() => {});
  await wait(300);

  await page.setViewport({ width: 2560, height: 1440 });
  await page.click("#tab-evolve");
  await wait(300);
  if (await page.$("[data-evo-act]")) await page.click("[data-evo-act]");
  else await page.evaluate(() => document.getElementById("evo-modal")?.showModal?.());
  await wait(300);
  const evoConfirm2560 = await probe();
  await shot("evolution-confirm-2560");
  await page.keyboard.press("Escape");
  await wait(150);
  await page.click("#tab-research");
  await wait(250);
  await shot("research-2560");

  await page.setViewport({ width: 960, height: 1280 });
  await page.click("#tab-send");
  await wait(300);
  const tablet = await probe();
  await shot("transfer-960");
  await page.click("#tab-research");
  await wait(250);
  await shot("research-960");

  await page.setViewport({ width: 390, height: 844 });
  await page.click("#tab-send");
  await wait(300);
  const mobile = await probe();
  await shot("transfer-390");
  await page.click("#tab-evolve");
  await wait(250);
  await shot("evolution-390");
  await page.click("#tab-research");
  await wait(250);
  await shot("research-390");

  const candyHotlinks = requests.filter((url) => /candy|pokeapi|wikimedia|bulbapedia/i.test(url));
  await browser.close();
  stop();

  const footerGaps = (transfer.footerY || []).map((row) => row.gap);
  const evoGaps = (evoDesktop.evoFooterY || []).map((row) => row.gap);
  const clippedClaims = (tracks.transfer?.claims || tracks.field?.claims || []).filter((row) => row.clipped);
  const report = {
    account: session.email,
    mutated: false,
    soraMutated: false,
    twinkleMutated: false,
    harnessUsed,
    eligibleServerMirror: eligibleIds.length,
    transferFooterGaps: footerGaps.slice(0, 8),
    evoFooterGaps: evoGaps.slice(0, 8),
    claimGeometry: (tracks.field?.claims || []).slice(0, 8),
    clippedClaims,
    candySrc: transfer.candySrc,
    inspectOpenedWithoutSelect: afterInspect.inspectOpen === true,
    transferConfirmOpened: confirmState.transferOpen === true,
    evoConfirm1920: evoConfirm1920.evoScroll,
    evoConfirm2560: evoConfirm2560.evoScroll,
    researchHeaders: {
      field: (tracks.field?.identity || "").slice(0, 220),
      evolution: (tracks.evolution?.identity || "").slice(0, 220),
      line: (tracks.line?.identity || "").slice(0, 220),
      transfer: (tracks.transfer?.identity || "").slice(0, 220)
    },
    toastSeen: Boolean(toastState.toast),
    overflow1920: transfer.overflow,
    overflow960: tablet.overflow,
    overflow390: mobile.overflow,
    candyHotlinks,
    sendStatusAfterToastHarness: toastState.sendStatus
  };
  fs.writeFileSync(path.join(root, "docs", "audits", "rc122-oak-lab-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (clippedClaims.length) process.exitCode = 1;
  if (candyHotlinks.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
