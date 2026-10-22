# Required real acceptance — CODEX-100

Owner decision October22,2026: require real mobile/assistive and Twitch-provider acceptance before launch. Desktop-first beta deferral was not selected. No final release, provider mutation, upload, protected-account test, email or restore permission follows from this requirement decision.

## Reviewer evidence to collect

Record actual device/model, OS/browser version, assistive technology/version where applicable, date, page, action and observed result. Mark unavailable or not tested honestly. Owner reports a PC and Android phone are available; model/browser and real results are pending. iOS/reviewer and real screen-reader access remain unconfirmed; no account password, recovery link or token should be shared.

### Physical mobile: iOS Safari and Android Chrome

1. Open https://play.sorastarlight.net/help.html in portrait, then landscape. Confirm readable text, usable guide navigation and no clipped primary controls or horizontal page overflow.
2. Open/close the site navigation by touch; check that links and close control remain reachable. Do not follow Play links or submit account/provider actions during this bounded visual review.
3. Open https://play.sorastarlight.net/register.html . Focus the email/username inputs to show the real keyboard, scroll to the remaining controls, then dismiss it. Confirm the focused field remains visible and the page can still be navigated. Use dummy text only and do not submit/create an account.
4. Report any clipped controls, keyboard obstruction, failed touch action or unreadable content with page/action/device details. A pass on one OS is not a pass on the other.

The reviewed help/register page scripts use session/profile reads, not play_sync. Broader signed-in gameplay/staff review remains a separately bounded task. No new gameplay allowance is created.

### Desktop zoom and real screen reader

Use an existing desktop browser at actual200% browser zoom (not CSS width simulation), then restore the prior zoom. On Help and Register, check heading order, readable text, reachable controls and visible keyboard focus. With an available real screen reader, navigate headings/links and reach each registration field by its name; do not submit. Record reader/browser versions, announcement/keyboard results and failures. Browser accessible-name inspection alone does not satisfy this item.

### Real Twitch/provider integration

Separate test identities were previously unavailable; do not ask the owner to create extra Twitch accounts again or silently use protected identities. Prepare a narrowly bounded review of the existing consent/refresh/subscription flow with a suitable owner-controlled identity, and obtain explicit permission for any protected-account or profile/Pass write. Keep new one-link policy disabled. Never unlink/relink, change credentials, grant rewards, send signed events or upload assets merely to probe readiness. Existing Pass checker/uploader source and mock evidence are retained but do not certify their real integrations.

Exact target identity, intended operation and retained effects must be reviewable before requesting any consequential test. The current decision requires evidence; it does not preapprove those operations. Continue independent preparation while reviewer availability is pending.

## Completion gate

All required real results must be recorded and any material defect fixed/retested before launch recommendation. Remaining physical backup/full Auth restore limits are still separately documented; this decision neither authorizes a restore nor adds an unrequested production restore test. Daily RPO acceptance remains. CODEX-96 deltas must accompany recovery from older snapshots. Final owner go/no-go/APP stamp remain separate.
