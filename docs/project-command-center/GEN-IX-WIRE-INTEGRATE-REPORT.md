# A19-WIRE-INTEGRATE report (D46)

**Verdict: BRANCH SETTLE INTEGRATION DELIVERED. A19-WIRE-APPLY, switch-on, A19-WIRE-GO, A19-RESET-GO, merge, deploy, and APP stamp remain UNAPPROVED.**

Superseded for production-artifact review by D47 (`GEN-IX-WIRE-PARITY-REPORT.md`): the test hook was removed from `003`, and LIVE CATALOG parity is documented there. D46 hashes below are historical.

Owner authorized branch-only settlement integration + disposable local PostgreSQL. Baseline D45 `4155349c` / `b0670a1c`. Implementation commit: `fefbf362`.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Production APP `20261008-rc133` unchanged. Smoke paused.

| Honesty | Used |
|---|---|
| STATIC | Unapplied 003 isolation, hashes, settle still calls capture_chance / announce_throws |
| REAL SQL | Embedded Postgres `127.0.0.1:55436` / `a19_wire_settle` (**13/13**) |
| NOT RUN | Hosted SQL, WIRE-APPLY, switch-on, hosted generate, RESET-GO, PRODUCTION smoke |

---

## Modified function

| Function | Artifact | Change |
|---|---|---|
| `private.settle_if_needed(encounter_rounds)` | `supabase/unapplied/a19-wire/003_settle_integration.sql` | Successful-catch `INSERT public.catches … ON CONFLICT DO NOTHING` becomes `private.materialize_streamlink_catch`. Unique replay stays silent. Any other persist error **RAISE**s so the settle transaction (including `announce_throws` ball spends and catch XP) rolls back. |

Unchanged in that function: advisory lock, phase clocks, `announce_throws` spends, `capture_chance` (ball / berry / honey), `capture_log`, console Caught/Escaped copy, `testOutcome`, result labels.

`private.stamp_catch_row` is **not** replaced. `public.play_throw` / `public.play_prepare` are **not** replaced.

---

## SQL artifacts and hashes

| File | SHA-256 |
|---|---|
| `001_wire_switch_and_persist.sql` | `efca33ea6757e308262d0f3aec781fa0cb71e1ac907bb90fa2d142beb32d8d4e` |
| `002_materialize_hook.sql` | `1e21ba666bce44c24567d9e9b8404d8e39a683005432b419a3b1bcfe9afd8ce4` |
| `003_settle_integration.sql` | `78aefbc74128bd8b998113a65c14111df8a04e7b8551353b42328b77a03ea05f` |

Expected live installation order after a later **A19-WIRE-APPLY**: `001` → `002` → `003`. Switch row stays `enabled = false`. Do not GRANT EXECUTE. Do not copy into `supabase/migrations/`.

---

## REAL SQL — settle (`127.0.0.1:55436/a19_wire_settle`)

Exercised `private.settle_if_needed` with local throw/prepare/XP replicas, not materialize alone.

| Case | Result |
|---|---|
| Isolation loopback | PASS |
| 003 settle source calls materialize | PASS |
| Ball / berry / honey still change `capture_chance` | PASS (0.176 / 0.265 / 0.194 / 0.204) |
| Switch off: `LG` stamp row, NULL GENVAL, ball+berry spend, join+catch XP, result `Caught` | PASS (`LG00000001`) |
| Switch on: `SL` GENVAL row, Great Ball spend, XP | PASS (`SL00000002`) |
| Escape: no catch, ball spent, join XP only, `Escaped` | PASS |
| Duplicate settle exactly-once | PASS |
| Concurrent settle: one catch per trainer | PASS (`SL00000003`,`SL00000004`) |
| Unexpected persist failure (G1) rolls back ball + catch XP | PASS |
| Injected error after materialize rolls back catch, XP, bag | PASS |
| Failed HA persist leaves ticket unredeemed | PASS |
| HA 1:1 bind; replay / forged / wrong-ctx rejected | PASS |
| stamp remains null-only | PASS |

**REAL SQL 13/13 PASS.** Synthetic Oak/Leaf/Blue only.

---

## Authority

- Odds stay in `private.capture_chance`. WIRE does not retune balls, berries, or honey.
- Ball spend stays in `private.announce_throws` inside the settle transaction. Persist failure therefore cannot keep a spent ball or catch XP.
- Berry/Honey prepare remains the existing prior phase (spent when the trainer prepares). That boundary is unchanged.
- Ordinary settle never passes a hidden ticket (`p_hidden_ticket` is NULL). HA remains grant/event only.

---

## Remaining gates

| ID | Status |
|---|---|
| A19-WIRE-APPLY | Install `001`→`002`→`003` on `dtflmlbjhttoewqgkujf` with switch **false** |
| Independent review | Required before APPLY |
| A19-WIRE-GO | Flip the named switch after QA |
| A19-RESET-GO | Production wipe; local RESET-TEST already passed in D45 |

**STOP for independent review before A19-WIRE-APPLY or A19-WIRE-GO.**
