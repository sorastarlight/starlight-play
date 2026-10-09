# Admin Hub Gate 1.7 S1 — true-read Live Operations snapshot (review)

**Date:** 2026-10-09  
**Production APP:** `20261008-rc132`  
**Feature:** `3c87845` · **Stamp:** `b36d255`  
**SPRITE:** `20260923-home1` · **LOCATION:** `20260916-loc1`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Latest applied migration:** `20261007183057` `rc118_pc_box_ops_stale_slots` (unchanged since Gate 1.5)  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**SQL applied:** NO · **Frontend integration deployed:** NO  
**Contract:** `gate-17-s1-v2`

Owner Gate 1.7 **S1** is this snapshot (remediation-plan **S3/S4**). R1 `admin_overview` is **not** in this package.

### v2 corrections (required before production approval)

1. Removed the latest-by-`started_at` encounter fallback. `encounter_rounds` has **no** `session_id`. Current encounter is only `stream_director.last_encounter_id` when that row is still open (`cancelled`/`resolved` false and stored `phase` is not `closed`). A closed pointer is `lastEncounter` only; current is JSON null.
2. `settlement.awaiting` is JSON **null** and `state` is `UNAVAILABLE`. Live `settle_if_needed` writes console, phase, throws, and catches; it is not equivalent to the `settle_due_rounds` filter.
3. `director.lastTickAt` is a recorded column. `asOf` is the observation timestamp. Twitch STALE uses `stream_status.checked_at` (15 minutes). Director tick age does not mark the snapshot stale.
4. `SET search_path = pg_catalog`; tables/helpers schema-qualified; `OWNER TO postgres`.
5. Preflight aborts if `admin_live_snapshot()` exists at all. The migration uses `CREATE FUNCTION`, not `CREATE OR REPLACE`, so an unexpected existing endpoint stops apply instead of being overwritten.
6. No `service_role` EXECUTE grant. Preview uses authenticated staff JWT. `auth.uid()` is null under service_role, so the body would 42501 anyway. Owner `postgres` retains control.

---

## 1. Production drift

| Check | Result |
|---|---|
| `public.admin_live_snapshot()` | **Does not exist** (LIVE SQL) |
| Latest migration | Same as Gate 1.5 |
| `public.stream_status` / `private.stream_director` / `public.encounter_rounds` columns | Match repo + Gate 1.5 |
| Tick views wrapping director | **None** |
| Gate 1.6 proposal vs live freshness | **Proposal defect, not DB drift.** Gate 1.6 treated `checked_at is not null` as known. Live `private.stream_live_state()` requires `checked_at > now() - 15 minutes`. Gate 1.6 also `coalesce(rpg, false)`, which would render a missing director row as INACTIVE. S1 SQL corrects both. |

No production schema stop-condition. The Gate 1.6 SQL remains a proposal and must not be applied.

---

## 2. Source tables and helper chain

**Call graph (proposed function only):**

```
public.admin_live_snapshot()
  → private.is_play_admin()                         -- FIRST, STABLE DEFINER, SELECT-only
      → private.play_staff_role(auth.uid())         -- STABLE DEFINER, SELECT-only
          → public.site_config
          → public.twitch_connections
          → auth.identities
          → public.staff_roles
  → SELECT public.stream_status WHERE id = 1
  → SELECT private.stream_director WHERE id = 1
  → SELECT private.stream_sessions WHERE id = director.session_id (if set)
  → SELECT public.encounter_rounds WHERE id = director.last_encounter_id (if set)
```

No other functions. No `latest_round` / `round_phase` / `director_active_round` (the last two sit on `sync_latest_round` → `settle_if_needed`). Inlined Twitch freshness copies the **15-minute** rule from live `private.stream_live_state()` without calling it.

**Not called:** `admin_live_dashboard`, `admin_overview`, `director_dashboard`, `director_tick_if_due`, `director_tick`, `settle_due_rounds`, `director_active_round`, `sync_latest_round`, `admin_director_command`, `admin_start_round`, `apply_stream_status`.

**Triggers:** `encounter_rounds` / `stream_status` triggers are INSERT/UPDATE only. SELECT does not fire them. `stream_director` has no non-internal triggers.

**RLS:** DEFINER bypasses RLS after the staff check. `stream_status` is already publicly readable; `stream_director` is private (the sensitive row). Encounter `players` / `pokemon` jsonb are **not** returned.

---

## 3. Authorization

| Item | Contract |
|---|---|
| Intended roles | Existing hub staff: owner / admin / moderator via `private.is_play_admin()` (`play_staff_role is not null`) |
| Not broadened | Same gate as `admin_live_dashboard` / health RPCs. No viewer access. |
| Anonymous | `REVOKE ALL` from `PUBLIC` and `anon`. PostgREST must 401 before body if the grant holds. Body still 42501 if a grant is wrong. |
| Authenticated nonstaff | EXECUTE allowed (PostgREST authenticated role); body raises `42501` `not allowed`. |
| Staff | JSON snapshot |
| DEFINER / search_path | `SECURITY DEFINER`, `search_path = pg_catalog`, schema-qualified `public.*` / `private.*` |
| Owner | `ALTER FUNCTION … OWNER TO postgres` |
| EXECUTE | `authenticated` only. `REVOKE ALL` from `PUBLIC`, `anon`, and `service_role`. |
| JWT | Uses `auth.uid()` through `play_staff_role`. Not `user_metadata`. |
| Audit writes | None |

