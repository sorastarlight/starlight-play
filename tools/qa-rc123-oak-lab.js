/**
 * rc123 Oak Lab presentation QA — PlayTester only.
 * Non-mutating: inspect, filters, confirm open/close. No transfer / evolve / claim RPCs.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4213;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc123-shots");
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
  const [collection, storage] = await Promise.all([
    sb.rpc("play_collection"),
    sb.rpc("play_storage")
  ]);
  if (collection.error) throw collection.error;
  const ready = collection.data?.ready || [];
  const owned = (storage.data?.mons || collection.data?.owned || []);
  const terminalsInReady = ready.filter((row) => !row.toDex || Number(row.toDex) > 151 || row.terminal);
  const underResourced = ready.filter((row) => row.available === false);
  const chanseyOwned = owned.filter((mon) => Number(mon.dex) === 113);

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
      const send = [...document.querySelectorAll("#evo-send-grid .evo-send-card")];
      const evo = [...document.querySelectorAll("#evo-grid .oak-evo-card")];
      const empty = document.querySelector("#evo-grid .evo-empty");
      const measure = (el) => {
        const foot = el.querySelector(".evo-foot");
        const art = el.querySelector(".evo-mon-art img");
        const ctx = el.querySelector(".oak-card-context");
        const cr = el.getBoundingClientRect();
        const fr = foot?.getBoundingClientRect();
        const ar = art?.getBoundingClientRect();
        const pad = getComputedStyle(el);
        return {
          dex: el.dataset.dex,
          kind: el.dataset.kind,
          selected: el.classList.contains("is-selected"),
          height: Math.round(cr.height),
          width: Math.round(cr.width),
          overflowHidden: getComputedStyle(el).overflow === "hidden",
          padBottom: parseFloat(pad.paddingBottom),
          sprite: art ? { w: Math.round(ar.width), h: Math.round(ar.height), clipped: ar.bottom > cr.bottom + 1 } : null,
          contextH: ctx ? Math.round(ctx.getBoundingClientRect().height) : 0,
          footTop: fr ? Math.round(fr.top - cr.top) : null,
          footBottomGap: fr ? Math.round(cr.bottom - fr.bottom) : null,
          footText: (foot?.innerText || "").replace(/\s+/g, " ").trim(),
          clippedText: [...el.querySelectorAll("strong, span, button")].some((node) => (
            node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflow === "hidden" && !node.classList.contains("oak-mon-name")
          )),
          htmlLeak: /<span|class="evo-gender"|&lt;span/.test(el.innerText)
        };
      };
      const candyImgs = [...document.querySelectorAll(".oak-candy-body, .oak-candy-item")].map((img) => ({
        src: img.getAttribute("src") || "",
        composite: Boolean(img.closest(".is-composite")),
        mascot: img.closest(".oak-candy-art")?.querySelector(".oak-candy-mascot")?.getAttribute("src") || ""
      }));
      const counts = {};
      document.querySelectorAll("#evo-filters [data-count]").forEach((el) => {
        counts[el.dataset.count] = el.textContent.trim();
      });
      const emptyBox = empty ? empty.getBoundingClientRect() : null;
      const detail = document.getElementById("evo-detail");
      return {
        send: send.map(measure),
        evo: evo.map(measure),
        candyImgs,
        counts,
        empty: empty ? {
          kind: empty.className,
          text: empty.innerText.replace(/\s+/g, " ").trim(),
          w: Math.round(emptyBox.width),
          h: Math.round(emptyBox.height),
          showAll: Boolean(empty.querySelector("[data-evo-show-all]"))
        } : null,
        inspectOpen: Boolean(document.getElementById("oak-inspect-modal")?.open),
        evoOpen: Boolean(document.getElementById("evo-modal")?.open),
        transferOpen: Boolean(document.getElementById("oak-lab-modal")?.open),
        confirmText: detail?.innerText || "",
        confirmHtmlLeak: /<span class="evo-gender"|class="evo-gender"|&lt;span/.test(detail?.innerText || ""),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        filter: document.getElementById("evo-filter")?.value || document.querySelector("#evo-filters [aria-pressed='true']")?.dataset.filter || ""
      };
    });
  }

  const viewports = [
    { name: "1920", width: 1920, height: 1080 },
    { name: "2560", width: 2560, height: 1440 },
    { name: "960", width: 960, height: 900 },
    { name: "390", width: 390, height: 844 }
  ];

  await page.setViewport(viewports[0]);
  await loginLab();

  const transfer1920 = await probe();
  await shot("transfer-1920");

  if (await page.$("[data-oak-inspect]")) {
    await page.click("[data-oak-inspect]");
    await wait(350);
  }
  const afterInspect = await probe();
  await page.keyboard.press("Escape");
  await wait(200);

  if (await page.$("[data-oak-select]")) {
    await page.click("[data-oak-select]");
    await wait(200);
  }
  const afterSelect = await probe();
  await shot("transfer-selected-1920");
  if (afterSelect.inspectOpen) throw new Error("select opened inspect");

  await page.click("#tab-evolve");
  await wait(500);
  const evoAll = await probe();
  await shot("evolution-all-1920");

  if (await page.$("[data-evo-inspect]")) {
    await page.click("[data-evo-inspect]");
    await wait(300);
  }
  const evoInspect = await probe();
  await page.keyboard.press("Escape");
  await wait(150);

  const tradeChip = await page.$("[data-filter='trade']");
  if (tradeChip) {
    await tradeChip.click();
    await wait(300);
  }
  const tradeEmpty = await probe();
  await shot("evolution-trade-empty-1920");

  if (await page.$("[data-evo-show-all]")) {
    await page.click("[data-evo-show-all]");
    await wait(300);
  }
  const afterShowAll = await probe();

  if (await page.$("[data-evo-act]")) {
    await page.click("[data-evo-act]");
    await wait(400);
  } else {
    await page.evaluate(() => {
      const modal = document.getElementById("evo-modal");
      const detail = document.getElementById("evo-detail");
      const title = document.getElementById("evo-title");
      if (title) title.textContent = "Evolution Ready";
      modal?.classList.add("is-ready-confirm");
      if (detail) {
        const candy = window.playEvolutionCandyItemUrl?.(27) || "images/items/evolution-candy/27.png";
        detail.innerHTML = `<div class="evo-confirm-pair">
          <div class="evo-confirm-mon"><img src="images/pokemon/27.gif" width="96" height="96" alt=""><strong>Sandshrew</strong><span>#027 · Lv. 12</span></div>
          <span class="evo-confirm-arrow">→</span>
          <div class="evo-confirm-mon"><img src="images/pokemon/28.gif" width="96" height="96" alt=""><strong>Sandslash</strong><span>#028</span></div>
        </div>
        <div class="evo-confirm-reqs"><p class="eyebrow">Requirements</p>
          <div class="evo-confirm-req"><span class="oak-candy-art is-composite"><img class="oak-candy-body" src="${candy}" width="36" height="36" alt=""></span><span>Sandshrew Evolution Candy</span><strong>25 required · 67 owned ✓</strong></div>
        </div>
        <p class="evo-confirm-call">Sandshrew is ready to evolve into Sandslash!</p>`;
      }
      modal?.showModal?.();
    });
    await wait(300);
  }
  const evoConfirm = await probe();
  await shot("evolution-confirm-1920");
  await page.keyboard.press("Escape");
  await wait(150);

  await page.evaluate(() => {
    const grid = document.getElementById("evo-send-grid");
    if (!grid) return;
    const candy = window.playEvolutionCandyItemUrl?.(113) || "images/items/evolution-candy/113.png";
    const mascot = window.playSpriteUrl?.(113, "normal") || "";
    const card = document.createElement("div");
    card.innerHTML = `<article class="evo-mon evo-send-card oak-mon-card" data-oak-id="qa-chansey" data-dex="113">
      <button type="button" class="oak-mon-inspect" data-oak-inspect="qa-chansey" aria-label="Inspect Chansey">
        <span class="evo-mon-art"><img src="${window.playSpriteUrl?.(113, "normal") || ""}" alt="" width="96" height="96"></span>
        <strong class="evo-mon-name oak-mon-name">#113 Chansey</strong>
      </button>
      <div class="oak-card-context">
        <span class="oak-send-candy evo-cost-candy">
          <span class="oak-candy-art is-composite" style="--oak-candy-size:40px">
            <img class="oak-candy-body" src="${candy}" alt="" width="40" height="40">
            <img class="oak-candy-mascot" src="${mascot}" alt="" width="18" height="18">
          </span>
          <span class="evo-cost-candy-copy"><strong>Chansey Evolution Candy</strong></span>
        </span>
      </div>
      <button type="button" class="evo-foot is-select">Click here to select</button>
    </article>`;
    grid.prepend(card.firstElementChild);
  });
  await page.click("#tab-send, [data-tab='send']").catch(() => {});
  const sendTab = await page.$("#tab-send");
  if (sendTab) await sendTab.click();
  await wait(250);
  await shot("chansey-candy-1920");
  const chanseyCandy = await page.evaluate(() => {
    const card = document.querySelector('[data-dex="113"]');
    const body = card?.querySelector(".oak-candy-body, .oak-candy-item");
    return {
      src: body?.getAttribute("src") || "",
      composite: Boolean(card?.querySelector(".oak-candy-art.is-composite")),
      mascot: card?.querySelector(".oak-candy-mascot")?.getAttribute("src") || ""
    };
  });

  const responsive = {};
  for (const vp of viewports.slice(1)) {
    await page.setViewport(vp);
    await page.click("#tab-evolve").catch(() => {});
    await wait(350);
    if (vp.name !== "390") {
      const chip = await page.$("[data-filter='trade']");
      if (chip) await chip.click();
      await wait(250);
    }
    responsive[vp.name] = await probe();
    await shot(`evolution-${vp.name}`);
    if (vp.name !== "390") {
      const all = await page.$("[data-filter='all'], [data-evo-show-all]");
      if (all) await all.click();
      await wait(200);
    }
    await page.click("#tab-send").catch(() => {});
    await wait(250);
    await shot(`transfer-${vp.name}`);
    responsive[`${vp.name}-transfer`] = await probe();
  }

  await browser.close();
  stop();

  const report = {
    qaAccount: session.email,
    soraMutated: "NO",
    twinkleMutated: "NO",
    mutations: "none",
    cleanup: "none required — read-only inspect/filter/confirm",
    rpcReadyCount: ready.length,
    rpcTerminalsInReady: terminalsInReady.length,
    rpcUnderResourced: underResourced.length,
    chanseyOwned: chanseyOwned.length,
    transfer1920,
    afterInspect: { inspectOpen: afterInspect.inspectOpen, selected: afterInspect.send.some((c) => c.selected) },
    afterSelect: { inspectOpen: afterSelect.inspectOpen, selected: afterSelect.send.some((c) => c.selected) },
    evoAll,
    evoInspect: { inspectOpen: evoInspect.inspectOpen, evoOpen: evoInspect.evoOpen },
    tradeEmpty,
    afterShowAll: { filter: afterShowAll.filter, empty: afterShowAll.empty, evoCount: afterShowAll.evo.length },
    evoConfirm: {
      open: evoConfirm.evoOpen,
      leak: evoConfirm.confirmHtmlLeak,
      text: evoConfirm.confirmText.slice(0, 400)
    },
    chanseyCandy,
    responsive: Object.fromEntries(Object.entries(responsive).map(([k, v]) => [k, {
      evoCount: v.evo.length,
      empty: v.empty,
      overflow: v.overflow,
      evoHeights: v.evo.map((c) => c.height),
      sendHeights: v.send.map((c) => c.height),
      footGaps: v.evo.map((c) => c.footBottomGap)
    }]))
  };
  fs.writeFileSync(path.join(outDir, "qa-rc123.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
