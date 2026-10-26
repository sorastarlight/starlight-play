# CODEX-259: Native Evolution rules

Configuration now has a searchable enabled/disabled evolution-rule browser and the existing read-only consistency check. Cards show current Candy/item requirements and the real trade-ready alternative without duplicating method codes or implying canonical main-series level requirements. No editing or evolution action is introduced. Removed stale migration-next copy and an old-category-tools handoff.

Uses existing SELECT rights on evolution_rules, a complete bounded read (refuses >500 rows instead of silently truncating), existing local species names and the inspected SELECT-only admin_evolution_validate function. No SQL/permissions change or production rule/validation invocation. Staff session checked before/after reads; reset discards late results. Enabled/disabled filter and name/item search stay local.

Validation:143 suites/build,8 rendered ready/error states at320/390/768/1024;search and fictional consistency completion verified. Private fixtures/rollback:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex259/ . No real rule changes, gameplay, provider action, notices or APP stamp. Publication pending exact five runtime files.
