# A19-WIRE-DEV report (D45)

**Verdict: BRANCH IMPLEMENTATION DELIVERED. A19-WIRE-APPLY, switch-on, A19-WIRE-GO, A19-RESET-GO, merge, deploy, and APP stamp remain UNAPPROVED.**

Owner authorized A19-WIRE-DEV GO: unapplied persist SQL + disposable local PostgreSQL testing on `admin-hub-overhaul` from D44 / `3562f6e2`. Locked decisions: **GV7 SL**, **WIRE-BIND** preallocated `catches.id`, **WIRE-SORA** ordinary settle allowed / grant-edit forbidden, **RESET-TEST** synthetic local only.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Production APP `20261008-rc133` unchanged. Smoke paused.

| Honesty | Used |
|---|---|
| STATIC | Unapplied SQL isolation, switch/GUC, SL prefix, capture-economy untouched |
| REAL SQL | Embedded Postgres `127.0.0.1:55434` / `a19_wire` (18/18) |
| REAL SQL | Embedded Postgres `127.0.0.1:55435` / `a19_reset` (7/7) |
| NOT RUN | Hosted Supabase, live settle swap, WIRE-APPLY, switch-on, A19-RESET-GO, PRODUCTION smoke |

---

## What shipped (unapplied)

| Path | Role |
|---|---|
| `supabase/unapplied/a19-wire/001_wire_switch_and_persist.sql` | Named switch (default false), persist helper, bound HA complete, SL public_id |
| `supabase/unapplied/a19-wire/002_materialize_hook.sql` | Switch-off stamp INSERT / switch-on persist |
| `supabase/unapplied/a19-wire/local/` | Stamp replica, settle columns, teardown |
| `supabase/unapplied/a19-reset/001_ra_pokemon_progression.sql` | Showcase `shinyCatchId` cleanup added |
| `tools/a19-wire-rehearsal.js` | Isolated WIRE REAL SQL |
| `tools/a19-reset-rehearsal.js` | Isolated RESET-TEST REAL SQL |

`private.stamp_catch_row` is **not** replaced. Production settle RPCs still INSERT then stamp. Client flags and `starlight.wire_genval` cannot enable WIRE. EXECUTE remains revoked from public/anon/authenticated/service_role.

---

## REAL SQL — WIRE (`127.0.0.1:55434/a19_wire`)

| Case | Result |
|---|---|
| Isolation loopback / not hosted | PASS |
| Capture odds helpers unchanged across WIRE apply | PASS |
| Switch default off; GUC ignored | PASS |
| Switch-off materialize → stamp + `LG` public_id | PASS (`LG00000001`) |
| Persist refuses while switch off | PASS |
| Named switch on | PASS |
| Two catchers, one round: distinct IVs/Natures, `SL` ids | PASS (`SL00000002` / `SL00000003`) |
| Source key + `(round_id,user_id)` replay | PASS `already-settled` |
| Simultaneous settle/replay: one winner | PASS |
| HA ticket `specimen_id` = preallocated `catches.id`; replay blocked | PASS |
| Ordinary catch ability slot 1/2, never hidden | PASS (slot `1`) |
| G1 `10195` / C1 `10278` fail closed | PASS |
| Legacy synthetic catch NULL GENVAL; assert `legacy-row` | PASS |
| Stamp does not overwrite supplied Gen IX attributes | PASS |
| Grant/event refuse synthetic denylist logins | PASS |
| anon/authenticated cannot EXECUTE persist/materialize/switch | PASS |
| Inventory/coins/berries/honey unchanged | PASS |
| Switch off again → stamp + `LG` | PASS (`LG00000009`) |

**REAL SQL 18/18 PASS.** Synthetic Oak/Leaf/Blue/Red plus fictional denylist logins only. No real Sora/Twinkle rows.

---

## REAL SQL — RESET-TEST (`127.0.0.1:55435/a19_reset`)

| Case | Result |
|---|---|
| Isolation loopback / not hosted | PASS |
| Synthetic 98 protected / 12 disposable | PASS |
| GUC-less apply raises and rolls back | PASS |
| Deletes 12 disposable; keeps 98 protected | PASS |
| Protected team/showcase kept except leaked reset ids | PASS |
| Disposable `showcase.shinyCatchId` stripped; `achievementId` kept | PASS |
| Economy / Pokédex seen / profiles survive | PASS |

**REAL SQL 7/7 PASS.** Production RESET-GO was not executed.

---

## Authority unchanged

- Capture odds, berry bonus, honey multiplier, and inventory deduction stay in the existing settle/throw functions.
- Persist only materializes a successful catch. It does not spend balls or award coins.
- Unique `catches_round_user_uidx` / `catches_source_key_uidx` remain the exactly-once keys.
- Hidden tickets redeem once, bound to the preallocated catch UUID in the same transaction. A unique-violation rolls the bind back.
- Old Pokémon keep NULL GENVAL columns and existing `LG` / synthetic public ids.

---

## Next gates (not granted)

| ID | Status |
|---|---|
| A19-WIRE-APPLY | Install `001`/`002` on `dtflmlbjhttoewqgkujf` with switch **false**. Then swap live settle INSERT to `materialize_streamlink_catch`. |
| A19-WIRE-GO | Flip `private.streamlink_wire_switch.enabled` after QA. |
| A19-RESET-GO | Production collection reset. Local RESET-TEST passed; live wipe still unapproved. |
| Merge / deploy / APP stamp | Still stopped. APP stays `20261008-rc133`. |

No new owner design decision is required to keep this branch as-is. Production activation is the next named GO.
