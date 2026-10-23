# CODEX-125 — Settings loading and Pass feedback

Adjacent review confirmed Settings left session/profile/catalog-readiness failures outside its existing Trainer read catch. An actual-source fictional session rejection reproduced the escaping error. A small outer load wrapper now displays the existing gate on unexpected loading errors; existing load body, draft logic, calls, permissions and account authority are preserved.

The existing Pass-check listener likewise lacked a rejection boundary and allowed overlapping requests. It now catches unexpected failures with retry wording, permits one in-flight check, marks its button busy and restores the prior disabled state in finally. Existing token selection, refresh-pass arguments, structured error helper and signed-out/missing-token behavior are unchanged. This is routine frontend feedback/loading maintenance under CODEX-78; not a provider or Auth policy correction.

Seven LOCAL actual-source cases cover failed session/profile lookup, load recovery, failed Pass session/transport, signed-out denial, and overlap/busy restoration with unchanged function/body. Fictional account, snapshot/catalog and provider dependencies only. All106 known non-writing suites pass;build31localHTML/464references and12recovery packet hashes pass. No real play_state, play_trainer, Auth or provider request.

Isolated REAL BROWSER component runs actual selected Pass listener source with mocked session/function/load helpers, play.css and connect-src none. Native button disabled while pending, re-enabled with retry copy after simulated transport failure, then completed a successful simulated retry. No full Settings/account/provider/device acceptance is implied. Screenshot:C:/Users/FET/.codex/visualizations/2026/10/19/01a15207-ca1f-7800-95d6-9fb36dc377d5/settings-recovery-codex125.png. Agent tab closed and loopback server stopped.

Publication pending runtime-only js/settings.js diff. No SQL, security/Auth/provider authority, player/account mutation, grants, real email/gameplay, spending, scheduling, APP stamp or final launch. Sora NO;Twinkle NO;PlayTester role unchanged. Required real acceptance remains open;Twitch testing held.
