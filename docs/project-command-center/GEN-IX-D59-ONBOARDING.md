# D59 — New Trainer onboarding

Branch-only. Baseline D58 / `f758fdce`. WIRE was not read or changed. No production account, inventory, encounter, or settlement was modified.

## What already existed

- Create Trainer and Sign in already accept email and password. Register copy already says Twitch can wait. Settings already has Connect Twitch.
- How to Play already lists Join, Prepare, Throw, catch-or-miss, Pokédex, and PC, with extra topics for Balls, Berries, Honey, the Mart, and Twitch linking.
- Play already shows one-time phase tips (`first-join`, `first-prep`, `first-throw`) and a short idle note for a trainer with zero catches.
- My Inventory already explains Honey, Evolution Candy, and stones the first time those items appear.

Those stay. The new guide does not replace them and does not have to be finished before Join.

## What this adds

`js/onboarding.js` is a six-step Trainer guide stored in the browser under `play-onboarding:v1:<trainer or anon>`.

1. Create an account. Twitch linking is optional.
2. Connect Twitch later from Settings. Play, My PC, the Pokédex, and the Mart do not require it.
3. Join Encounter when a wild Pokémon appears. The guide does not have to be finished first.
4. Oran Berry and other capture berries help only that trainer. Honey helps the encounter and does not replace a Poké Ball. No Item is allowed.
5. Choose an owned Poké Ball. The ball is used on a catch and on an escape. A catch is not guaranteed.
6. Catches go to My PC. The Pokédex records the species. Balls, Berries, and Honey come from the Mart, Daily Trainer Supply, and play.

Skip keeps the current step. Opening the guide again resumes there. Finish can be reopened from the first step. Anon progress is copied once when a trainer id arrives. Nothing is written to the database.

Play shows the full card only after it knows the catch count, and only when that count is zero or unknown and no encounter is in progress. A trainer who already has catches and has never opened the guide sees nothing. During a live encounter the card collapses to a chip so Join stays in reach. How to Play uses the same guide; `#trainer-guide` reopens the saved step. Register links there.

Catch odds, economy rules, Gen IX generation, and settlement were not edited. The script does not call `playCall`.

## Tests

| Check | Class | Result |
|---|---|---|
| `tests/onboarding-tests.js` | STATIC | 7 passed |
| Local harness, desktop | LOCAL HARNESS | Next, skip, and resume kept step 2. Join stayed available while the card was open. Experienced state hid the card. A live-round state showed only the chip. |
| Local harness, 390px width | LOCAL HARNESS | Buttons were 44px tall. No horizontal overflow. Join stayed on the page. |
| Local `index.html`, `help.html#trainer-guide`, `register.html` | REAL DOM | Signed out. Nav stayed usable. Skip on Play collapsed to the paused chip. How to Play still showed its existing steps and reopened the saved guide step. Register linked to the guide. No encounter was started. |
| Production site | — | **not deployed** |

The local Play page loaded the public stream shell and the existing encounter feed. That was a read. No Join click, no account create, no inventory change.

## Still needs a later deploy

The guide is on `admin-hub-overhaul` only. `play.sorastarlight.net` will not show it until an owner authorizes a deploy. APP remains `20261008-rc133`.

Progress lives in the browser, not on the trainer profile. A different browser starts the guide over.

Sora mutated **NO**. Twinkle mutated **NO**. QA account **none**. WIRE was not switched.
