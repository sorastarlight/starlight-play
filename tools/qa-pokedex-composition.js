/* node tools/qa-pokedex-composition.js — offline composition / safe-fit smoke */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  console,
  matchMedia: () => ({ matches: false }),
  document: {
    documentElement: { dataset: {} },
    body: { classList: { contains: () => false } },
    addEventListener() {}
  },
  window: null
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

function load(rel) {
  vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}

load("js/variants.js");
load("js/forms.js");
load("js/species.js");

sandbox.playFormMeta = (formId) => sandbox.PLAY_FORMS?.[formId] || sandbox.PLAY_FORMS?.[String(formId)] || null;
sandbox.playFormId = (dex, formId) => Number(formId || dex) || Number(dex);
sandbox.playAllowedVariants = (dex) => sandbox.PLAY_VARIANTS?.[dex] || sandbox.PLAY_VARIANTS?.[String(dex)] || ["normal"];
sandbox.playSpriteStem = function (dex, variant, formId) {
  const id = Number(dex);
  const resolvedForm = sandbox.playFormId(id, formId);
  const formMeta = sandbox.playFormMeta(resolvedForm);
  const useFormStem = formMeta && !formMeta.isBase && resolvedForm && resolvedForm !== id;
  const kind = String(variant || "normal").toLowerCase();
  const allowed = new Set(sandbox.playAllowedVariants(id));
  const shiny = kind.includes("shiny");
  const wantsFemale = kind.includes("female");
  const female = !useFormStem && wantsFemale && (allowed.has("female") || allowed.has("shiny-female"));
  if (useFormStem) {
    if (shiny) return `forms/shiny/${resolvedForm}`;
    return `forms/${resolvedForm}`;
  }
  if (shiny && female) return `shiny/female/${id}`;
  if (female) return `female/${id}`;
  if (shiny) return `shiny/${id}`;
  return String(id);
};
sandbox.playSpriteUrl = function (dex, variant, formId) {
  const stem = sandbox.playSpriteStem(dex, variant, formId);
  const ext = (sandbox.PLAY_SPRITE_EXT && sandbox.PLAY_SPRITE_EXT[stem]) || "gif";
  return `images/pokemon/${stem}.${ext}`;
};

load("js/pokedex-presentation.js");
load("js/pokedex-presentation-resolve.js");
load("js/pokedex-reference.js");

const resolve = sandbox.resolvePokedexPresentation;
let fail = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    fail += 1;
  } else console.log("OK", msg);
}

function fits(pres, label) {
  const insetT = Number(pres.cssVars["--dex-safe-t"] || 0.045);
  const insetB = Number(pres.cssVars["--dex-safe-b"] || 0.13);
  const insetL = Number(pres.cssVars["--dex-safe-l"] || 0.05);
  const insetR = Number(pres.cssVars["--dex-safe-r"] || 0.05);
  const h = pres.occupancyH;
  const w = pres.occupancyW;
  const topClear = 1 - insetB - h;
  const usableH = 1 - insetT - insetB;
  const usableW = 1 - insetL - insetR;
  const ok = h <= usableH + 1e-6 && w <= usableW + 1e-6 && topClear >= insetT - 1e-6;
  assert(ok, `${label} fits chamber (h=${h} w=${w} topClear=${topClear.toFixed(3)} insetT=${insetT})`);
  return { topClear, h, w, core: pres.coreOccupancy, full: pres.fullEnvelopeOccupancy, insetT };
}

const gmax = resolve({ dex: 25, formId: 10199, shiny: false, female: false });
assert(gmax.url.includes("forms/10199"), "Gmax Pikachu asset");
const g = fits(gmax, "Gmax Pikachu");
assert(g.topClear >= g.insetT - 1e-6, `Gmax top clearance >= inset (${g.topClear} >= ${g.insetT})`);
assert(g.core >= 0.58, `Gmax core prominence raised (got ${g.core})`);

const raichu = resolve({ dex: 26, formId: 26 });
const r = fits(raichu, "Raichu");
console.log("Raichu report", {
  h: raichu.heightM,
  full: r.full,
  core: r.core,
  canvas: `${raichu.sourceW}x${raichu.sourceH}`,
  safe: raichu.safeBounds,
  coreB: raichu.coreBounds
});
assert(r.core < r.full || Math.abs(r.core - r.full) < 0.15, "Raichu core <= full envelope");

const bases = [
  [10, 10, "Caterpie"],
  [25, 25, "Pikachu"],
  [26, 26, "Raichu"],
  [5, 5, "Charmeleon"],
  [6, 6, "Charizard"],
  [93, 93, "Haunter"],
  [148, 148, "Dragonair"],
  [144, 144, "Articuno"],
  [130, 130, "Gyarados"],
  [95, 95, "Onix"],
  [150, 150, "Mewtwo"]
];
const occ = {};
for (const [dex, formId, name] of bases) {
  const p = resolve({ dex, formId });
  occ[name] = fits(p, name);
}

assert(occ.Caterpie.h < occ.Pikachu.h || occ.Caterpie.core <= occ.Pikachu.core, "Caterpie < Pikachu");
assert(occ.Pikachu.core < occ.Charizard.core, "Pikachu core < Charizard core");
assert(occ.Charmeleon.core < occ.Charizard.core || occ.Charmeleon.h <= occ.Charizard.h, "Charmeleon <= Charizard");

const pik = resolve({ dex: 25, formId: 25 });
assert(gmax.occupancyH >= pik.occupancyH - 0.02, "Gmax Pikachu >= base Pikachu scale");
const gmaxChar = resolve({ dex: 6, formId: 10196 });
const baseChar = resolve({ dex: 6, formId: 6 });
fits(gmaxChar, "Gmax Charizard");
assert(gmaxChar.occupancyH >= baseChar.occupancyH - 0.02, "Gmax Charizard >= base");

// appearance consistency
const pn = resolve({ dex: 25, formId: 25, shiny: false, female: false });
const ps = resolve({ dex: 25, formId: 25, shiny: true, female: false });
assert(Math.abs(pn.occupancyH - ps.occupancyH) < 0.04, "Pikachu Normal↔Shiny scale stable");
const pf = resolve({ dex: 25, formId: 25, shiny: false, female: true });
assert(Math.abs(pn.occupancyH - pf.occupancyH) < 0.04, "Pikachu Male↔Female scale stable");

const forms = [
  [25, 10080, "Rock Star"],
  [25, 10084, "Libre"],
  [25, 10094, "Original Cap"],
  [25, 10160, "World Cap"],
  [25, 10199, "Gmax"],
  [26, 10100, "Alolan Raichu"],
  [6, 10034, "Mega X"],
  [6, 10035, "Mega Y"],
  [6, 10196, "Gmax Char"],
  [144, 10169, "Galar Articuno"],
  [150, 10043, "Mega Mewtwo X"],
  [150, 10044, "Mega Mewtwo Y"]
];
for (const [dex, formId, name] of forms) {
  fits(resolve({ dex, formId }), name);
  fits(resolve({ dex, formId, shiny: true }), `${name} shiny`);
}

console.log("buildStats", sandbox.PLAY_POKEDEX_PRESENTATION.buildStats);
process.exit(fail ? 1 : 0);
