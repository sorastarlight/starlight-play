# CODEX-176: Gift search and empty picker presentation

Routine maintenance under CODEX-78. The shared gift/Pokémon search normalizer now retains Unicode letters/numbers. Non-Latin queries no longer collapse to an empty query and reveal all choices. Existing English,accent-insensitive,punctuation,gender and dex searches remain. This does not add translations or generations. The no-results message spans the picker grid rather than wrapping inside one sprite cell.

Validation:118/118 local/static suites,including new matching/nonmatching Japanese gift-name and unmatched species cases;build31/471. Actual rendered Gifts module with fictional catalog and connect-src none:東京 finds exactly one item;不存在 leaves no selectable reward;Pokémon picker returns zero matching species. Before/after screenshot confirms full-width no-results text. Private images:security/codex176/picker-empty-fixed.png. Sending is disabled in the fixture;no gifts,real catalog,production app endpoint,SQL,Auth/provider action or APP stamp.

Publication pending;scope only js/admin-next-rewards.js and css/admin-record.css. No privileged workflow expansion.

Publication VERIFIED:main bae76909 / Pages40021856876 success.100monitored public sources and both actual versioned module URLs match published Git. No hosted authenticated navigation or application endpoint.
