/**
 * rc108 — Team UX overhaul + Avatar stage stability + BG render fixes (core trainers.js)
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "js", "trainers.js");
const raw = fs.readFileSync(file, "utf8");
const nl = raw.includes("\r\n") ? "\r\n" : "\n";
let src = raw.replace(/\r\n/g, "\n");

function mustReplace(label, find, replace) {
  const f = find.replace(/\r\n/g, "\n");
  const r = replace.replace(/\r\n/g, "\n");
  if (!src.includes(f)) {
    if (src.includes(r.slice(0, Math.min(60, r.length)))) {
      console.log("skip", label);
      return;
    }
    throw new Error("Anchor not found: " + label);
  }
  src = src.split(f).join(r);
  console.log("ok", label);
}

mustReplace(
  "body-core-empty",
  "    if (total <= 0) {\n      return { cw: Math.max(1, right - left + 1), ch: Math.max(1, bottom - top + 1) };\n    }",
  "    if (total <= 0) {\n      return { cl: left, ct: top, cw: Math.max(1, right - left + 1), ch: Math.max(1, bottom - top + 1) };\n    }"
);

mustReplace(
  "body-core-return",
  "    return {\n      cw: Math.max(1, cx.i1 - cx.i0 + 1),\n      ch: Math.max(1, cy.i1 - cy.i0 + 1)\n    };\n  }",
  "    return {\n      cl: left + cx.i0,\n      ct: top + cy.i0,\n      cw: Math.max(1, cx.i1 - cx.i0 + 1),\n      ch: Math.max(1, cy.i1 - cy.i0 + 1)\n    };\n  }"
);

mustReplace(
  "bounds-core-fields",
  "        cw: core.cw,\n        ch: core.ch\n      };",
  "        cl: core.cl,\n        ct: core.ct,\n        cw: core.cw,\n        ch: core.ch\n      };"
);

mustReplace(
  "normalize-pending",
  "  window.playNormalizeTrainerAvatar = function playNormalizeTrainerAvatar(img, opts) {\n    if (!img) return;\n    const mode = opts?.mode\n      || (img.classList.contains(\"scc-avatar-thumb-img\") || img.closest?.(\".scc-avatar-thumb\") ? \"thumb\"\n        : (img.classList.contains(\"tid-avatar-sprite\") || img.closest?.(\".tid-avatar-stage\") ? \"card\" : \"stage\"));\n    const apply = () => {",
  "  window.playNormalizeTrainerAvatar = function playNormalizeTrainerAvatar(img, opts) {\n    if (!img) return;\n    const mode = opts?.mode\n      || (img.classList.contains(\"scc-avatar-thumb-img\") || img.closest?.(\".scc-avatar-thumb\") ? \"thumb\"\n        : (img.classList.contains(\"tid-avatar-sprite\") || img.closest?.(\".tid-avatar-stage\") ? \"card\" : \"stage\"));\n    if (mode === \"stage\") {\n      img.classList.add(\"is-stage-pending\");\n      img.style.opacity = \"0\";\n      img.style.transition = \"none\";\n    }\n    const apply = () => {"
);

const oldElse = `      } else {
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
      img.style.imageRendering = familyCfg.pixelated ? "pixelated" : "auto";
      img.style.filter = familyCfg.pixelated ? "none" : "";

      const shadow = avatarShadowHost(img);
      if (shadow) {
        const shadowW = Math.max(28, Math.min(stageRefW * 0.55, Number(familyCfg.shadowWidth) || visW * 0.78));
        shadow.style.setProperty("--shadow-w", \`\${Math.round(shadowW)}px\`);
        shadow.classList.add("is-on");
      }
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener("load", apply, { once: true });
  };`;

// The file uses template literals for shadow - match actual file content
const oldElseReal = [
  '      } else {',
  '        img.style.position = "";',
  '        img.style.left = "";',
  '        img.style.right = "";',
  '        img.style.top = "";',
  '        img.style.bottom = "";',
  '        img.style.removeProperty("width");',
  '        img.style.removeProperty("height");',
  '        img.style.width = renderW + "px";',
  '        img.style.height = renderH + "px";',
  '        img.style.margin = "0 " + (-padR) + "px " + (-padB + offY) + "px " + (-padL) + "px";',
  '        img.style.transform = "translateX(" + ((((padR - padL) / 2) + offX).toFixed(2)) + "px)";',
  '        img.style.transformOrigin = "";',
  '      }',
  '      img.style.imageRendering = familyCfg.pixelated ? "pixelated" : "auto";',
  '      img.style.filter = familyCfg.pixelated ? "none" : "";',
  '',
  '      const shadow = avatarShadowHost(img);',
  '      if (shadow) {',
  '        const shadowW = Math.max(28, Math.min(stageRefW * 0.55, Number(familyCfg.shadowWidth) || visW * 0.78));',
  '        shadow.style.setProperty("--shadow-w", `${Math.round(shadowW)}px`);',
  '        shadow.classList.add("is-on");',
  '      }',
  '    };',
  '    if (img.complete && img.naturalWidth) apply();',
  '    else img.addEventListener("load", apply, { once: true });',
  '  };'
].join("\n");

const newElse = [
  '      } else {',
  '        img.style.position = "";',
  '        img.style.left = "";',
  '        img.style.right = "";',
  '        img.style.top = "";',
  '        img.style.bottom = "";',
  '        img.style.removeProperty("width");',
  '        img.style.removeProperty("height");',
  '        img.style.width = renderW + "px";',
  '        img.style.height = renderH + "px";',
  '        // Center BODY/CORE on workshop stage; full alpha used for fit clamps.',
  '        const alphaMid = bounds.left + (bounds.vw / 2);',
  '        const coreMid = Number.isFinite(bounds.cl)',
  '          ? (bounds.cl + ((bounds.cw || bounds.vw) / 2))',
  '          : alphaMid;',
  '        const coreShift = mode === "stage" ? ((alphaMid - coreMid) * scale) : 0;',
  '        const tx = ((padR - padL) / 2) + offX + coreShift;',
  '        img.style.margin = "0 " + (-padR) + "px " + (-padB + offY) + "px " + (-padL) + "px";',
  '        img.style.transform = "translateX(" + tx.toFixed(2) + "px)";',
  '        img.style.transformOrigin = "";',
  '        img.style.transition = "none";',
  '      }',
  '      img.style.imageRendering = familyCfg.pixelated ? "pixelated" : "auto";',
  '      img.style.filter = familyCfg.pixelated ? "none" : "";',
  '',
  '      const shadow = avatarShadowHost(img);',
  '      if (shadow) {',
  '        const shadowW = Math.max(28, Math.min(stageRefW * 0.55, Number(familyCfg.shadowWidth) || visW * 0.78));',
  '        shadow.style.setProperty("--shadow-w", Math.round(shadowW) + "px");',
  '        shadow.classList.add("is-on");',
  '      }',
  '      if (mode === "stage") {',
  '        img.classList.remove("is-stage-pending");',
  '        img.classList.add("is-stage-ready");',
  '        const reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);',
  '        const low = String(window.playPerfMode?.() || window.PLAY_PERF_MODE || "").toLowerCase() === "low";',
  '        if (reduce || low) {',
  '          img.style.opacity = "1";',
  '        } else {',
  '          img.style.opacity = "0";',
  '          requestAnimationFrame(() => {',
  '            img.style.transition = "opacity 120ms ease";',
  '            img.style.opacity = "1";',
  '          });',
  '        }',
  '      }',
  '    };',
  '    const run = async () => {',
  '      try { if (typeof img.decode === "function") await img.decode(); } catch (_) {}',
  '      apply();',
  '    };',
  '    if (img.complete && img.naturalWidth) run();',
  '    else img.addEventListener("load", () => { run(); }, { once: true });',
  '  };'
].join("\n");

mustReplace("stage-core-reveal", oldElseReal, newElse);

fs.writeFileSync(file, nl === "\r\n" ? src.replace(/\n/g, "\r\n") : src);
console.log("Wrote", file);
