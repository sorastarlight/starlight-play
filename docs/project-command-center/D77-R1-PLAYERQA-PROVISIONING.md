# D77-R1 — PlayerQA account provisioning

**Verdict:** **D77-R1 BLOCKED — REGISTRATION REQUIREMENT**  
**Status:** No account was created. The username and email are free. The password could not be read securely.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `0d1a8224`  
**Work commit:** filled by the pointer commit after this report lands.  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No password was read, stored, printed, or committed.

Do not start D78. Do not run an encounter. Final release smoke stays paused.

## 1. Blocker

The owner authorized username `playerqa`, display name `PlayerQA`, and email `fetkun@gmail.com`. The password was described as an owner-provided credential supplied separately. This session has no secure credential-entry channel, and no process environment variable was set for that password.

The password was not taken from earlier chat and was not invented. Registration cannot call `auth.signUp` without it.

A retry needs the password in a channel that does not enter chat, git, tool arguments, or this report. One workable channel is a process environment variable set before the agent runs. Do not paste the password into the next chat message.

## 2. Preflight

Class: **READ-ONLY LIVE CATALOG**. Checked `2026-10-18 04:27:28.822744+00`. Stop for an existing account was not required.

| Check | Result |
|---|---|
| Branch includes `0d1a8224` | yes |
| Lifecycle | `inactive` |
| `activated_at` | null |
| Familiarity events | 0 |
| Outbox rows | 0 |
| WIRE `enabled` | false |
| `settle_if_needed` md5 | `565c102d0a8c84a3dfd036653aca307c` |
| APP | `20261008-rc133` |
| Username `playerqa` | absent |
| Email `fetkun@gmail.com` on an Auth identity | absent |

The email check was an existence test only. No other trainer was listed, and no existing account was modified.

## 3. Registration path that was not run

`playRegisterTrainer` lowercases the username, requires the email and a password of at least 8 characters, and calls `auth.signUp` with metadata `username`, `preferred_username`, and `name`. `private.handle_new_user()` would create the profile and an empty inventory row. It would not add staff, Twitch, or a Pokémon, and it would not call `grant_starter_kit`.

If signup returned a user without a session, email confirmation would still be required. That step was not reached.

## 4. Verification

PlayerQA UUID: none. Registration did not succeed.

| Check | Result |
|---|---|
| Auth identity | not created |
| Email | `fetkun@gmail.com` was accepted as the intended address and is unused |
| Username | `playerqa` is unused |
| Display name | `PlayerQA` was not written |
| Nonstaff | not applicable |
| Twitch | none |
| Inventory | none |
| Pokémon | none |
| Email confirmation | not reached |

## 5. D78

The future encounter remains the D76 plan for this account once it exists: one Play attempt, lifecycle `inactive`, WIRE off, at most one specimen, one chosen ball through normal play, the specimen kept, then stop. That encounter was not run and is not approved.

## 6. Still required

- The owner-provided password, through a secure channel that stays out of chat and git.
- Then one canonical signup. No second account.
- A separate GO before any encounter.

Do not start D78.
