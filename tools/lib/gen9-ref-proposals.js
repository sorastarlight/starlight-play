/**
 * A19-REF readiness proposals. Review helpers only.
 * Does not change the pin, the resolver, or live legality.
 * authorized is always false until a later owner decision.
 */
const { formById, speciesByDex } = require("./gen9-ref");

const GMAX_FORM_IDS = [10195, 10196, 10197, 10198, 10199, 10200, 10201, 10202, 10203, 10204, 10205, 10206];
const CHAMPIONS_MEGA_IDS = [10278, 10279, 10280, 10281];

const CHAMPIONS_MEGA_META = {
  10278: { slug: "clefable", abilityId: 156, abilitySlug: "magic-bounce" },
  10279: { slug: "victreebel", abilityId: 215, abilitySlug: "innards-out" },
  10280: { slug: "starmie", abilityId: 37, abilitySlug: "huge-power" },
  10281: { slug: "dragonite", abilityId: 136, abilitySlug: "multiscale" }
};

function baseFormForDex(pin, dex) {
  return pin.forms.find((row) => Number(row.dex) === Number(dex) && row.isBase) || null;
}

function exceptionFor(pin, formId) {
  return pin.exceptions.find((row) => Number(row.formId) === Number(formId)) || null;
}

/**
 * Gen VIII/IX starting friendship from a PokéAPI historical pin value.
 * 70 → 50. Other values kept. Stunfisk/Timburr exceptions are out of Kanto v1.
 */
function proposedStreamlinkFriendship(pokeapiBaseFriendship) {
  const n = Number(pokeapiBaseFriendship);
  if (!Number.isFinite(n)) return { ok: false, reason: "invalid", authorized: false };
  return {
    ok: true,
    authorized: false,
    pokeapiValue: n,
    streamlinkValue: n === 70 ? 50 : n,
    rule: n === 70 ? "gen8-9-default-70-to-50" : "keep-non-default-pin-value"
  };
}

function proposedFriendshipForDex(pin, dex) {
  const species = speciesByDex(pin, dex);
  if (!species) return { ok: false, reason: "unknown-species", authorized: false };
  return {
    ...proposedStreamlinkFriendship(species.baseFriendship),
    dex: Number(dex),
    slug: species.slug
  };
}

/**
 * Gigantamax has no own PokéAPI learnset rows. That is not the same as
 * "cannot have moves." Official SWSH: Gmax is a battle transform; the
 * Pokémon keeps its moves. Proposal shares the already-resolved Kantonian
 * base learnset. Does not invent moves. Not authorized.
 */
function proposedGmaxLearnset(pin, gmaxFormId) {
  const form = formById(pin, gmaxFormId);
  if (!form || form.kind !== "gigantamax") {
    return { ok: false, reason: "not-gmax", authorized: false, moves: [] };
  }
  const ownRows = pin.learnsets.filter((row) => Number(row.formId) === Number(gmaxFormId));
  if (ownRows.length) {
    return { ok: false, reason: "unexpected-own-learnset-rows", authorized: false, moves: [] };
  }
  const base = baseFormForDex(pin, form.dex);
  if (!base || base.learnsetStatus !== "resolved" || !base.learnsetVersionGroup) {
    return { ok: false, reason: "base-unresolved", authorized: false, moves: [] };
  }
  const ex = exceptionFor(pin, base.formId);
  const swshOnBase = !!(ex && Array.isArray(ex.versionGroupsPresent) && ex.versionGroupsPresent.includes("sword-shield"));
  return {
    ok: true,
    authorized: false,
    proposal: "gmax-transform-shares-resolved-base",
    gmaxFormId: Number(gmaxFormId),
    sharedWithFormId: Number(base.formId),
    inheritedInventedMoves: false,
    versionGroup: base.learnsetVersionGroup,
    resolution: base.learnsetResolution,
    swshAvailableOnBase: swshOnBase,
    note: "Battle-only G-Max Moves are out of scope until a battle system exists."
  };
}

/**
 * Z-A / Champions megas. Pin has form stats and one ability, plus a
 * champions version-group marker, but no extracted learnset rows.
 * Do not fabricate scarlet-violet or sword-shield rows for the mega id.
 * Recommended: persist the base individual; mega is a transform.
 */
function proposedChampionsMega(pin, formId) {
  const form = formById(pin, formId);
  const meta = CHAMPIONS_MEGA_META[Number(formId)];
  if (!form || !meta || form.kind !== "mega") {
    return { ok: false, reason: "not-champions-mega", authorized: false };
  }
  const ownRows = pin.learnsets.filter((row) => Number(row.formId) === Number(formId));
  const ex = exceptionFor(pin, formId);
  const base = baseFormForDex(pin, form.dex);
  const present = (ex && ex.versionGroupsPresent) || [];
  return {
    ok: true,
    authorized: false,
    proposal: "fail-closed-mega-is-transform-of-base",
    formId: Number(formId),
    dex: form.dex,
    slug: meta.slug,
    pinLearnsetStatus: form.learnsetStatus,
    pinLearnsetRows: ownRows.length,
    versionGroupsPresent: present,
    hasChampionsMarker: present.includes("champions"),
    hasSvRows: present.includes("scarlet-violet"),
    hasSwshRows: present.includes("sword-shield"),
    hasOrasRows: present.includes("omega-ruby-alpha-sapphire"),
    abilityId: meta.abilityId,
    abilitySlug: meta.abilitySlug,
    baseFormId: base ? Number(base.formId) : null,
    baseLearnsetStatus: base ? base.learnsetStatus : null,
    baseVersionGroup: base ? base.learnsetVersionGroup : null,
    note: "Do not copy champions rows into a wild SV/SWSH slice. Champions is a battle-sim catalog."
  };
}

module.exports = {
  GMAX_FORM_IDS,
  CHAMPIONS_MEGA_IDS,
  CHAMPIONS_MEGA_META,
  proposedStreamlinkFriendship,
  proposedFriendshipForDex,
  proposedGmaxLearnset,
  proposedChampionsMega,
  baseFormForDex
};
