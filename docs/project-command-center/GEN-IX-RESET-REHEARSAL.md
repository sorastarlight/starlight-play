# A19-RESET rehearsal requirements (D44 spec + D45 local RESET-TEST)

**Verdict: LOCAL RESET-TEST PASS. Production reset remains UNAPPLIED.**

D45 ran the R-A script on disposable synthetic Postgres only. No production DELETE / TRUNCATE / DROP ran. Sora/Twinkle deletion scope is **not** expanded.

Sora mutated **NO** · Twinkle mutated **NO**.

---

## Production counts reconfirmed (LIVE CATALOG, aggregates only)

Project `dtflmlbjhttoewqgkujf`, same login match as D43 (`sorastarlight`, `twinklephoenixstar`):

| Category | n |
|---|---|
| Protected profiles | 2 |
| Catches a default R-A would delete | **12** |
| Catches kept on protected accounts | **98** |
| Trade listings (all) | 1 |
| Trade offers / direct trades | 0 / 0 |
| Active encounter rounds | 0 |
| Profiles with nonempty `showcase` | 2 |

Matches D43. The unapplied script still removes only non-protected catches.

---

## Soft references the script already handles

`team_ids`, `pc_layout` (non-protected emptied; protected stripped of leaked reset ids), `direct_trades`, `oak_transfers`, `evolution_log` (non-protected), `candy_ledger.related_catch` nulled, encounter participation, optional `trainer_stats` catch counters.

## Soft references the script does **not** touch

| Object | Keys / notes | Risk if R-A runs as-is |
|---|---|---|
| `profiles.showcase` | LIVE CATALOG keys: `achievementId`, `shinyCatchId` | `shinyCatchId` may dangle if it pointed at one of the 12. **2** profiles have a showcase object; do not dump values. Before A19-RESET-GO, add a null-out of `showcase.shinyCatchId` when that uuid is in `reset_catch_ids`. |
| Protected `team_ids` / `pc_layout` | script strips leaked reset ids only | OK |
| Rankings derived views | not tables | may lag until `trainer_stats` optional block |

Do not add Sora/Twinkle catch deletion to the rehearsal or the GO.

---

## Disposable local rehearsal (A19-RESET-TEST)

D45 ran this on `127.0.0.1:55435/a19_reset`. **REAL SQL 7/7 PASS.** Production A19-RESET-GO is still a later named message.

1. Isolated Postgres on `127.0.0.1` only. Refuse hosted URLs.
2. Load a **synthetic** schema copy: 2 protected users, 98 protected-shaped catches, 12 disposable catches, team/PC/showcase/trade/oak/evo/ledger rows.
3. Do **not** copy production identities or Twitch ids.
4. `SET starlight.reset_confirm = 'A19-RESET-GO'` then apply `supabase/unapplied/a19-reset/001_ra_pokemon_progression.sql`.
5. Assert: 12 gone, 98 remain, protected team/PC intact, economy/dex seen intact, showcase dangling ids nulled (after the script patch), GUC-less apply raises and rolls back.
6. Second pass without GUC must fail closed.

Production A19-RESET-GO stays a later named message after this rehearsal PASS.

Unapplied script: `supabase/unapplied/a19-reset/001_ra_pokemon_progression.sql`. Scope: [GEN-IX-RESET-SCOPE.md](./GEN-IX-RESET-SCOPE.md).