Authenticated-only EXECUTE is **not** treated as admin proof. The body check is mandatory.

---

## 4. Response contract

```json
{
  "ok": true,
  "observation": true,
  "contract": "gate-17-s1-v2",
  "asOf": "timestamptz",
  "twitch": {
    "state": "LIVE | OFFLINE | UNKNOWN | STALE",
    "live": true,
    "known": true,
    "stale": false,
    "checkedAt": "timestamptz|null",
    "source": "text|null",
    "title": "text|null"
  },
  "rpgSession": {
    "state": "ACTIVE | INACTIVE | UNKNOWN",
    "active": true,
    "sessionId": "uuid|null",
    "startedAt": "timestamptz|null",
    "directorRowPresent": true,
    "sessionRowPresent": true,
    "sessionEndedAt": "timestamptz|null"
  },
  "director": {
    "status": "text|null",
    "lastTickAt": "timestamptz|null",
    "updatedAt": "timestamptz|null"
  },
  "currentEncounter": null,
  "lastEncounter": {
    "id": "uuid",
    "phase": "text|null",
    "inProgress": false
  },
  "settlement": {
    "awaiting": null,
    "state": "UNAVAILABLE"
  }
}
```

`twitch.live` is JSON `true` only for LIVE, `false` only for OFFLINE, **`null` for UNKNOWN/STALE**. Do not coalesce to false.

Unauthorized callers receive SQLSTATE `42501` and **no** snapshot object.

### Situation table

| Situation | Twitch | RPG | Encounter |
|---|---|---|---|
| Twitch offline, RPG not started | OFFLINE | INACTIVE | NONE or last recorded |
| Twitch live, RPG not started | LIVE | INACTIVE | not inferred from LIVE |
| RPG active | independent | ACTIVE | current or NONE |
| Encounter in progress | independent | usually ACTIVE | `currentEncounter` from `last_encounter_id` if still open |
| Complete, not yet settled | independent | independent | may still be `currentEncounter` if stored row is open; `settlement.state=UNAVAILABLE` |
| Closed `last_encounter_id` | independent | independent | `currentEncounter` null, `lastEncounter` filled. Not shown as current. |
| No stream session | independent | INACTIVE or UNKNOWN | `sessionId` null is not a shutdown proof if director row is missing |
| Stale Twitch (`checked_at` older than 15 min) | STALE, `live` null | unchanged | unchanged; `asOf` still observation time |
| Missing director row | independent | UNKNOWN, `active` null | current and last encounter JSON null |
| Unauthorized | exception 42501 | — | — |

Presentation: UNKNOWN ≠ INACTIVE. UNAVAILABLE ≠ OFFLINE. STALE ≠ OFFLINE. Twitch LIVE ≠ RPG ACTIVE.

---

## 5. Side-effect analysis

| Class | Result |
|---|---|
| Encounter mutation | None. SELECT by id only. |
| Session / director transition | None. Reads `rpg_session_active` / `session_id` / `stream_sessions`. |
| Stream lifecycle write | None. Does not call `apply_stream_status`. |
| Inventory / account | None. |
| Audit | None. |
| `STABLE` | `now()` only for `asOf` and Twitch 15-minute known window. |

---

## 6. Frontend plan (not deployed)

Keep `READ_RPCS` = `admin_build_health`, `admin_game_health` until SQL is live.

After approval + apply:

1. Add **only** `admin_live_snapshot` to the allowlist.
2. Never re-add `admin_live_dashboard` or `admin_overview`.
3. No generic dispatcher.
4. Operations: loading → authorized cards → denied / missing / network fallback (current UNAVAILABLE copy).
5. Optional poll ≤ 30s, one in-flight request, stop when the Operations tab is hidden. Polling is **not** required to keep gameplay running.
6. No mutation controls.

Presenter (unloaded): `docs/audits/admin-hub-gate-17-s1-frontend-contract.js`.

---

## 7. Known limitations

- Does not include auto-queue, ads, joined-player counts, or special-event payload.
- An in-progress round that is **not** `last_encounter_id` is not reported (no session FK on `encounter_rounds`).
- Stored `phase` can lag clock-computed `round_phase` until a tick/settle writes. Snapshot will not call `round_phase`.
- Settlement status is UNAVAILABLE; do not infer due-settlement from this RPC.
- `lastTickAt` is not a reason to open the dashboard to keep gameplay alive (`play_sync` still ticks).
- Moderators can read this snapshot (same as the current dashboard gate). Privilege narrowing is R18, not S1.

---

## 8. Owner approval request

Apply **only** `docs/audits/sql/gate-17-s1-live-snapshot-up.sql` (`gate-17-s1-v2`).

Do not apply Gate 1.6 SQL, S1 v1, R1, grant sweeps, or frontend wiring in the same change.

### Unresolved assumptions (not blockers)

- An open round that is not `last_encounter_id` is omitted. There is no encounter↔session foreign key to join safely.
- Current-open uses stored `cancelled` / `resolved` / `phase`, not clock-computed `round_phase`.
- `stream_sessions.ended_at` is reported when the row exists; a missing session row is `sessionRowPresent=false`, not proof of a clean shutdown.
