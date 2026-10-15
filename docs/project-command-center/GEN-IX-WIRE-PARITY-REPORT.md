# A19-WIRE production-parity review (D47)

**Verdict: BRANCH PARITY CORRECTIONS DELIVERED. Production settlement body outside the successful-catch writer matches LIVE CATALOG. A19-WIRE-APPLY, switch-on, A19-WIRE-GO, A19-RESET-GO, merge, deploy, and APP stamp remain UNAPPROVED.**

Owner authorized branch-only corrections, read-only live catalog comparison, and disposable local PostgreSQL. Baseline D46 `fefbf362` / `c3c27951`. Independent D46 review: [#18 comment 6183042133](https://github.com/sorastarlight/starlight-play/issues/18#issuecomment-6183042133).

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Production APP `20261008-rc133` unchanged. Smoke paused.

| Honesty | Used |
|---|---|
| STATIC | Hook stripped from `003`; hashes; live-catalog semantic diff |
| LIVE CATALOG | Read-only `pg_get_functiondef('private.settle_if_needed(encounter_rounds)')` on `dtflmlbjhttoewqgkujf` |
| REAL SQL | Embedded Postgres `127.0.0.1:55436` / `a19_wire_settle` |
| NOT RUN | Hosted SQL writes, WIRE-APPLY, switch-on, hosted generate, RESET-GO, PRODUCTION smoke |

---

## Production settlement parity verdict

**PASS with documented intended deltas.** Live `private.settle_if_needed(r encounter_rounds)` (oid 17748, owner `postgres`, `SECURITY INVOKER`, volatile, `proacl` null) matches proposed `003` for advisory locking, pause/cancel guards, deadline clocks, `announce_throws` ball spend, `capture_chance` (ball / berry / honey), `testOutcome`, `capture_log`, Caught/Escaped console copy, player `FOR UPDATE`, and the final `resolved` update.

The only production-targeted writer change remains the successful-catch persist call. D47 removed the D46 test hook from that production function.

---

## Semantic diff (live vs `003`)

Live source: form-aware body currently installed on `dtflmlbjhttoewqgkujf` (same text as `20260918050200_form_aware_rpcs.sql`). Compared by catalog `pg_get_functiondef`, not by assuming local replicas.

### Unchanged (must stay)

| Area | Live | `003` |
|---|---|---|
| Null / cancelled / paused early returns | identical | identical |
| `pg_try_advisory_xact_lock(hashtextextended(r.id::text, 0))` | identical | identical |
| Reload round; pending+resolved short-circuit | identical | identical |
| Deadline parse (`join` / `prepare` / `throw` / `reveal`) | identical | identical |
| Empty-join cancel + console | identical | identical |
| `phase_banner` prepare/throw | identical | identical |
| Throw-window hold; `round_phase` fallback | identical | identical |
| `announce_throws` + `last_action` | identical | identical |
| Reveal hold | identical | identical |
| `capture_config` + TEST `testOutcome` | identical | identical |
| Honey contributor counts | identical | identical |
| Player `FOR UPDATE` loop, no-ball path | identical | identical |
| `capture_chance` + `capture_throw_context` | identical | identical |
| Roll / guaranteed / TEST override | identical | identical |
| Player result `Caught` / `Escaped` | identical | identical |
| `capture_log` ON CONFLICT DO NOTHING | identical | identical |
| Console ⭐ / ✖ copy + uniqueness guards | identical | identical |
| `resolved` / `last_action` close | identical | identical |
| Privilege | INVOKER / postgres | INVOKER (CREATE OR REPLACE keeps owner on apply) |

Cosmetic only: keyword case (`if` vs `IF`). Not behavioral.

### Intended differences (successful-catch writer only)

| Topic | Live | `003` (D47) |
|---|---|---|
| Persist | `INSERT public.catches (…) ON CONFLICT DO NOTHING` | `private.materialize_streamlink_catch` (switch-off stamp / switch-on GENVAL) |
| Level | omitted; `stamp_catch_row` fills `encounter_pokemon_level(dex, round)` | same formula, passed explicitly so stamp keeps it |
| Unique replay | silent `ON CONFLICT DO NOTHING` | `already-settled` is silent **only if** a matching `(round_id, user_id)` catch exists |
| Ghost Caught | possible if unique conflict inserts nothing | `RAISE wire-materialize-failed: already-settled-without-catch` rolls back the settle transaction |
| Other persist errors | INSERT errors abort the statement | `RAISE wire-materialize-failed` (same abort of the settle txn, including ball spend and catch XP) |
| COMMENT | none / prior | D47 comment; no test hook |

D46 also preferred `r.pokemon->>'level'` over `encounter_pokemon_level`. That would have diverged from live stamp fill whenever JSON level was set. D47 removed that preference.

### Removed D46 production defect

`IF to_regprocedure('private.streamlink_after_materialize_hook()') … PERFORM …` is **gone** from `003`. Failure injection is `local/040_test_inject.sql` only (AFTER INSERT trigger + GUC `starlight.wire_test_fail`).

### Remaining helper-level differences (not in the settle body)

These live in `002` / `001`, not in the settle control flow:

- Switch-off stamp INSERT defaults blank gender to `'M'` (live INSERT stores `r.gender`, then `stamp_catch_row` rolls). Ordinary rounds pass a non-null encounter gender, so the path matches.
- Switch-off dex is resolved from `private.ref_forms` (fallback `p_form_id`) instead of `r.dex`. Canonical form ids used by settle keep these aligned.
- `materialize_streamlink_catch` is `SECURITY DEFINER` with EXECUTE revoked; settle itself stays invoker.

`private.stamp_catch_row` is not replaced. `public.play_throw` / `public.play_prepare` are not replaced. Live unique indexes `catches_round_user_uidx` and `catches_source_key_uidx` match the local rehearsal.

---

## SQL artifacts and hashes

| File | SHA-256 | D47 change |
|---|---|---|
| `001_wire_switch_and_persist.sql` | `efca33ea6757e308262d0f3aec781fa0cb71e1ac907bb90fa2d142beb32d8d4e` | unchanged |
| `002_materialize_hook.sql` | `1e21ba666bce44c24567d9e9b8404d8e39a683005432b419a3b1bcfe9afd8ce4` | unchanged |
| `003_settle_integration.sql` | `1bc62eb24f27204e52f01fe66a871c320da459df7d933c9054f7d67e57edfe68` | hook removed; stamp-equivalent level; ghost-Caught RAISE |

Expected live installation order after a later **A19-WIRE-APPLY**: `001` → `002` → `003`. Switch row stays `enabled = false`. Do not GRANT EXECUTE. Do not install `local/040_test_inject.sql`. Do not copy into `supabase/migrations/`.

---

## REAL SQL — settle (`127.0.0.1:55436/a19_wire_settle`)

Exercised `private.settle_if_needed` after installing production `003`, then local-only `040`. Installed settle source was asserted to contain no hook.

| Case | Result |
|---|---|
| Isolation loopback | PASS |
| 003 calls materialize; no production hook | PASS |
| Local 040 inject does not rewrite settle | PASS |
| Ball / berry / honey still change `capture_chance` | PASS |
| Switch off: `LG` stamp row, NULL GENVAL, spend+XP, `Caught` | PASS |
| Switch on: `SL` GENVAL row, spend+XP | PASS |
| Escape: no catch, ball spent, join XP only | PASS |
| Duplicate settle: one catch, stable `Caught`, no extra XP/spend | PASS |
| Pre-existing matching catch: `Caught` has a row, no duplicate XP | PASS |
| Source-key conflict without matching catch: rollback, no ghost `Caught`, ticket untouched | PASS |
| Concurrent settle: one catch per trainer | PASS |
| Unexpected persist failure (G1) rolls back ball + catch XP | PASS |
| Local injected AFTER INSERT error rolls back catch, XP, bag | PASS |
| Failed HA persist leaves ticket unredeemed | PASS |
| HA 1:1 bind; replay / forged / wrong-ctx rejected | PASS |
| stamp remains null-only | PASS |

**REAL SQL 16/16 PASS.** Synthetic Oak/Leaf/Blue only.

---

## Duplicate-result consistency

- Replay of a resolved successful settle keeps one catch, `Caught`, and the original XP / bag totals.
- A pre-inserted matching `(round, user)` catch is treated as already materialized: result may be `Caught` only with that row present; `after_catch_xp` does not fire again.
- A `source_key` unique conflict that does **not** leave a matching `(round, user)` catch **RAISE**s. Player result, round `resolved`, ball spend, catch XP, and hidden tickets stay uncommitted.
- Ordinary settle still never passes `p_hidden_ticket`.

This is stricter than live `ON CONFLICT DO NOTHING` (which could leave `Caught` without a row). Idempotent true replays are unchanged.

---

## A19-WIRE-APPLY readiness

The two D46 independent-review blockers are resolved on the branch:

1. Production `003` has no test hook.
2. LIVE CATALOG settle body is semantically matched outside the intended writer swap, with ghost-Caught tightened.

**A19-WIRE-APPLY can be considered for a separate named owner GO** after independent D47 review. This report is **not** that GO. Apply would still install `001`→`002`→`003` with the switch **false**, replace the live settle function in one `CREATE OR REPLACE`, and leave `stamp_catch_row` in place.

---

## Remaining gates

| ID | Status |
|---|---|
| Independent D47 review | Required before APPLY |
| A19-WIRE-APPLY | Install `001`→`002`→`003` on `dtflmlbjhttoewqgkujf` with switch **false** |
| A19-WIRE-GO | Flip the named switch after QA |
| A19-RESET-GO | Production wipe; local RESET-TEST already passed in D45 |

**STOP for independent review before A19-WIRE-APPLY or A19-WIRE-GO.**
