# CODEX-56 — Trainer search result bound

Prepared, not installed. Current `play_trainer_search(text)` places LIMIT12 after jsonb_agg, so it limits aggregate result rows rather than matching trainers. The captured baseline returns20 fictional trainers in the local reproduction. Corrected code orders eligible profile rows by display name, username and ID, limits those rows to12, then builds the existing public projection.

This changes only the search result bound and adds an ID tie-break for deterministic ordering. Existing name/title matching, two-character minimum, email/UUID rejection, public fields, eligibility helper, sprite fallback and EXECUTE permissions are preserved. No gameplay, profile data, grant or RLS changes. Wildcards retain existing behavior. Limiting returned results does not eliminate the need to scan matching candidates; this is not a query-plan performance certification.

`baseline.json` is the captured hosted function definition/attributes. INSTALL.sql and ROLLBACK.sql each check exact source MD5, ACL, owner, security mode, volatility and search_path before replacement. Do not remove guards on drift. No automatic execution or migration registration is included.

Run `node tools/trainer-search-bound-rehearsal.js`:9 REAL LOCAL SQL checks pass using the captured function and fictional helper/profile tables. It reproduces the20-result bug, checks corrected12-row ordering, input exclusions, exact public-field projection/sprite fallback, eligibility before limit, title/no-match behavior, anonymous execution, exact rollback and install refusal after ACL drift. These fixtures do not certify live eligibility helper internals or hosted client behavior. Initial local preparation errors were corrected before the final complete pass; no hosted write occurred.

Evidence: `evidence/trainer-search-bound-local.json`. Baseline source MD5 `66a41e80371ef80410d455820ad7a33b`; candidate `0eaeb25e679e1985556e056dcbb0d46f`.

Installation remains held under `.cursor/rules/streamlink-project.mdc` (SQL needs new owner authorization). This routine maintenance candidate does not require an urgent user interruption while other launch work remains. It must be approved before hosted installation; ordinary continuation is not permission to bypass the rule.

References: [PostgreSQL LIMIT and ordering](https://www.postgresql.org/docs/current/queries-limit.html); [Supabase changelog](https://supabase.com/changelog) reviewed for relevant changes. No new Supabase feature, relation, grant or SDK version is introduced.
