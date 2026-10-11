# Admin Hub Gate 2A — Trainer Management workspace (read-only foundation)

**Date:** 2026-10-10  
**Verified production APP:** `20261008-rc133`  
**Feature / stamp / record:** `bbf5405` / `6d2517f` / `2c3df8e`  
**SPRITE:** `20260923-home1` · **LOCATION:** `20260916-loc1`  
**Site:** https://play.sorastarlight.net `js/build.js` matches (`PLAY_GIT_COMMIT=bbf5405`)  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Latest migration:** `20261009183910` `gate_17_s1_admin_live_snapshot`  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**PlayTester role:** `null` (unchanged)  
**SQL / RLS / GRANT / staff_roles:** unchanged  
**Frontend integration:** **NOT STARTED**

**Stage A:** **BLOCKED**  
**Stage B:** **NOT STARTED**  
**Stage C:** **NOT STARTED**

Final release smoke remains paused.

---

## 1. Why this gate stopped

`public.admin_identity_inspect(p_user uuid)` is **not a true read**.

After the staff guard it runs:

```
perform private.evaluate_cosmetics(p_user);
```

LIVE `private.evaluate_cosmetics` loops enabled `progression_cosmetics` and calls `private.unlock_cosmetic`. That helper **INSERT**s `public.trainer_cosmetics` (`on conflict do nothing`) and may `private.push_notice` for non-starter unlocks.

Opening a trainer profile through this RPC can therefore grant cosmetics and notices to the **inspected** trainer — including Sora or Twinkle if a staff member selected them. Gate 1.5 classified the public body as TRUE_READ because it has no local DML keywords. The write is in the helper chain.

Owner rule: if any of the three named RPCs is not genuinely read-only, **STOP**. Do not modify the RPC in this gate. Do not add it to the preview allowlist. Do not begin the Trainer workspace.

Recommended follow-up: a **contract remediation gate** that removes `evaluate_cosmetics` from `admin_identity_inspect` (player `play_progression` already evaluates the signed-in trainer). Then retry Gate 2A.

This gate did **not** invoke `admin_identity_inspect` on any account.

---

## 2. Verified baseline

| Surface | Result |
|---|---|
| Repo HEAD | `2c3df8e` |
| Production build | `20261008-rc133` / `bbf5405` / sprite+location unchanged |
| Preview allowlist | still `admin_build_health`, `admin_game_health`, `admin_live_snapshot` |
| `staff_roles` | 1 row (Twinkle). PlayTester not staff |

Supplied mission baseline matches live values.

---

## 3. Stage A — live contract audit

Inspected `pg_proc` / ACLs / helper bodies. No live trainer rows dumped. No staff JWT used.

### 3.1 `public.admin_list_users(p_query text DEFAULT '', p_offset integer DEFAULT 0)` — TRUE READ

| Item | Live result |
|---|---|
| Returns | `jsonb` |
| Auth | `perform private.require_hub()` first (`is_play_admin`) |
| Security | DEFINER, STABLE, owner `postgres`, `search_path=public` |
| EXECUTE | anon, authenticated, service_role, PUBLIC (R2) |
| Writes | none in body or helpers used (`play_staff_role` SELECT-only) |
| Dynamic SQL | none |
| Search | case-insensitive LIKE on username, twitch_login, display_name, profile UUID text, and connected Twitch login / display / user id |
| Pagination | `LIMIT 50 OFFSET greatest(p_offset,0)` plus `total` count of the same filter |
| Sort | server only: `display_name, twitch_login` |
| Shape | `{ ok, total, offset, users[], staffRole }` |
| Per user | `id, login, displayName, avatar, role, createdAt, lastSeenAt, pass, coins, caught` |
| Sensitive | no email, no Twitch ids in the row payload, no tokens |
| Preview-safe | **Yes**, after staff gate. Directory must say “Showing returned trainers” (page of 50, not the full table). Twitch link state is **not** on this payload — do not infer it from `login`. |

### 3.2 `public.admin_user_account(p_user uuid)` — TRUE READ

