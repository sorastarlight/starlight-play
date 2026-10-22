# CODEX-97 — Read-only operational configuration acceptance

Read direct allowlisted configuration/aggregate records only. No play_state/play_trainer/admin_overview/bootstrap, worker invocation, provider endpoint or gameplay RPC was called.

- WIRE enabled; updated_at remains2026-10-20T18:11:02.180774Z.
- Familiarity active; original cutoff remains2026-10-20T16:55:59.896904Z; no drain started.
- Existing job3 streamlink-species-familiarity active once/minute. Captured interval (preceding24hours) has1237 succeeded runs and0 returned failed-status groups; latest completed08:45:00UTC. No new job, manual run or scheduling change.
- Queue aggregate contains1 delivered event, maximum attempts0; no pending/rejected/exhausted rows returned. No player event payload retrieved.
- Worker source MD5 remains8a0744ad845bbe99639b01b307a41712; ACL remains postgres-only. This is the previously reviewed bounded25reconcile/25delivery worker, not a new activation.
- New Twitch one-link policy remains disabled, qa_user unset. No rollout or identity change.

Evidence:evidence/codex97-readonly-configuration.json. Successful idle worker runs and an empty outstanding queue do not prove every future capture/provider event. Final configuration review is partial; physical device/real-provider acceptance and owner final go/no-go remain distinct. New CODEX-96 recovery deltas remain required for both current archives; no repeated premature backup polling.

Additional static form-name scan of30 permitted rootHTMLpages found a search field in admin-store.html relying on placeholder text rather than an explicit label; hidden internal controls were excluded from action. No confirmed rendering failure or runtime change is claimed; placeholder fallback should not be misreported as a proven inaccessible control. Protected admin.html was not edited or bootstrapped. Full visible/keyboard/zoom acceptance is broader than this source scan.

No SQL install, player/provider/Auth/credential change, real email, gameplay, grant, purchase, restore/export, spending, scheduler change, frontend publication or APP stamp. Sora NO; Twinkle NO; PlayTester unchanged. Latest regression95suites and56hosted source matches remain CODEX-91; no unchanged suite rerun.
