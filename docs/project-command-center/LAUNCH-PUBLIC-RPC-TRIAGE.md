# Public RPC follow-up triage

Read-only October 21, 2026, following CODEX-52. Current catalog still has 78 public SECURITY DEFINER functions executable by anon. The count is not a count of proven authorization defects.

Six bodies lack an obvious direct auth/staff/bridge guard and were traced separately: play_buy_cart(jsonb) delegates to its authenticated overload; play_request_username_reminder(text) records a minimal request audit and returns a fixed unavailable message without sending email; play_special_events reads its public event-card payload; play_trade_board reads open listings through trade_listing_json; play_trainer_catalog reads visible avatar catalog entries; play_trainer_search returns public trainer presentation fields and rejects email/UUID search input. No exposed email/password field was found in the inspected search result or trade trainer projection. This does not certify every nested payload or every privileged routine.

Other guard-bearing routines still need semantic review; a string match for auth.uid() alone does not prove authorization. No function, grant, policy, role or account changed during this triage. Existing mutable-search-path and leaked-password-protection notices remain open.

Maintenance observation: play_trainer_search aggregates rows and places LIMIT 12 outside the aggregate, which limits the aggregate result row rather than trainer entries. The current seven-profile site is below that threshold, but the query should be bounded before aggregation before a larger population. No live query rewrite was made from this observation.

Operational health: the latest three observed Familiarity cron runs (13:22–13:24 UTC) succeeded with zero outstanding queue entries. This is a read-only snapshot, not alerting or full production workload proof. Backup/restore readiness and separate two-party trade/provider QA remain open.


Further source review after CODEX-55: direct-trade creation resolves recipients by twitch_login only, whereas public search can present username for email-only trainers. No current production HTML/JS caller of play_direct_trade_create/set/confirm was found (only local rehearsal tools); current GTS uses play_trade_board/listing flows. This is a dormant API compatibility observation, not evidence that current GTS cannot target email-only trainers. Do not broaden recipient identity matching without ambiguity checks, a tested packet and the separate gameplay decision. Leaked-password protection was subsequently enabled and verified in CODEX-54;the earlier warning paragraph is historical.
