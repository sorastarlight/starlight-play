# Controlled GENVAL-APPLY checklist (not authorized to run)

**Status:** A19-GENVAL production application remains **UNAPPROVED**.

This file is a runbook for a **future** explicit owner GENVAL-APPLY. Reading it, committing it, or completing D40/D41 is **not** that decision. D41 corrects recovery: failed apply or catalog verification is an immediate **STOP** and owner notification. It is **not** automatic restoration.

Sora mutated **NO** · Twinkle mutated **NO**. Do not start WIRE, grants, resets, merge, deploy, restore, or APP stamp.

---

## Exact SQL artifacts

Apply **only** this file, unmodified, as role `postgres`:

| Path | SHA-256 | Action |
|---|---|---|
| `supabase/unapplied/a19-genval/001_generate_and_assert.sql` | `6f7bca74c4fe57cc50cd65978d8b96c0936078c2b9bdca0ddc21d93e75e0d58a` | **only** artifact if GO is later given |

Do **not** apply:

| Path | SHA-256 | Why |
|---|---|---|
| `002_rollback.sql` | `4e47147f1a633029563d87ed5805c2a3f13c65d1aca84d808260831aa3252a3f` | DROP of GENVAL objects; local/review only. **Not** an automatically authorized fallback |
| `local/000_teardown.sql` | `1ad86265d6affec4cf999f9df74ad4d9e2e86bf05ca77b62a45559ce76278171` | disposable-local DROP |
| `local/010_fixture.sql` | `b2df5c7bd13a534f37ac0725d05fed00e97506811413bcfb03ea60215160aab3` | fixture generate + md5 entropy |

Re-hash `001` immediately before apply. If the digest differs, **stop**.

Keep files under `unapplied/`. Copying into `supabase/migrations/` is not part of this checklist unless the same GO names that copy. Do **not** reapply A19-SCHEMA (`a19_apply_001_*` / seeds / `a19_apply_002_*` already exist in remote history).

`CREATE EXTENSION IF NOT EXISTS pgcrypto` inside `001` is a no-op on this project (`pgcrypto` 1.3 already in `extensions`). Do not run a standalone `CREATE EXTENSION` beforehand. Do not relocate the extension.

---

## Remaining owner checks (Dashboard)

This agent did **not** create or restore a backup and cannot list backup IDs (no Management API token).

| # | What to open | What to record | Why |
|---|---|---|---|
| G1 | [Scheduled backups](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/database/backups/scheduled) | Reconfirm the **freshest COMPLETED** daily timestamp **immediately before** any future GENVAL-APPLY. Last named OWNER REPORT: `2026-10-14 07:44:26 +0000`. | That stamp **predates D35**. Restoring it would undo applied A19-SCHEMA and all later database activity. It is not a safe default restore target. |
| G2 | [Point in Time](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/database/backups/pitr) | Reconfirm PITR **immediately before** any future GENVAL-APPLY (last OWNER REPORT: **disabled**). | If still disabled, any later restore can only use a named daily snapshot. |
| G3 | [Data API / Exposed schemas](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/settings/api) | Exposed schemas must **not** include `private` | Keep D35 `PGRST106` |
| G4 | Apply role | Must be **`postgres`** (same owner as `stamp_catch_row` and the D40 catalog session) | Owner-only ticket policy is `TO current_user` |
| G5 | Restore readiness | Record whether a **post-D35** COMPLETED snapshot exists, and that restore remains a **later** decision | GENVAL-APPLY does not authorize restore |
| G6 | Explicit **GENVAL-APPLY** message | Approve apply of **hashed `001` only**, as `postgres`, after G1–G5 | This checklist is not GO. Restore is not included. |

Do **not** click Restore as part of GENVAL-APPLY, a failed apply, or a failed catalog check. Every database restore needs a **separate** owner authorization that names the restore timestamp and accepts the data-loss assessment. Do **not** enable extra exposed schemas. Do **not** GRANT GENVAL functions. Do **not** run `002_rollback.sql` as a routine workaround.

