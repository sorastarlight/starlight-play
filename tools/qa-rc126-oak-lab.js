/**
 * RC126 Oak Lab presentation QA — PlayTester only, non-mutating.
 * REAL DOM + LIVE RPC (read-only collection/research). Transfer grid may be
 * injected when PlayTester has 0 sendable Pokémon (LOCAL HARNESS for that shot).
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4216;
const BASE = `http://127.0.0.1:${PORT}`;
const outDir = path.join(root, "docs", "audits", "rc126-shots");
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
  const [collection, research] = await Promise.all([
    sb.rpc("play_collection"),
    sb.rpc("play_oak_research")
  ]);
  if (collection.error) throw collection.error;
  const ready = collection.data?.ready || [];
  const sendable = (collection.data?.mons || collection.data?.pokemon || []).length;
  const researchData = research.error ? null : research.data;

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
  async function gotoLab(hash, width, height = 1080) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/evolve.html${hash || ""}`, { waitUntil: "domcontentloaded" });
    await auth();
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("#evo-app", { timeout: 25000 });
    await wait(700);
  }

  await gotoLab("#transfer", 1920);
  const transferCount = await page.evaluate(() => document.querySelectorAll("#evo-send-grid .oak-mon-card").length);
  let transferHarness = false;
  if (transferCount < 1) {
    transferHarness = true;
    await page.evaluate(() => {
      const samples = [
        { id: "qa-25", dex: 25, name: "Pikachu" },
        { id: "qa-27", dex: 27, name: "Sandshrew" },
        { id: "qa-133", dex: 133, name: "Eevee" },
        { id: "qa-113", dex: 113, name: "Chansey" }
      ];
      const grid = document.getElementById("evo-send-grid");
      if (!grid) return;
      grid.innerHTML = samples.map((row, i) => {
        const candy = window.playEvolutionCandyItemUrl(row.dex);
        const bare = (window.playSpeciesName?.(row.dex) || row.name);
        const spr = window.playSpriteUrl(row.dex, "normal");
        const dex = String(row.dex).padStart(3, "0");
        return `<article class="evo-mon evo-send-card oak-mon-card${i === 0 ? " is-selected" : ""}" data-oak-id="${row.id}" data-dex="${row.dex}">
          <button type="button" class="oak-mon-inspect" data-oak-inspect="${row.id}" aria-label="Inspect ${row.name}">
            <span class="evo-mon-art"><img class="oak-sprite" src="${spr}" alt="" width="96" height="96" style="width:96px;height:96px"></span>
            <strong class="evo-mon-name oak-mon-name">#${dex} ${row.name}</strong>
          </button>
          <div class="oak-card-context">
            <span class="oak-candy-block">
              <span class="oak-candy-art" style="--oak-candy-size:40px"><img class="oak-candy-item" src="${candy}" alt="" width="40" height="40"></span>
              <span class="oak-candy-label">
                <span class="oak-candy-species">${bare}</span>
                <span class="oak-candy-kind">Evolution Candy</span>
              </span>
            </span>
          </div>
          <button type="button" class="evo-foot ${i === 0 ? "is-ready" : "is-select"}" data-oak-select="${row.id}">${i === 0 ? "Selected ✓" : "Select Pokémon"}</button>
        </article>`;
      }).join("");
    });
    await wait(400);
  }
  await shot("transfer-overview-1920");
  const pika = await page.$('[data-dex="25"]');
  if (pika) await pika.screenshot({ path: path.join(outDir, "transfer-pikachu-label.png") });
  const eevee = await page.$('[data-dex="133"]');
  if (eevee) await eevee.screenshot({ path: path.join(outDir, "transfer-eevee-label.png") });

  const transferProbe = await page.evaluate(() => {
    const ov = document.querySelector(".oak-lab-overview-transfer")?.getBoundingClientRect();
    const cards = [...document.querySelectorAll("#evo-send-grid .oak-mon-card")];
    return {
      overviewH: ov ? Math.round(ov.height) : null,
      cards: cards.slice(0, 4).map((el) => {
        const label = el.querySelector(".oak-candy-label");
        const species = el.querySelector(".oak-candy-species");
        const kind = el.querySelector(".oak-candy-kind");
        const cr = el.getBoundingClientRect();
        const foot = el.querySelector(".evo-foot")?.getBoundingClientRect();
        return {
          dex: el.dataset.dex,
          h: Math.round(cr.height),
          lines: species && kind ? 2 : (label ? 1 : 0),
          species: species?.textContent.trim() || "",
          kind: kind?.textContent.trim() || "",
          footText: el.querySelector(".evo-foot")?.innerText.trim(),
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      })
    };
  });

  await page.setViewport({ width: 2560, height: 1440 });
  await wait(300);
  await shot("transfer-2560");
  await page.setViewport({ width: 960, height: 1080 });
  await wait(300);
  await shot("transfer-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await shot("transfer-390");

  await gotoLab("#evolution", 1920);
  await shot("evolution-overview-1920");
  const evoCard = await page.$("#evo-grid .oak-evo-card");
  if (evoCard) await evoCard.screenshot({ path: path.join(outDir, "evolution-card.png") });
  const evoProbe = await page.evaluate(() => {
    const ov = document.querySelector(".oak-lab-overview-evolve")?.getBoundingClientRect();
    const cards = [...document.querySelectorAll("#evo-grid .oak-evo-card")];
    return {
      overviewH: ov ? Math.round(ov.height) : null,
      ready: document.getElementById("evo-ready-display")?.textContent,
      cards: cards.slice(0, 6).map((el) => {
        const cr = el.getBoundingClientRect();
        const candy = el.querySelector(".oak-evo-candy")?.getBoundingClientRect();
        const sprite = el.querySelector(".evo-mon-art img")?.getBoundingClientRect();
        const text = el.innerText;
        const overlap = candy && sprite
          ? !(candy.bottom < sprite.top || candy.top > sprite.bottom || candy.right < sprite.left || candy.left > sprite.right)
          : false;
        return {
          dex: el.dataset.dex,
          h: Math.round(cr.height),
          foot: el.querySelector(".evo-foot")?.innerText.trim(),
          hasRequired: /required|owned|more needed/i.test(text),
          overlap
        };
      })
    };
  });
  const readyBtn = await page.$(".oak-evo-card .evo-foot.is-ready");
  if (readyBtn) {
    await readyBtn.click();
    await wait(500);
    const modal = await page.$("#evo-modal[open], #evo-modal.play-modal");
    if (modal) await shot("evolution-confirm");
    const confirmText = await page.evaluate(() => document.getElementById("evo-detail")?.innerText || "");
    evoProbe.confirmHasReqs = /required/.test(confirmText) && /owned/.test(confirmText);
    await page.keyboard.press("Escape");
    await wait(200);
  }
  await page.setViewport({ width: 960, height: 1080 });
  await wait(300);
  await shot("evolution-960");
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await shot("evolution-390");

  await gotoLab("#research/field", 1920);
  await shot("research-field-1920");
  const researchProbe = await page.evaluate(() => {
    const nextPanel = document.querySelector(".oak-research-next-milestone");
    const compact = document.querySelector(".oak-research-next-compact");
    const claimed = [...document.querySelectorAll(".oak-research-card.is-claimed")].length;
    const claimable = [...document.querySelectorAll("[data-claim-research]")].length;
    const historyBtn = document.querySelector("[data-research-track='history']");
    return {
      hasLargeNext: Boolean(nextPanel),
      hasCompactNext: Boolean(compact),
      claimedOnActive: claimed,
      claimableOnActive: claimable,
      historyLabel: historyBtn?.innerText.replace(/\s+/g, " ").trim() || ""
    };
  });
  await page.click("[data-research-track='history']");
  await wait(500);
  await shot("research-history-1920");
  const historyProbe = await page.evaluate(() => ({
    title: document.getElementById("oak-active-track-title")?.textContent,
    claimButtons: document.querySelectorAll("[data-claim-research]").length,
    groups: [...document.querySelectorAll(".oak-research-history-group, .oak-research-history-empty")].length,
    claimedCards: [...document.querySelectorAll(".oak-research-card.is-claimed, .oak-research-card.is-history")].length
  }));
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  await shot("research-history-390");

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/store.html`, { waitUntil: "domcontentloaded" });
  await auth();
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await wait(800);
  await shot("mart-pokecoin-1920");

  const report = {
    qaAccount: session.email,
    soraMutated: false,
    twinkleMutated: false,
    liveRpc: {
      collection: !collection.error,
      research: !research.error,
      readyCount: ready.length,
      sendableHint: sendable
    },
    transferHarness,
    transferProbe,
    evoProbe,
    researchProbe,
    historyProbe,
    researchTracks: (researchData?.tracks || []).map((t) => ({
      id: t.id,
      claimed: (t.milestones || []).filter((m) => m.claimed).length,
      claimable: (t.milestones || []).filter((m) => m.complete && !m.claimed).length
    }))
  };
  fs.writeFileSync(path.join(outDir, "qa-rc126.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
