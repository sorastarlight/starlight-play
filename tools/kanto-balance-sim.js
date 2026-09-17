#!/usr/bin/env node
/* Developer-only seeded Kanto economy / capture simulator. Not player-facing. */
"use strict";

const { buildSpecies } = require("./kanto-balance-data");

const DAYS = [30, 60, 90, 180];
const DEX_MARKS = [25, 50, 75, 100, 125, 140, 150, 151];
const DUP_MARKS = [25, 50, 75, 100, 125, 140];

const PRICES = {
  pokeball: 100, greatball: 225, ultraball: 500, nestball: 275, netball: 300,
  diveball: 300, lureball: 300, duskball: 325, fastball: 325, heavyball: 325,
  moonball: 325, repeatball: 350, quickball: 350, timerball: 300, levelball: 300,
  loveball: 300, beastball: 225, dreamball: 350, safariball: 125, sportball: 125,
  berry: 60, oran: 60, nanab: 60, razz: 200, sitrus: 150, lum: 150, pinap: 175,
  silverpinap: 400, goldenrazz: 500, bait: 125, lure: 80, pouch10: 120,
  firestone: 350, waterstone: 350, thunderstone: 350, leafstone: 350, moonstone: 450,
  linkingcord: 600
};

const BERRIES = {
  berry: { mult: 1.05, reward: 0, price: 60 },
  nanab: { mult: 1.05, reward: 0, price: 60 },
  razz: { mult: 1.15, reward: 0, price: 200 },
  sitrus: { mult: 1.1, reward: 0, price: 150 },
  lum: { mult: 1.1, reward: 0, price: 150 },
  pinap: { mult: 1.05, reward: 0.5, price: 175 },
  silverpinap: { mult: 1.2, reward: 0.25, price: 400 },
  goldenrazz: { mult: 1.3, reward: 0, price: 500 }
};

const HONEY_TIERS = [
  { minRate: 1, multiplier: 1.22 },
  { minRate: 0.81, multiplier: 1.18 },
  { minRate: 0.61, multiplier: 1.14 },
  { minRate: 0.41, multiplier: 1.1 },
  { minRate: 0.21, multiplier: 1.06 },
  { minRate: 0.01, multiplier: 1.03 },
  { minRate: 0, multiplier: 1 }
];

const BASE_TIERS = [
  { minCatchRate: 201, chance: 0.34 },
  { minCatchRate: 151, chance: 0.3 },
  { minCatchRate: 101, chance: 0.25 },
  { minCatchRate: 76, chance: 0.21 },
  { minCatchRate: 46, chance: 0.16 },
  { minCatchRate: 26, chance: 0.11 },
  { minCatchRate: 10, chance: 0.07 },
  { minCatchRate: 1, chance: 0.04 }
];

const BAND_WEIGHTS = { COMMON: 50, UNCOMMON: 28, RARE: 15, VERY_RARE: 5, ULTRA_RARE: 2, LEGENDARY: 0, EVENT: 0 };

const DEX_MILESTONES = [
  { species: 10, grants: { greatball: 5 } },
  { species: 25, grants: { bait: 2, coins: 500 } },
  { species: 50, grants: { ultraball: 3 } },
  { species: 75, grants: { firestone: 1, waterstone: 1, thunderstone: 1 } },
  { species: 100, grants: { ultraball: 1, goldenrazz: 2 } },
  { species: 125, grants: { linkingcord: 1 } },
  { species: 140, grants: { razz: 3, sitrus: 2 } },
  { species: 150, grants: { ultraball: 5, goldenrazz: 3, linkingcord: 1 } },
  { species: 151, grants: { coins: 2500, masterball: 1 } }
];

