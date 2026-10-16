# D54 encounter economy

Branch-only correction. This file is **not** applied to `dtflmlbjhttoewqgkujf`. WIRE stays off. Catch `SL00025376` was not modified. PlayTester inventory was not backfilled.

## Root cause

The D53 Poké Ball was consumed. `private.announce_throws` called `private.spend_bag_item`, which decrements `public.inventories` and writes **no** `public.item_ledger` row. The same settlement then granted the stream-day ball through `grant_items` (`STREAM_ATTENDANCE`, idempotency `stream-ball:…`). That grant increments `inventories.pokeball` and inserts the only ledger row.

PlayTester bag before the throw: 13. After settlement: 13. `inventories.updated_at` matches the attendance ledger timestamp. That net is spend −1 plus attendance +1. A skipped spend plus attendance would have ended at 14, so this throw was not the free `standard_throw` path.

A second defect remains in production: `announce_throws` skips `spend_bag_item` when `result_reason` is `standard_throw`. `public.play_throw` sets that reason for a borrowed ball and does not decrement. A later successful catch can therefore be free. D53 did not take that path.

Attendance is a separate award. It is not the throw debit.

## Branch fix

`supabase/unapplied/d54-economy/001_spend_ledger.sql`

SHA-256 `0a9ac044f687d359fbfd815c7e34527f49710ec59ac965df372e1929444d3c6b`

Replaces:

- `private.spend_bag_item(uuid, text)` — after a successful decrement, inserts `item_ledger` amount `-1`, reason `BAG_SPEND`. A failed decrement still raises and writes nothing.
- `private.announce_throws(uuid)` — spends on every unprocessed throw. `throw_processed` still blocks replay. An empty bag still sets `no_ball_left` and does not throw. The `standard_throw` skip is gone.

Live baselines read this batch and left in place:

- `private.spend_bag_item` `src_md5` `adb53e0a30a06224d85fa79a50d1f433`
- `private.announce_throws` `src_md5` `6abe25af4ac01e2e9c97707c3d8e44cf`

Unchanged: `public.play_throw`, attendance `grant_items`, capture odds, and `private.settle_if_needed`. Escapes still spend because the debit happens before the catch roll. Both writes sit in the settle transaction, so a later persistence error rolls the bag and the ledger back.

## Tests

| Suite | Class | Result |
|---|---|---|
| `tests/d54-economy-static-tests.js` | STATIC | PASS — ledger debit present; no odds change; not a live apply |
| `tests/encounter-phase-driver-tests.js` | STATIC synthetic fixture | PASS — berry, no berry, honey, Poké Ball, and result follow phase |
| `tools/d54-economy-rehearsal.js` | REAL SQL `127.0.0.1:55437/d54_economy` | 12/12 PASS |
| `tests/admin-hub-overhaul-tests.js` | STATIC | recorded in the run log after this batch |

REAL SQL cases: successful catch debit, separate attendance +1, escape still spends, empty bag, borrowed `standard_throw` still spends, replay, overlapping announce, explicit rollback, injected settlement failure, berry / honey / extra-ball debits.

The phase driver does not open a browser and does not sleep. The D53 driver missed prepare because it waited on a clock instead of the phase.

## Still required before any live fix

- Owner review of this unapplied SQL.
- A separate authorization to apply the hashed file. This batch does not apply it.
- No inventory backfill and no edit to `SL00025376`.
- WIRE stays off. No merge, deploy, or APP stamp.
