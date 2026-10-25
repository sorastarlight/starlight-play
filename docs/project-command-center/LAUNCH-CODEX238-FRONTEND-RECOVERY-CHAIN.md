# CODEX-238 — Combined recent frontend recovery

The recent frontend maintenance has individual guarded rollbacks. This isolated rehearsal verifies composition:copy current production source for css/admin-record.css and js/support.js outside Git,then run the retained CODEX235,234,233rollback scripts in reverse order. Each script verifies its candidate hash before writing,and each resulting baseline hash matches its packet. After all three,the two files equal production d93e90c2 exactly after LF normalization.

Reapplying the three reviewed published candidates in order verifies every baseline precondition and candidate hash. Final files equal current production9356623f exactly. Git ancestry/diff review confirms ec93d129,5aa6b86c and9356623f have sequential parents and each changes only its reviewed runtime file. Feature documentation and unrelated queued work were not included in main.

[Local source/hash/publication-scope evidence](evidence/codex238-frontend-recovery.json). Retained private rehearsal directory and scripts:security/codex238outside Git. No frontend source was changed in this batch;no new regression run was needed. Existing126suite CODEX235baseline remains current.

This is a bounded two-file local recovery rehearsal,not a production rollback,full-site reconstruction,database restore or new restore authorization. Restoring older frontend files in production still needs review against current behavior and scope. No SQL,Auth,provider,credentials,hosted application action,gameplay/grant,email,protected account,APPstamp or production Git mutation ran. Completed physical-backup observation was not repeated. Sora NO;Twinkle NO;PlayTester unchanged.
