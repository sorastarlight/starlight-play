# CODEX-251 — System route review

LIVE migration20261025225608 retires only the unused client ad-token storage branch in admin_director_command. The existing validated Twitch Ads Edge flow and its service-only credential writer stay unchanged. All normal Director actions retain their source outside that branch. No current authorization value was read or changed.

Local schema-only SQL reproduces the old moderator write using fictional authorization text, verifies rejection for moderator/admin/owner clients after retirement, keeps ordinary access denied and verifies a normal pause action. Exact rollback and source-drift refusal pass. The installed definition matches the candidate;retry,both Bits credit overloads and the service writer are unchanged. No provider,ad,Director or gameplay action was invoked in production. APP and frontend main379523f0 stay unchanged.

A separate real overlapping SQL rehearsal shows the existing Bits retry already delivers one item,one notice and one support-total credit,including a concurrent and a completed retry. No retry function replacement was justified or installed. This is fictional SQL evidence,not a Twitch purchase/provider acceptance test.

Recovery pair: supabase/unapplied/retired-ads-token-route/README.md. Rollback restores the known unsafe branch and should be used only after security review;it does not rotate or restore credentials.34 recovery files are now checked.

Native System connections/Bits UI remains CODEX-250,locally in progress. Remaining Director migration is separate. Installing this correction does not enable Bits purchases or authorize a provider/spending test.
