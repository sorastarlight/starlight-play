# CODEX-217 — existing Studio Pass draft correction

Routine frontend maintenance under CODEX-78,October25. The existing Content Studio is still the handoff for Pass bundle editing;this does not migrate that workflow into the new Hub or change the server reward policy.

## Confirmed defect and correction

The actual existing renderer copied stored daily/weekly rewards back over its local draft on every render. The add handler modified its local bag then immediately rendered,losing the addition. Its shared removal handler also targeted both daily and weekly bags;that would become destructive once the render-reset defect was corrected. The new regression fails against the baseline at “Adding a daily reward must survive render.” No production save or reward change was used to reproduce this.

Initialize the two local bags when the existing catalog reload succeeds,instead of during presentation. Tag Pass removal controls with their daily/weekly identity and remove only from that bag. Missing bundle identity does nothing. Preserve local edits across presentation/tab changes;explicit successful reload remains the reset point. Return keyboard focus to the appropriate Add reward control after additions/removals.

Only `js/admin-studio.js` changes at runtime. Existing read/write endpoint names,save payload keys,save handler,server permissions,claim/reward logic and all configured reward amounts are unchanged. No new auto-save,retry,provider or authenticated route. Pack removal remains unchanged. Existing server authority applies to any later owner-initiated save.

## Validation and scope

124 LOCAL HARNESS suites pass. Actual source functions/event handler tests cover repeated additions,daily/weekly removal isolation,missing identity,canceled picker,no automatic save,exact fictional save arguments,explicit reload and failed reload. REAL LOCAL DOM loads the entire actual Studio script with fictional transport/picker and CSP connect-src none:independent bundle edits survive a tab round-trip;keyboard focus returns;the fake save receives exactly the displayed bags. Four rendered widths320/390/768/1024 have no horizontal overflow and no broken visible images. Hidden crop-modal images and image-load timing are excluded correctly from the measurement. No live catalog read/save,SDK/Auth,notice,gameplay/grant or protected-account action.

Build31HTML/479refs,APP20261008-rc133 unchanged. Exact one-file frontend rollback and drift refusal before writes pass. Baseline/candidate/transport evidence:[scope](evidence/codex217-runtime-scope.json),[regressions](evidence/codex217-regressions.json),[browser](evidence/codex217-browser-checks.json). Raw fixtures/screenshot/rollback remain private at `C:\Users\FET\AppData\Local\PokemonStreamLink\security\codex217\`.

This corrects the already-existing local editing behavior;it adds no privileged workflow or server operation. Publication is within the owner's CODEX-78 maintenance exception,limited to the exact one-file diff followed by static hosted source verification. It authorizes no live Pass configuration save or claim. Sora NO;Twinkle NO;PlayTester role unchanged. Temporary fixture tabs/server are closed.
