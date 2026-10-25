# CODEX-250 — Native System connections and Bits activity

Status: tested locally; installation and exact scoped publication pending.

System now has connection status, Twitch channel, owner app keys and stream PC setup, plus a native Bits event list/detail workspace. It removes the old editor handoff. Saved secrets are never returned. Entered keys clear on leaving; tokens are masked, shown once and cleared on close/account change. Channel edits review exact before/after values and reject stale settings. Owner permission is checked again after waiting for the settings row. Credentials preserve unrelated bridge settings and record an audit action without a secret value.

Bits activity shows bounded matching events with staff-friendly statuses. Only owner/admin may review a retry. Anonymous, completed and changed events are refused. A retry preflight verifies the selected cached event and sends only its ID; acknowledgement is not shown as successful delivery. The installed retry concurrency already passed CODEX-251's observed overlap check, so it is not replaced. Bits purchases remain off.

Validation:139 suites/build;13 SQL groups,2 observed races,4 guarded rollback checks;28 composed responsive owner/moderator/error layouts at320/390/768/1024 without horizontal overflow. Rendered fictional save/account-switch test drops the former owner's late response and removes all key fields. Rendered fake retry requires a reload to display delivery. Masked bridge token disappears on close. Local fixtures block network and use fictional identities/keys only. This is not real provider or hosted mutation acceptance.

Runtime scope:admin-next.html,css/admin-system.css,js/admin-next.js,js/admin-next-system.js,js/admin-next-bits.js,js/admin-next-timings.js. The timing change only removes technical revision jargon from its review. Recovery: supabase/unapplied/hub-system-connections/README.md. No hosted application RPC,notice,settings save,token rotation,retry or protected account action is included in source verification.
