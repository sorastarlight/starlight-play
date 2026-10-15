# A19-GENVAL D44 reconciliation (read-only)

**Verdict: FUNCTIONALLY EQUIVALENT. Not byte-for-byte.** LIVE CATALOG compare against hashed `001`. No hosted generate/assert. Nothing reapplied, altered, dropped, or restored.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

| Honesty | Used |
|---|---|
| STATIC | Raw SHA-256 of `001_generate_and_assert.sql` |
| LIVE CATALOG | `pg_proc` / `pg_class` / `pg_policy` / `list_migrations` |
| NOT RUN | `generate_streamlink_mon`, `assert_streamlink_legal`, CREATE/DROP, restore |

---

## Source lock

| Item | Value |
|---|---|
| Path | `supabase/unapplied/a19-genval/001_generate_and_assert.sql` |
| Raw SHA-256 | `6f7bca74c4fe57cc50cd65978d8b96c0936078c2b9bdca0ddc21d93e75e0d58a` |
| Bytes | 41655 (CRLF, 1132 lines) |
| Project | `dtflmlbjhttoewqgkujf` / PG 17.6 / role `postgres` |

---

## Six-transaction history

Hashed `001` is one intended `BEGIN`…`COMMIT`. D43 applied it as six additive MCP `apply_migration` rows because of transport size. Files were never copied into `supabase/migrations/`.

| Version | Remote name | Role |
|---|---|---|
| `20261015013351` | `a19_genval_001a_tickets_helpers` | schema, pgcrypto IF NOT EXISTS, ticket table, RLS, FORCE RLS, table REVOKE, owner policy |
| `20261015013416` | `a19_genval_001b_helper_fns` | 10 helpers + REVOKE |
| `20261015013429` | `a19_genval_001c_ticket_fns` | issue / lock / bind + REVOKE |
| `20261015013445` | `a19_genval_001d_prepare_complete` | `streamlink_generate_prepare` + REVOKE |
| `20261015013554` | `a19_genval_001e_complete_generate` | complete + generate + REVOKE |
| `20261015013647` | `a19_genval_001f_assert_revoke` | assert + full `$rev$` + COMMENTs |

Those six are still the newest remote rows after D35 `a19_apply_*`. No `002_rollback`. No fixture generate.

A mid-apply failure could have left a partial catalog. D44 found the full intended end state: table + 17 functions + REVOKEs + comments.

---

## Functions (17)

All live in `private`, owner `postgres`, `search_path=pg_catalog`, EXECUTE **false** for public / anon / authenticated / service_role. Fixture generate **absent**. No public wrappers.

SECURITY DEFINER (7): issue, lock, bind, prepare, complete, generate, assert.

| Function | Identity args | Body vs hashed `001` |
|---|---|---|
| `streamlink_json_int` | `jsonb` | **byte match** `md5=aee16972…` |
| `streamlink_sha256` | `text` | **byte match** |
| `streamlink_specimen_digest` | `jsonb` | **byte match** |
| `streamlink_secure_u32` | none | **byte match** |
| `streamlink_gender` | `integer, bigint` | **byte match** |
| `streamlink_hp_max` | 4 int | **byte match** |
| `streamlink_stat` | 4 int + numeric | **byte match** |
| `streamlink_complete_specimen` | jsonb + 10 args | **byte match** |
| `streamlink_form_blocked` | `text, integer` | whitespace-compacted; same EXISTS/predicates |
| `streamlink_obtain_ok` | `text, text, integer` | whitespace-compacted; same ctx → obtain flags |
| `streamlink_level_up_slice` | `text, integer, integer` | whitespace-compacted; same last-4 level-up slice |
| `issue_streamlink_hidden_ticket` | form/ctx/build/ttl | whitespace-compacted; same fail-closed + insert |
| `streamlink_lock_hidden_ticket` | uuid/text/int/text | whitespace-compacted; same `FOR UPDATE` classes |
| `streamlink_bind_hidden_ticket` | uuid/uuid/bytea | whitespace-compacted; same atomic redeem predicates |
| `streamlink_generate_prepare` | 5 args | whitespace-compacted; same lock-then-slot logic |
| `generate_streamlink_mon` | 8 args | **comment-only:** live omits the two unused-parameter comments; still ignores `p_seed` / `p_allow_hidden`; entropy remains `secure_u32` ← `gen_random_uuid` |
| `assert_streamlink_legal` | jsonb/text/uuid | **comment-only:** live omits the JSON-hidden-marker comment; code still ignores those keys and requires `p_hidden_auth` + digest |

Comments on generate / assert / issue / tickets table match hashed `001`.

---

## Ticket table

| Check | Live |
|---|---|
| `to_regclass` | `private.streamlink_hidden_tickets` |
| RLS / FORCE RLS | true / true |
| Policy | `streamlink_hidden_tickets_owner` `FOR ALL TO postgres` USING/WITH CHECK true |
| CHECKs | `ctx IN ('grant','event')`; `expires_at > issued_at` |
| PK | `ticket_id` uuid |
| Client DML | anon/authenticated/service_role SELECT+INSERT **false** |
| `pgcrypto` | `extensions` 1.3 |

`private.stamp_catch_row(c catches)` unchanged: owner `postgres`, not SECURITY DEFINER, `src_md5=716d8b76519ced3d05e3584c7869dd93`.

---

## Functional differences

**None found** in control flow, predicates, entropy, ticket binding, or assert error classes.

Differences are transport: six transactions instead of one; some `001b`–`001d` bodies compacted when applied; two comment blocks omitted on generate; one comment omitted on assert.

Do **not** claim byte-for-byte equivalence. A cosmetic one-transaction replay of hashed `001` is **not** required for WIRE and is **not** authorized by D44.

---

## Still UNAPPROVED

A19-WIRE implementation, hosted generate/assert, A19-RESET-GO, merge, deploy, APP stamp, restore, reapply of `001`.
