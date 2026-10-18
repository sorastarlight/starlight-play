# D77 — PlayerQA account provisioning

**Verdict:** **D77 BLOCKED — ACCOUNT DETAILS OR AUTH REQUIREMENTS**  
**Status:** No account was created. PlayerQA does not already exist.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `725709b4`  
**Work commit:** `6eda99a5`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No password was supplied, stored, printed, or committed. No email address was invented.

Do not start D78. Do not run an encounter. Final release smoke stays paused.

## 1. Blocker

Canonical registration is `playRegisterTrainer` in `js/auth.js`. It requires a username, an email address, and a password of at least 8 characters, then calls Supabase `auth.signUp`. The register form marks email and password as required fields.

The owner named the username `PlayerQA`. The owner did not supply an email address. This batch must not invent one.

The owner also asked for a secure password entry and did not include a password. This session has no password prompt that would keep the secret out of transcripts, tool logs, and GitHub. A password must not be pasted into the repository, an issue, or a report.

Both missing fields block creation. The email is the hard stop.

## 2. Preflight

Class: **READ-ONLY LIVE CATALOG**. Checked `2026-10-18 04:11:14.107578+00`.

| Check | Result |
|---|---|
| D76 pointer `725709b4` is on this branch | yes |
| Lifecycle | `inactive` |
| `activated_at` | null |
| Familiarity events | 0 |
| Outbox rows | 0 |
| WIRE `enabled` | false |
| `settle_if_needed` md5 | `565c102d0a8c84a3dfd036653aca307c` |
| APP | `20261008-rc133` |
| Profile or auth row for username `PlayerQA` | none |

The lookup matched only `playerqa` on `profiles.username`, `profiles.display_name`, and the auth username metadata keys. It did not list other trainers.

## 3. Registration path

`auth.signUp` sends `username`, `preferred_username`, and `name` in user metadata. `private.handle_new_user()` inserts `public.profiles` and an empty `public.inventories` row. It does not insert a staff role, a Twitch connection, or a Pokémon.

`private.normalize_username` lowercases the username. A later signup would store the username as `playerqa`. The display name can still be `PlayerQA` through the metadata `name` field. Staff access is a separate `staff_roles` row, which signup does not create. Twitch linking happens only in `private.handle_new_identity()` when the provider is Twitch.

If signup returns a user and no session, the client tells the trainer to verify the email before sign-in. That confirmation step was not tested, because no account was created.

`private.grant_starter_kit` is the welcome-kit function. The hosted `handle_new_user` does not call it. `ensure_inventory` calls it only when that function itself inserts the inventory row. Because the auth trigger inserts the inventory first, a new account can exist with an empty bag until a later path grants the kit. This batch did not change that behavior and did not grant items.

## 4. What was not done

- PlayerQA was not created.
- No password material was written to the repo, fixtures, logs, or this report.
- No Pokémon was generated.
- No encounter ran.
- No ball, berry, or Honey was spent.
- Species Familiarity was not activated.
- Sora, Twinkle, and PlayTester were not modified.

## 5. Proposed D78 encounter packet

D78 cannot run until PlayerQA exists. After a later batch creates the account, the encounter GO remains the D76 packet: one canonical Play encounter, lifecycle still `inactive`, WIRE still off, at most one specimen, one chosen ball through normal play, the specimen kept, then stop. That GO is not included here and is not approved.

## 6. Still required

- An email address the owner chooses for PlayerQA.
- A password entered through a channel that does not land in git, issues, or reports.
- Confirmation that the stored username `playerqa` and display name `PlayerQA` are acceptable.
- A separate GO before any encounter.

Do not start D78.
