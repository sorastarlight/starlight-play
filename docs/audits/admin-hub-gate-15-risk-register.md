# Admin Hub Gate 1.5 — risk register

**Production:** `20261008-rc131` / `2915d82` / stamp `ba41665`  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**No SQL applied. No grants changed.**

Status vocabulary: **OPEN** · **MITIGATED (UI)** · **CLOSED** · **UNVERIFIED**.

Owner approval is required before any row whose action is SQL/grant/RPC rewrite.

---

## R1 — `admin_overview` settle-before-guard

| | |
|---|---|
| **Evidence** | LIVE SQL: `public.admin_overview` body is `perform private.settle_due_rounds(); return private.admin_overview()…`. Private wrapper `require_hub()` runs second. EXECUTE includes **anon**. `settle_due_rounds` writes due encounter rounds via `settle_if_needed`. |
| **Severity** | High |
| **Impact** | Unauthenticated PostgREST call can settle live encounters as SECURITY DEFINER before 42501. |
| **Affected** | Encounter settlement, MixItUp-era hub poll (`admin.js`, `admin-tools.js`) |
| **Action** | Move settle behind `require_hub` **or** drop settle from this wrapper (player `play_sync` already ticks). Review SQL: `docs/audits/sql/gate-15-review-admin-overview-guard.sql` |
| **Dependencies** | Confirm `bridge_publish` / `load_play_round` still settle if hub poll stops settling |
| **Owner approval** | **Required** |
| **Verification** | Staff hub load still shows console; unsigned curl of `admin_overview` must 42501 **and** leave `encounter_rounds.updated_at` unchanged (QA only, never production stream) |
| **Status** | **OPEN** — next shell still must not call it |

## R2 — Broad EXECUTE to anon

| | |
|---|---|
| **Evidence** | LIVE SQL: **85 / 102** `public.admin_*` grant EXECUTE to anon. Bodies usually `is_play_admin` / `require_*`. |
| **Severity** | Medium (defense in depth) |
| **Impact** | Call is accepted; error is in-body. Secrets RPCs are in this set. |
| **Affected** | Entire admin Data API surface |
| **Action** | Revoke anon/PUBLIC; keep authenticated. Do **not** revoke authenticated (store-asset JWT, hub JS). Review SQL: `docs/audits/sql/gate-15-review-revoke-anon.sql` |
| **Dependencies** | R1 order fix first for `admin_overview`; confirm no service uses anon JWT to call admin RPCs (**UNVERIFIED** beyond store-asset using user JWT) |
| **Owner approval** | **Required** |
| **Verification** | `has_function_privilege('anon', 'public.admin_grant_pokemon(uuid,int,text,text,bool,text)', 'EXECUTE')` is false; staff grant still works on PlayTester |
| **Status** | **OPEN** |

## R3 — Twitch auto-start copy

| | |
|---|---|
| **Evidence** | REPO rc130/rc131 `admin.html` / `admin-next.html` copy. LIVE SQL `apply_stream_status` does not begin RPG on LIVE. |
| **Severity** | Medium (closed as copy) |
| **Status** | **CLOSED** (UI). Director SQL unchanged on purpose. |

## R4 — `admin_oak_qa` Sora warn-not-block; no Twinkle

| | |
|---|---|
| **Evidence** | LIVE SQL: `sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c'; warn := p_user = sora;` no Twinkle UUID. Guard is `is_play_admin` only (moderators). RESET_QA deletes ADMIN_QA catches for **any** target. |
| **Severity** | High (ops) |
| **Impact** | Direct RPC can mutate Sora; Twinkle unprotected; frontend checkbox is not authority. |
| **Action** | Server deny list; see remediation plan §QA. Do not implement this gate. |
| **Owner approval** | **Required** (protected UUID list) |
| **Status** | **OPEN** |

## R5 — Duplicated trainer / store UI

| | |
|---|---|
| **Evidence** | REPO: hub Trainers + oak-qa + tools embed; store iframe + studio. |
| **Severity** | Medium (ops confusion) |
| **Action** | Parity matrix; do not delete pages in Gate 2 |
| **Status** | **OPEN** (design: Gate 2 reads on admin-next; mutations stay legacy) |

## R6 — Missing `account_audit` on grants

| | |
|---|---|
| **Evidence** | LIVE SQL: only twitch identity admin RPCs mention `account_audit`. Table has **0 rows**. Grants/remove/store/config do not write it. Oak QA writes `admin_qa_grants` instead. |
| **Severity** | High (forensics) |
| **Action** | Gate 3 audit contract (`docs/audits/admin-hub-security-remediation-plan.md`) |
| **Status** | **OPEN** |

## R7 — `site_config` world-readable

| | |
|---|---|
| **Evidence** | 0B + public client id / broadcaster id. Secrets in `private.stream_bridge`. |
| **Severity** | Low |
| **Status** | **OPEN** (accept; keep secrets private) |

## R8 — `.env.local` in blueprint zip

| | |
|---|---|
| **Evidence** | 0B hygiene. File gitignored. |
| **Severity** | High hygiene |
| **Action** | Rotate if the archive left this machine. This gate did not read the file. |
| **Status** | **OPEN** (ops) |

## R9 — Edge JWT false

| | |
|---|---|
| **Evidence** | MCP: `twitch-eventsub`, `trainer-session` `verify_jwt: false`. |
| **Severity** | Info |
| **Status** | **OPEN** (expected webhook/session; do not “fix” blindly) |

