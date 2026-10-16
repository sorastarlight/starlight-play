# D55 economy final review

Branch-only correction. This file is **not** applied to `dtflmlbjhttoewqgkujf`. WIRE stays off. Catch `SL00025376` was not modified. PlayTester inventory was not backfilled. APP stays `20261008-rc133`.

D54’s ledger debit stays. D54’s removal of the borrowed-ball skip does not.

## Decisions

**Borrowed Poké Balls stay free.** Live `public.play_throw` (`src_md5` `c88c65372df551e1e06e7d819af2f167`) is the safety-net throw from `20260913041000_economy_rewards.sql`. It sets `result_reason` to `standard_throw` when the client sends `standard`, or when the chosen ball is `pokeball` and `throwable_total` is 0. `announce_throws` does not spend that row. A catch and an escape both leave the bag unchanged, and a replay does not add a debit later.

`play_throw` is not replaced. Sending `standard` still marks the safety net even when the bag is not empty. The Play screen only offers balls with a quantity above zero, so an ordinary owned Poké Ball is sent as `pokeball` and is spent.

**Owned throws still debit.** Any other `result_reason` spends one ball and writes `BAG_SPEND` −1. Escapes use that same rule. `throw_processed` still blocks a second spend. Attendance remains a separate `STREAM_ATTENDANCE` grant.

**Ledger failures abort.** Insufficient inventory raises SQLSTATE `NB001`. `announce_throws` catches only that state and records `no_ball_left`. A failed ledger insert, or any other database error, leaves the function and rolls the settlement back. It is not reported as an empty bag.

**JSON items decrement in one update.** Extra balls and capture berries use `UPDATE ... WHERE` the stored quantity is greater than zero. Two overlapping spends of the last item produce one debit and one ledger row.

Capture odds are unchanged.

## Branch SQL

`supabase/unapplied/d55-economy/001_spend_rules.sql`

SHA-256 `fdf5fffb50ed333d860711d127423364331de1dc0c0b7a1690b893908f36d1aa`

Replaces `private.spend_bag_item(uuid, text)` and `private.announce_throws(uuid)`. Do not apply the D54 file; it spends safety-net throws.

## Tests

| Suite | Class | Result |
|---|---|---|
| `tests/d55-economy-static-tests.js` | STATIC plus synthetic borrow rules | PASS |
| `tools/d55-economy-rehearsal.js` | REAL SQL `127.0.0.1:55438/d55_economy` | 13/13 PASS |
| `tests/admin-hub-overhaul-tests.js` | STATIC | recorded in the run log after this batch |

REAL SQL covers an owned catch, an owned escape, a borrowed catch, a borrowed escape, replay of both, the live `standard` mark, an empty owned throw, a separate attendance row, an injected ledger failure, and two overlapping extra-ball spends.

## Still required before any live fix

Owner review of this hashed file, then a separate authorization to apply it. No inventory backfill. WIRE stays off. No merge, deploy, or APP stamp.
