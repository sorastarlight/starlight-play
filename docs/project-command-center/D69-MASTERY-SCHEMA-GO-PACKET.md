# D69 — Species Mastery schema GO packet

**Verdict:** **GO PACKET READY**  
**Status:** READ-ONLY PREFLIGHT. Not installed. Not activated. This packet is not the owner GO.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `237c66a7`  
**Work commit:** filled after the work commit  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No hosted SQL was written. No catch rows, profiles, inventories, or capture histories were read.

## 1. Baseline

Working tree clean at `237c66a7`. The four files match the D68 prefixes. Stop was not required.

| Order | Path | SHA-256 |
|---|---|---|
| 1 | `supabase/unapplied/d64-mastery/001_species_mastery_events.sql` | `f343c9bf318d8cdd12fb3331f29fd3eb7990ad491b3c096af773e1e6d4e0a9ce` |
| 2 | `supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql` | `2d094864e6872f6c85e66d29c0c5f36fa662a588b34e8f540601efb64bfb9f76` |
| 3 | `supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql` | `1f488477de5e6c021ea74061dfcfede21b51057eb5e852e1f387269d1db41e3f` |
| 4 | `supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql` | `0f7f27a0acfb13fea0c1bfb0f9a43c322af02577dd43b7ff2aae586cf7aeaa3c` |

None of these files is under `supabase/migrations`.

## 2. Hosted catalog

Class: **LIVE CATALOG**. PostgreSQL **17.6** (`170006`). The D68 rehearsal was 17.5. That is a patch difference on the same major version.

Extensions present: `plpgsql` 1.0, `pgcrypto` 1.3, `uuid-ossp` 1.1, `pg_stat_statements` 1.11, `supabase_vault` 0.3.1.

`public.catches` has no `server_inserted_at` column. `caught_at` is `timestamptz NOT NULL` with a default. Primary key is `id`. `user_id` references `profiles(id)` on delete cascade. `round_id` references `encounter_rounds(id)`. Dex is checked from 1 through 1025. Partial unique indexes remain on `source_key` and on `(round_id, user_id)`.

Row level security is on and not forced. The only policy is `users can read own catches` for select, `user_id = auth.uid()`. `anon` and `authenticated` still hold table insert and update privileges. There is no insert or update policy, so the Data API cannot write the table. That grant set is unchanged by this packet.

`auth.uid()` exists. `private.round_is_test(uuid)` exists. `public.capture_log` has `round_id`, `user_id`, `dex`, and `success`. `public.species_mastery` is still primary key `(user_id, dex)` with `points`, `rank`, and `updated_at`. `public.mastery_ledger` is present. Rankings is `public.play_rankings(text, integer, integer)`, with `private.mastery_rank(integer)` and `private.grant_mastery(uuid, integer, integer, text, text)`.

Current function hashes, which an install must not change:

| Function | `md5(prosrc)` |
|---|---|
| `private.grant_mastery` | `d5c11cc672f2cb16ae0210023a8dd91b` |
| `private.mastery_rank` | `04fa122f1f4424cd6e63fa1f3ffa16a4` |
| `public.play_rankings` | `b6526a939abdba0ef106e127925c43b0` |

No proposed mastery table, view, or function exists. `private.streamlink_wire_switch.enabled` is false.

Schema drift since D68 is the hosted patch level 17.6 versus the local 17.5 rehearsal, and the real `stamp_catch_row` body versus the short local stand-in. Neither blocks the packet.

## 3. Trigger compatibility

Hosted `private.catches_before_write()` is owned by `postgres`, is not security definer, and does not mention `server_inserted_at`. On insert it assigns `is_alpha`, then runs `NEW := private.stamp_catch_row(NEW)` and returns `NEW`.

Hosted `private.stamp_catch_row(public.catches)` does not build a new row. It fills fields on the input composite and ends with `return c`. It does not mention `server_inserted_at`. `md5(prosrc)` is `716d8b76519ced3d05e3584c7869dd93`.

That is the same assignment shape measured on PostgreSQL 17.5 in D68. There, `catch_server_inserted_at` fired first and the following `NEW := stamp_catch_row(NEW)` kept the server clock. The hosted function was read, not executed against a new column.

Current before-insert trigger, in name order: `catches_before_write` only. After `004`, before-insert order will be `catch_server_inserted_at`, then `catches_before_write`. After-insert triggers stay `catches_after_present` and `catches_xp`. They cannot overwrite `NEW` after the row is formed. They can still abort an insert, which they can do today.

## 4. Risk acceptance

The owner who pastes the GO accepts this residual:

`private.stamp_catch_server_inserted_at()` is a `BEFORE INSERT` trigger. Its shipped body is one assignment, `NEW.server_inserted_at := clock_timestamp()`, with no exception handler and no second insert. If that function raises, the catch insert rolls back. Replacing it with a raise did that on the disposable database. The shipped body did not.

Do not add an exception handler. A handler that returned the row unchanged would keep a client-supplied timestamp. Do not edit the function during installation.

If catch inserts start failing after installation, use the error text:

- `stamp_catch_server_inserted_at`, `server insertion time`, or a returned-record mismatch from `stamp_catch_row` means the new stamp or the new column is involved. If the install transaction is still open, `ROLLBACK` and stop. If `004` already committed, recording is still inactive, and `species_mastery_events` is empty, run `supabase/unapplied/d67-mastery/rollback-before-activation.sql` once. That drops the stamp and the new column. It does not delete catch rows. Do not disable only the stamp trigger and leave the column in place.
- `after_catch_present` or `after_catch_xp` with no mention of the new column is the existing catch path. Do not treat that as a mastery rollback unless the failure began with the column add.

