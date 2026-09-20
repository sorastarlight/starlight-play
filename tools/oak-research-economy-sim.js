#!/usr/bin/env node
/**
 * Economy simulation for Oak Research valuables vs Phase 9.
 * Does not mutate production.
 */
const MILESTONES = {
  field: [
    { id: "field-10", rewards: { stardust: 1 } },
    { id: "field-25", rewards: { pearl: 1 } },
    { id: "field-50", rewards: { nugget: 1 } },
    { id: "field-75", rewards: { stardust: 2, coins: 200 } },
    { id: "field-100", rewards: { starpiece: 1 } },
    { id: "field-125", rewards: { bigpearl: 1 } },
    { id: "field-151", rewards: { bignugget: 1, coins: 500 } }
  ],
  evolution: [
    { id: "evolution-1", rewards: { stardust: 1 } },
    { id: "evolution-5", rewards: { pearl: 1 } },
    { id: "evolution-10", rewards: { nugget: 1 } },
    { id: "evolution-20", rewards: { starpiece: 1 } },
    { id: "evolution-35", rewards: { bigpearl: 1 } },
    { id: "evolution-50", rewards: { bignugget: 1 } }
  ],
  line: [
    { id: "line-1", rewards: { pearl: 1 } },
    { id: "line-5", rewards: { stardust: 2 } },
    { id: "line-10", rewards: { nugget: 1 } },
    { id: "line-20", rewards: { starpiece: 1 } },
    { id: "line-30", rewards: { bigpearl: 1 } },
    { id: "line-all", rewards: { bignugget: 1, coins: 300 } }
  ],
  transfer: [
    { id: "transfer-1", rewards: { stardust: 1 } },
    { id: "transfer-10", rewards: { stardust: 1 } },
    { id: "transfer-25", rewards: { pearl: 1 } },
    { id: "transfer-50", rewards: { nugget: 1 } },
    { id: "transfer-100", rewards: { starpiece: 1 } }
  ]
};

const GAME_SELL = {
  stardust: 150,
  pearl: 400,
  starpiece: 900,
  nugget: 1200,
  bigpearl: 2500,
  bignugget: 6000
};

const PHASE9 = {
  starterCoins: 250,
  dailyCoins: 40,
  passDailyCoins: 20,
  passWeeklyCoins: 150,
  pokeball: 100,
  greatball: 250,
  ultraball: 500,
  firestone: 800,
  linkingcord: 1200
};

function tally() {
  let directCoins = 0;
  let sellValue = 0;
  const items = {};
  Object.values(MILESTONES).flat().forEach((m) => {
    Object.entries(m.rewards).forEach(([k, n]) => {
      const qty = Number(n) || 0;
      if (k === "coins") directCoins += qty;
      else {
        items[k] = (items[k] || 0) + qty;
        sellValue += (GAME_SELL[k] || 0) * qty;
      }
    });
  });
  return { directCoins, sellValue, combined: directCoins + sellValue, items };
}

const t = tally();
const report = {
  items: t.items,
  totalDirectCoins: t.directCoins,
  totalValuableSellValue: t.sellValue,
  combinedMaxPayout: t.combined,
  comparisons: {
    vsStarter: (t.combined / PHASE9.starterCoins).toFixed(1) + "× starter (250)",
    vsDaily30d: (t.combined / (PHASE9.dailyCoins * 30)).toFixed(1) + "× 30 daily supplies",
    vsUltraBalls: Math.round(t.combined / PHASE9.ultraball) + " Ultra Balls",
    vsFirestones: Math.round(t.combined / PHASE9.firestone) + " Fire Stones",
    vsLinkingCords: Math.round(t.combined / PHASE9.linkingcord) + " Linking Cords"
  },
  verdict: t.combined <= 30000
    ? "Meaningful long-horizon payout without trivializing Mart (under ~30k combined)."
    : "Review — payout may be high relative to Phase 9 Mart."
};

console.log(JSON.stringify(report, null, 2));
