const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "js", "trainers.js");
const nl = fs.readFileSync(file, "utf8").includes("\r\n") ? "\r\n" : "\n";
let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {");
const end = src.indexOf("  // Trainer Journey is folded into the Trainer ID info panel", start);
if (start < 0 || end < 0) throw new Error("party fn bounds " + start + " " + end);

const next = [
  "  window.playRenderTrainerPartyHtml = function playRenderTrainerPartyHtml(card) {",
  "    const esc = window.playEscapeAttr || ((value) => String(value || \"\"));",
  "    const team = Array.isArray(card?.team) ? card.team : [];",
  "    const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);",
  "    const filled = slots.filter(Boolean).length;",
  "    const bg = window.playTeamBg?.(card?.teamBg) || window.playTeamBg?.(\"starlight-gradient\");",
  "    const bgClass = bg?.cssClass || \"team-bg-starlight-gradient\";",
  "    const gen = bg?.generationStyle || \"starlight\";",
  "    const renderMode = bg?.renderMode || (bg?.style === \"image\" ? \"cover\" : \"css\");",
  "    const fx = Number.isFinite(bg?.focalX) ? bg.focalX : 0.5;",
  "    const fy = Number.isFinite(bg?.focalY) ? bg.focalY : 0.55;",
  "    const pixel = Boolean(bg?.pixelArt) || String(renderMode).startsWith(\"pixel\") || gen === \"gen1\" || gen === \"gen2\" || gen === \"gen3\";",
  "    const assetUrl = bg?.asset ? esc(bg.asset) : \"\";",
  "    const bgStyle = assetUrl",
  "      ? ` style=\"--team-bg-image:url('${assetUrl}');--team-bg-fx:${fx};--team-bg-fy:${fy};background-image:linear-gradient(180deg,rgba(12,24,48,.10),rgba(12,24,48,.22)),url('${assetUrl}');background-size:cover;background-position:calc(${fx}*100%) calc(${fy}*100%);background-repeat:no-repeat;${pixel ? \"image-rendering:pixelated;\" : \"\"}\"`",
  "      : ` style=\"--team-bg-fx:${fx};--team-bg-fy:${fy}\"`;",
  "    const perf = String(window.playPerfMode?.() || window.PLAY_PERF_MODE || \"balanced\").toLowerCase();",
  "    const reduce = Boolean(window.matchMedia?.(\"(prefers-reduced-motion: reduce)\")?.matches);",
  "    const animate = !reduce && (perf === \"high\" || perf === \"auto\" || perf === \"balanced\");",
  "    const fanfare = animate ? (card?.editor ? \" is-fanfare-soft\" : \" is-fanfare\") : \"\";",
  "    const figures = slots.map((mon, index) => {",
  "      const position = index + 1;",
  "      const row = (position % 2 === 0) ? \"is-back\" : \"is-front\";",
  "      if (!mon) {",
  "        return `<li class=\"tid-party-figure is-open ${row}\" style=\"--i:${index}\" data-slot=\"${position}\">",
  "          <span class=\"tid-party-pad\" aria-hidden=\"true\"></span>",
  "          <span class=\"tid-party-ball\" aria-hidden=\"true\">${position}</span>",
  "          <span class=\"tid-party-open-label\">Open</span>",
  "        </li>`;",
  "      }",
  "      const shiny = String(mon.variant || \"\").toLowerCase().includes(\"shiny\") || mon.shiny;",
  "      const species = partySpeciesLabel(mon) || \"Pokémon\";",
  "      const nickname = String(mon.nickname || \"\").trim();",
  "      const primary = nickname || species;",
  "      const catchId = mon.id ? esc(mon.id) : \"\";",
  "      let spriteUrl = window.playSpriteUrl(mon.dex, mon.variant, mon.formId);",
  "      if (animate && typeof window.playAnimatedSpriteUrl === \"function\") {",
  "        spriteUrl = window.playAnimatedSpriteUrl(mon.dex, mon.variant, mon.formId) || spriteUrl;",
  "      }",
  "      return `<li class=\"tid-party-figure is-filled ${row}${shiny ? \" is-shiny\" : \"\"}${catchId ? \" is-inspectable\" : \"\"}\" style=\"--i:${index}\" data-slot=\"${position}\"${catchId ? ` data-catch-id=\"${catchId}\"` : \"\"}>",
  "        ${catchId ? `<button type=\"button\" class=\"tid-party-hit\" data-inspect-catch=\"${catchId}\" aria-label=\"Inspect ${esc(primary)}\"></button>` : \"\"}",
  "        <span class=\"tid-party-pad\" aria-hidden=\"true\"></span>",
  "        <span class=\"tid-party-actor\">",
  "          <img class=\"tid-party-sprite${animate ? \" is-anim\" : \"\"}\" src=\"${spriteUrl}\" alt=\"\" width=\"96\" height=\"96\" loading=\"lazy\" decoding=\"async\">",
  "          ${shiny ? `<span class=\"tid-party-sparkle\" title=\"Shiny\" aria-label=\"Shiny\">✦</span>` : \"\"}",
  "        </span>",
  "        <span class=\"tid-party-ball\" aria-hidden=\"true\">${position}</span>",
  "        <strong class=\"tid-party-caption\">${esc(primary)}</strong>",
  "      </li>`;",
  "    }).join(\"\");",
  "    return `<div class=\"tid-team-showcase is-scene${fanfare}\" data-team-bg-id=\"${esc(bg?.id || \"starlight-gradient\")}\" data-gen=\"${esc(gen)}\" data-render=\"${esc(renderMode)}\" data-has-image=\"${assetUrl ? \"1\" : \"0\"}\">",
  "      <div class=\"tid-team-stage ${esc(bgClass)} is-${esc(renderMode)}\"${bgStyle}>",
  "        <div class=\"tid-team-stage-veil\" aria-hidden=\"true\"></div>",
  "        <div class=\"tid-team-stage-frame\" aria-hidden=\"true\"></div>",
  "        <p class=\"tid-team-scene-kicker\"><span>MY TEAM</span></p>",
  "        <ol class=\"tid-party-scene is-depth\">${figures}</ol>",
  "        <p class=\"tid-team-scene-bgname\">${esc(bg?.name || \"ST★RLIGHT Gradient\")}</p>",
  "      </div>",
  "      ${filled ? \"\" : `<p class=\"muted tid-empty tid-party-empty\">No party set yet. Organize six Pokémon in My Account.</p>`}",
  "    </div>`;",
  "  };",
  "",
  ""
].join("\n");

src = src.slice(0, start) + next + src.slice(end);
fs.writeFileSync(file, nl === "\r\n" ? src.replace(/\n/g, "\r\n") : src);
console.log("party renderer updated");
