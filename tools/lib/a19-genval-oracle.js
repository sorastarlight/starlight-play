/**
 * Offline oracle for A19-GENVAL fixture-mode rolls and level-up slices.
 * Mirrors private.streamlink_fixture_u32 / level-up ORDER BY in SQL.
 * Runtime catch paths must not import this until A19-WIRE.
 */
const crypto = require("crypto");
const { loadPin, formById, speciesByDex, levelUpSlice } = require("./gen9-ref");

const CONTENT_BUILD = "sl-ref-20261013-227b573";

function fixtureU32(seed, label) {
  const hex = crypto.createHash("md5").update(String(seed) + "\x1f" + String(label), "utf8").digest("hex");
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

function genderFromRate(genderRate, roll) {
  const rate = Number(genderRate);
  if (rate === -1) return "Genderless";
  if (rate === 0) return "Male";
  if (rate === 8) return "Female";
  return (roll % 8) < rate ? "Female" : "Male";
}

function hpMax(base, iv, ev, level) {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

function expectedGenerate(pin, formId, level, seed) {
  const form = formById(pin, formId);
  const species = form ? speciesByDex(pin, form.dex) : null;
  const slice = levelUpSlice(pin, formId, level);
  const ordinary = pin.formAbilities
    .filter((row) => Number(row.formId) === Number(formId) && (row.slot === "1" || row.slot === "2"))
    .sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
  const pick = ordinary.length ? ordinary[fixtureU32(seed, "ability") % ordinary.length] : null;
  return {
    form,
    species,
    slice,
    natureId: (fixtureU32(seed, "nature") % 25) + 1,
    ivs: {
      hp: fixtureU32(seed, "iv-hp") % 32,
      atk: fixtureU32(seed, "iv-atk") % 32,
      def: fixtureU32(seed, "iv-def") % 32,
      spa: fixtureU32(seed, "iv-spa") % 32,
      spd: fixtureU32(seed, "iv-spd") % 32,
      spe: fixtureU32(seed, "iv-spe") % 32
    },
    abilityId: pick ? Number(pick.abilityId) : null,
    abilitySlot: pick ? String(pick.slot) : null,
    gender: species ? genderFromRate(species.genderRate, fixtureU32(seed, "gender")) : null,
    friendship: species && Number(species.baseFriendship) === 70 ? 50 : species ? Number(species.baseFriendship) : null,
    hpMax: form && slice.ok ? hpMax(form.hp, fixtureU32(seed, "iv-hp") % 32, 0, level) : null,
    moveIds: slice.ok ? slice.moves.map((row) => Number(row.moveId)) : []
  };
}

function moveSlotsFromIds(pin, formId, moveIds, method) {
  const form = formById(pin, formId);
  return (moveIds || []).map((moveId) => {
    const move = pin.moves.find((row) => Number(row.moveId) === Number(moveId));
    return {
      moveId: Number(moveId),
      pp: move?.pp ?? null,
      ppMax: move?.pp ?? null,
      method: method || "level-up",
      versionGroup: form?.learnsetVersionGroup || null
    };
  });
}

function assertMonFromFixture(pin, row) {
  const mon = row.mon;
  const form = formById(pin, mon.formId);
  return {
    contentBuild: row.contentBuild === null ? null : CONTENT_BUILD,
    rulesetId: "streamlink-gen9-xgen",
    formId: mon.formId,
    dex: mon.dex,
    level: mon.level,
    natureId: mon.natureId,
    abilityId: mon.abilityId,
    abilitySlot: mon.abilitySlot,
    ivs: mon.ivs,
    evs: mon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moveSlots: mon.moveIds == null ? [] : moveSlotsFromIds(pin, mon.formId, mon.moveIds, mon.moveMethod || "level-up"),
    gender: mon.gender,
    friendship: mon.friendship,
    hiddenGrant: mon.hiddenGrant === true,
    heldItem: null
  };
}

module.exports = {
  CONTENT_BUILD,
  fixtureU32,
  genderFromRate,
  hpMax,
  expectedGenerate,
  moveSlotsFromIds,
  assertMonFromFixture,
  loadPin
};
