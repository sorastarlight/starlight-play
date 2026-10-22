# CODEX-120 — content picker request ownership and asset checks

## Correction

Changing the staff content-picker filter while an earlier request was pending could let the late response replace newer results. The actual-source baseline test reproduced a valid avatar result becoming “No matching content” after an old items response finished. Responses completing after dialog closure could also write into a later opening of the shared dialog.

The routine frontend correction tags each refresh and ignores older results/errors. Closing or selecting invalidates that opening before removing listeners. Current selection, quantity, server call name/arguments, escaping, permissions and staff mutations are unchanged. This is presentation/loading maintenance within the owner-approved CODEX-78 scope.

Seven LOCAL actual-source cases pass: stale result/error rejection, current error preservation, close/reopen result/error isolation, retry and successful selection/listener cleanup. All 102 known non-writing regression suites pass, including the new recovery and picker suites; build validation remains 31 local HTML files / 464 references.

Isolated REAL BROWSER review used actual picker JS/CSS with fictional deferred responses, a strict allowlist server on loopback and connect-src none. Native filter change, newer avatar completion, old items completion, retained avatar, selection and opener focus were observed. It is not authenticated staff, physical-mobile, provider or full-site acceptance. Screenshot: C:/Users/FET/.codex/visualizations/2026/10/19/01a15207-ca1f-7800-95d6-9fb36dc377d5/content-picker-loading-codex120.png. Review tab closed; local server stopped.

## Independent assets

Case-sensitive Git-index review covers 78 literal image/icon/stylesheet/inline-CSS references across 30 tracked top-level HTML files and five CSS files. All match exact paths, with no tracked case collisions. Eighteen unique own-site static assets returned HTTP200 and expected image/CSS types using HEAD only. No cookies, Auth, browser app, provider or RPC invocation. External/data/dynamic references are excluded; this is not dynamic sprite or rendered-device certification. The build's 31 HTML count includes ignored local tmp-avatar-thumb-audit.html, which is not part of the 30 tracked-page asset scope.

Evidence: evidence/codex120-asset-review.json, evidence/codex120-picker-review.json and evidence/codex120-regressions.json. No production SQL, gameplay, grants, real emails, provider settings, credentials, spending, scheduling or APP stamp. Sora/Twinkle not mutated; PlayTester role unchanged. Twitch testing stays held and required real-device/assistive/provider acceptance remains open.

Publication status: candidate prepared and tested on the feature branch. Publish only js/content-picker.js to existing main/Pages under CODEX-78, then verify workflow and actual hosted source. No success claimed before that evidence.

CODEX-120 CURRENT COMPLETION:only js/content-picker.js published under CODEX-78 at main54465ae2;Pages39832712529success.100expanded hosted source files and actual versioned picker URL equal the reviewed checkout.7focused cases/102non-writing suites/build31localHTML/464refs and isolated REAL BROWSER pass;30tracked-page asset scope/78exact references/18HEAD assets pass. No production SQL/Auth/provider/gameplay/email/APP action. Screenshot and limits recorded in LAUNCH-CODEX120-CONTENT-PICKER.md. Prior candidate-held text is historical.
