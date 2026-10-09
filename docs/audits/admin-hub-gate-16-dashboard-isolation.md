# Admin Hub Gate 1.6 — read-only dashboard isolation

**Date:** 2026-10-09  
**Before APP:** `20261008-rc131` / feature `2915d82` / stamp `ba41665` / docs `cad037b`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf` (no SQL applied)  
**Sora mutated:** NO · **Twinkle mutated:** NO

## Original unsafe call chain (Gate 1.5 LIVE SQL)

```
admin-next.js loadOperations()
  → playCall("admin_live_dashboard")
    → private.director_dashboard()
      → private.director_tick_if_due()
        → settle_due_rounds()          -- always
        → director_tick()              -- if last tick > 10s
          → may director_start_now()   -- if RPG session active + auto due
```

`admin_overview` was already excluded from the preview. Legacy `admin-live.js` still polls `admin_live_dashboard` on purpose (Operations).

## Removed frontend call sites

| Site | Change |
|---|---|
| `js/admin-next.js` `READ_RPCS` | Removed `admin_live_dashboard` |
| `js/admin-next.js` `loadOperations` | Deleted. Replaced with `renderOperationsFallback()` — no RPC |
| `js/admin-next.js` `loadHub` | Renders fallback only. No tick/settle/director calls |

`admin.html` / `admin-live.js` / director SQL **unchanged**.

## Safe observation endpoints

Allowlist (`READ_RPCS`):

1. `admin_build_health` — TRUE READ after `is_play_admin` (Analytics tab, one-shot)
2. `admin_game_health` — TRUE READ after `is_play_admin` (Analytics tab, one-shot)

These are **not** used to populate Live RPG / encounter / director cards. `admin_game_health.twitch.live` is a coalesced boolean and must not be shown as Operations RPG state.

## Polling

**Disabled** on the preview. No `setInterval`. Analytics health loads once per page session when that tab is opened (`healthLoaded` guard). Refresh = full page reload; Operations still does not request unsafe RPCs.

## Fallback

Operations always shows:

- Status: “Live status unavailable in preview…”
- Cards: Twitch / Live RPG session / Current encounter / Director = **UNAVAILABLE** (not INACTIVE, not green)
- Permission-model copy unchanged
- Link to `admin.html?section=dashboard`

A missing snapshot is preferred to a mutating observation card.

## New snapshot RPC

**Still required** for a real Operations observation card. Review SQL only:

`docs/audits/sql/gate-16-review-admin-live-snapshot.sql`

**Not applied.** Preview does not call it.

## Authentication

Unsigned: `#staff` hidden, sign-in gate. Signed non-staff: same gate copy. Staff: `is_play_admin` then shell. Backend still authorizes each health RPC. Frontend gate is not treated as authority.

## Network verification (LOCAL HARNESS + REAL DOM)

`tools/qa-admin-next-isolation.js` against `http://127.0.0.1:4221/admin-next.html`.

Captured `/rpc/` requests across unsigned load, force-revealed Operations, all tab clicks including Analytics, and reload:

| Method | Endpoint |
|---|---|
| POST | `admin_build_health` |
| POST | `admin_game_health` |
| OPTIONS | `admin_build_health` (CORS preflight) |
| OPTIONS | `admin_game_health` (CORS preflight) |

`unsafeHits`: **none**. No `admin_live_dashboard`, `admin_overview`, `director_dashboard`, `director_tick_if_due`, `settle_due_rounds`, `admin_director_command`, or `admin_start_round`.

Health POSTs occurred only after the Analytics tab was opened on a force-revealed staff panel (layout-only; unsigned). Unsigned gate load made no dashboard RPCs. Automatic polling is off.

Evidence: `docs/audits/admin-hub-gate-16-shots/gate-16-qa.json`

Cursor browser REAL DOM (unsigned + layout-revealed Operations):

- Gate: “Sign in to open the Admin Hub preview.” `#staff` hidden.
- `PLAY_ADMIN_NEXT.READ_RPCS` = `admin_build_health`, `admin_game_health`.
- No Start / director / grant controls.
- Tab clicks + Analytics: fetch hook captured only those two health RPCs. `unsafe` empty.
- Health status after unsigned Analytics: “Read-only health snapshot. Live RPG session state is not included…”
- Viewports 1920 / 1440 / 960 / 390: amber UNAVAILABLE cards, not green ACTIVE. Status wraps. Nav remains usable.

## Remaining risks

- R1 `admin_overview` settle-before-guard — **OPEN** (legacy hub still calls it)
- R17 preview invocation — **MITIGATED (preview UI)** after network verification; legacy Dashboard still ticks
- No true-read session snapshot in production — Gate 1.7 S1 review package ready, not applied (`docs/audits/admin-hub-gate-17-s1-snapshot-review.md`)
- R2/R4/R12/R18 unchanged
