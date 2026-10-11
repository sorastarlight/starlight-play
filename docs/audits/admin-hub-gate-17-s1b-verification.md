# Admin Hub Gate 1.7 S1B — authorized staff verification and preview integration

**Date:** 2026-10-10  
**Production APP:** `20261008-rc132`  
**Feature:** `3c87845` · **Stamp:** `b36d255` · **Record:** `538cc9f`  
**SPRITE:** `20260923-home1` · **LOCATION:** `20260916-loc1`  
**Site:** https://play.sorastarlight.net  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Latest applied migration:** `20261009183910` `gate_17_s1_admin_live_snapshot`  
**Contract:** `public.admin_live_snapshot()` `gate-17-s1-v2`  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**SQL applied this gate:** NO · **Frontend integration deployed:** NO  
**Stage A:** **BLOCKED** · **Stage B:** **NOT STARTED**

Final release smoke remains paused.

---

## 1. Verified baselines (before any change)

| Surface | Result |
|---|---|
| Repo HEAD (`play-site`) | `538cc9f` *Record the applied Gate 1.7 S1 live snapshot RPC without wiring the preview.* Working tree clean of S1B product changes. |
| Production `js/build.js` | `PLAY_BUILD=20261008-rc132` · `PLAY_GIT_COMMIT=3c87845` · `PLAY_DEPLOYED_AT=2026-10-09T04:23:38.962Z` · sprite/location stamps unchanged |
| `build.json` | `20261008-rc132` / `20260923-home1` / `20260916-loc1` |
| Preview allowlist (REPO + production lineage) | `admin_build_health`, `admin_game_health` only. Operations still uses the UNAVAILABLE fallback. No `setInterval`. |
| Latest DB migration | `20261009183910` `gate_17_s1_admin_live_snapshot` |
| Legacy Admin Hub | Untouched this gate |

Production still serves the Gate 1.6 isolated preview. Snapshot SQL is live; preview is unwired.

---

## 2. Stage A1 — live RPC contract

Inspected production `pg_proc` / ACLs / `pg_get_functiondef`. Catalog dump prints `CREATE OR REPLACE FUNCTION`; the applied migration used `CREATE FUNCTION` plus an existence preflight. That dump wording is not a contract drift.

| Check | Live result |
|---|---|
| Exists | `public.admin_live_snapshot()` |
| Returns | `jsonb` |
| SECURITY DEFINER | yes (`prosecdef=true`) |
| STABLE | yes (`provolatile=s`) |
| Owner | `postgres` |
| `search_path` | `pg_catalog` |
| Contract marker | `gate-17-s1-v2` in body |
| Staff authorization first | `if not private.is_play_admin() then raise 42501` at line 16, before any table read |
| Tick / settle / director helpers | none (`director_tick`, `settle_due_rounds`, `apply_stream_status`, `director_dashboard`, `admin_live_dashboard`, `admin_overview` absent) |
| Gameplay writes | none (SELECT + `jsonb_build_object` only) |
| EXECUTE authenticated | yes |
| EXECUTE anon / PUBLIC | denied (`has_function_privilege` false; ACL `{postgres=X/postgres,authenticated=X/postgres}`) |
| EXECUTE service_role | denied |

**A1 PASS.** Production matches the approved `gate-17-s1-v2` contract. No SQL stop-condition.

---

## 3. Stage A2 — QA identity

`private.is_play_admin()` is `private.play_staff_role(auth.uid()) is not null`. Owner is the broadcaster Twitch identity. Other staff come from `public.staff_roles`.

| Identity | Auth user | Staff role | Usable for S1B? |
|---|---|---|---|
| Sora | yes | `owner` via Twitch | **NO** — protected |
| Twinkle | yes | `moderator` via `staff_roles` (only staff row) | **NO** — protected |
| PlayTester | yes (`playtester@sorastarlight.net`) | **null** — not in `staff_roles` | Account exists; **not staff** |
| Other dedicated QA staff | none | `staff_roles` row count = 1 | **NO** |

PlayTester is the established dedicated QA account and is preferred. It is **not** currently authorized to call `admin_live_snapshot()`.

No account was promoted. `staff_roles` was not modified. No new privileged identity was created. Service-role was not used as a staff-session substitute.

**A2 BLOCKED.** No authorized QA staff identity is available.

---

## 4. Owner request — minimum temporary access

Stage A cannot finish, and Stage B must not start, until the owner authorizes **one** of the following. Prefer the existing PlayTester account.

### Option 1 (preferred)

Temporarily grant the existing PlayTester user staff so a real authenticated QA JWT can call the snapshot:

