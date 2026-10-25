# CODEX-252 — Native Operations and effective Pinap reward

Status: tested locally; guarded installation and scoped publication pending.

Operations adds automatic encounter pause/resume and stream modes, a searchable Pokémon/form chooser, manual/random/queued encounters, pause/resume/cancel, explicit test/force reviews, and cached/manual ad-protection controls. The primary overview has three useful status cards instead of seven technical cards. No disclosure arrows or legacy editor handoffs are needed for these controls. Existing session Start/End stays separate. All commands open a review and are sent once; an acknowledged/uncertain command requires a reload before another action.

The new pure observation API does not invoke the old live dashboard or Director tick. A guarded command wrapper checks the same semantic state at review/send time and again under immediate Director/ad/round locks. Changed rounds, queue/mode/session/ad state, unsupported payloads, non-targetable forms and unknown actions are rejected before dispatch. It delegates gameplay behavior to the unchanged existing dispatcher and returns a bounded receipt. Provider authorization/refresh/snooze is not exposed through this dispatcher.

The PokéCoin editor gains the effective Pinap Berry bonus using the existing Economy read/save APIs. The old Capture setting can be shadowed by Economy and is not duplicated. Only changed keys are saved. No current reward amounts were changed.

Validation:140 regression suites/build;12 PostgreSQL wrapper/ACL/state/lock/rollback groups on schema-only PostgreSQL17 with a fictional recording dispatcher.24 composed local states across320/390/768/1024 cover automatic/manual/ad/active/error and Pinap. Escape returns focus and keeps selected form/variant; a fictional confirmation sends one command and locks until reload. Local network blocked. No actual hosted gameplay, ad/provider action, notices, protected-account action or setting save was invoked. This does not prove a live Twitch ad integration.

Runtime scope:admin-next.html,css/admin-operations.css,js/admin-next.js,js/admin-next-session.js,js/admin-next-operations.js,js/admin-next-config.js. Recovery: supabase/unapplied/hub-operations-controls/README.md. Remaining migration:validated Twitch ad provider controls and final entry-point/parity review; destructive old catalog/data cleanup is held for exact scope review.
