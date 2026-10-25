# CODEX-233 — Recovery confirmation narrow wrapping

A valid20-character ASCII trainer name (the registration maximum) reproduced internal horizontal overflow in the actual recovery confirmation at320px and390px. The page itself did not overflow;the hero grew to450px inside a267/337px dialog.

Three CSS rules,scoped to the existing Confirm recovery email dialog,allow the review grid,hero and header text to shrink/wrap. No JavaScript,Auth flow,targeting,masked destination,reason,request UUID,challenge,transport,payload or server permission changed. Routine layout-only maintenance under CODEX78.

Twelve REAL LOCAL DOM cases at320/390/768/1024px cover prepared review,clear and pending-prepare completion after clear. Candidate has no dialog/page overflow;no cancelled preparation reopens a dialog. Actual recovery controller with fictional prepare-only response;no send route or SDK,connect-src none. Narrow screenshot inspected privately at security/codex233/recovery-narrow.png. No real mail or account data.

126LOCAL HARNESS suites and build31HTML481refs pass;APP20261008-rc133 unchanged. Actual isolated file rollback refuses drift without writing and restores the exact baseline. Recovery/diagnostics JS and Admin HTML hashes unchanged. [Browser evidence](evidence/codex233-browser.json) · [regressions](evidence/codex233-regressions.json) · [scope/rollback](evidence/codex233-scope.json).

Publication scope is one CSS file only,followed by static-source verification. No hosted signed-in navigation,notices,email,SQL,Auth/provider setting,protected-account mutation,grant/gameplay,spending,schedule,APPstamp or final launch. Sora NO;Twinkle NO;PlayTester unchanged. Private packet/screenshot/fixture retained outsideGit under security/codex233.
