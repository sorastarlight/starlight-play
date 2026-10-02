const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function load(file) { return fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n"); }
function save(file, text) { fs.writeFileSync(path.join(ROOT, file), text.replace(/\n/g, "\r\n")); }

// Replace playRenderTrainerPartyHtml entirely + add normalize helper before it
let trainers = load("js/trainers.js");
const start = trainers.indexOf("  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {");
const end = trainers.indexOf("  // Trainer Journey is folded into the Trainer ID info panel");
if (start < 0 || end < 0) {
  console.error("party fn markers missing", start, end);
  process.exit(1);
}

const partyBlock = `  window.playNormalizePartySprite = function playNormalizePartySprite(img) {
    if (!img) return;
    const run = () => {
      try {
        const figure = img.closest(".tid-party-figure");
        if (!figure) return;
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
        let sumX = 0, sumY = 0, mass = 0;
        let coreSumX = 0, coreMass = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a < 24) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            sumX += x; sumY += y; mass += 1;
            // Body/core band: middle 55% of visible height
          }
        }
        if (!mass || right < left || bottom < top) return;
        const vh = bottom - top + 1;
        const coreTop = top + Math.floor(vh * 0.2);
        const coreBot = top + Math.floor(vh * 0.75);
        for (let y = coreTop; y <= coreBot; y++) {
          for (let x = left; x <= right; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a < 40) continue;
            coreSumX += x;
            coreMass += 1;
          }
        }
        const alphaMid = (left + right) / 2;
        const coreMid = coreMass ? (coreSumX / coreMass) : alphaMid;
        const dispW = img.getBoundingClientRect().width || img.clientWidth || w;
        const scale = dispW / w;
        const coreShiftPx = (coreMid - alphaMid) * scale;
        const footPad = Math.max(0, (h - 1 - bottom) * scale);
        const visW = Math.max(1, (right - left + 1) * scale);
        figure.style.setProperty("--party-core-x", coreShiftPx.toFixed(2) + "px");
        figure.style.setProperty("--party-shadow-w", Math.round(Math.max(28, Math.min(90, visW * 0.72))) + "px");
        figure.style.setProperty("--party-foot-gap", Math.max(0, Math.min(10, footPad * 0.15)).toFixed(2) + "px");
        figure.dataset.partyNorm = "1";
      } catch (_) {}
    };
    const go = async () => {
      try { if (typeof img.decode === "function") await img.decode(); } catch (_) {}
      run();
    };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener("load", () => { go(); }, { once: true });
  };

  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const team = Array.isArray(card?.team) ? card.team : [];
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    const filled = slots.filter(Boolean).length;
    const bg = window.playTeamBg?.(card?.teamBg) || window.playTeamBg?.("pallet-town");
    const bgClass = bg?.cssClass || "team-bg-image";
    const gen = bg?.generationStyle || "modern";
    const renderMode = bg?.renderMode || (bg?.style === "image" ? "cover" : "css");
    const fx = Number.isFinite(bg?.focalX) ? bg.focalX : 0.5;
    const fy = Number.isFinite(bg?.focalY) ? bg.focalY : 0.55;
    const pixel = Boolean(bg?.pixelArt) || String(renderMode).startsWith("pixel") || gen === "gen1" || gen === "gen2" || gen === "gen3";
    const assetUrl = bg?.asset ? esc(bg.asset) : "";
    const sizeMode = String(renderMode || "cover");
    const bgSize = sizeMode === "contain" || sizeMode === "pixel-contain"
      ? "contain"
      : (sizeMode === "tile" ? "auto" : "cover");
    const bgRepeat = sizeMode === "tile" ? "repeat" : "no-repeat";
    const bgStyle = assetUrl
      ? \` style="--team-bg-image:url('\${assetUrl}');--team-bg-fx:\${fx};--team-bg-fy:\${fy};background-image:linear-gradient(180deg,rgba(12,24,48,.08),rgba(12,24,48,.18)),url('\${assetUrl}');background-size:\${bgSize};background-position:calc(\${fx}*100%) calc(\${fy}*100%);background-repeat:\${bgRepeat};\${pixel ? "image-rendering:pixelated;" : ""}"\`
      : \` style="--team-bg-fx:\${fx};--team-bg-fy:\${fy}"\`;
    const perf = String(window.playPerfMode?.() || window.PLAY_PERF_MODE || "balanced").toLowerCase();
    const reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const animate = !reduce && (perf === "high" || perf === "auto" || perf === "balanced");
    const fanfare = animate ? (card?.editor ? " is-fanfare-soft" : " is-fanfare") : "";
    const figures = slots.map((mon, index) => {
      const position = index + 1;
      const row = (position % 2 === 0) ? "is-back" : "is-front";
      if (!mon) {
        return \`<li class="tid-party-figure is-open \${row}" style="--i:\${index}" data-slot="\${position}">
          <span class="tid-party-stage" aria-hidden="true">
            <span class="tid-party-shadow"></span>
            <span class="tid-party-actor is-empty"></span>
          </span>
          <span class="tid-party-ball" aria-hidden="true">\${position}</span>
          <span class="tid-party-caption is-open-label">Open</span>
        </li>\`;
      }
      const shiny = String(mon.variant || "").toLowerCase().includes("shiny") || mon.shiny;
      const species = partySpeciesLabel(mon) || "Pokémon";
      const nickname = String(mon.nickname || "").trim();
      const primary = nickname || species;
      const catchId = mon.id ? esc(mon.id) : "";
      let spriteUrl = window.playSpriteUrl(mon.dex, mon.variant, mon.formId);
      if (animate && typeof window.playAnimatedSpriteUrl === "function") {
        spriteUrl = window.playAnimatedSpriteUrl(mon.dex, mon.variant, mon.formId) || spriteUrl;
      }
      return \`<li class="tid-party-figure is-filled \${row}\${shiny ? " is-shiny" : ""}\${catchId ? " is-inspectable" : ""}" style="--i:\${index}" data-slot="\${position}"\${catchId ? \` data-catch-id="\${catchId}"\` : ""}>
        \${catchId ? \`<button type="button" class="tid-party-hit" data-inspect-catch="\${catchId}" aria-label="Inspect \${esc(primary)}"></button>\` : ""}
        <span class="tid-party-stage">
          <span class="tid-party-shadow" aria-hidden="true"></span>
          <span class="tid-party-actor">
            <img class="tid-party-sprite\${animate ? " is-anim" : ""}" src="\${spriteUrl}" alt="" width="96" height="96" loading="lazy" decoding="async" onload="window.playNormalizePartySprite?.(this)">
            \${shiny ? \`<span class="tid-party-sparkle" title="Shiny" aria-label="Shiny">✦</span>\` : ""}
          </span>
        </span>
        <span class="tid-party-ball" aria-hidden="true">\${position}</span>
        <strong class="tid-party-caption">\${esc(primary)}</strong>
      </li>\`;
    }).join("");
    return \`<div class="tid-team-showcase is-scene\${fanfare}" data-team-bg-id="\${esc(bg?.id || "pallet-town")}" data-gen="\${esc(gen)}" data-render="\${esc(renderMode)}" data-has-image="\${assetUrl ? "1" : "0"}">
      <div class="tid-team-stage \${esc(bgClass)} is-\${esc(renderMode)}"\${bgStyle}>
        <div class="tid-team-stage-veil" aria-hidden="true"></div>
        <div class="tid-team-stage-frame" aria-hidden="true"></div>
        <p class="tid-team-scene-kicker"><span>MY TEAM</span></p>
        <ol class="tid-party-scene is-depth is-grounded">\${figures}</ol>
        <p class="tid-team-scene-bgname">\${esc(bg?.name || "Pallet Town")}</p>
      </div>
      \${filled ? "" : \`<p class="muted tid-empty tid-party-empty">No party set yet. Organize six Pokémon in My Account.</p>\`}
    </div>\`;
  };

`;

trainers = trainers.slice(0, start) + partyBlock + trainers.slice(end);
save("js/trainers.js", trainers);
console.log("party renderer patched");

// team.js — always show controls
let team = load("js/team.js");
team = team.replace(
  `${mine ? `<div class="team-slot-actions" role="group" aria-label="Reorder ${display}">
          <button type="button" class="team-slot-icon" data-move="${index}" data-dir="-1" aria-label="Move left" ${index === 0 ? "disabled" : ""}>◀</button>
          <button type="button" class="team-slot-icon" data-move="${index}" data-dir="1" aria-label="Move right" ${index === 5 || !slots[index + 1] ? "disabled" : ""}>▶</button>
          <button type="button" class="team-slot-icon is-remove" data-remove="${index}" aria-label="Remove from party">×</button>
        </div>` : ""}`,
  `${mine ? `<div class="team-slot-actions is-always" role="group" aria-label="Reorder ${display}">
          <button type="button" class="team-slot-icon" data-move="${index}" data-dir="-1" aria-label="Move left" ${index === 0 ? "disabled" : ""}>◀</button>
          <button type="button" class="team-slot-icon" data-move="${index}" data-dir="1" aria-label="Move right" ${index === 5 || !slots[index + 1] ? "disabled" : ""}>▶</button>
          <button type="button" class="team-slot-icon is-remove" data-remove="${index}" aria-label="Remove from party">×</button>
        </div>` : ""}`
);
// The above used template interpolation wrongly in this script context - fix with exact source text
team = load("js/team.js");
const oldActions = "${mine ? `<div class=\"team-slot-actions\" role=\"group\" aria-label=\"Reorder ${display}\">\n          <button type=\"button\" class=\"team-slot-icon\" data-move=\"${index}\" data-dir=\"-1\" aria-label=\"Move left\" ${index === 0 ? \"disabled\" : \"\"}>◀</button>\n          <button type=\"button\" class=\"team-slot-icon\" data-move=\"${index}\" data-dir=\"1\" aria-label=\"Move right\" ${index === 5 || !slots[index + 1] ? \"disabled\" : \"\"}>▶</button>\n          <button type=\"button\" class=\"team-slot-icon is-remove\" data-remove=\"${index}\" aria-label=\"Remove from party\">×</button>\n        </div>` : \"\"}";
// Find by unique marker
const marker = "team-slot-actions\" role=\"group\"";
const idx = team.indexOf(marker);
if (idx < 0) {
  console.error("team actions marker missing");
  process.exit(1);
}
team = team.replace('class="team-slot-actions"', 'class="team-slot-actions is-always"');
save("js/team.js", team);
console.log("team.js actions always visible");
