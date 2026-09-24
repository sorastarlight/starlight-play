/* node tools/qa-pokedex-presentation.js — offline resolver smoke */
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
    addEventListener() {},
    querySelector() { return null; }
  },
  window: null,
  HTMLImageElement: function HTMLImageElement() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), "utf8");
  vm.runInNewContext(code, sandbox, { filename: rel });
}

load("js/variants.js");
load("js/forms.js");
load("js/species.js");

// Minimal play helpers (subset of game.js)
sandbox.playFormMeta = function playFormMeta(formId) {
  const f = sandbox.PLAY_FORMS?.[formId] || sandbox.PLAY_FORMS?.[String(formId)];
  return f || null;
};
sandbox.playFormId = function playFormId(dex, formId) {
  const id = Number(formId || dex);
  return id || Number(dex);
};
sandbox.playAllowedVariants = function playAllowedVariants(dex) {
  return sandbox.PLAY_VARIANTS?.[dex] || sandbox.PLAY_VARIANTS?.[String(dex)] || ["normal"];
};
sandbox.playSpriteStem = function playSpriteStem(dex, variant, formId) {
  const id = Number(dex);
  const resolvedForm = sandbox.playFormId(id, formId);
  const formMeta = sandbox.playFormMeta(resolvedForm);
  const useFormStem = formMeta && !formMeta.isBase && resolvedForm && resolvedForm !== id;
  let kind = String(variant || "normal").toLowerCase();
  const allowed = new Set(sandbox.playAllowedVariants(id));
  const shiny = kind.includes("shiny");
  const wantsFemale = kind.includes("female");
  const female = !useFormStem && wantsFemale && (allowed.has("female") || allowed.has("shiny-female"));
  if (useFormStem) {
    if (shiny && female) return `forms/shiny/female/${resolvedForm}`;
    if (female) return `forms/female/${resolvedForm}`;
    if (shiny) return `forms/shiny/${resolvedForm}`;
    return `forms/${resolvedForm}`;
  }
  if (shiny && female) return `shiny/female/${id}`;
  if (female) return `female/${id}`;
  if (shiny) return `shiny/${id}`;
  return String(id);
};
sandbox.playSpriteUrl = function playSpriteUrl(dex, variant, formId) {
  const stem = sandbox.playSpriteStem(dex, variant, formId);
  const ext = (sandbox.PLAY_SPRITE_EXT && sandbox.PLAY_SPRITE_EXT[stem]) || "gif";
  return `images/pokemon/${stem}.${ext}`;
};

load("js/pokedex-presentation.js");
load("js/pokedex-presentation-resolve.js");
load("js/pokedex-reference.js");

const resolve = sandbox.resolvePokedexPresentation;
const norm = sandbox.normalizePokedexAppearance;
let fail = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    fail += 1;
  } else {
    console.log("OK", msg);
  }
}

const combos = [
  ["pik male n", { dex: 25, formId: 25, shiny: false, female: false }, "images/pokemon/25.gif"],
  ["pik fem n", { dex: 25, formId: 25, shiny: false, female: true }, "images/pokemon/female/25.gif"],
  ["pik male s", { dex: 25, formId: 25, shiny: true, female: false }, "images/pokemon/shiny/25.gif"],
  ["pik fem s", { dex: 25, formId: 25, shiny: true, female: true }, "images/pokemon/shiny/female/25.gif"]
];
const urls = new Set();
for (const [label, opts, expect] of combos) {
  const r = resolve({ ...opts, heightM: 0.4 });
  assert(r.url.split("?")[0] === expect, `${label} → ${r.url}`);
  assert(r.identity.variant === (opts.shiny && opts.female ? "shiny-female" : opts.shiny ? "shiny" : opts.female ? "female" : "normal"), `${label} variant`);
  urls.add(r.url.split("?")[0]);
}
assert(urls.size === 4, "Pikachu 4 distinct assets");

const charF = norm({ dex: 6, formId: 6, shiny: false, female: true });
assert(charF.female === false && charF.variant === "normal", "Charizard no false female");
const charSF = norm({ dex: 6, formId: 6, shiny: true, female: true });
assert(charSF.female === false && charSF.shiny === true && charSF.variant === "shiny", "Charizard shiny+female normalizes to shiny");

const mega = resolve({ dex: 6, formId: 10034, shiny: true, female: false, heightM: 1.7 });
assert(mega.url.includes("forms/shiny/10034"), "Mega X shiny path");

const rock = resolve({ dex: 25, formId: 10080, shiny: true, female: true, heightM: 0.4 });
assert(rock.url.includes("forms/shiny/10080") && rock.identity.female === false, "Cosplay forces form stem, not female path");

const scales = [
  [10, 0.3], [25, 0.4], [5, 1.1], [6, 1.7], [95, 8.8], [130, 6.5]
].map(([dex, h]) => ({ dex, h, occ: resolve({ dex, formId: dex, heightM: h }).occupancyH }));
console.log("scales", scales);
assert(scales[0].occ < scales[1].occ, "Caterpie < Pikachu");
assert(scales[1].occ < scales[2].occ, "Pikachu < Charmeleon");
assert(scales[2].occ < scales[3].occ, "Charmeleon < Charizard");
assert(scales[3].occ < scales[4].occ, "Charizard < Onix");
assert(Math.abs(scales[1].occ - scales[3].occ) > 0.12, "Pikachu vs Charizard not uniform");

const gmax = resolve({ dex: 6, formId: 10196, heightM: 28 });
const base = resolve({ dex: 6, formId: 6, heightM: 1.7 });
assert(gmax.occupancyH > base.occupancyH, "Gmax larger than base Charizard");

process.exit(fail ? 1 : 0);
