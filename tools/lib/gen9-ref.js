/**
 * Offline Gen IX reference pin loader and learnset helpers.
 * Runtime catch paths must not import this until A19-WIRE. Tests and the
 * build tool may. Never fetches the network.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PIN_DIR = path.join(__dirname, "..", "..", "data", "gen9-ref");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(PIN_DIR, name), "utf8"));
}

function sha256File(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

function loadPin() {
  const meta = readJson("meta.json");
  const manifest = readJson("manifest.json");
  return {
    meta,
    manifest,
    natures: readJson("natures.json"),
    species: readJson("species.json"),
    forms: readJson("forms.json"),
    abilities: readJson("abilities.json"),
    formAbilities: readJson("form-abilities.json"),
    moves: readJson("moves.json"),
    learnsets: readJson("learnsets.json"),
    evolutions: readJson("evolutions.json"),
    obtain: readJson("obtain.json"),
    exceptions: readJson("exceptions.json"),
    coverage: readJson("coverage.json")
  };
}

function verifyManifest(pin) {
  const errors = [];
  const files = pin.manifest.files || {};
  for (const [name, expected] of Object.entries(files)) {
    if (name === "manifest.json") continue;
    const abs = path.join(PIN_DIR, name);
    if (!fs.existsSync(abs)) {
      errors.push(`missing ${name}`);
      continue;
    }
    const actual = sha256File(abs);
    if (actual !== expected) errors.push(`${name} checksum mismatch`);
  }
  return errors;
}

function formById(pin, formId) {
  return pin.forms.find((row) => Number(row.formId) === Number(formId)) || null;
}

function speciesByDex(pin, dex) {
  return pin.species.find((row) => Number(row.dex) === Number(dex)) || null;
}

function learnsetRows(pin, formId) {
  const form = formById(pin, formId);
  if (!form || form.learnsetStatus !== "resolved" || !form.learnsetVersionGroup) return [];
  return pin.learnsets.filter((row) => (
    Number(row.formId) === Number(formId)
    && row.versionGroup === form.learnsetVersionGroup
  ));
}

/**
 * Legal wild slice: last 4 level-up moves at or below level from the
 * chosen version-group only. Never invents Tackle. Fails closed.
 */
function levelUpSlice(pin, formId, level) {
  const form = formById(pin, formId);
  if (!form) return { ok: false, reason: "unknown-form", moves: [] };
  if (form.learnsetStatus !== "resolved") {
    return { ok: false, reason: "unresolved-learnset", moves: [] };
  }
  const rows = learnsetRows(pin, formId)
    .filter((row) => row.method === "level-up" && Number(row.level) <= Number(level))
    .sort((a, b) => Number(a.level) - Number(b.level) || Number(a.order) - Number(b.order) || Number(a.moveId) - Number(b.moveId));
  const last = rows.slice(-4);
  const moves = last.map((row) => {
    const move = pin.moves.find((m) => Number(m.moveId) === Number(row.moveId));
    return {
      moveId: Number(row.moveId),
      name: move?.slug || null,
      pp: move?.pp ?? null,
      level: Number(row.level),
      method: "level-up",
      versionGroup: form.learnsetVersionGroup
    };
  });
  return { ok: true, reason: "resolved", moves };
}

module.exports = {
  PIN_DIR,
  loadPin,
  verifyManifest,
  formById,
  speciesByDex,
  learnsetRows,
  levelUpSlice,
  sha256File
};
