# A19-GENVAL D40 production compatibility and readiness review

**Verdict: READINESS PACKET READY. A19-GENVAL production application remains UNAPPROVED.**

This batch is read-only planning. It is **not** GENVAL-APPLY authorization. It does not write SQL, create functions, execute the generator, start WIRE, restore a backup, merge, deploy, or stamp APP.

Independent D39 review on issue #25 (`278d225c`) asked for a production compatibility + deployment runbook with no live writes, then a **separate** owner GENVAL-APPLY if chosen. This file is that runbook.

Baseline: D39 / `278d225c`. Pin `sl-ref-20261013-227b573`. Project `dtflmlbjhttoewqgkujf` / starlight-play / us-west-1.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

| Honesty | Used |
|---|---|
| STATIC | Additive SQL scan, name collision vs `supabase/migrations/`, SHA-256 of unapplied artifacts |
| LIVE PLATFORM | `get_project` — ACTIVE_HEALTHY, Postgres **17.6.1.166** |
| LIVE CATALOG | `list_extensions`, `list_tables` (private/public names only), `list_migrations`, SELECT on `pg_catalog` / `information_schema` / `private.ref_meta` |
| LOCAL HARNESS + REAL SQL | `node tools/a19-genval-rehearsal.js` **15/15** on `127.0.0.1:55433/a19_genval` |
| OWNER REPORT | Last named COMPLETED backup `2026-10-14 07:44:26 +0000`; PITR **disabled** (not reconfirmed this batch) |
| NOT RUN | Hosted writes, generator execution, catch-row SELECT, WIRE, backup create/restore, PRODUCTION smoke |

---

## 1. Production SQL is additive and fixture-free

Exact apply artifact: `supabase/unapplied/a19-genval/001_generate_and_assert.sql`.

