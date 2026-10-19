# Player Support and Staff Helpdesk — I14

Status: implementable design and synthetic interactive prototype. Proposed APIs below do not exist yet. No live ticket storage or email notifications enabled by this document. GitHub issue #14 requests design before connected implementation; this review is the next product acceptance step.

## Product flows

Account → Support opens only the signed-in player's tickets and New ticket. Form asks category/subcategory, subject (5–120 characters), description (20–5000), optional relevant reference (100 characters). It warns against passwords, reset links, payment-card details and identity documents. References are contextual hints, not entitlement evidence. Categories: Login/account/access; Password/Twitch linking; Missing Pokémon; Missing inventory/items/candy/coins; Starlight Pass/Twitch redeem/subscription; Technical bugs/glitches; Store/Bits/transactions; Other. No automatic Bits/order entitlement lookup. Attachments unavailable in initial release.

Success opens the ticket timeline with stable public case number, server timestamp and current state. Player can reply, resolve, close, or reopen a resolved/closed case within seven days; after seven days create a related case. Staff can reopen later with reason. Replies preserve plain text and line breaks; never render user HTML/Markdown links. Only ticket author and verified permitted staff may see it. Pending submissions lock, request UUIDs prevent duplicates, errors retain unsent draft in memory only. No sensitive browser localStorage drafts.

Staff Helpdesk replaces the Support & Recovery empty area with real paginated inbox, status/category/assignee/priority filters and subject/case search. Counts are server aggregates of authorized scope, never fixture counts in live UI. Selecting a case opens a public timeline plus distinct internal notes area; compose mode is explicit and defaults Public reply. Private notes never appear in player responses. Owner recovery escalation links the existing guarded recovery dialog; it cannot change destination, grant inventory, unlink identity or bypass recent-owner authentication. Linked account actions require their own confirmation and receipt; tickets never perform grants automatically.

Trainer record Tickets tab lists authorized open count and history, with pagination; loading, unavailable, empty and denied remain distinct. Profile and inbox share ticket IDs. Users do not need GitHub; staff may manually create a sanitized development issue without copying private ticket content automatically.

## State and authority

| State | Meaning | Transitions |
|---|---|---|
| open | New report, not yet triaged | Staff → waiting_staff/waiting_player/resolved; player → closed |
| waiting_staff | Player replied or staff investigation underway | Staff → waiting_player/resolved; player → closed |
| waiting_player | Staff requested player information | Player reply → waiting_staff; either party → resolved/closed |
| resolved | Answer/repair supplied | Player reopen within 7 days → waiting_staff; either → closed |
| closed | Conversation ended | Player reopen within 7 days → waiting_staff; owner reopen with reason |

Assignment does not grant access. Initial production staff access: owner only. Admin/moderator access denied until R18 capability model is settled and explicitly rolled out. Priority low/normal/high/urgent is staff-only triage metadata; urgent is not a response-time promise. Staff resolve/close/reassign/priority/internal-note actions require reason and append audit event. No silent edits or message deletion endpoint. Canned replies are editable drafts; server never sends them automatically.

## Storage and boundaries (proposed)

private.support_tickets: UUID id, monotonic public case number, player_id FK auth.users, category/subcategory enum, subject, state enum, priority, assigned_staff_id nullable FK, related_case_id nullable, created_at/updated_at/resolved_at/closed_at, revision bigint. private.support_messages: UUID, ticket FK, author FK, visibility public/internal, body, created_at. private.support_events: actor, ticket, event enum, safe before/after metadata, reason, timestamp. private.support_requests: actor+request UUID unique, canonical payload hash, result, timestamp for idempotency. private.support_preferences: player_id, notification choice (initial in-app only). No raw email or Auth tokens. References live in ticket metadata with size/type validation; never accept arbitrary object JSON.