const BITS_PACKS = {
  baseline: {
    starter: { bits: 100, grants: { bait: 3, berry: 4, pokeball: 8, bag_bonus: 10, greatball: 4, ultraball: 1 } },
    pantry: { bits: 150, grants: { bait: 8, berry: 10, bag_bonus: 10, greatball: 4 } },
    great: { bits: 200, grants: { bait: 3, berry: 4, pokeball: 5, bag_bonus: 10, greatball: 8, ultraball: 1 } },
    pouch: { bits: 250, grants: { bag_bonus: 20 } },
    ultra: { bits: 300, grants: { bait: 3, lure: 1, berry: 4, pokeball: 6, bag_bonus: 20, greatball: 6, ultraball: 8 } }
  },
  v1: {
    starter: { bits: 100, grants: { bait: 2, berry: 4, pokeball: 6, greatball: 2 } },
    pantry: { bits: 150, grants: { bait: 8, berry: 8, razz: 2 } },
    great: { bits: 200, grants: { bait: 3, berry: 3, pokeball: 5, greatball: 4, nestball: 2 } },
    pouch: { bits: 250, grants: { pokeball: 8, berry: 6, bait: 4, lure: 1, duskball: 2 } },
    ultra: { bits: 300, grants: { bait: 3, berry: 4, pokeball: 6, greatball: 3, ultraball: 2, lure: 1 } },
    community: { bits: 175, grants: { bait: 8, berry: 4, pokeball: 4 } }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBalance(kind) {
  const v1 = kind === "v1";
  return {
    kind,
    throwContext: v1,
    pinapReward: v1 ? 2 : 0.5,
    silverPinapReward: v1 ? 1.5 : 0.25,
    daily: v1 ? { pokeball: 3, berry: 1, coins: 40 } : { pokeball: 3, berry: 1, coins: 50 },
    passDaily: { berry: 2, bait: 1, coins: 20 },
    passWeekly: { pokeball: 5, berry: 3, lure: 1, coins: 150 },
    bagBonusCap: v1 ? 100 : 9950,
    beastBase: 0.75,
    packs: BITS_PACKS[kind],
    allowLegendaryAuto: false,
    baseTiers: v1 ? [
      { minCatchRate: 201, chance: 0.34 },
      { minCatchRate: 151, chance: 0.3 },
      { minCatchRate: 101, chance: 0.25 },
      { minCatchRate: 76, chance: 0.21 },
      { minCatchRate: 45, chance: 0.16 },
      { minCatchRate: 25, chance: 0.11 },
      { minCatchRate: 10, chance: 0.07 },
      { minCatchRate: 1, chance: 0.04 }
    ] : BASE_TIERS
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng, items, weightFn) {
  let total = 0;
  const weights = items.map((item) => {
    const w = Math.max(0, weightFn(item));
    total += w;
    return w;
  });
  if (total <= 0) return items[Math.floor(rng() * items.length)] || null;
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function dist(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mean = sorted.reduce((s, n) => s + n, 0) / Math.max(sorted.length, 1);
  return {
    p10: round1(percentile(sorted, 10)),
    p50: round1(percentile(sorted, 50)),
    p90: round1(percentile(sorted, 90)),
    mean: round1(mean)
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function baseChance(cr, tiers) {
  const list = tiers || BASE_TIERS;
  for (const tier of list) {
    if (cr >= tier.minCatchRate) return tier.chance;
  }
  return 0.16;
}

function honeyMultiplier(contributors, participants) {
  const rate = Math.min(1, Math.max(0, contributors) / Math.max(participants, 1));
  for (const tier of HONEY_TIERS) {
    if (rate >= tier.minRate) return { rate, multiplier: tier.multiplier };
  }
  return { rate, multiplier: 1 };
}

function ballModifier(ball, species, ctx) {
  const owns = Boolean(ctx.owns);
  const progress = ctx.throwProgress == null ? 0.5 : ctx.throwProgress;
  const level = ctx.trainerLevel || 1;
  const gender = String(ctx.gender || "").toLowerCase();
  const wired = Boolean(ctx.throwContext);
  let mult = 1;
  let met = false;
  if (ball === "masterball") return { multiplier: 1, met: true, guaranteed: true };
  if (ball === "pokeball" || ball === "premierball") return { multiplier: 1, met: false, guaranteed: false };
  if (ball === "greatball") return { multiplier: 1.25, met: false, guaranteed: false };
  if (ball === "ultraball") return { multiplier: 1.5, met: false, guaranteed: false };
  if (ball === "safariball" || ball === "sportball") return { multiplier: 1.1, met: false, guaranteed: false };
  if (ball === "beastball") return { multiplier: 0.75, met: false, guaranteed: false };
  if (ball === "dreamball") return { multiplier: 1, met: false, guaranteed: false };
  if (ball === "netball") {
    met = species.types.some((t) => t === "bug" || t === "water");
    mult = met ? 1.55 : 1;
  } else if (ball === "diveball" || ball === "lureball") {
    met = species.types.includes("water");
    mult = met ? 1.5 : 1;
  } else if (ball === "nestball") {
    met = species.cr >= 151;
    mult = met ? 1.45 : 1;
  } else if (ball === "duskball") {
    met = Boolean(ctx.night);
    mult = met ? 1.5 : 1;
  } else if (ball === "fastball") {
    met = species.spd >= 100;
    mult = met ? 1.55 : 1;
  } else if (ball === "heavyball") {
    if (species.kg >= 200) { met = true; mult = 1.55; }
    else if (species.kg >= 100) { met = true; mult = 1.3; }
    else mult = 1;
  } else if (ball === "moonball") {
    met = Boolean(species.moon);
    mult = met ? 1.6 : 1;
  } else if (ball === "repeatball") {
    met = owns;
    mult = met ? 1.55 : 1;
  } else if (ball === "quickball") {
    met = wired && progress <= 0.34;
    mult = met ? 1.55 : 1;
  } else if (ball === "timerball") {
    met = wired && progress >= 0.66;
    mult = met ? 1.5 : 1;
  } else if (ball === "levelball") {
    met = wired && level >= 8;
    mult = met ? 1.4 : 1;
  } else if (ball === "loveball") {
    met = wired && (gender === "male" || gender === "female");
    mult = met ? 1.4 : 1;
  }
  return { multiplier: mult, met, guaranteed: false };
}

function berryModifier(key, balance) {
  if (!key) return { multiplier: 1, reward: 0 };
  const berry = BERRIES[key] || BERRIES.berry;
  let reward = berry.reward;
  if (key === "pinap") reward = balance.pinapReward;
  if (key === "silverpinap") reward = balance.silverPinapReward;
  return { multiplier: berry.mult, reward };
}

function captureChance(species, ball, berryKey, honey, contributed, ctx, balance) {
  const base = baseChance(species.cr, balance && balance.baseTiers);
  const ballM = ballModifier(ball, species, ctx);
  const berryM = berryModifier(berryKey, balance);
  const honeyM = honeyMultiplier(honey.contributors, honey.participants);
  const contrib = contributed ? 1.03 : 1;
  const raw = base * ballM.multiplier * berryM.multiplier * honeyM.multiplier * contrib;
  const final = ballM.guaranteed ? 1 : Math.min(0.85, Math.max(0.02, raw));
  return { base, raw, final, ball: ballM, berry: berryM, honey: honeyM, guaranteed: ballM.guaranteed };
}

function candyForStage(stage) {
  if (stage === 2) return 5;
  if (stage === 3) return 8;
  return 3;
}

function rarityCoinMult(cr) {
  if (cr <= 9) return 1.5;
  if (cr <= 25) return 1.35;
  if (cr <= 75) return 1.2;
  if (cr <= 150) return 1.1;
  return 1;
}

function xpForLevel(level) {
  return Math.max(1, Math.round(100 * Math.pow(Math.max(level, 1), 1.35)));
}

function xpToReach(level) {
  let total = 0;
  for (let i = 1; i < level; i += 1) total += xpForLevel(i);
  return total;
}

function trainerLevel(xp) {
  let lvl = 1;
  while (lvl < 100 && xp >= xpToReach(lvl + 1)) lvl += 1;
  return lvl;
}

function martValue(grants) {
  let total = 0;
  Object.entries(grants || {}).forEach(([key, qty]) => {
    const n = Number(qty) || 0;
    if (key === "bag_bonus") total += n * 12;
    else if (key === "berry") total += n * PRICES.berry;
    else if (PRICES[key] != null) total += n * PRICES[key];
  });
  return total;
}

function itemTotal(inv) {
  return (inv.pokeball || 0) + (inv.greatball || 0) + (inv.ultraball || 0)
    + (inv.berry || 0) + (inv.bait || 0) + (inv.lure || 0)
    + (inv.nestball || 0) + (inv.netball || 0) + (inv.duskball || 0)
    + (inv.repeatball || 0) + (inv.razz || 0) + (inv.pinap || 0)
    + (inv.sitrus || 0) + (inv.goldenrazz || 0)
    + Object.values(inv.stones || {}).reduce((s, n) => s + n, 0);
}

function bagCapacity(inv, pass) {
  return Math.min(10000, 50 + (inv.bag_bonus || 0) + (pass ? 25 : 0));
}

function grant(inv, grants, balance, pass) {
  const addBonus = Math.max(0, grants.bag_bonus || 0);
  const room = Math.max(0, (balance.bagBonusCap || 100) - (inv.bag_bonus || 0));
  const bonus = Math.min(addBonus, room);
  const next = { ...inv, stones: { ...(inv.stones || {}) }, bagBlocked: inv.bagBlocked || 0 };
  next.bag_bonus = (next.bag_bonus || 0) + bonus;
  const cap = bagCapacity(next, pass);
  let adding = 0;
  Object.entries(grants).forEach(([key, qty]) => {
    if (key === "coins" || key === "bag_bonus" || key === "masterball") return;
    adding += Number(qty) || 0;
  });
  if (itemTotal(next) + adding > cap) {
    next.bagBlocked += adding;
    return next;
  }
  Object.entries(grants).forEach(([key, qty]) => {
    const n = Number(qty) || 0;
    if (!n) return;
    if (key === "coins") next.coins += n;
    else if (key === "masterball") next.masterball += n;
    else if (["firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord"].includes(key)) {
      next.stones[key] = (next.stones[key] || 0) + n;
    } else if (key !== "bag_bonus") next[key] = (next[key] || 0) + n;
  });
  return next;
}

function take(inv, key, n) {
  if (["firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord"].includes(key)) {
    if ((inv.stones[key] || 0) < n) return false;
    inv.stones[key] -= n;
    return true;
  }
  if ((inv[key] || 0) < n) return false;
  inv[key] -= n;
  return true;
}

function buy(inv, key, n, spent) {
  const price = PRICES[key];
  if (price == null) return false;
  const cost = price * n;
  if (inv.coins < cost) return false;
  if (itemTotal(inv) + n > bagCapacity(inv, inv._pass)) return false;
  inv.coins -= cost;
  spent.coins += cost;
  if (["firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord"].includes(key)) {
    inv.stones[key] = (inv.stones[key] || 0) + n;
  } else inv[key] = (inv[key] || 0) + n;
  spent.purchases += n;
  spent.byItem[key] = (spent.byItem[key] || 0) + n;
  return true;
}

function restock(inv, spent) {
  if ((inv.pokeball || 0) < 4) buy(inv, "pokeball", 5, spent);
  if ((inv.berry || 0) < 2) buy(inv, "berry", 3, spent);
  if ((inv.greatball || 0) < 1 && inv.coins > 800) buy(inv, "greatball", 1, spent);
  if ((inv.ultraball || 0) < 1 && inv.coins > 1800) buy(inv, "ultraball", 1, spent);
}

function specialistFor(species, owns, ctx) {
  const options = [];
  const push = (ball, want) => {
    if (want) options.push(ball);
  };
  push("netball", species.types.includes("bug") || species.types.includes("water"));
  push("diveball", species.types.includes("water"));
  push("nestball", species.cr >= 151);
  push("duskball", ctx.night);
  push("fastball", species.spd >= 100);
  push("heavyball", species.kg >= 100);
  push("moonball", species.moon);
  push("repeatball", owns);
  if (ctx.throwContext) {
    push("quickball", ctx.throwProgress <= 0.34);
    push("timerball", ctx.throwProgress >= 0.66);
    push("levelball", (ctx.trainerLevel || 1) >= 8);
    push("loveball", ctx.gender === "male" || ctx.gender === "female");
  }
  options.sort((a, b) => {
    const am = ballModifier(a, species, ctx).multiplier;
    const bm = ballModifier(b, species, ctx).multiplier;
    const ae = PRICES[a] / am;
    const be = PRICES[b] / bm;
    return ae - be || PRICES[a] - PRICES[b];
  });
  return options[0] || null;
}

function chooseLoadout(inv, species, owns, ctx, honey, balance) {
  const poke = captureChance(species, "pokeball", "berry", honey, false, ctx, balance).final;
  const spec = specialistFor(species, owns, ctx);
  let ball = "pokeball";
  if (spec && (inv[spec] || 0) > 0 && ballModifier(spec, species, ctx).multiplier >= 1.4) ball = spec;
  else if (poke < 0.28 && (inv.ultraball || 0) > 0) ball = "ultraball";
  else if (poke < 0.4 && (inv.greatball || 0) > 0) ball = "greatball";
  else if ((inv.pokeball || 0) > 0) ball = "pokeball";
  else if ((inv.greatball || 0) > 0) ball = "greatball";
  else if ((inv.ultraball || 0) > 0) ball = "ultraball";
  else if (spec && (inv[spec] || 0) > 0) ball = spec;
  else return null;

  let berry = null;
  const afterBall = captureChance(species, ball, null, honey, false, ctx, balance).final;
  if (afterBall >= 0.55 && (inv.pinap || 0) > 0) berry = "pinap";
  else if (afterBall < 0.32 && (inv.goldenrazz || 0) > 0) berry = "goldenrazz";
  else if (afterBall < 0.4 && (inv.razz || 0) > 0) berry = "razz";
  else if ((inv.berry || 0) > 0) berry = "berry";

  const contrib = afterBall < 0.35 && (inv.bait || 0) > 0;
  return { ball, berry, contrib };
}

function applyPack(inv, pack, stats, pass, balance) {
  const before = inv.coins;
  const next = grant(inv, pack.grants, balance, pass);
  Object.assign(inv, next);
  stats.bits += pack.bits;
  stats.packMart += martValue(pack.grants);
  stats.packCoins = (stats.packCoins || 0) + (inv.coins - before);
}

function simulateOne(catalog, archetype, days, rng, balance) {
  const byDex = catalog.species;
  const bands = {};
  byDex.forEach((s) => {
    if (!bands[s.band]) bands[s.band] = [];
    bands[s.band].push(s);
  });
  const evosByFrom = new Map();
  catalog.evos.forEach((rule) => {
    if (!evosByFrom.has(rule.from)) evosByFrom.set(rule.from, []);
    evosByFrom.get(rule.from).push(rule);
  });
  let inv = {
    coins: 250, pokeball: 10, greatball: 1, ultraball: 0, berry: 3, bait: 0, lure: 0,
    nestball: 0, netball: 0, duskball: 0, repeatball: 0, razz: 0, pinap: 0, sitrus: 0, goldenrazz: 0,
    bag_bonus: 0, masterball: 0, bagBlocked: 0, stones: {}, _pass: archetype.pass
  };
  const candy = new Map();
  const owned = new Set();
  const counts = new Map();
  const mastery = new Map();
  const milestones = new Set();
  const spent = { coins: 0, purchases: 0, byItem: {} };
  const earned = { coins: 0, encounter: 0, capture: 0, newDex: 0, daily: 0, weekly: 0, pass: 0, achieve: 0 };
  const used = { balls: 0, berries: 0, honey: 0 };
  const dexAt = {};
  const dupAt = {};
  const packStats = { bits: 0, packMart: 0 };
  let xp = 0;
  let catches = 0;
  let shinies = 0;
  let evolutions = 0;
  let throws = 0;
  let escapes = 0;
  let joins = 0;
  let bagFullDays = 0;
  const recent = [];
  const streamsPerWeek = archetype.streamsPerWeek;
  const joinRate = archetype.joinRate;
  const encountersPerStream = 12;
  const availablePerDay = (streamsPerWeek / 7) * encountersPerStream;
  const honeyParticipants = archetype.chatSize;
  const honeyContribs = Math.max(0, Math.round(honeyParticipants * archetype.communityHoneyRate));

  function maybeEvolve() {
    owned.forEach((dex) => {
      const rules = evosByFrom.get(dex) || [];
      rules.forEach((rule) => {
        if (owned.has(rule.to)) return;
        const fam = byDex[dex - 1].fam;
        const have = candy.get(fam) || 0;
        if (have < rule.candy) return;
        if (rule.item && !(inv.stones[rule.item] > 0)) {
          if (inv.coins > PRICES[rule.item] + 400) buy(inv, rule.item, 1, spent);
        }
        if (rule.item && !(inv.stones[rule.item] > 0)) return;
        candy.set(fam, have - rule.candy);
        if (rule.item) inv.stones[rule.item] -= 1;
        owned.add(rule.to);
        counts.set(rule.to, (counts.get(rule.to) || 0) + 1);
        evolutions += 1;
        xp += 10;
        if (!owned.has(rule.to)) {
          /* already added */
        }
      });
    });
  }

  for (let day = 1; day <= days; day += 1) {
    const beforeItems = itemTotal(inv);
    inv = grant(inv, {
      pokeball: balance.daily.pokeball,
      berry: balance.daily.berry,
      coins: balance.daily.coins
    }, balance, archetype.pass);
    earned.coins += balance.daily.coins;
    earned.daily += balance.daily.coins;
    if (archetype.pass) {
      inv = grant(inv, { berry: balance.passDaily.berry, bait: balance.passDaily.bait, coins: balance.passDaily.coins }, balance, true);
      earned.coins += balance.passDaily.coins;
      earned.pass += balance.passDaily.coins;
      if (day % 7 === 0) {
        inv = grant(inv, balance.passWeekly, balance, true);
        earned.coins += balance.passWeekly.coins;
        earned.weekly += balance.passWeekly.coins;
        earned.pass += balance.passWeekly.coins;
      }
    }
    if (itemTotal(inv) <= beforeItems && balance.daily.pokeball > 0) bagFullDays += 1;

    (archetype.bits || []).forEach((plan) => {
      if (day % plan.everyDays === 0) {
        const pack = balance.packs[plan.sku];
        if (pack) applyPack(inv, pack, packStats, archetype.pass, balance);
      }
    });

    const expectedEnc = availablePerDay * joinRate;
    const extra = rng() < (expectedEnc % 1) ? 1 : 0;
    const todayEnc = Math.floor(expectedEnc) + extra;
    for (let e = 0; e < todayEnc; e += 1) {
      const usableBands = Object.keys(BAND_WEIGHTS).filter((band) => {
        if ((BAND_WEIGHTS[band] || 0) <= 0) return false;
        if (band === "LEGENDARY" || band === "EVENT") return balance.allowLegendaryAuto;
        return (bands[band] || []).length > 0;
      });
      const band = pickWeighted(rng, usableBands, (b) => BAND_WEIGHTS[b]);
      const pool = bands[band] || [];
      const species = pickWeighted(rng, pool, (s) => {
        let w = s.cr;
        if (recent[0] === s.dex) w = 0;
        if (recent.includes(s.dex)) w *= 0.25;
        const famHit = recent.some((d) => byDex[d - 1].fam === s.fam);
        if (famHit) w *= 0.6;
        return w;
      });
      if (!species) continue;
      recent.unshift(species.dex);
      if (recent.length > 8) recent.pop();
      joins += 1;
      xp += 5;
      earned.coins += 25;
      earned.encounter += 25;
      inv.coins += 25;

      const shiny = rng() < (1 / 4096);
      const gendered = !species.genderless;
      const gender = gendered ? (rng() < 0.5 ? "female" : "male") : "";
      const night = rng() < 0.35;
      const owns = owned.has(species.dex);
      const ctx = {
        owns,
        throwContext: balance.throwContext,
        throwProgress: 0.5,
        trainerLevel: trainerLevel(xp),
        gender,
        night
      };
      if (balance.throwContext) ctx.throwProgress = rng() < 0.5 ? 0.2 : 0.8;
      const honey = { contributors: honeyContribs + 0, participants: Math.max(honeyParticipants, 1) };
      restock(inv, spent);
      const loadout = chooseLoadout(inv, species, owns, ctx, honey, balance);
      if (!loadout || !take(inv, loadout.ball, 1)) continue;
      throws += 1;
      used.balls += 1;
      if (loadout.berry) {
        take(inv, loadout.berry === "berry" ? "berry" : loadout.berry, 1);
        used.berries += 1;
      }
      let contributed = false;
      if (loadout.contrib && take(inv, "bait", 1)) {
        contributed = true;
        used.honey += 1;
        honey.contributors += 1;
      }
      const chance = captureChance(species, loadout.ball, loadout.berry, honey, contributed, ctx, balance);
      if (rng() >= chance.final) {
        escapes += 1;
        continue;
      }
      catches += 1;
      if (shiny) shinies += 1;
      const first = !owned.has(species.dex);
      owned.add(species.dex);
      counts.set(species.dex, (counts.get(species.dex) || 0) + 1);
      mastery.set(species.dex, (mastery.get(species.dex) || 0) + (shiny ? 4 : 1));
      if (species.candy) candy.set(species.fam, (candy.get(species.fam) || 0) + candyForStage(species.stage));
      const capCoins = Math.round(25 * rarityCoinMult(species.cr));
      let rewardExtra = 0;
      if (loadout.berry) rewardExtra = Math.floor((chance.berry.reward || 0) * 10);
      let payout = capCoins + rewardExtra;
      if (first) payout += 100;
      if (shiny && (counts.get(species.dex) === 1 || first)) payout += 250;
      if (species.leg) payout += 350;
      inv.coins += payout;
      earned.coins += payout;
      earned.capture += capCoins + rewardExtra;
      if (first) earned.newDex += 100;
      xp += 10;
      if (first) xp += 25;
      if (shiny) xp += 50;
      const unique = owned.size;
      DEX_MARKS.forEach((mark) => {
        if (dexAt[mark] == null && unique >= mark) dexAt[mark] = { day, encounters: joins };
      });
      DUP_MARKS.forEach((mark) => {
        if (dupAt[mark] == null && unique >= mark) {
          dupAt[mark] = catches ? (catches - unique) / catches : 0;
        }
      });
      DEX_MILESTONES.forEach((row) => {
        if (unique >= row.species && !milestones.has(row.species)) {
          milestones.add(row.species);
          inv = grant(inv, row.grants, balance, archetype.pass);
          const coins = row.grants.coins || 0;
          earned.coins += coins;
          earned.achieve += coins;
        }
      });
      maybeEvolve();
    }
  }

  const unique = owned.size;
  const duplicates = Math.max(0, catches - unique);
  return {
    unique,
    catches,
    duplicates,
    dupRate: catches ? duplicates / catches : 0,
    shinies,
    coinsEarned: earned.coins,
    coinsSpent: spent.coins,
    coinsEnd: inv.coins,
    balls: used.balls,
    berries: used.berries,
    honey: used.honey,
    candy: [...candy.values()].reduce((s, n) => s + n, 0),
    evolutions,
    purchases: spent.purchases,
    surplusBalls: (inv.pokeball || 0) + (inv.greatball || 0) + (inv.ultraball || 0),
    surplusBerries: (inv.berry || 0) + (inv.razz || 0) + (inv.pinap || 0),
    surplusHoney: inv.bait || 0,
    bagUsed: itemTotal(inv),
    bagCap: bagCapacity(inv, archetype.pass),
    bagBonus: inv.bag_bonus || 0,
    bagFullDays,
    level: trainerLevel(xp),
    xp,
    throws,
    escapes,
    joins,
    masterballs: inv.masterball || 0,
    dexAt,
    dupAt,
    bits: packStats.bits,
    packMart: packStats.packMart
  };
}

const ARCHETYPES = {
  casual: { streamsPerWeek: 1.5, joinRate: 0.45, communityHoneyRate: 0.2, chatSize: 6, pass: false, bits: [] },
  regular: { streamsPerWeek: 3.5, joinRate: 0.8, communityHoneyRate: 0.35, chatSize: 10, pass: false, bits: [] },
  core: { streamsPerWeek: 4, joinRate: 0.95, communityHoneyRate: 0.45, chatSize: 14, pass: false, bits: [] },
  supporter: {
    streamsPerWeek: 3.5, joinRate: 0.8, communityHoneyRate: 0.35, chatSize: 10, pass: true,
    bits: [{ sku: "starter", everyDays: 14 }, { sku: "pantry", everyDays: 30 }]
  },
  heavy: {
    streamsPerWeek: 3.5, joinRate: 0.8, communityHoneyRate: 0.35, chatSize: 10, pass: true,
    bits: [{ sku: "ultra", everyDays: 7 }, { sku: "starter", everyDays: 14 }]
  }
};

function runSuite({ mode = "baseline", iters = 200, seed = 9, daysList = DAYS } = {}) {
  const catalog = buildSpecies();
  const balance = makeBalance(mode);
  const out = { mode, iters, seed, archetypes: {}, capture: captureModel(catalog, balance), balls: ballTable(catalog, balance), berries: berryTable(balance), honey: honeyTable(), packs: packTable(balance) };
  Object.entries(ARCHETYPES).forEach(([name, arch], archIdx) => {
    const windows = {};
    daysList.forEach((days) => {
      const rows = [];
      for (let i = 0; i < iters; i += 1) {
        const rng = mulberry32(seed + archIdx * 10007 + days * 17 + i * 131);
        rows.push(simulateOne(catalog, arch, days, rng, balance));
      }
      const metric = (fn) => dist(rows.map(fn));
      const dex = {};
      DEX_MARKS.forEach((mark) => {
        const daysHit = rows.map((row) => (row.dexAt[mark] ? row.dexAt[mark].day : 9999));
        const encHit = rows.map((row) => (row.dexAt[mark] ? row.dexAt[mark].encounters : 99999));
        dex[mark] = { days: dist(daysHit), encounters: dist(encHit), reached: rows.filter((row) => row.dexAt[mark]).length / rows.length };
      });
      const dup = {};
      DUP_MARKS.forEach((mark) => {
        dup[mark] = dist(rows.map((row) => (row.dupAt[mark] != null ? row.dupAt[mark] * 100 : 0)));
      });
      windows[days] = {
        unique: metric((r) => r.unique),
        catches: metric((r) => r.catches),
        duplicates: metric((r) => r.duplicates),
        dupRate: metric((r) => r.dupRate * 100),
        shinies: metric((r) => r.shinies),
        coinsEarned: metric((r) => r.coinsEarned),
        coinsSpent: metric((r) => r.coinsSpent),
        coinsEnd: metric((r) => r.coinsEnd),
        balls: metric((r) => r.balls),
        berries: metric((r) => r.berries),
        honey: metric((r) => r.honey),
        candy: metric((r) => r.candy),
        evolutions: metric((r) => r.evolutions),
        purchases: metric((r) => r.purchases),
        surplusBalls: metric((r) => r.surplusBalls),
        surplusBerries: metric((r) => r.surplusBerries),
        surplusHoney: metric((r) => r.surplusHoney),
        bagUsed: metric((r) => r.bagUsed),
        level: metric((r) => r.level),
        bits: metric((r) => r.bits),
        packMart: metric((r) => r.packMart),
        masterballs: metric((r) => r.masterballs),
        bagFullDays: metric((r) => r.bagFullDays),
        dex,
        dup
      };
    });
    windows.encountersPerWeek = round1((arch.streamsPerWeek * 12) * arch.joinRate);
    windows.streamsPerWeek = arch.streamsPerWeek;
    windows.joinRate = arch.joinRate;
    out.archetypes[name] = windows;
  });
  return out;
}

function captureModel(catalog, balance) {
  const honey = { contributors: 0, participants: 1 };
  const ctx = { owns: false, throwContext: balance.throwContext, throwProgress: 0.5, trainerLevel: 10, gender: "female", night: false };
  const tiers = [
    { name: "COMMON 255", cr: 255, dex: 16 },
    { name: "UNCOMMON 120", cr: 120, dex: 17 },
    { name: "RARE 45", cr: 45, dex: 12 },
    { name: "VERY_RARE 25", cr: 25, dex: 143 },
    { name: "LEGENDARY 3", cr: 3, dex: 150 }
  ];
  return tiers.map((tier) => {
    const species = catalog.species[tier.dex - 1];
    const row = { name: tier.name, cr: species.cr, base: baseChance(species.cr, balance.baseTiers) };
    const combos = [
      ["poke", "pokeball", null],
      ["oran+poke", "pokeball", "berry"],
      ["great", "greatball", null],
      ["ultra", "ultraball", null],
      ["gold+ultra", "ultraball", "goldenrazz"]
    ];
    combos.forEach(([label, ball, berry]) => {
      row[label] = round3(captureChance(species, ball, berry, honey, false, ctx, balance).final);
    });
    const honeyHi = captureChance(species, "ultraball", "goldenrazz", { contributors: 10, participants: 10 }, true, ctx, balance);
    row.honeyCap = round3(honeyHi.final);
    return row;
  });
}

function ballTable(catalog, balance) {
  const pidgey = catalog.species[15];
  const magikarp = catalog.species[128];
  const snorlax = catalog.species[142];
  const golbat = catalog.species[41];
  const water = catalog.species[6];
  const ctxOff = { owns: false, throwContext: false, throwProgress: 0.5, trainerLevel: 1, gender: "", night: false };
  const ctxOn = { owns: true, throwContext: true, throwProgress: 0.2, trainerLevel: 12, gender: "female", night: true };
  const rows = [];
  const balls = [
    ["pokeball", pidgey, pidgey],
    ["greatball", pidgey, pidgey],
    ["ultraball", pidgey, pidgey],
    ["nestball", pidgey, snorlax],
    ["netball", water, pidgey],
    ["repeatball", pidgey, pidgey],
    ["quickball", pidgey, pidgey],
    ["timerball", pidgey, pidgey],
    ["duskball", pidgey, pidgey],
    ["fastball", golbat, pidgey],
    ["heavyball", snorlax, pidgey],
    ["moonball", catalog.species[34], pidgey],
    ["levelball", pidgey, pidgey],
    ["loveball", pidgey, catalog.species[80]],
    ["beastball", pidgey, pidgey],
    ["dreamball", pidgey, pidgey]
  ];
  balls.forEach(([ball, nicheSpecies, normalSpecies]) => {
    const normal = captureChance(normalSpecies, ball, null, { contributors: 0, participants: 1 }, false, ctxOff, balance);
    const nicheCtx = { ...ctxOn };
    if (ball === "timerball") nicheCtx.throwProgress = 0.8;
    if (ball === "quickball") nicheCtx.throwProgress = 0.2;
    if (ball === "loveball") nicheCtx.gender = "female";
    const niche = captureChance(nicheSpecies, ball, null, { contributors: 0, participants: 1 }, false, nicheCtx, balance);
    const price = PRICES[ball] || 0;
    rows.push({
      ball,
      price,
      normal: round3(normal.final),
      niche: round3(niche.final),
      costNormal: price ? Math.round(price / Math.max(normal.final, 0.02)) : 0,
      costNiche: price ? Math.round(price / Math.max(niche.final, 0.02)) : 0,
      nicheMet: niche.ball.met
    });
  });
  return rows;
}

function berryTable(balance) {
  const species = { cr: 45, types: ["normal"], spd: 70, kg: 10, moon: false, leg: false };
  const ctx = { owns: false, throwContext: false, throwProgress: 0.5, trainerLevel: 1, gender: "", night: false };
  return Object.entries(BERRIES).map(([key, berry]) => {
    const chance = captureChance(species, "pokeball", key, { contributors: 0, participants: 1 }, false, ctx, balance);
    const coins = Math.floor(chance.berry.reward * 10);
    return {
      key,
      price: berry.price,
      catch: round3(chance.final),
      rewardCoins: coins,
      evCatch: Math.round(berry.price / Math.max(chance.final - captureChance(species, "pokeball", null, { contributors: 0, participants: 1 }, false, ctx, balance).final || 0.001, 0.001))
    };
  });
}

function honeyTable() {
  const species = { cr: 45, types: ["normal"], spd: 70, kg: 10, moon: false, leg: false, dex: 83 };
  const ctx = { owns: false, throwContext: false, throwProgress: 0.5, trainerLevel: 1, gender: "", night: false };
  const balance = makeBalance("baseline");
  return [0, 1, 2, 3, 5, 10].map((n) => {
    const participants = Math.max(n, 8);
    const chance = captureChance(species, "pokeball", "berry", { contributors: n, participants }, n > 0, ctx, balance);
    const ultra = captureChance(species, "ultraball", "goldenrazz", { contributors: n, participants }, n > 0, ctx, balance);
    return { contributors: n, participants, poke: round3(chance.final), ultraGold: round3(ultra.final), honeyMult: chance.honey.multiplier };
  });
}

function packTable(balance) {
  return Object.entries(balance.packs).map(([sku, pack]) => ({
    sku,
    bits: pack.bits,
    mart: martValue(pack.grants),
    perBit: round1(martValue(pack.grants) / pack.bits),
    grants: pack.grants
  }));
}

function printReport(result) {
  const lines = [];
  const put = (s) => lines.push(s);
  put(`MODE ${result.mode}  iters=${result.iters} seed=${result.seed}`);
  Object.entries(result.archetypes).forEach(([name, windows]) => {
    put(`\n=== ${name.toUpperCase()}  ~${windows.encountersPerWeek}/week ===`);
    DAYS.forEach((days) => {
      const w = windows[days];
      if (!w) return;
      put(`-- ${days}d  unique ${fmt(w.unique)}  catches ${fmt(w.catches)}  dups ${fmt(w.duplicates)} (${fmt(w.dupRate)}%)`);
      put(`   coins +${fmt(w.coinsEarned)} / -${fmt(w.coinsSpent)} end ${fmt(w.coinsEnd)}  balls ${fmt(w.balls)} berries ${fmt(w.berries)} honey ${fmt(w.honey)}`);
      put(`   evo ${fmt(w.evolutions)} candy ${fmt(w.candy)} lv ${fmt(w.level)} bag ${fmt(w.bagUsed)} shinies ${fmt(w.shinies)} bits ${fmt(w.bits)}`);
    });
    put("   dex days P10/P50/P90:");
    DEX_MARKS.forEach((mark) => {
      const row = windows[180].dex[mark];
      put(`   ${mark}: days ${fmt(row.days)}  enc ${fmt(row.encounters)}  reach ${(row.reached * 100).toFixed(0)}%`);
    });
  });
  put("\nCAPTURE TIERS");
  result.capture.forEach((row) => put(`  ${row.name} base ${row.base} poke ${row.poke} oran ${row["oran+poke"]} great ${row.great} ultra ${row.ultra} gold+ultra ${row["gold+ultra"]} honeyCap ${row.honeyCap}`));
  put("\nBALLS");
  result.balls.forEach((row) => put(`  ${row.ball} ${row.price}c  normal ${row.normal} niche ${row.niche}  $/ok ${row.costNormal}/${row.costNiche} met ${row.nicheMet}`));
  put("\nPACKS");
  result.packs.forEach((row) => put(`  ${row.sku} ${row.bits}b mart ${row.mart} (${row.perBit}/bit)`));
  return lines.join("\n");
}

function fmt(d) {
  if (!d || d.p50 == null) return String(d);
  return `${d.p10}/${d.p50}/${d.p90}`;
}

function compare(baseline, v1) {
  const out = {};
  Object.keys(ARCHETYPES).forEach((name) => {
    out[name] = {};
    DAYS.forEach((days) => {
      const a = baseline.archetypes[name][days];
      const b = v1.archetypes[name][days];
      const keys = ["unique", "catches", "dupRate", "coinsEarned", "coinsSpent", "coinsEnd", "surplusBalls", "evolutions", "level", "bits"];
      out[name][days] = {};
      keys.forEach((key) => {
        out[name][days][key] = { baseline: a[key], v1: b[key] };
      });
    });
  });
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = (args.find((a, i) => args[i - 1] === "--mode") || "compare");
  const iters = Number(args.find((a, i) => args[i - 1] === "--iters") || 160);
  const seed = Number(args.find((a, i) => args[i - 1] === "--seed") || 9);
  if (mode === "compare") {
    const baseline = runSuite({ mode: "baseline", iters, seed });
    const v1 = runSuite({ mode: "v1", iters, seed });
    process.stdout.write(printReport(baseline) + "\n\n===== BALANCE V1 =====\n" + printReport(v1) + "\n");
    const delta = compare(baseline, v1);
    process.stdout.write("\nCOMPARE 180d P50 unique/coinsEnd/surplusBalls/evo\n");
    Object.entries(delta).forEach(([name, windows]) => {
      const d = windows[180];
      process.stdout.write(`${name} unique ${d.unique.baseline.p50}->${d.unique.v1.p50} coins ${d.coinsEnd.baseline.p50}->${d.coinsEnd.v1.p50} balls ${d.surplusBalls.baseline.p50}->${d.surplusBalls.v1.p50} evo ${d.evolutions.baseline.p50}->${d.evolutions.v1.p50}\n`);
    });
  } else {
    const result = runSuite({ mode, iters, seed });
    process.stdout.write(printReport(result) + "\n");
  }
}

module.exports = {
  runSuite, simulateOne, captureChance, ballModifier, berryModifier, honeyMultiplier,
  baseChance, trainerLevel, martValue, makeBalance, ARCHETYPES, PRICES, BERRIES, BITS_PACKS,
  printReport, compare, buildSpecies: () => buildSpecies(), bagCapacity, itemTotal
};
