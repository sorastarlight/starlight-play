/* Developer-only Kanto catalog snapshot for tools/kanto-balance-sim.js.
   Sourced from live species + evolution_rules (rc8). Not player-facing. */
const MOON = [29, 30, 31, 32, 33, 34, 35, 36, 39, 40];
const LEG = [144, 145, 146, 150, 151];
const ULTRA = [1, 4, 7, 133, 149];
const GENDERLESS = [81, 82, 100, 101, 120, 121, 132, 137, 144, 145, 146, 150, 151];

// dex 1..151 catch_rate
const CR = [45, 45, 45, 45, 45, 45, 45, 45, 45, 255, 120, 45, 255, 120, 45, 255, 120, 45, 255, 127, 255, 90, 255, 90, 190, 75, 255, 90, 235, 120, 45, 235, 120, 45, 150, 25, 190, 75, 170, 50, 255, 90, 255, 120, 45, 190, 75, 190, 75, 255, 50, 255, 90, 190, 75, 190, 75, 190, 75, 255, 120, 45, 200, 100, 50, 180, 90, 45, 255, 120, 45, 190, 60, 255, 120, 45, 190, 60, 190, 75, 190, 60, 45, 190, 45, 190, 75, 190, 75, 190, 60, 190, 90, 45, 45, 190, 75, 225, 60, 190, 60, 90, 45, 190, 75, 45, 45, 45, 190, 60, 120, 60, 30, 45, 45, 225, 75, 225, 60, 225, 60, 45, 45, 45, 45, 45, 45, 45, 255, 45, 45, 35, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 25, 3, 3, 3, 45, 45, 45, 3, 45];

const SPD = [45, 60, 80, 65, 80, 100, 43, 58, 78, 45, 30, 70, 50, 35, 75, 56, 71, 101, 72, 97, 70, 100, 55, 80, 90, 110, 40, 65, 41, 56, 76, 50, 65, 85, 35, 60, 65, 100, 20, 45, 55, 90, 30, 40, 50, 25, 30, 45, 90, 95, 120, 90, 115, 55, 85, 70, 95, 60, 95, 90, 90, 70, 90, 105, 120, 35, 45, 55, 40, 55, 70, 70, 100, 20, 35, 45, 90, 105, 15, 30, 45, 70, 60, 75, 110, 45, 70, 25, 50, 40, 70, 80, 95, 110, 70, 42, 67, 50, 75, 100, 150, 40, 55, 35, 45, 87, 76, 30, 35, 60, 25, 40, 50, 60, 90, 60, 85, 63, 68, 85, 115, 90, 105, 95, 105, 93, 85, 110, 80, 81, 60, 48, 55, 65, 130, 65, 40, 35, 55, 55, 80, 130, 30, 85, 100, 90, 50, 70, 80, 130, 100];

const KG = [6.9, 13, 100, 8.5, 19, 90.5, 9, 22.5, 85.5, 2.9, 9.9, 32, 3.2, 10, 29.5, 1.8, 30, 39.5, 3.5, 18.5, 2, 38, 6.9, 65, 6, 30, 12, 29.5, 7, 20, 60, 9, 19.5, 62, 7.5, 40, 9.9, 19.9, 5.5, 12, 7.5, 55, 5.4, 8.6, 18.6, 5.4, 29.5, 30, 12.5, 0.8, 33.3, 4.2, 32, 19.6, 76.6, 28, 32, 19, 155, 12.4, 20, 54, 19.5, 56.5, 48, 19.5, 70.5, 130, 4, 6.4, 15.5, 45.5, 55, 20, 105, 300, 30, 95, 36, 78.5, 6, 60, 15, 39.2, 85.2, 90, 120, 30, 30, 4, 132.5, 0.1, 0.1, 40.5, 210, 32.4, 75.6, 6.5, 60, 10.4, 66.6, 2.5, 120, 6.5, 45, 49.8, 50.2, 65.5, 1, 9.5, 115, 120, 34.6, 35, 80, 8, 25, 15, 39, 34.5, 80, 54.5, 56, 40.6, 30, 44.5, 55, 88.4, 10, 235, 220, 4, 6.5, 29, 24.5, 25, 36.5, 7.5, 35, 11.5, 40.5, 59, 460, 55.4, 52.6, 60, 3.3, 16.5, 210, 122, 4];

