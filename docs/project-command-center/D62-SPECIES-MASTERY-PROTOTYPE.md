# D62 — Species Mastery offline prototype

**Status:** BRANCH-ONLY PROTOTYPE. D63 ran the offline tests: 9/9 passed. Hosted work is still not approved. See [D63-MASTERY-COMPATIBILITY-REPORT.md](./D63-MASTERY-COMPATIBILITY-REPORT.md).  
**Source:** D61-SPECIES-MASTERY-DESIGN.md; five-tier cosmetic-only ladder accepted as working baseline.

## Artifacts

- `tests/fixtures/species-mastery-model.js`: deterministic CommonJS mastery functions, tier thresholds, eligibility predicate, and synthetic idempotent summary. Not referenced by any production page or build entrypoint.
- `tests/species-mastery-tests.js`: nine offline synthetic tests for tier boundaries, duplicates/variant accounting, settled replay, conflicting IDs, species isolation, rejected provenance, trainer isolation, immutability, and invalid inputs.

## Deliberate limitations

- This is a fixture model, **not** a secure hosted mastery ledger. It cannot authenticate a claimant, verify real DB provenance, handle concurrency across sessions, enforce row-level security, or issue rewards. Those concerns require separate architecture, actual source-schema audit and permissions.
- The `provenanceVerified` fixture field is a simulated precondition, not proof. Do not trust a client-supplied Boolean for production eligibility.
- Any conflicting reuse of a catch ID is tallied for review rather than silently reassigned.
- Regional variant sharing remains provisional pending actual canonical species reference verification. Synthetic `speciesId` is the supplied authoritative canonical ID; do not derive it from sprite filenames.
- Historical mastery backfill, disposal policy, trade behavior, correction/reversal, migration or UI wiring has **not** been authorized or implemented.
- D60 Node/local-browser verification remains outstanding and independent.

## Next safe validation

1. Run `node tests/species-mastery-tests.js` in checked-out branch and preserve exact output.
2. Run `node tests/onboarding-tests.js` and `node tests/admin-hub-overhaul-tests.js`.
3. Static check to confirm that fixture modules are not imported from `index.html`, `js/play.js`, `help.html`, catch settlement or server functions.
4. Review actual canonical species, catch source/provenance, ownership and settlement schema read-only before designing any hosted ledger.
5. Report results and stop. Separate owner authorization required before SQL migration, RPC change, server hook, rewards, player UI, rollout or backfill.

## Guards

WIRE remains OFF per last reported D58 state (not queried or toggled in D62). APP remains reported `20261008-rc133` (not altered in D62). Sora and Twinkle untouched; no game/account writes, merge, release, reset or deploy.
