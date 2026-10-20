# D85 — Isolated stamp rehearsal

**2026-10-19 correction:** [fingerprint reconciliation](./D85-FINGERPRINT-RECONCILIATION.md) proves the old values are full-definition hashes while this report compared body hashes. The mismatch explanation is resolved; the rehearsal below still did not run. Original findings preserved as historical evidence.

**Verdict:** **D85 BLOCKED — DEFINITION MISMATCH**  
**Status:** No local database was started. No catch was attempted.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `a76a6234`  
**Work commit:** `1d1f9ec2`  
**Production APP:** `20261008-rc133` (unchanged).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

The D84 “Do not start D85” line stays in that report. This batch was the authorized local rehearsal, and it stopped before any write. Do not start D86.

## Target

No cluster was opened. The intended target was embedded PostgreSQL on `127.0.0.1`, a new data directory, never `dtflmlbjhttoewqgkujf`. The definition check failed first, so there was no connection string and no write to confirm.

The only hosted access was a read-only catalog of function source fingerprints. No gameplay RPC ran. Catalog clock `2026-10-18 06:19:15.963884+00`.

## Fingerprints

These match the recorded definitions:

| Function | Recorded and live `md5(prosrc)` |
|---|---|
| `private.settle_if_needed(encounter_rounds)` | `565c102d0a8c84a3dfd036653aca307c` |
| `private.stamp_catch_server_inserted_at()` | `b66ad1b961b3573a2c48947dfe0413ea` |
| `private.round_is_active(encounter_rounds)` | `53d7e8a3f3894212e854618dc0663101` |
| `private.materialize_streamlink_catch(...)` | `e88c6cbec313a4cc0b81a5df1f5691b3` |
| `private.note_species_mastery_catch(uuid)` | `313944ac139f33465e57d86c0a1c5678` |

These do not. The recorded values are the last command-center fingerprints. The live values are from this catalog read.

| Function | Recorded | Live |
|---|---|---|
| `private.spend_bag_item(uuid, text)` | `5419a99d0c1735f44564b84338e32578` | `b30712a5a082f00ce45fd2c214e7029d` |
| `private.announce_throws(uuid)` | `0cd4a8e2a647ba388ce19b14b6f5a8c4` | `1145a36f2a1a2e93f9d99e91c4d24916` |
| `private.capture_chance(...)` | `8fa515e574a89165c0adf11339ed73ba` | `205d43359e90971f790816cf6e45c889` |

`spend_bag_item` and `announce_throws` were last confirmed at those recorded values in D57 and D58. `capture_chance` was last recorded on the D55 economy install. No later report records the live hashes. The settlement function calls all three, so a local copy of the old files would not be the live odds or the live debit, and a copy of the live bodies would not be the recorded definitions.

## Result

No synthetic trainer was created. No Poké Ball was spent. No specimen was inserted. The stamp was not exercised. This is not an unsuccessful throw and not a stamp proof.

## Next

A later rehearsal needs a separate owner decision naming which spend, announce, and capture-chance bodies are authoritative. This report does not choose them and does not restore either side.

Do not start D86.