## 5. Schema-only sequence

Do not run this sequence from this packet. A later batch may run it only after the owner pastes the GO below and the four hashes still match.

Use a session that honors an explicit transaction. Do not use a tool that commits each statement. D68 showed that a statement-by-statement `004` leaves the authority trigger dropped and the new column present, and a second run then stops with `column "server_inserted_at" already exists`.

1. Recompute the four SHA-256 hashes. Stop if any differs.
2. `BEGIN`. Execute `001_species_mastery_events.sql`. On error, `ROLLBACK` and stop. On success, `COMMIT`.
3. `BEGIN`. Execute `002_species_mastery_hardening.sql`. On error, `ROLLBACK` and stop. On success, `COMMIT`.
4. `BEGIN`. Execute `003_species_mastery_lifecycle.sql`. On error, `ROLLBACK` and stop. On success, `COMMIT`.
5. `BEGIN`. Execute `004_species_mastery_catch_safety.sql`. On error, `ROLLBACK` and stop. On success, `COMMIT`.
6. Run the catalog checks in the next section. Do not call `activate_species_mastery_events()`.

`001` creates the event table, guard, record function, select policy, and progress view. `002` inserts one inactive activation row and the outbox. `003` adds the lifecycle columns and, until `004`, the authority trigger. `004` drops that trigger first, adds nullable `server_inserted_at` with no default, and installs the stamp. Adding a nullable column with no default does not rewrite existing catch rows.

## 6. Verification checklist

Catalog and singleton configuration only. Do not select from `public.catches`, `public.profiles`, `public.capture_log`, `public.species_mastery`, `public.mastery_ledger`, or inventories.

- `server_inserted_at` exists on `public.catches` and is nullable, with no default.
- Trigger `catch_server_inserted_at` exists. Trigger `catch_insert_authority` does not.
- `private.species_mastery_activation.activated_at` is null and `lifecycle` is `inactive`.
- `public.species_mastery_events` contains no rows.
- `species_mastery` columns are still `user_id`, `dex`, `points`, `rank`, `updated_at`.
- The three function hashes above are unchanged.
- `private.streamlink_wire_switch.enabled` is still false.
- No call was made to `activate_species_mastery_events`, `settle_if_needed`, or `grant_mastery`.

## 7. Recovery

**Failed installation.** If the failing file was one transaction, `ROLLBACK` removes every change from that file. After a failed `004`, the authority trigger from a committed `003` is present again and `server_inserted_at` is absent. Do not continue. Either retry that uncommitted file or stop. If a file was split into autocommit statements, do not retry it in place. While activation is null and no event rows exist, the D67 inactive rollback removes the partial draft without deleting catches. Then stop for review.

**Successful inactive installation.** Leave recording off. The D67 inactive rollback is allowed only while `activated_at` is null and `species_mastery_events` is empty. It drops the new objects and the clock column. It does not delete catch rows and does not update `species_mastery` or Rankings.

**Later activated system.** This GO does not cover activation. After `activated_at` is set, do not use the pre-activation rollback. Pause, drain, and close are the retention controls. Dropping history needs a separate decision and the existing backup confirmation. Do not invent that decision here.

## 8. Prohibited

- Hosted installation from this packet.
- `activate_species_mastery_events()` and any later enablement.
- Settlement changes, including `settle_if_needed` and `persist_streamlink_catch`.
- Historical backfill.
- Catch-row reads, profile reads, inventory reads, and capture-history reads.
- Changes to `grant_mastery`, `mastery_rank`, `play_rankings`, points, or Rankings.
- WIRE changes. APP bump. Merge. Deploy.
- Sora, Twinkle, or PlayTester mutations.
- An exception handler on the stamp.
- Editing the four SQL files as part of the install.
- D70, unless a later request starts it.

## 9. Owner GO text

Paste only to authorize a future schema install. Pasting it into this packet does not install anything.

```
OWNER GO — Species Mastery schema installation only.

I authorize a schema-only install on project dtflmlbjhttoewqgkujf of these four files, in this order, each inside one explicit transaction, and only while the SHA-256 hashes still match:

1. supabase/unapplied/d64-mastery/001_species_mastery_events.sql
   f343c9bf318d8cdd12fb3331f29fd3eb7990ad491b3c096af773e1e6d4e0a9ce
2. supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql
   2d094864e6872f6c85e66d29c0c5f36fa662a588b34e8f540601efb64bfb9f76
3. supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql
   1f488477de5e6c021ea74061dfcfede21b51057eb5e852e1f387269d1db41e3f
4. supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql
   0f7f27a0acfb13fea0c1bfb0f9a43c322af02577dd43b7ff2aae586cf7aeaa3c

Stop and roll back the open transaction on any error. Leave recording inactive. Do not call activate_species_mastery_events().

This GO does not authorize activation, settlement changes, historical backfill, catch-row reads, points or Rankings changes, WIRE changes, an APP bump, a merge, or a deploy.

I accept that stamp_catch_server_inserted_at() is a BEFORE INSERT trigger. Its one clock assignment can abort a catch if that function raises. Do not add an exception handler and do not edit that function during the install.
```

## 10. Stop

**GO PACKET READY.** The owner has not given the GO. Do not install. Do not start D70. Final release smoke stays paused.
