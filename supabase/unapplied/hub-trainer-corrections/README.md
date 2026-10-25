# Direct trainer corrections

Owner-authorized replacement for the unaudited coin/removal routes. Installation exposes a staff-edit read and atomic correction endpoint; it does not perform an account correction.

Corrections set resulting quantities for existing inventory, Evolution Candy, PokéCoins and capacity. Pokémon removals select exact specimens, retain full private recovery records, and preserve lock/favorite/trading protections. No release rewards or progression counters are awarded. Protected accounts remain blocked. New Pokémon use Trainer Gifts and the canonical generation path.

Read snapshots include a revision. Save locks the affected resources, rejects stale or busy state, records a staff reason, and returns a stable request receipt. Trade-creation triggers serialize active ownership checks against removal. Existing unrelated records are untouched.

`INSTALL.sql` refuses source drift or an existing corrections table. `ROLLBACK.sql` refuses candidate drift, restores three original definitions, drops the new direct-trade trigger and removes browser execution of the new endpoints. It retains audit records and soft-removed specimens. Rollback does not reverse player changes; selective recovery requires reviewing the archived before/after state and intervening changes.

Local verification: schema-only PostgreSQL 17 replay, 17 correction groups, five observed/normal trade-creation cases, five rollback checks, plus JavaScript/session and responsive UI tests. No production correction, gift, trade or notice call is part of deployment verification.