---

## Expected function and table changes

**New table**

- `private.streamlink_hidden_tickets` (`ticket_id uuid` PK, `specimen_id`, `specimen_digest`, FORCE RLS, owner-only policy)

**New functions** (none of these names exist live today)

- `private.streamlink_json_int(jsonb)`
- `private.streamlink_sha256(text)`
- `private.streamlink_specimen_digest(jsonb)`
- `private.streamlink_secure_u32()`
- `private.streamlink_form_blocked(text, integer)`
- `private.streamlink_obtain_ok(text, text, integer)`
- `private.streamlink_gender(integer, bigint)`
- `private.streamlink_hp_max(integer, integer, integer, integer)`
- `private.streamlink_stat(integer, integer, integer, integer, numeric)`
- `private.streamlink_level_up_slice(text, integer, integer)`
- `private.issue_streamlink_hidden_ticket(integer, text, text, integer)` — SECURITY DEFINER
- `private.streamlink_lock_hidden_ticket(uuid, text, integer, text)` — SECURITY DEFINER
- `private.streamlink_bind_hidden_ticket(uuid, uuid, bytea)` — SECURITY DEFINER
- `private.streamlink_generate_prepare(integer, integer, text, text, text)` — SECURITY DEFINER
- `private.streamlink_complete_specimen(jsonb, boolean, integer, bigint, integer, integer, integer, integer, integer, integer, bigint)` — SECURITY DEFINER
- `private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text)` — SECURITY DEFINER
- `private.assert_streamlink_legal(jsonb, text, uuid)` — SECURITY DEFINER

**Unchanged**

- `private.stamp_catch_row(c catches)`
- `public.catches` rows and columns
- Existing grants, RLS on non-GENVAL tables, R2/R18
- `pgcrypto` install (already `extensions.pgcrypto` 1.3)

**Must remain absent after apply**

- `private.generate_streamlink_mon_fixture`
- Any `public.*` wrapper of generate/assert/issue

---

## If GENVAL-APPLY is later approved — apply window

1. Reconfirm G1–G6 **immediately before** apply (freshest COMPLETED backup, PITR status, restore readiness). Idle stream / no encounter settlement if practical.
2. Re-hash `001`. Confirm catalog: tickets table still absent; GENVAL function names still absent; `stamp_catch_row` still present and not in the script.
3. Apply **only** `001_generate_and_assert.sql` as `postgres`. One transaction (`BEGIN`/`COMMIT` already in the file).
4. Do **not** apply `002`, `local/000`, or `local/010`. `002_rollback.sql` is **not** an automatically authorized fallback.
5. Do **not** `SELECT` catch rows. Do **not** `SELECT private.generate_streamlink_mon(...)` on hosted Supabase.
6. Do **not** start WIRE, replace `stamp_catch_row`, GRANT EXECUTE, or expose `private`.

---

## Post-apply verification (catalog only)

Allowed: `pg_catalog` / `information_schema` / `to_regclass` / `has_function_privilege`. Forbidden: catch-row SELECT, generator execution, player/account reads.

- `to_regclass('private.streamlink_hidden_tickets')` is not null.
- Tickets: RLS enabled **and** forced; no `anon`/`authenticated` table privilege.
- All 17 function names exist in `private` with the signatures above; owner `postgres`; `prosecdef` true on the seven SECURITY DEFINER entrypoints.
- `has_function_privilege('anon'|'authenticated'|'service_role', <each GENVAL sig>, 'execute')` is **false**.
- `to_regprocedure('private.generate_streamlink_mon_fixture(...)')` is null.
- `private.stamp_catch_row(c catches)` still exists, owner `postgres`, not replaced.
- No new `public` function whose `prosrc` mentions `generate_streamlink_mon` / `assert_streamlink_legal` / `streamlink_hidden`.
- Repeat LIVE API: `Accept-Profile: private` still `PGRST106`.
- `pgcrypto` still `extensions` 1.3 (not moved).

---

## Stop conditions

Stop and do **not** retry inventively if:

