# CODEX-112 Public Events loading recovery

Public Events previously awaited account navigation outside its error boundary. A rejected session/profile lookup prevented even the public calendar read, leaving an unhandled load failure. The focused baseline reproduced zero play_events calls after a rejected session lookup. Navigation failure is now caught separately;the public calendar can load normally. Existing calendar errors and server-returned staff controls remain unchanged. No Auth/session/provider settings,permissions,staff action handlers or RPC arguments changed.

Validation:3LOCAL actual-source cases cover session failure with successful public calendar,normal signed-out load,and simultaneous session/calendar failure with the existing error state. The test catches only the final bootstrap rejection for observation;dependencies use fictional reads. All99known non-writing STATIC/LOCAL suites pass;build31HTML/464references. No real Events bootstrap,play_state,staff action or provider invocation. This is not real mobile/assistive/provider acceptance.

CODEX-78 scoped publication:feature3022d771;only js/events.js to main9b708c6c. APP20261008-rc133 unchanged. Sora NO;Twinkle NO;PlayTester role unchanged. No SQL,gameplay,grant,email,spending,scheduling or final-launch action. Evidence:evidence/codex112-regressions.json.

Hosted static verification:56/56 files match checkout,including the changed Events source. GitHub run39795730899 API still reports queued for all jobs;workflow success is not claimed. The local status watcher was stopped,not the workflow. Recheck workflow conclusion on the next meaningful continuation;do not redeploy or retry merely due to stale queue reporting. Evidence:evidence/codex112-events-recovery.json.

CORRECTION CODEX-113:the original56-file checker omitted js/events.js. Its56matches did not verify the changed Events source. Expanded58-filecheck confirms Events still matches old publisheddd7cf58c;workflow39795730899 reportsqueued during GitHub Actions incident. CODEX-112 remains pending hosted acceptance.
