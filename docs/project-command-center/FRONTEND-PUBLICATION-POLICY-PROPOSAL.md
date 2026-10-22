# Approved routine frontend publication scope

APPROVED:owner selected “Publish and allow scoped routine frontend”. The following scope is active under CODEX-78 and recorded in CODEX-RUNNER.md and streamlink-project.mdc. The original proposal path is retained for link continuity.

Concrete pending change:CODEX-77's six-line navigation focus restoration,with6 actual-source cases,local browser acceptance and85 regression suites passing. Publish that reviewed feature-branch commit through the existing GitHub Pages pipeline,then verify live source and read-only keyboard behavior. APP stays20261008-rc133.

Approved standing scope for later work:Codex may publish routine copy,layout,accessibility,loading/error-state and other frontend maintenance fixes that preserve already-approved product behavior and server authority. Use the canonical checkout/feature branch,appropriate tests/local acceptance,review the exact runtime diff,fast-forward only reviewed work through existing main/Pages,and record live source/behavior evidence. Keep private artifacts and unremediated security details out of publication;unrelated queued changes do not gain publication authority. Stop on unexpected branch drift or failed publication/acceptance and diagnose before proceeding.

Still require an important owner decision:major features or visual/functional direction,new or changed Auth/security/account authority or privileged action flows,production SQL/grants/RLS,gameplay/economy mutations or tests,provider/DNS/credential/settings changes,spending,scheduling,APP stamps,destructive cleanup and final public-launch go/no-go. Sora/Twinkle protections remain. Read-only verification must avoid known write-risk routes such as Play bootstrap. No background automation is created by this scope.

The owner approved both the pending navigation publication and this standing scope. The operating records/rule are amended accordingly. This does not authorize any excluded action or final launch.
