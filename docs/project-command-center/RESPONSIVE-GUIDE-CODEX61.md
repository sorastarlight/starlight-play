# CODEX-61 — Responsive guide and release health

Final verification supersedes historical caveats below: fresh published guide copy verified at390/768/1280 with the same no-overflow measurements. Fixed help navigation's unresolved sign-in display using session plus read-only own-profile lookup, without play_state/gameplay RPCs. Real frame shows Signed in as Sora Starlight. Six new navigation tests cover sign-out/account-switch races and failures. Fixed species search blur redrawing the picker before the first click; actual #010 search followed by one click selected Caterpie during the approved CODEX-62 gift. Published46622e17,Pages39635899441 succeeded;26/26 selected static files match.80 non-writing regression suites/build pass;APP unchanged. Evidence: evidence/codex61-regressions.json, evidence/responsive61-health.json and evidence/public-launch-publication.json. These bounded checks complete CODEX-61; broader device/Auth acceptance remains open.

Actual published help.html rendered in a same-origin iframe, using its real assets, CSS, navigation and guide code. Review harness: `design-reset/responsive-guide-review.html`. This is browser-frame responsive-layout evidence, not a physical-phone/user-agent emulation or a replacement for authenticated player flow tests.

| Frame width | Document client width | Content width | Result |
|---|---:|---:|---|
|390|374|374|No document-wide horizontal overflow;expanded navigation also fits|
|768|751|751|No document-wide horizontal overflow|
|1280|1263|1263|No document-wide horizontal overflow|

Scrollbar and border space explain the smaller document widths. Outer harness horizontal scrolling at1280 is intentional;the result concerns the guide document itself. Measurements were taken before the wording-only guide correction below;final published wording is verified separately after publication. The iframe account navigation remained Checking sign-in during this read-only layout review;no authenticated-flow success is claimed from the frame. Name/dex staff-picker, hosted public search and earlier owner/EmailQA functional tests remain their own evidence.

Copy maintenance: public guide now uses Species Familiarity and describes retained original-species credit after evolution/trade/Oak, including delayed count updates. Trainer ID copy now says ribbons rather than badges. Evolution guidance points to Prof. Oak's Lab. No game authority/calculation/storage changed.35 play-UX and8 onboarding tests pass;build31HTML/424refs passes,APP20261008-rc133 unchanged.

Publication: harness commit a84e7f8f Pages39633514072 succeeded;copy commit2f612660 Pages39634028882 succeeded. Read-only HTTP checks find25/25 selected public pages/assets equal to newline-normalized checkout. A normal frame reload retained an older help response;the review harness uses an explicit review query to request fresh HTML. This does not stamp production or prove every existing user's cache is refreshed.

Existing Familiarity worker health snapshot:latest5 scheduled runs16:14–16:18UTC succeeded;activation remains active,job3 once/minute,one delivered event and no outstanding queue. No new capture/delivery/reconciliation or schedule change occurred;idle health does not certify a new hosted catch through the corrected worker.

Remaining acceptance includes physical device/touch, browser zoom/reduced-motion, core authenticated responsive pages, two-party hosted GTS and separate provider QA. A bounded GTS proposal is in BOUNDED-GTS-QA.md and needs a second controlled email QA account plus explicit mutation approval. No borrowing protected/unrelated accounts. Actual recovery validation remains separate under the accepted daily-backup policy.
