# Admin Hub Gate 1.7 S1 — snapshot test plan

**Do not run mutating tests. Do not invoke tick/settle RPCs. Do not use Sora or Twinkle.**  
SQL cases are for a clone / local stack **after** owner-approved apply. Mock presentation tests run now.

## Already run (this gate)

| ID | Check | Result |
|---|---|---|
| F1 | Preview `READ_RPCS` is still the two health RPCs | `tests/admin-hub-gate-17-s1-snapshot-tests.js` |
| F2 | Preview HTML fallback / lifecycle copy unchanged | same |
| F3 | Up-migration body has staff guard first and no tick/settle identifiers | same |
| F4 | Mock: LIVE + RPG INACTIVE | same |
| F5 | Mock: LIVE + RPG ACTIVE | same |
| F6 | Mock: OFFLINE + RPG INACTIVE | same |
| F7 | Mock: UNKNOWN + UNKNOWN (not INACTIVE/OFFLINE) | same |
| F8 | Mock: active encounter vs NONE | same |
| F9 | Mock: STALE ≠ OFFLINE | same |
| F10 | Mock: denied / network / missing → UNAVAILABLE, `mutate: false` | same |

## After approved SQL apply (not now)

Use `docs/audits/sql/gate-17-s1-authorization-tests.sql` on a clone.

| ID | Actor | Expect |
|---|---|---|
| A1 | `anon` EXECUTE privilege | false |
| A2 | `PUBLIC` EXECUTE privilege | false |
| A3 | `authenticated` EXECUTE privilege | true |
| A3b | `service_role` EXECUTE privilege | false |
| A4 | Function `prosrc` | no tick/settle/director dashboard identifiers |
| B1 | `SET LOCAL ROLE anon` then call | `42501`, no JSON snapshot |
| C1 | Authenticated nonstaff JWT | `42501`, no staff fields |
| D1 | QA staff JWT (PlayTester / dedicated staff, not Sora/Twinkle) | `ok: true`, permitted fields only |
| D2 | D1 before/after `encounter_rounds.updated_at`, `stream_director.updated_at`, `stream_status.updated_at` | unchanged |
| E1 | Three successive staff reads | coherent ids/states; still no `updated_at` movement |
| F1 | Clone: hide director row inside a rolled-back transaction | `rpgSession.state = UNKNOWN`, `active` JSON null |
| F2 | Clone: stale `stream_status.checked_at` | `twitch.state = STALE`, `live` null |
| F3 | Permission-denied message | no account email, Twitch id, or trainer dossier |
| F4 | Closed `last_encounter_id` | `currentEncounter` JSON null; `lastEncounter` present |
| F5 | `settlement.awaiting` | JSON null, `state=UNAVAILABLE` |
| F6 | Preflight if `admin_live_snapshot` already exists | apply aborts; no overwrite. `CREATE FUNCTION` (not `OR REPLACE`) is a second stop. |

## Explicitly forbidden tests

- Calling `admin_live_dashboard` / `admin_overview` to “prove” they mutate
- Production stream settlement
- Anonymous security tests against tick-enabled RPCs
- Frontend deploy of `admin_live_snapshot` before D1/D2 pass on a clone

## Frontend integration tests (later gate)

After SQL is live: network capture on preview load / Operations / refresh / tab switch must show `admin_live_snapshot` only among dashboard RPCs, plus the existing Analytics health pair. Zero hits on tick-enabled names. Unsigned remains gated.