const TYPES = "grass,poison|grass,poison|grass,poison|fire|fire|fire,flying|water|water|water|bug|bug|bug,flying|bug,poison|bug,poison|bug,poison|normal,flying|normal,flying|normal,flying|normal|normal|normal,flying|normal,flying|poison|poison|electric|electric|ground|ground|poison|poison|poison,ground|poison|poison|poison,ground|fairy|fairy|fire|fire|normal,fairy|normal,fairy|poison,flying|poison,flying|grass,poison|grass,poison|grass,poison|bug,grass|bug,grass|bug,poison|bug,poison|ground|ground|normal|normal|water|water|fighting|fighting|fire|fire|water|water|water,fighting|psychic|psychic|psychic|fighting|fighting|fighting|grass,poison|grass,poison|grass,poison|water,poison|water,poison|rock,ground|rock,ground|rock,ground|fire|fire|water,psychic|water,psychic|electric,steel|electric,steel|normal,flying|normal,flying|normal,flying|water|water,ice|poison|poison|water|water,ice|ghost,poison|ghost,poison|ghost,poison|rock,ground|psychic|psychic|water|water|electric|electric|grass,psychic|grass,psychic|ground|ground|fighting|fighting|normal|poison|poison|ground,rock|ground,rock|normal|grass|normal|water|water|water|water|water|water,psychic|psychic,fairy|bug,flying|ice,psychic|electric|fire|bug|normal|water|water,flying|water,ice|normal|normal|water|electric|fire|normal|rock,water|rock,water|rock,water|rock,water|rock,flying|normal|ice,flying|electric,flying|fire,flying|dragon|dragon|dragon,flying|psychic|psychic";

const EVOS = [
  [1, 2, 40, null], [2, 3, 80, null], [4, 5, 40, null], [5, 6, 80, null], [7, 8, 40, null], [8, 9, 80, null],
  [10, 11, 15, null], [11, 12, 30, null], [13, 14, 15, null], [14, 15, 30, null], [16, 17, 25, null], [17, 18, 50, null],
  [19, 20, 25, null], [21, 22, 25, null], [23, 24, 25, null], [25, 26, 40, "thunderstone"], [27, 28, 25, null],
  [29, 30, 25, null], [30, 31, 40, "moonstone"], [32, 33, 25, null], [33, 34, 40, "moonstone"], [35, 36, 40, "moonstone"],
  [37, 38, 40, "firestone"], [39, 40, 40, "moonstone"], [41, 42, 25, null], [43, 44, 25, null], [44, 45, 40, "leafstone"],
  [46, 47, 25, null], [48, 49, 25, null], [50, 51, 25, null], [52, 53, 25, null], [54, 55, 25, null], [56, 57, 25, null],
  [58, 59, 40, "firestone"], [60, 61, 25, null], [61, 62, 40, "waterstone"], [63, 64, 25, null], [64, 65, 50, "linkingcord"],
  [66, 67, 25, null], [67, 68, 50, "linkingcord"], [69, 70, 25, null], [70, 71, 40, "leafstone"], [72, 73, 40, null],
  [74, 75, 25, null], [75, 76, 50, "linkingcord"], [77, 78, 40, null], [79, 80, 40, null], [81, 82, 40, null],
  [84, 85, 40, null], [86, 87, 40, null], [88, 89, 40, null], [90, 91, 40, "waterstone"], [92, 93, 25, null],
  [93, 94, 50, "linkingcord"], [96, 97, 40, null], [98, 99, 40, null], [100, 101, 40, null], [102, 103, 40, "leafstone"],
  [104, 105, 40, null], [109, 110, 40, null], [111, 112, 50, null], [116, 117, 40, null], [118, 119, 40, null],
  [120, 121, 40, "waterstone"], [129, 130, 100, null], [133, 134, 40, "waterstone"], [133, 135, 40, "thunderstone"],
  [133, 136, 40, "firestone"], [138, 139, 40, null], [140, 141, 40, null], [147, 148, 50, null], [148, 149, 100, null]
];

function spawnBand(dex, cr, legendary) {
  if (legendary) return "LEGENDARY";
  if (ULTRA.includes(dex)) return "ULTRA_RARE";
  if (cr >= 200) return "COMMON";
  if (cr >= 90) return "UNCOMMON";
  if (cr >= 45) return "RARE";
  if (cr >= 15) return "VERY_RARE";
  return "ULTRA_RARE";
}

function buildSpecies() {
  const typeRows = TYPES.split("|");
  const toPrev = new Map();
  const famOf = new Map();
  EVOS.forEach((row) => {
    const from = row[0];
    const to = row[1];
    toPrev.set(to, from);
    const fam = famOf.get(from) || from;
    famOf.set(from, fam);
    famOf.set(to, fam);
  });
  const candyFamilies = new Set(famOf.values());
  const species = [];
  for (let dex = 1; dex <= 151; dex += 1) {
    const cr = CR[dex - 1];
    const legendary = LEG.includes(dex);
    let stage = 1;
    let walk = dex;
    while (toPrev.has(walk)) {
      stage += 1;
      walk = toPrev.get(walk);
    }
    species.push({
      dex,
      cr,
      band: spawnBand(dex, cr, legendary),
      types: typeRows[dex - 1].split(","),
      spd: SPD[dex - 1],
      kg: KG[dex - 1],
      moon: MOON.includes(dex),
      leg: legendary,
      genderless: GENDERLESS.includes(dex),
      stage,
      fam: famOf.get(dex) || dex,
      candy: candyFamilies.has(famOf.get(dex) || -1)
    });
  }
  return { species, evos: EVOS.map((row) => ({ from: row[0], to: row[1], candy: row[2], item: row[3] })) };
}

module.exports = { buildSpecies, EVOS, MOON, LEG, ULTRA, GENDERLESS };
