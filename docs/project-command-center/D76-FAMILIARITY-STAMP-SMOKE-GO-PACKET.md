# D76 — Species Familiarity stamp-smoke GO packet

**Verdict:** **D76 STAMP SMOKE GO PACKET READY — OWNER APPROVAL REQUIRED**  
**Status:** Packet only. The proposed GO below is not approved. No hosted Pokémon was created.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `8a48eb56`  
**Work commit:** filled by the pointer commit after this report lands.  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**PostgreSQL:** 17.6 hosted. Local rehearsal 17.5.  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**. No QA account was provisioned.

`activate_species_mastery_events()` was not called. No encounter ran. No production catch, profile, inventory, or capture history was read.

Do not start D77. Do not run this smoke until the owner fills the required identity field and pastes the GO. Final release smoke stays paused.

## 1. Hosted preflight

Class: **READ-ONLY LIVE CATALOG**. Checked `2026-10-18 01:11:01.954966+00`. Stop was not required. The catalog matches the D74 install and the D75 inactive baseline.

| Check | Result |
|---|---|
| Lifecycle | `inactive` |
| `activated_at` | null |
| `paused_at`, `drain_started_at`, `closed_at` | null |
| Familiarity events | 0 |
| Outbox rows | 0 |
| `pg_cron` | absent |
| WIRE `enabled` | false |
| `settle_if_needed(r encounter_rounds)` md5 | `565c102d0a8c84a3dfd036653aca307c` |
| Stamp md5 | `b66ad1b961b3573a2c48947dfe0413ea` |
| Freeze md5 | `ae884032419d5162ead315d0f216d76c` |
| `caught_at` freeze md5 | `046fb0fe991c2aa28f3b8fcbe39b42e9` |
| `grant_mastery` md5 | `d5c11cc672f2cb16ae0210023a8dd91b` |
| `mastery_rank` md5 | `04fa122f1f4424cd6e63fa1f3ffa16a4` |
| `play_rankings` md5 | `b6526a939abdba0ef106e127925c43b0` |
| `materialize_streamlink_catch` md5 | `e88c6cbec313a4cc0b81a5df1f5691b3` |
| `server_inserted_at` | timestamptz, nullable, no default |
| `caught_at` | timestamptz, not null, default `now()` |
| BEFORE INSERT order | `catch_server_inserted_at`, then `catches_before_write` |
| Unique round and trainer | present |
| APP | `20261008-rc133` |

`announce_throws` still contains the bag-spend call. `after_catch_xp`, `after_catch_present`, `catches_before_write`, and `stamp_catch_row` do not mention `grant_mastery`. This check did not read a catch row.

## 2. Recommended smoke

**Use approach A: one canonical Play encounter.** Do not use approach B.

Approach A runs the installed path: `announce_throws`, `settle_if_needed`, and `materialize_streamlink_catch` with WIRE off. That insert is the one the stamp, `catches_before_write`, the present and xp triggers, and the inactive familiarity note all see together. The unique round-and-trainer index is the duplicate guard the replay path already uses.

Approach B, a trusted insert that skips the encounter, can light `server_inserted_at` by itself. The local contrast did that. The row had no round, no Play source key, and no capture log. It does not prove settlement, replay, or the inactive note. A hand-built row would also skip canonical generation. This packet does not authorize that.

The real encounter will do more than insert one specimen. `announce_throws` spends the ball the trainer chose. Berries or Honey are spent only if that trainer uses them. Settlement writes the round result, one capture log, and console lines. Existing catch triggers still fill the public id and the present and xp rows. Those are the ordinary Play mutations. They are listed so the GO can bound them. They are not a reason to insert a specimen outside Play.

## 3. Required QA identity

**REQUIRED — UNSPECIFIED.** This packet does not name, create, or change an account.

The owner GO must fill every field before it can be used:

| Field | Value |
|---|---|
| QA account uuid | REQUIRED — UNSPECIFIED |
| Login name | REQUIRED — UNSPECIFIED |
| Account already exists | Required answer. This packet does not provision one. |
| Staff role | Must be nonstaff |
| Sora or Twinkle | Excluded |
| PlayTester | Untouched unless the GO names PlayTester |
| Permitted operation | One canonical Play encounter |
| Maximum new specimens | 1 |
| Ball, berry, and Honey | One chosen ball may be spent. Berry or Honey only if the trainer uses them. |
| Retention | Keep the specimen. Do not delete it. |
| Permitted reads | Only the checks in section 4, for the one new catch id |
| Stop rule | First unexpected result. No blind retry. |

A catch made before activation stays outside Familiarity forever. Keeping it is the retention policy. Deleting it is not a cleanup step.

## 4. Expected mutations and later reads

