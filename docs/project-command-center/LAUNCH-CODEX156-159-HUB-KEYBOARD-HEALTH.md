# CODEX-156–159 — Admin Hub keyboard and health maintenance

Routine maintenance under the owner-approved CODEX-78 exception. This adds no new product type, privileged capability or server command. Twitch testing remains on hold. No authenticated hosted application navigation is used, because CODEX-155 found the shared navigation can acknowledge notices when restoring a session.

## Completed local work

**156 — Mart focus continuity.** Actual keyboard activation previously replaced the product button and left focus on BODY. The replacement product heading now receives focus without scrolling; Tab enters the first field. Loading, saving and result states retain a useful focus target. If focus has moved outside the editor while a response is pending, completion does not steal it. A fictional denied save still clears product data; no retry or payload behavior changed. Seven retained focus/state observations plus the baseline are in evidence/codex156-focus.json.

**157 — Section tab semantics.** The existing vertical menu now has named tab/panel associations, one roving tab stop, Up/Down wrapping and Home/End. Arrow keys move focus only. Native Enter/Space activates the existing section button; arrow exploration does not load a section or start polling. Tab enters the selected panel. The mobile menu toggle now identifies the list it controls. Seven keyboard states and four responsive relationship checks are in evidence/codex157-tabs.json; all seven relationships resolve, with one tab stop and no document overflow at the four tested widths.

**158 — Access failure wording.** A failed permission lookup previously used the same denial copy as an ordinary trainer. Verification failure now asks the user to reload; actual denial explains that the workspace is for staff. Both retain the existing closed gate and clear editor data. The permission condition, RPC, role and server enforcement are unchanged. Actual function tests cover signed-out, allowed, denied, unavailable and superseded lookup results. Two isolated rendered gate cases are in evidence/codex158-access.json. An initial private harness dependency error was repaired before retaining those measurements; it was not a production defect.

**159 — Health retry and truthful state.** Both failed reads previously set the loaded flag, preventing another attempt when reopening Analytics, while the status still said health snapshot. Refresh health now uses only the existing admin_build_health/admin_game_health reads. Unavailable and partial results are explicitly labeled and remain retryable; complete snapshots retain the existing four metrics. Duplicate requests are blocked while pending. The refresh control stays keyboard-focusable with aria-disabled and a Refreshing label; repeated activation does not issue another read. Reset invalidates prior responses and clears the old snapshot. Six rendered state/retry observations and four health/control width cases are in evidence/codex159-health.json and evidence/codex159-health-widths.json. The refresh target is approximately 46.8 px tall in the fixture and uses Nunito; reviewed panels fit.

## Validation and boundaries

112/112 STATIC / LOCAL HARNESS suites pass. New tests execute the actual menu handler, access loader and health loader, including pending/stale responses, rather than replacing those implementations. REAL DOM evidence uses actual HTML/controllers with fictional transports and CSP-blocked network connections. These checks do not certify a physical Android/iOS device, screen reader, real Twitch provider or authenticated hosted save.

Build passes: 31 root HTML pages and 466 first-party references. APP remains 20261008-rc133. Protected admin.html/js/admin-live.js are unchanged. No SQL, Auth/provider settings, role/grant changes, catalog saves, gameplay, spending, real email, scheduling or final launch declaration.

Exact routine runtime publication scope: **admin-next.html, js/admin-next.js, js/admin-next-mart.js**. New tests, the extended fictional pending-response fixture, evidence and command-center records stay on the feature history. Preserve separate main/feature histories and exclude unrelated queued files. Hosted acceptance is limited to deployment/source comparisons in this batch; no sign-in or write-risk navigation is inferred from routine publication authority.

Private screenshot: LOCALAPPDATA/PokemonStreamLink/security/codex156/health-final.png. Publication result will be recorded after Pages succeeds and the exact main sources match.


## Publication verified

Routine exact3runtime files published as main50d4a53ee908d69f9295c53bce3c5fe79b72d90a. Pages39976074698 succeeded;100monitored sources and3changed versioned URLs match that exact commit. Main build31/466 passes. No authenticated hosted application navigation, report invocation, catalog save, notice endpoint or provider action was used for this verification. Local REAL DOM evidence and hosted source/deployment evidence remain distinct. Temporary local acceptance tabs/servers were closed after review.
