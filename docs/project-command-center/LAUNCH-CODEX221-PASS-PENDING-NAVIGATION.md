# CODEX-221 — Pending Pass save navigation presentation

REAL LOCAL DOM reproduced a misleading “Discard and continue” choice while the Pass save response was pending. The save had already been sent;confirming discard did not leave the workspace. It did not send a second save.

The one-file `js/admin-next-pass.js` maintenance correction shows “Save in progress” and “Return to pending save” instead. It explains that the already-sent request cannot be canceled or repeated by closing the message. Existing ready-draft discard,uncertain-result clearing,modifier links and current-tab behavior remain. No adapter,server permission,payload,claim or retry behavior changes.

126 LOCAL HARNESS suites pass,including a test of the actual document-click handler that fails against the baseline and passes the candidate. REAL LOCAL DOM confirmed the new message,no discard action,unchanged call count of2(one read/one save),and ordinary navigation after resolving that same response. This uses fictional localhost transport,not a hosted save. Exact guarded one-file rollback and unchanged transport call sites pass;build31HTML481refs,APP unchanged.

[Scope/native observations](evidence/codex221-scope.json) · [Regressions](evidence/codex221-regressions.json). Screenshot and rollback are private at `C:\Users\FET\AppData\Local\PokemonStreamLink\security\codex221`.

Routine one-file publication/source verification is within CODEX-78. No SQL,authenticated navigation/notices,hosted application call,claim,grant,provider action,protected-account mutation,schedule,APP stamp or final launch. Sora NO;Twinkle NO;PlayTester unchanged.