- Identity: PlayTester (`playtester@sorastarlight.net`)
- Known UUID already in repo QA tooling: `a98cbf81-a6b2-4dbf-8448-8d62f6d5f523`
- Table: `public.staff_roles`
- Role value: `moderator` **or** `staff` (the helper maps `staff` → `moderator`)
- Scope: Gate 1.7 S1B only — authorized snapshot read, three-read comparison, and later preview Operations verification
- After S1B: owner may keep the row for future admin-preview QA or ask for it to be removed
- The agent will **not** insert, update, or delete `staff_roles` without that approval

### Option 2

Create a **new** dedicated admin-QA account that is not Sora, Twinkle, or their Twitch/linked identities, then add that user to `staff_roles` the same way. This also needs explicit owner approval.

### Not acceptable

- Using Sora or Twinkle sessions, tokens, or impersonation
- Using `service_role` / `SET ROLE` as a stand-in for a staff JWT success path
- Silently promoting PlayTester or any other account
- Changing RLS, GRANTs, or snapshot SQL to bypass the staff check

Reply with a one-line approval such as: **“Promote PlayTester to moderator in staff_roles for Gate 1.7 S1B, then continue.”**

---

## 5. Stage A3 — authorized read

**Not executed.** No legitimate QA staff JWT exists.

Completed **denial** paths only (codes, never tokens):

| Caller | Result |
|---|---|
| Unsigned anon key `rpc/admin_live_snapshot` | `42501` `permission denied for function admin_live_snapshot` · no payload |
| SQL `SET LOCAL ROLE anon` | `42501` permission denied for function |
| PlayTester password sign-in, then RPC | sign-in OK · identity PlayTester · `42501` `not allowed` · no payload · contract absent |
| SQL authenticated + PlayTester `auth.uid()` claims | `42501` `not allowed` at function line 16 |

Twitch / RPG / director / encounter / settlement field semantics were **not** observed through the staff success path.

Catalog inspection of the live function still shows the intended JSON shape and `settlement.state = 'UNAVAILABLE'`. That is STATIC/LIVE SQL evidence, not an authorized staff read.

---

## 6. Stage A4 — read-only comparison

**Not executed** as specified (three authorized snapshot reads).

Inspection SELECTs of row identifiers around the denial window:

| Source | Before denial calls | After denial calls |
|---|---|---|
| `stream_status.id=1` `is_live` | `false` | `false` |
| `stream_status.checked_at` | `2026-10-10 17:15:29.00146+00` | unchanged |
| `stream_status.source` | `stream.offline` | unchanged |
| `stream_director.status` | `OFFLINE` | `OFFLINE` |
| `stream_director.rpg_session_active` | `false` | `false` |
| `stream_director.last_tick_at` | `2026-10-11 00:35:13.894988+00` | `2026-10-11 00:35:35.808779+00` |

`last_tick_at` moved during the window. Failed snapshot calls raise at the staff check **before** table reads, so they cannot write director/session/encounter rows. The tick-timestamp change is **concurrent gameplay / director activity**, not a snapshot side effect.

**A4 INCONCLUSIVE for the staff success path** (never run). Denial-path writes: none attributable. Do not treat this as Stage A PASS.

Director pointer at inspection time (not a snapshot RPC result): no `session_id`; `last_encounter_id` present and the pointed round is `phase=closed`, `cancelled=true`, `resolved=true`. That would be last-encounter history, not a current open encounter, if a staff read were later performed.

---

## 7. Stage A decision

| Check | Result |
|---|---|
| A1 live contract | PASS |
| A2 safe QA staff identity | **BLOCKED** |
| A3 authorized staff read | **NOT RUN** |
| A4 three-read write comparison | **NOT RUN** |

**STAGE A BLOCKED.** Stage B was not started. No preview integration, no stamp, no deploy, no new SQL.

---

## 8. Stage B — not started

| Item | Status |
|---|---|
| `admin-next.html` / `admin-next.js` / preview CSS | unchanged |
| RPC allowlist | still `admin_build_health`, `admin_game_health` |
| Polling | none |
| Unsafe RPCs | not added |
| Legacy `admin.html` / `admin-live.js` | untouched |
| Tests / responsive shots | not run for S1B integration |
| Feature / stamp commits | none this gate |
| Production deploy | none this gate |

---

## 9. Remaining risks

- R17 remains **MITIGATED (preview UI)** only. Snapshot exists; preview still must not poll `admin_live_dashboard`.
- Staff happy-path of `admin_live_snapshot()` is still **UNVERIFIED** on a real QA staff JWT.
- R1 `admin_overview` settle-before-guard remains OPEN.
- No dedicated admin-QA staff row exists except Twinkle.

---

## 10. QA account / cleanup

| | |
|---|---|
| QA account | PlayTester (dedicated test identity) |
| Used for | Nonstaff denial of `admin_live_snapshot` only |
| Staff promotion | **NO** |
| Sora mutated | **NO** |
| Twinkle mutated | **NO** |
| Temporary script | deleted after the denial call |
| PlayTester session | signed out in the denial script |
| Intentional leftover state | none |