## R10 — Soft remove

| | |
|---|---|
| **Evidence** | LIVE SQL `admin_remove_pokemon` sets `transferred_at`, cancels listings, pulls team. |
| **Severity** | Info |
| **Action** | Preserve soft-remove. Add confirm + audit in Gate 3. |
| **Status** | **OPEN** (semantic keep) |

## R11 — No UI confirm on remove / event delete

| | |
|---|---|
| **Evidence** | REPO `admin-tools.js` data-remove-mon; `events.js` data-del. |
| **Severity** | High (accidental loss) |
| **Action** | Gate 3 confirmation; event delete currently any staff |
| **Status** | **OPEN** |

## R12 — `admin_refill_test` floors all bags

| | |
|---|---|
| **Evidence** | LIVE SQL: `require_hub`; `UPDATE public.inventories` with no user filter; anon EXECUTE; no JS caller. |
| **Severity** | High |
| **Action** | Do not wire. Prefer DROP or rewrite to single QA UUID after approval. |
| **Status** | **OPEN** |

## R13 — Pass QA self-grant

| | |
|---|---|
| **Evidence** | LIVE/REPO: `grant_items(auth.uid(), …)`; `admin_qa_grants.target_user = admin`. |
| **Severity** | Medium |
| **Action** | Hide in production staff UI or require `p_user` + protected-account deny |
| **Status** | **OPEN** |

## R14 — Tools/store redirects; dual encounter paths; bits-connect

| | |
|---|---|
| **Evidence** | REPO: bare tools/store `location.replace`; `bits-connect.js` → `./admin-tools.html`; director vs MixItUp RPCs. Preview deep links fixed rc131. |
| **Severity** | Medium |
| **Action** | Fix bits-connect redirect in a later UI gate; Gate 6 pick one operator path |
| **Status** | **PARTIALLY MITIGATED** (preview links). bits-connect **OPEN**. |

## R15 — Live GRANT vs migration REVOKE drift

| | |
|---|---|
| **Evidence** | LIVE 85 anon grants vs many migrations `REVOKE anon`. |
| **Severity** | Medium |
| **Action** | Treat **live** as source of truth; apply explicit revoke migration (R2) |
| **Status** | **OPEN** |

## R16 — `public.is_play_admin` missing from some migrations

| | |
|---|---|
| **Evidence** | Function **exists live** as INVOKER wrapper. Client gate depends on it. |
| **Severity** | Info |
| **Action** | Add CREATE to tree when touching grants. Do not drop. |
| **Status** | **OPEN** (hygiene) |

## R17 — Preview “read” RPC ticks director / settles rounds (NEW)

| | |
|---|---|
| **Evidence** | LIVE SQL call chain in contract matrix §3.3. EXECUTE is authenticated-only; guard **before** tick (better than R1). Gate 1.6 removed `admin-next.js` from callers. Legacy `admin-live.js` still polls it. |
| **Severity** | High (legacy Dashboard tick remains intentional) |
| **Impact** | Opening the **preview** no longer settles or ticks. Opening the current Dashboard still can (by design). |
| **Affected** | admin-live poll only after Gate 1.6 |
| **Action** | Keep preview isolated until owner applies Gate 1.7 S1 **v2** SQL (`docs/audits/sql/gate-17-s1-live-snapshot-up.sql`) and a later frontend gate adds only that name to `READ_RPCS`. Do not rewrite `director_tick`. Do not apply the Gate 1.6 draft or S1 v1. |
| **Dependencies** | Must not rewrite `director_tick` / session lifecycle |
| **Owner approval** | **Required** before applying snapshot SQL or wiring the preview |
| **Verification** | Preview allowlist + network capture: no `admin_live_dashboard` from admin-next. After apply: clone auth tests; `updated_at` unchanged. Do **not** invoke the tick RPC on production to “prove” it ticks. |
| **Status** | **MITIGATED (preview UI)** — snapshot RPC live (`gate-17-s1-v2`, `20261009183910`). Preview still unwired. Not closed until a later frontend gate uses only this RPC. |

## R18 — Moderator-capable Pass / Bits / Oak QA (NEW)

| | |
|---|---|
| **Evidence** | LIVE SQL: `admin_oak_qa`, `admin_set_pass`, `admin_grant_bits_pack` use `is_play_admin` not `require_staff_edit`. Pokémon grants correctly use `require_staff_edit`. |
| **Severity** | High (privilege) |
| **Impact** | Moderators intended for the live console can grant Pass, Bits packs, and Oak QA Pokémon/resets. |
| **Action** | Raise those RPCs to `require_staff_edit` (or owner for QA) in Gate 3. Frontend hide is not enough. |
| **Owner approval** | **Required** (should mods credit missed Bits packs?) |
| **Status** | **OPEN** |

## R19 — `admin_coin_ledger` missing live (NEW)

| | |
|---|---|
| **Evidence** | REPO migration + `admin.js` caller. LIVE `pg_proc` has **no** `admin_coin_ledger`. |
| **Severity** | Medium (broken analytics widget) |
| **Action** | Either deploy the function or stop calling it. Not this gate. |
| **Status** | **UNVERIFIED live function** / **OPEN** |

---

## Advisor note (private RLS)

Supabase security advisor: RLS disabled on 12 private tables. LIVE table privileges: anon cannot SELECT/INSERT. **Do not enable RLS without policies** — it can break DEFINER internals. Track as **Info / defense-in-depth**, not as an internet-exposed table dump.