| Check | Result |
|---|---|
| `^\s*DROP\s+(TABLE\|FUNCTION)` | **absent** |
| `generate_streamlink_mon_fixture` | **absent** from `001` (lives only in `local/010_fixture.sql`) |
| Teardown `DROP` | `local/000_teardown.sql` + review `002_rollback.sql` only |
| Catch DML | no `INSERT`/`UPDATE`/`DELETE` on `public.catches` |
| `stamp_catch_row` | comment-only; not created or replaced |
| Shape | `CREATE SCHEMA IF NOT EXISTS`, `CREATE EXTENSION IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `REVOKE` |

`002_rollback.sql` and both `local/*.sql` files are **not** production-targeted. Do not apply them on hosted Supabase.

Nothing from `a19-genval/` is in `supabase/migrations/`. Remote history already has A19-SCHEMA as `a19_apply_*`. Do **not** reapply A19-SCHEMA. Do **not** copy GENVAL into `supabase/migrations/` unless that copy is part of a later explicit GENVAL-APPLY.

SHA-256 (raw file bytes):

| Artifact | SHA-256 | Production? |
|---|---|---|
| `001_generate_and_assert.sql` | `6f7bca74c4fe57cc50cd65978d8b96c0936078c2b9bdca0ddc21d93e75e0d58a` | **only** if later approved |
| `002_rollback.sql` | `4e47147f1a633029563d87ed5805c2a3f13c65d1aca84d808260831aa3252a3f` | no |
| `local/000_teardown.sql` | `1ad86265d6affec4cf999f9df74ad4d9e2e86bf05ca77b62a45559ce76278171` | no |
| `local/010_fixture.sql` | `b2df5c7bd13a534f37ac0725d05fed00e97506811413bcfb03ea60215160aab3` | no |
| `DO-NOT-APPLY.md` | `3f514897f6afbc260389ff1e5b63c6d14780fea84bb390819d584b661ba03c1f` | n/a |

---

## 2. Live compatibility (metadata only)

Session catalog user: `postgres`. Database: `postgres`. Server: **17.6**.

| Object | Live state | GENVAL implication |
|---|---|---|
| `private.ref_meta` / `ref_*` | present; pin `sl-ref-20261013-227b573`, ruleset `streamlink-gen9-xgen` | Generator/validator can resolve the applied pin |
| `private.streamlink_hidden_tickets` | **absent** (`to_regclass` null) | `CREATE TABLE IF NOT EXISTS` is a new table |
| `private.generate_streamlink_mon` and all `private.streamlink_*` / `issue_streamlink_hidden_ticket` / `assert_streamlink_legal` | **absent** | `CREATE OR REPLACE` will create, not overwrite a live meaning |
| Public or private wrappers whose source mentions those names | **none** | No existing PostgREST/public wrapper to collide with |
| `private.stamp_catch_row(c catches)` | **present**, owner `postgres`, `SECURITY DEFINER` **false** | Untouched. Live catch path stays as-is until a later WIRE |
| Remote migrations | last `a19_apply_002_catches_nullable_extensions`; no `a19-genval` / `generate_streamlink_mon` | History reconciliation is a separate issue; do not replay SCHEMA |

PostgreSQL 17.6 accepts the SQL dialect in `001` (PL/pgSQL, `gen_random_uuid()`, `CREATE POLICY … TO current_user`, `FORCE ROW LEVEL SECURITY`). Local rehearsal used embedded Postgres 18 against the **same** `001` bytes and passed.

---

## 3. `pgcrypto` — already present; no unauthorized change required

| Fact | Evidence |
|---|---|
| Installed | `pgcrypto` **1.3** in schema `extensions` (`list_extensions` + `pg_extension`) |
| Required by `001` | `private.streamlink_sha256` calls `extensions.digest(bytea, text)` then `public.digest` |
| Live digest | `extensions.digest(bytea, text)` and `extensions.digest(text, text)` exist |
| Production entropy | `private.streamlink_secure_u32` uses `pg_catalog.gen_random_uuid()` (also present in `extensions`) |

`CREATE EXTENSION IF NOT EXISTS pgcrypto` with **no** `SCHEMA` clause is a **no-op** when the extension already exists. It does **not** move `pgcrypto` out of `extensions`. It does **not** change extension owner. Applying `001` later still *contains* that statement; it is not a reason to install or relocate pgcrypto now.

Do **not** run `CREATE EXTENSION` in this review. Do **not** rewrite `001` to drop the line — that would change the locked hash and need a new review.

`anon` / `authenticated` / `service_role` can `EXECUTE` `extensions.digest` today. That is the stock Supabase extensions grant, not a GENVAL grant. Clients still cannot call GENVAL functions after `001` because those functions are `REVOKE`d. Do not revoke `digest` as part of GENVAL-APPLY (out of scope; would be an extra privilege change).

---

## 4. Name overwrite assessment

| Name | Collision? |
|---|---|
| `private.streamlink_hidden_tickets` | no live table |
| 17 functions listed in the `001` `REVOKE` block | no live `pg_proc` rows |
| `private.stamp_catch_row` | exists; **not** in `001` |
| `generate_streamlink_mon_fixture` | not in `001`; must stay local-only |

`CREATE OR REPLACE FUNCTION` is safe here only because the names are unused. If a later live object appears with the same signature and a different body, apply must **stop**. Re-run the catalog name query immediately before any approved apply.

---

## 5. SECURITY DEFINER, RLS, EXECUTE, public wrappers (R2 / R18 preserved)

`001` creates these as `SECURITY DEFINER` + `SET search_path TO pg_catalog`:

- `issue_streamlink_hidden_ticket`
- `streamlink_lock_hidden_ticket`
- `streamlink_bind_hidden_ticket`
- `streamlink_generate_prepare`
- `streamlink_complete_specimen`
- `generate_streamlink_mon`
- `assert_streamlink_legal`

All 17 function signatures are `ALTER FUNCTION … OWNER TO CURRENT_USER` then `REVOKE ALL` from `public`, `anon`, `authenticated`, and `service_role`.

Tickets table: `ENABLE` + `FORCE` RLS; `REVOKE ALL` from `public` / `anon` / `authenticated`; policy `streamlink_hidden_tickets_owner` is `TO current_user` at apply time.

**Install-owner assumption:** apply as `postgres` (same owner as live `stamp_catch_row` and this catalog session). If a different role applies, the owner-only policy binds to that role. Do not apply as `anon`, `authenticated`, or `service_role`.

**Pre-existing, unchanged (do not “fix” in GENVAL-APPLY):**

- `private` schema ACL includes `authenticated=U/postgres` (USAGE). Object `REVOKE` still blocks table/function use when EXECUTE/DML are denied.
- Twelve unrelated `private.*` tables have RLS disabled (Supabase advisor). Out of GENVAL scope. Do not enable RLS on them here.
- R2 (anonymous EXECUTE on some admin RPCs) and R18 (broad moderator privileges) stay **OPEN**. GENVAL must not GRANT the new functions to clients or `service_role`.
- PostgREST `private` must stay unexposed (D35 LIVE API `PGRST106`). Do not `NOTIFY pgrst` to add `private`.

No existing wrapper in `public` or `private` calls the GENVAL names. Future WIRE must be the only caller, via server-owned code, not a client RPC.

---

## 6. Local rehearsal of the exact production SQL

`node tools/a19-genval-rehearsal.js` (this batch): **15/15 PASS**.

Order on disposable `127.0.0.1:55433/a19_genval` (**not** `dtflmlbjhttoewqgkujf`):

1. Load schema + pin seed.
2. Apply production `001` only — generate/assert exist; fixture generate **absent**.
3. Reapply `001` — idempotent; tickets survive.
4. Install `local/010_fixture.sql` **separately**.
5. Privilege, matrix (22), oracle, G1/C1, Articuno, specimen binding, failed-generate, concurrent redeem, entropy, untrusted INSERT.

This is LOCAL HARNESS + REAL SQL. It is not a hosted production verdict.

---

## 7. Remaining WIRE boundary (do not implement)

`specimen_digest` is SHA-256 of **canonical combat identity** at redeem (content build, form, dex, level, nature, ability/slot, IVs, EVs, move ids/method/VG, gender, shiny, friendship). JSON `hiddenGrant` / `hiddenTicketId` / `hiddenSpecimenId` are ignored.

That digest is **not** a unique persisted catch/specimen identity:

- Two independently created copies with the same combat snapshot share the same digest.
- A redeemed ticket can validate another JSON blob with the same combat attributes.
- Later HP/current, move PP, or EV mutation is a different problem from creation-time authorization.

**WIRE must** bind `ticket.specimen_id` to **one** inserted catch/specimen row and enforce single-use at commit. A combat digest alone is not sufficient.

This batch does **not** implement WIRE, does not GRANT callers, and does not replace `stamp_catch_row`.

---

## 8. Readiness vs apply

| Gate | Status |
|---|---|
| Additive fixture-free `001` | PASS (STATIC) |
| Live name / pin / PG / pgcrypto compatibility | PASS (LIVE CATALOG + LIVE PLATFORM) |
| Local exact-SQL rehearsal | PASS (REAL SQL 15/15) |
| WIRE unique-identity binding | **OPEN** — documented, not built |
| Freshest COMPLETED backup reconfirm | **OWNER** — last named stamp `2026-10-14 07:44:26 +0000` **predates D35** and is not a safe default restore target |
| PITR | **disabled** (OWNER REPORT); reconfirm immediately before any future GENVAL-APPLY |
| Restore | **never automatic** — failed apply/catalog check is STOP + owner notify; restore needs a later named-timestamp authorization and data-loss assessment |
| `002_rollback.sql` | **not** an automatically authorized fallback |
| Explicit GENVAL-APPLY | **missing** |

Checklist: [GEN-IX-GENVAL-APPLY-CHECKLIST.md](./GEN-IX-GENVAL-APPLY-CHECKLIST.md) (D41 recovery correction).

**STOP** for owner review. A later prompt that is not an explicit GENVAL-APPLY is still not authorization. Restore is not included in GENVAL-APPLY.
