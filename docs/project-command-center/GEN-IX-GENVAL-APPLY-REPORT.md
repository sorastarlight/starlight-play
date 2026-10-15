# A19-GENVAL-APPLY report (D43)

**Verdict: APPLIED.** Catalog-only verification **LIVE CATALOG PASS**. Not a production smoke run. Not WIRE. No gameplay-function execution.

Owner GO authorized hashed `001_generate_and_assert.sql` as role `postgres` on project `dtflmlbjhttoewqgkujf` only. Reset preparation is a separate unapplied packet. No merge, deploy, or APP stamp.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Production APP `20261008-rc133` unchanged. Final release smoke remains paused.

---

## Authorization

| Field | Value |
|---|---|
| Decision | Complete owner GENVAL-APPLY GO (not a `[GO]` template) |
| Artifact | `supabase/unapplied/a19-genval/001_generate_and_assert.sql` |
| SHA-256 | `6f7bca74c4fe57cc50cd65978d8b96c0936078c2b9bdca0ddc21d93e75e0d58a` |
| Role | `postgres` (`current_user` / `session_user` both `postgres`) |
| Project | `dtflmlbjhttoewqgkujf` / starlight-play / PG 17.6 |
| Backup acknowledged | Dashboard-visible physical `2026-10-14 07:44:26 UTC` **predates D35** |
| PITR | Disabled; owner will not purchase; restore of that snapshot would undo D35+ |
| Recovery | Failed apply = STOP; no automatic restore; `002_rollback.sql` not run |

---

## How it was applied

MCP `apply_migration` (D35 pattern: `BEGIN`/`COMMIT` stripped; files stay under `unapplied/`; nothing copied into `supabase/migrations/`).

Hashed `001` is one intended transaction. Transport size required six additive remote names whose union is that file:

| Remote name | Contents |
|---|---|
| `a19_genval_001a_tickets_helpers` | schema/extension, ticket table, RLS, FORCE RLS, table REVOKE, owner policy |
| `a19_genval_001b_helper_fns` | 10 helpers + REVOKE |
| `a19_genval_001c_ticket_fns` | issue/lock/bind + REVOKE |
| `a19_genval_001d_prepare_complete` | `streamlink_generate_prepare` + REVOKE |
| `a19_genval_001e_complete_generate` | `streamlink_complete_specimen`, `generate_streamlink_mon` + REVOKE |
| `a19_genval_001f_assert_revoke` | `assert_streamlink_legal`, full `$rev$` REVOKE, COMMENTs |

Not applied: fixture SQL, `002_rollback.sql`, hosted `generate_streamlink_mon` / `assert_streamlink_legal` calls, A19-SCHEMA replay, A19-WIRE.

Comment-only drift: `001e` omitted the two unused-parameter comments inside `generate_streamlink_mon`; the executable body matches hashed `001` (still ignores `p_seed` / `p_allow_hidden`).

---

## Catalog verification (no gameplay calls)

| Check | Result |
|---|---|
| `to_regclass('private.streamlink_hidden_tickets')` | `private.streamlink_hidden_tickets` |
| Columns | `ticket_id uuid` PK + content_build/form_id/ctx/issued_at/expires_at/redeemed_at/issued_by/specimen_id/specimen_digest |
| RLS / FORCE RLS | `true` / `true` |
| Policy | `streamlink_hidden_tickets_owner` TO `{postgres}` |
| Table DML anon/authenticated/service_role | SELECT/INSERT **false** |
| GENVAL functions in `private` | **17** |
| Owner | `postgres` on all 17 |
| `prosecdef` | true on issue, lock, bind, prepare, complete, generate, assert |
| EXECUTE anon/authenticated/service_role/public | **false** on all 17 |
| `search_path` | `pg_catalog` on generate/assert/issue |
| Comments | match hashed `001` |
| `generate_streamlink_mon_fixture` | **absent** |
| Public/other-schema wrappers | **none** |
| `private.stamp_catch_row(c catches)` | owner `postgres`, `prosecdef=false`, `src_len=3380`, `src_md5=716d8b76519ced3d05e3584c7869dd93` (not replaced) |
| `pgcrypto` | `extensions` 1.3 |

Honesty: **LIVE CATALOG PASS**. Not REAL RPC. Not a production smoke run.

---

## Still UNAPPROVED

- A19-WIRE (catch pipeline still `stamp_catch_row`)
- A19-RESET-GO (script prepared only; see [GEN-IX-RESET-SCOPE.md](./GEN-IX-RESET-SCOPE.md))
- Merge to `main`, deploy, APP stamp
- Hosted generate/assert execution
- Restore of the pre-D35 snapshot