| Item | Live result |
|---|---|
| Returns | `jsonb` |
| Auth | `require_hub()` first |
| Security | DEFINER, STABLE, owner `postgres`, `search_path=public` |
| EXECUTE | anon + authenticated + service_role (R2) |
| Helpers | `private.admin_account_json` (STABLE, SELECT), `private.twitch_connections_json` (SELECT), `private.profile_has_password` (SELECT existence of email+password; **does not return the hash or address**) |
| Writes | none |
| Pagination | none (single dossier; `mons` capped at 40 newest live catches) |
| Shape | account JSON plus `connections`, `health` (`primaryTwitch`, `linkedTwitch`, `gameplayTwitch`, `botTwitch`), `user.username`, `user.emailLogin` boolean, `ownerTools` |
| `connections[]` | `id, twitchUserId, login, displayName, avatar, primary, gameplayEnabled, loginEnabled, type, status, confirmed, linkedAt, lastVerifiedAt` |
| Sensitive | Twitch user ids for staff ops; no OAuth tokens; no email address; no password hash |
| Preview-safe | **Yes**, after staff gate. Pokémon/inventory here are a **partial** snapshot (40 mons). Full PC / Bits / achievements remain future extensions. |

### 3.3 `public.admin_identity_inspect(p_user uuid)` — **NOT a true read**

| Item | Live result |
|---|---|
| Returns | `jsonb` |
| Auth | `if not private.is_play_admin() then 42501` first |
| Security | DEFINER, **VOLATILE**, owner `postgres`, `search_path=public` |
| EXECUTE | anon + authenticated + service_role (R2) |
| Helper chain | `evaluate_cosmetics` → `unlock_cosmetic` → **INSERT `trainer_cosmetics`** + optional `push_notice` |
| Then reads | `trainer_card`, ranking flags, cosmetics JSON, titles, badges, catalog |
| Dynamic SQL | none |
| Tokens / email / secrets | not in the returned object |
| Preview-safe | **No.** Staff inspect can mutate the target trainer’s cosmetics/notices. |

Gate 1.5 / Gate 2 design docs called this TRUE_READ. That classification is **withdrawn** until the write is removed.

---

## 4. Authorization and privacy

- All three bodies staff-check before trainer SELECTs. Unsigned callers should 42501. Anon EXECUTE remains R2 (defense in depth), not a Gate 2A stop by itself.
- Moderators pass `require_hub` / `is_play_admin`. They would also trigger the identity-inspect write.
- No access tokens, refresh tokens, or password hashes are returned.
- Email address is not returned (`emailLogin` is a boolean).
- Do not put Sora/Twinkle private fields into fixtures. This gate selected none of their rows.

---

## 5. Stage B / C — not started

Preview allowlist unchanged. `admin-next.html` Trainers tab remains the Gate 2 placeholder. Operations snapshot and Analytics health path untouched. No stamp, no deploy, no staff promotion.

If Stage A is later cleared, the already-written design in `admin-hub-gate-2-trainer-design.md` still applies: directory from `admin_list_users`, profile from `admin_user_account` (+ a **fixed** identity RPC), user-driven reads, no polling, no mutation controls.

---

## 6. Remaining risks

| ID | Status |
|---|---|
| **R21** | **OPEN** — `admin_identity_inspect` writes cosmetics (this gate) |
| R1 | OPEN — `admin_overview` settle-before-guard |
| R2 | OPEN — broad anon EXECUTE |
| R17 | MITIGATED for preview snapshot |
| R18 | OPEN — moderator Pass/Bits/Oak QA |
| R20 | CLOSED for S1B; future staff QA still needs new owner approval |

---

## 7. Recommended next gate

**Gate 2A-R — identity inspect true-read remediation** (SQL, owner-approved):

1. Remove `perform private.evaluate_cosmetics(p_user)` from `admin_identity_inspect`.
2. Keep the staff guard and SELECT payload.
3. Do not change player `play_progression` evaluation.
4. Re-audit, then restart Gate 2A frontend.

Do not begin Gate 2B. Do not apply that SQL in this gate.
