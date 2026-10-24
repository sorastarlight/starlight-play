# CODEX-197 — Operations observation focus

A local rendered reproduction confirmed that passive snapshot updates rebuilt the session controls and dropped keyboard focus to the document body. The module now creates controls once and updates only disabled flags and changed status text. No command, permission, preflight or confirmation behavior changes.

119/119 local regression suites and build 31 HTML/473 references pass. A mounted regression checks stable node identity and reset disabling. Actual local browser checks preserve Start and Reload focus across simulated observations, avoid stealing outside focus, and retain dialog autofocus/Escape restoration in the full Hub shell. No real command or hosted application call ran.

Exact runtime scope: js/admin-next-session.js only, under CODEX-78 routine accessibility maintenance. Baseline/candidate hashes and local evidence: evidence/codex197-scope.json; all suite results: evidence/codex197-regressions.json. Guarded rollback restores that one file from main 08d4f7a6 only if the installed candidate hash still matches. APP stays 20261008-rc133.


CODEX-197 routine accessibility maintenance published at main 73ff83c671da1d0162415ee06d4dc7165dbd6eb2; Pages 40096315148 succeeded; 100 monitored and one changed versioned source match. Passive observation updates retain keyboard focus. All 119 local suites and build 31 HTML/473 references pass. No SQL, Auth/provider, hosted application call, command, grant or APP change.
