# Admin Hub Gate 2A-R — identity inspect true-read remediation (review only)

**Date:** 2026-10-10  
**Production APP:** `20261008-rc133` · feature `bbf5405` · stamp `6d2517f`  
**Gate 2A audit:** `2687f38`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**SQL applied:** **NO**  
**Frontend / APP stamp:** unchanged  
**Sora mutated:** NO · **Twinkle mutated:** NO · **PlayTester role:** `null`  
**Unsafe inspect invoked:** NO

Final release smoke remains paused. **Wait for explicit owner approval before applying SQL.**

---

## 1. Root cause

`public.admin_identity_inspect(p_user uuid)` is staff-gated, then:

```
perform private.evaluate_cosmetics(p_user);
```

That helper is not a read. It loops enabled cosmetics and calls `private.unlock_cosmetic`, which **INSERT**s `public.trainer_cosmetics` and may `private.push_notice` → **INSERT** `public.trainer_notices`. No user triggers on those tables. No dynamic SQL.

Gate 1.5 called the public body TRUE_READ because it has no local DML. The write is in the DEFINER-reachable helper chain.

Reviewed inspect `md5(prosrc)` = `50058f99f73591a9bd77d4342653cd8c` (length 1542). VOLATILE, DEFINER, `search_path=public`, owner `postgres`.

---

## 2. Helper chain (live)

```
public.admin_identity_inspect(p_user uuid)
  → private.is_play_admin()                    -- STABLE SELECT
  → private.evaluate_cosmetics(p_user)         -- VOLATILE WRITE  ← remove this call
       → private.unlock_cosmetic(...)          -- INSERT trainer_cosmetics
            → private.push_notice(...)         -- INSERT trainer_notices
  → private.trainer_card(p_user)               -- STABLE SELECT
  → private.ranking_eligible_uid(p_user)       -- STABLE SELECT
  → private.identity_cosmetics_json(p_user)    -- STABLE SELECT of stored rows + starters
  → private.owned_avatar_packs_json(p_user)    -- STABLE SELECT
  → titles / badges / catalog SELECTs
```

`evaluate_cosmetics` `md5=024bb6f7d95682dc5dbd50c676afd2af`  
`unlock_cosmetic` `md5=90afc724cfa4362473cda04656ff432b`  
`identity_cosmetics_json` `md5=7b4d9c5b47003381019eec622050ac2b`

Other live callers of `evaluate_cosmetics` (unchanged by this package):

`play_progression`, `play_trainer`, `play_equip_cosmetic`, `play_set_card_bg`, `play_save_trainer_id`, `private.evaluate_achievements`, `private.process_level_ups`, `phase5_identity_selftest`.

Inspect is also **returned** by `admin_grant_cosmetic` / `revoke_cosmetic` / `grant_title` / `grant_badge` / `set_ranking_visible` after those RPCs have already mutated. Removing evaluation from inspect does not remove those mutations; they just re-read.

---

## 3. Proposed SQL (not applied)

| File | Role |
|---|---|
| `docs/audits/sql/gate-2a-r-identity-inspect-up.sql` | Preflight on baseline md5 + call site, then `CREATE OR REPLACE` inspect without `evaluate_cosmetics`, mark **STABLE**, keep DEFINER / `search_path=public` / owner `postgres` |
| `docs/audits/sql/gate-2a-r-identity-inspect-down.sql` | Preflight that live body is the remediated inspect, restore the reviewed write-read body |
| `docs/audits/sql/gate-2a-r-authorization-tests.sql` | Clone-only catalog checks. Do not run inspect on production trainers while the write remains |

Not copied into `supabase/migrations/` (would look applied).

**Not changed:** `evaluate_cosmetics`, `unlock_cosmetic`, player progression, R1/R2/R18, grants/ACLs (anon EXECUTE remains; this gate does not revoke).

---

## 4. Response compatibility

Return keys unchanged: `ok`, `trainer`, `rankingVisible`, `rankingEligible`, `cosmetics`, `ownedAvatarPacks`, `titles`, `badges`, `catalog`.

`identity_cosmetics_json` already derives `unlocked` from stored `trainer_cosmetics` **or** starter **or** admin entitlement. No new helper.

Behavioral difference (intentional):

| Case | Today (write-read) | After UP |
|---|---|---|
| Stored unlock / starter | shown | shown |
| Earned but not yet evaluated | inspect **INSERTs** then shows unlocked | shows locked until the trainer’s own `play_progression` / level-up path evaluates |
| Missing UUID | card/selects empty or null; write could still evaluate | same reads; **no** insert |
| Null `p_user` | `Pick a trainer.` before write | same, still before any SELECT |

Player cosmetic unlock rules are unchanged. Staff inspect no longer grants them.

---

## 5. Authorization and grants

Unchanged: `is_play_admin()` first, then null check. EXECUTE ACL stays `{=X/postgres, postgres, anon, authenticated, service_role}`. OR REPLACE keeps existing grants. UP does not GRANT or REVOKE.

---

## 6. Drift detection

UP aborts unless live `prosrc` md5 is exactly `50058f99f73591a9bd77d4342653cd8c`, the function is VOLATILE, the staff guard is present, and the `evaluate_cosmetics` call site is present.

DOWN aborts if live inspect still contains that call (already at baseline) or if the staff/cosmetics SELECT markers are missing.

---

## 7. Tests (no live inspect calls)

STATIC PASS — `tests/admin-hub-gate-2a-r-identity-tests.js` (7):

- Review artifact, not a tree migration
- Preflight checksum
- Replacement body SELECT-only, guard first, STABLE DEFINER
- Unlock helpers not rewritten; anon not revoked
- DOWN restores the call site
- Preview allowlist still excludes inspect
- Response keys preserved

Not run: staff JWT inspect of PlayTester/Sora/Twinkle (forbidden while the write exists).

---

## 8. True-read reconfirm (list / account)

| RPC | Live | Writes | Preview candidate |
|---|---|---|---|
| `admin_list_users(text,integer)` | STABLE DEFINER `md5=4044aa5ba8238efa9b6dbce02f5288db` | none | **Yes** after staff gate |
| `admin_user_account(uuid)` | STABLE DEFINER `md5=88f488058dc6f56d827666bee497b531` | none | **Yes** after staff gate |
| `admin_identity_inspect(uuid)` | VOLATILE write-read | evaluate_cosmetics | **After this UP only** |

---

## 9. Remaining risks

- R21 stays **OPEN** until owner applies UP and a later staff inspect of PlayTester shows no `trainer_cosmetics` / notice inserts.
- After apply, a trainer who has not run player evaluation may appear to lack a just-earned cosmetic until they load Play. That is stored-state honesty, not a missing field.
- R2 anon EXECUTE unchanged.
- Legacy `admin-tools.js` will become read-only on inspect after apply (desirable). Grant RPCs remain mutating.

---

## 10. Production unchanged

No migration applied. `admin_identity_inspect` live body still contains `evaluate_cosmetics`. APP still `20261008-rc133`. Preview allowlist unchanged. No staff_roles change.

Apply only after an explicit owner order. Then retry Gate 2A frontend.
