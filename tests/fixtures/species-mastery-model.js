/* D62 offline Species Mastery calculation prototype.
 * Not loaded by a page, not a settlement hook, not an authority for hosted rewards.
 */
"use strict";

const MASTERY_TIERS = Object.freeze([
  Object.freeze({ level: 0, name: "Unmastered", threshold: 0 }),
  Object.freeze({ level: 1, name: "Familiar", threshold: 1 }),
  Object.freeze({ level: 2, name: "Acquainted", threshold: 3 }),
  Object.freeze({ level: 3, name: "Experienced", threshold: 6 }),
  Object.freeze({ level: 4, name: "Specialist", threshold: 12 }),
  Object.freeze({ level: 5, name: "Expert", threshold: 20 })
]);
const ALLOWED_SOURCE = "encounter_catch";

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function speciesId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
function qualifyingCatch(record) {
  return Boolean(record && nonempty(record.catchId) &&
    nonempty(record.trainerId) && speciesId(record.speciesId) !== null &&
    record.outcome === "caught" && record.settled === true &&
    record.source === ALLOWED_SOURCE && record.provenanceVerified === true);
}
function progressForCount(count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("Invalid eligible catch count");
  let current = MASTERY_TIERS[0];
  for (const tier of MASTERY_TIERS) if (count >= tier.threshold) current = tier;
  const next = MASTERY_TIERS[current.level + 1] || null;
  return Object.freeze({
    count,
    duplicates: Math.max(0, count - 1),
    level: current.level,
    title: current.name,
    nextTitle: next ? next.name : null,
    nextThreshold: next ? next.threshold : null,
    remaining: next ? Math.max(0, next.threshold - count) : 0,
    maxed: next === null
  });
}
/* Synthetic model of one ledger insertion per (trainerId, catchId).
 * A production implementation MUST enforce uniqueness and authorization in the DB.
 * Conflicting duplicate IDs never silently remap their species.
 */
function summarizeCatches(records, trainerId) {
  if (!nonempty(trainerId)) throw new TypeError("Trainer ID required");
  if (!Array.isArray(records)) throw new TypeError("Catch records array required");
  const bySpecies = new Map(), seen = new Map();
  let rejected = 0, replays = 0, conflicts = 0;
  for (const record of records) {
    if (!qualifyingCatch(record) || record.trainerId !== trainerId) {
      rejected++;
      continue;
    }
    const key = record.catchId;
    if (seen.has(key)) {
      if (seen.get(key) === record.speciesId) replays++;
      else conflicts++;
      continue;
    }
    seen.set(key, record.speciesId);
    bySpecies.set(record.speciesId, (bySpecies.get(record.speciesId) || 0) + 1);
  }
  const species = [...bySpecies.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, count]) => Object.freeze({ speciesId: id, ...progressForCount(count) }));
  return Object.freeze({ trainerId, species, eligible: seen.size, rejected, replays, conflicts });
}

module.exports = { MASTERY_TIERS, qualifyingCatch, progressForCount, summarizeCatches };
