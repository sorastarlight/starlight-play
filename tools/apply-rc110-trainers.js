const fs = require("fs");
const path = require("path");

const trainersPath = path.join(__dirname, "..", "js", "trainers.js");
const basic = JSON.parse(fs.readFileSync(path.join(__dirname, "rc110-basic-catalog.json"), "utf8"));
let text = fs.readFileSync(trainersPath, "utf8");

const marker = /window\.PLAY_TEAM_BACKGROUNDS = \[\r?\n  \{\r?\n    "sort": 10,\r?\n    "id": "battle-stage"/;

if (!text.includes('"id": "basic-red-blue"')) {
  if (!marker.test(text)) {
    console.error("anchor not found");
    process.exit(1);
  }
  const basicBlock = basic.map((row) => "  " + JSON.stringify(row, null, 2).replace(/\n/g, "\n  ")).join(",\n");
  text = text.replace(
    marker,
    `window.PLAY_TEAM_BACKGROUNDS = [\n${basicBlock},\n  {\n    "sort": 10,\n    "id": "battle-stage"`
  );
}

const basicIds = basic.map((r) => r.id);
const freeRe = /window\.PLAY_FREE_TEAM_BG_IDS = \[[^\]]*\]/;
const existing = text.match(freeRe)?.[0] || "";
const ids = new Set();
const inner = existing.match(/\[(.*)\]/)?.[1] || "";
inner.split(",").forEach((p) => {
  const id = p.trim().replace(/^["']|["']$/g, "");
  if (id) ids.add(id);
});
basicIds.forEach((id) => ids.add(id));
const freeLine = `window.PLAY_FREE_TEAM_BG_IDS = ${JSON.stringify([...ids])}`;
text = text.replace(freeRe, freeLine);

if (!text.includes("playNormalizePartyEditorSprite")) {
  const anchor = "  window.playNormalizePartySprite = function playNormalizePartySprite(img) {";
  const fn = `
  window.playNormalizePartyEditorSprite = function playNormalizePartyEditorSprite(img) {
    if (!img) return;
    const viewport = img.closest(".team-slot-sprite");
    if (!viewport) return;
    const run = () => {
      try {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 1;
        if (!w || !h) return;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        let data;
        try { data = ctx.getImageData(0, 0, w, h).data; } catch (_) { return; }
        let left = w, right = 0, top = h, bottom = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] < 24) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
        if (right < left || bottom < top) return;
        const vw = right - left + 1;
        const vh = bottom - top + 1;
        const boxW = viewport.clientWidth || 72;
        const boxH = viewport.clientHeight || 72;
        const scale = Math.min(boxW / vw, boxH / vh) * 0.94;
        const renderW = Math.max(1, Math.round(w * scale));
        const renderH = Math.max(1, Math.round(h * scale));
        img.style.width = renderW + "px";
        img.style.height = renderH + "px";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        img.style.margin = "0";
        img.style.position = "relative";
        img.dataset.partyEditorNorm = "1";
      } catch (_) {}
    };
    const go = async () => {
      try { if (typeof img.decode === "function") await img.decode(); } catch (_) {}
      run();
    };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener("load", () => { go(); }, { once: true });
  };

`;
  text = text.replace(anchor, fn + anchor);
}

fs.writeFileSync(trainersPath, text);
console.log("rc110 trainers ok", basicIds.length, "basic bgs");
