# A19-WIRE architecture (D44 planning only)

**Verdict: PLAN READY. A19-WIRE implementation remains UNAPPROVED.**

This is offline architecture. It does not modify `stamp_catch_row`, settle RPCs, triggers, or player rows. It does not GRANT GENVAL functions to clients.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Parent: epic #18. Tracking: #25. Catalog: D43 apply + D44 reconciliation (functionally equivalent GENVAL).

---

## Current live path (do not change in this batch)

```
launch → throw (ball / berry / honey) → settle
  → INSERT public.catches (dex, name, variant, gender, ball, round_id, source_key)
  → BEFORE INSERT/UPDATE catches_before_write
       → stamp_catch_row (md5 IVs, lgpe moves, friendship 0, LG public_id)
```

LIVE CATALOG:

| Object | Role |
|---|---|
| `private.catches_before_write` | assigns `id` if null, 1/128 alpha, then **always** `stamp_catch_row` |
| Trigger `catches_before_write` | BEFORE INSERT OR UPDATE OF dex/level/iv_*/av_* |
| `private.stamp_catch_row` | fills **null** combat fields only; live writer today |
| Unique `catches_round_user_uidx` | `(round_id, user_id)` where round_id present |
| Unique `catches_source_key_uidx` | `source_key` where present |
| Settle guard | `NOT EXISTS` same user+round, then `source_key = 'play:' \|\| round \|\| ':' \|\| user` |
| Capture odds | existing ball / berry / honey functions; **out of WIRE scope** |

GENVAL functions exist and are REVOKE'd. They do not write catches.

---

## Target path (future WIRE-APPLY only)

```
same launch / throw / odds / settle decision
  → persist_streamlink_catch (NEW, server-only)
       1. allocate catch uuid
       2. generate_streamlink_mon(form, level, 'catch', unused seed, shiny, pin, ticket)
       3. assert_streamlink_legal(mon, 'catch', ticket)
       4. INSERT catch with that uuid + new columns + dual-write legacy display fields
       5. if HA: UPDATE ticket.specimen_id = catch.id in the same transaction
  → stamp_catch_row still runs but sees non-null IVs/moves and must not overwrite them
```

Odds, bag spend, honey, and berry stay in the current settle functions. WIRE only replaces **how a successful catch is materialized**.

---

## Requirements mapping

| # | Requirement | Design |
|---|---|---|
| 1 | Unique per-catcher identity | Allocate `catches.id` **before** generate. Do not use `round_id` as entropy. Production generate already ignores `p_seed` and rolls `gen_random_uuid` per call, so two catchers on one round get different IVs/Natures. Persist that row under a unique `(round_id, user_id)` / `source_key`. |
| 2 | Persist Gen IX fields | WIRE INSERT fills `nature_id`, `ability_id`, `ability_slot`, `iv_*`, `ev_*`, `move_slots`, `hp_max`, `hp_current`, `ruleset_id`, `content_build`, plus dual-write `moves[]` from `legacyMoves` if UI still needs it. |
| 3 | HA ticket ↔ one catch id | generate currently binds `specimen_id = gen_random_uuid()` and a combat `specimen_digest`. Digest is **not** unique across copies (D40). WIRE must, in the **same transaction**, set `ticket.specimen_id` to the inserted `catches.id` (or add a later `catch_id` column). Assert still uses ticket + digest; the catch id is the persisted uniqueness. |
| 4 | No duplicate grants / settle replay | Keep `catches_round_user_uidx` and `catches_source_key_uidx`. Settle remains `NOT EXISTS` then INSERT. Grant paths need their own `source_key` namespace (`grant:…`, `event:…`). |
| 5 | Fair balls / berries / honey | Do not retouch `ball_catch_chance`, berry bonus, honey multipliers, or throw windows. |
| 6 | Legacy rows readable | Rows with NULL `content_build` stay stamp-era. Assert already returns `legacy-row`. No silent UPDATE of old combat fields. |
| 7 | Protect Sora / Twinkle | Grant/event/edit WIRE must refuse those profiles unless a later protected-account go. Ordinary community settle may still award them new GENVAL rows only if the owner later says so; default plan: **same protection as reset — exclude write tests; live settle follows existing encounter rules but QA must not target them**. |
| 8 | Economy / inventory | WIRE does not grant coins, candy, or items. Existing after-catch XP / loot triggers stay. |
| 9 | Rollback-safe staging + isolated tests | Unapplied SQL under `supabase/unapplied/a19-wire/` + disposable `127.0.0.1` Postgres rehearsal. Default switch **off**. |
| 10 | Explicit switch, not automatic replace | Do **not** DROP or rewrite `stamp_catch_row` as the first WIRE commit. Add a new persist helper and a **named** switch (`site_config` or GUC `starlight.wire_genval`, default false). Trigger change is a later WIRE-APPLY step. Turning the switch off returns new inserts to stamp-only fills. |

---

## Implementation phases (future)

| Phase | Work | Approval |
|---|---|---|
| W0 | This plan | D44 (done) |
| W1 | Branch-only unapplied persist SQL + local REAL SQL | **A19-WIRE-DEV** |
| W2 | Wire settle/grant to persist helper behind switch=false | same |
| W3 | Isolated rehearsal: replay, HA bind, legacy row, odds unchanged | A19-WIRE-TEST |
| W4 | Production apply persist SQL + switch still false | **A19-WIRE-APPLY** |
| W5 | Owner flips switch for new catches only (QA first) | **A19-WIRE-GO** |
| W6 | Optional later: stop filling stamp IVs on GENVAL rows | separate |

Do not combine W4/W5 with reset or APP stamp.

---

## Test matrix (when W1 starts)

| Case | Class | Expect |
|---|---|---|
| Two catchers, one round | REAL SQL | different IVs/natures; same form/level/shiny |
| Replay same `source_key` | REAL SQL | unique violation / no second row |
| HA ticket + catch id | REAL SQL | ticket.specimen_id = catches.id; second redeem replay |
| Legacy row assert | REAL SQL | `legacy-row`; no UPDATE |
| Ball/berry/honey | STATIC + existing capture tests | unchanged function text |
| Switch off | REAL SQL | stamp path only |
| Switch on | REAL SQL | new columns filled; stamp does not overwrite supplied IVs |
| Sora/Twinkle grant | REAL SQL | refuse |
| Client RPC to generate | LIVE API later | still PGRST106 / no EXECUTE |

---

## Owner gates (not granted by D44)

| ID | Question |
|---|---|
| A19-WIRE-DEV | Authorize branch-only persist SQL + local rehearsal? |
| A19-GV7 | `public_id` prefix `SL` vs keep `LG`? |
| A19-WIRE-BIND | Reuse `ticket.specimen_id` as the catch uuid, or add `catch_id`? Recommendation: reuse `specimen_id` and pass the preallocated catch uuid into a **new** persist helper (do not change generate's signature in the first WIRE patch unless required). |
| A19-WIRE-APPLY | Apply persist SQL to `dtflmlbjhttoewqgkujf` with switch off? |
| A19-WIRE-GO | Flip the switch for new catches? QA account first. |
| A19-WIRE-SORA | May live community settle write GENVAL rows onto Sora/Twinkle? Default **no special write tests**; existing encounter settle already can insert for any participant — owner should say if WIRE settle must skip them. |

Recommendation: keep capture settle universal (fair play) and ban **staff grant/edit** against Sora/Twinkle. Confirm if that is acceptable.

---

## Out of scope

Reset execution, merge, deploy, APP `20261008-rc133`, `admin.html` / `admin-live.js`, hosted generate calls, replacing `stamp_catch_row` now.
