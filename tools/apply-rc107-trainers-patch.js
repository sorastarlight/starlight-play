/**
 * Apply rc107 trainers.js presentation patches.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "js", "trainers.js");
let src = fs.readFileSync(file, "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "_team-bg-catalog.json"), "utf8"));

function must(idx, label) {
  if (idx < 0) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  return idx;
}

// 1) Sonic overrides
{
  const start = must(src.indexOf("window.PLAY_AVATAR_STAGE_OVERRIDES = Object.assign({"), "overrides");
  const endMarker = "}, window.PLAY_AVATAR_STAGE_OVERRIDES || {});";
  const end = must(src.indexOf(endMarker, start), "overrides end") + endMarker.length;
  src = src.slice(0, start) + `window.PLAY_AVATAR_STAGE_OVERRIDES = Object.assign({
    // Classic Sonic Premium — Trainer ID card-mode only (workshop/thumb ignore card* keys).
    "sonic-amy": { preferInteger: false, cardMaxW: 0.70, cardTargetW: 0.52, cardTargetH: 0.68, cardMinH: 0.60, cardMaxH: 0.74, trainerCardScale: 1.08 },
    "sonic-cream": { preferInteger: false, cardTargetH: 0.68, cardMaxH: 0.74, cardMinH: 0.60, cardTargetW: 0.50, cardMaxW: 0.68, trainerCardScale: 1.06 },
    "sonic-tails": { preferInteger: false, cardMaxW: 0.72, cardTargetW: 0.54, cardTargetH: 0.66, cardMaxH: 0.74, cardMinH: 0.58, trainerCardScale: 1.08 },
    "sonic-sonic": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardTargetW: 0.52, cardMaxW: 0.70, trainerCardScale: 1.10 },
    "sonic-knuckles": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardTargetW: 0.52, cardMaxW: 0.70, trainerCardScale: 1.10 },
    "sonic-origins-amy": { preferInteger: false, cardTargetH: 0.68, cardMinH: 0.60, cardMaxH: 0.74, cardMaxW: 0.70, trainerCardScale: 1.05 },
    "sonic-origins-tails": { preferInteger: false, cardTargetH: 0.66, cardMinH: 0.58, cardMaxH: 0.74, cardMaxW: 0.72, trainerCardScale: 1.05 },
    "sonic-origins-sonic": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardMaxW: 0.70, trainerCardScale: 1.05 },
    "sonic-origins-knuckles": { preferInteger: false, cardTargetH: 0.70, cardMinH: 0.62, cardMaxH: 0.76, cardMaxW: 0.70, trainerCardScale: 1.05 },
    "iris": { preferInteger: false, cardTargetH: 0.66, cardMinH: 0.58, cardMaxH: 0.74, cardMaxW: 0.74, trainerCardScale: 1 },
    "red-lgpe": { preferInteger: false, cardTargetH: 0.66, cardMinH: 0.58, cardMaxH: 0.74, trainerCardScale: 1 }
  }, window.PLAY_AVATAR_STAGE_OVERRIDES || {});` + src.slice(end);
}

// 2) Thumb positioning — find Absolute grounded contain comment
{
  const comment = "// Absolute grounded contain: place VISIBLE alpha inside the tile";
  const commentAt = must(src.indexOf(comment), "thumb comment");
  const ifAt = must(src.lastIndexOf('if (mode === "thumb") {', commentAt), "thumb if");
  const end = must(src.indexOf("img.style.imageRendering", commentAt), "imageRendering");
  const next = `if (mode === "thumb") {
        // Dedicated thumbnail contract: full alpha fits inside tile.
        // left:50% + translateX(-(alphaCenterX)); never reuse card/stage offsets.
        // CSS width/height:auto !important is overridden via setProperty(..., 'important').
        const inset = Math.max(6, Math.round(Math.min(stageRefW, stageRefH) * 0.08));
        const alphaCx = (bounds.left + (bounds.vw / 2)) * scale;
        img.style.setProperty("width", renderW + "px", "important");
        img.style.setProperty("height", renderH + "px", "important");
        img.style.position = "absolute";
        img.style.left = "50%";
        img.style.right = "auto";
        img.style.top = "auto";
        img.style.bottom = (inset - padB + offY).toFixed(2) + "px";
        img.style.margin = "0";
        img.style.transform = "translateX(" + (-alphaCx + offX).toFixed(2) + "px)";
        img.style.transformOrigin = "left bottom";
        img.dataset.avatarThumbInset = String(inset);
      } else {
        img.style.position = "";
        img.style.left = "";
        img.style.right = "";
        img.style.top = "";
        img.style.bottom = "";
        img.style.removeProperty("width");
        img.style.removeProperty("height");
        img.style.width = renderW + "px";
        img.style.height = renderH + "px";
        img.style.margin = "0 " + (-padR) + "px " + (-padB + offY) + "px " + (-padL) + "px";
        img.style.transform = "translateX(" + ((((padR - padL) / 2) + offX).toFixed(2)) + "px)";
        img.style.transformOrigin = "";
      }
      `;
  src = src.slice(0, ifAt) + next + src.slice(end);
}

// 3) Catalog
{
  const start = must(src.indexOf("window.PLAY_TEAM_BACKGROUNDS = ["), "catalog");
  const freeIds = src.indexOf("window.PLAY_TEAM_BG_FREE_IDS", start);
  must(freeIds, "free ids");
  // end of array is the ]; immediately before PLAY_TEAM_BG_FREE_IDS
  const end = must(src.lastIndexOf("];", freeIds), "catalog ];") + 2;
  src = src.slice(0, start) + "window.PLAY_TEAM_BACKGROUNDS = " + JSON.stringify(catalog, null, 2) + ";" + src.slice(end);
}

// 4) Party renderer
{
  const start = must(src.indexOf("window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {"), "party");
  const end = must(src.indexOf("\n  // Trainer Journey is folded", start), "party end");
  src = src.slice(0, start) + `window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {
    const esc = window.playEscapeAttr || ((value) => String(value || ""));
    const team = Array.isArray(card?.team) ? card.team : [];
    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);
    const filled = slots.filter(Boolean).length;
    const bg = window.playTeamBg?.(card?.teamBg) || window.playTeamBg?.("starlight-gradient");
    const bgClass = bg?.cssClass || "team-bg-starlight-gradient";
    const gen = bg?.generationStyle || "starlight";
    const renderMode = bg?.renderMode || (bg?.style === "image" ? "cover" : "css");
    const fx = Number.isFinite(bg?.focalX) ? bg.focalX : 0.5;
    const fy = Number.isFinite(bg?.focalY) ? bg.focalY : 0.5;
    const bgStyle = bg?.asset
      ? \` style="--team-bg-image:url('\${esc(bg.asset)}');--team-bg-fx:\${fx};--team-bg-fy:\${fy}"\`
      : \` style="--team-bg-fx:\${fx};--team-bg-fy:\${fy}"\`;
    const perf = String(window.playPerfMode?.() || window.PLAY_PERF_MODE || "balanced").toLowerCase();
    const reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const animate = !reduce && (perf === "high" || perf === "auto" || perf === "balanced");
    const figures = slots.map((mon, index) => {
      const position = index + 1;
      if (!mon) {
        return \`<li class="tid-party-figure is-open" style="--i:\${index}" data-slot="\${position}">
          <span class="tid-party-pad" aria-hidden="true"></span>
          <span class="tid-party-ball" aria-hidden="true">\${position}</span>
          <span class="tid-party-open-label">Open</span>
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
      return \`<li class="tid-party-figure is-filled\${shiny ? " is-shiny" : ""}\${catchId ? " is-inspectable" : ""}" style="--i:\${index}" data-slot="\${position}"\${catchId ? \` data-catch-id="\${catchId}"\` : ""}>
        \${catchId ? \`<button type="button" class="tid-party-hit" data-inspect-catch="\${catchId}" aria-label="Inspect \${esc(primary)}"></button>\` : ""}
        <span class="tid-party-pad" aria-hidden="true"></span>
        <span class="tid-party-actor">
          <img class="tid-party-sprite\${animate ? " is-anim" : ""}" src="\${spriteUrl}" alt="" width="96" height="96" loading="lazy" decoding="async">
          \${shiny ? \`<span class="tid-party-sparkle" title="Shiny" aria-label="Shiny">✦</span>\` : ""}
        </span>
        <span class="tid-party-ball" aria-hidden="true">\${position}</span>
        <strong class="tid-party-caption">\${esc(primary)}</strong>
      </li>\`;
    }).join("");
    return \`<div class="tid-team-showcase is-scene" data-team-bg-id="\${esc(bg?.id || "starlight-gradient")}" data-gen="\${esc(gen)}" data-render="\${esc(renderMode)}">
      <div class="tid-team-stage \${esc(bgClass)} is-\${esc(renderMode)}"\${bgStyle}>
        <div class="tid-team-stage-veil" aria-hidden="true"></div>
        <div class="tid-team-stage-frame" aria-hidden="true"></div>
        <p class="tid-team-scene-kicker"><span>MY TEAM</span></p>
        <ol class="tid-party-scene">\${figures}</ol>
        <p class="tid-team-scene-bgname">\${esc(bg?.name || "ST★RLIGHT Gradient")}</p>
      </div>
      \${filled ? "" : \`<p class="muted tid-empty tid-party-empty">No party set yet. Organize six Pokémon in My Account.</p>\`}
    </div>\`;
  };

` + src.slice(end);
}

fs.writeFileSync(file, src);
console.log(JSON.stringify({
  ok: true,
  catalog: catalog.length,
  free: catalog.filter((r) => r.free).length,
  hasThumb: src.includes("Dedicated thumbnail contract"),
  hasScene: src.includes("tid-party-scene"),
  hasSonic: src.includes("trainerCardScale: 1.10")
}, null, 2));
