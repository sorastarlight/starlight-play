# Next bounded Admin Hub acceptance

Prepared after CODEX-175–177. This is a request scope,not execution permission. The published workflow designs and sources are verified;actual authenticated reports/editor loading/roster behavior remain unproven.

Use the existing owner session through the normal site UI only. Verify the visible account before navigation;if the current account cannot be established as the intended owner,stop for normal sign-in. No passwords,tokens,backend impersonation or injected browser state. Open admin-next.html directly on Mart to avoid starting Operations polling. Shared navigation automatically calls play_notices on the first signed-in paint,marking that account's pending notices seen. This protected-account effect needs an explicit exception;this packet does not call it a side-effect-free read. Do not refresh/reopen the page to replay notices or intentionally invoke account-state/login cleanup.

Bounded session:one page load,inspect existing Mart catalog/search/selection and product preview without typing a changed product or opening Save;open six-field reward configuration without changing values;visit Health,Captures(default30days),Progression,Evolution & Trading,Economy once each,without refresh/range changes;search only EmailQA in Trainers,inspect its current Pokémon page and an existing record,optionally Next then Previous once if available. No other trainer profile,full PC boxes or staff recovery action. Mask private account IDs/names when retaining public evidence. Empty results can pass empty-state presentation but cannot prove populated paging.

Existing read paths include session/profile/staff permission checks,admin_store_get,admin_economy_overview,admin_build_health,admin_game_health,admin_capture_report,admin_progression_overview,admin_collection_overview,and the current Trainer directory/account/identity/reward reads plus admin_trainer_pokemon. No raw data export. No write-risk admin_overview,play_sync,play_account_state,heartbeat,encounter,grant,save,role,provider,email or Auth settings operation. The only proposed write exception is the normal automatic notice acknowledgement for the verified owner session.

Stop on unknown account,access denial,unexpected application command,save/grant requirement or error. Record page,state,source/latency and actual observations without inferring device/provider certification. Existing receipt/state guards are not a substitute for a hosted-save test;that remains separately held. No SQL,spending,APP stamp or final launch is authorized.


## Owner approval and partial execution — CODEX-178
Owner explicitly approved this inspection and owner notice acknowledgement. After reboot owner was visibly verified;single Mart page load,selection/search and reward settings loading completed. Health was partial;test stopped before further reports/roster. Remaining steps are unspent;the proposed SQL corrections and one Health refresh need the separate decision recorded in LAUNCH-CODEX178-HOSTED-HUB-REVIEW.md. No repeat approval for the original scope is needed.


## Completed after separate CODEX-178 decision
Both report fixes installed/source verified;one Health refresh and remaining approved reports/EmailQA roster/detail completed. No further refresh,notice acknowledgement,save or grant authority remains. See CODEX-178 completion and installed evidence.