If the future GO is approved and the one encounter succeeds, expect:

- One new `public.catches` row for the named QA account.
- `server_inserted_at` set by the stamp to a finite `clock_timestamp()`, not by a client value.
- `caught_at` left as the existing `now()` default, because materialize does not write that column. The freeze trigger rejects a later change. The smoke must not update it.
- One resolved encounter round, one player result, one successful capture log, and the usual console lines.
- The chosen ball removed by the existing `announce_throws` path.
- No second specimen for that round and trainer.
- Lifecycle still `inactive`, `activated_at` still null.
- Familiarity events still 0. Outbox rows still 0.
- WIRE `enabled` still false.

These reads are not authorized by D76. A later GO may read only the new catch id plus the aggregate counters:

```sql
SELECT id, user_id, caught_at, server_inserted_at
FROM public.catches
WHERE id = :new_catch_id;

SELECT count(*) FROM public.catches
WHERE round_id = :round_id AND user_id = :qa_user_id;

SELECT lifecycle, activated_at IS NULL AS activated_null
FROM private.species_mastery_activation
WHERE singleton;

SELECT count(*) FROM public.species_mastery_events;
SELECT count(*) FROM private.species_mastery_outbox;
SELECT enabled FROM private.streamlink_wire_switch;
```

Pass means one row, `user_id` is the named QA account, `server_inserted_at` is finite and within two minutes of the encounter, `caught_at` is finite, the round count is 1, lifecycle is `inactive`, both familiarity counts are 0, and WIRE is false.

## 5. Stop and recovery

Stop on the first unexpected result. Do not retry. Do not activate. Do not edit the stamp. Do not rewrite any `server_inserted_at` or `caught_at`.

| Result | Response |
|---|---|
| Stamp trigger error | The insert rolls back. No specimen remains. Stop. Leave the trigger in place. |
| Materialize error | Settlement raises. If the transaction rolled back, no specimen remains. Stop. |
| Duplicate specimen | Stop. Do not delete either row. |
| Reported success but no specimen | Stop. Do not throw again. |
| Any outbox row or familiarity event | Stop. Do not deliver or reconcile. |
| Spending beyond the one chosen ball, or an unused berry or Honey | Stop. |
| Lifecycle leaves `inactive` | Stop. Do not continue the encounter. |

Recovery does not drop triggers, does not activate Familiarity, and does not delete the specimen if one was created.

## 6. Local rehearsal

Class: **REAL SQL** on disposable PostgreSQL 17.5, `127.0.0.1:55448`. Synthetic trainers only. `capture_chance` and `announce_throws` are stubs, so production odds and bag spending were not measured. The bare-insert case is **SIMULATED** contrast, not the recommended smoke.

`node tools/d76-stamp-smoke-rehearsal.js`: **8/8**.

| Check | Result |
|---|---|
| Inactive install, empty ledger | pass |
| One settle, finite `server_inserted_at` inside the settle window, `caught_at` unchanged by a later update | pass |
| Replay leaves one specimen | pass |
| Duplicate materialize returns `already-settled` and leaves one specimen | pass |
| No familiarity event, no outbox row, lifecycle `inactive`, WIRE stub false | pass |
| A raising stamp leaves no specimen and does not activate | pass |
| SIMULATED bare insert gets a timestamp but has no round and no capture log | pass |

## 7. Proposed owner GO

This statement is **not approved**. It cannot be used until the owner replaces every REQUIRED field and explicitly authorizes it.

```text
OWNER GO — one pre-activation stamp smoke. Not yet approved.

QA account uuid: REQUIRED — UNSPECIFIED
QA login: REQUIRED — UNSPECIFIED
The account must already exist, must be nonstaff, and must not be Sora or Twinkle.
PlayTester may be used only if this GO names PlayTester. Otherwise PlayTester stays untouched.

Permitted action: one canonical Play encounter for that account, while
private.species_mastery_activation.lifecycle is inactive and WIRE enabled is false.
Maximum new specimens: 1.
The chosen Poké Ball may be spent. A berry or Honey may be spent only if the trainer uses it.
Keep the specimen. Do not delete it.

After that one encounter, read only the new catch id, the count of catches for
that round and account, the activation singleton, the familiarity event count,
the outbox count, and the WIRE flag.

Stop on the first unexpected result. Do not retry. Do not activate Species
Familiarity. Do not reconcile or deliver. Do not edit the stamp or any timestamp.
Do not start D77.
```

## 8. Still required before any smoke

- The owner fills the QA uuid and login, and confirms the account already exists.
- The owner pastes the GO as an authorization, not as a copy of this packet.
- No hosted catch, encounter, activation, or specimen read happens under D76.

Do not start D77.
