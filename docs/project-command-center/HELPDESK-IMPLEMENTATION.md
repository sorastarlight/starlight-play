# Connected Support — CODEX-16

Current status: **live for signed-in players; staff inbox owner-only**. Owner-approved90-day completed-ticket retention. Real EmailQA player/staff/private-note QA passed. Historical rollout snapshots below document the activation sequence.

Owner approved the reviewed workflow with90-day retention, owner-only initial staff access, attachments and ticket email deferred. Implemented My Account → Support at support.html; Admin Hub Support & Recovery inbox; Trainer Tickets history. All counts come from authorized database queries. Plain text public replies, distinct internal notes, reason-required staff triage/status changes, assignment to self/unassigned, canned response drafts, search/filters, keyset ticket/message pagination, revision conflicts, idempotent writes and account-change teardown.

## Authority and storage

Installed20261019185405_support_helpdesk_owner_initial,20261019185416_support_helpdesk_retention_schedule and20261019185509_support_helpdesk_response_hardening. Canonical source supabase/support-helpdesk.sql plus schedule source. Private RLS tables: support_settings/tickets/messages/events/requests; no direct anon/authenticated grants. support_call(text,jsonb) exposes validated actions list/get/create/reply/transition/triage; every action requires actorId matching Auth caller, existing unexpired session and nonbanned/undeleted user. Staff mode additionally requires current exact owner role. Players only see their own tickets and public messages; private notes/audit reasons not returned. Player summary omits assignee UUID. Staff audit panel currently shows latest25 events; message history is fully paginated. No edit/delete/message-html/upload or role/identity/inventory mutation APIs.

Mutations serialize per actor for replay/quotas and lock ticket revision for competing writes. Request UUID+canonical action/payload is bound to actor. Replay with changed payload is rejected. UI preserves request UUID across uncertain retries; account binding prevents a login switch between preflight and dispatch from creating another account's ticket. Conflict keeps drafts; server rejects stale revision. Create max3/hour,10/day,5 open. Player messages10/10min; owner60/hour. Player reopening allowed7 days; older cases require a new case. No scheduled sender, email notifications or spending.

Daily cleanup04:37UTC removes resolved/closed tickets older than90 days from completion; FK cascades messages, audit events and idempotency rows. Open/waiting cases retained. Scheduler history for this job90 days. Account deletion cascades owned tickets; no identity documents accepted. Scheduled execution not yet observed.

## Verification and current rollout

35 LOCAL REAL SQL checks passed: anonymous/session/other-player/current-role denial; actor swap; private-note/audit separation; request replay changed-payload rejection; concurrent duplicate creation; competing revision replies; quotas; tied-key ticket/message pagination; expired reopen; direct table/cleanup denial; completed purge and active-case preservation. Synthetic connected REAL DOM fixture checked list/detail/reply completion and HTML-like input escaping, plus reviewed desktop/390px prototype.75 static suites and build passed with APPrc133 unchanged,31 root HTML pages and421 stamped references. Existing Tickets presenter check updated to assert an authorized mount with no fabricated count.

Hosted ACL/RLS inspected: anon cannot execute support_call; authenticated cannot run cleanup; all5 private tables RLS enabled. Advisors: intentional private no-policy and authenticated SECURITY DEFINER entry reported; fixed search paths on new functions. Broad historical project advisories remain separate. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

Initial rollout was restricted to dedicated EmailQA player plus verified owner staff. The completed real QA and general activation are recorded below. No protected target mutation, role promotion, gameplay,D86,APP stamp or spending. Recovery email tested separately; ticket escalation only opens its existing guarded target-bound confirmation and does not send automatically. Case references there remain manual external references, not verified ticket-ownership proof. Attachments, ticket notification preferences/mail, bulk actions and audit-event pagination beyond latest25 are deferred.

Publication:36843ecc, GitHub Pages39306735810 succeeded. Hosted dispatcher body MD5 matches source:7ba1dbaf3aaf050c611b8f1a3f28e65d. Player gate correctly returns unavailable for the owner account while QA-player restriction remains active. New-ticket control is disabled when list access/configuration is unavailable; no inferred counts shown. Awaiting EmailQA sign-in for real creation/reply test.

## Real player QA — in progress

EmailQA signed in through the normal site flow. Created exactly one labeled case#1, reference CODEX-16-QA; submitted one player follow-up; resolved and reopened via confirmation dialogs. UI counts changed1→0→1 with state transitions. Read-only DB verification: waiting_staff, revision4, exactly2 messages/4 audit events/4 recorded requests. No second ticket, reward, identity change or mail. Owner sign-in handoff requested for staff half of QA; general rollout remains restricted.

## Real owner QA — completed

Existing owner session opened only EmailQA case#1. Posted one public staff reply (waiting_player), one clearly labeled internal note (state preserved), assigned case to self with low priority and audited reason; verified Assigned to me + Low filters. Trainer Management → EmailQA → Tickets showed the same authorized case/open count. Closed the QA case with an audit reason. DB verification: closed, low priority, assigned, revision8,3 public messages,1 internal note,8 audit events. Owner remains caller only; no protected trainer target mutation. Staff screenshot visually reviewed with corrected Admin Hub stylesheet. Final actual EmailQA read is pending to verify public reply visible/private marker absent before removing QA-only gate.

## Final real privacy verification and general activation

EmailQA signed back in and opened closed case#1 through normal Support. The public staff reply was visible alongside the two player messages. Internal marker CODEX16-PRIVATE had0 DOM matches; no internal-note label, triage or staff-audit control appeared. Local real SQL tests separately verify private data is excluded from player RPC results, and hosted dispatcher body matched that tested source. No impersonation, token extraction or synthetic claims used for hosted checks.

After this passed, qa_player cleared while enabled remained true. Signed-in players can now use My Account → Support; owner-only staff inbox and Trainer Tickets remain role guarded. QA case remains closed under normal90-day retention; no manual deletion. Both retention jobs active, scheduled execution not yet observed. Player/staff functionality passed on EmailQA only; no protected account used as test target, no role promotion, gameplay, extra mail, APP stamp or spending. Existing owner account used as caller only.

Publication: Admin Hub stylesheet correction caf751a5, Pages39309575313 succeeded. Final build validation retained APP20261008-rc133,31 root pages,422 stamped references. Prior75 suites and35 real SQL checks passed; no application changes after the verified styling fix. Scope complete for agreed initial release. Attachments, ticket notifications, wider staff roles and full audit-event pagination remain explicitly deferred.
