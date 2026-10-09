# Admin Hub Gate 1.7 S1 — true-read Live Operations snapshot (review)

**Date:** 2026-10-09  
**Production APP:** `20261008-rc132`  
**Feature:** `3c87845` · **Stamp:** `b36d255`  
**SPRITE:** `20260923-home1` · **LOCATION:** `20260916-loc1`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Latest applied migration:** `20261007183057` `rc118_pc_box_ops_stale_slots` (unchanged since Gate 1.5)  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**SQL applied:** NO · **Frontend integration deployed:** NO

Owner Gate 1.7 **S1** is this snapshot (remediation-plan **S3/S4**). R1 `admin_overview` is **not** in this package.

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
  → SELECT public.encounter_rounds (last_encounter_id, else latest non-test)
```

No other functions. Inlined Twitch freshness copies the **15-minute** rule from live `private.stream_live_state()` without calling it (that helper’s `live` boolean is false when stale). Settlement due-flag is inlined from live `private.settle_due_rounds` **predicate only** — no `PERFORM`.

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
| DEFINER / search_path | `SECURITY DEFINER`, `search_path = public`, schema-qualified `private.*` |
| Owner | postgres (default) |
| JWT | Uses `auth.uid()` through `play_staff_role`. Not `user_metadata`. |
| Audit writes | None |

Authenticated-only EXECUTE is **not** treated as admin proof. The body check is mandatory.

---

## 4. Response contract

```json
{
  "ok": true,
  "observation": true,
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
    "directorRowPresent": true
  },
  "director": {
    "status": "text|null",
    "lastTickAt": "timestamptz|null",
    "updatedAt": "timestamptz|null",
    "freshness": "FRESH | STALE | UNKNOWN"
  },
  "encounter": {
    "present": true,
    "inProgress": true,
    "awaitingSettlement": false,
    "id": "uuid|null",
    "phase": "text|null",
    "name": "text|null",
    "dex": 0,
    "variant": "text|null",
    "cancelled": false,
    "resolved": false,
    "startedAt": "timestamptz|null",
    "endsAt": "timestamptz|null",
    "lastAction": "text|null",
    "paused": false,
    "source": "text|null"
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
| Encounter in progress | independent | usually ACTIVE | `inProgress` + `phase` |
| Complete, not yet settled | independent | independent | `awaitingSettlement: true`, still `inProgress` |
| No stream session | independent | INACTIVE or UNKNOWN | `sessionId` null is not a shutdown proof if director row is missing |
| Stale Twitch (`checked_at` older than 15 min) | STALE, `live` null | unchanged | unchanged |
| Missing director row | independent | UNKNOWN, `active` null | last non-test round if any |
| Unauthorized | exception 42501 | — | — |

Presentation: UNKNOWN ≠ INACTIVE. UNAVAILABLE ≠ OFFLINE. STALE ≠ OFFLINE. Twitch LIVE ≠ RPG ACTIVE.

---

## 5. Side-effect analysis

| Class | Result |
|---|---|
| Encounter mutation | None. SELECT + boolean predicate. |
| Session / director transition | None. Reads `rpg_session_active` / `session_id`. |
| Stream lifecycle write | None. Does not call `apply_stream_status`. |
| Inventory / account | None. |
| Audit | None. |
| `STABLE` | `now()` for `asOf` and freshness. No writes. |

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

- Does not include auto-queue, ads, joined-player counts, or special-event payload (keeps the read surface small).
- `awaitingSettlement` can be true while the round is still open; the preview must not settle it.
- Director `freshness` STALE means last recorded tick is old, not that staff must open the dashboard to keep the game alive (`play_sync` still ticks).
- Moderators can read this snapshot (same as the current dashboard gate). Privilege narrowing is R18, not S1.

---

## 8. Owner approval request

Apply **only** `docs/audits/sql/gate-17-s1-live-snapshot-up.sql`.

Do not apply Gate 1.6 SQL, R1, grant sweeps, or frontend wiring in the same change.
