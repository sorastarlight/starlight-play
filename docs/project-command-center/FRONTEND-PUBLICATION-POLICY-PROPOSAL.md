# Proposed routine frontend publication scope

PROPOSAL ONLY. Existing production-publication gate remains until an explicit owner answer. This is intended to implement the owner's preference for nearly autonomous maintenance without repeated routine deploy prompts.

Concrete pending change:CODEX-77's six-line navigation focus restoration,with6 actual-source cases,local browser acceptance and85 regression suites passing. Publish that reviewed feature-branch commit through the existing GitHub Pages pipeline,then verify live source and read-only keyboard behavior. APP stays20261008-rc133.

Proposed standing scope for later work:Codex may publish routine copy,layout,accessibility,loading/error-state and other frontend maintenance fixes that preserve already-approved product behavior and server authority. Use the canonical checkout/feature branch,appropriate tests/local acceptance,review the exact runtime diff,fast-forward only reviewed work through existing main/Pages,and record live source/behavior evidence. Keep private artifacts and unremediated security details out of publication;unrelated queued changes do not gain publication authority. Stop on unexpected branch drift or failed publication/acceptance and diagnose before proceeding.

Still require an important owner decision:major features or visual/functional direction,new or changed Auth/security/account authority or privileged action flows,production SQL/grants/RLS,gameplay/economy mutations or tests,provider/DNS/credential/settings changes,spending,scheduling,APP stamps,destructive cleanup and final public-launch go/no-go. Sora/Twinkle protections remain. Read-only verification must avoid known write-risk routes such as Play bootstrap. No background automation is created by this scope.

If approved,record this exact exception in CODEX-RUNNER.md and amend the production-publication clause in .cursor/rules/streamlink-project.mdc so future runs follow it. If only the pending navigation publication is approved,the standing gate stays unchanged. No rule edit has been applied by this proposal.
