# D82 — Launch-guard final security gate

**Verdict:** **D82 SECURITY GATE PASSED — INSTALL OWNER GO REQUIRED**  
**Status:** Read-only. Neither D81 SQL file was installed.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `6b400e63`  
**Work commit:** `2628fdbd`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**Catalog:** `2026-10-18 05:36–05:37+00`. Exposed-schema probe: `2026-10-18 05:39:51 GMT`.

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

The D81 file may be installed unchanged. This report is not that GO. Do not start D83.

## Grants and security mode

All of these are owner `postgres`. `CREATE OR REPLACE` in `001_round_is_active.sql` does not add a grant. Hosted body md5 remains `5732cc462502e346843eedb76fada494`. File SHA-256 remains `d1a408c5687f817a056a103eba1767ff971e4538355d43958e48e5c1936ffc8d`.

| Function | Mode | anon EXECUTE | authenticated EXECUTE |
|---|---|---|---|
| `private.round_is_active` | INVOKER | yes | yes |
| `private.director_active_round` | INVOKER | yes | yes |
| `private.director_pause_round` | INVOKER | yes | yes |
| `private.director_cancel_active_round` | INVOKER | yes | yes |
| `private.launch_community_round` | INVOKER | yes | yes |
| `private.director_tick` | INVOKER | yes | yes |
| `private.director_tick_if_due` | INVOKER | yes | yes |
| `public.admin_gift_joined` | DEFINER, `search_path=public` | no | yes |
| `public.admin_pause_round` | DEFINER, `search_path=public` | no | yes |
| `public.admin_director_command` | DEFINER, `search_path=public` | no | yes |
| `public.admin_test_start` | DEFINER, `search_path=public` | no | yes |
| `public.admin_start_round` | DEFINER, `search_path=public` | yes | yes |
| `public.play_state` / `play_sync` | DEFINER, `search_path=public` | yes | yes |

PUBLIC and `service_role` also have EXECUTE on the private functions. `anon` has no USAGE on schema `private`. `authenticated` has USAGE on `private`. Neither `anon` nor `authenticated` can log in. `authenticator` can log in. `service_role` cannot log in and bypasses RLS.

`require_hub()` raises `42501` unless `private.is_play_admin()`. That check is `play_staff_role(auth.uid()) is not null`.

## Exposed schemas

A non-mutating GET with `Accept-Profile: private` returned HTTP 406 `PGRST106`: only `public` and `graphql_public` are exposed. `graphql_public` has no function whose name or body references these director or gift functions. Direct EXECUTE is not the same as a remote RPC.

## Authorization result

An ordinary Trainer cannot choose pause, cancel, refund, launch, or gift.

The staff wrappers check `is_play_admin` or `require_hub` before they call a director function. `admin_start_round` is executable by `anon`, and its first check still raises `not allowed` when `auth.uid()` is null. That grant is older than D81 and is not a bypass of the boolean.

`play_state` and `play_sync` do not call pause, cancel, launch, or gift. They call `director_tick_if_due()`, which may call `director_tick()`. That tick already runs for a normal Play poll. After the id check, `director_active_round()` can see an ordinary open round, so an ad can pause it and a known-offline RPG session end can cancel and refund it. The Trainer does not pass that action. It is the existing director seeing the round, not a new staff RPC.

The boolean change adds no function and no grant. It does not open a remote path that skips the staff check.

## Remaining risk

`authenticated` USAGE plus EXECUTE on `private` stays. A SQL session in that role could call the private functions. That role cannot log in, and PostgREST does not expose `private`. Revoking those grants is out of scope.

After a later install, the next open round makes the existing staff pause, cancel, and gift paths actually run, and the existing director tick can pause for an ad. No encounter was opened here.

## Install

`supabase/unapplied/d81-encounter/001_round_is_active.sql` may be installed unchanged by a later owner GO. `002_round_is_active_rollback.sql` stays unapplied. Both files still say DO NOT APPLY.

Do not start D83.