- File hash of `001` differs from this checklist.
- Catalog shows an unexpected existing GENVAL name or a `streamlink_hidden_tickets` with non-uuid `ticket_id` (`001` raises and rolls back).
- Apply is not running as `postgres`.
- `CREATE EXTENSION` would do anything other than a no-op (extension missing or wrong schema) — reassess; do not relocate.
- Any GRANT to `anon` / `authenticated` / `service_role` is requested “to test”.
- Anyone asks to run generate/assert on hosted Supabase as the verification.
- A19-SCHEMA replay or `003_rollback.sql` is proposed in the same window.

---

## Recovery limitations

A failed production apply or failed catalog verification triggers an immediate **STOP** and owner notification. Inspect catalog-only facts. Do **not** restore, do **not** run `002_rollback.sql`, and do **not** invent a partial undo.

**Every database restore requires a separate owner authorization.** That later message must name the selected restore timestamp and include an assessment of potential data loss. GENVAL-APPLY never includes restore permission. `002_rollback.sql` is likewise not an automatically authorized fallback; it needs its own explicit owner approval if it is ever considered.

The previously recorded backup `2026-10-14 07:44:26 UTC` **predates D35**. Restoring it would undo the applied A19-SCHEMA migration (`private.ref_*` and the nullable catch extensions) and **all subsequent database activity**. Do not treat that stamp as the default recovery target. Do not presume any rollback can recreate D35.

| Situation | Action | Do not |
|---|---|---|
| Apply fails inside the `001` transaction | Transaction should roll back. Confirm catalog-only that GENVAL objects are still absent. **STOP** and notify the owner. | Restore. Retry inventively. Run `002`. |
| Apply committed, then catalog verification fails | **STOP**. Record catalog-only facts. Notify the owner. Wait for a separate restore (or `002`) authorization if the owner chooses one. | Click Restore. Assume G1 is `2026-10-14 07:44:26 UTC`. Run `002` as a workaround. |
| Apply succeeded and catalog verification PASS, but owner later wants GENVAL gone **before WIRE** | **STOP**. Request a separate restore or `002` authorization with named timestamp and data-loss assessment. | Treat GENVAL-APPLY as restore permission. Treat `002` as automatic. |
| Any later WIRE has issued tickets or written catch fields | **STOP**. Restore/`002` would need a new authorization that accepts ticket and catch loss. That is not this checklist. | Use `002` after WIRE. Release/delete catches. |
| Need to undo player Pokémon | That is **A19-RESET-GO**, not GENVAL-APPLY | Release/delete catches to “fix” functions |

Restoration takes the project offline. Storage objects are not in DB backups. Whole-database rewind discards every write after the chosen snapshot. If someone later authorized restore to `2026-10-14 07:44:26 UTC`, that cost includes D35 and all later play.

---

## Explicit owner approval requirements

A valid GENVAL-APPLY message must all be true:

1. Names **GENVAL-APPLY** (not “continue”, “ready”, or this checklist).
2. Names hashed `001` only (or repeats the SHA-256 above).
3. Reconfirms, immediately before apply, the freshest COMPLETED backup, PITR status, and restore readiness (G1, G2, G5).
4. States that restore is **not** authorized by this go, and that `002_rollback.sql` is **not** an automatic fallback.
5. Forbids WIRE, fixture SQL, catch-row SELECT, hosted generate, grants, merge, deploy, restore, and APP stamp in the same go.

A later restore, if ever wanted, is a **different** owner message: selected timestamp + data-loss assessment. The D33 stamp `2026-10-14 07:44:26 UTC` is not acceptable as that timestamp without an explicit statement that undoing D35 and all later writes is intended.

Until the GENVAL-APPLY message exists, A19-GENVAL production application remains **UNAPPROVED**.

**Later (D43 snapshot pointer):** A complete owner GO later applied hashed `001`. This file remains the D41 runbook snapshot. See [GEN-IX-GENVAL-APPLY-REPORT.md](./GEN-IX-GENVAL-APPLY-REPORT.md).
