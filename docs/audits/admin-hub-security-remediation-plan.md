# Admin Hub — security remediation plan (review only)

**Do not apply SQL, revoke grants, or ship protections in this gate.**  
Scripts: `docs/audits/sql/gate-15-review-*.sql`.

---

## Sequence (owner-approved, one step at a time)

| Step | Change | Depends on | Risk addressed |
|---|---|---|---|
| **S0** | Owner decisions (below) | — | all |
| **S1** | `admin_overview`: settle **after** `require_hub`, or remove settle | Confirm player `play_sync` still settles | R1 |
| **S2** | Revoke `anon`/`PUBLIC` EXECUTE on `public.admin_*` except none; keep `authenticated` | S1; store-asset uses user JWT | R2, R15 |
| **S3** | True-read Operations snapshot (dashboard **without** `director_tick_if_due`) | Must not alter tick itself | R17. **Gate 1.7 S1 review package ready** (`docs/audits/admin-hub-gate-17-s1-snapshot-review.md`). Not applied. |
| **S4** | Preview `READ_RPCS` switch to true-read; stop calling tick dashboard | S3 | R17. Do not start until S3 is live. |
| **S5** | Protected-account deny in a single helper used by QA + grants + refill | Owner UUID list | R4 |
| **S6** | Raise Pass / Bits pack / Oak QA to `require_staff_edit` (or owner for QA) | Owner: can mods credit Bits? | R18 |
| **S7** | Disable or rewrite `admin_refill_test` | S5 | R12 |
| **S8** | Pass QA `p_user` or remove from production UI | S5 | R13 |
| **S9** | Consistent `account_audit` / reason on Support mutations | Gate 3 | R6 |
| **S10** | Confirm UI on remove / event delete | Gate 3 UI | R11 |
| **S11** | bits-connect redirect to hub System Bits | UI | R14 |
| **S12** | Restore or drop `admin_coin_ledger` caller | R19 | R19 |
| **S13** | Dual encounter path unification | Gate 6 | R14 |

**Never in this sequence:** change `apply_stream_status`, auto-start on Twitch LIVE, drop `public.is_play_admin`, enable RLS on private tables without policies, call `admin_refill_test`, mutate Sora/Twinkle.

---

## Owner decisions required before SQL

1. **R1:** Keep settle inside staff `admin_overview` (after guard) **or** rely only on `play_sync` / director tick?
2. **R2:** Approve anon EXECUTE revoke on all 85 functions?
3. **R17:** Preview Operations may share Dashboard tick **or** must be side-effect-free (needs new RPC)?
4. **R18:** May moderators credit Bits packs / Pass, or admin/owner only?
5. **R4:** Confirm protected UUIDs (Sora, Twinkle) and whether owner-only override exists for true emergencies.
6. **R12:** Drop `admin_refill_test` vs rewrite to one QA account?
7. **Gate 2:** Allow new SELECT RPCs (PC, progression, email) vs ship partial dossier from the three existing reads?

---

## S1 — `admin_overview` guard order

**Current grants:** anon + authenticated + postgres + service_role.  
**Desired:** authenticated only (with S2) **and** `require_hub` before settle.  
**Callers:** `admin.js`, `admin-tools.js`. Not the preview. Not player Play.  
**Failure after fix:** unsigned call 42501 and **no** settlement. Signed non-staff 42501 and no settlement. Staff: settle then JSON as today.  
**Rollback:** restore previous wrapper body.  
**Tests:** static forbid preview call (already); QA unsigned invoke on **non-production** or after stream idle.

See `sql/gate-15-review-admin-overview-guard.sql`.

---

## S2 — Revoke anon

**Current:** 85 functions. **Desired:** `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`  
**Already correct (16):** director/oak/live_dashboard/etc.  
**Leave internal:** `admin_loot_warnings`.  
**Affected callers:** browser staff JWT (authenticated). Edge `store-asset` user JWT.  
**Unexpected breakage:** any automation using the **anon** key to call admin RPCs (**UNVERIFIED** none).  
**Tests:** `has_function_privilege('anon', …)` false; PlayTester staff grant still works.

See `sql/gate-15-review-revoke-anon.sql`.

---

## S3–S4 — True-read dashboard

Add `private.director_dashboard_readonly()` copy of dashboard **without** `director_tick_if_due`. Public `admin_live_snapshot()` `is_play_admin` then that. Preview switches allowlist. Legacy `admin_live_dashboard` keeps tick (Dashboard needs it). **Do not change `director_tick`.**

---

## S5 — Protected accounts (server)

Helper `private.deny_protected_account(p_user uuid)` raising a stable error, e.g. `protected_account`.  
Deny list from `site_config` or a private table (not only hardcoded UUIDs) including:

- Sora `60ff5211-6ef8-40e6-8daa-095b5600bf4c`
- Twinkle `da777b13-6879-44a8-99f4-a154e54d3d75`

Call from: `admin_oak_qa`, `admin_oak_research_reset`, `admin_refill_test` (or drop it), all `admin_grant_*`, `admin_set_coins`, `admin_set_xp`, `admin_remove_pokemon`, `admin_qa_grant_pass_reward`.

Frontend warnings stay as extra UX, not authority.

**Override:** none by default. If owner later wants an escape hatch, it must be `require_owner` + typed confirmation token, never a checkbox.

Tests: PlayTester grant succeeds; Sora/Twinkle UUID grant 42501; direct RPC same. **Never run the success path on Sora/Twinkle.**

See `sql/gate-15-review-protected-accounts.sql`.

---

## S6 — Privilege tightening

Replace `is_play_admin` with `require_staff_edit` at the start of `admin_oak_qa`, `admin_set_pass`, `admin_grant_bits_pack`, `admin_qa_grant_pass_reward` unless owner explicitly keeps Bits credit for moderators.

Rollback: restore `is_play_admin`.

---

## S9 — Audit contract

Minimum row in `private.account_audit` (existing columns):

| Column | Content |
|---|---|
| `at` | default now() |
| `actor_id` | `auth.uid()` |
| `target_id` | trainer uuid (null for catalog-only) |
| `action` | stable enum string (`ADMIN_GRANT_BAG`, …) |
| `twitch_user_id` | when identity-related |
| `detail` | `{reason, sku?, qty?, catchId?, before?, after?, ok}` — **no secrets** |

Do not store Twitch client secret, GitHub token, or bridge token in `detail`.

Also log failures **INFERRED optional** — today writers run after success. Prefer insert in the same transaction as the mutation.

`admin_qa_grants` remains QA-specific; still add account_audit for Support-visible history.

---

## Regression tests (implementation gates)

- Preview tests keep forbidding `admin_overview` and grant names.
- After S4, preview allowlist is snapshot RPC not `admin_live_dashboard`.
- Unauthorized tools (`qa-rc113-unauthorized.js` pattern) against grants.
- No Sora/Twinkle mutation in any automated QA.

---

## Out of scope forever unless separately approved

- Client-side “edit any field”
- Hard-delete Pokémon
- `admin_refill_test` wired to the new hub
- Changing Twitch LIVE → auto Start
