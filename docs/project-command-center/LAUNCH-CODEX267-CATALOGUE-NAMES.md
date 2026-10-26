# CODEX-267: Consistent catalogue names

Renaming a Ball or Berry in Item effects now reaches the core reward catalogue as well as Bag cards, search/sort, item details, encounter choices, selected/waiting labels and used-item summaries. Existing snapshot metadata is passed explicitly;no shared account cache or additional request. Unknown/blank names retain fallback labels. Dynamic Ball/Berry names are escaped in the chooser.

Only display names project onto known Ball rows. Item keys,ordering,ownership,favorite/automatic selection,catch advice,price,multipliers and reward rules remain unchanged. The private reward view retains owner/ACL/security_invoker,row identity,sprites,availability,limits and shop/Pass/staff flags. No grants added.

Validation:151 regression suites;seven isolated PostgreSQL groups exercise actual reviewed item-name saves,read-only capture catalogue,shop options,unchanged row fields/ACLs,exact rollback and drift refusal. Sixteen disconnected native Bag/detail/status component layouts pass at320/390/768/1024,including HTML-like names and account replacement. This is component/local evidence,not hosted gameplay or device acceptance. Local runtime stopped;original schema archive unchanged.

Installed20261026053518;source matches local hash10008607583e9fdacb1425f3e6460764. Complete production Ball/Berry/product row digests,zero item-change audits and six function contracts stayed identical. No actual staff/gameplay endpoint called. A provisional capture_enabled concern was dismissed by column metadata and successful local read-only catalogue execution. Initial local rollback deparse/CRLF packaging differences were corrected and retested before final packet recording.

Publication pending:js/game.js,js/inventory.js,js/play-ux.js,js/play.js only. Four-file guarded frontend rollback passes. SQL recovery inventory54files,LF pinned. No hosted authenticated navigation/notices,claim,purchase,encounter,grant,protected-account action,cleanup,new export,restore or APP stamp. APP20261008-rc133 unchanged. Private evidence:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex267/ .