Private schema RLS enabled; no anon/authenticated table grants or direct Data API exposure. Narrow SECURITY DEFINER RPCs use fixed pg_catalog search_path, explicit auth.uid and exact verified server role checks, revoke PUBLIC/anon. Player endpoints constrain owner_id=auth.uid in every query and redact internal messages/events. Staff endpoints check current owner role each call; never JWT user_metadata. No caller-selected actor IDs. Constraints and transactional locks validate transitions, version and assignment; foreign UUIDs denied with generic not-found. Keyset pagination ordered updated_at,id, max50; message pages max50, text search subject/case only for first release. Index (player_id,updated_at,id), (state,updated_at,id), (ticket_id,created_at,id). Escaping via textContent.

## Proposed API contracts

Every mutator requires requestUuid; replay with identical payload returns existing result, changed replay fails. Response snapshot includes revision. Mutators require expectedRevision to reject stale writes; conflicts preserve draft and prompt reload.

| API | Inputs | Authorized result |
|---|---|---|
| support_create | requestUuid, category, subcategory, subject, body, optional reference | own ticket summary + first public message |
| support_list | cursor, state, limit | own summaries, nextCursor, own openCount |
| support_get | ticketId, messageCursor | own summary + public timeline only |
| support_reply | ticketId, requestUuid, expectedRevision, body | public message, waiting_staff, new revision |
| support_transition | ticketId, requestUuid, expectedRevision, resolved/closed/reopen | authorized state + event |
| owner_support_list | filters, subject/case query, cursor, limit | authorized summaries + aggregate counts |
| owner_support_get | ticketId, cursor | public/internal messages + safe audit timeline |
| owner_support_update | ticketId, requestUuid, expectedRevision, action, reason, validated action fields | current ticket and event |
| owner_support_reply | ticketId, requestUuid, expectedRevision, visibility, body, nextState | validated message + new revision |
| owner_support_for_trainer | targetUuid, cursor | authorized history/openCount; protected-account policy enforced |

Recovery remains owner-recovery-email Edge API; ticket integration passes only an existing authorized case reference. Backend must verify case belongs to same target before linking; ticket ownership does not prove account identity. No invented live ticket RPC calls in prototype.

## Abuse, privacy and optional phases

Create cap proposed 3/player/hour and 10/day, max5 open; replies10/player/10min, staff60/hour, server transaction lock and per-actor counters. Return retryAfter without losing draft. Public login/account help can link self-service recovery; unsigned visitors cannot create tickets. No email notifications initially: future opt-in notifications contain only generic update notice and fixed site link, no ticket content or tokens; outbox idempotency and preferences required. No new vendor/spending.

Proposed ticket retention: closed cases180 days from last closure, active cases reviewed after90 days inactivity, audit180 days, unresolved safety holds explicitly reviewed. These ticket periods need owner approval before real storage; recovery audit uses its separate approved policy. Account erasure must reconcile references and applicable holds, with explicit anonymization/purge plan. Do not store identity documents. Attachments later require private bucket, scoped expiring URLs, quota/type/magic-byte limits, malware scan/quarantine, metadata stripping and no SVG/HTML/executable previews; do not implement upload now.

## Test and rollout gates

1. Synthetic desktop/mobile prototype: create, validation, category, search/filter, detail, public/internal composition, transition, keyboard focus, reduced motion; zero SDK/fetch/live data.
2. Owner visual/functional acceptance. Resolve ticket retention and R18 capability choices before connected schema work. Default owner-only.
3. Separate source migration/API/frontend implementation with local real PostgreSQL isolation tests: anonymous denial; other player list/get/reply; admin/moderator denial; internal-note exclusion; UUID substitution; request replay; stale revision; concurrent state/reply; quota reset; pagination ties; malicious HTML; long fields; active-session invalidation.
4. Install disabled feature; inspect hosted definitions, ACL/RLS/advisors, unauthenticated boundary. Isolated EmailQA own-ticket and real-owner staff path; no protected trainers or role promotions.
5. Owner acceptance, enable narrow ticket feature, verify production loading/empty/denied. No automatic grants, identity changes, attachments or notification sends. APP remains rc133; final release smoke/D86 separate.
