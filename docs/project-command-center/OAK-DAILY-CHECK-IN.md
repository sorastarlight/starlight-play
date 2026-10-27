# Professor Oak's daily check-in

The free Trainer supply has moved from the Mart into Professor Oak's Lab, directly below his welcome. The Mart now contains only Pass daily/weekly rewards. Collecting Oak's gift uses the existing `play_claim_daily_supply` endpoint; reward amounts, Eastern reset, cooldown, streak extras and overflow behavior are unchanged. An already-collected gift stays collected after the move.

The optional standalone Lab module loads the existing wallet projection without blocking the transfer/evolution stations. It fails closed on unavailable eligibility, prevents duplicate clicks, verifies the current user before and after claiming, and discards stale account responses. Success uses the new sprite-card reveal and bottom-right feedback.

Validation:173 regression suites and build pass; six focused fictional claim/session cases; rendered ready/collected/reveal states and responsive320/390/768/1024views. No hosted claim, owner notice, reward grant or SQL change was performed.

Publication scope:css/play.css,evolve.html,js/oak-daily.js,js/store.js. Authorized by the owner's request to move the existing perk; no new reward policy.

Published at main df81f273; Pages40452894231 succeeded; all four hosted runtime files match.173 regression suites/build pass, including independent Auth listener coverage. No hosted claim, provider test or SQL change.
